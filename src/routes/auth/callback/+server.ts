import { redirect } from "@sveltejs/kit";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
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
                // Store token in Vault via Edge Function
                try {
                    const response = await fetch(
                        `${PUBLIC_SUPABASE_URL}/functions/v1/store-token`,
                        {
                            method: "POST",
                            headers: {
                                "Authorization":
                                    `Bearer ${data.session.access_token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                provider_token: providerToken,
                            }),
                        },
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error(
                            "Failed to store GitHub token:",
                            errorData,
                        );
                    }
                } catch (storeError) {
                    console.error("Error storing GitHub token:", storeError);
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
