# 📋 Documentação Completa - WAHA (WhatsApp HTTP API)

> **Data:** 22/01/2026  
> **Versão:** Baseada na documentação oficial https://waha.devlike.pro/  
> **Propósito:** Integração WAHA no Rendizy como alternativa à Evolution API

---

## 📖 O que é WAHA?

WAHA (WhatsApp HTTP API) é uma solução **open-source** e **auto-hospedada** para integrar WhatsApp em sistemas via API REST. Roda em containers Docker e permite enviar/receber mensagens programaticamente.

### 🔑 Principais Diferenciais vs Evolution API

| Aspecto | WAHA | Evolution API |
|---------|------|---------------|
| **Instalação** | Docker simples (`docker run`) | Docker mais complexo |
| **Documentação** | Excelente, com Swagger embutido | Boa, mas menos organizada |
| **Dashboard** | Incluído (UI para gerenciar sessões) | Não incluído nativamente |
| **Engines** | 3 opções (WEBJS, NOWEB, GOWS) | 1 engine principal |
| **Custo** | Core gratuito, Plus via doação (~$49/mês) | Gratuito mas instável |
| **API Key** | Header `X-Api-Key` | Header `apikey` |
| **QR Code** | Endpoint dedicado `/auth/qr` | Via webhook |
| **Webhooks** | Por sessão ou globais | Globais apenas |
| **Websockets** | Suporte nativo | Não suportado |
| **Estabilidade** | Alta (projeto maduro desde 2020) | Média (bugs frequentes) |

---

## 🚀 Quick Start - Instalação

### 1. Download da Imagem
```bash
docker pull devlikeapro/waha
```

### 2. Inicialização (gera credenciais)
```powershell
docker run --rm -v "${pwd}:/app/env" devlikeapro/waha init-waha /app/env
```

**Output:**
```
Credentials generated.

Dashboard and Swagger:
  - Username: admin
  - Password: 11111111111111111111111111111111

API key: 
  - 00000000000000000000000000000000
```

### 3. Executar WAHA
```bash
docker run -it --env-file "${pwd}/.env" -v "${pwd}/sessions:/app/.sessions" \
  --rm -p 3000:3000 --name waha devlikeapro/waha
```

### 4. Acessar Dashboard
- URL: `http://localhost:3000/dashboard`
- Swagger: `http://localhost:3000/`
- Use username/password do passo 2

---

## 🔧 Configuração de Segurança

### Variáveis de Ambiente
```env
# API Key (obrigatória em produção)
WAHA_API_KEY=sha512:{HASH_DA_SUA_CHAVE}
# Ou em plain text (menos seguro):
WAHA_API_KEY=sua-chave-secreta

# Dashboard
WAHA_DASHBOARD_ENABLED=true
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=senha-segura

# Swagger (UI de documentação)
WHATSAPP_SWAGGER_USERNAME=admin
WHATSAPP_SWAGGER_PASSWORD=senha-segura
```

### Gerar API Key com Hash
```bash
# Gerar chave
uuidgen | tr -d '-'
# Exemplo: 00000000000000000000000000000000

# Gerar hash SHA512
echo -n "00000000000000000000000000000000" | shasum -a 512
# Resultado: 98b6d128682e280b74b324ca82a6bae6e8a3f7174e0605bfd52eb9948fad8984854ec08f7652f32055c4a9f12b69add4850481d9503a7f2225501671d6124648

# Usar: WAHA_API_KEY=sha512:98b6d128682e...
```

### Header de Autenticação
```http
X-Api-Key: sua-chave-secreta
```

---

## 🖥️ Gerenciamento de Sessões

### Estados de Sessão
| Status | Descrição |
|--------|-----------|
| `STOPPED` | Sessão parada |
| `STARTING` | Sessão iniciando |
| `SCAN_QR_CODE` | Aguardando scan do QR Code |
| `WORKING` | Sessão funcionando normalmente |
| `FAILED` | Erro - necessita restart |

### Criar Sessão
```http
POST /api/sessions
Content-Type: application/json
X-Api-Key: sua-chave

{
  "name": "default",
  "config": {
    "webhooks": [
      {
        "url": "https://seu-servidor.com/webhook",
        "events": ["message", "session.status"]
      }
    ]
  }
}
```

### Obter QR Code
```http
# Imagem binária
GET /api/{session}/auth/qr
Accept: image/png

# Base64
GET /api/{session}/auth/qr
Accept: application/json

# Raw (para gerar QR no frontend)
GET /api/{session}/auth/qr?format=raw
```

**Resposta Base64:**
```json
{
  "mimetype": "image/png",
  "data": "base64-encoded-data..."
}
```

### Pairing Code (alternativa ao QR)
```http
POST /api/{session}/auth/request-code
Content-Type: application/json

{
  "phoneNumber": "5521999999999"
}
```

**Resposta:**
```json
{
  "code": "ABCD-EFGH"
}
```

### Listar Sessões
```http
GET /api/sessions
# Com sessões paradas:
GET /api/sessions?all=true
```

### Status de uma Sessão
```http
GET /api/sessions/{session}
```

### Start/Stop/Restart
```http
POST /api/sessions/{session}/start
POST /api/sessions/{session}/stop
POST /api/sessions/{session}/restart
```

### Logout (desconecta do WhatsApp)
```http
POST /api/sessions/{session}/logout
```

### Deletar Sessão
```http
DELETE /api/sessions/{session}
```

---

## 📤 Enviar Mensagens

### Enviar Texto
```http
POST /api/sendText
Content-Type: application/json
X-Api-Key: sua-chave

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "text": "Olá! 👋"
}
```

### Enviar Imagem
```http
POST /api/sendImage
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "file": {
    "mimetype": "image/jpeg",
    "url": "https://exemplo.com/imagem.jpg",
    "filename": "foto.jpg"
  },
  "caption": "Veja esta imagem!"
}
```

### Enviar Arquivo/Documento
```http
POST /api/sendFile
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "file": {
    "mimetype": "application/pdf",
    "url": "https://exemplo.com/contrato.pdf",
    "filename": "contrato.pdf"
  },
  "caption": "Seu contrato em anexo"
}
```

### Enviar Áudio/Voz
```http
POST /api/sendVoice
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "file": {
    "mimetype": "audio/ogg; codecs=opus",
    "url": "https://exemplo.com/audio.opus"
  },
  "convert": true  // Converte automaticamente
}
```

### Enviar Vídeo
```http
POST /api/sendVideo
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "file": {
    "mimetype": "video/mp4",
    "url": "https://exemplo.com/video.mp4",
    "filename": "video.mp4"
  },
  "caption": "Confira o vídeo!",
  "convert": true
}
```

### Enviar Localização
```http
POST /api/sendLocation
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "latitude": -22.9068,
  "longitude": -43.1729,
  "title": "Nosso escritório"
}
```

### Enviar Contato (vCard)
```http
POST /api/sendContactVcard
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "contacts": [
    {
      "fullName": "João Silva",
      "phoneNumber": "+55 21 99999-9999",
      "organization": "Rendizy"
    }
  ]
}
```

### Responder Mensagem
```http
POST /api/sendText
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us",
  "text": "Respondendo sua mensagem!",
  "reply_to": "false_5521999999999@c.us_AAAAAAAAAAAAAAAAAAAA"
}
```

### Reagir a Mensagem
```http
PUT /api/reaction
Content-Type: application/json

{
  "session": "default",
  "messageId": "false_5521999999999@c.us_AAAAAAAAAAAAAAAAAAAA",
  "reaction": "👍"
}

# Remover reação (reaction vazio):
{
  "reaction": ""
}
```

### Marcar como Lido
```http
POST /api/sendSeen
Content-Type: application/json

{
  "session": "default",
  "chatId": "5521999999999@c.us"
}
```

---

## 📥 Receber Mensagens

### Configurar Webhook na Sessão
```json
{
  "name": "default",
  "config": {
    "webhooks": [
      {
        "url": "https://seu-servidor.com/webhook",
        "events": [
          "message",
          "message.any",
          "message.ack",
          "session.status"
        ],
        "hmac": {
          "key": "sua-chave-hmac"
        },
        "retries": {
          "policy": "exponential",
          "delaySeconds": 2,
          "attempts": 5
        }
      }
    ]
  }
}
```

### Webhook Global (via env)
```env
WHATSAPP_HOOK_URL=https://seu-servidor.com/webhook
WHATSAPP_HOOK_EVENTS=message,session.status
WHATSAPP_HOOK_HMAC_KEY=sua-chave-hmac
```

### Payload de Mensagem Recebida
```json
{
  "id": "evt_1111111111111111111111111111",
  "timestamp": 1741249702485,
  "event": "message",
  "session": "default",
  "me": {
    "id": "5521999999999@c.us",
    "pushName": "Rendizy"
  },
  "payload": {
    "id": "true_5521888888888@c.us_AAAA",
    "timestamp": 1667561485,
    "from": "5521888888888@c.us",
    "fromMe": false,
    "to": "5521999999999@c.us",
    "body": "Olá!",
    "hasMedia": false
  }
}
```

### Payload com Mídia
```json
{
  "event": "message",
  "payload": {
    "id": "true_5521888888888@c.us_BBBB",
    "hasMedia": true,
    "media": {
      "url": "http://waha:3000/api/files/true_5521888888888@c.us_BBBB.jpg",
      "mimetype": "image/jpeg",
      "filename": null
    }
  }
}
```

### Download de Mídia
```bash
curl -H "X-Api-Key: sua-chave" \
  -O http://waha:3000/api/files/true_5521888888888@c.us_BBBB.jpg
```

---

## 🔄 Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `session.status` | Mudança de status da sessão |
| `message` | Mensagem recebida (não sua) |
| `message.any` | Qualquer mensagem (incluindo suas) |
| `message.ack` | Status de entrega/leitura |
| `message.reaction` | Reação a mensagem |
| `message.revoked` | Mensagem apagada |
| `message.edited` | Mensagem editada |
| `presence.update` | Digitando, online, etc |
| `group.v2.join` | Entrou em grupo |
| `group.v2.leave` | Saiu de grupo |
| `call.received` | Chamada recebida |
| `poll.vote` | Voto em enquete |

---

## 🔌 Websockets (Real-time)

### Conectar via WebSocket
```javascript
const socket = new WebSocket(
  'ws://localhost:3000/ws?x-api-key=sua-chave&session=*&events=message&events=session.status'
);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Evento recebido:', data);
};

socket.onopen = () => console.log('Conectado!');
socket.onclose = () => console.log('Desconectado');
```

### Parâmetros
- `session=*` → Todas as sessões
- `session=default` → Sessão específica
- `events=*` → Todos os eventos
- `events=message&events=session.status` → Eventos específicos

---

## 🏭 Engines (Motores)

WAHA suporta 3 engines diferentes:

### WEBJS (Padrão)
- Usa Chromium/Puppeteer
- Mais estável
- Maior consumo de recursos
- `WHATSAPP_DEFAULT_ENGINE=WEBJS`

### NOWEB
- Sem browser (WebSocket direto)
- Menor consumo de CPU/RAM
- Suporta múltiplas sessões
- `WHATSAPP_DEFAULT_ENGINE=NOWEB`

### GOWS
- Nova geração em Golang
- Melhor performance
- Em desenvolvimento
- `WHATSAPP_DEFAULT_ENGINE=GOWS`

### Recursos por Engine

| Feature | WEBJS | NOWEB | GOWS |
|---------|-------|-------|------|
| Enviar texto | ✅ | ✅ | ✅ |
| Enviar mídia | ✅ | ✅ | ✅ |
| Receber mídia | ✅ | ✅ | ✅ |
| Grupos | ✅ | ✅ | ✅ |
| Status/Stories | ✅ | ✅ | ⚠️ |
| Chamadas | ⚠️ | ✅ | ✅ |

---

## 📊 Dashboard Integrado

WAHA inclui dashboard web para:

- 📱 Gerenciar sessões visualmente
- 📷 Escanear QR Code na interface
- 📊 Monitor de eventos em tempo real
- 💬 Chat UI integrado (básico)
- 🔧 Configurar webhooks

**URL:** `http://localhost:3000/dashboard`

---

## 🐳 Docker Images

| Imagem | CPU | Browser | Uso |
|--------|-----|---------|-----|
| `devlikeapro/waha:latest` | x86 | Chromium | Padrão |
| `devlikeapro/waha:chrome` | x86 | Chrome | Vídeos |
| `devlikeapro/waha:noweb` | x86 | Nenhum | Multi-sessão |
| `devlikeapro/waha:arm` | ARM | Chromium | Raspberry/M1 |

---

## 💰 WAHA Core vs WAHA Plus

### WAHA Core (Gratuito)
- ✅ 1 sessão
- ✅ Mensagens de texto ilimitadas
- ✅ API completa
- ❌ Sem segurança embutida
- ❌ Sem mídia avançada

### WAHA Plus (Doação ~$49/mês)
- ✅ Sessões ilimitadas
- ✅ Envio/recebimento de mídia
- ✅ Segurança (API Key hash)
- ✅ Suporte prioritário
- ✅ Código fonte (tier PRO)

---

## 🔐 Requisitos de Sistema

| Sessões | CPU | RAM |
|---------|-----|-----|
| 1 | 0.3 | 400MB |
| 10 | 3 | 2.5GB |
| 50 | 15 | 20GB |
| 100+ | 4+ | 8GB+ (NOWEB) |

**Mínimo recomendado:** 2 CPU + 4GB RAM

---

## 🔄 Comparativo: WAHA vs Evolution API

### ✅ Vantagens WAHA
1. **Documentação superior** - Swagger, exemplos, guias
2. **Dashboard incluso** - UI visual para gerenciar
3. **Websockets nativos** - Real-time sem polling
4. **Múltiplos engines** - Flexibilidade de performance
5. **Mais estável** - Projeto maduro desde 2020
6. **QR Code dedicado** - Endpoint específico `/auth/qr`
7. **Retry automático** - Webhooks com retry configurável
8. **HMAC auth** - Segurança de webhooks

### ❌ Desvantagens WAHA
1. **Plus é pago** - Mídia requer doação
2. **Menos popular BR** - Comunidade menor no Brasil
3. **Setup inicial** - Mais passos que Evolution

### 📊 Nível de Dificuldade

| Aspecto | Evolution | WAHA |
|---------|-----------|------|
| Instalação | 🟡 Média | 🟢 Fácil |
| Configuração | 🔴 Difícil | 🟡 Média |
| Documentação | 🟡 Média | 🟢 Excelente |
| Debug | 🔴 Difícil | 🟢 Fácil (logs) |
| Estabilidade | 🔴 Baixa | 🟢 Alta |
| Comunidade BR | 🟢 Alta | 🟡 Média |

**Veredicto:** WAHA é **mais fácil** de integrar e **mais estável** em produção.

---

## 🛠️ Integração Rendizy

### Endpoints Necessários (Backend)

```typescript
// Criar sessão WAHA
POST /channel-instances/waha
Body: { description: string, color: string }

// Obter QR Code
GET /channel-instances/:id/qr-code-waha

// Status da sessão
GET /channel-instances/:id/status-waha

// Webhook receiver
POST /chat/channels/whatsapp-waha/webhook
```

### Configuração Sugerida
```env
# .env Rendizy
WAHA_API_URL=http://seu-servidor:3000
WAHA_API_KEY=sua-chave-segura
WAHA_WEBHOOK_URL=https://rendizy.com/api/waha-webhook
```

---

## 📚 Links Úteis

- **Documentação:** https://waha.devlike.pro/docs/
- **GitHub:** https://github.com/devlikeapro/waha
- **Swagger Demo:** https://waha.devlike.pro/swagger/
- **Discord:** https://discord.gg/waha
- **Doação Plus:** https://waha.devlike.pro/support-us/

---

## ✅ Conclusão

**WAHA é uma excelente alternativa à Evolution API**, especialmente para:

1. ✅ **Produção estável** - Menos bugs que Evolution
2. ✅ **Multi-tenant** - Múltiplas organizações
3. ✅ **Real-time** - Websockets nativos
4. ✅ **Self-hosted** - Controle total dos dados

**Recomendação:** Implementar WAHA como segundo provider no Rendizy, permitindo que usuários escolham entre Evolution API e WAHA conforme preferência.
