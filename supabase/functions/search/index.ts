import { evaluateFilter } from "./filter.ts";
import type { SearchResponse, SearchResultItem } from "./types.ts";
import { createRedisClient } from "./cache.ts";
import { generateCorsHeaders, parseCorsConfig } from "./cors.ts";
import { createAnonClient, getGitHubToken } from "./auth.ts";
import { fetchCodeSearch, fetchRepositories } from "./github.ts";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

/**
 * Parse and validate cursor parameter
 * @param cursor - Cursor string in format "page:index" or just "page"
 * @returns Object with validated page and index, or null if invalid
 */
function parseCursor(cursor: string | null): {
  page: number;
  index: number;
} | null {
  if (!cursor) {
    return null;
  }

  const parts = cursor.split(":");

  if (parts.length === 2) {
    // New format: "page:index"
    const page = parseInt(parts[0], 10);
    const index = parseInt(parts[1], 10);

    // Validate parsed values
    if (
      isNaN(page) || isNaN(index) ||
      page < 1 || page > config.github.maxPage ||
      index < 0 || index >= config.github.resultsPerPage
    ) {
      return null; // Invalid cursor
    }

    return { page, index };
  } else if (parts.length === 1) {
    // Backward compatibility: treat as page number only
    const page = parseInt(parts[0], 10);

    if (isNaN(page) || page < 1 || page > config.github.maxPage) {
      return null; // Invalid cursor
    }

    return { page, index: 0 };
  }

  return null; // Invalid format
}

/**
 * Search Edge Function
 *
 * Possible API errors:
 * - 400: Missing/empty query, invalid cursor format, invalid limit, filter evaluation error
 * - 401: Missing Authorization header, GitHub token not found
 * - 500: Unexpected internal errors
 */
Deno.serve(async (req) => {
  // Parse CORS configuration
  const corsConfig = parseCorsConfig(req);
  const corsHeaders = generateCorsHeaders(corsConfig);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse URL query parameters
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";
    const filter = url.searchParams.get("filter") || "";
    const cursor = url.searchParams.get("cursor");
    const limit = parseInt(
      url.searchParams.get("limit") || config.search.defaultLimit.toString(),
      10,
    );

    // Validate query
    if (!query || query.trim() === "") {
      throw new ApiError(400, "Query parameter is required");
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > config.search.maxLimit) {
      throw new ApiError(
        400,
        `Invalid limit parameter. Must be between 1 and ${config.search.maxLimit}.`,
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new ApiError(401, "Missing authorization header");
    }

    // Initialize Supabase client and get GitHub token
    const supabaseClient = createAnonClient(authHeader);
    const githubToken = await getGitHubToken(supabaseClient);

    // Initialize Redis client (null if not configured)
    const redis = createRedisClient();

    // Parse and validate cursor
    const cursorData = parseCursor(cursor);
    if (cursor && !cursorData) {
      throw new ApiError(
        400,
        `Invalid cursor format. Expected 'page:index' where page is 1-${config.github.maxPage} and index is 0-${
          config.github.resultsPerPage - 1
        }.`,
      );
    }

    const startPage = cursorData?.page ?? 1;
    const startIndex = cursorData?.index ?? 0;

    // Fetch and filter results
    const filteredItems: SearchResultItem[] = [];
    let currentPage = startPage;
    let currentIndex = 0;
    let totalCount = 0;
    let hasMore = true;
    let incompleteResults = false; // Track if any page had incomplete results

    // Keep fetching pages until we have enough filtered results
    while (
      filteredItems.length < limit &&
      currentPage <= startPage + config.search.maxPagesToFetch - 1
    ) {
      // Fetch code search results from GitHub
      const searchData = await fetchCodeSearch(
        redis,
        githubToken,
        query,
        currentPage,
        config.github.resultsPerPage,
      );

      totalCount = searchData.total_count;
      incompleteResults = incompleteResults || searchData.incomplete_results;

      // If no more results, break
      if (searchData.items.length === 0) {
        hasMore = false;
        break;
      }

      // Fetch repository information for each unique repository
      const uniqueRepos = [
        ...new Set(searchData.items.map((item) => item.repository.full_name)),
      ];

      const repoMap = await fetchRepositories(redis, githubToken, uniqueRepos);

      // Apply filter and build result items
      for (let i = 0; i < searchData.items.length; i++) {
        const item = searchData.items[i];

        // Skip items before cursor index on the starting page
        if (currentPage === startPage && i < startIndex) {
          continue;
        }

        const repoInfo = repoMap.get(item.repository.full_name);
        if (!repoInfo) continue; // Skip if repo info fetch failed

        // Apply filter
        if (filter && filter.trim() !== "") {
          try {
            if (!evaluateFilter(filter, repoInfo)) {
              continue; // Skip items that don't match filter
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error
              ? error.message
              : String(error);
            throw new ApiError(
              400,
              `Filter evaluation error: ${errorMessage}`,
            );
          }
        }

        // Add to filtered results with text_matches
        filteredItems.push({
          name: item.name,
          path: item.path,
          sha: item.sha,
          url: item.url,
          git_url: item.git_url,
          html_url: item.html_url,
          repository: repoInfo,
          score: item.score,
          text_matches: item.text_matches, // Pass through text-match metadata
        });

        currentIndex = i + 1; // Track position for next cursor

        // Stop if we have enough results
        if (filteredItems.length >= limit) {
          break;
        }
      }

      // Move to next page
      currentPage++;
      currentIndex = 0; // Reset index for new page

      // Check if there are more pages available
      if (currentPage * config.github.resultsPerPage >= totalCount) {
        hasMore = false;
        break;
      }
    }

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && filteredItems.length >= limit) {
      // If we stopped mid-page, use current index; otherwise use next page
      if (currentIndex > 0 && currentIndex < config.github.resultsPerPage) {
        nextCursor = `${currentPage - 1}:${currentIndex}`;
      } else {
        nextCursor = `${currentPage}:0`;
      }
    }

    // Prepare response
    const response: SearchResponse = {
      items: filteredItems.slice(0, limit),
      nextCursor,
      totalCount,
      hasMore: hasMore && filteredItems.length >= limit,
      incomplete_results: incompleteResults,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Search function error:", error);

    // Handle ApiError with specific status codes
    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          ...(error.details && { details: error.details }),
        }),
        {
          status: error.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
