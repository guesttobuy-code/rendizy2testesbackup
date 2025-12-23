# CHANGELOG - Blindagem Modular Anti-Regressão

## [1.0.104] - 23/12/2025

### 🛡️ BLINDAGEM MODULAR - Prevenção de Regressões

#### Adicionado
- **docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md** - Documentação completa sobre:
  - Análise de pontos únicos de falha (index.ts)
  - Soluções de blindagem (CORS em camada isolada)
  - Checklist obrigatório para novos endpoints
  - Histórico de regressões e como prevenir
  
- **Comentários de proteção em index.ts**:
  - Header com avisos de áreas críticas
  - Referências para documentação obrigatória
  - Histórico de problemas anteriores
  - Checklist para novos imports

- **CORS em dupla camada** (index.ts):
  - Camada 1: Middleware Hono (rotas específicas)
  - Camada 2: Deno.serve() com try-catch (proteção total)
  - OPTIONS tratado ANTES do app Hono
  - Resposta com CORS garantida mesmo em crash

- **Validação TypeScript** (deno.json):
  - Tasks: `check`, `check-all`, `validate`
  - Linting ativo
  - Flags strict habilitadas

- **Script de validação pré-deploy**:
  - VALIDATE-BEFORE-DEPLOY.ps1
  - Verifica TypeScript (deno check)
  - Valida CORS não foi modificado
  - Detecta imports faltando
  - Checa git status

#### Modificado
- **supabase/functions/rendizy-server/index.ts**:
  - Comentários extensivos de proteção
  - CORS isolado em Deno.serve()
  - Try-catch global para garantir CORS em erro
  
- **supabase/functions/rendizy-server/deno.json**:
  - Adicionado tasks de validação
  - Configurações strict
  - Linting rules

#### Contexto da Mudança

**Problema**: 
- CORS quebrou ao adicionar endpoint StaysNet (23/12/2025)
- Import `importStaysNetRPC` faltando causou crash na Edge Function
- OPTIONS retornou HTTP 500 → CORS bloqueado → Sistema 100% offline

**Causa Raiz**:
- `index.ts` é ponto único de integração (Single Point of Failure)
- Erro em qualquer módulo → crash global → CORS para de funcionar
- Import faltando só descoberto em produção

**Solução Implementada**:
1. CORS em camada completamente isolada (Deno.serve)
2. Try-catch garantindo resposta com CORS mesmo em erro
3. Comentários de proteção para prevenir modificações perigosas
4. Validação TypeScript antes de deploy
5. Documentação completa da arquitetura

**Impacto**:
- ✅ CORS nunca mais quebrará por erro em módulo
- ✅ OPTIONS sempre retorna 204 (antes de carregar app)
- ✅ Erros têm CORS headers (não bloqueiam navegador)
- ✅ Documentação para IA não cometer erros similares

#### Testes Realizados
```bash
# Validação TypeScript
cd supabase/functions/rendizy-server
deno task check
# ✅ No errors

# Teste CORS
curl -X OPTIONS https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/auth/login
# ✅ HTTP 204 No Content

# Deploy
npx -y supabase@latest functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
# ✅ Deployed successfully
```

#### Documentação Relacionada
- 📚 docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md (NOVO)
- 📚 docs/operations/SETUP_COMPLETO.md (Seção 4.4 - CORS)
- 📚 Ligando os motores único.md (Histórico)
- 📚 LOGIN_VITORIAS_CONSOLIDADO.md (Aprendizados)

#### Breaking Changes
Nenhum. Mudanças são transparentes e backward-compatible.

#### Migration Guide
Não necessário. Sistema continua funcionando da mesma forma, apenas mais robusto.

---

## [1.0.103] - 23/12/2025

### 🔧 Correção CORS Emergencial

#### Fixed
- **CORS quebrado por import faltando**:
  - Adicionado `import { importStaysNetRPC } from "./import-staysnet-RPC.ts";`
  - Middleware CORS movido para app.use() global
  - OPTIONS retornando Response direta (não c.text)
  
- **Commits**:
  - e62c069: Correção inicial (app.all + import)
  - 208cf1d: Correção definitiva (Response direta)

#### Problema Resolvido
- Sistema completamente inacessível (login, reservas, calendário)
- Preflight OPTIONS retornando HTTP 500
- Browser bloqueando todas as requests por CORS
- Tempo de resolução: 2h

---

**Mantido por**: Rafael  
**Última atualização**: 23/12/2025
