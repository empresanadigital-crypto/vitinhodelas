import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        endpoint = '/qr-code';
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
            buttons: [
              {
                id: '1',
                label: buttonText,
              }
            ]
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

    const fetchOptions: RequestInit = {
      method: action === 'qr-code' || action === 'status' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken || '',
      },
    };

    if (fetchOptions.method === 'POST') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

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
