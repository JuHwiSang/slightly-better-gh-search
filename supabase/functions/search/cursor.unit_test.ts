import { assertEquals } from "@std/assert";
import { SearchIterator } from "./cursor.ts";
import { GitHubClient } from "./github.ts";

// ==================== SearchIterator.parseCursor ====================

Deno.test("SearchIterator.parseCursor: null input returns null", () => {
    assertEquals(SearchIterator.parseCursor(null), null);
});

Deno.test("SearchIterator.parseCursor: valid page:index format", () => {
    assertEquals(SearchIterator.parseCursor("1:0"), { page: 1, index: 0 });
    assertEquals(SearchIterator.parseCursor("1:10"), { page: 1, index: 10 });
    assertEquals(SearchIterator.parseCursor("1:99"), { page: 1, index: 99 });
    assertEquals(SearchIterator.parseCursor("5:50"), { page: 5, index: 50 });
});

Deno.test("SearchIterator.parseCursor: backward compatible page-only format", () => {
    assertEquals(SearchIterator.parseCursor("1"), { page: 1, index: 0 });
    assertEquals(SearchIterator.parseCursor("3"), { page: 3, index: 0 });
    assertEquals(SearchIterator.parseCursor("10"), { page: 10, index: 0 });
});

Deno.test("SearchIterator.parseCursor: page < 1 returns null", () => {
    assertEquals(SearchIterator.parseCursor("0:10"), null);
    assertEquals(SearchIterator.parseCursor("0:0"), null);
    assertEquals(SearchIterator.parseCursor("-1:0"), null);
    assertEquals(SearchIterator.parseCursor("0"), null);
});

Deno.test("SearchIterator.parseCursor: index >= resultsPerPage returns null", () => {
    assertEquals(SearchIterator.parseCursor("1:100"), null);
    assertEquals(SearchIterator.parseCursor("1:150"), null);
});

Deno.test("SearchIterator.parseCursor: page > maxPage returns null", () => {
    assertEquals(SearchIterator.parseCursor("11:0"), null);
    assertEquals(SearchIterator.parseCursor("11"), null);
});

Deno.test("SearchIterator.parseCursor: non-numeric input returns null", () => {
    assertEquals(SearchIterator.parseCursor("invalid"), null);
    assertEquals(SearchIterator.parseCursor("abc:def"), null);
    assertEquals(SearchIterator.parseCursor(""), null);
});

Deno.test("SearchIterator.parseCursor: too many segments returns null", () => {
    assertEquals(SearchIterator.parseCursor("1:2:3"), null);
});

// ==================== SearchIterator.getCursor ====================

Deno.test("SearchIterator.getCursor: basic advance", () => {
    const iterator = new SearchIterator(
        null as unknown as GitHubClient,
        "query",
        "1:10",
    );
    // Before any API call, getCursor should just point to the start pos
    assertEquals(iterator.getCursor(), "1:10");
});

Deno.test("SearchIterator.getCursor: index overflow advances page", () => {
    const iterator = new SearchIterator(
        null as unknown as GitHubClient,
        "query",
        "1:99",
    );

    // Simulate internal pointer advancing without full API call
    iterator["currentIndex"] = 100;

    assertEquals(iterator.getCursor(), "2:0");
});

Deno.test("SearchIterator.getCursor: hasMore false returns null", () => {
    const iterator = new SearchIterator(
        null as unknown as GitHubClient,
        "query",
        "1:10",
    );
    iterator.hasMore = false;

    assertEquals(iterator.getCursor(), null);
});
