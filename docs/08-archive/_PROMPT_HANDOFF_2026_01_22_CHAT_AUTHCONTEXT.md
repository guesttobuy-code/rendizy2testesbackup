# PROMPT HANDOFF - Chat & AuthContext (22/01/2026)

## 🎯 CONTEXTO GERAL

Você está trabalhando no projeto **Rendizy** - uma plataforma de gestão de propriedades de aluguel de temporada (tipo Airbnb) com integração WhatsApp.

**Responda sempre em PORTUGUÊS (Brasil).**

---

## 📁 ESTRUTURA DO PROJETO

```
Workspace: c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy

├── src/
│   ├── components/
│   │   └── chat/
│   │       └── SimpleChatInbox.tsx    # Tela de chat principal
│   ├── contexts/
│   │   └── AuthContext.tsx            # Contexto de autenticação (MODIFICADO)
│   └── ...
├── components/
│   └── ProtectedRoute.tsx             # Proteção de rotas (NÃO está em src/)
├── supabase/
│   └── functions/
│       └── rendizy-server/            # Edge Functions do Supabase
│           └── index.ts               # Router principal
└── ...
```

---

## 🔧 CREDENCIAIS E ENDPOINTS

### Supabase
- **Project Ref**: `odcgnzfremrqnvtitpcc`
- **URL**: `https://odcgnzfremrqnvtitpcc.supabase.co`
- **Edge Function**: `rendizy-server`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE`

### Evolution API (WhatsApp)
- **URL**: `http://76.13.82.60:8080`
- **Instance**: `rendizy-admin-master`

### Organização de Teste
- **Organization ID**: `7a0873d3-25f1-43d5-9d45-ca7beaa07f77`

---

## 🚀 COMANDOS ÚTEIS

```powershell
# Navegar para o projeto
cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy"

# Rodar dev server
npm run dev

# Deploy da Edge Function
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc --no-verify-jwt

# Git push
git push origin master

# Testar API de chats
curl -s "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/whatsapp/chats?organization_id=7a0873d3-25f1-43d5-9d45-ca7beaa07f77" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE"
```

---

## ✅ O QUE FOI CORRIGIDO (Sessão 22/01/2026)

### 1. Loop Infinito no AuthContext.tsx

**Problema**: O `useEffect` tinha `[user]` como dependência, mas dentro dele chamava `loadUser()` que fazia `setUser()`, criando um loop infinito:
```
user muda → useEffect roda → loadUser() → setUser() → user muda → loop
```

**Sintoma**: 650+ erros no Console, chamadas repetidas ao endpoint `/me` na aba Network.

**Solução Implementada**:

```typescript
// 1. Adicionado useRef ao import
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// 2. Adicionado refs para throttling (dentro do AuthProvider)
const isLoadingUserRef = useRef(false);
const lastLoadTimeRef = useRef(0);
const MIN_LOAD_INTERVAL = 5000; // 5 segundos mínimo entre chamadas

// 3. Adicionado throttle no início da função loadUser
const loadUser = async (isPeriodicCheck = false) => {
  const now = Date.now();
  if (isLoadingUserRef.current) return;
  if (now - lastLoadTimeRef.current < MIN_LOAD_INTERVAL && !isPeriodicCheck) return;
  isLoadingUserRef.current = true;
  lastLoadTimeRef.current = now;
  
  // ... resto da função ...
  
  // 4. No finally block, resetar o ref
  finally {
    isLoadingUserRef.current = false;
  }
}

// 5. Mudado useEffect de [user] para []
useEffect(() => {
  // ... código ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

---

## 📋 ARQUIVOS IMPORTANTES MODIFICADOS

### `src/contexts/AuthContext.tsx`
- Contexto de autenticação principal
- Função `loadUser()` chama `/auth/me` para validar sessão
- **Modificado**: Adicionado throttling com refs + removido `[user]` do useEffect

### `src/components/chat/SimpleChatInbox.tsx`
- Tela de chat principal (lista de conversas WhatsApp)
- Funções: `formatPhone()`, `extractPhoneFromJid()`
- **Modificado em sessão anterior**: Corrigidos problemas de UI

### `components/ProtectedRoute.tsx`
- **ATENÇÃO**: Está em `components/`, NÃO em `src/components/`
- Versão simplificada com timeout de 2 segundos para loading

---

## ⏳ PENDENTE / PRÓXIMOS PASSOS

1. **Testar o fix do AuthContext**
   - Usuário precisa recarregar a página (Ctrl+Shift+R)
   - Verificar se chamadas `/me` pararam de repetir
   - Verificar se erros do console diminuíram

2. **Funcionalidade de Busca no Chat**
   - A busca no SimpleChatInbox ainda não está funcionando
   - Precisa implementar filtro de conversas

3. **Validar dados do WhatsApp**
   - API retorna 200+ chats corretamente (testado com curl)
   - Verificar se UI está renderizando corretamente

---

## 🔍 ENDPOINTS DA API

### Rotas do WhatsApp (sem prefixo `/api`)
```
GET  /whatsapp/chats?organization_id=XXX     → Lista chats
GET  /whatsapp/messages?remoteJid=XXX        → Lista mensagens
POST /whatsapp/send                          → Envia mensagem
GET  /whatsapp/status                        → Status da conexão
```

### Rotas de Auth
```
GET  /auth/me                                → Dados do usuário logado
POST /auth/login                             → Login
POST /auth/logout                            → Logout
```

---

## 🐛 DEBUGGING

### Para verificar erros no AuthContext:
```typescript
// Adicione logs temporários
console.log('[AuthContext] loadUser called', { isLoadingUserRef: isLoadingUserRef.current });
```

### Para testar API diretamente:
```powershell
# Testar endpoint de chats
curl -s "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/whatsapp/chats?organization_id=7a0873d3-25f1-43d5-9d45-ca7beaa07f77" -H "apikey: [KEY]" -H "Authorization: Bearer [KEY]"
```

---

## 📝 NOTAS ADICIONAIS

- O projeto usa **Vite** como bundler
- Frontend em **React + TypeScript**
- Backend em **Supabase Edge Functions (Deno)**
- Integração WhatsApp via **Evolution API**
- Banco de dados **PostgreSQL** (Supabase)

---

**Cole este prompt inteiro no início de um novo chat para continuar o trabalho.**
