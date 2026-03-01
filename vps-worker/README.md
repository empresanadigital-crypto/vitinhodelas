# ReadyZap Worker

Processador server-side de fila de mensagens. Substitui o loop de envio no browser.

## Arquitetura

```
Frontend → Edge Function (worker-proxy) → VPS Worker (porta 3200)
                                              ↓
                                         Supabase DB (campaign_jobs)
                                              ↓
                                    Baileys / Evolution / Z-API
```

## Pré-requisitos

- Node.js 18+
- PM2 (recomendado para produção)
- Servidor Baileys rodando na porta 3100 (mesmo VPS)

## Deploy

```bash
# Na VPS
mkdir -p ~/readyzap-worker && cd ~/readyzap-worker

# Copie os arquivos: index.js, package.json, .env.example
cp .env.example .env
# Edite .env com suas credenciais

npm install

# Produção com PM2
pm2 start index.js --name readyzap-worker
pm2 save
pm2 startup
```

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | ❌ | Status do worker + contagens da fila |
| POST | `/campaign/start` | ✅ | Cria jobs e inicia envio |
| POST | `/campaign/pause` | ✅ | Pausa (jobs ficam na fila) |
| POST | `/campaign/resume` | ✅ | Retoma campanha pausada |
| POST | `/campaign/stop` | ✅ | Cancela campanha + jobs pendentes |
| GET | `/campaign/status/:id` | ✅ | Status detalhado com contagem de jobs |

### POST /campaign/start
```json
{
  "campaign_id": "uuid",
  "user_id": "uuid",
  "tags": ["tag1"],        // opcional: filtrar contatos
  "contact_ids": ["uuid"]  // opcional: contatos específicos
}
```

## Fluxo do Worker

1. **Poll** (a cada 2s): busca jobs com `status IN (queued, retry_scheduled)` e `scheduled_for <= now()`
2. **Lock atômico**: `UPDATE ... SET status='processing' WHERE status IN (...)`
3. **Filtra**: só processa jobs de campanhas com `status = 'sending'`
4. **Envia**: despacha para o provider correto (Baileys/Evolution/Z-API)
5. **Marca**: `sent` ou `failed` com retry (backoff exponencial: 30s, 120s, 480s)
6. **Finaliza**: quando todos os jobs terminam, marca campanha como `completed`

## Limites (enforcement no banco)

- Trigger `trg_enforce_message_limit`: bloqueia INSERT em campaign_jobs se exceder plano
- Trigger `trg_enforce_instance_limit`: bloqueia INSERT em instances se exceder plano
- Trigger `trg_increment_message_usage`: incrementa `messages_sent_this_month` ao marcar job como `sent`
