# 🔄 PROMPT DE CONTINUAÇÃO - WhatsApp Evolution API + Rendizy

**Data de criação**: 21/01/2026  
**Versão**: v1.0.103.1201

---

## 📍 CONTEXTO ATUAL

Estou trabalhando no projeto **Rendizy** - um sistema de gestão de propriedades e reservas com integração WhatsApp via Evolution API.

### Workspace:
```
c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy
```

### Sistema Operacional: Windows

---

## ✅ O QUE JÁ FOI RESOLVIDO (sessão anterior)

### 1. **Conexão WhatsApp - FUNCIONANDO**
- **VPS Hostinger**: `76.13.82.60`
- **Evolution API v2.0.10** rodando em Docker
- **Instância conectada**: `rendizy-admin-master`
- **Telefone conectado**: +55 21 99441-4512
- **Status**: `OPEN` (conectado e funcionando)

### 2. **Problemas resolvidos na ordem**:

| # | Problema | Solução |
|---|----------|---------|
| 1 | Redis desconectado causando loop infinito | Desabilitei Redis no docker-compose (`CACHE_REDIS_ENABLED=false`) |
| 2 | Baileys em reconnection loop infinito | Downgrade Evolution API v2.2.3 → v2.1.1 → v2.0.10 |
| 3 | QR Code retornando count:0 | Limpeza completa de volumes Docker + PostgreSQL |
| 4 | Mixed Content (HTTPS→HTTP) | Backend como proxy para Evolution API |
| 5 | Backend não aceitava credenciais via body | Modificação em `routes-chat.ts` para salvar no DB |
| 6 | URL antiga hardcoded (`evo.boravendermuito.com.br`) | Atualização das variáveis de ambiente no Supabase |

### 3. **Variáveis de ambiente atualizadas no Supabase Edge Functions**:
```bash
# Atualizadas via: npx supabase secrets set --project-ref odcgnzfremrqnvtitpcc
EVOLUTION_API_URL=http://76.13.82.60:8080
EVOLUTION_BASE_URL=http://76.13.82.60:8080
EVOLUTION_INSTANCE_NAME=rendizy-admin-master
EVOLUTION_GLOBAL_API_KEY=Rendizy2026EvolutionAPI
EVOLUTION_INSTANCE_TOKEN=4C85BCFB2A1B-4B57-AD86-F9F53E9DC08F
```

### 4. **Banco de dados - Configuração salva**:

Tabela `organization_channel_config` para org Rendizy (`00000000-0000-0000-0000-000000000000`):
```json
{
  "whatsapp_enabled": true,
  "whatsapp_api_url": "http://76.13.82.60:8080",
  "whatsapp_instance_name": "rendizy-admin-master",
  "whatsapp_api_key": "Rendizy2026EvolutionAPI",
  "whatsapp_instance_token": "4C85BCFB2A1B-4B57-AD86-F9F53E9DC08F",
  "whatsapp_connection_status": "waiting_qr"
}
```

---

## 📁 DOCUMENTOS IMPORTANTES

### ADR (Architecture Decision Record):
```
docs/ADR/ADR-002-WHATSAPP-EVOLUTION-API-CONNECTION.md
```
- **Versão atual**: v1.0.103.1201
- Documenta toda a configuração, problemas resolvidos e decisões técnicas
- **LEIA ESTE ARQUIVO PRIMEIRO** para contexto completo

### Arquivos de código principais:

| Arquivo | Função |
|---------|--------|
| `supabase/functions/rendizy-server/routes-whatsapp-evolution.ts` | Backend completo WhatsApp - todas as rotas |
| `supabase/functions/rendizy-server/routes-chat.ts` | Rotas de chat e proxy para Evolution API |
| `supabase/functions/rendizy-server/services/whatsapp-monitor.ts` | Monitor de conexão WhatsApp |
| `components/WhatsAppIntegration.tsx` | UI de integração WhatsApp |
| `components/WhatsAppWebhookManager.tsx` | Gerenciador de webhooks |
| `components/WhatsAppCredentialsTester.tsx` | Testador de credenciais |

### Configuração local:
```
.env.local  ← Credenciais atualizadas para desenvolvimento local
```

---

## 🔴 PROBLEMA PENDENTE (a resolver/testar)

### Webhook Setup retornando erro 500

**Erro no console do navegador**:
```
POST https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/webhook/setup 500 (Internal Server Error)
```

**Erro nos logs do servidor**:
```
invalid peer certificate: UnknownIssuer for url https://evo.boravendermuito.com.br
```

**Causa raiz identificada**:
- As variáveis de ambiente do Supabase Edge Functions tinham a URL antiga `https://evo.boravendermuito.com.br`
- Esta URL tem certificado SSL inválido
- O Deno (runtime das Edge Functions) rejeita conexões com certificados inválidos

**Ações já tomadas**:
1. ✅ Atualizei variáveis via `npx supabase secrets set`
2. ✅ Fiz redeploy da Edge Function `rendizy-server`
3. ⏳ **PRECISA TESTAR** se webhook setup agora funciona

---

## 🧪 PRÓXIMOS PASSOS

### 1. Testar configuração de webhook:
1. Acessar http://localhost:3000 (ou produção)
2. Ir em **Configurações** → **WhatsApp**
3. Clicar em **"Configurar Webhook"**
4. Verificar se não há mais erro de certificado

### 2. Se ainda houver erro:
- Verificar logs do Supabase Edge Functions no dashboard
- Confirmar se a função está usando as novas variáveis de ambiente
- Verificar se há cache de deploy antigo

### 3. Webhook URL esperada (destino):
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook
```

### 4. Eventos do webhook a configurar:
- `MESSAGES_UPSERT`
- `CONNECTION_UPDATE`
- `QRCODE_UPDATED`

---

## 🔑 CREDENCIAIS DE ACESSO

### Supabase:
```yaml
Project ID: odcgnzfremrqnvtitpcc
URL: https://odcgnzfremrqnvtitpcc.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE
```

### VPS Hostinger (Evolution API):
```yaml
IP: 76.13.82.60
SSH User: root
Porta SSH: 22
API URL: http://76.13.82.60:8080
Manager UI: http://76.13.82.60:8080/manager
Global API Key: Rendizy2026EvolutionAPI
Instance Name: rendizy-admin-master
Instance Token: 4C85BCFB2A1B-4B57-AD86-F9F53E9DC08F
```

### Docker no VPS:
```yaml
Image: atendai/evolution-api:v2.0.10
Container: evolution-api
Redis: DESABILITADO (CACHE_REDIS_ENABLED=false)
Cache Local: HABILITADO (CACHE_LOCAL_ENABLED=true)
Database: PostgreSQL (porta 5432)
```

---

## 📊 ESTADO DAS ORGANIZAÇÕES NO BANCO

```sql
SELECT id, name FROM organizations;
```

| id | name |
|----|------|
| `00000000-0000-0000-0000-000000000000` | Rendizy (principal) |
| `00000000-0000-0000-0000-000000000001` | Organização Padrão |
| `7a0873d3-25f1-43d5-9d45-ca7beaa07f77` | Sua Casa Mobiliada |
| `e78c7bb9-7823-44b8-9aee-95c9b073e7b7` | Medhome teste |

**Organização com WhatsApp configurado**: `00000000-0000-0000-0000-000000000000` (Rendizy)

---

## 🛠️ COMANDOS ÚTEIS

### Iniciar servidor local:
```powershell
cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy"
npm run dev
```

### Deploy Edge Functions:
```powershell
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc --no-verify-jwt
```

### Verificar/Atualizar secrets do Supabase:
```powershell
# Listar
npx supabase secrets list --project-ref odcgnzfremrqnvtitpcc

# Atualizar
npx supabase secrets set EVOLUTION_API_URL="http://76.13.82.60:8080" --project-ref odcgnzfremrqnvtitpcc
```

### Verificar status WhatsApp na Evolution API:
```powershell
Invoke-RestMethod -Uri "http://76.13.82.60:8080/instance/connectionState/rendizy-admin-master" -Headers @{apikey="Rendizy2026EvolutionAPI"}
```

### Query para verificar config no banco:
```powershell
$svc="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE"
irm "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/organization_channel_config" -Headers @{apikey=$svc} | ConvertTo-Json -Depth 10
```

### Acessar VPS via SSH:
```powershell
ssh root@76.13.82.60
```

### Comandos Docker no VPS:
```bash
# Ver containers
docker ps -a

# Ver logs Evolution API
docker logs evolution-api --tail 100

# Reiniciar Evolution API
docker restart evolution-api
```

---

## 📝 HISTÓRICO DE COMMITS RECENTES

| Versão | Descrição |
|--------|-----------|
| `v1.0.103.1201` | WhatsApp Evolution API connection working - Backend accepts credentials from body |

---

## 🎯 OBJETIVO IMEDIATO

**Testar se o webhook setup agora funciona** após a atualização das variáveis de ambiente do Supabase.

### Cenários:

✅ **Se funcionar**: WhatsApp está 100% integrado. Pode testar envio de mensagens.

❌ **Se não funcionar**: 
1. Verificar logs do Edge Function no Supabase Dashboard
2. Confirmar se deploy aplicou as novas variáveis
3. Verificar se há fallback para variáveis de ambiente antigas no código

---

## 🔍 PONTOS DE ATENÇÃO NO CÓDIGO

### 1. Função que busca config (routes-whatsapp-evolution.ts, linha ~125):
```typescript
async function getEvolutionConfigForOrganization(organizationId: string): Promise<EvolutionConfig | null> {
  // Busca de organization_channel_config
  // Se não encontrar, faz fallback para getEvolutionConfigFromEnv()
}
```

### 2. Fallback para variáveis de ambiente (linha ~163):
```typescript
function getEvolutionConfigFromEnv(): EvolutionConfig | null {
  const apiUrl = Deno.env.get('EVOLUTION_API_URL') ?? '';
  // Se as variáveis de ambiente ainda tiverem URL antiga, vai falhar aqui
}
```

### 3. Endpoint de webhook setup (linha ~1911):
```typescript
app.post('/rendizy-server/make-server-67caf26a/whatsapp/webhook/setup', async (c) => {
  // Usa config.api_url para chamar Evolution API
  // Se api_url for https://evo.boravendermuito.com.br, vai dar erro de certificado
})
```

---

## 📋 CHECKLIST ANTES DE CONTINUAR

- [ ] Servidor local rodando (`npm run dev`)
- [ ] Verificar se WhatsApp ainda está conectado na Evolution API
- [ ] Testar webhook setup no Rendizy
- [ ] Se erro, verificar logs do Supabase Edge Functions
- [ ] Confirmar que variáveis de ambiente foram aplicadas

---

## 🆘 SE PRECISAR RESETAR TUDO

### 1. Resetar instância Evolution API:
```bash
# No VPS
docker stop evolution-api
docker rm evolution-api
docker volume rm $(docker volume ls -q | grep evolution)
# Reimplantar via Hostinger Docker Manager
```

### 2. Resetar config no banco:
```sql
UPDATE organization_channel_config 
SET whatsapp_enabled = false, 
    whatsapp_connection_status = 'disconnected',
    whatsapp_qr_code = null
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

### 3. Criar nova instância:
```powershell
$body = @{
  instanceName = "rendizy-admin-master"
  qrcode = $true
  integration = "WHATSAPP-BAILEYS"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://76.13.82.60:8080/instance/create" -Headers @{apikey="Rendizy2026EvolutionAPI";"Content-Type"="application/json"} -Body $body
```

---

**FIM DO PROMPT DE CONTINUAÇÃO**

*Arquivo gerado em: 21/01/2026*  
*Copie todo este conteúdo para o próximo chat para continuar de onde paramos.*
