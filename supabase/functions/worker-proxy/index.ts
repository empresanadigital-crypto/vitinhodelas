import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WORKER_URL = Deno.env.get('WORKER_URL');
    const WORKER_API_KEY = Deno.env.get('WORKER_API_KEY');

    if (!WORKER_URL || !WORKER_API_KEY) {
      throw new Error('WORKER_URL ou WORKER_API_KEY não configurados nos secrets');
    }

    // Autenticar usuário via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    const { action, campaign_id, contact_ids, tags, selected_instance_id } = await req.json();

    const baseUrl = WORKER_URL.replace(/\/$/, '');
    let endpoint = '';
    let method = 'POST';
    let body: Record<string, unknown> = {};

    switch (action) {
      case 'start':
        endpoint = '/campaign/start';
        body = { campaign_id, user_id: userId, contact_ids, tags, selected_instance_id };
        break;
      case 'pause':
        endpoint = '/campaign/pause';
        body = { campaign_id, user_id: userId };
        break;
      case 'resume':
        endpoint = '/campaign/resume';
        body = { campaign_id, user_id: userId };
        break;
      case 'stop':
        endpoint = '/campaign/stop';
        body = { campaign_id, user_id: userId };
        break;
      case 'status':
        endpoint = `/campaign/status/${campaign_id}`;
        method = 'GET';
        break;
      case 'health':
        endpoint = '/health';
        method = 'GET';
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': WORKER_API_KEY,
      },
    };

    if (method === 'POST') {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`Worker proxy: ${method} ${baseUrl}${endpoint}`);
    console.log(`Worker proxy: WORKER_URL=${WORKER_URL}`);
    console.log(`Worker proxy: WORKER_API_KEY length=${WORKER_API_KEY.length}`);
    if (method === 'POST') {
      console.log(`Worker proxy: body=${JSON.stringify(body)}`);
    }

    const controller = new AbortController();
    const timeoutMs = 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      console.error(`Worker proxy: fetch failed: ${fetchErr.name} ${fetchErr.message}`);
      if (fetchErr.name === 'AbortError') {
        throw new Error(`Worker timeout (${timeoutMs}ms). Verifique se o worker está rodando na VPS.`);
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    const responseText = await response.text();
    console.log(`Worker proxy: response status=${response.status}`);
    console.log(`Worker proxy: response body=${responseText}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Worker proxy error:', String(error));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
