import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    // Get session using safeGetSession
    const { session } = await locals.safeGetSession();

    // Redirect to home if not authenticated
    if (!session) {
        throw redirect(303, "/");
    }

    // Stream profile data
    const profilePromise = locals.supabase
        .from("profiles")
        .select(
            "search_limit_used, search_limit_remaining, search_limit_reset, repo_limit_used, repo_limit_remaining, repo_limit_reset",
        )
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => data);

    // Return session data and streamed promise
    return {
        session,
        streamed: {
            profile: profilePromise,
        },
    };
};
