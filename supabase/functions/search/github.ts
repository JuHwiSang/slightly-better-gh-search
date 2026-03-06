import type { GitHubCodeSearchResponse, RepositoryInfo } from "./types.ts";
import { type CachedData, CacheService, generateCacheKey } from "./cache.ts";
import { config } from "./config.ts";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Result from fetchCodeSearchFresh — indicates whether cached data is still valid.
 */
export interface FreshSearchResult {
  data: GitHubCodeSearchResponse | null;
  notModified: boolean;
}

/**
 * GitHub API client with integrated caching.
 *
 * Encapsulates all GitHub API interactions (code search + repository fetch)
 * and manages caching through the injected CacheService.
 */
export class GitHubClient {
  constructor(
    private readonly cache: CacheService,
    private readonly token: string,
  ) {}

  // ============================================================
  // Code Search — Two-phase: cache check + fresh fetch
  // ============================================================

  /**
   * Phase 1: Check search cache (DB only, not tiered — search results change frequently).
   * Returns cached data with ETag for conditional request, or null.
   */
  getSearchCache(
    query: string,
    page: number,
  ): Promise<CachedData<GitHubCodeSearchResponse> | null> {
    const cacheKey = generateCacheKey("github:search", { query, page });
    return this.cache.get<GitHubCodeSearchResponse>(cacheKey);
  }

  /**
   * Phase 2: Fetch from GitHub API with optional conditional request (If-None-Match).
   *
   * - If etag provided and GitHub returns 304: { data: null, notModified: true }
   * - If new data: { data, notModified: false } + fire-and-forget cache write
   */
  async fetchCodeSearchFresh(
    query: string,
    page: number,
    perPage: number,
    etag?: string,
  ): Promise<FreshSearchResult> {
    const searchHeaders: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.text-match+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (etag) {
      searchHeaders["If-None-Match"] = etag;
    }

    const searchUrl = new URL(`${GITHUB_API_BASE}/search/code`);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("per_page", perPage.toString());
    searchUrl.searchParams.set("page", page.toString());

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: searchHeaders,
    });

    // Handle 304 Not Modified
    if (searchResponse.status === 304) {
      console.log(
        `[GitHub] Code search 304 Not Modified (query="${query}", page=${page})`,
      );
      return { data: null, notModified: true };
    }

    // Handle errors
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(
        `[GitHub] Code search API error (query="${query}", page=${page}):`,
        searchResponse.status,
        searchResponse.statusText,
        "\n  Body:",
        errorText,
      );
      throw new Error(
        `GitHub API error: ${searchResponse.status} ${searchResponse.statusText}`,
      );
    }

    // Parse new data
    const searchData: GitHubCodeSearchResponse = await searchResponse.json();
    const newEtag = searchResponse.headers.get("ETag") || undefined;
    console.log(
      `[GitHub] Code search OK (query="${query}", page=${page}): ${searchData.total_count} total, ${searchData.items.length} items, rate_limit_remaining=${
        searchResponse.headers.get("X-RateLimit-Remaining")
      }`,
    );

    // Fire-and-forget cache write
    const cacheKey = generateCacheKey("github:search", { query, page });
    this.cache.set(
      cacheKey,
      searchData,
      newEtag,
      config.cache.ttl.codeSearch,
    ).catch(() => {/* already logged inside CacheService */});

    return { data: searchData, notModified: false };
  }

  // ============================================================
  // Repository — Tiered cache (L1 memory + L2 DB), no ETag
  // ============================================================

  /**
   * Fetch repository information from GitHub API with tiered caching.
   * No ETag/304 — TTL-based only. Tiered cache (L1 memory + L2 DB)
   * minimizes both DB queries and GitHub API calls.
   */
  async fetchRepository(fullName: string): Promise<RepositoryInfo | null> {
    const repos = await this.fetchRepositories([fullName]);
    return repos.get(fullName) ?? null;
  }

  /**
   * Fetch a single repository directly from GitHub API.
   * Does NOT check or update cache.
   */
  private async fetchRepositoryFresh(
    fullName: string,
  ): Promise<RepositoryInfo | null> {
    const [owner, repo] = fullName.split("/");
    const repoUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;

    const repoResponse = await fetch(repoUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      console.warn(
        `[GitHub] Repo fetch failed for ${fullName}:`,
        repoResponse.status,
        repoResponse.statusText,
        "\n  Body:",
        errorText,
      );
      return null;
    }

    const repoData: RepositoryInfo = await repoResponse.json();
    console.log(
      `[GitHub] Repo fetch OK: ${fullName}, rate_limit_remaining=${
        repoResponse.headers.get("X-RateLimit-Remaining")
      }`,
    );

    return repoData;
  }

  /**
   * Fetch multiple repositories in parallel.
   * Tiered cache (L1 memory + L2 DB Batch) naturally deduplicates across pages,
   * minimizing both DB queries and API calls.
   */
  async fetchRepositories(
    fullNames: string[],
  ): Promise<Map<string, RepositoryInfo>> {
    if (fullNames.length === 0) return new Map();

    const repoMap = new Map<string, RepositoryInfo>();
    const keysToFullNames = new Map<string, string>();
    const keys = fullNames.map((fullName) => {
      const key = generateCacheKey("github:repo", { fullName });
      keysToFullNames.set(key, fullName);
      return key;
    });

    // 1. Check Tiered Cache in Batch
    const cachedMap = await this.cache.getTieredBatch<RepositoryInfo>(keys);

    for (const [key, cached] of cachedMap.entries()) {
      const fullName = keysToFullNames.get(key)!;
      repoMap.set(fullName, cached.data);
    }

    // 2. Identify missing repositories
    const missingFullNames = fullNames.filter((name) => !repoMap.has(name));

    if (missingFullNames.length === 0) {
      return repoMap;
    }

    // 3. Fetch missing repositories from GitHub API concurrently
    const missingPromises = missingFullNames.map((fullName) =>
      this.fetchRepositoryFresh(fullName)
    );
    const freshRepos = (await Promise.all(missingPromises)).filter(
      (r): r is RepositoryInfo => r !== null,
    );

    // 4. Update cache in batch for successfully fetched repositories
    if (freshRepos.length > 0) {
      const cacheItems = freshRepos.map((repo) => ({
        key: generateCacheKey("github:repo", { fullName: repo.full_name }),
        data: repo,
        ttlSeconds: config.cache.ttl.repository,
      }));

      this.cache.setTieredBatch(cacheItems);

      for (const repo of freshRepos) {
        repoMap.set(repo.full_name, repo);
      }
    }

    return repoMap;
  }
}
