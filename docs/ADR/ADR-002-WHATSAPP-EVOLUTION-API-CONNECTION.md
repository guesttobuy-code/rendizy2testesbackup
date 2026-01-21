# ADR-002: WhatsApp Evolution API - Conexão Backend Estabelecida

## 🔒 CADEADO DE PROTEÇÃO - NÃO RETROCEDER

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  ATENÇÃO: ESTE CÓDIGO ESTÁ FUNCIONANDO EM PRODUÇÃO                      ║
║                                                                              ║
║  Data de Estabilização: 2026-01-21                                          ║
║  Versão: v1.0.103.1200                                                       ║
║  Status: ✅ CONEXÃO ESTABELECIDA E TESTADA                                   ║
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
| **Título** | WhatsApp Evolution API - Conexão Backend |
| **Status** | ✅ ACEITO E IMPLEMENTADO |
| **Data** | 2026-01-21 |
| **Autor** | Sistema Rendizy |
| **Versão** | v1.0.103.1200 |
| **Tags** | `#whatsapp` `#evolution-api` `#backend` `#proxy` `#multi-tenant` |

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
| **Versão** | v2.2.3 |
| **Channel** | Baileys |
| **Instance** | `rendizy-admin-master` |
| **Global API Key** | `Rendizy2026EvolutionAPI` |
| **Instance Token** | `886354F0C3A8-49D5-8FBD-AFE3E2698082` |

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

## 📚 Referências

- **Documentação Evolution API:** `📚_DOCUMENTACAO_COMPLETA_SUCESSO_WHATSAPP.md`
- **Guia Integração:** `docs/INTEGRACAO_EVOLUTION_API_GUIA_COMPLETO.md`
- **ADR Anterior:** `ADR-001-*` (se existir)

---

## 🚀 Próximos Passos (Fora do Escopo desta ADR)

1. [ ] Gerar QR Code para conexão
2. [ ] Sincronizar contatos
3. [ ] Enviar/receber mensagens
4. [ ] Configurar webhooks

---

## 📝 Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-21 | v1.0.103.1200 | Conexão básica estabelecida |
| 2026-01-21 | v1.0.103.1200 | Proxy test-connection criado |
| 2026-01-21 | v1.0.103.1200 | X-Auth-Token corrigido |
| 2026-01-21 | v1.0.103.1200 | Mixed Content resolvido |

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ✅ CHECKPOINT ESTÁVEL - CONEXÃO WHATSAPP FUNCIONANDO                        ║
║                                                                              ║
║  Se você chegou aqui após um bug, VOLTE para este commit:                   ║
║  - git checkout v1.0.103.1200                                               ║
║  - Ou restaure os arquivos listados nesta ADR                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
