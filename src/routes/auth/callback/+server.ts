import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") ?? "/";

    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
            code,
        );
        if (!error && data.session) {
            // Extract provider_token (only available here)
            const providerToken = data.session.provider_token;

            if (providerToken) {
                // Store token in Vault via RPC
                const { error: rpcError } = await supabase
                    .rpc("store_github_token", { p_token: providerToken });

                if (rpcError) {
                    console.error(
                        "[AuthCallback] Failed to store GitHub token",
                        "\n  Detail:",
                        rpcError.message,
                    );
                }
            }

            // Validate that 'next' URL has the same origin (security: prevent open redirect)
            let nextUrl: URL | null = null;
            try {
                nextUrl = new URL(next, url.origin);
            } catch {
                // Invalid URL, will fall through to home redirect
                throw redirect(307, "/");
            }

            if (nextUrl && nextUrl.origin === url.origin) {
                throw redirect(307, nextUrl.pathname + nextUrl.search);
            }
        }
    }

    // If no code, error, or invalid next URL, redirect to home
    throw redirect(307, "/");
};
