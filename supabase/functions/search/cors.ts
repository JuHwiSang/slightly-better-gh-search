/**
 * CORS configuration and header generation.
 */

import { config } from "./config.ts";

/**
 * Generate CORS headers for the given request.
 * Checks the request's Origin against the configured allowed origins.
 */
export function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = config.cors.allowedOrigins.includes(origin) ||
    config.cors.allowedOrigins.includes("*");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}
