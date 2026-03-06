import type { RepositoryInfo, SearchResultItem } from "./types.ts";
import type { SearchRequest } from "./request.ts";
import { GitHubClient } from "./github.ts";
import { FilterEngine } from "./filter.ts";
import { CursorManager } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

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
 * Orchestrates the search pipeline:
 * 1. Cursor parse/validate
 * 2. Filter compile
 * 3. Paginated fetch loop (optimistic parallel fetch)
 * 4. Filter evaluation per item
 * 5. Cursor generation for next page
 */
export class SearchOrchestrator {
    constructor(private readonly github: GitHubClient) {}

    async execute(request: SearchRequest): Promise<OrchestratorResult> {
        const startTime = performance.now();
        // Parse and validate cursor
        const cursorData = CursorManager.parse(request.cursor);
        if (request.cursor && !cursorData) {
            throw new ApiError(
                400,
                `Invalid cursor format. Expected 'page:index' where page is 1-${config.github.maxPage} and index is 0-${
                    config.github.resultsPerPage - 1
                }.`,
            );
        }

        // Compile filter expression (validates on construction)
        const filter = new FilterEngine(request.filter);

        // Fetch and filter results
        const filteredItems: SearchResultItem[] = [];
        let currentPage = cursorData?.page ?? 1;
        let currentIndex = cursorData?.index ?? 0;
        let totalCount = 0;
        let hasMore = true;
        let incompleteResults = false;
        const maxPage = currentPage + config.search.maxPagesToFetch - 1;

        while (filteredItems.length < request.limit && currentPage <= maxPage) {
            const { searchData, repoMap } = await this.fetchPage(
                request.query,
                currentPage,
                currentIndex,
            );

            totalCount = searchData.total_count;
            incompleteResults = incompleteResults ||
                searchData.incomplete_results;

            if (searchData.items.length === 0) {
                hasMore = false;
                break;
            }

            // Process items starting from currentIndex
            for (; currentIndex < searchData.items.length; currentIndex++) {
                const item = searchData.items[currentIndex];

                const repoInfo = repoMap.get(item.repository.full_name);
                if (!repoInfo) {
                    console.warn(
                        `[Search] Skipping item — repo info missing: ${item.repository.full_name}`,
                    );
                    continue;
                }

                if (filter.isActive && !filter.evaluate(repoInfo)) {
                    continue;
                }

                filteredItems.push({
                    name: item.name,
                    path: item.path,
                    sha: item.sha,
                    url: item.url,
                    git_url: item.git_url,
                    html_url: item.html_url,
                    repository: repoInfo,
                    score: item.score,
                    text_matches: item.text_matches,
                });

                if (filteredItems.length >= request.limit) {
                    currentIndex++; // point to next unprocessed item
                    break;
                }
            }

            if (filteredItems.length >= request.limit) break;

            // Page exhausted — move to next page
            currentPage++;
            currentIndex = 0;

            if (currentPage * config.github.resultsPerPage >= totalCount) {
                hasMore = false;
                break;
            }
        }

        // Build next cursor
        const nextCursor = CursorManager.buildNextCursor({
            hasMore,
            filteredCount: filteredItems.length,
            limit: request.limit,
            position: { page: currentPage, index: currentIndex },
        });

        const latency = (performance.now() - startTime).toFixed(2);
        console.log(`[Search] Orchestration completed in ${latency}ms`);

        return {
            items: filteredItems.slice(0, request.limit),
            nextCursor,
            totalCount,
            hasMore: hasMore && filteredItems.length >= request.limit,
            incompleteResults,
        };
    }

    // ============================================================
    // Private: page-level fetch with optimistic parallel strategy
    // ============================================================

    /**
     * Fetch a single page of search results + repository metadata.
     * Uses optimistic parallel fetch when cache exists.
     */
    private async fetchPage(
        query: string,
        page: number,
        startIndex: number,
    ): Promise<{
        searchData: import("./types.ts").GitHubCodeSearchResponse;
        repoMap: Map<string, RepositoryInfo>;
    }> {
        const cached = await this.github.getSearchCache(query, page);

        if (cached) {
            return await this.fetchPageCacheHit(
                query,
                page,
                startIndex,
                cached,
            );
        } else {
            return await this.fetchPageCacheMiss(query, page, startIndex);
        }
    }

    /**
     * Cache hit path: run conditional request + repo prefetch in parallel.
     */
    private async fetchPageCacheHit(
        query: string,
        page: number,
        startIndex: number,
        cached: {
            data: import("./types.ts").GitHubCodeSearchResponse;
            etag?: string;
        },
    ): Promise<{
        searchData: import("./types.ts").GitHubCodeSearchResponse;
        repoMap: Map<string, RepositoryInfo>;
    }> {
        const startTime = performance.now();
        const cachedRepos = [
            ...new Set(
                cached.data.items.slice(startIndex).map((item) =>
                    item.repository.full_name
                ),
            ),
        ];

        const [freshResult, prefetchedRepoMap] = await Promise.all([
            this.github.fetchCodeSearchFresh(
                query,
                page,
                config.github.resultsPerPage,
                cached.etag,
            ),
            this.github.fetchRepositories(cachedRepos),
        ]);

        if (freshResult.notModified) {
            // 304: cached search data + prefetched repos are valid
            const latency = (performance.now() - startTime).toFixed(2);
            console.log(
                `[Search] Page ${page} optimistic fetch (hit) took ${latency}ms`,
            );
            return { searchData: cached.data, repoMap: prefetchedRepoMap };
        }

        // New data: use fresh search results, fetch missing repos
        const searchData = freshResult.data!;
        const newRepos = [
            ...new Set(
                searchData.items.slice(startIndex).map((item) =>
                    item.repository.full_name
                ),
            ),
        ];
        const missingRepos = newRepos.filter((r) => !prefetchedRepoMap.has(r));

        let repoMap: Map<string, RepositoryInfo>;
        if (missingRepos.length > 0) {
            const additionalRepos = await this.github.fetchRepositories(
                missingRepos,
            );
            repoMap = new Map([...prefetchedRepoMap, ...additionalRepos]);
        } else {
            repoMap = prefetchedRepoMap;
        }

        const latency = (performance.now() - startTime).toFixed(2);
        console.log(
            `[Search] Page ${page} optimistic fetch (new data) took ${latency}ms`,
        );
        return { searchData, repoMap };
    }

    /**
     * Cache miss path: sequential fetch.
     */
    private async fetchPageCacheMiss(
        query: string,
        page: number,
        startIndex: number,
    ): Promise<{
        searchData: import("./types.ts").GitHubCodeSearchResponse;
        repoMap: Map<string, RepositoryInfo>;
    }> {
        const startTime = performance.now();
        const freshResult = await this.github.fetchCodeSearchFresh(
            query,
            page,
            config.github.resultsPerPage,
        );
        const searchData = freshResult.data!;

        const uniqueRepos = [
            ...new Set(
                searchData.items.slice(startIndex).map((item) =>
                    item.repository.full_name
                ),
            ),
        ];
        const repoMap = await this.github.fetchRepositories(uniqueRepos);

        const latency = (performance.now() - startTime).toFixed(2);
        console.log(`[Search] Page ${page} fetch (miss) took ${latency}ms`);
        return { searchData, repoMap };
    }
}
