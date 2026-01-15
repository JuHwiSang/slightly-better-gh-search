import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/';

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Validate that 'next' URL has the same origin (security: prevent open redirect)
            try {
                const nextUrl = new URL(next, url.origin);
                if (nextUrl.origin === url.origin) {
                    redirect(303, nextUrl.pathname + nextUrl.search);
                }
            } catch {
                // Invalid URL, redirect to home
            }
        }
    }

    // If no code, error, or invalid next URL, redirect to home
    redirect(303, '/');
};
