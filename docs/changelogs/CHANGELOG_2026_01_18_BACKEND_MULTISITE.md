# Changelog: Backend Multi-Site + Checkout URL Fix

**Data:** 2026-01-18  
**Impacto:** Backend compartilhado (todos os sites)

---

## ⚠️ AVISO IMPORTANTE

O arquivo `supabase/functions/rendizy-public/index.ts` é o **backend compartilhado** de todos os sites de clientes. Qualquer mudança aqui afeta:

- **medhome** - https://medhomecelsosobral.vercel.app
- **suacasamobiliada** - https://rendizy-site-sua-casa-mobiliada.vercel.app
- **Todos os sites futuros**

---

## Mudanças Realizadas

### 1. Função `resolveClientSite()` (NOVA)

**Localização:** `rendizy-public/index.ts` linha ~121

**O que faz:**
- Resolve o subdomain para encontrar a organização correta
- Primeiro tenta match EXATO por subdomain
- Se não encontrar, faz fallback por org slug normalizado

**Por que foi criada:**
- Alguns sites (ex: suacasamobiliada) tinham subdomain diferente do esperado
- API retornava "Site não encontrado" porque não achava match exato
- Agora tenta múltiplas estratégias

**Backward Compatible:** ✅ Sim
- Sites existentes que usam subdomain exato continuam funcionando igual
- Fallback só é usado quando match direto falha

### 2. Endpoints Atualizados para usar `resolveClientSite()`

Os seguintes endpoints agora usam a função resolver:

- `/client-sites/api/:subdomain/calendar`
- `/client-sites/api/:subdomain/site-config`
- `/client-sites/api/:subdomain/availability`
- `/client-sites/api/:subdomain/properties`
- `/client-sites/api/:subdomain/calculate-price`
- `/client-sites/api/:subdomain/reservations`
- `/client-sites/api/:subdomain/checkout/session`
- `/client-sites/api/:subdomain/payment-methods`
- `/client-sites/api/:subdomain/reservations/:id/status` ← Crítico para polling de checkout

### 3. Avisos Adicionados ao Código

Foram adicionados blocos de aviso no início do arquivo e na função `resolveClientSite()` para alertar sobre:

- Este é um backend compartilhado multi-site
- Qualquer mudança deve ser backward compatible
- Lista de sites afetados
- Referência ao prompt de sites

---

## Correção React Error #310 (ReservationDetailsModal)

**Arquivos:** `components/ReservationDetailsModal.tsx`

### Problema
Ao clicar em "Abrir Reserva" no modal rápido do calendário, a página quebrava com:
```
React error #310: Rendered fewer hooks than expected
```

### Causa Raiz
Early return (`if (!reservation) return null`) estava **ANTES** dos hooks:

```tsx
// ❌ ERRADO - causava React error #310
function ReservationDetailsModal({ reservation }) {
  if (!reservation) return null;  // Early return ANTES dos hooks
  
  const [paymentStatus, setPaymentStatus] = useState('pending');  // Hook não era chamado quando reservation era null
  // ...
}
```

### Solução
Mover todos os hooks para ANTES do early return:

```tsx
// ✅ CORRETO - hooks sempre chamados na mesma ordem
function ReservationDetailsModal({ reservation }) {
  // === BLOCO DE HOOKS (NÃO MOVER) ===
  const [paymentStatus, setPaymentStatus] = useState('pending');
  useEffect(() => { ... }, [reservation]);
  // === FIM DO BLOCO DE HOOKS ===
  
  if (!reservation) return null;  // Early return DEPOIS dos hooks
  // ...
}
```

### Proteção Adicionada
Bloco de comentários visível no código alertando:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  REGRA DOS HOOKS DO REACT - NÃO MOVER/REMOVER HOOKS DAQUI               ║
║                                                                               ║
║  1. TODOS os hooks DEVEM ficar ANTES de qualquer "return" condicional        ║
║  2. NUNCA adicione "if (...) return" ANTES dos hooks                          ║
║  3. O early return DEVE ficar DEPOIS dos hooks                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Commits Relacionados
- `f1967b1` - fix: restaurar hook paymentStatus + proteger bloco de hooks
- `e20cbd9` - fix: mover early return DEPOIS dos hooks
- `922b8a8` - fix: React error #310 - move early return before hooks
- `5f6a002` - fix: mover useState para antes do return condicional

---

## Correção no Front-End (suacasamobiliada)

**Arquivo:** `_tmp_suacasa_repo/src/services/rendizy.ts`

**Mudança:**
```typescript
// ANTES (problemático):
async function getCheckoutBaseUrl(): Promise<string> {
  // Lógica complexa que podia retornar URL errada
}

// DEPOIS (correto):
function getCheckoutBaseUrl(): string {
  // Sempre retorna o backend Rendizy
  return 'https://rendizy2testesbackup.vercel.app';
}
```

**Por que:**
- O endpoint `/api/checkout/success` existe apenas no backend Rendizy
- Se apontar para o site do cliente, dá 404
- medhome já estava correto (hardcoded URL)
- suacasamobiliada foi corrigido para seguir o mesmo padrão

---

## Atualização do Prompt (catalog.ts)

O código de exemplo foi atualizado para ser mais explícito:

```typescript
// ⚠️ IMPORTANTE: O backend URL é HARDCODED, não dinâmico!
const RENDIZY_BACKEND_URL = 'https://rendizy2testesbackup.vercel.app';
successUrl: `${RENDIZY_BACKEND_URL}/api/checkout/success?...`
```

---

## Como Evitar Problemas Futuros

### 1. Antes de mexer no `rendizy-public/index.ts`:
- Ler os avisos no topo do arquivo
- Verificar se a mudança é backward compatible
- Testar em TODOS os sites ativos

### 2. Ao criar novo site:
- Verificar se subdomain está correto na tabela `client_sites`
- Usar o padrão de checkout URL do medhome como referência
- Nunca usar URLs dinâmicas para successUrl/cancelUrl do checkout

### 3. Ao debugar "Site não encontrado":
- Verificar primeiro a tabela `client_sites`
- Conferir se subdomain bate exatamente
- Se não bater, pode ser que o resolver de fallback funcione

---

## Deploys Realizados

| Componente | Plataforma | Status |
|------------|------------|--------|
| rendizy-public | Supabase Edge Functions | ✅ Deployed |
| suacasamobiliada | Vercel | ✅ Deployed + Promoted |
| medhome | N/A | Não precisou mudança |

---

## Testes de Validação

```powershell
# Testar endpoint de status (polling do checkout)
curl "https://rendizy2testesbackup.vercel.app/api/guest/reservations/status?siteSlug=suacasamobiliada&reservationId=<ID>"

# Deve retornar { success: true, data: { id, status, paymentStatus } }
# ou { success: false, error: "Reserva não encontrada" } se ID não existir
```

---

*Documentação criada em: 2026-01-18*
