# 🔍 VERIFICAR LOGS: Guia Rápido

**O que fazer agora nos logs do Supabase:**

---

## 🎯 **PASSO 1: Buscar nos Logs**

1. No painel de logs que você está vendo, pressione `Ctrl+F` (buscar)
2. Digite: `WhatsApp Monitor`
3. Veja quantas ocorrências aparecem

---

## 📊 **PASSO 2: Verificar Requisições**

Procure por requisições como:

```
POST /rendizy-server/whatsapp/monitor/start
```

**Se encontrar:**
- ✅ O cron job está chamando o endpoint
- ✅ Verifique o status (200 = sucesso)
- ✅ Veja a frequência (deve ser a cada 30 segundos)

---

## ⏰ **PASSO 3: Verificar Frequência**

1. Veja os horários dos logs mais recentes
2. Procure por logs do monitor
3. Deve haver um log **a cada 30 segundos aproximadamente**

---

## ✅ **O QUE ESPERAR:**

### **Se está funcionando:**

Você verá logs como:

```
[WhatsApp Monitor] 🔍 Verificando conexão para org...
[WhatsApp Monitor] ✅ Conexão estável
```

**A cada 30 segundos.**

---

### **Se não vê logs ainda:**

1. ⏳ **Aguarde mais alguns minutos** - pode demorar para aparecer
2. 🔍 **Procure por logs mais recentes** - role para baixo
3. 📋 **Verifique histórico de execuções** - execute o SQL de verificação

---

## 🚨 **O QUE VOCÊ ESTÁ VENDO AGORA:**

Nos logs que você mostrou, vejo:
- ✅ LOG shutdown (normal - função reiniciando)
- ✅ INFO logs de requisições HTTP
- ✅ Rendizy Backend API starting...

**Mas não vejo logs do `[WhatsApp Monitor]` ainda.**

---

## 💡 **POSSÍVEIS RAZÕES:**

1. **Cron job ainda não executou:**
   - Pode levar alguns minutos para a primeira execução
   - Aguarde e verifique novamente

2. **Logs podem estar mais abaixo:**
   - Role para baixo nos logs
   - Verifique logs mais recentes

3. **Cron job pode não estar ativo:**
   - Verifique no banco: `SELECT * FROM cron.job WHERE jobname = 'monitor-whatsapp-connection';`

---

## ✅ **AÇÃO IMEDIATA:**

1. **Aguarde 1-2 minutos**
2. **Atualize os logs** (refresh)
3. **Procure por:** `WhatsApp Monitor`
4. **Ou procure por:** `POST /rendizy-server/whatsapp/monitor/start`

---

**Se ainda não aparecer depois de alguns minutos, me avise!**

