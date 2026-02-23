import { evaluateFilter, validateFilter } from "./filter.ts";
import type { SearchResponse, SearchResultItem } from "./types.ts";
import { generateCorsHeaders, parseCorsConfig } from "./cors.ts";
import { createAdminClient, createAnonClient, getGitHubToken } from "./auth.ts";
import { fetchCodeSearch, fetchRepositories } from "./github.ts";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

/**
 * Parse and validate cursor parameter
 * @param cursor - Cursor string in format "page:index" or just "page"
 * @returns Object with validated page and index, or null if invalid
 */
export function parseCursor(cursor: string | null): {
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

  // Track request context for error logging (declared outside try for catch access)
  let query = "";
  let cursor: string | null = null;
  let limit = config.search.defaultLimit;

  try {
    // Parse request body (POST)
    const body = await req.json();
    query = body.query || "";
    const filter = body.filter || "";
    cursor = body.cursor || null;
    limit = parseInt(
      body.limit?.toString() || config.search.defaultLimit.toString(),
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

    // Initialize Supabase admin client for cache operations
    const cacheClient = createAdminClient();

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

    // Validate filter expression early (before GitHub API calls)
    if (filter && filter.trim() !== "") {
      const validation = validateFilter(filter);
      if (!validation.valid) {
        throw new ApiError(
          400,
          `Invalid filter expression: ${validation.error}`,
        );
      }
    }

    // Fetch and filter results
    const filteredItems: SearchResultItem[] = [];
    let currentPage = cursorData?.page ?? 1;
    let currentIndex = cursorData?.index ?? 0;
    let totalCount = 0;
    let hasMore = true;
    let incompleteResults = false;
    const maxPage = currentPage + config.search.maxPagesToFetch - 1;

    while (filteredItems.length < limit && currentPage <= maxPage) {
      const searchData = await fetchCodeSearch(
        cacheClient,
        githubToken,
        query,
        currentPage,
        config.github.resultsPerPage,
      );

      totalCount = searchData.total_count;
      incompleteResults = incompleteResults || searchData.incomplete_results;

      if (searchData.items.length === 0) {
        hasMore = false;
        break;
      }

      // Fetch repo info only for items from currentIndex onward
      const uniqueRepos = [
        ...new Set(
          searchData.items.slice(currentIndex).map((item) => item.repository.full_name),
        ),
      ];
      const repoMap = await fetchRepositories(cacheClient, githubToken, uniqueRepos);

      // Process items starting from currentIndex
      for (; currentIndex < searchData.items.length; currentIndex++) {
        const item = searchData.items[currentIndex];

        const repoInfo = repoMap.get(item.repository.full_name);
        if (!repoInfo) {
          console.warn(`[Search] Skipping item — repo info missing: ${item.repository.full_name}`);
          continue;
        }

        if (filter && filter.trim() !== "") {
          try {
            if (!evaluateFilter(filter, repoInfo)) {
              continue;
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

        if (filteredItems.length >= limit) {
          currentIndex++; // point to next unprocessed item
          break;
        }
      }

      if (filteredItems.length >= limit) break;

      // Page exhausted — move to next page
      currentPage++;
      currentIndex = 0;

      if (currentPage * config.github.resultsPerPage >= totalCount) {
        hasMore = false;
        break;
      }
    }

    // Normalize: if currentIndex went past the page, advance to next page
    if (currentIndex >= config.github.resultsPerPage) {
      currentPage++;
      currentIndex = 0;
    }

    const nextCursor = (hasMore && filteredItems.length >= limit)
      ? `${currentPage}:${currentIndex}`
      : null;

    // Prepare response
    const response: SearchResponse = {
      items: filteredItems.slice(0, limit),
      next_cursor: nextCursor,
      total_count: totalCount,
      has_more: hasMore && filteredItems.length >= limit,
      incomplete_results: incompleteResults,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error(
      "[Search] Unhandled error",
      `\n  query="${query}", cursor=${cursor}, limit=${limit}`,
      "\n  Error:",
      error,
    );

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
