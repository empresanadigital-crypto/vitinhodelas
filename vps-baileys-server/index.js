/**
 * Servidor WhatsApp Baileys - REST API
 * 
 * Deploy na VPS:
 *   1. mkdir ~/baileys-server && cd ~/baileys-server
 *   2. Copie este arquivo (index.js) e package.json
 *   3. npm install
 *   4. API_KEY=sua_chave_secreta node index.js
 * 
 * Ou com PM2:
 *   API_KEY=sua_chave_secreta pm2 start index.js --name baileys
 */

const express = require('express');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

const sessionsDir = process.env.SESSIONS_DIR || path.join(__dirname, 'sessions');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3100;
const API_KEY = process.env.API_KEY || 'baileys_default_key_change_me';

// Sessions storage
const sessions = new Map();

// CORS (must come before auth so error responses also have CORS headers)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'apikey, content-type, authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['apikey'] || req.headers['authorization']?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Get or create session
async function getSession(instanceName) {
  if (sessions.has(instanceName)) return sessions.get(instanceName);
  return null;
}

// Create session
async function createSession(instanceName) {
  // Clean up existing
  if (sessions.has(instanceName)) {
    const old = sessions.get(instanceName);
    try { old.sock?.end(); } catch {}
    sessions.delete(instanceName);
  }

  const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionsDir, instanceName));
  const { version } = await fetchLatestBaileysVersion();

  const sessionData = {
    qr: null,
    qrBase64: null,
    status: 'connecting',
    phone: null,
    sock: null,
  };

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessionData.qr = qr;
      try {
        sessionData.qrBase64 = await QRCode.toDataURL(qr, { width: 300 });
      } catch (e) {
        console.error('QR encode error:', e);
      }
      sessionData.status = 'qr_ready';
      console.log(`[${instanceName}] QR Code gerado`);
    }

    if (connection === 'open') {
      sessionData.status = 'connected';
      sessionData.qr = null;
      sessionData.qrBase64 = null;
      const jid = sock.user?.id;
      sessionData.phone = jid?.split(':')[0] || jid?.split('@')[0] || null;
      console.log(`[${instanceName}] Conectado! Phone: ${sessionData.phone}`);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`[${instanceName}] Desconectado. Reason: ${reason}`);
      
      if (reason === DisconnectReason.loggedOut) {
        sessionData.status = 'logged_out';
        sessions.delete(instanceName);
        // Clean auth files
        const fs = require('fs');
        const path = `./sessions/${instanceName}`;
        if (fs.existsSync(path)) fs.rmSync(path, { recursive: true });
      } else {
        sessionData.status = 'disconnected';
        // Auto reconnect
        setTimeout(() => createSession(instanceName), 3000);
      }
    }
  });

  sessionData.sock = sock;
  sessions.set(instanceName, sessionData);
  return sessionData;
}

// ─── ROUTES ─────────────────────────────────────

// Create instance
app.post('/instance/create', async (req, res) => {
  try {
    const { instanceName } = req.body;
    if (!instanceName) return res.status(400).json({ error: 'instanceName required' });

    const session = await createSession(instanceName);
    
    // Wait up to 8 seconds for QR
    for (let i = 0; i < 16; i++) {
      if (session.qrBase64 || session.status === 'connected') break;
      await new Promise(r => setTimeout(r, 500));
    }

    res.json({
      success: true,
      data: {
        instanceName,
        status: session.status,
        qrBase64: session.qrBase64 || null,
        phone: session.phone,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get QR Code
app.get('/instance/qr/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    let session = sessions.get(instanceName);
    
    if (!session) {
      // Auto-create if not exists
      session = await createSession(instanceName);
      // Wait for QR
      for (let i = 0; i < 16; i++) {
        if (session.qrBase64 || session.status === 'connected') break;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    res.json({
      success: true,
      data: {
        status: session.status,
        qrBase64: session.qrBase64 || null,
        phone: session.phone,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get status
app.get('/instance/status/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  const session = sessions.get(instanceName);
  
  if (!session) {
    return res.json({ success: true, data: { status: 'not_found' } });
  }

  res.json({
    success: true,
    data: {
      status: session.status,
      phone: session.phone,
    }
  });
});

// Send text message
app.post('/message/send-text', async (req, res) => {
  try {
    const { instanceName, phone, message } = req.body;
    if (!instanceName || !phone || !message) {
      return res.status(400).json({ error: 'instanceName, phone, message required' });
    }

    const session = sessions.get(instanceName);
    if (!session || session.status !== 'connected') {
      return res.status(400).json({ error: 'Instance not connected' });
    }

    const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await session.sock.sendMessage(jid, { text: message });

    res.json({ success: true, data: { sent: true } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Disconnect (logout)
app.delete('/instance/logout/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  const session = sessions.get(instanceName);
  
  if (session?.sock) {
    try { await session.sock.logout(); } catch {}
    try { session.sock.end(); } catch {}
  }
  sessions.delete(instanceName);

  // Clean auth files
  const fs = require('fs');
  const path = `./sessions/${instanceName}`;
  if (fs.existsSync(path)) fs.rmSync(path, { recursive: true });

  res.json({ success: true, data: { message: 'Logged out' } });
});

// Delete instance
app.delete('/instance/delete/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  const session = sessions.get(instanceName);
  
  if (session?.sock) {
    try { session.sock.end(); } catch {}
  }
  sessions.delete(instanceName);

  const fs = require('fs');
  const path = `./sessions/${instanceName}`;
  if (fs.existsSync(path)) fs.rmSync(path, { recursive: true });

  res.json({ success: true, data: { message: 'Instance deleted' } });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Baileys WhatsApp Server rodando na porta ${PORT}`);
  console.log(`   Use API_KEY=${API_KEY.substring(0, 4)}... para autenticar`);
});
