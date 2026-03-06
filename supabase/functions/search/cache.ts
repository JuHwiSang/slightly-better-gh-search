import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cached data structure with ETag support
 */
export interface CachedData<T> {
  data: T;
  etag?: string;
}

/**
 * Generate cache key from prefix and parameters
 * URL-encodes both keys and values to handle special characters (e.g., ':')
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
 * Get cached data from Supabase DB
 * Returns null if cache miss, expired, or DB error
 */
export async function getCachedData<T>(
  supabase: SupabaseClient | null,
  key: string,
): Promise<CachedData<T> | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("cache")
      .select("data, etag")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error(`Cache read error for key ${key}:`, error.message);
      return null;
    }
    if (!data) {
      console.log(`Cache miss: ${key}`);
      return null;
    }

    console.log(`Cache hit: ${key}`);
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
 * Set cached data in Supabase DB with TTL
 * Uses UPSERT so repeated writes for the same key refresh the expiry.
 * Errors are swallowed — cache failure must never break the main request.
 * @param ttlSeconds - TTL in seconds (required)
 */
export async function setCachedData<T>(
  supabase: SupabaseClient | null,
  key: string,
  data: T,
  etag: string | undefined,
  ttlSeconds: number,
): Promise<void> {
  if (!supabase) return;

  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await supabase
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

    if (error) {
      console.error(`Cache write error for key ${key}:`, error.message);
      return;
    }
    console.log(
      `Cache set: ${key} (TTL: ${ttlSeconds}s, ETag: ${etag || "none"})`,
    );
  } catch (error) {
    console.error(`Cache set exception for key ${key}:`, error);
  }
}

// ============================================================
// Tiered Cache: In-memory L1 + DB L2 + Singleflight
// ============================================================

/**
 * L1: In-memory cache (module-level, persists across requests in same worker)
 * No TTL or size limit — shares Edge Function lifecycle.
 */
const memoryCache = new Map<string, { data: unknown; etag?: string }>();

/**
 * Singleflight: prevents duplicate in-flight DB queries for the same key.
 * Promise is removed after resolution, so subsequent calls go through L1.
 */
const inflight = new Map<string, Promise<CachedData<unknown> | null>>();

/**
 * Get data from tiered cache: L1 memory → singleflight → L2 DB → null
 */
export function getTieredCache<T>(
  supabase: SupabaseClient | null,
  key: string,
): Promise<CachedData<T> | null> {
  // L1: Check in-memory cache
  const memoryCached = memoryCache.get(key);
  if (memoryCached) {
    console.log(`L1 cache hit: ${key}`);
    return Promise.resolve({
      data: memoryCached.data as T,
      etag: memoryCached.etag,
    });
  }

  // Singleflight: if another call is already querying DB for this key, share its promise
  const existing = inflight.get(key);
  if (existing) {
    console.log(`Singleflight join: ${key}`);
    return existing as Promise<CachedData<T> | null>;
  }

  // L2: Query DB (with singleflight registration)
  const dbPromise = getCachedData<T>(supabase, key).then((result) => {
    // Promote to L1 on DB hit
    if (result) {
      memoryCache.set(key, { data: result.data, etag: result.etag });
    }
    return result;
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, dbPromise as Promise<CachedData<unknown> | null>);
  return dbPromise;
}

/**
 * Set data in tiered cache: L1 immediately + L2 DB fire-and-forget
 */
export function setTieredCache<T>(
  supabase: SupabaseClient | null,
  key: string,
  data: T,
  etag: string | undefined,
  ttlSeconds: number,
): void {
  // L1: Store immediately
  memoryCache.set(key, { data, etag });

  // L2: Fire-and-forget DB write
  setCachedData(supabase, key, data, etag, ttlSeconds)
    .catch(() => {/* already logged inside setCachedData */});
}
