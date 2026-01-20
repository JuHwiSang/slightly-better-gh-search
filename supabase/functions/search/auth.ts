import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
 * Returns null if user is not authenticated or token is missing
 */
export async function getGitHubToken(
  supabaseClient: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    return null;
  }

  return user.user_metadata?.provider_token || null;
}
