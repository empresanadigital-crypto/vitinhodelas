import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This function has been disabled for security reasons.
// It previously exposed WORKER_API_KEY without authentication.
serve(async () => {
  return new Response(JSON.stringify({ error: "This endpoint has been disabled" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
});
