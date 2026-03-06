import { assertEquals } from "@std/assert";
import { CursorManager } from "./cursor.ts";

// ==================== CursorManager.parse ====================

Deno.test("CursorManager.parse: null input returns null", () => {
    assertEquals(CursorManager.parse(null), null);
});

Deno.test("CursorManager.parse: valid page:index format", () => {
    assertEquals(CursorManager.parse("1:0"), { page: 1, index: 0 });
    assertEquals(CursorManager.parse("1:10"), { page: 1, index: 10 });
    assertEquals(CursorManager.parse("1:99"), { page: 1, index: 99 });
    assertEquals(CursorManager.parse("5:50"), { page: 5, index: 50 });
});

Deno.test("CursorManager.parse: backward compatible page-only format", () => {
    assertEquals(CursorManager.parse("1"), { page: 1, index: 0 });
    assertEquals(CursorManager.parse("3"), { page: 3, index: 0 });
    assertEquals(CursorManager.parse("10"), { page: 10, index: 0 });
});

Deno.test("CursorManager.parse: page < 1 returns null", () => {
    assertEquals(CursorManager.parse("0:10"), null);
    assertEquals(CursorManager.parse("0:0"), null);
    assertEquals(CursorManager.parse("-1:0"), null);
    assertEquals(CursorManager.parse("0"), null);
});

Deno.test("CursorManager.parse: index >= resultsPerPage returns null", () => {
    assertEquals(CursorManager.parse("1:100"), null);
    assertEquals(CursorManager.parse("1:150"), null);
});

Deno.test("CursorManager.parse: page > maxPage returns null", () => {
    assertEquals(CursorManager.parse("11:0"), null);
    assertEquals(CursorManager.parse("11"), null);
});

Deno.test("CursorManager.parse: non-numeric input returns null", () => {
    assertEquals(CursorManager.parse("invalid"), null);
    assertEquals(CursorManager.parse("abc:def"), null);
    assertEquals(CursorManager.parse(""), null);
});

Deno.test("CursorManager.parse: too many segments returns null", () => {
    assertEquals(CursorManager.parse("1:2:3"), null);
});

// ==================== CursorManager.normalize ====================

Deno.test("CursorManager.normalize: within page bounds unchanged", () => {
    assertEquals(CursorManager.normalize({ page: 1, index: 10 }), {
        page: 1,
        index: 10,
    });
    assertEquals(CursorManager.normalize({ page: 1, index: 0 }), {
        page: 1,
        index: 0,
    });
    assertEquals(CursorManager.normalize({ page: 1, index: 99 }), {
        page: 1,
        index: 99,
    });
});

Deno.test("CursorManager.normalize: index overflow advances page", () => {
    assertEquals(CursorManager.normalize({ page: 1, index: 100 }), {
        page: 2,
        index: 0,
    });
    assertEquals(CursorManager.normalize({ page: 3, index: 150 }), {
        page: 4,
        index: 0,
    });
});

// ==================== CursorManager.buildNextCursor ====================

Deno.test("buildNextCursor: first request, limit=10, stopped at index 10", () => {
    assertEquals(
        CursorManager.buildNextCursor({
            hasMore: true,
            filteredCount: 10,
            limit: 10,
            position: { page: 1, index: 10 },
        }),
        "1:10",
    );
});

Deno.test("buildNextCursor: cursor=1:10, limit=10, stopped at index 20", () => {
    assertEquals(
        CursorManager.buildNextCursor({
            hasMore: true,
            filteredCount: 10,
            limit: 10,
            position: { page: 1, index: 20 },
        }),
        "1:20",
    );
});

Deno.test("buildNextCursor: cursor=1:90, limit=10, page boundary at index 100", () => {
    assertEquals(
        CursorManager.buildNextCursor({
            hasMore: true,
            filteredCount: 10,
            limit: 10,
            position: { page: 1, index: 100 },
        }),
        "2:0",
    );
});

Deno.test("buildNextCursor: page exhausted naturally, moved to page 2 index 0", () => {
    assertEquals(
        CursorManager.buildNextCursor({
            hasMore: true,
            filteredCount: 10,
            limit: 10,
            position: { page: 2, index: 0 },
        }),
        "2:0",
    );
});

Deno.test("buildNextCursor: hasMore=false returns null", () => {
    assertEquals(
        CursorManager.buildNextCursor({
            hasMore: false,
            filteredCount: 10,
            limit: 10,
            position: { page: 1, index: 10 },
        }),
        null,
    );
});

Deno.test("buildNextCursor: filteredCount < limit returns null", () => {
    assertEquals(
        CursorManager.buildNextCursor({
            hasMore: true,
            filteredCount: 7,
            limit: 10,
            position: { page: 1, index: 10 },
        }),
        null,
    );
});
