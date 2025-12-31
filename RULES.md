# 🔒 REGRAS DE OURO - Rendizy PMS

> ⚠️ **LEITURA OBRIGATÓRIA**: Qualquer IA ou desenvolvedor DEVE ler este arquivo ANTES de qualquer alteração.
> 
> Estas regras são **IMUTÁVEIS** e foram estabelecidas após meses de desenvolvimento e correção de bugs recorrentes.

**Versão**: 1.0  
**Última atualização**: 20/12/2024  
**Autores**: Equipe Rendizy + IAs (Claude Sonnet 4.5)

---

## 📚 ÍNDICE

- [Seção 0: Leis Anti-Caos (Para IAs)](#-seção-0-leis-anti-caos-para-ias)
- [Seção 1: Estrutura de Dados](#1-estrutura-de-dados)
- [Seção 2: Rotas e Endpoints](#2-rotas-e-endpoints)
- [Seção 3: Autenticação](#3-autenticação)
- [Seção 4: Importação StaysNet](#4-importação-staysnet)
- [Seção 5: Migrações e Duplicatas](#5-migrações-e-duplicatas)
- [Seção 6: Commits e Documentação](#6-commits-e-documentação)
- [Seção 7: Arquitetura de Cápsulas](#7-arquitetura-de-cápsulas)
- [Seção 8: Comandos Críticos](#8-comandos-críticos)
- [Seção 9: Verificações SQL](#9-verificações-sql)
- [Seção 10: Lições Aprendidas](#10-lições-aprendidas-não-repetir)

---

## ⚠️ SEÇÃO 0: LEIS ANTI-CAOS (PARA IAs)

> Esta seção existe porque IAs tendem a criar bagunça desorganizada.  
> Se você é uma IA lendo este arquivo: **PARE e leia esta seção INTEIRA antes de fazer qualquer coisa**.

### 0.1 PROTOCOLO DE INICIALIZAÇÃO OBRIGATÓRIO

✅ **SEMPRE fazer ao iniciar uma sessão:**

```
1. Ler /docs/README.md completo (índice de toda documentação)
2. Ler /RULES.md completo (este arquivo - TODAS as seções)
3. Executar: git status (verificar estado limpo)
4. Perguntar "O que posso fazer?" ao invés de assumir
```

❌ **NUNCA fazer sem permissão explícita:**

```
- Criar arquivos novos sem verificar se já existem
- Duplicar código fonte (.ts, .tsx, .jsx, .js)
- Criar "versões" de arquivos existentes (*-new, *-fixed, *-backup, *-old)
- Criar documentação redundante (RULES-v2.md, Ligando-novo.md, etc)
- Commitar arquivos temporários (.log, .tmp, debug*, test-*)
- Assumir que entendeu o contexto sem ler a documentação
```

**Resposta esperada ao iniciar sessão:**

```
✅ Documentação lida:
   - /docs/README.md ✓
   - /RULES.md (completo, incluindo Seção 0) ✓

✅ Estado do repositório:
   [mostrar resultado de git status]

✅ Entendi as restrições:
   - Não criar arquivos sem permissão explícita
   - Editar originais ao invés de duplicar
   - Validar com scripts/validar-regras.ps1 antes de commit

Pronto para trabalhar. O que precisamos fazer hoje?
```

---

### 0.2 REGRA ABSOLUTA: UM ARQUIVO, UM PROPÓSITO

**❌ Exemplo PROIBIDO (NUNCA FAZER):**

```
src/
  index.ts           ← Original
  index-new.ts       ← ❌ NUNCA CRIAR
  index-backup.ts    ← ❌ NUNCA CRIAR
  index-fixed.ts     ← ❌ NUNCA CRIAR
  index-old.ts       ← ❌ NUNCA CRIAR
  index.ts.bak       ← ❌ NUNCA CRIAR
```

**✅ Procedimento CORRETO:**

```
1. Verificar se arquivo existe:
   ls src/index.ts
   
2. Se existe e precisa editar:
   - Usar replace_string_in_file no ORIGINAL
   - Preservar imports e estrutura existente
   
3. Se precisa testar mudança arriscada:
   a) Criar branch git: git checkout -b test-fix-index
   b) Editar o ORIGINAL (não criar cópia)
   c) Testar
   d) Se funcionou: git checkout main && git merge test-fix-index
   e) Se quebrou: git checkout main (descarta mudanças)
```

**Por quê?**
- Duplicatas quebram builds (TypeScript compila todos .ts)
- IDEs ficam confusos (qual é o arquivo real?)
- Imports podem apontar para versão errada
- Git fica poluído com arquivos não-rastreados

---

### 0.3 REGRA ABSOLUTA: UM DOCUMENTO, UM TEMA

**Arquivos de Controle (ÚNICOS - NÃO DUPLICAR):**

```
/RULES.md                               ← Regras imutáveis (ESTE ARQUIVO)
/CHANGELOG.md                           ← Histórico de mudanças
/README.md                              ← Portal principal
/docs/01-setup/LIGANDO_MOTORES.md       ← Setup e inicialização
/docs/04-modules/anuncios/README.md     ← Controle do módulo anúncios
```

**❌ PROIBIDO criar estas variações:**

```
RULES-v2.md
RULES_FINAL.md
REGRAS_OURO.md
REGRAS_DEFINITIVAS.md
Ligando os motores novo.md
Ligando os motores corrigido.md
Ligando os motores v2.md
README-NEW.md
```

**✅ Se precisar atualizar:** EDITE O ORIGINAL usando `replace_string_in_file`

---

### 0.4 CHECKLIST PRÉ-CRIAÇÃO DE ARQUIVO

Antes de criar QUALQUER arquivo novo, responda:

```
[ ] Este arquivo já existe em algum lugar?
    → Buscar: grep -r "nome_arquivo" . ou file_search
    
[ ] Já existe documentação similar sobre este tema?
    → Verificar: ls docs/ e ler docs/README.md
    
[ ] Estou criando duplicata desnecessária?
    → Se sim: editar o existente
    
[ ] O usuário PEDIU EXPLICITAMENTE para criar novo arquivo?
    → Se não pediu: PERGUNTAR antes
    
[ ] Este arquivo será commitado? Está no .gitignore?
    → Arquivos temporários devem estar em .gitignore
    
[ ] O nome segue convenções do projeto?
    → Verificar: docs/03-conventions/CONVENTIONS.md
```

**Se qualquer resposta for inadequada: PERGUNTE ao usuário antes de criar.**

---

### 0.5 ANATOMIA DE UMA BOA CONTRIBUIÇÃO DE IA

**✅ Contribuição Limpa (EXEMPLO A SEGUIR):**

```
1. ✅ Leu /docs/README.md e /RULES.md completos
2. ✅ Executou git status (0 arquivos não rastreados antes)
3. ✅ Editou 2 arquivos existentes:
   - components/anuncio-ultimate/ListaAnuncios.tsx
   - supabase/functions/rendizy-server/routes-anuncios.ts
4. ✅ Atualizou CHANGELOG.md com Issue#
5. ✅ Criou 1 doc em /docs/07-sessions/2024-12-20/ (pasta datada)
6. ✅ Rodou scripts/validar-regras.ps1 (0 erros)
7. ✅ Propôs commit semântico: "fix(anuncios): corrige URL lista #48"
8. ✅ git status após mudanças: apenas arquivos relevantes modificados
```

**❌ Contribuição Caótica (NUNCA FAZER ASSIM):**

```
1. ❌ Não leu documentação (pulou /docs e /RULES.md)
2. ❌ Criou src/index-new.ts (duplicata de código)
3. ❌ Criou RULES-v2.md na raiz (duplicata de doc)
4. ❌ Criou FIX_URGENTE.md na raiz (não em pasta datada)
5. ❌ Criou test-debug.log (lixo temporário não-gitignored)
6. ❌ Não atualizou CHANGELOG.md
7. ❌ Commit vago: "fixed stuff"
8. ❌ git status: 15 arquivos não rastreados (bagunça)
```

---

### 0.6 PALAVRAS-CHAVE QUE DEVEM ACENDER ALERTA

**Se o usuário disser:**

| Frase do Usuário | Ação da IA |
|------------------|------------|
| "Não criar outro arquivo com esse nome" | ✅ EDITAR o existente (replace_string_in_file) |
| "Organizar a bagunça" | ✅ LER /docs primeiro, propor plano de reorganização |
| "Duplicatas" | ✅ DETECTAR e remover, NÃO criar mais |
| "Padronizar" | ✅ SEGUIR padrão existente em docs/, não inventar novo |
| "Limpar" | ✅ Mover para archive/, não deletar sem backup |

**Se você (IA) pensar em fazer:**

| Pensamento da IA | Ação Correta |
|------------------|--------------|
| "Vou criar [arquivo]-new" | ❌ PARE → Editar o original |
| "Vou fazer backup" | ❌ PARE → Usar git (branch/stash) |
| "Vou criar versão corrigida" | ❌ PARE → Substituir a errada |
| "Vou documentar isso" | ✅ OK → Em /docs/07-sessions/[DATA]/ |
| "Vou refatorar tudo" | ❌ PARE → Perguntar antes |

---

### 0.7 QUANDO CRIAR ARQUIVO NOVO É PERMITIDO

✅ **Situações autorizadas:**

```
1. Usuário pediu EXPLICITAMENTE:
   "Crie um novo componente Modal.tsx"
   
2. Arquivo genuinamente não existe:
   grep -r "Modal.tsx" . → 0 resultados
   
3. É arquivo datado por convenção:
   /docs/07-sessions/2024-12-20/RESUMO_SESSAO.md
   /docs/07-sessions/2024-12-20/FIX_DESCRICAO_v1.0.103.406.md
   
4. É arquivo temporário já no .gitignore:
   debug.log (verificar: grep "debug.log" .gitignore)
   .env.local (verificar: grep ".env.local" .gitignore)
   
5. É novo módulo/feature inexistente:
   components/novo-modulo/index.tsx (após aprovação)
```

---

### 0.8 VALIDAÇÃO AUTOMÁTICA (Obrigatória)

**Script:** `scripts/validar-regras.ps1`

**Verifica automaticamente:**
- ❌ Arquivos duplicados por basename (index.ts, index-new.ts)
- ❌ Documentos com nomes similares (RULES*, Ligando*, README*)
- ❌ Arquivos com sufixos proibidos (-new, -backup, -old, -fixed)
- ❌ Arquivos temporários não-gitignored (*.log, *.tmp não em .gitignore)
- ❌ Imports quebrados (import de arquivos que não existem)

**Uso obrigatório:**

```powershell
# ANTES de QUALQUER git add
cd "C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
.\scripts\validar-regras.ps1

# Se FALHAR: CORRIGIR problemas antes de commitar
# Se PASSAR: OK para git add e git commit
```

---

### 0.9 FLUXO DE TRABALHO APROVADO

**Template para toda sessão:**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INICIALIZAÇÃO                                            │
├─────────────────────────────────────────────────────────────┤
│ [ ] Ler /docs/README.md                                     │
│ [ ] Ler /RULES.md (todas as seções)                         │
│ [ ] git status (verificar limpeza)                          │
│ [ ] Perguntar objetivo da sessão                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PLANEJAMENTO                                             │
├─────────────────────────────────────────────────────────────┤
│ [ ] Listar arquivos que precisam ser editados              │
│ [ ] Verificar se existem (grep/file_search)                │
│ [ ] Propor mudanças ao usuário                              │
│ [ ] Aguardar confirmação                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EXECUÇÃO                                                 │
├─────────────────────────────────────────────────────────────┤
│ [ ] Editar arquivos existentes (replace_string_in_file)    │
│ [ ] Criar APENAS novos necessários (com permissão)         │
│ [ ] Atualizar CHANGELOG.md                                  │
│ [ ] Criar doc em /docs/07-sessions/[DATA]/ se relevante    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDAÇÃO                                                │
├─────────────────────────────────────────────────────────────┤
│ [ ] Rodar scripts/validar-regras.ps1                        │
│ [ ] Verificar git status (apenas arquivos relevantes)      │
│ [ ] Propor mensagem de commit semântica                     │
│ [ ] Aguardar aprovação para commit                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 0.10 RESUMO EXECUTIVO PARA IAs

**3 Comandos ao Iniciar TODA Sessão:**

```bash
# 1. Ler documentação (OBRIGATÓRIO)
cat docs/README.md
cat RULES.md

# 2. Verificar estado limpo (OBRIGATÓRIO)
git status

# 3. Perguntar antes de agir (OBRIGATÓRIO)
# "Li a documentação. O que precisamos fazer hoje?"
```

**Regra de Ouro Universal:**

> **"QUANDO EM DÚVIDA: PERGUNTE."**
> 
> Melhor perder 30 segundos perguntando  
> do que criar 30 minutos de limpeza de bagunça.

---

## 4. IMPORTAÇÃO STAYSNET (ANÚNCIOS ULTIMATE)

### 4.1 Destino correto de dados

```
✅ SEMPRE: anuncios_ultimate
❌ NUNCA: properties / tabelas legadas
```

### 4.2 Deduplicação (regra de ouro)

- Nunca duplicar anúncio. Se houver ID externo, atualizar; se não houver, criar.
- Chave primária de dedup: `data.externalIds.stays_property_id` (ID do Stays). Fallback legado: `stays_net_id`.
- Index/constraint: índice único parcial em `stays_property_id` (migration 20251221_unique_stays_property_id.sql).
- Full sync/import deve:
  - Preencher sempre `externalIds.stays_property_id` (e manter `stays_net_id` como legado).
  - Buscar existentes por `stays_property_id`, fallback `stays_net_id` e, em último caso, global (todas as orgs) para evitar duplicar.
  - Usar o ID Rendizy imutável (coluna `id`) como chave do anúncio; nunca sobrescrever/alterar esse valor.

### 4.3 Hóspedes e Reservas (não duplicar)

- Hóspedes: não inserir se já existir email ou documento (CPF/passaporte) na organização; atualizar em vez de criar.
- Reservas: não inserir se bookingId/externalId já existir; atualizar em vez de criar.

### 4.4 Regra geral para integrações (PMS/OTAs/marketplaces)

- Antes de qualquer fluxo de importação, mapear o ID externo primário de imóvel (ex.: `stays_property_id`, `airbnb_listing_id`, `booking_property_id`) como primeiro campo obrigatório; sem isso não há dedup segura.
- Para imóveis, campos mínimos obrigatórios: `externalIds.<plataforma>_property_id` + nome interno (para conferência humana/logs). O ID Rendizy permanece imutável e não depende de integrações.
- Para hóspedes: capturar `email` e/ou documento (CPF/passaporte) como chaves de dedup da organização; se o PMS expõe um guest_id externo, armazenar também em `externalIds` para futura reconciliação.
- Para reservas: armazenar `bookingId`/`externalId` da plataforma como chave única de dedup; nunca criar reserva sem esse identificador externo quando a plataforma o fornece.
- Se a plataforma não fornece ID estável, registrar explicitamente no requisito de integração que não há dedup garantida e requerer intervenção/manual ou critério secundário (nome+datas) com alto risco.
    // Precificação
    basePrice: number,         // Preço base por noite
    cleaningFee?: number,
    currency: 'BRL' | 'USD',
    
    // Mídia
    photos: string[],          // URLs das fotos
    coverPhoto?: string,       // URL da foto de capa
    
    // IDs externos (deduplicação)
    externalIds: {
      stays_net_id?: string,   // ID do Stays.net (para deduplição)
      airbnb_id?: string,
      booking_com_id?: string
    },
    
    // Metadados
    migrated_from?: 'properties',  // Flag histórica
    imported_at?: string,          // ISO timestamp de importação
    last_sync?: string             // Última sincronização
  }
}
```

**Regra:** Sempre validar estrutura JSONB antes de salvar (usar zod ou similar).

---

### 1.3 Campos Obrigatórios vs Opcionais

**Mínimo para criar anúncio (draft):**
```typescript
{
  title: string,              // ✅ Obrigatório
  status: 'draft',            // ✅ Obrigatório
  data: {
    propertyType: string,     // ✅ Obrigatório
    name: string              // ✅ Obrigatório
  }
}
```

**Para anúncio ativo (publicável):**
```typescript
{
  title: string,
  status: 'active',
  completion_percentage: 100,  // ✅ Deve ser 100%
  data: {
    propertyType: string,
    name: string,
    address: string,           // ✅ Obrigatório para active
    bedrooms: number,          // ✅ Obrigatório para active
    bathrooms: number,         // ✅ Obrigatório para active
    basePrice: number,         // ✅ Obrigatório para active
    photos: string[]           // ✅ Pelo menos 1 foto
  }
}
```

---

## 2. ROTAS E ENDPOINTS

### 2.1 Padrão de URLs (Edge Functions)

```
✅ CORRETO: /functions/v1/rendizy-server/{endpoint}
❌ ERRADO: /make-server-67caf26a/{endpoint}
❌ ERRADO: /server/{endpoint}
❌ ERRADO: /api/{endpoint}
```

**Por quê?**
- `/functions/v1/` é padrão Supabase para Edge Functions
- `rendizy-server` é nome da nossa function principal
- Prefixos como `/make-server-*` eram de deploys antigos (Issue #49)

**Referência:** Issue #49 (URL incorreta causava 404)

---

### 2.2 Endpoints Aprovados

### ✅ Regra: URL canônica (Anúncios Ultimate)

- **Canônico:** `/functions/v1/rendizy-server/anuncios-ultimate/*`
- **Regra (Supabase Edge Functions):** o `pathname` recebido pelo Hono inclui o nome da function como prefixo. Portanto, dentro do `index.ts`, o módulo `anunciosApp` deve ser montado em `/rendizy-server/anuncios-ultimate/*`.
- **Proibido (clientes/scripts):** chamar com prefixo duplicado (`/functions/v1/rendizy-server/rendizy-server/anuncios-ultimate/*`).
  - Motivo: isso incentiva caminhos “duplos” e pode gerar URLs confusas do tipo `.../functions/v1/rendizy-server/rendizy-server/...`.
  - Como o ambiente é 100% testes hoje, manteremos **um único padrão** para evitar dívida técnica.

```typescript
// Backend (Edge Functions)
/functions/v1/rendizy-server/anuncios-ultimate/lista
/functions/v1/rendizy-server/anuncios-ultimate/save-field
/functions/v1/rendizy-server/anuncios-ultimate/delete
/functions/v1/rendizy-server/staysnet/full-sync
/functions/v1/rendizy-server/staysnet/test-connection
/functions/v1/rendizy-server/reservations/create
/functions/v1/rendizy-server/reservations/update
/functions/v1/rendizy-server/blocks/create

// Frontend (rotas React Router)
/rendizy-server/anuncios-ultimate
/rendizy-server/anuncios-ultimate/lista
/calendario
/reservas
/configuracoes
```

**Regra:** Nunca criar endpoint sem documentar em `/docs/05-operations/API.md`

---

## 3. AUTENTICAÇÃO

### 3.1 Separação por Contexto

```
✅ Edge Functions: X-Auth-Token (do localStorage)
✅ REST API direta: apikey + Authorization Bearer (via supabase client)
❌ NUNCA misturar: X-Auth-Token em REST API
❌ NUNCA misturar: Authorization Bearer em Edge Functions personalizadas
```

**Por quê?**
- Edge Functions têm middleware que extrai `organization_id` via `X-Auth-Token`
- REST API usa RLS (Row Level Security) com `auth.uid()` do token Bearer
- Misturar = Issue #48 (lista retornava apenas 2 registros)

**Referência:** Issue #48 (REST API sem org context bloqueada por RLS)

---

### 3.2 Exemplos de Código Correto

**✅ CORRETO - Chamada para Edge Function:**

```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/rendizy-server/anuncios-ultimate/lista`,
  {
    headers: {
      'X-Auth-Token': localStorage.getItem('sb-access-token'),
      'Content-Type': 'application/json'
    }
  }
);
```

**✅ CORRETO - Chamada REST API direta via Supabase Client:**

```typescript
const { data, error } = await supabase
  .from('anuncios_drafts')
  .select('*')
  .eq('status', 'active');
// RLS aplica automaticamente: WHERE organization_id = auth.organization_id()
```

**❌ ERRADO - Mistura de autenticação:**

```typescript
// ❌ NUNCA fazer isso
const response = await fetch(
  `${supabaseUrl}/functions/v1/rendizy-server/anuncios-ultimate/lista`,
  {
    headers: {
      'Authorization': `Bearer ${token}`, // ❌ Errado para Edge Function custom
      'apikey': apikey                     // ❌ Desnecessário
    }
  }
);
```

---

## 4. IMPORTAÇÃO STAYSNET

### 4.1 Destino Correto de Dados

```
✅ SEMPRE: anuncios_drafts
❌ NUNCA: properties (era bug antigo - Issue #47)
```

**Arquivo responsável:**
`supabase/functions/rendizy-server/staysnet-full-sync.ts` (linhas 323-379)

**Verificação antes de modificar:**
```typescript
// ✅ Código correto (verificar se está assim)
await supabase
  .from('anuncios_drafts')  // ✅ Tabela correta
  .insert({
    title: property.name,
    data: {
      externalIds: {
        stays_net_id: property.id  // ✅ Para deduplicação
      },
      ...propertyData
    }
  });
```

---

### 4.2 Deduplicação via External ID

```typescript
// ✅ CORRETO - Verificar antes de inserir
const { data: existing } = await supabase
  .from('anuncios_drafts')
  .select('id')
  .eq('data->>externalIds->>stays_net_id', staysNetId)
  .single();

if (existing) {
  // Atualizar existente
  await supabase
    .from('anuncios_drafts')
    .update({ data: newData })
    .eq('id', existing.id);
} else {
  // Inserir novo
  await supabase
    .from('anuncios_drafts')
    .insert({ data: newData });
}
```

**❌ ERRADO - Usar campos mutáveis:**

```typescript
// ❌ NUNCA usar 'code' ou 'name' para deduplição
.eq('data->>code', code)  // ❌ Code pode mudar
.eq('title', name)        // ❌ Name pode mudar
```

---

### 4.3 Persistência RAW Completa (OBRIGATÓRIA)

**Regra de negócio (não negociável):** tudo que a Stays retornar deve ser persistido como **JSON completo** no banco para auditoria e reprocessamento.

✅ **Fonte de verdade:** tabela `staysnet_raw_objects` (versionada por hash)

- Migration: `supabase/migrations/20251227_create_staysnet_raw_objects.sql`
- Helper único (não duplicar): `supabase/functions/rendizy-server/utils-staysnet-raw-store.ts`

**Regras de implementação:**

1) ✅ Sempre gravar RAW ao importar
  - Reservations: `import-staysnet-reservations.ts` → domain `reservations`
  - Guests/Clients: `import-staysnet-guests.ts` → domain `clients` via `/booking/clients/{clientId}`
  - Listings/Properties: `import-staysnet-properties.ts` → domain `listings`
  - Finance: `import-staysnet-finance.ts` → domain `finance`

2) ✅ Nunca depender de `external_id = NULL`
  - UNIQUE no Postgres não deduplica NULLs.
  - O helper `storeStaysnetRawObject` converte `external_id` ausente em um valor sintético estável (baseado no endpoint).

3) ✅ RAW não pode quebrar import
  - Se a migration/tabela ainda não existe em produção, o import deve continuar (logar warning).

4) ✅ Tabela de domínio continua “flat” (performance)
  - `reservations`, `guests`, `anuncios_ultimate` ficam com campos normalizados.
  - O RAW completo fica em `staysnet_raw_objects` para auditoria, replay, e backfill.

**Documentação da arquitetura:** ver `docs/architecture/STAYSNET_RAW_OBJECT_STORE.md`.

---

### 4.4 Regra Canônica — Identidade de Reservas (Multi‑Canal)

✅ Documento oficial (não duplicar): `docs/03-conventions/REGRA_IDENTIDADE_RESERVAS.md`

---

### 4.5 Import Issues (NUNCA SKIP silencioso)

**Regra de integridade (não negociável):**

- ✅ `reservations.property_id` precisa existir em `anuncios_ultimate` (mesma org).
- ✅ Se não conseguir resolver o imóvel durante o import Stays.net: **SKIP** da reserva (não criar placeholder).
- ✅ Porém, é obrigatório persistir o motivo como issue durável em `staysnet_import_issues` (ex: `missing_property_mapping`).

Objetivo: evitar “sumir 1 reserva” e permitir reprocessamento depois que o imóvel/mapping existir.

**Fonte canônica:** `docs/04-modules/STAYSNET_IMPORT_ISSUES.md`

**Arquivos-chave (modular):**
- `supabase/functions/rendizy-server/import-staysnet-reservations.ts` (gera/resolve issues)
- `supabase/functions/rendizy-server/import-staysnet-issues.ts` (lista issues)
- `components/StaysNetIntegration/services/staysnet.service.ts` (UI lista issues + compat 404)

**Migration:** `supabase/migrations/20251230_create_staysnet_import_issues.sql`

---

## 5. MIGRAÇÕES E DUPLICATAS

### 5.1 Preservar IDs Originais

```
✅ Ao migrar: MANTER UUID original (preserva FK com reservations/blocks)
❌ Gerar novo UUID: QUEBRA relações existentes
```

**Exemplo correto de migração:**

```typescript
// ✅ Preservar ID original
await supabase
  .from('anuncios_drafts')
  .insert({
    id: originalProperty.id,  // ✅ Mesmo UUID
    title: originalProperty.name,
    data: {
      ...originalProperty,
      migrated_from: 'properties'  // ✅ Flag histórica
    }
  });
```

---

### 5.2 Anúncios de Teste Protegidos

```
IDs com reservas/bloqueios vinculados (NÃO DELETAR):
- 3cabf06d-51c6-4e2b-b73e-520e018f1fce (teste 30 02)
- 9f6cad48-42e9-4ed5-b766-82127a62dce2 (Dona Rosa Botafogo ap 01)
```

**Verificação obrigatória antes de deletar:**

```sql
-- Verificar se tem reservas
SELECT COUNT(*) FROM reservations WHERE property_id = '{UUID}';

-- Verificar se tem bloqueios
SELECT COUNT(*) FROM blocks WHERE property_id = '{UUID}';

-- Se COUNT > 0: NÃO DELETAR
```

---

## 6. COMMITS E DOCUMENTAÇÃO

### 6.1 Protocolo Obrigatório de Commit

```bash
# 1. Validar ANTES de adicionar arquivos
.\scripts\validar-regras.ps1

# 2. Adicionar arquivos relevantes
git add [arquivos específicos]

# 3. Atualizar CHANGELOG.md com Issue#
git add CHANGELOG.md

# 4. Commit semântico (padrão Conventional Commits)
git commit -m "fix(anuncios): corrige URL lista v1.0.103.404

- Issue #48: Lista retornava apenas 2 registros
- Problema: REST API direta sem org context
- Solução: Edge Function com X-Auth-Token
- Arquivos: components/anuncio-ultimate/ListaAnuncios.tsx (linha 73)
- Testado: ✅ Lista agora retorna 159 anúncios"
```

---

### 6.2 Formato de Mensagem de Commit

**Padrão:** `<tipo>(<escopo>): <descrição curta> <versão>`

**Tipos permitidos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Apenas documentação
- `refactor`: Refatoração sem mudar comportamento
- `test`: Adição/correção de testes
- `chore`: Tarefas de manutenção

**Escopos comuns:**
- `anuncios`, `staysnet`, `calendario`, `reservas`, `auth`, `database`

**Exemplo completo:**
```
fix(anuncios): corrige deduplicação StaysNet v1.0.103.403

- Issue #47: Importação salvava em properties (tabela errada)
- Correção: Agora salva em anuncios_drafts
- Deduplicação: Usa data->externalIds->stays_net_id
- Arquivo: supabase/functions/rendizy-server/staysnet-full-sync.ts
- Testado: Importação de 5 propriedades sem duplicatas
```

---

### 6.3 Documentar Correções Importantes

**Padrão:** Criar arquivo em `/docs/07-sessions/[DATA]/`

```
docs/
  07-sessions/
    2024-12-20/
      FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md
      FIX_MIGRACAO_PROPERTIES_v1.0.103.405.md
      FIX_STAYSNET_TARGET_v1.0.103.403.md
      RESUMO_SESSAO_20_12_2024.md
```

**Conteúdo obrigatório do doc de fix:**
- Issue # referenciado
- Problema detalhado
- Causa raiz
- Solução aplicada
- Arquivos modificados (com linhas)
- Testes realizados
- Impacto (o que muda para usuário/dev)

---

## 7. ARQUITETURA DE CÁPSULAS

### 7.1 Conceito de Cápsula

**Cápsula** = Módulo completamente isolado

```
Cada cápsula contém:
- UI components (React)
- Business logic (hooks, contexts)
- API services (fetch, supabase)
- Types (TypeScript interfaces)
- Styles (Tailwind classes)
```

**Exemplo:**

```
components/
  anuncio-ultimate/           ← Cápsula "Anúncios Ultimate"
    ListaAnuncios.tsx         ← UI principal
    FormularioAnuncio.tsx     ← Formulário
    useAnuncios.ts            ← Hook de lógica
    anunciosService.ts        ← API calls
    types.ts                  ← Tipos TypeScript
    index.ts                  ← Export barrel
```

**Ver:** `/docs/02-architecture/ARQUITETURA_CAPSULAS_MODULOS.md`

---

### 7.2 Independência entre Cápsulas

```
✅ Cápsula se auto-contém (tudo dentro da pasta)
✅ Imports de utils globais permitidos (utils/, contexts/ globais)
❌ Dependências cruzadas entre cápsulas (importar de outra cápsula)
```

**❌ Exemplo PROIBIDO:**

```typescript
// ❌ NUNCA importar de outra cápsula
import { ListaAnuncios } from '@/components/anuncio-ultimate/ListaAnuncios';
// Dentro de components/calendario/
```

**✅ Exemplo CORRETO:**

```typescript
// ✅ Import de utilitário global
import { formatDate } from '@/utils/dateUtils';

// ✅ Import de context global
import { useAuth } from '@/contexts/AuthContext';

// ✅ Import dentro da própria cápsula
import { useAnuncios } from './useAnuncios';
```

---

## 8. COMANDOS CRÍTICOS

### 8.1 Desenvolvimento

```powershell
# Iniciar servidor dev
npm run dev  # Porta 3001

# Validar antes de commit (OBRIGATÓRIO)
.\scripts\validar-regras.ps1

# Verificar anúncios no banco
.\scripts\contar-anuncios.ps1

# Detectar duplicatas
.\scripts\detectar-duplicatas.ps1

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

### 8.2 Git

```bash
# Ver últimos commits
git log --oneline -10

# Status atual (verificar antes de commitar)
git status

# Ver diferenças específicas
git diff CHANGELOG.md
git diff src/App.tsx

# Criar branch para teste
git checkout -b test-feature-xyz

# Descartar mudanças locais
git checkout -- arquivo.ts
```

#### 8.2.1 Política de branches (PADRÃO ÚNICO)

✅ **Regra:** o branch de produção é **sempre** o `main`.

- O Vercel deve estar configurado para build/deploy **somente** do `main` (Production Branch = `main`).
- Branches de trabalho são temporários: `feat/*`, `fix/*`, `chore/*` (ou `test-*`), e **sempre** voltam para o `main` via merge.
- Após merge validado, o branch temporário pode ser apagado.

✅ **Regra:** não manter “2 branches principais” (ex.: `main` e `final-clean`) rodando em paralelo.
Isso causa exatamente o problema clássico: *localhost ≠ produção* porque produção está buildando outro branch.

#### 8.2.2 Como alinhar o `main` com um branch temporário

✅ **Procedimento recomendado (seguro e auditável):** merge do branch no `main`.

```bash
git checkout main
git pull
git merge <branch-temporario>
git push
```

⚠️ **Procedimento excepcional (só com permissão explícita):** forçar o `main` a ficar idêntico ao branch.

```bash
git checkout main
git reset --hard <branch-temporario>
git push --force-with-lease
```

---

### 8.3 Supabase

```bash
# Deploy Edge Function
supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Ver logs em tempo real
supabase functions logs rendizy-server --follow

# Executar SQL via CLI
supabase db execute --file script.sql

# Acessar SQL Editor web
# https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/editor
```

---

## 9. VERIFICAÇÕES SQL

### 9.1 Consultas de Validação

```sql
-- Total de anúncios (esperado: 159)
SELECT COUNT(*) FROM anuncios_drafts;

-- Verificar duplicatas por título (esperado: 0 rows)
SELECT title, COUNT(*) 
FROM anuncios_drafts 
GROUP BY title 
HAVING COUNT(*) > 1;

-- Anúncios com reservas vinculadas (PROTEGIDOS)
SELECT 
  a.id, 
  a.title, 
  COUNT(r.id) as total_reservas
FROM anuncios_drafts a
LEFT JOIN reservations r ON r.property_id = a.id
GROUP BY a.id, a.title
HAVING COUNT(r.id) > 0
ORDER BY total_reservas DESC;

-- Anúncios importados do StaysNet
SELECT 
  id, 
  title, 
  data->'externalIds'->>'stays_net_id' as stays_net_id
FROM anuncios_drafts
WHERE data->'externalIds'->>'stays_net_id' IS NOT NULL;

-- Anúncios migrados de properties
SELECT 
  id, 
  title, 
  data->>'migrated_from' as origem
FROM anuncios_drafts
WHERE data->>'migrated_from' = 'properties';
```

---

## 10. LIÇÕES APRENDIDAS (NÃO REPETIR)

| ❌ Erro Cometido | ✅ Solução Permanente | Issue# | Data |
|------------------|----------------------|--------|------|
| StaysNet salvava em `properties` | SEMPRE usar `anuncios_drafts` | #47 | 19/12/2024 |
| REST API sem org context | Edge Functions com `X-Auth-Token` | #48 | 19/12/2024 |
| URL com prefixo `/make-server-*` | Padrão `/functions/v1/rendizy-server/` | #49 | 20/12/2024 |
| Deduplicação por `code` (mutável) | Usar `externalIds->stays_net_id` | #47 | 19/12/2024 |
| Deletar anúncios sem verificar | Sempre checar FK (reservas/bloqueios) | - | 20/12/2024 |
| Gerar novo UUID na migração | Preservar ID original (manter FKs) | - | 20/12/2024 |
| Parser errors (emojis em .ps1) | ASCII encoding, sem caracteres especiais | - | 20/12/2024 |
| 157 anúncios invisíveis | Migração `properties` → `anuncios_drafts` | #49 | 20/12/2024 |

---

## 🆘 EM CASO DE DÚVIDA

**Fluxo de decisão:**

```
1. Dúvida sobre REGRA → Ler seção relevante deste arquivo (1 min)
2. Dúvida sobre IMPLEMENTAÇÃO → Consultar /docs/README.md (índice)
3. Dúvida sobre ARQUIVO → Buscar em /docs/04-modules/[modulo]/
4. Ainda em dúvida → PERGUNTAR ao usuário (descrever o que vai fazer)
```

**Nunca:**
- ❌ Assumir que entendeu sem ler
- ❌ Criar arquivo "só para testar"
- ❌ "Tentar algo rápido" sem validação

**Sempre:**
- ✅ Ler documentação primeiro
- ✅ Perguntar se não tem certeza
- ✅ Validar antes de commitar

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- **Setup inicial:** `/docs/01-setup/LIGANDO_MOTORES.md`
- **Arquitetura:** `/docs/02-architecture/`
- **Convenções:** `/docs/03-conventions/CONVENTIONS.md`
- **Módulos:** `/docs/04-modules/`
- **Operações:** `/docs/05-operations/`
- **Troubleshooting:** `/docs/06-troubleshooting/`
- **Histórico:** `/docs/07-sessions/`

**Índice completo:** `/docs/README.md`

---

## ⚡ PRÓXIMOS PASSOS

Se você leu até aqui e é uma IA:

1. ✅ Marcar "Li RULES.md completo" na sua resposta
2. ✅ Executar `git status` e mostrar resultado
3. ✅ Ler `/docs/README.md` para entender estrutura
4. ✅ Perguntar: "O que precisamos fazer hoje?"

**Não pule estas etapas. Elas previnem 90% dos problemas.**

---

**Fim do documento RULES.md**  
Este é o arquivo de referência definitivo para regras imutáveis do projeto.
