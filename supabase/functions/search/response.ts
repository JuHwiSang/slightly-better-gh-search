import type { SearchResponse } from "./types.ts";
import type { OrchestratorResult } from "./orchestrator.ts";
import { ApiError } from "./errors.ts";

/**
 * Builds HTTP Response objects with CORS headers.
 * No business logic — only response construction.
 */
export class ResponseBuilder {
    constructor(private readonly corsHeaders: HeadersInit) {}

    /** CORS preflight response. */
    preflight(): Response {
        return new Response("ok", { headers: this.corsHeaders });
    }

    /** Success response from orchestrator result. */
    success(result: OrchestratorResult): Response {
        const body: SearchResponse = {
            items: result.items,
            next_cursor: result.nextCursor,
            total_count: result.totalCount,
            has_more: result.hasMore,
            incomplete_results: result.incompleteResults,
        };

        return new Response(JSON.stringify(body), {
            headers: {
                ...this.corsHeaders,
                "Content-Type": "application/json",
            },
        });
    }

    /** Error response for known API errors. */
    apiError(error: ApiError): Response {
        return new Response(
            JSON.stringify({
                error: error.message,
                ...(error.details && { details: error.details }),
            }),
            {
                status: error.status,
                headers: {
                    ...this.corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    }

    /** Error response for unexpected internal errors. */
    internalError(error: unknown): Response {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: errorMessage,
            }),
            {
                status: 500,
                headers: {
                    ...this.corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    }
}
