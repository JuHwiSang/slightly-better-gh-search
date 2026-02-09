import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";
import { config } from "./config.ts";

/**
 * Create a Supabase client for a specific role
 */
function createBaseClient(key: string, authHeader?: string): SupabaseClient {
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
 * Initialize Supabase client with service_role key for administrative tasks
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

  if (userError || !user) {
    throw new ApiError(
      401,
      "Unauthorized. Please sign in with GitHub.",
    );
  }

  // Retrieve token from Vault
  const secretName = `github_token_${user.id}`;
  const { data, error } = await supabaseClient
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", secretName)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(
      401,
      "GitHub token not found. Please re-authenticate with GitHub.",
    );
  }

  return data.decrypted_secret;
}
