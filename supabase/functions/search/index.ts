import { evaluateFilter } from "./filter.ts";
import type { SearchResponse, SearchResultItem } from "./types.ts";
import { createRedisClient } from "./cache.ts";
import { generateCorsHeaders, parseCorsConfig } from "./cors.ts";
import { createSupabaseClient, getGitHubToken } from "./auth.ts";
import { fetchCodeSearch, fetchRepositories } from "./github.ts";

const RESULTS_PER_PAGE = 100; // GitHub max
const MAX_PAGES_TO_FETCH = 3; // Limit to avoid excessive API calls

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

    // Parse cursor to determine starting page
    const startPage = cursor ? parseInt(cursor, 10) : 1;

    // Fetch and filter results
    const filteredItems: SearchResultItem[] = [];
    let currentPage = startPage;
    let totalCount = 0;
    let hasMore = true;

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
      for (const item of searchData.items) {
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

        // Add to filtered results
        filteredItems.push({
          name: item.name,
          path: item.path,
          sha: item.sha,
          url: item.url,
          git_url: item.git_url,
          html_url: item.html_url,
          repository: repoInfo,
          score: item.score,
        });

        // Stop if we have enough results
        if (filteredItems.length >= limit) {
          break;
        }
      }

      // Move to next page
      currentPage++;

      // Check if there are more pages available
      if (currentPage * RESULTS_PER_PAGE >= totalCount) {
        hasMore = false;
        break;
      }
    }

    // Prepare response
    const response: SearchResponse = {
      items: filteredItems.slice(0, limit),
      nextCursor: hasMore && filteredItems.length >= limit
        ? currentPage.toString()
        : null,
      totalCount,
      hasMore: hasMore && filteredItems.length >= limit,
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
