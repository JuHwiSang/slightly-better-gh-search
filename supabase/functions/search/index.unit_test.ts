import { assertEquals } from "@std/assert";
import { parseCursor } from "./index.ts";

/**
 * Unit tests for cursor logic
 */

// ==================== parseCursor ====================

Deno.test("parseCursor: null input returns null", () => {
  assertEquals(parseCursor(null), null);
});

Deno.test("parseCursor: valid page:index format", () => {
  assertEquals(parseCursor("1:0"), { page: 1, index: 0 });
  assertEquals(parseCursor("1:10"), { page: 1, index: 10 });
  assertEquals(parseCursor("1:99"), { page: 1, index: 99 });
  assertEquals(parseCursor("5:50"), { page: 5, index: 50 });
});

Deno.test("parseCursor: backward compatible page-only format", () => {
  assertEquals(parseCursor("1"), { page: 1, index: 0 });
  assertEquals(parseCursor("3"), { page: 3, index: 0 });
  assertEquals(parseCursor("10"), { page: 10, index: 0 });
});

Deno.test("parseCursor: page < 1 returns null", () => {
  assertEquals(parseCursor("0:10"), null);
  assertEquals(parseCursor("0:0"), null);
  assertEquals(parseCursor("-1:0"), null);
  assertEquals(parseCursor("0"), null);
});

Deno.test("parseCursor: index >= resultsPerPage returns null", () => {
  assertEquals(parseCursor("1:100"), null);
  assertEquals(parseCursor("1:150"), null);
});

Deno.test("parseCursor: page > maxPage returns null", () => {
  assertEquals(parseCursor("11:0"), null);
  assertEquals(parseCursor("11"), null);
});

Deno.test("parseCursor: non-numeric input returns null", () => {
  assertEquals(parseCursor("invalid"), null);
  assertEquals(parseCursor("abc:def"), null);
  assertEquals(parseCursor(""), null);
});

Deno.test("parseCursor: too many segments returns null", () => {
  assertEquals(parseCursor("1:2:3"), null);
});

// ==================== nextCursor generation (inline logic) ====================
//
// The cursor generation is now inline in the handler:
//   1. for loop uses currentIndex directly as the iterator
//   2. on limit reached: currentIndex++ (points to next item), break
//   3. on page exhausted: currentPage++, currentIndex = 0
//   4. normalize: if currentIndex >= resultsPerPage → currentPage++, currentIndex = 0
//   5. nextCursor = (hasMore && enough results) ? `${currentPage}:${currentIndex}` : null
//
// These tests verify the normalization + cursor string generation.

function buildNextCursor(params: {
  hasMore: boolean;
  filteredCount: number;
  limit: number;
  currentPage: number;
  currentIndex: number;
  resultsPerPage: number;
}): string | null {
  let { hasMore, filteredCount, limit, currentPage, currentIndex, resultsPerPage } = params;

  // Same normalization as in index.ts
  if (currentIndex >= resultsPerPage) {
    currentPage++;
    currentIndex = 0;
  }

  return (hasMore && filteredCount >= limit)
    ? `${currentPage}:${currentIndex}`
    : null;
}

Deno.test("nextCursor: first request, limit=10, stopped at index 10", () => {
  assertEquals(buildNextCursor({
    hasMore: true, filteredCount: 10, limit: 10,
    currentPage: 1, currentIndex: 10, resultsPerPage: 100,
  }), "1:10");
});

Deno.test("nextCursor: cursor=1:10, limit=10, stopped at index 20", () => {
  assertEquals(buildNextCursor({
    hasMore: true, filteredCount: 10, limit: 10,
    currentPage: 1, currentIndex: 20, resultsPerPage: 100,
  }), "1:20");
});

Deno.test("nextCursor: cursor=1:90, limit=10, page boundary at index 100", () => {
  assertEquals(buildNextCursor({
    hasMore: true, filteredCount: 10, limit: 10,
    currentPage: 1, currentIndex: 100, resultsPerPage: 100,
  }), "2:0");
});

Deno.test("nextCursor: page exhausted naturally, moved to page 2 index 0", () => {
  assertEquals(buildNextCursor({
    hasMore: true, filteredCount: 10, limit: 10,
    currentPage: 2, currentIndex: 0, resultsPerPage: 100,
  }), "2:0");
});

Deno.test("nextCursor: hasMore=false returns null", () => {
  assertEquals(buildNextCursor({
    hasMore: false, filteredCount: 10, limit: 10,
    currentPage: 1, currentIndex: 10, resultsPerPage: 100,
  }), null);
});

Deno.test("nextCursor: filteredCount < limit returns null", () => {
  assertEquals(buildNextCursor({
    hasMore: true, filteredCount: 7, limit: 10,
    currentPage: 1, currentIndex: 10, resultsPerPage: 100,
  }), null);
});
