import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("WORKER_API_KEY") || "NOT_SET";
  return new Response(JSON.stringify({ key }), {
    headers: { "Content-Type": "application/json" },
  });
});
