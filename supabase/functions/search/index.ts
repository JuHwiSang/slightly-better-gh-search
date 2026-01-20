import { evaluateFilter } from "./filter.ts";
import type { SearchResponse, SearchResultItem } from "./types.ts";
import { createRedisClient } from "./cache.ts";
import { generateCorsHeaders, parseCorsConfig } from "./cors.ts";
import { createSupabaseClient, getGitHubToken } from "./auth.ts";
import { fetchCodeSearch, fetchRepositories } from "./github.ts";

const RESULTS_PER_PAGE = 100; // GitHub max
const MAX_PAGES_TO_FETCH = 3; // Limit to avoid excessive API calls
const MAX_GITHUB_PAGE = 10; // GitHub Code Search limit (1000 results / 100 per page)

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
      page < 1 || page > MAX_GITHUB_PAGE ||
      index < 0 || index >= RESULTS_PER_PAGE
    ) {
      return null; // Invalid cursor
    }

    return { page, index };
  } else if (parts.length === 1) {
    // Backward compatibility: treat as page number only
    const page = parseInt(parts[0], 10);

    if (isNaN(page) || page < 1 || page > MAX_GITHUB_PAGE) {
      return null; // Invalid cursor
    }

    return { page, index: 0 };
  }

  return null; // Invalid format
}

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
    const limit = parseInt(url.searchParams.get("limit") || "30", 10);

    // Validate query
    if (!query || query.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase client and get GitHub token
    const supabaseClient = createSupabaseClient(authHeader);
    const githubToken = await getGitHubToken(supabaseClient);

    if (!githubToken) {
      return new Response(
        JSON.stringify({
          error: "GitHub OAuth token not found. Please re-authenticate.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Redis client (null if not configured)
    const redis = createRedisClient();

    // Parse and validate cursor
    const cursorData = parseCursor(cursor);
    if (cursor && !cursorData) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid cursor format. Expected 'page:index' where page is 1-10 and index is 0-99.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
      currentPage <= startPage + MAX_PAGES_TO_FETCH - 1
    ) {
      // Fetch code search results from GitHub
      const searchData = await fetchCodeSearch(
        redis,
        githubToken,
        query,
        currentPage,
        RESULTS_PER_PAGE,
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
            return new Response(
              JSON.stringify({
                error: `Filter evaluation error: ${errorMessage}`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
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
      if (currentPage * RESULTS_PER_PAGE >= totalCount) {
        hasMore = false;
        break;
      }
    }

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && filteredItems.length >= limit) {
      // If we stopped mid-page, use current index; otherwise use next page
      if (currentIndex > 0 && currentIndex < RESULTS_PER_PAGE) {
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
