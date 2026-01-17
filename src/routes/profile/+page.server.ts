import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // Get session using safeGetSession
    const { session } = await locals.safeGetSession();

    // Redirect to home if not authenticated
    if (!session) {
        throw redirect(303, '/');
    }

    // Return session data as required by PageData
    return {
        session
    };
};
