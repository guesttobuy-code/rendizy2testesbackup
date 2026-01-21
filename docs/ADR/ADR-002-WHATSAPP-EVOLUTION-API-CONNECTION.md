# ADR-002: WhatsApp Evolution API - Conexão Completa Estabelecida

## 🔒 CADEADO DE PROTEÇÃO - NÃO RETROCEDER

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  ATENÇÃO: ESTE CÓDIGO ESTÁ FUNCIONANDO EM PRODUÇÃO                      ║
║                                                                              ║
║  Data de Estabilização: 2026-01-21 03:54 UTC                                ║
║  Versão: v1.0.103.1201                                                       ║
║  Status: ✅ WHATSAPP CONECTADO COM SUCESSO                                   ║
║  Telefone: +55 21 99441-4512                                                 ║
║                                                                              ║
║  🚨 NÃO MODIFICAR SEM:                                                       ║
║     1. Ler esta ADR completamente                                           ║
║     2. Criar testes de regressão                                            ║
║     3. Manter compatibilidade com contratos existentes                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 Metadados

| Campo | Valor |
|-------|-------|
| **ID** | ADR-002 |
| **Título** | WhatsApp Evolution API - Conexão Completa |
| **Status** | ✅ ACEITO, IMPLEMENTADO E CONECTADO |
| **Data** | 2026-01-21 |
| **Autor** | Sistema Rendizy |
| **Versão** | v1.0.103.1201 |
| **Tags** | `#whatsapp` `#evolution-api` `#backend` `#proxy` `#multi-tenant` `#qrcode` |

---

## 🎯 Contexto

O sistema Rendizy precisa integrar com WhatsApp via Evolution API para:
- Enviar mensagens automáticas de confirmação de reservas
- Receber mensagens de hóspedes
- Gerenciar comunicação multi-canal

### Problema Original
1. **Mixed Content Error**: Frontend (HTTPS) tentava chamar Evolution API (HTTP) diretamente
2. **Exposição de Credenciais**: API Keys expostas no browser
3. **CORS Blocked**: Requisições cross-origin bloqueadas
4. **Multi-Tenant**: Cada organização precisa suas próprias credenciais

---

## ✅ Decisão

### Arquitetura Escolhida: Backend Proxy

```
┌─────────────────┐     HTTPS      ┌─────────────────────────┐     HTTP      ┌─────────────────┐
│                 │ ──────────────►│                         │ ─────────────►│                 │
│    Frontend     │                │   Supabase Edge Func    │               │  Evolution API  │
│    (Vercel)     │ ◄──────────────│   (rendizy-server)      │ ◄─────────────│  (VPS 76.13..)  │
│                 │     JSON       │                         │     JSON      │                 │
└─────────────────┘                └─────────────────────────┘               └─────────────────┘
       │                                      │
       │                                      │
       ▼                                      ▼
   localStorage                         Supabase DB
   (rendizy-token)               (organization_channel_config)
```

### Por que esta decisão:
1. ✅ **Segurança**: Credenciais ficam no backend, nunca expostas ao browser
2. ✅ **Mixed Content**: Backend (HTTPS) pode chamar HTTP sem problemas
3. ✅ **CORS**: Resolvido - mesma origem para o frontend
4. ✅ **Multi-Tenant**: Credenciais por organização no banco
5. ✅ **Logs Centralizados**: Todos os requests passam pelo backend

---

## 📁 Arquivos Protegidos

### 🔒 Backend - NÃO MODIFICAR SEM TESTES

#### `supabase/functions/rendizy-server/routes-whatsapp-evolution.ts`

```typescript
// @PROTECTED v1.0.103.1200
// @CONTRACT POST /whatsapp/test-connection
// @TESTED 2026-01-21

app.post('/rendizy-server/make-server-67caf26a/whatsapp/test-connection', async (c) => {
  // ✅ Recebe: { api_url, api_key, instance_name }
  // ✅ Retorna: { success, instanceExists, instancesCount, message }
  // ✅ Evita Mixed Content fazendo proxy HTTP → HTTPS
});
```

**Localização:** Linha ~200-280 (após adição)

**Contrato de Entrada:**
```json
{
  "api_url": "http://76.13.82.60:8080",
  "api_key": "Rendizy2026EvolutionAPI",
  "instance_name": "rendizy-admin-master"
}
```

**Contrato de Saída (Sucesso):**
```json
{
  "success": true,
  "instanceExists": false,
  "instancesCount": 1,
  "message": "✅ Conexão OK! Instância \"rendizy-admin-master\" será criada ao conectar"
}
```

**Contrato de Saída (Erro):**
```json
{
  "success": false,
  "error": "API Key inválida! Crie uma nova no Evolution Manager",
  "httpStatus": 401
}
```

---

### 🔒 Frontend - NÃO MODIFICAR SEM TESTES

#### `components/WhatsAppIntegration.tsx`

```typescript
// @PROTECTED v1.0.103.1200
// @FUNCTION handleTestConnection
// @USES-PROXY /whatsapp/test-connection

const handleTestConnection = async () => {
  // ✅ Usa proxy backend (evita Mixed Content)
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/test-connection`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        ...(authToken ? { 'X-Auth-Token': authToken } : {}),
      },
      body: JSON.stringify({ api_url, api_key, instance_name }),
    }
  );
};
```

**Localização:** Linha ~307-408

---

#### `components/WhatsAppWebhookManager.tsx`

```typescript
// @PROTECTED v1.0.103.1200
// @FIX X-Auth-Token adicionado em todos os fetches
// @FUNCTIONS loadWebhookStatus, loadWebhookEvents, setupWebhook, removeWebhook

const getAuthToken = () => typeof localStorage !== 'undefined' 
  ? localStorage.getItem('rendizy-token') 
  : null;

// Todos os fetches incluem:
headers: {
  'Authorization': `Bearer ${publicAnonKey}`,
  ...(authToken ? { 'X-Auth-Token': authToken } : {}),
}
```

**Localização:** Linhas ~139, ~172, ~201, ~245

---

#### `utils/chatApi.ts`

```typescript
// @PROTECTED v1.0.103.1200
// @FIX X-Auth-Token com 128 caracteres completos
// @DEBUG tokenLength logging

const fetchAPI = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('rendizy-token');
  console.log('🔍 [chatApi] fetchAPI:', { endpoint, tokenLength: token?.length });
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...(token ? { 'X-Auth-Token': token } : {}),  // ✅ 128 chars
  };
};
```

---

## 🧪 Testes de Validação

### Teste 1: Proxy Backend (PowerShell)

```powershell
# ✅ TESTADO E FUNCIONANDO em 2026-01-21
$body = @{
  api_url = 'http://76.13.82.60:8080'
  api_key = 'Rendizy2026EvolutionAPI'
  instance_name = 'rendizy-admin-master'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/test-connection' `
  -Method POST `
  -Headers @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    'Content-Type' = 'application/json'
  } `
  -Body $body

# RESULTADO ESPERADO:
# success: True
# instanceExists: False
# instancesCount: 1
```

### Teste 2: Frontend Browser

```javascript
// Console do navegador em https://rendizy2testesbackup.vercel.app
// Após clicar "Testar Conexão"

// ✅ LOGS ESPERADOS:
// 🧪 Testando conexão via PROXY backend...
//    URL: http://76.13.82.60:8080
//    Instance: rendizy-admin-master
//    API Key: Rendizy2026...
//    Status proxy: 200
//    Resposta proxy: {success: true, instanceExists: false, ...}
```

### Teste 3: Salvamento no Banco

```javascript
// Console após "Salvar Configurações"

// ✅ LOGS ESPERADOS:
// 📥 [WhatsApp] Resposta da API: {success: true, hasData: true, whatsapp: 'existe'}
// ✅ [WhatsApp] Configurações carregadas do banco
// ✅ [WhatsApp] Credenciais carregadas com sucesso!
// 🔍 [chatApi] fetchAPI: {endpoint: '/chat/channels/config', tokenLength: 128}
```

---

## 🔧 Configurações de Produção

### Evolution API (VPS)

| Parâmetro | Valor |
|-----------|-------|
| **URL** | `http://76.13.82.60:8080` |
| **Versão** | v2.0.10 ⚠️ (downgrade de v2.2.3 por estabilidade) |
| **Channel** | Baileys |
| **Instance** | `rendizy-admin-master` ✅ CONECTADO |
| **Telefone** | +55 21 99441-4512 |
| **Global API Key** | `Rendizy2026EvolutionAPI` |
| **Docker Image** | `atendai/evolution-api:v2.0.10` |
| **Redis** | ❌ DESABILITADO (causava loops) |
| **Cache** | Local (CACHE_LOCAL_ENABLED=true) |

### Supabase

| Parâmetro | Valor |
|-----------|-------|
| **Project ID** | `odcgnzfremrqnvtitpcc` |
| **Edge Function** | `rendizy-server` |
| **Tabela Config** | `organization_channel_config` |

### Vercel

| Parâmetro | Valor |
|-----------|-------|
| **URL Produção** | `https://rendizy2testesbackup.vercel.app` |
| **Projeto** | `rendizy2testesbackup` |

---

## ⚠️ Problemas Conhecidos e Resolvidos

### ❌ Problema 1: Mixed Content (RESOLVIDO)

**Causa:** Frontend HTTPS chamava Evolution API HTTP diretamente
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, 
but requested an insecure resource 'http://76.13.82.60:8080/...'
```

**Solução:** Proxy backend `/whatsapp/test-connection`

---

### ❌ Problema 2: 500 Internal Server Error (RESOLVIDO)

**Causa:** Header `X-Auth-Token` faltando em algumas rotas
```
GET /whatsapp/webhook/status 500 (Internal Server Error)
```

**Solução:** Adicionado `X-Auth-Token` em todos os fetches

---

### ❌ Problema 3: Token Truncado (RESOLVIDO)

**Causa:** Token de 128 chars sendo truncado para 32 chars
```
🔍 [chatApi] fetchAPI: {tokenLength: 32}  // ❌ ERRADO
```

**Solução:** Usar token completo do localStorage
```
🔍 [chatApi] fetchAPI: {tokenLength: 128}  // ✅ CORRETO
```

---

### ❌ Problema 4: Redis Disconnected Loop (RESOLVIDO - 2026-01-21)

**Causa:** Evolution API v2.2.3 configurada para usar Redis mas sem container Redis
```
ERROR [Redis] redis disconnected (repeating every 500ms)
```

**Solução:** Desabilitar Redis no docker-compose:
```yaml
environment:
  - CACHE_REDIS_ENABLED=false
  - CACHE_REDIS_URI=
  - CACHE_LOCAL_ENABLED=true
```

---

### ❌ Problema 5: Baileys Infinite Reconnection Loop (RESOLVIDO - 2026-01-21)

**Causa:** Instância corrompida no PostgreSQL + versão instável do Evolution API
```
INFO [ChannelStartupService] Browser: Evolution API,Chrome,6.8.0-90-generic
INFO [ChannelStartupService] Baileys version: 2,3000,1015901307
INFO [ChannelStartupService] Group Ignore: false
(repetindo indefinidamente a cada ~250ms)
```

**Solução em 3 passos:**
1. Downgrade para `atendai/evolution-api:v2.0.10`
2. Deletar todos os volumes Docker:
   ```bash
   docker stop evolution_api evolution_postgres
   docker rm evolution_api evolution_postgres
   docker volume rm $(docker volume ls -q)
   ```
3. Reimplantar pelo Hostinger Docker Manager

---

### ❌ Problema 6: QR Code count: 0 (RESOLVIDO - 2026-01-21)

**Causa:** Instâncias órfãs no banco impediam geração de QR Code
```json
{"count": 0}  // Sem QR Code
```

**Solução:** Limpeza completa de volumes + banco de dados limpo

---

### ❌ Problema 7: Backend não aceitava credenciais do body (RESOLVIDO - 2026-01-21)

**Causa:** Rota `/channels/whatsapp/connect` só usava credenciais do banco
```
success: false, error: 'WhatsApp não configurado. Salve as credenciais primeiro.'
```

**Solução v1.0.103.1201:** Modificado `routes-chat.ts` para aceitar credenciais do body:
```typescript
// ✅ Se body tem credenciais completas, usar elas (e salvar no banco)
if (body.api_url && body.instance_name && body.api_key) {
  config = {
    api_url: normalizeBaseUrl(body.api_url.trim()),
    instance_name: body.instance_name.trim(),
    api_key: body.api_key.trim(),
    instance_token: body.instance_token?.trim() || body.api_key.trim(),
    enabled: true,
  };
  // Salvar credenciais no banco para futuras consultas
  await repo.upsert({ ... });
}
```

---

## 📚 Referências

- **Documentação Evolution API:** `📚_DOCUMENTACAO_COMPLETA_SUCESSO_WHATSAPP.md`
- **Guia Integração:** `docs/INTEGRACAO_EVOLUTION_API_GUIA_COMPLETO.md`
- **ADR Anterior:** `ADR-001-*` (se existir)

---

## 🚀 Próximos Passos (Fora do Escopo desta ADR)

1. [x] ~~Gerar QR Code para conexão~~ ✅ FEITO
2. [x] ~~Escanear e conectar WhatsApp~~ ✅ FEITO (+55 21 99441-4512)
3. [ ] Sincronizar contatos
4. [ ] Enviar/receber mensagens
5. [ ] Configurar webhooks de produção

---

## 📝 Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-21 03:54 | v1.0.103.1201 | ✅ **WHATSAPP CONECTADO!** +55 21 99441-4512 |
| 2026-01-21 03:39 | v1.0.103.1201 | Downgrade Evolution API v2.0.10, limpeza volumes |
| 2026-01-21 02:30 | v1.0.103.1200 | Desabilitado Redis, resolvido loop errors |
| 2026-01-21 | v1.0.103.1200 | Conexão básica estabelecida |
| 2026-01-21 | v1.0.103.1200 | Proxy test-connection criado |
| 2026-01-21 | v1.0.103.1200 | X-Auth-Token corrigido |
| 2026-01-21 | v1.0.103.1200 | Mixed Content resolvido |

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ✅ CHECKPOINT ESTÁVEL - WHATSAPP CONECTADO E FUNCIONANDO                    ║
║                                                                              ║
║  Instância: rendizy-admin-master                                            ║
║  Telefone: +55 21 99441-4512                                                ║
║  Status: OPEN (conectado)                                                   ║
║                                                                              ║
║  Se você chegou aqui após um bug, VOLTE para este commit:                   ║
║  - git checkout v1.0.103.1201                                               ║
║  - Ou restaure os arquivos listados nesta ADR                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
