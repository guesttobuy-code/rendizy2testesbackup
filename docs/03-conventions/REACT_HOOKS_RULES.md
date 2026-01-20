# Regras de Hooks do React - Convenção Rendizy

**Data:** 2026-01-18  
**Motivação:** Erro React #310 em `ReservationDetailsModal.tsx`

---

## ⚠️ Regra de Ouro

> **NUNCA coloque `if (...) return` ANTES de qualquer hook.**

---

## O Problema

React exige que hooks sejam chamados **sempre na mesma ordem** em cada render. Se você colocar um `return` condicional antes dos hooks, o componente pode renderizar com menos hooks do que o esperado, causando:

```
React error #310: Rendered fewer hooks than expected
```

---

## ❌ ERRADO

```tsx
function Modal({ item }) {
  // ❌ Early return ANTES dos hooks - QUEBRA O REACT!
  if (!item) return null;
  
  const [state, setState] = useState('');  // Hook não é chamado quando item é null
  useEffect(() => { ... }, []);
  
  return <div>...</div>;
}
```

---

## ✅ CORRETO

```tsx
function Modal({ item }) {
  // === BLOCO DE HOOKS (NÃO MOVER) ===
  const [state, setState] = useState('');
  useEffect(() => { ... }, [item]);
  // === FIM DO BLOCO DE HOOKS ===
  
  // ✅ Early return DEPOIS de todos os hooks
  if (!item) return null;
  
  return <div>...</div>;
}
```

---

## Padrão para Modais com Props Opcionais

Quando um modal recebe uma prop que pode ser `undefined` (como `reservation`, `property`, etc):

```tsx
export function ExampleModal({
  isOpen,
  onClose,
  item  // Pode ser undefined
}: ExampleModalProps) {
  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║  ⚠️  REGRA DOS HOOKS DO REACT - NÃO MOVER/REMOVER HOOKS DAQUI               ║
  // ║                                                                               ║
  // ║  1. TODOS os hooks DEVEM ficar ANTES de qualquer "return" condicional        ║
  // ║  2. NUNCA adicione "if (...) return" ANTES dos hooks                          ║
  // ║  3. O early return "if (!item) return null" DEVE ficar DEPOIS                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  
  // === BLOCO DE HOOKS (NÃO MOVER) ===
  const queryClient = useQueryClient();
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (item) {
      // Sincronizar estado com item
    }
  }, [item]);
  // === FIM DO BLOCO DE HOOKS ===
  
  // ✅ Early return DEPOIS de todos os hooks
  if (!item) return null;
  
  // Resto do componente...
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      ...
    </Dialog>
  );
}
```

---

## Componentes Afetados (Verificados)

| Componente | Status |
|------------|--------|
| ReservationDetailsModal | ✅ Corrigido + Comentários de proteção |
| PropertyDetailsModal | ⚠️ Verificar |
| BlockDetailsModal | ⚠️ Verificar |
| GuestDetailsModal | ⚠️ Verificar |

---

## Checklist para Novos Modais

- [ ] Todos os `useState` estão no topo do componente
- [ ] Todos os `useEffect` estão no topo do componente
- [ ] Todos os `useQuery`/`useMutation` estão no topo do componente
- [ ] Early return (`if (!prop) return null`) está DEPOIS de todos os hooks
- [ ] Comentário de proteção adicionado (opcional, mas recomendado para modais críticos)

---

## Referências

- [React Rules of Hooks](https://reactjs.org/docs/hooks-rules.html)
- [React Error #310](https://reactjs.org/docs/error-decoder.html?invariant=310)
- Commit `f1967b1` - Correção do ReservationDetailsModal

---

*Documento criado após incidente em ReservationDetailsModal.tsx*
