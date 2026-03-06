import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

/**
 * Immutable Value Object representing a validated search request.
 * Parses and validates the raw request body on construction.
 *
 * @throws {ApiError} 400 on invalid input
 */
export class SearchRequest {
    readonly query: string;
    readonly filter: string;
    readonly cursor: string | null;
    readonly limit: number;

    constructor(body: Record<string, unknown>) {
        // Parse fields
        this.query = String(body.query || "");
        this.filter = String(body.filter || "");
        this.cursor = body.cursor ? String(body.cursor) : null;
        this.limit = parseInt(
            body.limit?.toString() || config.search.defaultLimit.toString(),
            10,
        );

        // Validate query
        if (!this.query || this.query.trim() === "") {
            throw new ApiError(400, "Query parameter is required");
        }

        // Validate limit
        if (
            isNaN(this.limit) || this.limit < 1 ||
            this.limit > config.search.maxLimit
        ) {
            throw new ApiError(
                400,
                `Invalid limit parameter. Must be between 1 and ${config.search.maxLimit}.`,
            );
        }
    }
}
