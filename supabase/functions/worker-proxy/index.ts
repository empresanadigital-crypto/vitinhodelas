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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Ler ação do body
    const { action, campaign_id, contact_ids, tags } = await req.json();

    const WORKER_URL = (Deno.env.get('BAILEYS_API_URL') || 'http://159.65.230.5:3200').replace(/:\d+$/, ':3200');
    const WORKER_API_KEY = Deno.env.get('BAILEYS_API_KEY') || 'READYZAP2025';

    let endpoint = '';
    let method = 'POST';
    let body: Record<string, unknown> = {};

    switch (action) {
      case 'start':
        endpoint = '/campaign/start';
        body = { campaign_id, user_id: userId, contact_ids, tags };
        break;

      case 'pause':
        endpoint = '/campaign/pause';
        body = { campaign_id };
        break;

      case 'resume':
        endpoint = '/campaign/resume';
        body = { campaign_id };
        break;

      case 'stop':
        endpoint = '/campaign/stop';
        body = { campaign_id };
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

    console.log(`Worker proxy: ${method} ${WORKER_URL}${endpoint}`);

    const controller = new AbortController();
    const timeoutMs = 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${WORKER_URL}${endpoint}`, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error(`Worker timeout (${timeoutMs}ms). Verifique se o worker está rodando na VPS.`);
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Worker proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
