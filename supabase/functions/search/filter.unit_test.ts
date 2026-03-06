import { assertEquals, assertThrows } from "@std/assert";
import { FilterEngine } from "./filter.ts";
import type { RepositoryInfo } from "./types.ts";

// Minimal RepositoryInfo fixture for testing
function makeRepo(overrides: Partial<RepositoryInfo> = {}): RepositoryInfo {
    return {
        id: 1,
        node_id: "MDEwOlJlcG9zaXRvcnkx",
        name: "test-repo",
        full_name: "owner/test-repo",
        owner: { login: "owner", id: 1, avatar_url: "", type: "User" },
        private: false,
        html_url: "https://github.com/owner/test-repo",
        description: "A test repo",
        fork: false,
        stargazers_count: 500,
        watchers_count: 500,
        forks_count: 10,
        open_issues_count: 5,
        language: "TypeScript",
        topics: ["test"],
        visibility: "public",
        default_branch: "main",
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        pushed_at: "2024-01-01T00:00:00Z",
        size: 1000,
        archived: false,
        disabled: false,
        is_template: false,
        homepage: null,
        license: { key: "mit", name: "MIT License", spdx_id: "MIT", url: "" },
        has_issues: true,
        has_wiki: true,
        has_pages: false,
        has_downloads: true,
        has_discussions: false,
        has_projects: true,
        subscribers_count: 10,
        network_count: 5,
        allow_forking: true,
        ...overrides,
    };
}

// ==================== Construction ====================

Deno.test("FilterEngine: empty expression → pass-through", () => {
    const engine = new FilterEngine("");
    assertEquals(engine.isActive, false);
    assertEquals(engine.evaluate(makeRepo()), true);
});

Deno.test("FilterEngine: whitespace-only expression → pass-through", () => {
    const engine = new FilterEngine("   ");
    assertEquals(engine.isActive, false);
});

Deno.test("FilterEngine: valid expression compiles", () => {
    const engine = new FilterEngine("stars > 100");
    assertEquals(engine.isActive, true);
});

Deno.test("FilterEngine: invalid expression throws ApiError 400", () => {
    assertThrows(
        () => new FilterEngine("invalid !!! @@@ expression"),
        Error,
        "Invalid filter expression",
    );
});

// ==================== Evaluation ====================

Deno.test("FilterEngine: stars > 100 matches repo with 500 stars", () => {
    const engine = new FilterEngine("stars > 100");
    assertEquals(engine.evaluate(makeRepo({ stargazers_count: 500 })), true);
});

Deno.test("FilterEngine: stars > 1000 rejects repo with 500 stars", () => {
    const engine = new FilterEngine("stars > 1000");
    assertEquals(engine.evaluate(makeRepo({ stargazers_count: 500 })), false);
});

Deno.test("FilterEngine: language equality check", () => {
    // filtrex v3: string literals must use double quotes (single quotes = property access)
    const engine = new FilterEngine('language == "TypeScript"');
    assertEquals(engine.evaluate(makeRepo({ language: "TypeScript" })), true);
    assertEquals(engine.evaluate(makeRepo({ language: "Python" })), false);
});

Deno.test("FilterEngine: compound expression (AND)", () => {
    const engine = new FilterEngine("stars > 100 and forks > 5");
    assertEquals(
        engine.evaluate(makeRepo({ stargazers_count: 500, forks_count: 10 })),
        true,
    );
    assertEquals(
        engine.evaluate(makeRepo({ stargazers_count: 500, forks_count: 2 })),
        false,
    );
});

Deno.test("FilterEngine: reuses compiled expression across calls", () => {
    const engine = new FilterEngine("stars > 100");
    // Multiple evaluations should work
    assertEquals(engine.evaluate(makeRepo({ stargazers_count: 500 })), true);
    assertEquals(engine.evaluate(makeRepo({ stargazers_count: 50 })), false);
    assertEquals(engine.evaluate(makeRepo({ stargazers_count: 200 })), true);
});

Deno.test("FilterEngine: boolean fields (not operator)", () => {
    const engine = new FilterEngine("not archived");
    assertEquals(engine.evaluate(makeRepo({ archived: false })), true);
    assertEquals(engine.evaluate(makeRepo({ archived: true })), false);
});
