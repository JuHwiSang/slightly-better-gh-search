import { redirect } from "@sveltejs/kit";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { PageServerLoad } from "./$types";
import type { SearchResponse } from "$lib/types/search";

export const load: PageServerLoad = async ({ url, locals }) => {
    const query = url.searchParams.get("query") || "";
    const filter = url.searchParams.get("filter") || "";

    // Redirect to home if no query
    if (!query) {
        throw redirect(303, "/");
    }

    // Redirect to home if not authenticated
    const { session } = await locals.safeGetSession();
    if (!session) {
        throw redirect(303, "/");
    }

    // Build search params
    const params = new URLSearchParams();
    params.set("query", query);
    if (filter) params.set("filter", filter);
    params.set("limit", "10");

    // Call Edge Function from server
    const { data, error } = await locals.supabase.functions.invoke(
        `search?${params.toString()}`,
        { method: "GET" },
    );

    if (error) {
        let errorMessage = "Search failed";
        if (error instanceof FunctionsHttpError) {
            const { status, statusText } = error.context;
            let responseBody: unknown = null;
            try {
                responseBody = await error.context.json();
                errorMessage = (responseBody as Record<string, string>).error ||
                    errorMessage;
            } catch {
                // Response body is not JSON
            }
            console.error(
                `[Search] Edge Function error`,
                `\n  Status: ${status} ${statusText}`,
                `\n  Query: ${query}`,
                filter ? `\n  Filter: ${filter}` : "",
                `\n  Response:`,
                responseBody ?? "(non-JSON body)",
            );
        } else {
            console.error(
                `[Search] Unexpected error`,
                `\n  Type: ${error?.constructor?.name ?? typeof error}`,
                `\n  Query: ${query}`,
                filter ? `\n  Filter: ${filter}` : "",
                `\n  Detail:`,
                error,
            );
        }
        return { query, filter, initialData: null, error: errorMessage };
    }

    return {
        query,
        filter,
        initialData: data as SearchResponse,
        error: null,
    };
};
