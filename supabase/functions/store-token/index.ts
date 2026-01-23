import { createAdminClient, createAnonClient } from "../search/auth.ts";
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

    // 2. Initialize admin client for Vault operations
    const adminClient = createAdminClient();

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
    const { data: existing } = await adminClient
      .from("vault.decrypted_secrets")
      .select("id, name")
      .eq("name", secretName)
      .single();

    if (existing) {
      // Update existing token
      const { error: updateError } = await adminClient
        .from("vault.secrets")
        .update({ secret: providerToken })
        .eq("id", existing.id);

      if (updateError) {
        throw new ApiError(
          500,
          `Failed to update token: ${updateError.message}`,
        );
      }
    } else {
      // Insert new token
      const { error: insertError } = await adminClient
        .from("vault.secrets")
        .insert({
          name: secretName,
          secret: providerToken,
        });

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
