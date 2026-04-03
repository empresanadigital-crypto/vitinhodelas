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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BAILEYS_API_URL = Deno.env.get('BAILEYS_API_URL');
    const BAILEYS_API_KEY = Deno.env.get('BAILEYS_API_KEY');

    if (!BAILEYS_API_URL || !BAILEYS_API_KEY) {
      throw new Error('BAILEYS_API_URL ou BAILEYS_API_KEY não configurados');
    }

    const baseUrl = BAILEYS_API_URL.replace(/\/$/, '');
    const { action, instanceName, phone, message } = await req.json();

    let endpoint = '';
    let method = 'GET';
    let body: Record<string, unknown> | null = null;

    switch (action) {
      case 'create-instance': {
        endpoint = `/instance/create`;
        method = 'POST';
        body = { instanceName };
        break;
      }

      case 'qr-code': {
        endpoint = `/instance/qr/${instanceName}`;
        method = 'GET';
        break;
      }

      case 'status': {
        endpoint = `/instance/status/${instanceName}`;
        method = 'GET';
        break;
      }

      case 'send-text': {
        if (!phone || !message) {
          return new Response(
            JSON.stringify({ error: 'phone e message são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/message/send-text`;
        method = 'POST';
        body = { instanceName, phone, message };
        break;
      }

      case 'disconnect': {
        endpoint = `/instance/logout/${instanceName}`;
        method = 'DELETE';
        break;
      }

      case 'delete-instance': {
        endpoint = `/instance/delete/${instanceName}`;
        method = 'DELETE';
        break;
      }

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
        'apikey': BAILEYS_API_KEY,
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`Baileys API: ${method} ${baseUrl}${endpoint}`);

    const controller = new AbortController();
    const timeoutMs = 15000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, { ...fetchOptions, signal: controller.signal });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error(`Baileys API timeout (${timeoutMs}ms). Verifique se o servidor está rodando na VPS.`);
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    let data: any;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`Baileys response [${action}] status=${response.status}:`, JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error('Baileys API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: data?.error || `HTTP ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: data?.data ?? data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Baileys proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
