import { createClient } from "@supabase/supabase-js";
import { evaluateFilter } from "./filter.ts";
import type {
  GitHubCodeSearchResponse,
  RepositoryInfo,
  SearchResponse,
  SearchResultItem,
} from "./types.ts";

const GITHUB_API_BASE = "https://api.github.com";
const RESULTS_PER_PAGE = 100; // GitHub max
const MAX_PAGES_TO_FETCH = 3; // Limit to avoid excessive API calls

Deno.serve(async (req) => {
  // Get allowed origins from environment
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // Get request origin
  const origin = req.headers.get("Origin") || "";

  // Check if origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(origin) ||
    allowedOrigins.includes("*");

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };

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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Get user session
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get GitHub OAuth token from user metadata
    const githubToken = user.user_metadata?.provider_token;
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
      const searchUrl = new URL(`${GITHUB_API_BASE}/search/code`);
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("per_page", RESULTS_PER_PAGE.toString());
      searchUrl.searchParams.set("page", currentPage.toString());

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("GitHub API error:", errorText);
        return new Response(
          JSON.stringify({
            error:
              `GitHub API error: ${searchResponse.status} ${searchResponse.statusText}`,
          }),
          {
            status: searchResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const searchData: GitHubCodeSearchResponse = await searchResponse.json();
      totalCount = searchData.total_count;

      // If no more results, break
      if (searchData.items.length === 0) {
        hasMore = false;
        break;
      }

      // Fetch repository information for each unique repository
      const repoMap = new Map<string, RepositoryInfo>();
      const uniqueRepos = [
        ...new Set(searchData.items.map((item) => item.repository.full_name)),
      ];

      // Fetch all repository info in parallel
      const repoPromises = uniqueRepos.map(async (fullName) => {
        const [owner, repo] = fullName.split("/");
        const repoUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;

        const repoResponse = await fetch(repoUrl, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        if (repoResponse.ok) {
          const repoData: RepositoryInfo = await repoResponse.json();
          repoMap.set(fullName, repoData);
        } else {
          console.warn(`Failed to fetch repo info for ${fullName}`);
        }
      });

      await Promise.all(repoPromises);

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
