import { assertEquals } from "@std/assert";
import { generateCacheKey } from "./cache.ts";

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
