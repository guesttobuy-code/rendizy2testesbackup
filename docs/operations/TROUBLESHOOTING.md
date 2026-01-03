# 🔧 TROUBLESHOOTING - Guia de Solução de Problemas

> **Problemas comuns e como resolver rapidamente**

---

## 🚨 PROBLEMAS CRÍTICOS (Sistema Não Funciona)

### **❌ Erro: "Cannot find module" ao iniciar**

**Sintoma:**
```
Error: Cannot find module 'react'
Error: Cannot find module '@supabase/supabase-js'
```

**Solução:**
```powershell
# 1. Limpar node_modules
Remove-Item node_modules -Recurse -Force

# 2. Limpar cache npm
npm cache clean --force

# 3. Reinstalar dependências
npm install

# 4. Tentar novamente
npm run dev
```

**Tempo:** ~2 minutos

---

### **❌ Erro: "Port 3001 is already in use"**

**Sintoma:**
```
Error: Port 3001 is already in use
```

**Solução Rápida:**
```powershell
# 1. Encontrar processo usando a porta
netstat -ano | findstr :3001

# Retorna algo como:
# TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    12345

# 2. Matar o processo (substitua 12345 pelo PID real)
taskkill /PID 12345 /F

# 3. Tentar novamente
npm run dev
```

**Solução Alternativa:**
```powershell
# Usar porta diferente
npm run dev -- --port 3002
```

**Tempo:** 30 segundos

---

### **❌ Erro: "Supabase connection failed" / 401 Unauthorized**

**Sintoma:**
```
Failed to fetch from Supabase
Error 401: Unauthorized
```

**Diagnóstico:**
```powershell
# 1. Verificar .env.local existe
Test-Path .env.local

# 2. Ver conteúdo
cat .env.local
```

**Solução:**
```powershell
# 1. Verificar variáveis obrigatórias
# .env.local deve ter:
VITE_SUPABASE_URL=https://odcgnzfremrqnvtitpcc.supabase.co
VITE_SUPABASE_ANON_KEY=[sua_key_aqui]

# 2. Se faltando, copiar do template
Copy-Item .env.example .env.local

# 3. Editar com keys corretas
code .env.local

# 4. Reiniciar servidor
# (Ctrl+C no terminal e npm run dev novamente)
```

**Tempo:** 1 minuto

---

### **❌ Tela Branca ao Abrir Aplicação**

**Sintoma:**
- Navegador abre mas mostra tela branca
- Console mostra erros de JavaScript

**Solução:**
```powershell
# 1. Verificar console do navegador (F12)
# Anotar erros específicos

# 2. Limpar cache do navegador
# Ctrl+Shift+Delete → Limpar tudo

# 3. Limpar dist/ e rebuild
Remove-Item dist -Recurse -Force
npm run build
npm run dev

# 4. Tentar em modo incógnito
# Ctrl+Shift+N (Chrome) ou Ctrl+Shift+P (Firefox)
```

**Tempo:** 2 minutos

---

## ⚠️ PROBLEMAS COMUNS (Sistema Funciona Mas Com Issues)

### **⚠️ StaysNet Retorna 401**

**Sintoma:**
```
StaysNet API error: 401 Unauthorized
```

**Solução:**
```typescript
// Verificar headers em components/StaysNetIntegration/services/staysnet.service.ts
// DEVE SER:
headers: {
  'X-Auth-Token': config.apiKey,
  'X-Account-Name': config.accountName
}

// NÃO DEVE SER:
headers: {
  'Authorization': `Bearer ${config.apiKey}` // ❌ ERRADO!
}
```

**Tempo:** 30 segundos

---

### **⚠️ Calendário Mostra Data Errada**

**Sintoma:**
- Calendário mostra outubro ao invés de dezembro

**Causa:**
```typescript
// contexts/CalendarContext.tsx linhas 81-84
dateRange: {
  from: new Date(2025, 9, 24),  // ← Hardcoded!
  to: new Date(2025, 10, 11)
}
```

**Solução:**
Veja [Issue #42](../../docs/dev-logs/2024-12-19_auditoria-calendario-staysnet.md)

---

### **⚠️ Reserva Não É Criada (FK Error)**

**Sintoma:**
```
Error: violates foreign key constraint "reservations_property_id_fkey"
```

**Causa:**
FK aponta para tabela errada (properties) ao invés de anuncios_ultimate

**Solução:**
```sql
-- Rodar migration no Supabase Dashboard
-- Ver: supabase/migrations/20241218_ALINHAMENTO_COMPLETO_SCHEMA.sql
```

---

## 🔍 DEBUGGING AVANÇADO

### **Ver Logs Backend (Supabase Functions)**

```powershell
# Logs em tempo real
npx supabase functions logs rendizy-server --tail

# Logs específicos de período
npx supabase functions logs rendizy-server --since 1h
```

### **Ver Logs Frontend (Console)**

```javascript
// Abrir console (F12) e filtrar por:
// - "Error" → Ver erros
// - "API" → Ver chamadas de API
// - "RENDIZY" → Ver logs do sistema
```

### **Verificar Requests HTTP**

```
1. Abrir DevTools (F12)
2. Aba "Network"
3. Filtrar por "Fetch/XHR"
4. Tentar ação que falha
5. Ver request/response
```

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Quando algo não funciona, siga esta ordem:

- [ ] **1. Console tem erros?** (F12 → Console)
- [ ] **2. Network tem falhas?** (F12 → Network)
- [ ] **3. .env.local está correto?** (`cat .env.local`)
- [ ] **4. node_modules está OK?** (testar `npm install`)
- [ ] **5. Porta está livre?** (`netstat -ano | findstr :3001`)
- [ ] **6. Backend está deployado?** (testar API diretamente)
- [ ] **7. Cache está limpo?** (Ctrl+Shift+Delete)

---

## 🆘 ÚLTIMO RECURSO

Se nada funcionar:

### **Reset Completo**

```powershell
# 1. Parar servidor (Ctrl+C)

# 2. Limpar tudo
Remove-Item node_modules -Recurse -Force
Remove-Item dist -Recurse -Force
Remove-Item package-lock.json

# 3. Reinstalar
npm install

# 4. Rebuild
npm run build

# 5. Iniciar
npm run dev

# 6. Se ainda não funcionar, verificar .env.local
code .env.local
```

**Tempo:** ~5 minutos

---

## 📞 PEDIR AJUDA

Se problema persiste:

1. **Documente o erro:**
   - Console logs (F12)
   - Network errors (F12 → Network)
   - Comandos executados
   - O que estava tentando fazer

2. **Crie issue no GitHub:**
   - Template: Bug Report
   - Anexe logs e screenshots

3. **Ou consulte docs:**
   - [SETUP_COMPLETO.md](SETUP_COMPLETO.md)
   - [README_DOCUMENTACAO.md](../README_DOCUMENTACAO.md)

---

## 🔗 RECURSOS ÚTEIS

- [Supabase Status](https://status.supabase.com/) - Verificar se serviço está online
- [Node.js Docs](https://nodejs.org/docs/) - Documentação Node.js
- [Vite Docs](https://vitejs.dev/) - Documentação Vite

---

**Última Atualização:** 2024-12-19  
**Contribuidores:** Time Rendizy
