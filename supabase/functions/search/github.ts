import type { GitHubCodeSearchResponse, RepositoryInfo } from "./types.ts";
import { type CachedData, CacheService, generateCacheKey } from "./cache.ts";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

const GITHUB_API_BASE = "https://api.github.com";

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

  async fetchCodeSearchFresh(
    query: string,
    page: number,
    perPage: number,
  ): Promise<GitHubCodeSearchResponse> {
    const searchHeaders: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.text-match+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const searchUrl = new URL(`${GITHUB_API_BASE}/search/code`);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("per_page", perPage.toString());
    searchUrl.searchParams.set("page", page.toString());

    const startTime = performance.now();
    const searchResponse = await fetch(searchUrl.toString(), {
      headers: searchHeaders,
    });
    const latency = (performance.now() - startTime).toFixed(2);

    // Handle errors
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();

      // Rate limit exceeded (primary or secondary/abuse)
      if (
        searchResponse.status === 403 &&
        errorText.toLowerCase().includes("rate limit")
      ) {
        const resetAt = searchResponse.headers.get("X-RateLimit-Reset");
        console.warn(
          `[GitHub] Rate limit exceeded (${latency}ms, query="${query}", page=${page})`,
          resetAt
            ? `\n  Resets at: ${new Date(Number(resetAt) * 1000).toISOString()}`
            : "",
          "\n  Body:",
          errorText,
        );
        throw new ApiError(
          429,
          "GitHub API rate limit exceeded. Please try again later.",
        );
      }

      console.error(
        `[GitHub] Code search API error (${latency}ms, query="${query}", page=${page}):`,
        searchResponse.status,
        searchResponse.statusText,
        "\n  Body:",
        errorText,
      );
      throw new ApiError(
        502,
        `GitHub API error: ${searchResponse.status} ${searchResponse.statusText}`,
      );
    }

    // Parse new data
    const searchData: GitHubCodeSearchResponse = await searchResponse.json();
    console.log(
      `[GitHub] Code search OK (${latency}ms, query="${query}", page=${page}): ${searchData.total_count} total, ${searchData.items.length} items, rate_limit_remaining=${
        searchResponse.headers.get("X-RateLimit-Remaining")
      }`,
    );

    // Fire-and-forget cache write
    const cacheKey = generateCacheKey("github:search", { query, page });
    this.cache.set(
      cacheKey,
      searchData,
      undefined,
      config.cache.ttl.codeSearch,
    ).catch(() => {/* already logged inside CacheService */});

    return searchData;
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

    const startTime = performance.now();
    const repoResponse = await fetch(repoUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const latency = (performance.now() - startTime).toFixed(2);

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();

      // Rate limit exceeded — bubble up immediately
      if (
        repoResponse.status === 403 &&
        errorText.toLowerCase().includes("rate limit")
      ) {
        const resetAt = repoResponse.headers.get("X-RateLimit-Reset");
        console.warn(
          `[GitHub] Rate limit exceeded for repo ${fullName} (${latency}ms)`,
          resetAt
            ? `\n  Resets at: ${new Date(Number(resetAt) * 1000).toISOString()}`
            : "",
          "\n  Body:",
          errorText,
        );
        throw new ApiError(
          429,
          "GitHub API rate limit exceeded. Please try again later.",
        );
      }

      console.warn(
        `[GitHub] Repo fetch failed for ${fullName} (${latency}ms):`,
        repoResponse.status,
        repoResponse.statusText,
        "\n  Body:",
        errorText,
      );
      return null;
    }

    const repoData: RepositoryInfo = await repoResponse.json();
    console.log(
      `[GitHub] Repo fetch OK (${latency}ms): ${fullName}, rate_limit_remaining=${
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
