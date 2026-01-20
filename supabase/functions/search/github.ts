import type { Redis } from "@upstash/redis";
import type { GitHubCodeSearchResponse, RepositoryInfo } from "./types.ts";
import { generateCacheKey, getCachedData, setCachedData } from "./cache.ts";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Fetch code search results from GitHub API with caching
 */
export async function fetchCodeSearch(
  redis: Redis | null,
  githubToken: string,
  query: string,
  page: number,
  perPage: number,
): Promise<GitHubCodeSearchResponse> {
  // Generate cache key
  const cacheKey = generateCacheKey("github:search", {
    query,
    page,
  });

  // Try to get cached data
  const cached = await getCachedData<GitHubCodeSearchResponse>(
    redis,
    cacheKey,
  );

  // Prepare request headers
  const searchHeaders: HeadersInit = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Add If-None-Match header if we have cached ETag
  if (cached?.etag) {
    searchHeaders["If-None-Match"] = cached.etag;
  }

  // Fetch from GitHub API
  const searchUrl = new URL(`${GITHUB_API_BASE}/search/code`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("per_page", perPage.toString());
  searchUrl.searchParams.set("page", page.toString());

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: searchHeaders,
  });

  // Handle 304 Not Modified
  if (searchResponse.status === 304) {
    if (cached) {
      console.log(`Using cached data for: ${cacheKey}`);
      return cached.data;
    } else {
      // Should not happen, but handle gracefully
      console.warn(`Got 304 but no cached data for: ${cacheKey}`);
      throw new Error("Unexpected 304 response without cached data");
    }
  }

  // Handle errors
  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error("GitHub API error:", errorText);
    throw new Error(
      `GitHub API error: ${searchResponse.status} ${searchResponse.statusText}`,
    );
  }

  // Parse new data
  const searchData: GitHubCodeSearchResponse = await searchResponse.json();
  const newEtag = searchResponse.headers.get("ETag") || undefined;

  // Cache the new data with ETag
  await setCachedData(redis, cacheKey, searchData, newEtag);

  return searchData;
}

/**
 * Fetch repository information from GitHub API with caching
 */
export async function fetchRepository(
  redis: Redis | null,
  githubToken: string,
  fullName: string,
): Promise<RepositoryInfo | null> {
  // Generate cache key
  const repoCacheKey = generateCacheKey("github:repo", {
    fullName,
  });

  // Try to get cached data
  const cachedRepo = await getCachedData<RepositoryInfo>(
    redis,
    repoCacheKey,
  );

  const [owner, repo] = fullName.split("/");
  const repoUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;

  const repoHeaders: HeadersInit = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Add If-None-Match header if we have cached ETag
  if (cachedRepo?.etag) {
    repoHeaders["If-None-Match"] = cachedRepo.etag;
  }

  const repoResponse = await fetch(repoUrl, {
    headers: repoHeaders,
  });

  // Handle 304 Not Modified
  if (repoResponse.status === 304) {
    if (cachedRepo) {
      console.log(`Using cached repo data for: ${fullName}`);
      return cachedRepo.data;
    }
    return null;
  }

  // Handle errors
  if (!repoResponse.ok) {
    console.warn(`Failed to fetch repo info for ${fullName}`);
    return null;
  }

  // Parse new data
  const repoData: RepositoryInfo = await repoResponse.json();
  const repoEtag = repoResponse.headers.get("ETag") || undefined;

  // Cache the new data with ETag
  await setCachedData(redis, repoCacheKey, repoData, repoEtag);

  return repoData;
}

/**
 * Fetch multiple repositories in parallel
 */
export async function fetchRepositories(
  redis: Redis | null,
  githubToken: string,
  fullNames: string[],
): Promise<Map<string, RepositoryInfo>> {
  const repoMap = new Map<string, RepositoryInfo>();

  const repoPromises = fullNames.map(async (fullName) => {
    const repoData = await fetchRepository(redis, githubToken, fullName);
    if (repoData) {
      repoMap.set(fullName, repoData);
    }
  });

  await Promise.all(repoPromises);

  return repoMap;
}
