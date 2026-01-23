/**
 * Minimal ping/pong endpoint for testing Edge Function deployment.
 * Used to verify that JWT verification works correctly in production.
 */
Deno.serve(() => {
  return new Response(JSON.stringify({ message: "pong" }), {
    headers: { "Content-Type": "application/json" },
  });
});
