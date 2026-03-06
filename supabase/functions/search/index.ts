import { buildCorsHeaders } from "./cors.ts";
import { createAdminClient, createAnonClient, getGitHubToken } from "./auth.ts";
import { CacheService } from "./cache.ts";
import { GitHubClient } from "./github.ts";
import { SearchRequest } from "./request.ts";
import { SearchOrchestrator } from "./orchestrator.ts";
import { ResponseBuilder } from "./response.ts";
import { ApiError } from "./errors.ts";

/**
 * Search Edge Function
 *
 * Thin handler — delegates to focused classes:
 * - SearchRequest: input parsing + validation
 * - SearchOrchestrator: fetch loop + filtering
 * - ResponseBuilder: response construction
 *
 * Possible API errors:
 * - 400: Missing/empty query, invalid cursor, invalid limit, filter error
 * - 401: Missing auth header, GitHub token not found
 * - 500: Unexpected internal errors
 */
Deno.serve(async (req) => {
  const startTime = performance.now();
  const corsHeaders = buildCorsHeaders(req);
  const response = new ResponseBuilder(corsHeaders);

  if (req.method === "OPTIONS") {
    return response.preflight();
  }

  // Track for error logging
  let request: SearchRequest | null = null;

  try {
    request = new SearchRequest(await req.json());

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new ApiError(401, "Missing authorization header");
    }

    const supabaseClient = createAnonClient(authHeader);
    const githubToken = await getGitHubToken(supabaseClient);

    // Wire dependencies and execute
    const cache = new CacheService(createAdminClient());
    const github = new GitHubClient(cache, githubToken);
    const orchestrator = new SearchOrchestrator(github);
    const result = await orchestrator.execute(request);

    const latency = (performance.now() - startTime).toFixed(2);
    console.log(`[Search] Request completed successfully in ${latency}ms`);
    return response.success(result);
  } catch (error: unknown) {
    const latency = (performance.now() - startTime).toFixed(2);
    console.error(
      `[Search] Unhandled error (${latency}ms)`,
      `\n  query="${request?.query ?? ""}", cursor=${
        request?.cursor ?? null
      }, limit=${request?.limit ?? ""}`,
      "\n  Error:",
      error,
    );

    if (error instanceof ApiError) {
      return response.apiError(error);
    }
    return response.internalError(error);
  }
});
