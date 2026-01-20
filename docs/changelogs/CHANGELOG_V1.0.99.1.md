# CHANGELOG - Versão 1.0.99.1

**Data:** 28/10/2025  
**Tipo:** Hotfix - Reversão do Posicionamento do Filtro do Chat

---

## 🎯 RESUMO EXECUTIVO

Revertido o painel de filtros do Chat de volta para a **lateral ESQUERDA** conforme solicitação do usuário.

### O que mudou

```diff
v1.0.99:  Sheet side="right"  ❌ Causou problema
v1.0.99.1: Sheet side="left"   ✅ Restaurado
```

---

## ⚡ MUDANÇA APLICADA

### Arquivo: `/components/ChatInbox.tsx`

```tsx
// ❌ v1.0.99 (REVERTIDO)
<SheetContent side="right" className="w-[400px] sm:w-[420px]">

// ✅ v1.0.99.1 (RESTAURADO)
<SheetContent side="left" className="w-[400px] sm:w-[420px]">
```

**O que foi mantido da v1.0.99:**
- ✅ Largura w-[400px] (melhorada)
- ✅ ScrollArea h-[calc(100vh-120px)]
- ✅ Filtro de Propriedades completo
- ✅ Busca de propriedades
- ✅ Ações rápidas (Todas/Nenhuma)
- ✅ Contador de selecionadas
- ✅ Integração com backend

**O que foi revertido:**
- ↩️ Posicionamento: right → left

---

## 📝 RAZÃO DA REVERSÃO

O usuário testou a v1.0.99 e identificou que prefere o filtro na **lateral esquerda**, que é o comportamento anterior do Chat.

**Observação importante:**
- PropertySidebar (Calendário) permanece com `side="right"` ✅
- ChatInbox (Chat) agora usa `side="left"` ✅
- Cada módulo tem seu próprio padrão visual

---

## 📦 ARQUIVOS ALTERADOS

```
✅ /components/ChatInbox.tsx                    (1 linha)
✅ /docs/changelogs/CHANGELOG_V1.0.99.1.md     (este arquivo)
```

---

## ✅ STATUS

**Filtro do Chat:**
- [x] Abre na lateral esquerda (conforme solicitado)
- [x] Largura w-[400px] mantida
- [x] Filtro de propriedades funcionando
- [x] ScrollArea funcionando corretamente

---

**RENDIZY v1.0.99.1 - Hotfix Chat Filters**  
**Data:** 28/10/2025  
**Próximo:** Aguardando testes do usuário
