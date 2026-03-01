/**
 * ReadyZap Worker — Processador server-side de campaign_jobs
 *
 * Responsabilidades:
 *   1. Polling da tabela campaign_jobs (queued/retry_scheduled)
 *   2. Lock atômico (UPDATE RETURNING) para evitar jobs duplicados
 *   3. Envio via Baileys / Evolution / Z-API conforme instância
 *   4. Retry com backoff exponencial
 *   5. Endpoints de controle: start, pause, resume, stop, health
 *
 * Deploy na VPS:
 *   cd ~/readyzap-worker
 *   npm install
 *   cp .env.example .env   # preencha as variáveis
 *   pm2 start index.js --name readyzap-worker
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// ─── CONFIG ────────────────────────────────────────
const PORT = process.env.WORKER_PORT || 3200;
const API_KEY = process.env.API_KEY || 'READYZAP2025';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);
const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || '3', 10);

// Supabase (service role para bypassar RLS)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Provider configs
const BAILEYS_API_URL = (process.env.BAILEYS_API_URL || 'http://localhost:3100').replace(/\/$/, '');
const BAILEYS_API_KEY = process.env.BAILEYS_API_KEY || 'READYZAP2025';
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// ─── STATE ─────────────────────────────────────────
let workerRunning = true;
let stats = {
  started_at: new Date().toISOString(),
  jobs_processed: 0,
  jobs_sent: 0,
  jobs_failed: 0,
  last_poll_at: null,
  last_error: null,
};

// ─── EXPRESS APP ───────────────────────────────────
const app = express();
app.use(express.json());

// Auth middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  if (req.path === '/health') return next(); // health é público
  const key = req.headers['apikey'] || req.headers['authorization']?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'apikey, content-type, authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
});

// ─── PROVIDERS ─────────────────────────────────────

/**
 * Envia mensagem via Baileys (servidor local na VPS)
 */
async function sendViaBaileys(instanceName, phone, message) {
  const res = await fetch(`${BAILEYS_API_URL}/message/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': BAILEYS_API_KEY },
    body: JSON.stringify({ instanceName, phone, message }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Baileys HTTP ${res.status}`);
  }
  return data;
}

/**
 * Envia mensagem via Evolution API
 */
async function sendViaEvolution(instanceName, phone, message) {
  if (!EVOLUTION_API_URL) throw new Error('EVOLUTION_API_URL não configurado');
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({ number: phone, text: message }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Evolution HTTP ${res.status}`);
  }
  return data;
}

/**
 * Envia mensagem via Z-API
 */
async function sendViaZapi(instanceId, token, clientToken, phone, message) {
  const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  const res = await fetch(`${baseUrl}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken || '' },
    body: JSON.stringify({ phone, message }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Z-API HTTP ${res.status}`);
  }
  return data;
}

/**
 * Despacha o envio para o provider correto baseado na instância
 */
async function sendMessage(instance, phone, message) {
  const provider = instance.provider || 'baileys';
  switch (provider) {
    case 'baileys':
      return sendViaBaileys(instance.name, phone, message);
    case 'evolution':
      return sendViaEvolution(instance.name, phone, message);
    case 'z-api':
      return sendViaZapi(instance.instance_id, instance.token, instance.client_token, phone, message);
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}

// ─── INSTANCE ROTATION ────────────────────────────

// Cache de contadores por campanha para round-robin
const instanceRotationCounters = new Map();

/**
 * Seleciona a instância para envio.
 * Se a campanha tem rotate_instances=true, faz round-robin.
 * Caso contrário, usa a primeira instância conectada.
 */
async function pickInstance(campaign, userId) {
  // Buscar instâncias conectadas do usuário
  const { data: instances, error } = await supabase
    .from('instances')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected');

  if (error || !instances || instances.length === 0) {
    throw new Error('Nenhuma instância conectada encontrada');
  }

  if (!campaign.rotate_instances || instances.length === 1) {
    return instances[0];
  }

  // Round-robin
  const key = campaign.id;
  const counter = (instanceRotationCounters.get(key) || 0) % instances.length;
  instanceRotationCounters.set(key, counter + 1);
  return instances[counter];
}

// ─── WORKER LOOP ──────────────────────────────────

/**
 * Pega até BATCH_SIZE jobs prontos com lock atômico.
 * Usa UPDATE ... WHERE ... RETURNING para evitar race conditions.
 */
async function claimJobs() {
  // Pegar IDs dos jobs prontos que pertencem a campanhas ativas ('sending')
  const { data: readyJobs, error: fetchError } = await supabase
    .from('campaign_jobs')
    .select('id, campaign_id')
    .in('status', ['queued', 'retry_scheduled'])
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError || !readyJobs || readyJobs.length === 0) return [];

  // Filtrar apenas jobs de campanhas com status 'sending'
  const campaignIds = [...new Set(readyJobs.map(j => j.campaign_id))];
  const { data: activeCampaigns } = await supabase
    .from('campaigns')
    .select('id')
    .in('id', campaignIds)
    .eq('status', 'sending');

  if (!activeCampaigns || activeCampaigns.length === 0) return [];

  const activeCampaignIds = new Set(activeCampaigns.map(c => c.id));
  const eligibleJobIds = readyJobs
    .filter(j => activeCampaignIds.has(j.campaign_id))
    .map(j => j.id);

  if (eligibleJobIds.length === 0) return [];

  // Lock atômico: marcar como processing
  const { data: claimed, error: claimError } = await supabase
    .from('campaign_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .in('id', eligibleJobIds)
    .in('status', ['queued', 'retry_scheduled']) // Re-check status para atomicidade
    .select('*');

  if (claimError) {
    console.error('Erro ao fazer claim dos jobs:', claimError.message);
    return [];
  }

  return claimed || [];
}

/**
 * Processa um único job: envia mensagem e atualiza status.
 */
async function processJob(job) {
  try {
    // Buscar campanha
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', job.campaign_id)
      .single();

    if (campError || !campaign) {
      throw new Error(`Campanha não encontrada: ${job.campaign_id}`);
    }

    // Verificar se campanha ainda está ativa
    if (campaign.status !== 'sending') {
      // Campanha foi pausada/cancelada enquanto processava — devolver job
      await supabase
        .from('campaign_jobs')
        .update({ status: 'queued', started_at: null })
        .eq('id', job.id);
      return;
    }

    // Selecionar instância
    const instance = await pickInstance(campaign, job.user_id);

    // Personalizar mensagem com variáveis
    let message = campaign.message;
    message = message.replace(/\{nome\}/gi, job.contact_name || '');
    message = message.replace(/\{telefone\}/gi, job.contact_phone || '');

    // Enviar
    await sendMessage(instance, job.contact_phone, message);

    // Marcar como enviado
    await supabase
      .from('campaign_jobs')
      .update({
        status: 'sent',
        instance_id: instance.id,
        finished_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq('id', job.id);

    // Incrementar sent_count na campanha
    await supabase.rpc('', {}).catch(() => {}); // placeholder
    await supabase
      .from('campaigns')
      .update({ sent_count: campaign.sent_count + 1 })
      .eq('id', campaign.id);

    stats.jobs_sent++;
    console.log(`✅ [${campaign.name}] Enviado → ${job.contact_phone}`);

  } catch (err) {
    const attempts = job.attempts + 1;
    const shouldRetry = attempts < (job.max_attempts || MAX_ATTEMPTS);

    if (shouldRetry) {
      // Backoff exponencial: 30s, 120s, 480s...
      const backoffSeconds = 30 * Math.pow(4, attempts - 1);
      const retryAt = new Date(Date.now() + backoffSeconds * 1000);

      await supabase
        .from('campaign_jobs')
        .update({
          status: 'retry_scheduled',
          attempts,
          last_error: err.message?.substring(0, 500),
          scheduled_for: retryAt.toISOString(),
          started_at: null,
        })
        .eq('id', job.id);

      console.warn(`⏳ [retry ${attempts}/${job.max_attempts || MAX_ATTEMPTS}] ${job.contact_phone} — próxima em ${backoffSeconds}s`);
    } else {
      // Falha definitiva
      await supabase
        .from('campaign_jobs')
        .update({
          status: 'failed',
          attempts,
          last_error: err.message?.substring(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Incrementar failed_count na campanha
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('failed_count')
        .eq('id', job.campaign_id)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ failed_count: campaign.failed_count + 1 })
          .eq('id', job.campaign_id);
      }

      stats.jobs_failed++;
      console.error(`❌ [falha final] ${job.contact_phone} — ${err.message}`);
    }
  }

  stats.jobs_processed++;
}

/**
 * Verifica se todas as jobs de uma campanha terminaram e finaliza a campanha
 */
async function checkCampaignCompletion(campaignId) {
  const { data: pending } = await supabase
    .from('campaign_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['queued', 'processing', 'retry_scheduled']);

  const pendingCount = pending?.length ?? 0;

  if (pendingCount === 0) {
    await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'sending'); // só completa se ainda estava enviando

    console.log(`🏁 Campanha ${campaignId} concluída`);
  }
}

/**
 * Loop principal do worker
 */
async function pollLoop() {
  while (workerRunning) {
    try {
      stats.last_poll_at = new Date().toISOString();

      const jobs = await claimJobs();

      if (jobs.length > 0) {
        console.log(`📦 ${jobs.length} job(s) reclamados`);

        // Agrupar por campanha para respeitar interval_seconds
        const byCampaign = {};
        for (const job of jobs) {
          if (!byCampaign[job.campaign_id]) byCampaign[job.campaign_id] = [];
          byCampaign[job.campaign_id].push(job);
        }

        for (const [campaignId, campaignJobs] of Object.entries(byCampaign)) {
          // Buscar intervalo da campanha
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('interval_seconds')
            .eq('id', campaignId)
            .single();

          const intervalMs = (campaign?.interval_seconds || 15) * 1000;

          for (let i = 0; i < campaignJobs.length; i++) {
            await processJob(campaignJobs[i]);

            // Respeitar intervalo entre mensagens (exceto último)
            if (i < campaignJobs.length - 1) {
              await sleep(intervalMs);
            }
          }

          // Verificar se campanha terminou
          await checkCampaignCompletion(campaignId);
        }
      }
    } catch (err) {
      stats.last_error = err.message;
      console.error('Erro no poll loop:', err.message);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── API ENDPOINTS ────────────────────────────────

/**
 * GET /health — Status do worker (público)
 */
app.get('/health', async (req, res) => {
  // Contar jobs por status
  const { data: queueStats } = await supabase
    .from('campaign_jobs')
    .select('status')
    .in('status', ['queued', 'processing', 'retry_scheduled']);

  const queue = { queued: 0, processing: 0, retry_scheduled: 0 };
  (queueStats || []).forEach(j => {
    queue[j.status] = (queue[j.status] || 0) + 1;
  });

  res.json({
    status: 'ok',
    worker_running: workerRunning,
    uptime_seconds: Math.floor((Date.now() - new Date(stats.started_at).getTime()) / 1000),
    stats,
    queue,
  });
});

/**
 * POST /campaign/start — Gera jobs a partir dos contatos e inicia o envio
 *
 * Body: { campaign_id, user_id, contact_ids?: string[], tags?: string[] }
 */
app.post('/campaign/start', async (req, res) => {
  try {
    const { campaign_id, user_id, contact_ids, tags } = req.body;

    if (!campaign_id || !user_id) {
      return res.status(400).json({ error: 'campaign_id e user_id são obrigatórios' });
    }

    // Verificar se a campanha existe e pertence ao user
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .single();

    if (campError || !campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    if (campaign.status === 'sending') {
      return res.status(400).json({ error: 'Campanha já está em envio' });
    }

    // Buscar contatos
    let contactsQuery = supabase
      .from('contacts')
      .select('id, phone, name')
      .eq('user_id', user_id);

    if (contact_ids && contact_ids.length > 0) {
      contactsQuery = contactsQuery.in('id', contact_ids);
    }

    if (tags && tags.length > 0) {
      contactsQuery = contactsQuery.overlaps('tags', tags);
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError || !contacts || contacts.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato encontrado para os filtros fornecidos' });
    }

    // Criar jobs com idempotency key
    const jobs = contacts.map(contact => ({
      campaign_id,
      user_id,
      contact_phone: contact.phone,
      contact_name: contact.name,
      status: 'queued',
      idempotency_key: `${campaign_id}:${contact.phone}`,
      scheduled_for: new Date().toISOString(),
    }));

    // Inserir jobs (em batches de 500 para evitar payload muito grande)
    let totalInserted = 0;
    for (let i = 0; i < jobs.length; i += 500) {
      const batch = jobs.slice(i, i + 500);
      const { data: inserted, error: insertError } = await supabase
        .from('campaign_jobs')
        .upsert(batch, { onConflict: 'idempotency_key', ignoreDuplicates: true })
        .select('id');

      if (insertError) {
        console.error('Erro ao inserir jobs:', insertError.message);
        // Se é erro de limite, retornar mensagem amigável
        if (insertError.message.includes('Limite')) {
          return res.status(429).json({ error: insertError.message });
        }
        return res.status(500).json({ error: insertError.message });
      }
      totalInserted += inserted?.length || 0;
    }

    // Atualizar campanha para 'sending'
    await supabase
      .from('campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
        total_contacts: totalInserted,
        sent_count: 0,
        failed_count: 0,
      })
      .eq('id', campaign_id);

    console.log(`🚀 Campanha "${campaign.name}" iniciada com ${totalInserted} jobs`);

    res.json({
      success: true,
      data: {
        campaign_id,
        jobs_created: totalInserted,
        status: 'sending',
      },
    });
  } catch (err) {
    console.error('Erro em /campaign/start:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /campaign/pause — Pausa a campanha (jobs ficam na fila mas não são processados)
 */
app.post('/campaign/pause', async (req, res) => {
  try {
    const { campaign_id } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id obrigatório' });

    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', campaign_id)
      .eq('status', 'sending');

    if (error) return res.status(500).json({ error: error.message });

    console.log(`⏸️ Campanha ${campaign_id} pausada`);
    res.json({ success: true, status: 'paused' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /campaign/resume — Retoma campanha pausada
 */
app.post('/campaign/resume', async (req, res) => {
  try {
    const { campaign_id } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id obrigatório' });

    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id)
      .eq('status', 'paused');

    if (error) return res.status(500).json({ error: error.message });

    console.log(`▶️ Campanha ${campaign_id} retomada`);
    res.json({ success: true, status: 'sending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /campaign/stop — Cancela campanha e todos os jobs pendentes
 */
app.post('/campaign/stop', async (req, res) => {
  try {
    const { campaign_id } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id obrigatório' });

    // Cancelar todos os jobs pendentes
    const { data: cancelled } = await supabase
      .from('campaign_jobs')
      .update({
        status: 'cancelled',
        finished_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaign_id)
      .in('status', ['queued', 'retry_scheduled'])
      .select('id');

    // Marcar campanha como cancelada
    await supabase
      .from('campaigns')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaign_id);

    console.log(`🛑 Campanha ${campaign_id} cancelada — ${cancelled?.length || 0} jobs cancelados`);
    res.json({
      success: true,
      status: 'cancelled',
      jobs_cancelled: cancelled?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /campaign/status/:id — Status detalhado da campanha com contagem de jobs
 */
app.get('/campaign/status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Contar jobs por status
    const { data: jobStats } = await supabase
      .from('campaign_jobs')
      .select('status')
      .eq('campaign_id', id);

    const counts = { queued: 0, processing: 0, sent: 0, failed: 0, retry_scheduled: 0, cancelled: 0 };
    (jobStats || []).forEach(j => {
      counts[j.status] = (counts[j.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        ...campaign,
        job_counts: counts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STARTUP ──────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 ReadyZap Worker rodando na porta ${PORT}`);
  console.log(`   Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Max attempts: ${MAX_ATTEMPTS}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Baileys: ${BAILEYS_API_URL}`);

  // Iniciar loop de polling
  pollLoop().catch(err => {
    console.error('💀 Worker loop crashed:', err);
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('⏹️ Parando worker...');
  workerRunning = false;
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGTERM', () => {
  console.log('⏹️ SIGTERM recebido, parando worker...');
  workerRunning = false;
  setTimeout(() => process.exit(0), 5000);
});
