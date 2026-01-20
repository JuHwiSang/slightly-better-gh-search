import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";

/**
 * Initialize Supabase client with authorization header
 */
export function createSupabaseClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );
}

/**
 * Get GitHub OAuth token from authenticated user
 * @throws {ApiError} 401 if user is not authenticated or token is missing
 */
export async function getGitHubToken(
  supabaseClient: SupabaseClient,
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    throw new ApiError(
      401,
      "GitHub OAuth token not found. Please re-authenticate.",
    );
  }

  const token = user.user_metadata?.provider_token;
  if (!token) {
    throw new ApiError(
      401,
      "GitHub OAuth token not found. Please re-authenticate.",
    );
  }

  return token;
}
