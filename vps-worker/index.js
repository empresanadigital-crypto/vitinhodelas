/**
 * ReadyZap Worker — Processador server-side de campaign_jobs
 *
 * v2: Claim atômico via RPC (FOR UPDATE SKIP LOCKED),
 *     reaper de jobs travados, increment atômico de contadores.
 *
 * Deploy na VPS:
 *   cd ~/readyzap-worker && npm install
 *   cp .env.example .env   # preencha as variáveis
 *   pm2 start index.js --name readyzap-worker
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ─── CONFIG ────────────────────────────────────────
const PORT = process.env.WORKER_PORT || 3200;
const API_KEY = process.env.API_KEY;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);
const REAPER_INTERVAL_MS = parseInt(process.env.REAPER_INTERVAL_MS || '30000', 10);
const STALE_MINUTES = parseInt(process.env.STALE_MINUTES || '10', 10);
const WORKER_ID = process.env.WORKER_ID || `worker-${crypto.randomBytes(4).toString('hex')}`;

if (!API_KEY) {
  console.error('❌ API_KEY é obrigatória. Defina no .env');
  process.exit(1);
}

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
const BAILEYS_API_KEY = process.env.BAILEYS_API_KEY || '';
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// ─── STATE ─────────────────────────────────────────
let workerRunning = true;
const stats = {
  started_at: new Date().toISOString(),
  worker_id: WORKER_ID,
  jobs_processed: 0,
  jobs_sent: 0,
  jobs_failed: 0,
  jobs_reaped: 0,
  last_poll_at: null,
  last_reap_at: null,
  last_error: null,
};

// ─── EXPRESS APP ───────────────────────────────────
const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'apikey, content-type, authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auth middleware (health é público, resto exige apikey)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['apikey'] || req.headers['authorization']?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ─── PROVIDERS ─────────────────────────────────────

// Anexa link do botão ao texto para providers que não suportam botões nativos
function appendButtonToMessage(message, buttonOptions) {
  if (buttonOptions && buttonOptions.buttonText && buttonOptions.buttonUrl) {
    return `${message}\n\n🔗 *${buttonOptions.buttonText}*\n${buttonOptions.buttonUrl}`;
  }
  return message;
}

async function sendViaBaileys(instanceName, phone, message, buttonOptions) {
  const finalMessage = appendButtonToMessage(message, buttonOptions);
  const res = await fetch(`${BAILEYS_API_URL}/message/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': BAILEYS_API_KEY },
    body: JSON.stringify({ instanceName, phone, message: finalMessage }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Baileys HTTP ${res.status}`);
  return data;
}

async function sendViaEvolution(instanceName, phone, message, buttonOptions) {
  if (!EVOLUTION_API_URL) throw new Error('EVOLUTION_API_URL não configurado');
  const finalMessage = appendButtonToMessage(message, buttonOptions);
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({ number: phone, text: finalMessage }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Evolution HTTP ${res.status}`);
  return data;
}

async function sendViaZapi(instanceId, token, clientToken, phone, message, buttonOptions) {
  const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  const headers = { 'Content-Type': 'application/json', 'Client-Token': clientToken || '' };

  // Se tem botão, usa endpoint de botão
  if (buttonOptions && buttonOptions.buttonText && buttonOptions.buttonUrl) {
    const res = await fetch(`${baseUrl}/send-button-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone,
        message,
        buttonActions: [
          {
            id: '1',
            type: 'URL',
            url: buttonOptions.buttonUrl,
            label: buttonOptions.buttonText,
          }
        ]
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Z-API button HTTP ${res.status}`);
    return data;
  }

  const res = await fetch(`${baseUrl}/send-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone, message }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Z-API HTTP ${res.status}`);
  return data;
}

async function sendMessage(instance, phone, message, buttonOptions) {
  const provider = instance.provider || 'baileys';
  switch (provider) {
    case 'baileys':
      return sendViaBaileys(instance.name, phone, message, buttonOptions);
    case 'evolution':
      return sendViaEvolution(instance.name, phone, message, buttonOptions);
    case 'z-api':
      return sendViaZapi(instance.instance_id, instance.token, instance.client_token, phone, message, buttonOptions);
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}

// ─── INSTANCE ROTATION ────────────────────────────

const instanceRotationCounters = new Map();

async function pickInstance(campaign, userId) {
  // Se a campanha tem instância específica, usa ela diretamente
  if (campaign.selected_instance_id) {
    const { data: instance, error } = await supabase
      .from('instances')
      .select('*')
      .eq('id', campaign.selected_instance_id)
      .eq('status', 'connected')
      .single();

    if (error || !instance) {
      throw new Error(`Instância selecionada (${campaign.selected_instance_id}) não encontrada ou desconectada.`);
    }
    return instance;
  }

  // Sem instância específica: pega todas conectadas do usuário
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

  const key = campaign.id;
  const counter = (instanceRotationCounters.get(key) || 0) % instances.length;
  instanceRotationCounters.set(key, counter + 1);
  return instances[counter];
}

// ─── CLAIM JOBS (via RPC atômico) ─────────────────

async function claimJobs() {
  const { data, error } = await supabase.rpc('claim_campaign_jobs', {
    p_batch_size: BATCH_SIZE,
    p_worker_id: WORKER_ID,
  });

  if (error) {
    console.error('Erro no claim_campaign_jobs RPC:', error.message);
    return [];
  }

  return data || [];
}

// ─── PROCESS JOB ──────────────────────────────────

async function processJob(job) {
  try {
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', job.campaign_id)
      .single();

    if (campError || !campaign) {
      throw new Error(`Campanha não encontrada: ${job.campaign_id}`);
    }

    if (campaign.status !== 'sending') {
      await supabase
        .from('campaign_jobs')
        .update({ status: 'queued', started_at: null, worker_id: null, locked_at: null })
        .eq('id', job.id);
      return;
    }

    const instance = await pickInstance(campaign, job.user_id);

    let message = campaign.message;
    message = message.replace(/\{nome\}/gi, job.contact_name || '');
    message = message.replace(/\{telefone\}/gi, job.contact_phone || '');

    // Preparar opções de botão se a campanha usa botões
    const buttonOptions = campaign.use_buttons ? {
      buttonText: campaign.button_text,
      buttonUrl: campaign.button_url,
    } : null;

    await sendMessage(instance, job.contact_phone, message, buttonOptions);

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

    // Incremento atômico via RPC
    await supabase.rpc('increment_campaign_counts', {
      p_campaign_id: job.campaign_id,
      p_sent_delta: 1,
      p_failed_delta: 0,
    });

    stats.jobs_sent++;
    console.log(`✅ [${campaign.name}] Enviado → ${job.contact_phone}`);

  } catch (err) {
    const attempts = job.attempts + 1;
    const maxAttempts = job.max_attempts || 5;
    const shouldRetry = attempts < maxAttempts;

    if (shouldRetry) {
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
          worker_id: null,
          locked_at: null,
        })
        .eq('id', job.id);

      console.warn(`⏳ [retry ${attempts}/${maxAttempts}] ${job.contact_phone} — próxima em ${backoffSeconds}s`);
    } else {
      await supabase
        .from('campaign_jobs')
        .update({
          status: 'failed',
          attempts,
          last_error: err.message?.substring(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Incremento atômico via RPC
      await supabase.rpc('increment_campaign_counts', {
        p_campaign_id: job.campaign_id,
        p_sent_delta: 0,
        p_failed_delta: 1,
      });

      stats.jobs_failed++;
      console.error(`❌ [falha final] ${job.contact_phone} — ${err.message}`);
    }
  }

  stats.jobs_processed++;
}

// ─── CHECK CAMPAIGN COMPLETION ────────────────────

async function checkCampaignCompletion(campaignId) {
  const { count, error } = await supabase
    .from('campaign_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['queued', 'processing', 'retry_scheduled']);

  if (error) {
    console.error('Erro ao checar completion:', error.message);
    return;
  }

  if (count === 0) {
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'sending');

    if (!updateError) {
      console.log(`🏁 Campanha ${campaignId} concluída`);
      instanceRotationCounters.delete(campaignId);
    }
  }
}

// ─── REAPER (jobs travados) ───────────────────────

async function reapStaleJobs() {
  try {
    const { data, error } = await supabase.rpc('reap_stale_jobs', {
      p_stale_minutes: STALE_MINUTES,
    });

    stats.last_reap_at = new Date().toISOString();

    if (error) {
      console.error('Erro no reaper:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const requeued = data.filter(r => r.new_status === 'queued').length;
      const failed = data.filter(r => r.new_status === 'failed').length;
      stats.jobs_reaped += data.length;

      // Incrementar failed_count para os que falharam definitivamente
      if (failed > 0) {
        // Agrupar por campaign_id (precisamos buscar os jobs)
        const failedIds = data.filter(r => r.new_status === 'failed').map(r => r.reaped_id);
        const { data: failedJobs } = await supabase
          .from('campaign_jobs')
          .select('campaign_id')
          .in('id', failedIds);

        if (failedJobs) {
          const countByCampaign = {};
          failedJobs.forEach(j => {
            countByCampaign[j.campaign_id] = (countByCampaign[j.campaign_id] || 0) + 1;
          });
          for (const [cid, count] of Object.entries(countByCampaign)) {
            await supabase.rpc('increment_campaign_counts', {
              p_campaign_id: cid,
              p_sent_delta: 0,
              p_failed_delta: count,
            });
          }
        }
      }

      console.log(`🔄 Reaper: ${requeued} reenfileirados, ${failed} falhados`);
    }
  } catch (err) {
    console.error('Reaper crash:', err.message);
  }
}

// ─── POLL LOOP ────────────────────────────────────

async function pollLoop() {
  while (workerRunning) {
    try {
      stats.last_poll_at = new Date().toISOString();

      const jobs = await claimJobs();

      if (jobs.length > 0) {
        console.log(`📦 ${jobs.length} job(s) reclamados por ${WORKER_ID}`);

        const byCampaign = {};
        for (const job of jobs) {
          if (!byCampaign[job.campaign_id]) byCampaign[job.campaign_id] = [];
          byCampaign[job.campaign_id].push(job);
        }

        for (const [campaignId, campaignJobs] of Object.entries(byCampaign)) {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('interval_seconds')
            .eq('id', campaignId)
            .single();

          const intervalMs = (campaign?.interval_seconds || 15) * 1000;

          for (let i = 0; i < campaignJobs.length; i++) {
            await processJob(campaignJobs[i]);
            if (i < campaignJobs.length - 1) {
              await sleep(intervalMs);
            }
          }

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

// ─── REAPER LOOP ──────────────────────────────────

async function reaperLoop() {
  while (workerRunning) {
    await reapStaleJobs();
    await sleep(REAPER_INTERVAL_MS);
  }
}

// ─── SCHEDULER LOOP (campanhas agendadas) ─────────

async function schedulerLoop() {
  while (workerRunning) {
    try {
      const now = new Date().toISOString();
      const { data: scheduled } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

      for (const campaign of (scheduled || [])) {
        console.log(`📅 Iniciando campanha agendada: ${campaign.name}`);

        // Use saved contact_ids if available, otherwise all user contacts
        let contactsQuery = supabase
          .from('contacts')
          .select('id, phone, name')
          .eq('user_id', campaign.user_id);

        const savedContactIds = campaign.contact_ids;
        if (savedContactIds && Array.isArray(savedContactIds) && savedContactIds.length > 0) {
          contactsQuery = contactsQuery.in('id', savedContactIds);
        }

        const { data: contacts } = await contactsQuery;

        if (!contacts || contacts.length === 0) {
          console.warn(`📅 Campanha ${campaign.name}: nenhum contato encontrado, pulando.`);
          await supabase.from('campaigns').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', campaign.id);
          continue;
        }

        const jobs = contacts.map(contact => ({
          campaign_id: campaign.id,
          user_id: campaign.user_id,
          contact_phone: contact.phone,
          contact_name: contact.name,
          status: 'queued',
          idempotency_key: `${campaign.id}:${contact.phone}`,
          scheduled_for: new Date().toISOString(),
        }));

        let totalInserted = 0;
        for (let i = 0; i < jobs.length; i += 500) {
          const batch = jobs.slice(i, i + 500);
          const { data: inserted, error: insertError } = await supabase
            .from('campaign_jobs')
            .upsert(batch, { onConflict: 'idempotency_key', ignoreDuplicates: true })
            .select('id');

          if (insertError) {
            console.error(`📅 Erro ao inserir jobs: ${insertError.message}`);
            break;
          }
          totalInserted += inserted?.length || 0;
        }

        await supabase.from('campaigns').update({
          status: 'sending',
          started_at: new Date().toISOString(),
          total_contacts: totalInserted,
          sent_count: 0,
          failed_count: 0,
        }).eq('id', campaign.id);

        console.log(`📅 Campanha "${campaign.name}" iniciada com ${totalInserted} jobs`);
      }
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
    await sleep(60000);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── API ENDPOINTS ────────────────────────────────

app.get('/health', async (req, res) => {
  const { count: queuedCount } = await supabase
    .from('campaign_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued');

  const { count: processingCount } = await supabase
    .from('campaign_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing');

  const { count: retryCount } = await supabase
    .from('campaign_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'retry_scheduled');

  res.json({
    status: 'ok',
    worker_running: workerRunning,
    uptime_seconds: Math.floor((Date.now() - new Date(stats.started_at).getTime()) / 1000),
    stats,
    queue: {
      queued: queuedCount || 0,
      processing: processingCount || 0,
      retry_scheduled: retryCount || 0,
    },
  });
});

app.post('/campaign/start', async (req, res) => {
  try {
    const { campaign_id, user_id, contact_ids, tags, selected_instance_id } = req.body;
    if (!campaign_id || !user_id) {
      return res.status(400).json({ error: 'campaign_id e user_id são obrigatórios' });
    }

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
      return res.json({ success: true, already_sending: true, data: { campaign_id, status: 'sending' } });
    }

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
      return res.status(400).json({ error: 'Nenhum contato encontrado' });
    }

    const jobs = contacts.map(contact => ({
      campaign_id,
      user_id,
      contact_phone: contact.phone,
      contact_name: contact.name,
      status: 'queued',
      idempotency_key: `${campaign_id}:${contact.phone}`,
      scheduled_for: new Date().toISOString(),
    }));

    let totalInserted = 0;
    for (let i = 0; i < jobs.length; i += 500) {
      const batch = jobs.slice(i, i + 500);
      const { data: inserted, error: insertError } = await supabase
        .from('campaign_jobs')
        .upsert(batch, { onConflict: 'idempotency_key', ignoreDuplicates: true })
        .select('id');

      if (insertError) {
        if (insertError.message.includes('Limite')) {
          return res.status(429).json({ error: insertError.message });
        }
        return res.status(500).json({ error: insertError.message });
      }
      totalInserted += inserted?.length || 0;
    }

    const campaignUpdate = {
      status: 'sending',
      started_at: new Date().toISOString(),
      total_contacts: totalInserted,
      sent_count: 0,
      failed_count: 0,
    };
    if (selected_instance_id) {
      campaignUpdate.selected_instance_id = selected_instance_id;
    }

    await supabase
      .from('campaigns')
      .update(campaignUpdate)
      .eq('id', campaign_id);

    console.log(`🚀 Campanha "${campaign.name}" iniciada com ${totalInserted} jobs`);

    res.json({
      success: true,
      data: { campaign_id, jobs_created: totalInserted, status: 'sending' },
    });
  } catch (err) {
    console.error('Erro em /campaign/start:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/campaign/pause', async (req, res) => {
  try {
    const { campaign_id, user_id } = req.body;
    if (!campaign_id || !user_id) return res.status(400).json({ error: 'campaign_id e user_id são obrigatórios' });

    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .eq('status', 'sending');

    if (error) return res.status(500).json({ error: error.message });

    console.log(`⏸️ Campanha ${campaign_id} pausada`);
    res.json({ success: true, status: 'paused' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/campaign/resume', async (req, res) => {
  try {
    const { campaign_id, user_id } = req.body;
    if (!campaign_id || !user_id) return res.status(400).json({ error: 'campaign_id e user_id são obrigatórios' });

    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .eq('status', 'paused');

    if (error) return res.status(500).json({ error: error.message });

    console.log(`▶️ Campanha ${campaign_id} retomada`);
    res.json({ success: true, status: 'sending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/campaign/stop', async (req, res) => {
  try {
    const { campaign_id } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id obrigatório' });

    const { data: cancelled } = await supabase
      .from('campaign_jobs')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('campaign_id', campaign_id)
      .in('status', ['queued', 'retry_scheduled'])
      .select('id');

    await supabase
      .from('campaigns')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', campaign_id);

    console.log(`🛑 Campanha ${campaign_id} cancelada — ${cancelled?.length || 0} jobs cancelados`);
    res.json({ success: true, status: 'cancelled', jobs_cancelled: cancelled?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    // Counts via queries separadas com count exact
    const statuses = ['queued', 'processing', 'sent', 'failed', 'retry_scheduled', 'cancelled'];
    const counts = {};
    await Promise.all(statuses.map(async (s) => {
      const { count } = await supabase
        .from('campaign_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('status', s);
      counts[s] = count || 0;
    }));

    res.json({
      success: true,
      data: { ...campaign, job_counts: counts },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STARTUP ──────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 ReadyZap Worker ${WORKER_ID} rodando na porta ${PORT}`);
  console.log(`   Poll: ${POLL_INTERVAL_MS}ms | Batch: ${BATCH_SIZE} | Reaper: ${REAPER_INTERVAL_MS}ms`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Baileys: ${BAILEYS_API_URL}`);

  pollLoop().catch(err => {
    console.error('💀 Poll loop crashed:', err);
    process.exit(1);
  });

  reaperLoop().catch(err => {
    console.error('💀 Reaper loop crashed:', err);
  });

  schedulerLoop().catch(err => {
    console.error('💀 Scheduler crashed:', err);
  });
});

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
