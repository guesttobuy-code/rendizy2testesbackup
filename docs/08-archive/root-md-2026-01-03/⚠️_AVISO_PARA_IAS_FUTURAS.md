# ⚠️ AVISO PARA IAs FUTURAS - LEIA ANTES DE FAZER QUALQUER COISA

**Data**: 2025-12-13  
**Prioridade**: 🔴 **CRÍTICO**

---

## 🚨 NÃO CRIE EDGE FUNCTIONS SEPARADAS!

### ❌ **NUNCA FAÇA ISSO**:
```
supabase/functions/
├── rendizy-server/          ← Servidor principal
├── meu-novo-modulo/         ← ❌ NÃO CRIAR!
└── outro-modulo-separado/   ← ❌ NÃO CRIAR!
```

### ✅ **SEMPRE FAÇA ISSO**:
```
supabase/functions/rendizy-server/
├── index.ts                 ← Servidor principal
├── routes-auth.ts           ← Rotas dentro do servidor
├── routes-properties.ts     ← Rotas dentro do servidor
├── routes-anuncios.ts       ← Rotas dentro do servidor
└── routes-[seu-modulo].ts   ← ✅ CRIAR AQUI!
```

---

## 📋 CHECKLIST ANTES DE CRIAR QUALQUER CÓDIGO:

1. ❓ Usuário pediu novo módulo?
   - ✅ Criar `routes-[modulo].ts` dentro de `rendizy-server/`
   - ❌ **NÃO** criar edge function separada

2. ❓ Precisa de endpoint HTTP?
   - ✅ Adicionar rota em arquivo `routes-*.ts` existente
   - ✅ OU criar novo `routes-[modulo].ts` SE for módulo grande
   - ❌ **NÃO** criar edge function separada

3. ❓ Precisa acessar banco de dados?
   - ✅ Usar `getSupabaseClient(c)` do kv_store
   - ✅ RPC functions para lógica complexa
   - ❌ **NÃO** criar edge function separada

---

## 🏗️ ARQUITETURA DO PROJETO

### Servidor Principal (rendizy-server):
- **416 deployments** = Servidor ESTÁVEL e PRODUÇÃO
- **40+ módulos** = Todos integrados via rotas
- **Pattern**: Hono framework com sub-apps montados

### Edge Functions Permitidas:
- ✅ `rendizy-server` - Servidor principal (ÚNICO servidor HTTP)
- ✅ `migrate-users` - Utilitário de migração (NÃO é servidor)

### Edge Functions PROIBIDAS:
- ❌ Qualquer edge function nova que responda HTTP
- ❌ Módulos separados que deveriam ser rotas

---

## 🔧 COMO ADICIONAR NOVO MÓDULO (CORRETO):

### Passo 1: Criar arquivo de rotas
```typescript
// supabase/functions/rendizy-server/routes-meu-modulo.ts
import { Hono } from "npm:hono";
import { getSupabaseClient } from "./kv_store.tsx";

const app = new Hono();

app.get("/", async (c) => {
  const supabase = getSupabaseClient(c);
  // sua lógica aqui
  return c.json({ ok: true });
});

export default app;
```

### Passo 2: Importar no index.ts
```typescript
// supabase/functions/rendizy-server/index.ts
import meuModuloApp from "./routes-meu-modulo.ts";
```

### Passo 3: Montar rota
```typescript
// supabase/functions/rendizy-server/index.ts
app.route("/rendizy-server/meu-modulo", meuModuloApp);
```

### Passo 4: Deploy do servidor principal
```bash
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc --no-verify-jwt
```

---

## 📖 EXEMPLOS DE MÓDULOS CORRETOS:

- ✅ `routes-anuncios.ts` - Anúncios Ultimate (consolidado em 2025-12-13)
- ✅ `routes-properties.ts` - Propriedades
- ✅ `routes-reservations.ts` - Reservas
- ✅ `routes-auth.ts` - Autenticação
- ✅ `routes-financeiro.ts` - Sistema Financeiro

**TODOS estão dentro de `rendizy-server/`**

---

## 💡 POR QUE ISSO É IMPORTANTE?

### Problema com Edge Functions Separadas:
1. ❌ Dificulta manutenção (código espalhado)
2. ❌ Duplicação de auth/middleware
3. ❌ Confusão sobre qual função usar
4. ❌ IAs futuras podem fazer besteira
5. ❌ Inconsistência na arquitetura
6. ❌ Bugs difíceis de debugar

### Benefícios de Rotas Unificadas:
1. ✅ Código organizado em um lugar
2. ✅ Auth/middleware compartilhado
3. ✅ Fácil de encontrar e modificar
4. ✅ Padrão consistente
5. ✅ Menos confusão para IAs
6. ✅ Debugging simplificado

---

## 🚨 HISTÓRIA REAL - NÃO REPETIR:

**Data**: 2025-12-13  
**Problema**: IA criou `anuncio-ultimate` como edge function separada  
**Consequência**: Save não funcionava, loop infinito, crashes DOM  
**Solução**: Consolidar em `routes-anuncios.ts` dentro de `rendizy-server`  
**Lição**: **NUNCA criar edge functions separadas para módulos HTTP**

---

## ✅ RESUMO PARA IAs:

1. 🎯 **UM servidor** = `rendizy-server`
2. 🎯 **Múltiplas rotas** = `routes-*.ts` dentro dele
3. 🎯 **Deploy único** = `rendizy-server` apenas
4. 🎯 **Sempre verificar** = Já existe `routes-[modulo].ts` para isso?
5. 🎯 **Quando em dúvida** = Adicionar em arquivo existente ou criar `routes-*.ts`

---

**🔴 SE VOCÊ É UMA IA E ESTÁ PENSANDO EM CRIAR EDGE FUNCTION SEPARADA**:

## **NÃO FAÇA ISSO! CRIE ROTAS DENTRO DE `rendizy-server/`**

---

**FIM DO AVISO**
