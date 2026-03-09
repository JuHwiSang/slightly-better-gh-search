import { assertEquals } from "@std/assert";
import { generateCacheKey, LimitedMap } from "./cache.ts";

// ==================== LimitedMap ====================

Deno.test("LimitedMap: respects max limit and evicts oldest items", () => {
    const map = new LimitedMap<number, string>(3);

    map.set(1, "a");
    map.set(2, "b");
    map.set(3, "c");
    assertEquals(map.size, 3);
    assertEquals(map.has(1), true);

    // Adding 4th item should evict key 1 (oldest)
    map.set(4, "d");
    assertEquals(map.size, 3);
    assertEquals(map.has(1), false);
    assertEquals(map.has(2), true);
    assertEquals(map.has(4), true);

    // Updating existing item
    map.set(2, "b-updated");
    assertEquals(map.size, 3);
});

// ==================== generateCacheKey ====================

Deno.test("generateCacheKey: basic key generation", () => {
    const key = generateCacheKey("github:search", { query: "react", page: 1 });
    assertEquals(typeof key, "string");
    assertEquals(key.startsWith("github:search:"), true);
});

Deno.test("generateCacheKey: params are sorted alphabetically", () => {
    const key1 = generateCacheKey("prefix", { a: "1", b: "2" });
    const key2 = generateCacheKey("prefix", { b: "2", a: "1" });
    assertEquals(key1, key2);
});

Deno.test("generateCacheKey: special characters are encoded", () => {
    const key = generateCacheKey("prefix", { query: "a:b:c" });
    // The colon in the value should be encoded
    assertEquals(key.includes("a%3Ab%3Ac"), true);
});

Deno.test("generateCacheKey: different params produce different keys", () => {
    const key1 = generateCacheKey("github:search", { query: "react", page: 1 });
    const key2 = generateCacheKey("github:search", { query: "react", page: 2 });
    assertEquals(key1 !== key2, true);
});

Deno.test("generateCacheKey: numeric values handled", () => {
    const key = generateCacheKey("prefix", { page: 42 });
    assertEquals(key.includes("42"), true);
});
