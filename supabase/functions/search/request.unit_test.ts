import { assertEquals, assertThrows } from "@std/assert";
import { SearchRequest } from "./request.ts";

// ==================== Valid input ====================

Deno.test("SearchRequest: valid body parses correctly", () => {
    const req = new SearchRequest({
        query: "react",
        filter: "stars > 100",
        cursor: "1:5",
        limit: 10,
    });
    assertEquals(req.query, "react");
    assertEquals(req.filter, "stars > 100");
    assertEquals(req.cursor, "1:5");
    assertEquals(req.limit, 10);
});

Deno.test("SearchRequest: defaults for optional fields", () => {
    const req = new SearchRequest({ query: "test" });
    assertEquals(req.query, "test");
    assertEquals(req.filter, "");
    assertEquals(req.cursor, null);
    assertEquals(req.limit, 30); // config.search.defaultLimit
});

Deno.test("SearchRequest: limit as string parses to number", () => {
    const req = new SearchRequest({ query: "test", limit: "15" });
    assertEquals(req.limit, 15);
});

// ==================== Empty query ====================

Deno.test("SearchRequest: empty query throws 400", () => {
    assertThrows(
        () => new SearchRequest({ query: "" }),
        Error,
        "Query parameter is required",
    );
});

Deno.test("SearchRequest: missing query throws 400", () => {
    assertThrows(
        () => new SearchRequest({}),
        Error,
        "Query parameter is required",
    );
});

Deno.test("SearchRequest: whitespace-only query throws 400", () => {
    assertThrows(
        () => new SearchRequest({ query: "   " }),
        Error,
        "Query parameter is required",
    );
});

// ==================== Invalid limit ====================

Deno.test("SearchRequest: limit=0 throws 400", () => {
    assertThrows(
        () => new SearchRequest({ query: "test", limit: 0 }),
        Error,
        "Invalid limit parameter",
    );
});

Deno.test("SearchRequest: limit > maxLimit throws 400", () => {
    assertThrows(
        () => new SearchRequest({ query: "test", limit: 999 }),
        Error,
        "Invalid limit parameter",
    );
});

Deno.test("SearchRequest: non-numeric limit throws 400", () => {
    assertThrows(
        () => new SearchRequest({ query: "test", limit: "abc" }),
        Error,
        "Invalid limit parameter",
    );
});

Deno.test("SearchRequest: negative limit throws 400", () => {
    assertThrows(
        () => new SearchRequest({ query: "test", limit: -5 }),
        Error,
        "Invalid limit parameter",
    );
});
