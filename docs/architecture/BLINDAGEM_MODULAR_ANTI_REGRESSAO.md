# 🛡️ BLINDAGEM MODULAR - EVITAR REGRESSÕES ARQUITETURAIS

**Data**: 23/12/2025  
**Problema**: CORS quebrou ao trabalhar em StaysNet (módulos isolados afetando funcionalidades críticas)  
**Causa Raiz**: `index.ts` como ponto único de falha - import faltando causou crash global  

---

## 🔴 DIAGNÓSTICO: ONDE A ARQUITETURA FALHOU

### O Problema Real (23/12/2025)

```typescript
// Commit 9d5d8da: Adicionamos nova rota StaysNet
app.post("/staysnet/import/RPC", importStaysNetRPC);

// ❌ MAS ESQUECEMOS O IMPORT
// import { importStaysNetRPC } from "./import-staysnet-RPC.ts"; // FALTANDO
```

**Efeito cascata**:
1. `importStaysNetRPC` não definido → ReferenceError no carregamento
2. Edge Function crashou no **carregamento inicial** (não em runtime)
3. **OPTIONS (preflight) retornou HTTP 500** → CORS quebrado
4. **TODO o sistema ficou inacessível** (login, reservas, calendário)

### ⚠️ Por que as Cápsulas NÃO Protegeram?

As cápsulas (módulos separados) **FUNCIONARAM CORRETAMENTE**:
- ✅ `routes-auth.ts` não foi modificado
- ✅ `routes-anuncios.ts` não foi modificado
- ✅ `routes-reservations.ts` não foi modificado

❌ **MAS**: `index.ts` é o **PONTO ÚNICO DE INTEGRAÇÃO**
- Se o arquivo crashar no **carregamento**, nada funciona
- CORS está no `index.ts` → qualquer erro quebra CORS
- Import faltando → erro de sintaxe/execução → crash total

---

## 🏗️ ARQUITETURA ATUAL (Pontos de Falha)

```
┌─────────────────────────────────────┐
│         index.ts                    │ ← ⚠️ PONTO ÚNICO DE FALHA
│  - CORS (CRÍTICO)                   │
│  - Imports de TODOS os módulos      │
│  - Registro de TODAS as rotas       │
└─────────────────────────────────────┘
          ↓ ↓ ↓ ↓ ↓ ↓
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Auth │ │Anunc.│ │Reserv│ │Stays │
└──────┘ └──────┘ └──────┘ └──────┘
   ✅       ✅       ✅       ❌
                          (causa crash em index.ts)
```

**Problema**: Se **qualquer** módulo tem erro de import/sintaxe:
- ❌ index.ts crasha **completamente**
- ❌ CORS não funciona (está no index.ts)
- ❌ Login quebra (depende de CORS)
- ❌ Sistema 100% offline

---

## 🛡️ SOLUÇÕES DE BLINDAGEM

### 1. 🔥 **CORS EM CAMADA SEPARADA (Prioridade Máxima)**

**Problema**: CORS está dentro do app Hono que pode crashar  
**Solução**: CORS deve ser **ANTES** de qualquer lógica de app

#### ✅ IMPLEMENTAÇÃO DEFINITIVA

```typescript
// index.ts - NOVA ESTRUTURA

// ============================================================================
// 🔥 CAMADA 1: CORS ISOLADO (NÃO PODE FALHAR NUNCA)
// ============================================================================
Deno.serve((req) => {
  // Handle CORS ANTES de qualquer lógica Hono
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token",
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  // ============================================================================
  // 🛡️ CAMADA 2: APP HONO COM TRY-CATCH GLOBAL
  // ============================================================================
  try {
    return app.fetch(req);
  } catch (error) {
    console.error("🔥 ERRO CRÍTICO NO APP:", error);
    // Retornar resposta com CORS mesmo em erro
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
});
```

**Vantagens**:
- ✅ CORS **SEMPRE** responde (mesmo se app crashar)
- ✅ OPTIONS retorna 204 antes de carregar qualquer módulo
- ✅ Erro em qualquer módulo → HTTP 500 com CORS (não bloqueia navegador)

---

### 2. 🧪 **VALIDAÇÃO DE IMPORTS NO BUILD (TypeScript)**

**Problema**: Import faltando só é descoberto em produção  
**Solução**: Validação em tempo de desenvolvimento

#### ✅ Adicionar ao deno.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  },
  "tasks": {
    "check": "deno check supabase/functions/rendizy-server/index.ts",
    "check-all": "deno check supabase/functions/rendizy-server/*.ts"
  }
}
```

#### ✅ Pre-deploy Hook (Git)

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "🔍 Validando TypeScript antes de deploy..."
cd supabase/functions/rendizy-server
deno check index.ts

if [ $? -ne 0 ]; then
  echo "❌ Erro de TypeScript detectado!"
  echo "Corrija os erros antes de fazer push"
  exit 1
fi

echo "✅ Validação TypeScript OK"
```

---

### 3. 📋 **CHECKLIST OBRIGATÓRIO PARA NOVOS ENDPOINTS**

Sempre que adicionar um **novo endpoint** em `index.ts`:

```typescript
// ============================================================================
// 🆕 NOVO MÓDULO: [NOME]
// ============================================================================

// ✅ CHECKLIST (marque tudo antes de commit):
// [ ] Import adicionado no topo do arquivo
// [ ] Rota registrada com app.get/post/put/delete
// [ ] Testado localmente com `deno check index.ts`
// [ ] Deploy testado em staging antes de produção
// [ ] Documentado em CHANGELOG.md

import { novaFuncao } from "./novo-modulo.ts"; // ← ✅ 1. IMPORT PRIMEIRO

// ... depois no corpo do arquivo ...

app.post("/rendizy-server/novo-endpoint", novaFuncao); // ← ✅ 2. ROTA DEPOIS
```

---

### 4. 🔒 **MÓDULOS CRÍTICOS PROTEGIDOS (Leitura Obrigatória)**

Criar arquivo de referência para áreas sensíveis:

```typescript
// ============================================================================
// 🔒 MÓDULOS CRÍTICOS - NÃO MODIFICAR SEM LER DOCUMENTAÇÃO
// ============================================================================

/**
 * ⚠️ ATENÇÃO: Este arquivo conecta TODOS os módulos do sistema
 * 
 * ANTES DE MODIFICAR, LEIA:
 * - docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md
 * - docs/operations/SETUP_COMPLETO.md (Seção 4.4 - CORS)
 * 
 * REGRAS CRÍTICAS:
 * 1. CORS está nas linhas 20-40 → NÃO MODIFICAR sem validação
 * 2. Imports no topo → SEMPRE adicionar antes de usar
 * 3. Auth routes nas linhas 50-55 → NÃO MOVER (login depende disso)
 * 4. TESTAR com `deno check index.ts` antes de commit
 * 
 * HISTÓRICO DE PROBLEMAS:
 * - 23/12/2025: Import faltando quebrou CORS global (8h de debug)
 * - 20/11/2025: CORS modificado quebrou login (descrição em SETUP_COMPLETO.md)
 */
```

---

### 5. 🧩 **LAZY LOADING DE MÓDULOS (Futuro - Opcional)**

Para isolar erros de módulos individuais:

```typescript
// Carregar módulos de forma lazy (só quando rota for acessada)
app.post("/rendizy-server/staysnet/import/RPC", async (c) => {
  try {
    const { importStaysNetRPC } = await import("./import-staysnet-RPC.ts");
    return importStaysNetRPC(c);
  } catch (error) {
    console.error("Erro ao carregar módulo StaysNet:", error);
    return c.json({ error: "Módulo indisponível", details: error.message }, 503);
  }
});
```

**Vantagem**: Erro no módulo StaysNet não impede Auth/Reservas de funcionarem

---

## 📊 CHECKLIST DE DEPLOY (Para IA e Devs)

Antes de **qualquer deploy**, validar:

### ✅ **PRÉ-COMMIT**
- [ ] `deno check index.ts` sem erros
- [ ] Todos os imports no topo do arquivo
- [ ] Rotas registradas após imports
- [ ] CORS não foi modificado (linhas 20-40)

### ✅ **PRÉ-DEPLOY**
- [ ] `git diff index.ts` - revisar mudanças
- [ ] Testar localmente: `supabase functions serve rendizy-server`
- [ ] Curl test: `curl -X OPTIONS https://...` → HTTP 204
- [ ] Verificar logs: nenhum erro de módulo

### ✅ **PÓS-DEPLOY**
- [ ] Teste OPTIONS: `curl -X OPTIONS [URL]` → HTTP 204
- [ ] Teste Login: POST /auth/login → HTTP 200/401 (não 500)
- [ ] Teste Frontend: localhost:3000 carrega sem CORS error

---

## 🎯 REGRAS DE OURO (PARA IA)

### ❌ **NUNCA FAÇA**
1. ❌ Modificar CORS em `index.ts` sem ler docs/operations/SETUP_COMPLETO.md
2. ❌ Adicionar rota sem adicionar import correspondente
3. ❌ Fazer deploy sem `deno check index.ts`
4. ❌ Modificar linhas 1-50 de index.ts sem confirmação do usuário

### ✅ **SEMPRE FAÇA**
1. ✅ Adicionar import ANTES de usar função
2. ✅ Testar preflight OPTIONS após qualquer mudança em index.ts
3. ✅ Documentar em CHANGELOG.md mudanças em módulos críticos
4. ✅ Perguntar ao usuário antes de modificar CORS

### 🔍 **QUANDO MODIFICAR INDEX.TS**
1. Ler este documento COMPLETO
2. Identificar se é área crítica (CORS, Auth)
3. Fazer `deno check` antes de commit
4. Testar CORS com curl após deploy
5. Se quebrar login/CORS → reverter imediatamente

---

## 📝 DOCUMENTAÇÃO RELACIONADA

1. **docs/operations/SETUP_COMPLETO.md** (Seção 4.4) - Configuração CORS definitiva
2. **docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md** - ⭐ **PADRÃO DE PERSISTÊNCIA** (NOVO - LEITURA OBRIGATÓRIA)
3. **docs/architecture/CAPSULAS_MODULARES.md** - Isolamento de módulos
4. **Ligando os motores único.md** - Histórico de vitórias e derrotas
5. **LOGIN_VITORIAS_CONSOLIDADO.md** - Aprendizados de login
6. **ARQUITETURA_ANUNCIO_ULTIMATE.md** - Padrão atômico em anuncios_ultimate
7. **PROPOSTA_ARQUITETURA_PERSISTENCIA.md** - Repository Pattern

---

## 🔄 HISTÓRICO DE REGRESSÕES

### 23/12/2025 - CORS Quebrado por Import Faltando
- **Commit**: 9d5d8da
- **Causa**: Adicionado `app.post("/staysnet/import/RPC", importStaysNetRPC)` sem import
- **Efeito**: Edge Function crashou no carregamento → OPTIONS retornou 500 → CORS quebrado
- **Impacto**: Sistema 100% offline (login, reservas, calendário)
- **Solução**: Adicionado `import { importStaysNetRPC } from "./import-staysnet-RPC.ts";`
- **Tempo de resolução**: 2h (diagnóstico + correção + deploy)
- **Prevenção**: Este documento + validação TypeScript

### 20/11/2025 - CORS Quebrado por `credentials: true`
- **Causa**: Tentativa de usar cookies HttpOnly
- **Efeito**: `origin: "*"` com `credentials: true` → CORS inválido
- **Solução**: Remover cookies, usar token no header
- **Documentado em**: SETUP_COMPLETO.md (Seção 4.4)

---

## 🚨 AÇÕES PARA PREVENIR NOVAS REGRESSÕES

### Imediatas (23/12/2025)
- [x] Criar este documento
- [ ] Implementar CORS em camada separada (Prioridade 1)
- [ ] Adicionar comentários de proteção em index.ts
- [ ] Criar pre-push hook com `deno check`

### Curto Prazo (1 semana)
- [ ] Adicionar testes automatizados de CORS (CI/CD)
- [ ] Implementar lazy loading de módulos não-críticos
- [ ] Documentar todos os endpoints em OpenAPI/Swagger

### Médio Prazo (1 mês)
- [ ] Migrar CORS para middleware separado (arquivo dedicado)
- [ ] Implementar monitoramento de erros em produção
- [ ] Criar dashboard de saúde dos módulos

---

## 💡 CONCLUSÃO

A arquitetura de cápsulas **FUNCIONA**, mas `index.ts` é um **ponto único de falha**.

**Solução definitiva**:
1. CORS em camada isolada (não depende de app Hono)
2. Validação TypeScript antes de deploy
3. Comentários de proteção em áreas críticas
4. Checklist obrigatório para novos endpoints

**Para IA**: Sempre ler este documento antes de modificar `index.ts`

---

**Mantido por**: Rafael  
**Última atualização**: 23/12/2025  
**Próxima revisão**: Quando adicionar novo módulo crítico
