# ✅ Verificação: Campos para Integração Stays.net

**Data:** 15/11/2025  
**Status:** ✅ **ATUALIZADO - Todos os campos implementados**

---

## 📋 Campos Necessários (da Imagem)

Baseado na imagem fornecida, os seguintes campos são necessários:

1. ✅ **URL do sistema** → `baseUrl`
2. ✅ **Nome da conta** → `accountName` (NOVO)
3. ✅ **Login** → `apiKey`
4. ✅ **Senha** → `apiSecret`
5. ✅ **Link de notificações** → `notificationWebhookUrl` (NOVO)
6. ✅ **Global/Individual** → `scope` (NOVO)

---

## ✅ Campos Implementados

### **Backend (`routes-staysnet.ts`):**

```typescript
interface StaysNetConfig {
  apiKey: string;                    // ✅ Login
  apiSecret?: string;                 // ✅ Senha
  baseUrl: string;                    // ✅ URL do sistema
  accountName?: string;               // ✅ NOVO - Nome da conta
  notificationWebhookUrl?: string;    // ✅ NOVO - Link de notificações
  scope?: 'global' | 'individual';     // ✅ NOVO - Global/Individual
  enabled: boolean;
  lastSync?: string;
}
```

### **Frontend (`StaysNetIntegration.tsx`):**

✅ Todos os campos foram adicionados na interface:
- ✅ Campo "Nome da Conta" (accountName)
- ✅ Campo "Link de Notificações" (notificationWebhookUrl)
- ✅ Toggle "Global/Individual" (scope)

---

## 💾 Onde os Dados São Salvos

### **Armazenamento:**
- **Tipo:** KV Store (Key-Value)
- **Chave:** `settings:staysnet`
- **Localização:** Supabase Edge Functions (KV Store)

### **Estrutura de Dados:**

```json
{
  "apiKey": "a5146970",
  "apiSecret": "bfcf4daf",
  "baseUrl": "https://bvm.stays.net/external/v1",
  "accountName": "Sua Casa Rende Mais",
  "notificationWebhookUrl": "https://seu-dominio.com/webhook/staysnet",
  "scope": "global",
  "enabled": true,
  "lastSync": "2025-11-15T16:30:00.000Z"
}
```

---

## 🔄 Fluxo de Salvamento

1. **Usuário preenche formulário:**
   - URL do sistema: `https://bvm.stays.net`
   - Nome da conta: `Sua Casa Rende Mais`
   - Login: `a5146970`
   - Senha: `bfcf4daf`
   - Link de notificações: (opcional)
   - Escopo: Global/Individual

2. **Frontend envia para backend:**
   ```typescript
   POST /settings/staysnet
   {
     apiKey: "a5146970",
     apiSecret: "bfcf4daf",
     baseUrl: "https://bvm.stays.net/external/v1",
     accountName: "Sua Casa Rende Mais",
     notificationWebhookUrl: "...",
     scope: "global"
   }
   ```

3. **Backend salva no KV Store:**
   ```typescript
   await kv.set('settings:staysnet', config);
   ```

4. **Dados ficam disponíveis para:**
   - Teste de conexão
   - Busca de reservas
   - Sincronização
   - Webhooks (quando implementado)

---

## ✅ Checklist de Implementação

### **Backend:**
- [x] Interface `StaysNetConfig` atualizada
- [x] Função `saveStaysNetConfig` atualizada
- [x] Função `getStaysNetConfig` atualizada
- [x] Valores padrão atualizados

### **Frontend:**
- [x] Interface `StaysNetConfig` atualizada
- [x] Estado inicial atualizado
- [x] Campo "Nome da Conta" adicionado
- [x] Campo "Link de Notificações" adicionado
- [x] Toggle "Global/Individual" adicionado
- [x] Função `handleSaveConfig` já salva todos os campos

---

## 🎯 Mapeamento de Campos

| Campo na Imagem | Campo no Código | Tipo | Obrigatório |
|----------------|-----------------|------|-------------|
| URL do sistema | `baseUrl` | string | ✅ Sim |
| Nome da conta | `accountName` | string | ❌ Não |
| Login | `apiKey` | string | ✅ Sim |
| Senha | `apiSecret` | string | ❌ Não |
| Link de notificações | `notificationWebhookUrl` | string | ❌ Não |
| Global/Individual | `scope` | 'global' \| 'individual' | ❌ Não (padrão: 'global') |

---

## 📝 Notas Importantes

1. **KV Store:**
   - Os dados são salvos no KV Store do Supabase
   - Não há tabela específica no banco de dados PostgreSQL
   - KV Store é adequado para configurações

2. **Campos Opcionais:**
   - `accountName`, `notificationWebhookUrl` e `scope` são opcionais
   - Se não preenchidos, ficam como `undefined` ou valor padrão

3. **Compatibilidade:**
   - Configurações antigas (sem os novos campos) continuam funcionando
   - Novos campos são opcionais, então não quebra compatibilidade

---

## 🚀 Próximos Passos (Opcional)

1. **Implementar teste de webhook:**
   - Botão "Testar" no campo de notificações
   - Enviar requisição de teste para o webhook

2. **Validação de URL de webhook:**
   - Verificar se é uma URL válida
   - Verificar se é HTTPS (recomendado)

3. **Usar `scope` na lógica:**
   - Se `global`: sincronizar todas as propriedades
   - Se `individual`: sincronizar apenas propriedades específicas

---

## ✅ Conclusão

**Status:** ✅ **TODOS OS CAMPOS IMPLEMENTADOS**

- ✅ Backend atualizado
- ✅ Frontend atualizado
- ✅ Campos adicionados na interface
- ✅ Salvamento funcionando
- ✅ Compatibilidade mantida

**Os dados da integração Stays.net podem ser salvos completamente em produção!**

