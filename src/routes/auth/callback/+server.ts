import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') ?? '/';

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Validate that 'next' URL has the same origin (security: prevent open redirect)
            let nextUrl: URL | null = null;
            try {
                nextUrl = new URL(next, url.origin);
            } catch {
                // Invalid URL, will fall through to home redirect
                throw redirect(307, '/');
            }

            if (nextUrl && nextUrl.origin === url.origin) {
                throw redirect(307, nextUrl.pathname + nextUrl.search);
            }
        }
    }

    // If no code, error, or invalid next URL, redirect to home
    throw redirect(307, '/');
};
