# 📋 COMO VERIFICAR LOGS: Monitoramento WhatsApp

**Data:** 20/11/2025  
**Local:** Supabase Dashboard → Edge Functions → rendizy-server → Logs

---

## 🔍 O QUE PROCURAR NOS LOGS

### **1. Logs do Monitor WhatsApp**

Procure por estas mensagens nos logs:

```
[WhatsApp Monitor] 🔍 Verificando conexão para org...
[WhatsApp Monitor] ✅ Conexão estável
[WhatsApp Monitor] ⚠️ Conexão perdida
[WhatsApp Monitor] 💓 Heartbeat enviado
[WhatsApp Monitor] 🔄 Tentando reconectar...
```

### **2. Logs de Requisições do Cron Job**

Procure por requisições POST para:

```
POST /rendizy-server/whatsapp/monitor/start
```

### **3. Frequência dos Logs**

- ✅ Deve aparecer **a cada 30 segundos** aproximadamente
- ✅ Logs devem ser recentes (últimos minutos)
- ✅ Status deve ser `succeeded` na maioria das vezes

---

## 📊 INTERPRETAÇÃO DOS LOGS

### **✅ SUCESSO (Tudo OK):**

```
[WhatsApp Monitor] 🔍 Verificando conexão para org...
[WhatsApp Monitor] ✅ Conexão estável
[WhatsApp Monitor] 💓 Heartbeat enviado
```

**Significa:** Monitoramento funcionando, conexão OK.

### **⚠️ ATENÇÃO (Conexão Caiu):**

```
[WhatsApp Monitor] ⚠️ Conexão perdida (status: DISCONNECTED)
[WhatsApp Monitor] 🔄 Tentando reconectar...
[WhatsApp Monitor] ✅ Reconexão bem-sucedida!
```

**Significa:** Conexão caiu, mas reconectou automaticamente.

### **❌ ERRO (Problema):**

```
[WhatsApp Monitor] ❌ Erro ao verificar status
[WhatsApp Monitor] ❌ Erro no monitoramento
```

**Significa:** Há um problema que precisa investigar.

---

## 🔎 COMO FILTRAR OS LOGS

### **Opção 1: Buscar por Texto**

1. No painel de logs, use a busca (Ctrl+F)
2. Procure por: `WhatsApp Monitor`
3. Veja quantas ocorrências aparecem

### **Opção 2: Filtrar por Data/Hora**

1. Veja logs das **últimas horas**
2. Procure por logs recentes (últimos minutos)
3. Verifique se há logs do monitor a cada 30 segundos

### **Opção 3: Verificar Requisições HTTP**

1. Procure por: `POST /rendizy-server/whatsapp/monitor/start`
2. Verifique se há requisições a cada 30 segundos
3. Veja o status das requisições (200 = sucesso)

---

## 📝 LOGS ESPERADOS

### **Cron Job Executando Corretamente:**

Você deve ver nos logs:

```
INFO --> POST /rendizy-server/whatsapp/monitor/start
[WhatsApp Monitor] 🚀 Iniciando monitoramento para org...
[WhatsApp Monitor] 🔍 Verificando conexão para org...
[WhatsApp Monitor] ✅ Conexão estável
[WhatsApp Monitor] 💓 Heartbeat enviado
INFO <-- POST /rendizy-server/whatsapp/monitor/start 200 Xms
```

### **Frequência Esperada:**

- ✅ Logs a cada **30 segundos**
- ✅ Últimos logs devem ser de **alguns segundos atrás**
- ✅ Status **200** nas requisições

---

## ⚠️ SE NÃO VER LOGS

### **Possíveis Causas:**

1. **Cron job ainda não executou:**
   - Aguarde 1-2 minutos
   - O cron job pode demorar para executar pela primeira vez

2. **Cron job não está ativo:**
   - Verifique no banco: `SELECT * FROM cron.job WHERE jobname = 'monitor-whatsapp-connection';`
   - Verifique se `active = true`

3. **Endpoint não está sendo chamado:**
   - Verifique histórico de execuções: `SELECT * FROM cron.job_run_details WHERE jobid = 1 ORDER BY start_time DESC LIMIT 10;`

4. **Logs estão em outro lugar:**
   - Verifique filtros de data/hora
   - Verifique se está vendo logs da função correta (`rendizy-server`)

---

## ✅ CHECKLIST DE VERIFICAÇÃO

- [ ] Ver logs recentes (últimos minutos)
- [ ] Procurar por `[WhatsApp Monitor]`
- [ ] Verificar requisições `POST /rendizy-server/whatsapp/monitor/start`
- [ ] Confirmar que logs aparecem a cada 30 segundos
- [ ] Verificar status das requisições (200 = sucesso)
- [ ] Ver mensagens de sucesso (`✅ Conexão estável`)

---

## 🎯 PRÓXIMOS PASSOS

1. **Se ver logs do monitor:** ✅ Tudo funcionando!
2. **Se não ver logs:** Aguarde mais alguns minutos ou verifique histórico de execuções do cron job
3. **Se ver erros:** Analise os erros e corrija conforme necessário

---

**DICA:** Use `Ctrl+F` para buscar `WhatsApp Monitor` nos logs e ver quantas ocorrências aparecem recentemente!

