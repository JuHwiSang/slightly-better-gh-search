import { createAnonClient, createVaultAdminClient } from "../search/auth.ts";
import { generateCorsHeaders, parseCorsConfig } from "../search/cors.ts";
import { ApiError } from "../search/errors.ts";

/**
 * Store Token Edge Function
 *
 * Stores GitHub OAuth provider_token in Supabase Vault for authenticated users.
 *
 * Possible API errors:
 * - 400: Missing provider_token in request body
 * - 401: Missing/invalid Authorization header
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

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new ApiError(401, "Missing authorization header");
    }

    // 1. Verify user identity using least-privilege (anon) client
    // This avoids local JWT verification bugs in Deno
    const anonClient = createAnonClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();

    if (userError || !user) {
      throw new ApiError(401, "Invalid token");
    }

    // 2. Initialize vault admin client for Vault operations
    const vaultClient = createVaultAdminClient();

    // Parse request body
    const body = await req.json();
    const providerToken = body.provider_token;

    if (!providerToken || typeof providerToken !== "string") {
      throw new ApiError(
        400,
        "Missing or invalid provider_token in request body",
      );
    }

    // Generate secret name based on user ID
    const secretName = `github_token_${user.id}`;

    // Check if token already exists
    const { data: existing } = await vaultClient
      .from("decrypted_secrets")
      .select("id")
      .eq("name", secretName)
      .maybeSingle();

    if (existing) {
      // Update existing token using RPC function
      const { error: updateError } = await vaultClient.rpc(
        "update_secret",
        {
          secret_id: existing.id,
          new_secret: providerToken,
        },
      );

      if (updateError) {
        throw new ApiError(
          500,
          `Failed to update token: ${updateError.message}`,
        );
      }
    } else {
      // Insert new token using RPC function
      const { error: insertError } = await vaultClient.rpc(
        "create_secret",
        {
          new_secret: providerToken,
          new_name: secretName,
        },
      );

      if (insertError) {
        throw new ApiError(
          500,
          `Failed to store token: ${insertError.message}`,
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Token stored successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Store token function error:", error);

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
