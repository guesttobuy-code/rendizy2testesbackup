# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Added
- Sistema de documentação estruturado (`docs/README_DOCUMENTACAO.md`)
- Template de log de desenvolvimento (`docs/DEV_LOG_TEMPLATE.md`)
- Protocolo de inicialização para IAs no SETUP_COMPLETO.md
- Workflow profissional com scripts PowerShell
- Documentação operacional completa (`docs/operations/`)
- `calendarApi.getBlocks()` - Busca bloqueios do backend
- Hook `useCalendarData` agora carrega bloqueios reais do banco
- Campo `external_ids` (JSONB) na tabela `properties` para rastreamento de IDs externos

### Fixed
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
  - Mudança de tabela: `properties` (abandonado) → `anuncios_drafts` (oficial)
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
  - Migra `properties` → `anuncios_drafts` preservando IDs originais
  - Converte estrutura para JSONB: `properties.name` → `anuncios_drafts.title` + `data`
  - Status padrão: `"draft"`, completion: 50%
  - Metadados: `migrated_from: "properties"`, `migrated_at: timestamp`
  - **RESULTADO**: 159 anúncios migrados com sucesso (0 erros)
  - Total na lista: 161 anúncios (2 originais + 159 migrados)
  - Script auxiliar: `contar-anuncios.ps1` para verificação
  - Verificado: StaysNet agora exporta corretamente para `anuncios_drafts` (Issue #47)
  - Documento: `⚡_FIX_MIGRACAO_PROPERTIES_v1.0.103.405.md`
  - Estrutura adaptada: campos SQL → campo JSONB `data` flexível
  - Anúncios importados agora aparecem em `/anuncios-ultimate/lista`
  - Query de deduplicação: `contains('data', { externalIds: { stays_net_id } })`
  - Documento: `⚡_FIX_STAYSNET_TARGET_ANUNCIOS_ULTIMATE_v1.0.103.403.md`
- 🔴 **Issue #48**: Lista Anúncios Ultimate retornava apenas 2 registros ao invés de 159
  - `components/anuncio-ultimate/ListaAnuncios.tsx` linha 69
  - Frontend consultava REST API direta (sem org context) → RLS bloqueava registros
  - Corrigido: usa Edge Function `/anuncios-ultimate/lista` com X-Auth-Token
  - Resposta mudou: `data` array → `response.anuncios` array
  - Agora retorna TODOS os anúncios da organização (159+ registros)
  - Documento: `⚡_FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md`

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
- FK constraint violation (FK agora aponta para `anuncios_drafts`)

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
