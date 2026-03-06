import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cached data structure with ETag support
 */
export interface CachedData<T> {
  data: T;
  etag?: string;
}

/**
 * Generate cache key from prefix and parameters.
 * URL-encodes both keys and values to handle special characters (e.g., ':').
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, string | number>,
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) =>
      `${encodeURIComponent(key)}:${encodeURIComponent(String(value))}`
    )
    .join(":");

  return `${prefix}:${sortedParams}`;
}

/**
 * Centralized caching service with tiered architecture:
 * - L1: In-memory cache (module-level, persists across requests in same worker)
 * - L2: Supabase DB cache (persists across workers)
 * - Singleflight: prevents duplicate in-flight DB queries for the same key
 *
 * Cache failure never breaks the main request — all errors are swallowed.
 */
export class CacheService {
  /** L1: In-memory cache. No TTL or size limit — shares Edge Function lifecycle. */
  private readonly memoryCache = new Map<
    string,
    { data: unknown; etag?: string }
  >();

  /** Singleflight: prevents duplicate in-flight DB queries for the same key. */
  private readonly inflight = new Map<
    string,
    Promise<CachedData<unknown> | null>
  >();

  constructor(private readonly supabase: SupabaseClient | null) {}

  // ============================================================
  // L2: DB Cache (direct)
  // ============================================================

  /**
   * Get cached data from Supabase DB.
   * Returns null if cache miss, expired, or DB error.
   */
  async get<T>(key: string): Promise<CachedData<T> | null> {
    if (!this.supabase) return null;

    try {
      const startTime = performance.now();
      const { data, error } = await this.supabase
        .from("cache")
        .select("data, etag")
        .eq("key", key)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      const latency = (performance.now() - startTime).toFixed(2);

      if (error) {
        console.error(
          `Cache read error for key ${key} (${latency}ms):`,
          error.message,
        );
        return null;
      }
      if (!data) {
        console.log(`Cache miss: ${key} (${latency}ms)`);
        return null;
      }

      console.log(`Cache hit: ${key} (${latency}ms)`);
      return {
        data: data.data as T,
        etag: data.etag ?? undefined,
      };
    } catch (error) {
      console.error(`Cache get exception for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data in Supabase DB with TTL.
   * Uses UPSERT so repeated writes for the same key refresh the expiry.
   * Errors are swallowed — cache failure must never break the main request.
   */
  async set<T>(
    key: string,
    data: T,
    etag: string | undefined,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      const startTime = performance.now();
      const { error } = await this.supabase
        .from("cache")
        .upsert(
          {
            key,
            data,
            etag: etag ?? null,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
      const latency = (performance.now() - startTime).toFixed(2);

      if (error) {
        console.error(
          `Cache write error for key ${key} (${latency}ms):`,
          error.message,
        );
        return;
      }
      console.log(
        `Cache set: ${key} (TTL: ${ttlSeconds}s, ETag: ${
          etag || "none"
        }, ${latency}ms)`,
      );
    } catch (error) {
      console.error(`Cache set exception for key ${key}:`, error);
    }
  }

  /**
   * Get multiple cached items from Supabase DB.
   * Returns a Map of key -> CachedData.
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, CachedData<T>>> {
    if (!this.supabase || keys.length === 0) return new Map();

    try {
      const startTime = performance.now();
      const { data, error } = await this.supabase
        .from("cache")
        .select("key, data, etag")
        .in("key", keys)
        .gt("expires_at", new Date().toISOString());
      const latency = (performance.now() - startTime).toFixed(2);

      if (error) {
        console.error(`Cache batch read error (${latency}ms):`, error.message);
        return new Map();
      }

      const result = new Map<string, CachedData<T>>();
      if (data) {
        for (const row of data) {
          result.set(row.key, {
            data: row.data as T,
            etag: row.etag ?? undefined,
          });
        }
      }
      console.log(
        `Cache batch read: ${keys.length} keys requested, ${result.size} found (${latency}ms)`,
      );
      return result;
    } catch (error) {
      console.error(`Cache batch get exception:`, error);
      return new Map();
    }
  }

  /**
   * Set multiple cached items in Supabase DB with TTL.
   * Uses UPSERT so repeated writes refresh the expiry.
   * Errors are swallowed — cache failure must never break the main request.
   */
  async setMultiple<T>(
    items: { key: string; data: T; etag?: string; ttlSeconds: number }[],
  ): Promise<void> {
    if (!this.supabase || items.length === 0) return;

    try {
      const rows = items.map((item) => ({
        key: item.key,
        data: item.data,
        etag: item.etag ?? null,
        expires_at: new Date(Date.now() + item.ttlSeconds * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }));

      const startTime = performance.now();
      const { error } = await this.supabase
        .from("cache")
        .upsert(rows, { onConflict: "key" });
      const latency = (performance.now() - startTime).toFixed(2);

      if (error) {
        console.error(`Cache batch write error (${latency}ms):`, error.message);
        return;
      }
      console.log(`Cache batch set: ${items.length} items (${latency}ms)`);
    } catch (error) {
      console.error(`Cache batch set exception:`, error);
    }
  }

  // ============================================================
  // Tiered Cache: L1 memory → singleflight → L2 DB
  // ============================================================

  /**
   * Get data from tiered cache: L1 memory → singleflight → L2 DB → null.
   */
  getTiered<T>(key: string): Promise<CachedData<T> | null> {
    // L1: Check in-memory cache
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached) {
      console.log(`L1 cache hit: ${key}`);
      return Promise.resolve({
        data: memoryCached.data as T,
        etag: memoryCached.etag,
      });
    }

    // Singleflight: if another call is already querying DB for this key, share its promise
    const existing = this.inflight.get(key);
    if (existing) {
      console.log(`Singleflight join: ${key}`);
      return existing as Promise<CachedData<T> | null>;
    }

    // L2: Query DB (with singleflight registration)
    const dbPromise = this.get<T>(key).then((result) => {
      // Promote to L1 on DB hit
      if (result) {
        this.memoryCache.set(key, { data: result.data, etag: result.etag });
      }
      return result;
    }).finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(
      key,
      dbPromise as Promise<CachedData<unknown> | null>,
    );
    return dbPromise;
  }

  /**
   * Set data in tiered cache: L1 immediately + L2 DB fire-and-forget.
   */
  setTiered<T>(
    key: string,
    data: T,
    etag: string | undefined,
    ttlSeconds: number,
  ): void {
    // L1: Store immediately
    this.memoryCache.set(key, { data, etag });

    // L2: Fire-and-forget DB write
    this.set(key, data, etag, ttlSeconds)
      .catch(() => {/* already logged inside set */});
  }

  /**
   * Get data from tiered cache in batch: L1 memory → singleflight → L2 DB.
   * Returns a Map of key -> CachedData.
   */
  async getTieredBatch<T>(keys: string[]): Promise<Map<string, CachedData<T>>> {
    const startTime = performance.now();
    const result = new Map<string, CachedData<T>>();
    if (keys.length === 0) return result;

    const missingKeys: string[] = [];
    const inflightPromises: Promise<CachedData<unknown> | null>[] = [];
    const inflightKeys: string[] = [];

    // 1. Check L1 memory and inflight
    for (const key of keys) {
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached) {
        result.set(key, {
          data: memoryCached.data as T,
          etag: memoryCached.etag,
        });
        continue;
      }

      const existing = this.inflight.get(key);
      if (existing) {
        inflightPromises.push(existing);
        inflightKeys.push(key);
        continue;
      }

      missingKeys.push(key);
    }

    // 2. Fetch missing from DB
    if (missingKeys.length > 0) {
      // Create a single promise for the DB batch fetch
      const dbPromise = this.getMultiple<T>(missingKeys);

      // Register individual inflight promises for other concurrent requests
      for (const key of missingKeys) {
        const p = dbPromise.then((map) => map.get(key) || null);
        this.inflight.set(key, p as Promise<CachedData<unknown> | null>);
      }

      try {
        const dbResult = await dbPromise;
        for (const [key, data] of dbResult.entries()) {
          this.memoryCache.set(key, data); // Promote to L1
          result.set(key, data);
        }
      } finally {
        for (const key of missingKeys) {
          this.inflight.delete(key);
        }
      }
    }

    // 3. Await inflight promises
    if (inflightPromises.length > 0) {
      const resolved = await Promise.all(inflightPromises);
      for (let i = 0; i < resolved.length; i++) {
        const res = resolved[i];
        if (res) {
          result.set(inflightKeys[i], res as CachedData<T>);
        }
      }
    }

    const latency = (performance.now() - startTime).toFixed(2);
    console.log(
      `[Cache] Tiered batch resolved ${keys.length} keys in ${latency}ms`,
    );
    return result;
  }

  /**
   * Set multiple items in tiered cache: L1 immediately + L2 DB fire-and-forget.
   */
  setTieredBatch<T>(
    items: { key: string; data: T; etag?: string; ttlSeconds: number }[],
  ): void {
    if (items.length === 0) return;

    // L1: Store immediately
    for (const item of items) {
      this.memoryCache.set(item.key, { data: item.data, etag: item.etag });
    }

    // L2: Fire-and-forget DB write in batch
    this.setMultiple(items).catch(
      () => {/* errors swallowed in setMultiple */},
    );
  }
}
