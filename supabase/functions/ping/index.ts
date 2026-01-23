// Setup type definitions for built-in Supabase Runtime APIs
// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts"; // 없으면 함수 부팅에 실패함

/**
 * Minimal ping/pong endpoint for testing Edge Function deployment.
 * Used to verify that JWT verification works correctly in production.
 */
Deno.serve(() => {
  return new Response(JSON.stringify({ message: "pong" }), {
    headers: { "Content-Type": "application/json" },
  });
});
