import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceId, token, clientToken, phone, message, buttonText, buttonUrl } = await req.json();

    if (!instanceId || !token) {
      return new Response(
        JSON.stringify({ error: 'instanceId e token são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;

    let endpoint = '';
    let body: Record<string, unknown> = {};

    switch (action) {
      case 'qr-code':
        endpoint = '/qr-code/image';
        break;

      case 'status':
        endpoint = '/status';
        break;

      case 'send-text':
        if (!phone || !message) {
          return new Response(
            JSON.stringify({ error: 'phone e message são obrigatórios para envio' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = '/send-text';
        body = { phone, message };
        break;

      case 'send-button':
        if (!phone || !message || !buttonText || !buttonUrl) {
          return new Response(
            JSON.stringify({ error: 'phone, message, buttonText e buttonUrl são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = '/send-button-list';
        body = {
          phone,
          message,
          buttonList: {
            buttons: [{ id: '1', label: buttonText }]
          }
        };
        break;

      case 'disconnect':
        endpoint = '/disconnect';
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const isGet = action === 'qr-code' || action === 'status';
    const fetchOptions: RequestInit = {
      method: isGet ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken || '',
      },
    };

    if (!isGet) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`Z-API: ${fetchOptions.method} ${baseUrl}${endpoint}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, { ...fetchOptions, signal: controller.signal });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Z-API timeout (15s)');
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    // Z-API qr-code/image returns an image directly
    if (action === 'qr-code' && response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('image')) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        return new Response(
          JSON.stringify({ success: true, data: { base64: `data:image/png;base64,${base64}` } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let data: any;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`Z-API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Z-API proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
