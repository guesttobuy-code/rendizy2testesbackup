# REGRAS CANÔNICAS DO RENDIZY

> **Este documento é a fonte de verdade. Nenhuma exceção é permitida.**

---

## 🔴 REGRA #1: O RENDIZY PROPÕE, EXTERNOS SEGUEM

O Rendizy define o padrão/contrato. Sites externos (Bolt.new, ferramentas de IA, qualquer terceiro) **DEVEM** se adaptar ao nosso padrão.

- ✅ Rendizy publica a API, o formato, os tipos, as convenções
- ✅ Sites externos leem nossa documentação e implementam conforme especificado
- ❌ **NUNCA** adaptamos código Rendizy para "aceitar" código de terceiros
- ❌ **NUNCA** fazemos "remendos" ou "patches" em runtime para corrigir erros de terceiros
- ❌ **NUNCA** criamos compatibilidade retroativa com implementações erradas

**Se o site externo está errado, a correção é no PROMPT/DOCUMENTAÇÃO do Rendizy, para que a próxima geração venha correta.**

---

## 🔴 REGRA #2: PROMPT PROPOSITIVO, NÃO REATIVO

O prompt de geração de sites é **propositivo** — ele dita as regras, não sugere.

- ✅ O prompt usa linguagem imperativa: "FAÇA", "USE", "IMPLEMENTE"
- ✅ O prompt especifica tipos, formatos, convenções exatas
- ✅ O prompt inclui anti-patterns explícitos: "NUNCA faça X"
- ❌ O prompt NÃO pergunta, NÃO sugere, NÃO deixa margem para interpretação

---

## 🔴 REGRA #3: ZERO TOLERÂNCIA COM DESVIOS

Se um site gerado não funciona:

1. **Identificar** o desvio do padrão (o que o site fez errado)
2. **Documentar** no prompt/catalog para prevenir recorrência
3. **Regenerar** o site com o prompt atualizado
4. ❌ **NUNCA** adaptar o Rendizy para "aceitar" o erro

---

## 🔴 REGRA #4: CONTRATO É LEI

Os endpoints, tipos e formatos documentados em `catalog.ts` e no prompt são **imutáveis** após publicação.

- Mudanças são **aditivas** (novos campos opcionais, novos endpoints)
- Campos existentes **NUNCA** mudam de tipo ou semântica
- Se precisa quebrar compatibilidade, cria-se **nova versão** do contrato

---

## 🔴 REGRA #5: FONTE DE VERDADE

| Assunto | Fonte de Verdade |
|---------|------------------|
| API pública para sites | `catalog.ts` |
| Prompt de geração | `ClientSitesManager.tsx` |
| Regras canônicas | Este arquivo (`Rules.md`) |
| Tipos TypeScript | Arquivos `.d.ts` e interfaces no código |

**Conflitos são resolvidos consultando a fonte de verdade, não adaptando código.**

---

## 📋 CHECKLIST PARA DESENVOLVEDORES (HUMANOS E IA)

Antes de fazer qualquer mudança:

- [ ] A mudança está no RENDIZY propondo padrão, ou está adaptando Rendizy a terceiro?
- [ ] Se for adaptar Rendizy a terceiro → **PARE. Corrija o prompt/docs.**
- [ ] A mudança é propositiva (dita regra) ou reativa (aceita variação)?
- [ ] O contrato existente está sendo respeitado (sem quebra)?

---

## 🤖 NOTA PARA IA ASSISTENTE

**LEIA ISTO ANTES DE QUALQUER AÇÃO:**

1. Você NUNCA deve sugerir patches/remendos no código Rendizy para "aceitar" código externo
2. Se o site gerado tem bug, a correção é SEMPRE no prompt/documentação
3. O fluxo correto é: prompt corrigido → site regenerado → funciona
4. Nunca sugira "adaptar o backend para aceitar formato X do Bolt"
5. O Rendizy é o padrão. Ponto final.

---

*Última atualização: 2026-01-06*
*Versão: 2.0*

---

# 🏛️ ARQUITETURA DE DADOS - TABELAS CANÔNICAS

> **⚠️ SEÇÃO CRÍTICA - LEIA COM ATENÇÃO**
>
> As tabelas listadas abaixo são o **CORAÇÃO DO SISTEMA**.
> Violações dessas regras causam bugs críticos, perda de dados e inconsistências.

---

## 🔒 REGRA MESTRE: TABELAS CANÔNICAS

### Hierarquia Principal do Sistema

```
organizations (tenant raiz)
    ├── users (usuários do tenant)
    ├── properties (imóveis/propriedades) ← FONTE DE VERDADE
    │     ├── reservations (reservas)
    │     ├── blocks (bloqueios de calendário)
    │     └── calendar_pricing_rules (regras de preço)
    ├── guests (hóspedes)
    ├── financeiro_* (módulo financeiro)
    └── client_sites (sites customizados)
```

---

## 📊 TABELA #1: `properties` - IMÓVEIS

| Atributo | Valor |
|----------|-------|
| **Propósito** | Armazenar TODOS os dados de imóveis/propriedades |
| **Tipo de ID** | UUID |
| **Multi-tenant** | Sim (`organization_id`) |
| **Status** | 🟢 ATIVA - FONTE DE VERDADE |

**Estrutura:**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  status TEXT DEFAULT 'draft',  -- draft, active, published, inactive
  title TEXT,
  data JSONB DEFAULT '{}'::jsonb,  -- Todos os dados flexíveis
  completion_percentage INTEGER DEFAULT 0,
  step_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Campos importantes em `data` (JSONB):**
| Campo | Descrição |
|-------|-----------|
| `data.name` / `data.title` | Nome do imóvel |
| `data.address` | Objeto com city, state, street, etc. |
| `data.pricing` | dailyRate, basePrice, cleaningFee, etc. |
| `data.photos` | Array de URLs de fotos |
| `data.rooms` | Array de cômodos/quartos |
| `data.amenities` / `data.comodidades` | Array de comodidades |
| `data.externalIds` | IDs de sistemas externos (StaysNet, etc.) |
| `data.bedrooms` / `data.quartos` | Número de quartos |
| `data.bathrooms` / `data.banheiros` | Número de banheiros |
| `data.guests` / `data.maxGuests` | Capacidade máxima |

### ⛔ REGRAS INVIOLÁVEIS PARA IMÓVEIS

1. **NUNCA** criar tabela `properties` (foi REMOVIDA em 2026-01-06)
2. **NUNCA** criar tabela `listings` separada
3. **NUNCA** criar tabela `imoveis` em português
4. **NUNCA** criar tabela `apartments`, `houses`, etc.
5. **SEMPRE** usar `properties` para qualquer dado de imóvel
6. Dados flexíveis VÃO em `data` (JSONB), não em colunas novas

---

## 📊 TABELA #2: `reservations` - RESERVAS

| Atributo | Valor |
|----------|-------|
| **Propósito** | Armazenar todas as reservas de hospedagem |
| **Tipo de ID** | UUID |
| **Multi-tenant** | Sim (`organization_id`) |
| **FK Principal** | `property_id` → `properties.id` |

### ⛔ REGRAS INVIOLÁVEIS PARA RESERVAS

1. **NUNCA** criar tabela `bookings` concorrente
2. **NUNCA** criar tabela `reservas` em português
3. `property_id` **SEMPRE** referencia `properties.id`

---

## 📊 TABELA #3: `blocks` - BLOQUEIOS

| Atributo | Valor |
|----------|-------|
| **Propósito** | Bloquear datas no calendário |
| **Tipo de ID** | UUID |
| **Multi-tenant** | Sim (`organization_id`) |
| **FK Principal** | `property_id` → `properties.id` |

### ⛔ REGRAS INVIOLÁVEIS PARA BLOQUEIOS

1. **NUNCA** criar tabela `bloqueios` em português
2. **NUNCA** criar tabela `unavailable_dates`
3. `property_id` **SEMPRE** referencia `properties.id`

---

## 📊 TABELA #4: `guests` - HÓSPEDES

| Atributo | Valor |
|----------|-------|
| **Propósito** | Cadastro de hóspedes/clientes |
| **Tipo de ID** | UUID |
| **Multi-tenant** | Sim (`organization_id`) |

### ⛔ REGRAS INVIOLÁVEIS PARA HÓSPEDES

1. **NUNCA** criar tabela `hospedes` em português
2. **NUNCA** criar tabela `clients` ou `customers`

---

## 📊 TABELA #5: `organizations` - TENANTS

| Atributo | Valor |
|----------|-------|
| **Propósito** | Organizações/empresas (multi-tenant) |
| **Tipo de ID** | UUID |
| **Org Master** | `00000000-0000-0000-0000-000000000000` (Rendizy) |

### ⛔ REGRAS INVIOLÁVEIS PARA TENANTS

1. **NUNCA** deletar a organização master
2. **NUNCA** criar tabela `tenants` concorrente
3. **TODA** tabela de dados DEVE ter coluna `organization_id`

---

## 📊 TABELA #6: `users` - USUÁRIOS

| Atributo | Valor |
|----------|-------|
| **Propósito** | Usuários do sistema |
| **Tipo de ID** | UUID |
| **Multi-tenant** | Sim (`organization_id`) |
| **Tipos** | superadmin, admin, user, imobiliaria |

### ⛔ REGRAS INVIOLÁVEIS PARA USUÁRIOS

1. **NUNCA** criar tabela `usuarios` em português
2. Superadmin tem acesso a TODOS os tenants

---

## 📊 TABELA #7: `calendar_pricing_rules` - REGRAS DE PREÇO

| Atributo | Valor |
|----------|-------|
| **Propósito** | Regras de precificação por período |
| **FK Principal** | `property_id` → `properties.id` |

### ⛔ REGRAS INVIOLÁVEIS

1. **NUNCA** criar FK para `properties` (tabela não existe)
2. `property_id` referencia `properties.id`

---

## 🚫 TABELAS PROIBIDAS - NUNCA CRIAR

| Nome Proibido | Motivo | Use Isso |
|---------------|--------|----------|
| `properties` | REMOVIDA em 2026-01-06 | `properties` |
| `listings` | Duplicaria anuncios | `properties` |
| `imoveis` | Português proibido | `properties` |
| `bookings` | Duplicaria reservations | `reservations` |
| `reservas` | Português proibido | `reservations` |
| `hospedes` | Português proibido | `guests` |
| `bloqueios` | Português proibido | `blocks` |
| `usuarios` | Português proibido | `users` |
| `tenants` | Duplicaria orgs | `organizations` |

---

## 📝 PADRÃO DE CÓDIGO - QUERIES CORRETAS

### ✅ CORRETO - Buscar Imóveis
```typescript
const { data } = await supabase
  .from('properties')
  .select('id, status, organization_id, data')
  .eq('organization_id', organizationId)
  .in('status', ['active', 'published']);
```

### ❌ ERRADO - Tabela Não Existe
```typescript
// 🚫 NUNCA FAÇA ISSO - TABELA NÃO EXISTE
const { data } = await supabase
  .from('properties')
  .select('*');
```

### Extrair Dados do JSONB
```typescript
const anuncio = row;
const d = anuncio.data || {};

// Normalização de campos (aceita variações)
const nome = d.name || d.title || 'Sem nome';
const preco = d.pricing?.dailyRate || d.basePrice || 0;
const cidade = d.address?.city || d.cidade || null;
const fotos = d.photos || d.fotos || [];
const quartos = d.bedrooms || d.quartos || 0;
const banheiros = d.bathrooms || d.banheiros || 0;
const hospedes = d.guests || d.maxGuests || d.max_guests || 0;
```

---

## 📜 HISTÓRICO DE MUDANÇAS ESTRUTURAIS

| Data | Mudança | Motivo |
|------|---------|--------|
| 2026-01-06 | Removida tabela `properties` | Duplicava `properties` |
| 2026-01-06 | Atualizado Rules.md v2.0 | Canonizar arquitetura de dados |

---

## 📚 DOCUMENTOS RELACIONADOS

| Documento | Descrição |
|-----------|-----------|
| [AI_RULES.md](../.github/AI_RULES.md) | Regras específicas para AI/Copilot - Zonas Críticas do código |
| [.cursorrules](../.cursorrules) | Regras para Cursor/Copilot (formato compacto) |
| [INVENTARIO_PROPERTIES_DROPADA.md](./INVENTARIO_PROPERTIES_DROPADA.md) | Inventário da remoção da tabela properties |
