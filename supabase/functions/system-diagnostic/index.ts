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

  // Verificar se é admin
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: roles, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roles) {
    return new Response(
      JSON.stringify({ error: 'Admin access required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // 1. Check secrets (sanitized)
  const WORKER_URL = Deno.env.get('WORKER_URL');
  const WORKER_API_KEY = Deno.env.get('WORKER_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  results.tests['secrets'] = {
    WORKER_URL: WORKER_URL ? `${WORKER_URL.substring(0, 20)}... (len=${WORKER_URL.length})` : 'NOT SET',
    WORKER_API_KEY: WORKER_API_KEY ? 'SET' : 'NOT SET',
    SUPABASE_URL: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
  };

  // 2. Test database connection
  try {
    const { count, error } = await adminClient.from('profiles').select('*', { count: 'exact', head: true });
    results.tests['database'] = {
      status: error ? 'FAIL' : 'OK',
      error: error?.message || null,
      profiles_count: count,
    };
  } catch (e: any) {
    results.tests['database'] = { status: 'FAIL', error: e.message };
  }

  // 3. Test worker connectivity
  if (WORKER_URL) {
    const baseUrl = WORKER_URL.replace(/\/$/, '');

    // 3a. Health check
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const body = await resp.text();
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = body; }
      results.tests['worker_health'] = {
        status: resp.status === 200 ? 'OK' : 'FAIL',
        http_status: resp.status,
        response: parsed,
      };
    } catch (e: any) {
      results.tests['worker_health'] = {
        status: 'FAIL',
        error: e.message,
        error_type: e.name,
        hint: e.name === 'AbortError'
          ? 'Timeout após 10s - worker pode estar offline'
          : 'Connection refused - worker não está rodando na VPS ou porta bloqueada',
      };
    }

    // 3b. Authenticated endpoint test
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WORKER_API_KEY || '',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      await resp.text();
      results.tests['worker_auth'] = {
        status: resp.status === 200 ? 'OK' : 'FAIL',
        http_status: resp.status,
        api_key_accepted: resp.status !== 401 && resp.status !== 403,
      };
    } catch (e: any) {
      results.tests['worker_auth'] = {
        status: 'FAIL',
        error: e.message,
      };
    }
  } else {
    results.tests['worker_health'] = { status: 'SKIP', reason: 'WORKER_URL not set' };
  }

  // Summary
  const testEntries = Object.entries(results.tests as Record<string, any>);
  const allOk = testEntries.every(([, v]) => v.status === 'OK');
  results.overall = allOk ? 'ALL_PASS' : 'HAS_FAILURES';

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
