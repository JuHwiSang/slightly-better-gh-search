import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

// ============================================================
// Supabase Client Factory
// ============================================================

/** Create a Supabase anon client with user's authorization header. */
export function createAnonClient(authHeader: string): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

/** Create a Supabase admin client with service_role key. */
export function createAdminClient(): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey);
}

// ============================================================
// GitHub Token Retrieval
// ============================================================

/**
 * Verify user authentication and retrieve GitHub OAuth token from Vault.
 * @throws {ApiError} 401 if not authenticated or token missing
 */
export async function getGitHubToken(
  supabaseClient: SupabaseClient,
): Promise<string> {
  // Verify user authentication
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError) {
    console.error("[Auth] getUser failed:", userError.message);
    throw new ApiError(401, "Unauthorized. Please sign in with GitHub.");
  }
  if (!user) {
    console.warn("[Auth] getUser returned no user");
    throw new ApiError(401, "Unauthorized. Please sign in with GitHub.");
  }
  console.log(`[Auth] User verified: ${user.id}`);

  // Retrieve token from Vault via RPC
  const secretName = `github_token_${user.id}`;
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .rpc("get_secret_by_name", { secret_name: secretName });

  if (error) {
    console.error(
      "[Auth] Vault query failed for user",
      user.id,
      ":",
      error.message,
    );
    throw new ApiError(
      401,
      "GitHub token not found. Please re-authenticate with GitHub.",
    );
  }
  if (!data) {
    console.warn("[Auth] GitHub token not found in Vault for user:", user.id);
    throw new ApiError(
      401,
      "GitHub token not found. Please re-authenticate with GitHub.",
    );
  }
  console.log(`[Auth] GitHub token retrieved for user: ${user.id}`);

  return data as string;
}
