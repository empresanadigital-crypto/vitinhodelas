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
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados');
    }

    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
    const { action, instanceName, phone, message, buttonText, buttonUrl } = await req.json();

    let endpoint = '';
    let method = 'GET';
    let body: Record<string, unknown> | null = null;

    switch (action) {
      case 'create-instance': {
        endpoint = `/instance/create`;
        method = 'POST';
        body = {
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        };
        break;
      }

      case 'qr-code': {
        endpoint = `/instance/connect/${instanceName}`;
        method = 'GET';
        break;
      }

      case 'status': {
        endpoint = `/instance/connectionState/${instanceName}`;
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
        endpoint = `/message/sendText/${instanceName}`;
        method = 'POST';
        body = {
          number: phone,
          text: message,
        };
        break;
      }

      case 'send-button': {
        if (!phone || !message || !buttonText || !buttonUrl) {
          return new Response(
            JSON.stringify({ error: 'phone, message, buttonText e buttonUrl são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/message/sendText/${instanceName}`;
        method = 'POST';
        body = {
          number: phone,
          text: `${message}\n\n${buttonText}: ${buttonUrl}`,
        };
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
        'apikey': EVOLUTION_API_KEY,
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`Evolution API: ${method} ${baseUrl}${endpoint}`);
    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', JSON.stringify(data));
      throw new Error(`Evolution API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Evolution proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
