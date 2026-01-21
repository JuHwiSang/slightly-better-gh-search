/**
 * CORS configuration and header generation
 */

import { config } from "./config.ts";

export interface CorsConfig {
  allowedOrigins: string[];
  origin: string;
}

/**
 * Parse CORS configuration from environment and request
 */
export function parseCorsConfig(req: Request): CorsConfig {
  const origin = req.headers.get("Origin") || "";

  return {
    allowedOrigins: config.cors.allowedOrigins,
    origin,
  };
}

/**
 * Generate CORS headers based on configuration
 */
export function generateCorsHeaders(config: CorsConfig): HeadersInit {
  const isAllowedOrigin = config.allowedOrigins.includes(config.origin) ||
    config.allowedOrigins.includes("*");

  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? config.origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}
