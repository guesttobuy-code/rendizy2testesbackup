# Changelog v1.0.104.003 - Catalog v6.7 Anti-Patterns

> **Data**: 2026-01-17  
> **Autor**: Copilot + Rafael  
> **Sessão**: Anti-Patterns Checklist + Correções Sites

---

## 🛡️ Catalog v6.7 - Sistema Anti-Patterns

### Objetivo
Cercar erros comuns que IAs (Bolt.new e similares) cometem ao gerar sites para o Rendizy.

### Novas Estruturas em `catalog.ts`

| Item | Tipo | Descrição |
|------|------|-----------|
| `AntiPatternSeverity` | Type | `'CRITICAL' \| 'HIGH' \| 'MEDIUM'` |
| `AntiPattern` | Type | Estrutura completa com `id`, `wrongCode`, `correctCode`, `detection` |
| `ANTI_PATTERNS_CHECKLIST` | Array | 12 anti-patterns documentados |
| `generateAntiPatternsSection()` | Function | Gera seção no prompt |
| `validateAgainstAntiPatterns()` | Function | Valida código automaticamente |

### Anti-Patterns Implementados

| ID | Categoria | Severidade | Descrição |
|----|-----------|------------|-----------|
| AP-CAL-001 | 📅 Calendário | CRITICAL | Falta bloquear datas passadas com `isPast()` |
| AP-CAL-002 | 📅 Calendário | HIGH | Usa boolean em vez de string ('available'/'blocked') |
| AP-CAL-003 | 📅 Calendário | HIGH | Usa dados mock no calendário |
| AP-CHK-001 | 💳 Checkout | CRITICAL | Não abre em nova aba (`_blank`) |
| AP-CHK-002 | 💳 Checkout | MEDIUM | Mensagem errada antes do redirect |
| AP-CHK-003 | 💳 Checkout | HIGH | URLs de retorno não apontam para Rendizy |
| AP-PAY-001 | 💳 Pagamento | MEDIUM | Usa dropdown em vez de radio buttons |
| AP-STR-001 | 🏗️ Estrutura | CRITICAL | Importa `@supabase/supabase-js` |
| AP-STR-002 | 🏗️ Estrutura | CRITICAL | Usa variáveis `VITE_*` |
| AP-STR-003 | 🏗️ Estrutura | CRITICAL | Usa placeholders `{{}}` |
| AP-STR-004 | 🏗️ Estrutura | CRITICAL | Não usa HashRouter |

### Commits Relacionados
- `efed221` - feat(catalog): v6.7 - Anti-Patterns Checklist para cercar erros de IA

---

## 🔧 Correções em Sites de Clientes

### Suacasamobiliada - Bloqueio de Datas Passadas

**Arquivo**: `_tmp_suacasa_repo/src/components/DateRangePicker.tsx`

**Antes** (permitia selecionar datas passadas):
```tsx
const isDisabled = dayStatus.status === 'blocked';
```

**Depois** (bloqueia datas passadas + bloqueadas):
```tsx
import { isPast, startOfDay } from 'date-fns';

const isPastDay = isPast(startOfDay(day));
const isDisabled = isPastDay || dayStatus.status === 'blocked';
```

**Visual**: Datas passadas ficam acinzentadas com opacidade 50%

**Commits**:
- `032d3d7` - fix: bloquear datas passadas no calendário de reservas

---

## 🚀 Vercel Deploy Automation

### Credenciais Salvas (sustentável)

**Arquivo**: `_rendizy-creds.local.ps1`

```powershell
# VERCEL API - Projetos e Tokens
$env:VERCEL_TOKEN = 'VelEUfVk...'
$env:VERCEL_TEAM_ID = 'team_ioGXT2DtIuAKQP3ZFV5Znesf'

# IDs dos Projetos na Vercel
$env:VERCEL_PROJECT_RENDIZY_BACKEND = 'prj_3tQuVyHSUpRcEx2tJMaotyOV0b9b'
$env:VERCEL_PROJECT_SUACASAMOBILIADA = 'prj_UNMYQZOz5v7mYbQPvonqTqujtuZt'
```

### Deploy Forçado via API

```powershell
# Exemplo de uso
. .\_rendizy-creds.local.ps1
$headers = @{ Authorization = "Bearer $env:VERCEL_TOKEN" }
$body = @{
  name = "rendizy-site-sua-casa-mobiliada"
  gitSource = @{ type = "github"; repoId = 1135423310; ref = "main" }
  target = "production"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments?forceNew=1" `
  -Method POST -Headers $headers -Body $body
```

### Resultado
- Deploy `dpl_4r6yYBGRMBdyFAVWXXw31kDBrsN5` → **READY** ✅
- URL: https://rendizy-site-sua-casa-mobiliada.vercel.app

---

## 📁 Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `catalog.ts` | Backend | +350 linhas (anti-patterns) |
| `DateRangePicker.tsx` | Site | Fix datas passadas |
| `_rendizy-creds.local.ps1` | Config | IDs Vercel |

---

## ✅ Validação

- [x] Build local funciona (`npm run build`)
- [x] TypeScript sem erros
- [x] Deploy Vercel READY
- [x] Site acessível: https://rendizy-site-sua-casa-mobiliada.vercel.app
- [x] Calendário bloqueia datas passadas
