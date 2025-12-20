# 🔧 FIX: Loop Infinito de Loading v1.0.103.358

## 📋 Problema Identificado

**Sintoma**: Aplicação ficava presa em "Verificando autenticação..." infinitamente ao abrir/recarregar página.

**Logs observados**:
```
🪟 [AuthContext] Janela ganhou foco - revalidando sessão...
🪟 [AuthContext] Janela ganhou foco - revalidando sessão...
🪟 [AuthContext] Janela ganhou foco - revalidando sessão...
[... infinitamente ...]
```

## 🔍 Causa Raiz

**AuthContext.tsx** tinha event listeners (`visibilitychange` e `focus`) que disparavam verificações de sessão **toda vez** que a janela ganhava foco, sem nenhum controle de frequência.

**Fluxo do Problema**:
1. Usuário abre/recarrega página
2. `ProtectedRoute` espera validação (até 5 segundos)
3. `AuthContext` dispara `handleWindowFocus()` 
4. `loadUser()` é chamado com `isPeriodicCheck = true`
5. Navegador reprocessa eventos de foco rapidamente
6. `handleWindowFocus()` dispara novamente antes da primeira validação terminar
7. **Loop infinito**: cada verificação dispara nova verificação

**Código Problemático** (linhas 295-315):
```typescript
const handleVisibilityChange = () => {
  if (isMounted && !document.hidden) {
    const token = localStorage.getItem('rendizy-token');
    if (token) {
      console.log('👁️ [AuthContext] Aba voltou ao foco - revalidando sessão...');
      loadUser(1, true, true); // ❌ SEM CONTROLE DE FREQUÊNCIA
    }
  }
};

const handleWindowFocus = () => {
  if (isMounted) {
    const token = localStorage.getItem('rendizy-token');
    if (token) {
      console.log('🪟 [AuthContext] Janela ganhou foco - revalidando sessão...');
      loadUser(1, true, true); // ❌ SEM CONTROLE DE FREQUÊNCIA
    }
  }
};
```

## ✅ Solução Implementada

**Throttling de 30 segundos** entre verificações de foco/visibilidade.

**Código Corrigido** (AuthContext.tsx linhas 295-330):
```typescript
// ✅ FIX v1.0.103.358: Throttle para evitar loop infinito de verificação de foco
let lastFocusCheck = 0;
const FOCUS_CHECK_THROTTLE = 30000; // 30 segundos entre verificações

const handleVisibilityChange = () => {
  if (isMounted && !document.hidden) {
    const token = localStorage.getItem('rendizy-token');
    if (token) {
      const now = Date.now();
      if (now - lastFocusCheck > FOCUS_CHECK_THROTTLE) {
        lastFocusCheck = now;
        console.log('👁️ [AuthContext] Aba voltou ao foco - revalidando sessão...');
        loadUser(1, true, true);
      }
    }
  }
};

const handleWindowFocus = () => {
  if (isMounted) {
    const token = localStorage.getItem('rendizy-token');
    if (token) {
      const now = Date.now();
      if (now - lastFocusCheck > FOCUS_CHECK_THROTTLE) {
        lastFocusCheck = now;
        console.log('🪟 [AuthContext] Janela ganhou foco - revalidando sessão...');
        loadUser(1, true, true);
      }
    }
  }
};
```

## 🎯 Benefícios

1. **Elimina Loop Infinito**: Verificações de sessão só ocorrem **no máximo uma vez a cada 30 segundos**
2. **Mantém Segurança**: Sessão ainda é revalidada quando necessário (ex: aba inativa voltando ao foco)
3. **Performance**: Reduz drasticamente número de requisições HTTP desnecessárias
4. **UX**: Usuário não fica preso em tela de loading

## 🧪 Como Testar

1. Recarregar página (Ctrl+R ou F5)
2. Verificar que tela de loading desaparece em < 2 segundos
3. Clicar fora da janela e voltar → verificar que NÃO dispara nova verificação imediatamente
4. Aguardar 30 segundos, clicar fora e voltar → verificar que AGORA dispara verificação (log "🪟 Janela ganhou foco")

## 📁 Arquivos Modificados

- `src/contexts/AuthContext.tsx` (linhas 295-330)

## 🔖 Versão

**v1.0.103.358** - Fix loop infinito de loading em verificações de sessão

## 📅 Data

19/12/2024 22:10

## 👤 Autor

GitHub Copilot (Claude Sonnet 4.5)

---

## 🔗 Contexto Relacionado

- **Problema Anterior**: Bloqueios não apareciam no calendário (v1.0.103.357 - transformação snake_case → camelCase)
- **Versão Base**: v1.0.103.356 (correção de filtros e fontes de dados em ReservationsManagement)
- **Documentação Sessão**: CONTEXTO_SESSAO_18_12_2024_v2.md

## ⚠️ Notas Importantes

- **Throttle de 30 segundos** é um valor conservador - pode ser ajustado se necessário
- **Verificações periódicas** (a cada 5 minutos) via `setInterval` continuam funcionando normalmente
- **BroadcastChannel** de login entre abas continua funcionando sem throttle (não afetado)
