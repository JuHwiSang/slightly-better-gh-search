import { assertEquals, assertExists } from "@std/assert";
import { ResponseBuilder } from "./response.ts";
import { ApiError } from "./errors.ts";
import type { OrchestratorResult } from "./orchestrator.ts";

const testCorsHeaders: HeadersInit = {
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Credentials": "true",
};

function makeResult(
    overrides: Partial<OrchestratorResult> = {},
): OrchestratorResult {
    return {
        items: [],
        nextCursor: null,
        totalCount: 0,
        hasMore: false,
        incompleteResults: false,
        ...overrides,
    };
}

// ==================== preflight ====================

Deno.test("ResponseBuilder.preflight: returns ok with CORS headers", async () => {
    const rb = new ResponseBuilder(testCorsHeaders);
    const resp = rb.preflight();
    assertEquals(resp.status, 200);
    assertEquals(
        resp.headers.get("Access-Control-Allow-Origin"),
        "http://localhost:3000",
    );
    const body = await resp.text();
    assertEquals(body, "ok");
});

// ==================== success ====================

Deno.test("ResponseBuilder.success: returns 200 with snake_case body", async () => {
    const rb = new ResponseBuilder(testCorsHeaders);
    const result = makeResult({
        totalCount: 42,
        hasMore: true,
        nextCursor: "1:10",
        incompleteResults: false,
    });
    const resp = rb.success(result);

    assertEquals(resp.status, 200);
    assertEquals(resp.headers.get("Content-Type"), "application/json");

    const body = await resp.json();
    assertExists(body.total_count);
    assertEquals(body.total_count, 42);
    assertEquals(body.has_more, true);
    assertEquals(body.next_cursor, "1:10");
    assertEquals(body.incomplete_results, false);
    assertExists(body.items);
});

// ==================== apiError ====================

Deno.test("ResponseBuilder.apiError: returns correct status and message", async () => {
    const rb = new ResponseBuilder(testCorsHeaders);
    const resp = rb.apiError(new ApiError(400, "Invalid query"));

    assertEquals(resp.status, 400);
    const body = await resp.json();
    assertEquals(body.error, "Invalid query");
});

Deno.test("ResponseBuilder.apiError: includes details if present", async () => {
    const rb = new ResponseBuilder(testCorsHeaders);
    const resp = rb.apiError(
        new ApiError(401, "Unauthorized", "Token expired"),
    );

    assertEquals(resp.status, 401);
    const body = await resp.json();
    assertEquals(body.error, "Unauthorized");
    assertEquals(body.details, "Token expired");
});

// ==================== internalError ====================

Deno.test("ResponseBuilder.internalError: returns 500", async () => {
    const rb = new ResponseBuilder(testCorsHeaders);
    const resp = rb.internalError(new Error("Something broke"));

    assertEquals(resp.status, 500);
    const body = await resp.json();
    assertEquals(body.error, "Internal server error");
    assertEquals(body.details, "Something broke");
});

Deno.test("ResponseBuilder.internalError: handles non-Error objects", async () => {
    const rb = new ResponseBuilder(testCorsHeaders);
    const resp = rb.internalError("string error");

    assertEquals(resp.status, 500);
    const body = await resp.json();
    assertEquals(body.details, "string error");
});
