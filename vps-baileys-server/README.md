# Servidor Baileys WhatsApp - REST API

Servidor simples que usa Baileys direto, sem Evolution API.

## Deploy na VPS

```bash
# 1. Copie os arquivos
mkdir ~/baileys-server && cd ~/baileys-server
# Copie index.js e package.json para cá

# 2. Instale dependências
npm install

# 3. Rode com sua chave de API
API_KEY=sua_chave_forte_aqui PORT=3100 node index.js

# Ou com PM2 (recomendado)
npm install -g pm2
API_KEY=sua_chave_forte_aqui PORT=3100 pm2 start index.js --name baileys
pm2 save
pm2 startup
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/instance/create` | Cria instância e gera QR |
| GET | `/instance/qr/:name` | Busca QR Code (base64) |
| GET | `/instance/status/:name` | Status da conexão |
| POST | `/message/send-text` | Envia mensagem de texto |
| DELETE | `/instance/logout/:name` | Desconecta WhatsApp |
| DELETE | `/instance/delete/:name` | Remove instância |
| GET | `/health` | Health check |

## Headers

Todas as requests precisam do header:
```
apikey: sua_chave_forte_aqui
```
