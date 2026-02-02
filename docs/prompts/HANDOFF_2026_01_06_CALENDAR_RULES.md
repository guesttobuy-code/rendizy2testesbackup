# 🔄 PROMPT DE HANDOFF - RENDIZY - 2026-01-06

> **Use este prompt para iniciar um novo chat e continuar o trabalho.**

---

## 📋 CONTEXTO DO PROJETO

Você está trabalhando no **Rendizy**, um sistema SaaS multi-tenant para gestão de imóveis de temporada (Airbnb, Booking, etc). 

### Arquivos Principais para Ler Primeiro

```
# OBRIGATÓRIO - Ler estes documentos antes de qualquer ação:
docs/Rules.md                    # Regras canônicas do Rendizy
.github/AI_RULES.md              # Regras específicas para AI/Copilot
.cursorrules                     # Regras compactas para assistentes

# Estrutura do projeto:
Rendizyoficial-main/             # Raiz do projeto React+Vite
├── App.tsx                      # Componente principal (ZONA CRÍTICA)
├── components/
│   ├── CalendarGrid.tsx         # Calendário principal
│   └── CalendarBulkRules.tsx    # Regras em lote
├── hooks/
│   └── useCalendarPricingRules.ts  # Hook de regras de calendário (NOVO)
├── supabase/
│   ├── functions/rendizy-server/   # Edge Functions
│   │   ├── routes-anuncios.ts      # ZONA CRÍTICA - listagem de anúncios
│   │   └── utils-multi-tenant.ts   # Multi-tenancy
│   └── migrations/
│       └── 20260105_create_calendar_pricing_rules.sql  # Migration nova
└── docs/
    └── Rules.md                 # Regras canônicas
```

---

## 🔧 AMBIENTE E CREDENCIAIS

### Supabase
- **Project Ref:** `odcgnzfremrqnvtitpcc`
- **URL:** `https://odcgnzfremrqnvtitpcc.supabase.co`
- **Service Key:** Em `.env.local` → `SUPABASE_SERVICE_ROLE_KEY`
- **Anon Key:** Em `.env.local` → `VITE_SUPABASE_ANON_KEY`
- **CLI Token:** `sbp_7692d1e0362e15141c53f4cc0292f2bb8cbc097b`

### Git
- **Repo:** `https://github.com/guesttobuy-code/rendizy2testesbackup`
- **Remote:** `testes` (principal)
- **Branch:** `main`

### Vercel
- **URL Produção:** `https://rendizy2testesbackup.vercel.app`
- **URL Teste Medhome:** `https://rendizy2testesbackup.vercel.app/site/medhome/`

### Organizações no Sistema
| ID | Nome | Slug |
|----|------|------|
| `00000000-0000-0000-0000-000000000000` | Rendizy (master) | rendizy-master |
| `e78c7bb9-7823-44b8-9aee-95c9b073e7b7` | Medhome teste | rendizy_medhome_teste |
| `7a0873d3-25f1-43d5-9d45-ca7beaa07f77` | Sua Casa Mobiliada | rendizy_sua_casa_mobiliada |

---

## ✅ O QUE FOI FEITO NESTA SESSÃO

### 1. Sistema de Regras de Calendário Multi-Tenant
- ✅ Criada tabela `calendar_pricing_rules` com RLS
- ✅ Criado hook `useCalendarPricingRules.ts`
- ✅ CalendarGrid.tsx integrado com hook
- ✅ CalendarBulkRules.tsx corrigido (linhas não apareciam)
- ✅ Migration aplicada no Supabase (via Dashboard manual)

**Commits:**
- `3199bf8` - feat(calendar): implement multi-tenant pricing rules system
- `9f03f81` - feat(pricing): add cleaningFee, serviceFee, petFee, minNights to API

### 2. Proteções Canônicas para AI
- ✅ Adicionados comentários `[ZONA_CRITICA]` em App.tsx e routes-anuncios.ts
- ✅ Criado `.github/AI_RULES.md` com regras para AI
- ✅ Criado `.cursorrules` para Cursor/Copilot
- ✅ Adicionada validação de segurança antes de setar propriedades vazias

**Commits:**
- `adc0df9` - feat(protection): add canonical AI rules and critical zone markers
- `3972ac9` - docs: link AI_RULES.md in Rules.md and add cross-references
- `4186ef3` - chore: add calendar pricing rules migration and helper scripts

---

## ⏳ O QUE FALTA FAZER

### Prioridade Alta
1. **Testar UI do calendário** - Verificar se regras aparecem corretamente
2. **Implementar edição/save** - Quando usuário clica em célula, salvar no banco
3. **Testar Regras em Lote** - Verificar se override funciona com filtro avançado

### Prioridade Média
4. **Deploy do rendizy-server** - Se houver mudanças no backend, fazer deploy
5. **Validar medhome site** - Certificar que continua funcionando

---

## 🚨 ZONAS CRÍTICAS - NÃO MODIFICAR SEM AUTORIZAÇÃO

### 1. App.tsx::loadProperties
- Marcador: `[ZONA_CRITICA]`
- Função: Carrega propriedades de `properties/lista`
- **NUNCA** alterar lógica de fetch ou filtros

### 2. routes-anuncios.ts::/lista
- Marcador: `[ZONA_CRITICA]`
- Função: Endpoint de listagem de anúncios
- **NUNCA** adicionar filtros extras

### 3. utils-multi-tenant.ts
- Função: Resolve organization_id para multi-tenancy
- **NUNCA** alterar `RENDIZY_MASTER_ORG_ID`

### 4. routes-reservations.ts (RESERVAS) 🆕
- Marcador: `🔒 CADEADO DE CONTRATO`
- Função: CRUD de reservas multi-tenant
- **NUNCA** alterar filtro de `organization_id`
- **NUNCA** modificar contrato sem criar versão v2
- **NUNCA** remover validação de datas ou cálculo de noites

### 5. routes-guests.ts (HÓSPEDES) 🆕
- Função: CRUD de hóspedes multi-tenant
- **NUNCA** alterar filtro de `organization_id`
- **NUNCA** remover sanitização de CPF/email/telefone
- **NUNCA** expor dados sensíveis em listagens

### 6. routes-calendar.ts (CALENDÁRIO) 🆕
- Função: Dados do calendário (reservas + blocks)
- **NUNCA** alterar filtro de `organization_id`
- **NUNCA** quebrar contrato consumido por sites externos
- **NUNCA** remover parâmetros de filtro de data

### 7. routes-blocks.ts (BLOQUEIOS) 🆕
- Função: CRUD de bloqueios de calendário
- **NUNCA** alterar filtro de `organization_id`
- **NUNCA** remover validação de sobreposição de datas
- **NUNCA** permitir blocks sem property_id válido

---

## 📝 COMANDOS ÚTEIS

```powershell
# Navegar para o projeto
cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"

# Ver status do git
git status --porcelain
git log --oneline -5

# Deploy Edge Function
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Verificar anúncios no banco (PowerShell)
$key="<SERVICE_KEY>"; $h=@{apikey=$key;Authorization="Bearer $key"}
$u="https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/properties?select=id,organization_id&limit=10"
Invoke-RestMethod -Uri $u -Headers $h | ConvertTo-Json

# Verificar regras de calendário
$u="https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/calendar_pricing_rules?select=*&limit=10"
Invoke-RestMethod -Uri $u -Headers $h | ConvertTo-Json
```

---

## 🔑 REGRAS CANÔNICAS (RESUMO)

1. **O Rendizy propõe, externos seguem** - Nunca adaptar código para aceitar erros de terceiros
2. **Prompt propositivo, não reativo** - Comandos imperativos, não sugestões
3. **Zero tolerância com desvios** - Regenerar site, não remendar código
4. **Contrato é lei** - Endpoints e tipos são imutáveis após publicação
5. **Fonte de verdade** - `docs/Rules.md`, `catalog.ts`, este arquivo

---

## 📚 DOCUMENTOS PARA CONSULTA

| Documento | Descrição |
|-----------|-----------|
| `docs/Rules.md` | Regras canônicas gerais |
| `.github/AI_RULES.md` | Regras para AI - zonas críticas |
| `.cursorrules` | Regras compactas para Cursor |
| `docs/CALENDAR_PRICING_RULES_MIGRATION.md` | Doc da migration de calendário |
| `Ligando os motores.md` | Instruções de inicialização rápida |

---

## 🎯 PRÓXIMA AÇÃO SUGERIDA

Ao abrir novo chat, comece com:

```
Leia os documentos:
1. docs/Rules.md
2. .github/AI_RULES.md
3. docs/prompts/HANDOFF_2026_01_06_CALENDAR_RULES.md (este arquivo)

Depois verifique:
1. git log --oneline -5 (confirmar último commit)
2. Se há erros no console do navegador
3. Se calendário está carregando propriedades
```

---

**Última atualização:** 2026-01-06 00:30  
**Sessão:** Calendar Pricing Rules + AI Protection  
**Último commit:** `4186ef3`
