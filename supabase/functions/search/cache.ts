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
