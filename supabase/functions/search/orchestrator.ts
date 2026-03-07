import type { SearchResultItem } from "./types.ts";
import type { SearchRequest } from "./request.ts";
import { GitHubClient } from "./github.ts";
import { FilterEngine } from "./filter.ts";
import { SearchIterator } from "./cursor.ts";
import { ApiError } from "./errors.ts";

/**
 * Result of search orchestration.
 */
export interface OrchestratorResult {
    items: SearchResultItem[];
    nextCursor: string | null;
    totalCount: number;
    hasMore: boolean;
    incompleteResults: boolean;
}

/**
 * Orchestrates the search pipeline using the SearchIterator:
 * 1. Filter compile
 * 2. Asynchronous iteration over search results
 * 3. Filter evaluation per item
 */
export class SearchOrchestrator {
    constructor(private readonly github: GitHubClient) {}

    async execute(request: SearchRequest): Promise<OrchestratorResult> {
        const startTime = performance.now();

        // Ensure cursor is valid before we start
        if (request.cursor && !SearchIterator.parseCursor(request.cursor)) {
            throw new ApiError(
                400,
                `Invalid cursor format.`,
            );
        }

        const iterator = new SearchIterator(
            this.github,
            request.query,
            request.cursor,
        );
        const filter = new FilterEngine(request.filter);
        const filteredItems: SearchResultItem[] = [];

        // Iterate through items, hitting the API automatically when needed
        for await (const item of iterator) {
            if (filter.isActive && !filter.evaluate(item.repository)) {
                continue;
            }

            filteredItems.push(item);

            if (filteredItems.length === request.limit) {
                break; // We have enough items!
            }
        }

        const latency = (performance.now() - startTime).toFixed(2);
        console.log(`[Search] Orchestration completed in ${latency}ms`);

        // Get the accurate resumption cursor directly from where the iterator paused
        const nextCursor = iterator.getCursor();

        return {
            items: filteredItems,
            nextCursor,
            totalCount: iterator.totalCount,
            hasMore: iterator.hasMore &&
                (filteredItems.length === request.limit),
            incompleteResults: iterator.incompleteResults,
        };
    }
}
