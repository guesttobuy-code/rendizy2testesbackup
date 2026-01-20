# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.112] - 2026-01-17

### Added
- 🛡️ **Catalog v6.7 - Anti-Patterns Checklist**: Sistema para cercar erros comuns de IAs
  - `ANTI_PATTERNS_CHECKLIST`: 12 anti-patterns documentados (calendário, checkout, estrutura)
  - `generateAntiPatternsSection()`: Gera seção no prompt automaticamente
  - `validateAgainstAntiPatterns()`: Valida código contra anti-patterns
  - Severidades: CRITICAL, HIGH, MEDIUM
  - Anti-patterns incluem: bloquear datas passadas, checkout em nova aba, proibir supabase-js

- 🔧 **Vercel CLI Automation**: Credenciais e IDs de projeto salvos de forma sustentável
  - `_rendizy-creds.local.ps1`: Agora inclui `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_*`
  - Scripts podem triggerar deploy via API da Vercel
  - Documentado uso de `forceNew=1` para limpar cache

### Fixed
- 📅 **Suacasamobiliada - Calendário**: Datas passadas agora ficam bloqueadas
  - `DateRangePicker.tsx`: Adicionado `isPast()` do date-fns
  - Visual: datas passadas ficam acinzentadas (opacity 50%)
  - Deploy: `dpl_4r6yYBGRMBdyFAVWXXw31kDBrsN5` → READY

### Documentation
- 📚 Atualizado `docs/04-modules/SITES_DOS_CLIENTES.md` com seção do Catalog v6.7
- 📚 Criado `docs/changelogs/CHANGELOG_V1.0.104.003_CATALOG_V6.7.md`

---

## [1.0.111] - 2026-01-10

### Added
- 🔄 **StaysNet Properties Sync Cron**: Sincronização automática de propriedades 2x/dia
  - Edge Function `staysnet-properties-sync-cron` para detectar e importar novas propriedades
  - Tabela `staysnet_sync_log` para registrar execuções do cron
  - Documentação completa em `docs/04-modules/STAYSNET_PROPERTIES_SYNC.md`
  - Horários: 08:00 e 20:00 BRT via pg_cron
  - **Problema resolvido**: Stays.net NÃO envia webhook quando nova propriedade é criada

- 🔧 **StaysNet Webhook Resilience**: Auto-fetch e import_issue obrigatório
  - `utils-staysnet-auto-fetch-property.ts`: Baixa propriedade da API Stays quando não existe
  - `utils-staysnet-import-issues.ts`: Módulo compartilhado para registrar/resolver issues
  - Webhook processor agora tenta auto-fetch antes de dar skip
  - Import_issue SEMPRE registrado quando não consegue resolver propriedade
  - Import_issue resolvido automaticamente após sucesso no upsert

### Fixed
- 🐛 **Reserva FE37J**: Identificada causa raiz e implementada correção
  - Webhook chegou corretamente mas property lookup falhou
  - Nenhum import_issue foi registrado (bug de rastreabilidade)
  - Correção garante auditoria completa de falhas

---

## [Unreleased]

### Added
- Sistema de documentação estruturado (`docs/README_DOCUMENTACAO.md`)
- Template de log de desenvolvimento (`docs/DEV_LOG_TEMPLATE.md`)
- Protocolo de inicialização para IAs no SETUP_COMPLETO.md
- Workflow profissional com scripts PowerShell
- Documentação operacional completa (`docs/operations/`)
- Documentação do módulo Sites dos Clientes (`docs/04-modules/SITES_DOS_CLIENTES.md`)
- Cápsula do módulo Sites dos Clientes (`components/client-sites/ClientSitesModule.tsx`)
- Tela **Minha Conta** (`/minha-conta`) para identificar usuário/org/sessão
- Validação WhatsApp (Evolution): mapa e script de probe em produção (`docs/05-operations/`)
- `calendarApi.getBlocks()` - Busca bloqueios do backend
- Hook `useCalendarData` agora carrega bloqueios reais do banco
- Campo `external_ids` (JSONB) na tabela `properties` para rastreamento de IDs externos
- StaysNet: persistência do payload bruto da reserva em `reservations.staysnet_raw` (auditoria e reprocessamento)
- StaysNet: tabela genérica `staysnet_raw_objects` para persistir payloads completos (reservas/clients/finance/listings) com deduplicação por hash
- StaysNet: helper `utils-staysnet-raw-store.ts` para gravar payloads com SHA-256 e não quebrar import em caso de falha de persistência de RAW
- StaysNet: script de auditoria `scripts/audit-staysnet-raw-coverage.ps1` para medir cobertura de campos RAW por amostragem (prova de conformidade)
- StaysNet: guests import enriquecido com `/booking/clients/{clientId}` para salvar JSON completo de client (domain `clients`)
- StaysNet: listings/properties também persistidos em `staysnet_raw_objects` (domain `listings`)
- StaysNet: endpoint `POST /staysnet/import/finance` para capturar RAW financeiro (payment-providers + owners) em `staysnet_raw_objects` (domain `finance`)
- StaysNet: helper RAW agora cria `external_id` sintético quando ausente (dedupe correto em endpoints de lista)
- StaysNet: automação via webhook público + fila + processador/cron (sem depender de import manual)
- StaysNet: endpoint de backfill para recalcular/vincular dados de reservas antigas (pricing e dados de hóspede)
- StaysNet: tabela `staysnet_import_issues` para persistir falhas duráveis de import (ex: `missing_property_mapping`)
- StaysNet: endpoint `GET /staysnet/import/issues` para listar issues e permitir auditoria/reprocessamento
- StaysNet: UI do modal lista issues; 404 do endpoint é tratado como “redeploy pendente” (compat)
- StaysNet: reprocessamento “targeted reimport” por `listing_id` (sem criar placeholder de imóvel)
- StaysNet: script `scripts/run-reprocess-staysnet-orphan-issue.ps1` para smoke test E2E (listar → reimport → validar resolução)
- Sidebar: busca global expandida para reservas/hóspedes/imóveis com deep-link

### Fixed
- 🔒 **Sites dos Clientes: encapsulamento do módulo em cápsula**
  - Rota `/sites-clientes` agora usa `ClientSitesModule` (evita JSX grande em `App.tsx`)
  - Mantém o mesmo layout (sidebar + container) com melhor isolamento
- 👤 **Identificação do usuário logado**
  - Menu do perfil agora navega para `/minha-conta`
  - Remove placeholder de master user e usa flags reais do `AuthContext`
- 🔴 **Env falta VITE_SUPABASE_ANON_KEY em build do Vercel**
  - `utils/supabase/info.tsx`: adiciona guard com erro explícito quando a key não está configurada
  - `services/authService.ts`: remove log que imprimia a chave completa; mantém only status configurada/faltando
  - Evita crash "supabaseKey is required" e protege a key nos consoles de produção

- 🔴 **Vercel build: erro `resolveSync() method is not implemented` / falha ao carregar `vite.config.ts`**
  - Causa raiz: script `build` fazia preload via `node --require ./scripts/setup-crypto.js`, mas o arquivo é ESM (usa `import`), disparando caminho CJS→ESM que quebra no Node 22
  - Corrigido: preload ESM agora usa `node --import ./scripts/setup-crypto.js`
  - Tailwind v4: removido `postcss.config.*` e migração para plugin `@tailwindcss/vite` no Vite (evita carregamento de PostCSS config no build)
  - Lockfile atualizado para garantir instalação de `@tailwindcss/vite` no Vercel

- 🟡 **Workflow/Deploy: padronização de branch único em produção (main)**
  - Política documentada em `RULES.md`: produção = `main`, branches temporários voltam via merge
  - Reduz risco de divergência `localhost ≠ produção` quando o Vercel está configurado para buildar outro branch
  - Ação operacional: garantir Vercel Production Branch = `main`
  - Rotas: manter URL canônica `/functions/v1/rendizy-server/*` e tratar qualquer `/make-server-*` apenas como legado/compat temporária

- 🟡 **Precificação: migração de “permanência” → “pacotes de dias” (UI)**
  - Wizard: step de precificação individual agora edita descontos via pacotes (weekly/monthly/custom) usando `DiscountPackagesEditor`
  - Compat: mapeia dados legados (weekly/monthly) para regras (7/28 noites) ao carregar
  - Doc canônica: `docs/04-modules/PRICING_DISCOUNT_PACKAGES.md`
- 🔴 **Issue #42**: Calendário com datas hardcoded (outubro→dezembro)
  - `contexts/CalendarContext.tsx` linhas 81-84
  - `dateRange.from` agora usa `new Date()` (data atual)
  - `dateRange.to` agora usa data atual + 30 dias
  - Calendário exibe mês correto automaticamente
- 🔴 **Issue #43**: ReservationCard quebrava com price undefined
  - `components/ReservationCard.tsx` linha 204
  - Adicionada validação `reservation.price != null`
  - Conversão explícita `Number(reservation.price).toFixed(2)`
- 🔴 **Issue #44**: Bloqueios não apareciam no calendário
  - `hooks/useCalendarData.ts` agora busca bloqueios via API
  - Filtro por `property_id`, `start_date`, `end_date`
  - Cache de 3 minutos (React Query)
  - Bloqueios exibidos como cards laranjas no calendário
- 🟡 **Issue #45**: StaysNet importação criava duplicatas após mudança de código
  - `supabase/functions/rendizy-server/staysnet-full-sync.ts` linhas 257, 321-340
  - Deduplicação agora usa `external_ids.stays_net_id` ao invés de `code`
  - Propriedades rastreadas por ID original do Stays.net
  - Importações idempotentes (UPDATE se existir, INSERT se novo)
  - Migration: `20241220_add_external_ids_to_properties.sql`
- 🔴 **Issue #46**: StaysNet configuração retornava 401/Invalid JWT
  - Frontend envia apenas `X-Auth-Token` (removido `Authorization: Bearer`)
  - Edge Function redeployada (20/12/2024) com validação `getOrganizationIdOrThrow`
  - Configuração lida da tabela `staysnet_config` (apiKey/apiSecret/baseUrl)
  - Documento: `⚡_FIX_STAYSNET_AUTH_HEADER_v1.0.103.502.md`
- 🔴 **Issue #47**: StaysNet exportava anúncios para wizard antigo (properties) ao invés de Anúncios Ultimate
  - `supabase/functions/rendizy-server/staysnet-full-sync.ts` linha ~320
  - Mudança de tabela: `properties` (abandonado) → `properties` (oficial; tabela única)
- 🔴 **Issue #48**: ListaAnuncios retornava apenas 2 anúncios ao invés de 159
  - `components/anuncio-ultimate/ListaAnuncios.tsx` linha 69
  - Frontend mudou de REST API direta → Edge Function `/anuncios-ultimate/lista`
  - Adiciona header `X-Auth-Token` para aplicar RLS corretamente
  - Agora retorna TODOS os anúncios da organização (filtrado via token)
  - Documento: `⚡_FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md`
- 🔴 **Issue #49**: URL incorreta em ListaAnuncios + 157 anúncios invisíveis em tabela antiga ✅ RESOLVIDO
  - `components/anuncio-ultimate/ListaAnuncios.tsx` linha 73
  - **Problema 1 (URL)**: Removido prefixo incorreto `/make-server-67caf26a/` da URL
  - URL corrigida: `/functions/v1/rendizy-server/anuncios-ultimate/lista` (sem prefixo)
  - **Problema 2 (Dados)**: 157 anúncios em `properties` (tabela antiga) não apareciam
  - **Solução**: Criado script `migrar-properties-para-anuncios.ps1`
  - Migra `properties` → `properties` preservando IDs originais
  - Converte estrutura para JSONB (estrutura do módulo anúncios): `properties.name` → campo de título dentro do registro + `data`
  - Status padrão: `"draft"`, completion: 50%
  - Metadados: `migrated_from: "properties"`, `migrated_at: timestamp`
  - **RESULTADO**: 159 anúncios migrados com sucesso (0 erros)
  - Total na lista: 161 anúncios (2 originais + 159 migrados)
  - Script auxiliar: `contar-anuncios.ps1` para verificação
  - Verificado: StaysNet agora exporta corretamente para `properties` (Issue #47)
  - Documento: `⚡_FIX_MIGRACAO_PROPERTIES_v1.0.103.405.md`
  - Estrutura adaptada: campos SQL → campo JSONB `data` flexível
  - Anúncios importados agora aparecem em `/anuncios-ultimate/lista`
  - Query de deduplicação: `contains('data', { externalIds: { stays_net_id } })`
  - Documento: `⚡_FIX_STAYSNET_TARGET_properties_v1.0.103.403.md`
- 🔴 **Issue #48**: Lista Anúncios Ultimate retornava apenas 2 registros ao invés de 159
- 🔴 **Issue #50**: Lista de reservas não carregava (500) mesmo com dados no banco
  - Causa raiz: rotas de `/reservations` estavam sem `tenancyMiddleware`, gerando `TenantContext não encontrado`

- 🔒 **Multi-tenant (Anúncios Ultimate): remover uso de tabela legada**
  - `supabase/functions/rendizy-server/routes-anuncios.ts`: rotas `GET /:id`, `POST /create`, `PATCH /:id`, `DELETE /:id` agora usam somente `properties`
  - Mantém filtro obrigatório por `organization_id` (isolamento de tenants) e valida UUID em rotas por `:id`
  - Documento canônico: `docs/03-conventions/MULTI_TENANCY_CANONICAL.md`
  - `supabase/functions/rendizy-server/index.ts`: aplicado `tenancyMiddleware` em GET/POST/PUT/DELETE de reservas
  - Nota de teste: Edge Gateway exige `Authorization: Bearer <anonKey>` e o token de sessão real em `X-Auth-Token`
  - Segurança: removida rota local de reimportação e referência a arquivo não versionado (evita risco de credenciais hardcoded)
  - Frontend: filtro por propriedade não descarta reservas com `propertyId` desconhecido (corrige cenário: contador mostra 100, mas lista ficava vazia)
  - `components/anuncio-ultimate/ListaAnuncios.tsx` linha 69
  - Frontend consultava REST API direta (sem org context) → RLS bloqueava registros
  - Corrigido: usa Edge Function `/anuncios-ultimate/lista` com X-Auth-Token
  - Resposta mudou: `data` array → `response.anuncios` array
  - Agora retorna TODOS os anúncios da organização (159+ registros)
  - Documento: `⚡_FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md`

- 🔴 **StaysNet: cards de reservas com valores R$0,00 e hóspede genérico**
  - Causa raiz: `pricing_*` zerado por parsing incompleto do payload Stays + `guest_id` sem vínculo
  - Backend agora extrai totais via `staysnet_raw.price._f_total` e base via `staysnet_raw.price._f_expected` (com fallbacks)
  - Fees/taxas somadas a partir de `staysnet_raw.price.hostingDetails.fees[]` quando necessário
  - Backfill atualiza reservas existentes sem criar duplicatas

- 🟡 **Cards de unidades/anúncios não refletiam edição interna (quartos/banheiros/camas/hóspedes)**
  - Sintoma: após editar `properties.data.rooms`, os cards continuavam mostrando valores antigos
  - Causa raiz: cards leem `properties.bedrooms/bathrooms/beds/max_guests`, mas a edição interna salva no JSON `properties.data`
  - Corrigido: `POST /anuncios-ultimate/save-field` e `PATCH /anuncios-ultimate/:id` agora sincronizam capacidade derivada `rooms[]` → tabela `properties` (com filtro por `organization_id`)
  - Documento operacional: `docs/operations/ANUNCIOS_PROPERTIES_CAPACITY_SYNC.md`

### Changed
- Nada ainda

---

## [1.0.103.369] - 2024-12-20

### Fixed
- 🔴 **DEPLOY ERROR**: Vercel failing with "No Output Directory named 'dist' found"
  - `vite.config.ts` linha 89
  - Alterado `outDir: 'build'` para `outDir: 'dist'`
  - Alinhado com `vercel.json` outputDirectory: "dist"

### Technical Details
- **Problema**: Vite gerando saída em `build/`, Vercel esperando `dist/`
- **Causa**: Incompatibilidade entre vite.config.ts e vercel.json
- **Solução**: Padronizado para `dist` (padrão Vite e convenção Vercel)

---

## [1.0.103.368] - 2024-12-20

### Fixed
- 🔴 **BUILD ERROR**: Vercel build failing with ENOENT for ChatSidebar imports
  - `components/chat/ChatSidebar.tsx` linhas 12-13
  - Substituído `@/components/ui/input` por `../ui/input` (caminho relativo)
  - Substituído `@/components/ui/scroll-area` por `../ui/scroll-area`
  - Alias `@` aponta para `./RendizyPrincipal`, não raiz do projeto

### Technical Details
- **Problema**: `Could not load /vercel/path0/RendizyPrincipal/components/ui/input`
- **Causa**: Arquivos em `./components` tentando usar alias `@/components`
- **Causa Raiz**: Vite alias `@` configurado para `./RendizyPrincipal` (linha 69 vite.config.ts)
- **Solução**: Usar caminhos relativos `../ui/...` em arquivos fora de `RendizyPrincipal/`

---

## [1.0.103.367] - 2024-12-19

### Fixed
- 🔴 **BUILD ERROR**: Vercel build failing with unresolved JSR import
  - `utils/services/evolutionContactsService.ts` linhas 312, 372
  - Substituído `@jsr/supabase__supabase-js` por `@supabase/supabase-js`
  - JSR imports não funcionam em builds Vite/Rollup de produção
  - Dynamic imports agora usam pacote npm padrão

### Technical Details
- **Problema**: `Rollup failed to resolve import "@jsr/supabase__supabase-js"`
- **Causa**: JSR (JavaScript Registry) imports não são compatíveis com Rollup
- **Solução**: Usar pacote npm `@supabase/supabase-js` (já instalado)
- **Pattern**: `await import('@supabase/supabase-js')` em vez de JSR path

---

## [1.0.103.366] - 2024-12-19

### Fixed
- 🔴 **CRITICAL**: Timezone issues causando reservas invisíveis no calendário
  - `components/CalendarGrid.tsx` linhas 927-949
  - Substituído `.toDateString()` por comparação de strings locais YYYY-MM-DD
  - Criado helper `formatLocalDate()` para extrair data local sem conversão UTC
  - Corrigido filtro `reservationsStartingToday` que usava timezone-aware comparison
  - Corrigido verificação `blockStartsToday` que usava `.toISOString().split('T')[0]`
  - Debug logs atualizados para usar `dayStr` local
  - **Impacto**: Reservas voltaram a aparecer após fix do timezone
  - **Causa Raiz**: Brasil UTC-3 causava shift de datas ao usar `.toDateString()` e `.toISOString()`

### Technical Details
- **Problema**: Função `.toDateString()` é timezone-aware, convertendo datas para UTC
- **Exemplo**: "2025-12-20 00:00 BRT" → "2025-12-19 21:00 UTC" → "Wed Dec 19 2025"
- **Solução**: Comparação direta de strings YYYY-MM-DD extraídas localmente
- **Pattern**: `checkInStr === dayStr` em vez de `new Date(checkIn).toDateString() === day.toDateString()`

---

## [1.0.103.405] - 2024-12-19

### Added
- StaysNet: Botão "Importar" na lista de anúncios
- StaysNet: Paginação funcional (10 por página)

### Fixed
- StaysNet: Erro 401 (autenticação X-Auth-Token corrigida)
- StaysNet: Endpoint `/listings` descoberto e documentado

### Documentation
- `⚡_VERIFICACAO_BOTAO_IMPORTAR_v1.0.103.405.md`
- `⚡_CORRECAO_PAGINACAO_STAYS_v1.0.103.402.md`
- `⚡_DESCOBERTA_ENDPOINT_LISTINGS_v1.0.103.403.md`

---

## [1.0.103.351] - 2024-12-16

### Added
- Calendário v2 com React Query
- Context API para calendário (`contexts/CalendarContext.tsx`)
- Hooks customizados (`hooks/useCalendarData.ts`)
- Rota `/calendario-v2` para testes paralelos

### Changed
- Redução de 80% nos requests HTTP (cache de 5 minutos)
- Eliminação de prop drilling (15 props → 0)

### Fixed
- Rotas duplicadas (`/rendizy-server/rendizy-server/` → `/reservations`)

### Documentation
- `📘_REFATORACAO_CALENDARIO_v2.0.0.md`
- `⚡_CORRECAO_ROTAS_TRIPE_v1.0.103.350.md`
- `⚡_ANALISE_FLUXO_MODAL_CALENDARIO_v1.0.103.351.md`

### Known Issues
- ⚠️ Rota `/calendario-v2` criada mas não ativada no `App.tsx`
- ⚠️ Datas hardcoded em `CalendarContext.tsx` (outubro ao invés de dezembro)

---

## [1.0.103.340] - 2024-12-18

### Added
- Migration `20241218_ALINHAMENTO_COMPLETO_SCHEMA.sql`
- Campo `full_name` em tabela `guests`
- Campo `document_number` em tabela `guests`

### Fixed
- UUID com prefixo "res_" (agora usa UUID puro)
- `organization_id` NULL (agora usa UUID master)
- FK constraint violation (FK agora aponta para `properties`)

### Documentation
- `⚡_CONTEXTO_COMPLETO_SESSAO_18_12_2024.md`

---

## [1.0.103.250] - 2024-11-01

### Added
- Rota `/calendario` adicionada ao sistema
- Componentes de calendário integrados

### Fixed
- Calendário inacessível (erro 404)

### Documentation
- `✅_CALENDARIO_CORRIGIDO_v1.0.103.250.md`

---

## Notas de Versão

### Como interpretar versões:
- **Major** (1.x.x.x): Mudanças que quebram compatibilidade
- **Minor** (x.0.x.x): Novas features sem quebrar
- **Patch** (x.x.103.x): Correções de bugs
- **Build** (x.x.x.405): Incremento automático

### Categorias de mudanças:
- **Added**: Novas features
- **Changed**: Mudanças em features existentes
- **Deprecated**: Features que serão removidas
- **Removed**: Features removidas
- **Fixed**: Correções de bugs
- **Security**: Correções de segurança
- **Documentation**: Mudanças em documentação
- **Known Issues**: Problemas conhecidos não resolvidos
