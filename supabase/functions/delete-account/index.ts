import { createAdminClient, createAnonClient } from "../search/auth.ts";
import { generateCorsHeaders, parseCorsConfig } from "../search/cors.ts";
import { ApiError } from "../search/errors.ts";

/**
 * Delete Account Edge Function
 *
 * Deletes the authenticated user's account:
 * 1. Verifies the user's JWT
 * 2. Deletes the user's GitHub token from Vault
 * 3. Deletes the user from Supabase Auth
 *
 * Note: The GitHub OAuth token itself (on GitHub's side) is NOT revoked.
 * This is an intentional trade-off — the token's scope is limited to
 * read:user/email only, so exposure risk is minimal.
 * See ADR-007 for details.
 *
 * Possible API errors:
 * - 401: Missing Authorization header or invalid JWT
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
        // Only allow DELETE or POST
        if (req.method !== "DELETE" && req.method !== "POST") {
            throw new ApiError(405, "Method not allowed");
        }

        // Get authorization header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new ApiError(401, "Missing authorization header");
        }

        // Verify user via anon client
        const anonClient = createAnonClient(authHeader);
        const {
            data: { user },
            error: userError,
        } = await anonClient.auth.getUser();

        if (userError) {
            console.error("[DeleteAccount] getUser failed:", userError.message);
            throw new ApiError(401, "Unauthorized. Please sign in.");
        }
        if (!user) {
            console.warn("[DeleteAccount] getUser returned no user");
            throw new ApiError(401, "Unauthorized. Please sign in.");
        }

        const userId = user.id;
        const adminClient = createAdminClient();

        // Delete GitHub token from Vault (best effort — don't fail if missing)
        const secretName = `github_token_${userId}`;
        const { error: deleteSecretError } = await adminClient.rpc(
            "delete_secret_by_name",
            { secret_name: secretName },
        );
        if (deleteSecretError) {
            console.warn(
                `[DeleteAccount] Failed to delete Vault secret for user ${userId}:`,
                deleteSecretError.message,
            );
            // Continue — the Vault secret missing should not block account deletion
        }

        // Delete user from Supabase Auth
        const { error: deleteUserError } = await adminClient.auth.admin
            .deleteUser(
                userId,
            );
        if (deleteUserError) {
            console.error(
                `[DeleteAccount] Failed to delete user ${userId}:`,
                deleteUserError.message,
            );
            throw new ApiError(
                500,
                "Failed to delete account. Please try again.",
            );
        }

        console.log(`[DeleteAccount] User ${userId} deleted successfully`);

        return new Response(
            JSON.stringify({ message: "Account deleted successfully" }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    } catch (error: unknown) {
        console.error("[DeleteAccount] Error:", error);

        if (error instanceof ApiError) {
            return new Response(
                JSON.stringify({ error: error.message }),
                {
                    status: error.status,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const errorMessage = error instanceof Error
            ? error.message
            : String(error);
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
