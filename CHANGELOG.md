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

### Changed
- Nada ainda

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
