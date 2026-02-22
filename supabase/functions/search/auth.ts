import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

/**
 * Create a Supabase client for a specific role
 */
function createBaseClient(
  key: string,
  authHeader?: string,
): SupabaseClient {
  return createClient(config.supabase.url, key, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

/**
 * Initialize Supabase client with anon key and authorization header for user verification
 */
export function createAnonClient(authHeader: string): SupabaseClient {
  return createBaseClient(config.supabase.anonKey, authHeader);
}

/**
 * Initialize Supabase admin client with service_role key for public schema operations
 */
export function createAdminClient(): SupabaseClient {
  return createBaseClient(config.supabase.serviceRoleKey);
}

/**
 * Get GitHub OAuth token from Supabase Vault
 * @throws {ApiError} 401 if user is not authenticated or token is missing
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
    throw new ApiError(
      401,
      "Unauthorized. Please sign in with GitHub.",
    );
  }
  if (!user) {
    console.warn("[Auth] getUser returned no user");
    throw new ApiError(
      401,
      "Unauthorized. Please sign in with GitHub.",
    );
  }
  console.log(`[Auth] User verified: ${user.id}`);

  // Retrieve token from Vault via RPC
  const secretName = `github_token_${user.id}`;
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .rpc("get_secret_by_name", { secret_name: secretName });

  if (error) {
    console.error("[Auth] Vault query failed for user", user.id, ":", error.message);
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
