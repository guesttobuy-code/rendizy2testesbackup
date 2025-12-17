# ✅ Configuração Stays.net - ENCONTRADA

**Data:** 23/11/2025  
**Status:** ✅ **CONFIGURAÇÃO COMPLETA ENCONTRADA**

---

## 🔐 CREDENCIAIS STAYS.NET

### **Configuração Real (Encontrada nos Arquivos):**

```json
{
  "apiKey": "a5146970",
  "apiSecret": "bfcf4daf",
  "baseUrl": "https://bvm.stays.net/external/v1",
  "accountName": "Sua Casa Rende Mais",
  "notificationWebhookUrl": "",
  "scope": "global",
  "enabled": true
}
```

### **Detalhes:**

- **Base URL:** `https://bvm.stays.net/external/v1`
- **API Key:** `a5146970`
- **API Secret:** `bfcf4daf`
- **Account Name:** `Sua Casa Rende Mais`
- **Scope:** `global`
- **Painel Web:** `https://bvm.stays.net`

---

## 📋 ONDE ESTÁ SALVA

### **1. Banco de Dados SQL (Prioridade):**
- **Tabela:** `staysnet_config`
- **Campo `organization_id`:** UUID da organização
- **Migration:** `0004_staysnet_tables.sql`

### **2. KV Store (Fallback/Compatibilidade):**
- **Chave:** `settings:staysnet`
- **Localização:** Supabase Edge Functions KV Store

### **3. Código (Valores Padrão):**
- **Arquivo:** `supabase/functions/rendizy-server/routes-staysnet.ts`
- **Valores padrão:**
  ```typescript
  baseUrl: 'https://bvm.stays.net/external/v1'
  ```

---

## 🔄 COMO CARREGAR A CONFIGURAÇÃO

### **Via Backend:**
```typescript
// Carrega do banco de dados (prioridade)
const dbResult = await staysnetDB.loadStaysNetConfigDB(organizationId);

// Fallback para KV Store
if (!dbResult.success) {
  const config = await kv.get<StaysNetConfig>('settings:staysnet');
}
```

### **Via API:**
```bash
GET /rendizy-server/make-server-67caf26a/settings/staysnet
Headers:
  Authorization: Bearer ${PUBLIC_ANON_KEY}
  X-Auth-Token: ${SESSION_TOKEN}
```

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### **1. Configuração:**
- ✅ Interface completa de configuração
- ✅ Campos: Base URL, API Key, API Secret, Account Name, Webhook URL, Scope
- ✅ Salvamento no banco SQL + KV Store (compatibilidade)
- ✅ Migração automática do KV Store para SQL

### **2. Autenticação:**
- ✅ HTTP Basic Auth (quando `apiSecret` fornecido)
- ✅ Bearer Token (quando apenas `apiKey`)
- ✅ Headers configurados automaticamente

### **3. Endpoints Mapeados:**
- ✅ `/content/properties` - Lista propriedades
- ✅ `/content/listings` - Lista anúncios
- ✅ `/booking/reservations` - Lista reservas
- ✅ `/booking/clients` - Lista hóspedes
- ✅ `/booking/searchfilter` - Busca com filtros

### **4. Sincronização:**
- ✅ Sincronização completa (hóspedes, propriedades, reservas)
- ✅ Criação automática de blocks no calendário
- ✅ Validação robusta (email/ID/CPF para hóspedes)
- ✅ Mapeamento de IDs (clientId → guestId, listingId → propertyId)

---

## 🧪 COMO TESTAR

### **1. Verificar Configuração:**
```bash
# Via API
GET /rendizy-server/make-server-67caf26a/settings/staysnet

# Resposta esperada:
{
  "success": true,
  "data": {
    "apiKey": "a5146970",
    "apiSecret": "bfcf4daf",
    "baseUrl": "https://bvm.stays.net/external/v1",
    "accountName": "Sua Casa Rende Mais",
    "scope": "global",
    "enabled": true
  }
}
```

### **2. Testar Conexão:**
```bash
POST /rendizy-server/make-server-67caf26a/staysnet/test
Headers:
  Authorization: Bearer ${PUBLIC_ANON_KEY}
  X-Auth-Token: ${SESSION_TOKEN}
```

### **3. Executar Sincronização Completa:**
```bash
POST /rendizy-server/make-server-67caf26a/staysnet/import/full
Headers:
  Authorization: Bearer ${PUBLIC_ANON_KEY}
  X-Auth-Token: ${SESSION_TOKEN}
Body:
{
  "selectedPropertyIds": [],  // Opcional
  "startDate": "2025-01-01",  // Opcional
  "endDate": "2026-12-31"     // Opcional
}
```

---

## 📚 ARQUIVOS RELACIONADOS

### **Documentação:**
- `RELATORIO_INTEGRACAO_STAYSNET.md` - Relatório completo
- `VERIFICACAO_CAMPOS_STAYSNET.md` - Campos implementados
- `INSTRUCOES_MIGRACAO_STAYSNET.md` - Instruções de migração
- `SINCRONIZACAO_COMPLETA_STAYSNET_IMPLEMENTADA.md` - Sincronização

### **Código:**
- `supabase/functions/rendizy-server/routes-staysnet.ts` - Rotas e cliente API
- `supabase/functions/rendizy-server/staysnet-full-sync.ts` - Sincronização completa
- `supabase/functions/rendizy-server/staysnet-db.ts` - Funções de banco
- `RendizyPrincipal/components/StaysNetIntegration.tsx` - Interface frontend

### **Migrations:**
- `supabase/migrations/0004_staysnet_tables.sql` - Tabelas dedicadas

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Configuração encontrada** - Credenciais identificadas
2. ✅ **Sincronização implementada** - Função completa criada
3. ✅ **Deploy realizado** - Backend atualizado
4. ⏳ **Testar com dados reais** - Executar sincronização completa

---

## ✅ STATUS FINAL

**Configuração:** ✅ **ENCONTRADA E DOCUMENTADA**

- ✅ Base URL: `https://bvm.stays.net/external/v1`
- ✅ API Key: `a5146970`
- ✅ API Secret: `bfcf4daf`
- ✅ Account Name: `Sua Casa Rende Mais`
- ✅ Scope: `global`

**Sistema pronto para sincronização completa!** 🚀

