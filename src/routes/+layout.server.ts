import type { LayoutServerLoad } from "./$types";
import type { Config } from "@sveltejs/adapter-vercel";

export const config: Config = {
    runtime: "edge",
};

export const load: LayoutServerLoad = async ({ locals }) => {
    const { session } = await locals.safeGetSession();
    return { session };
};
