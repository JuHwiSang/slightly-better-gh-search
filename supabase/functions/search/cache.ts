import { Redis } from "@upstash/redis";

/**
 * Cached data structure with ETag support
 */
export interface CachedData<T> {
  data: T;
  etag?: string;
}

/**
 * Initialize Upstash Redis client
 * Returns null if Redis credentials are not configured
 */
export function createRedisClient(): Redis | null {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) {
    console.warn("Redis credentials not configured. Caching disabled.");
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
    return null;
  }
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
 * Get cached data from Redis
 * Returns null if cache miss or Redis error
 */
export async function getCachedData<T>(
  redis: Redis | null,
  key: string,
): Promise<CachedData<T> | null> {
  if (!redis) return null;

  try {
    const cached = await redis.get<CachedData<T>>(key);
    if (cached) {
      console.log(`Cache hit: ${key}`);
      return cached;
    }
    console.log(`Cache miss: ${key}`);
    return null;
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data in Redis with TTL
 * @param ttlSeconds - TTL in seconds (required)
 */
export async function setCachedData<T>(
  redis: Redis | null,
  key: string,
  data: T,
  etag: string | undefined,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;

  try {
    const cachedData: CachedData<T> = { data, etag };
    await redis.setex(key, ttlSeconds, JSON.stringify(cachedData));
    console.log(
      `Cache set: ${key} (TTL: ${ttlSeconds}s, ETag: ${etag || "none"})`,
    );
  } catch (error) {
    console.error(`Redis set error for key ${key}:`, error);
  }
}
