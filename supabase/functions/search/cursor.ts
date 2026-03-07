import type { GitHubClient } from "./github.ts";
import type {
    GitHubCodeSearchItem,
    RepositoryInfo,
    SearchResultItem,
} from "./types.ts";
import { config } from "./config.ts";

/**
 * Parsed cursor position.
 */
export interface CursorPosition {
    page: number;
    index: number;
}

/**
 * Async Iterator that fetches and yields GitHub search results one by one,
 * abstracting away pagination and cursor management.
 */
export class SearchIterator implements AsyncIterator<SearchResultItem> {
    private currentPage: number;
    private currentIndex: number;
    private maxPageToFetch: number;

    private currentItems: GitHubCodeSearchItem[] = [];
    private currentRepoMap: Map<string, RepositoryInfo> = new Map();

    // Track overall API state
    public totalCount = 0;
    public incompleteResults = false;
    public hasMore = true;

    constructor(
        private readonly github: GitHubClient,
        private readonly query: string,
        cursorParams: string | null,
    ) {
        const startPos = SearchIterator.parseCursor(cursorParams) ??
            { page: 1, index: 0 };
        this.currentPage = startPos.page;
        this.currentIndex = startPos.index;
        this.maxPageToFetch = this.currentPage + config.search.maxPagesToFetch -
            1;
    }

    /**
     * Parse and validate cursor parameter.
     * @param cursor - Cursor string in format "page:index" or just "page"
     */
    static parseCursor(cursor: string | null): CursorPosition | null {
        if (!cursor) return null;

        const parts = cursor.split(":");
        if (parts.length === 2) {
            const page = parseInt(parts[0], 10);
            const index = parseInt(parts[1], 10);

            if (
                isNaN(page) || isNaN(index) ||
                page < 1 || page > config.github.maxPage ||
                index < 0 || index >= config.github.resultsPerPage
            ) {
                return null;
            }
            return { page, index };
        } else if (parts.length === 1) {
            const page = parseInt(parts[0], 10);
            if (isNaN(page) || page < 1 || page > config.github.maxPage) {
                return null;
            }
            return { page, index: 0 };
        }
        return null;
    }

    /**
     * Get the next cursor string based on the *current* state of the iterator.
     * Useful for breaking early (e.g. limit reached) and needing to know where to resume.
     */
    public getCursor(): string | null {
        if (!this.hasMore) return null;

        let page = this.currentPage;
        let index = this.currentIndex;

        // Normalize if index has overflown the page length
        if (index >= config.github.resultsPerPage) {
            page += 1;
            index = 0;
        }

        // If we've reached the absolute end of github limits
        if (page > config.github.maxPage) return null;

        return `${page}:${index}`;
    }

    public async next(): Promise<IteratorResult<SearchResultItem>> {
        if (!this.hasMore || this.currentPage > this.maxPageToFetch) {
            return { done: true, value: undefined };
        }

        // If we don't have items buffered or we've exhausted our current buffer, fetch the next page.
        // Also ensure we specifically check against github's page limits.
        if (
            this.currentItems.length === 0 ||
            this.currentIndex >= this.currentItems.length
        ) {
            // If we are about to fetch, but the page exceeds the github limit, we are done
            if (this.currentPage > config.github.maxPage) {
                this.hasMore = false;
                return { done: true, value: undefined };
            }

            // If we already fetched the items and had exhausted them, AND we are at the end of the total results.
            if (
                this.currentItems.length > 0 &&
                this.currentPage * config.github.resultsPerPage >=
                    this.totalCount
            ) {
                this.hasMore = false;
                return { done: true, value: undefined };
            }

            // Only advance page if we actually had items before (meaning we exhausted a page)
            if (this.currentItems.length > 0) {
                this.currentPage++;
                this.currentIndex = 0;

                // If advancing the page puts us past our localized max fetch limit, stop.
                if (
                    this.currentPage > this.maxPageToFetch ||
                    this.currentPage > config.github.maxPage
                ) {
                    return { done: true, value: undefined };
                }
            }

            const { searchData, repoMap } = await this
                .fetchPageWithParallelOptimism(
                    this.query,
                    this.currentPage,
                    this.currentIndex,
                );

            this.totalCount = searchData.total_count;
            this.incompleteResults = this.incompleteResults ||
                searchData.incomplete_results;
            this.currentItems = searchData.items;
            this.currentRepoMap = repoMap;

            if (this.currentItems.length === 0) {
                this.hasMore = false;
                return { done: true, value: undefined };
            }
        }

        // We have items in the buffer, and currentIndex is pointing to a valid item
        const rawItem = this.currentItems[this.currentIndex];

        if (!rawItem) {
            console.error(
                `[Search Iterator] CRITICAL: rawItem is undefined! index: ${this.currentIndex}, bufferLength: ${this.currentItems.length}, page: ${this.currentPage}`,
            );
            this.hasMore = false;
            return { done: true, value: undefined };
        }

        const repoInfo = this.currentRepoMap.get(rawItem.repository.full_name);

        this.currentIndex++; // Advance internal pointer

        if (!repoInfo) {
            console.warn(
                `[Search] Skipping item — repo info missing: ${rawItem.repository.full_name}`,
            );
            // Recursively call next() to skip this bad item
            return this.next();
        }

        const buildItem: SearchResultItem = {
            name: rawItem.name,
            path: rawItem.path,
            sha: rawItem.sha,
            url: rawItem.url,
            git_url: rawItem.git_url,
            html_url: rawItem.html_url,
            repository: repoInfo,
            score: rawItem.score,
            text_matches: rawItem.text_matches,
        };

        return { done: false, value: buildItem };
    }

    [Symbol.asyncIterator]() {
        return this;
    }

    // ============================================================
    // Private: page-level fetch with optimistic parallel strategy
    // Lifted directly from Orchestrator
    // ============================================================

    private async fetchPageWithParallelOptimism(
        query: string,
        page: number,
        startIndex: number,
    ) {
        const cached = await this.github.getSearchCache(query, page);

        if (cached) {
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
                const latency = (performance.now() - startTime).toFixed(2);
                console.log(
                    `[Search] Iterator Page ${page} optimistic fetch (hit) took ${latency}ms`,
                );
                return { searchData: cached.data, repoMap: prefetchedRepoMap };
            }

            const searchData = freshResult.data!;
            const newRepos = [
                ...new Set(
                    searchData.items.slice(startIndex).map((item) =>
                        item.repository.full_name
                    ),
                ),
            ];
            const missingRepos = newRepos.filter((r) =>
                !prefetchedRepoMap.has(r)
            );

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
                `[Search] Iterator Page ${page} optimistic fetch (new data) took ${latency}ms`,
            );
            return { searchData, repoMap };
        } else {
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
            console.log(
                `[Search] Iterator Page ${page} fetch (miss) took ${latency}ms`,
            );
            return { searchData, repoMap };
        }
    }
}
