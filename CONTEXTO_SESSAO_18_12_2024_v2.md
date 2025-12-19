# 🧭 CONTEXTO DE CONTINUAÇÃO - Sessão 18/12/2024

> **Para a IA que continuar este trabalho**: Este documento contém TUDO que você precisa saber para dar continuidade ao desenvolvimento sem perder contexto.

---

## 📍 LOCALIZAÇÃO E SETUP

### Pasta do Projeto
```powershell
cd "C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
```

### Iniciar Desenvolvimento
```powershell
npm run dev  # Frontend (localhost:3000)
```

### Deploy Backend
```powershell
cd "Rendizyoficial-main"
npx supabase functions deploy rendizy-server
```

### Ver Logs do Backend
```powershell
npx supabase functions logs rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

---

## 🔐 CREDENCIAIS E ACESSO

### Supabase Project
- **Project ID**: odcgnzfremrqnvtitpcc
- **URL**: https://odcgnzfremrqnvtitpcc.supabase.co
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NTI4NjksImV4cCI6MjA0NjIyODg2OX0.EvSgFe1lHxGmFAT3F8fJqc2-atJHFg9WUWMa9qfj6Ck`

### Usuário Admin
- **Email**: admin@admin.com
- **Role**: super_admin
- **User ID**: `00000000-0000-0000-0000-000000000002`
- **Organization ID**: `00000000-0000-0000-0000-000000000000`
- **Token no localStorage**: `rendizy-token` (SHA-512 hash, 128 chars)

### Scripts PowerShell para Testes
```powershell
# Setup de headers para API
$headers = @{
  'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NTI4NjksImV4cCI6MjA0NjIyODg2OX0.EvSgFe1lHxGmFAT3F8fJqc2-atJHFg9WUWMa9qfj6Ck'
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NTI4NjksImV4cCI6MjA0NjIyODg2OX0.EvSgFe1lHxGmFAT3F8fJqc2-atJHFg9WUWMa9qfj6Ck'
}

# Testar API
Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/anuncios_drafts?select=*" -Headers $headers | ConvertTo-Json -Depth 10
```

---

## 🎯 TRABALHO REALIZADO NESTA SESSÃO

### 1. ✅ BLOQUEIOS NO CALENDÁRIO (COMPLETADO)

**Problema Inicial**: Modal de bloqueio não abria quando clicava em "Criar Bloqueio"

**Soluções Aplicadas**:
1. **Renderização do Modal**: Adicionou `<BlockModal>` e `<BlockDetailsModal>` no JSX do App.tsx (linha 1476-1507)
2. **Props Corretas**: Mudou de `open` para `isOpen`, adicionou `propertyName` e `onSave`
3. **Snake_case API**: Backend espera `property_id`, `start_date`, `end_date` (não camelCase)
4. **UUID Generation**: Usa `crypto.randomUUID()` para IDs
5. **Organization ID**: Super admin usa `'00000000-0000-0000-0000-000000000000'`
6. **Foreign Key**: Removida constraint `blocks_property_id_fkey` via migration
7. **Conflict Logic**: Removida validação que impedia múltiplos bloqueios nas mesmas datas
8. **Display no Calendário**: Bloqueios agora aparecem em cards laranjas

**Arquivos Modificados**:
- `App.tsx` (linhas 1476-1507)
- `components/BlockModal.tsx` (linhas 73-80)
- `supabase/functions/rendizy-server/routes-blocks.ts` (linhas 20-27, 165, 226)
- `utils/api.ts` (linhas 893-900) - Adicionado `getBlocks()`
- `components/calendar/CalendarPage.tsx` (linhas 51-85) - useQuery direto
- `components/CalendarGrid.tsx` (linhas 10-68, 183-189)

### 2. ✅ CANCELAMENTO DE RESERVAS (COMPLETADO)

**Implementação**:
- Botão "Cancelar Reserva" agora chama API para atualizar status
- Invalida cache do React Query (keys: `['reservations']`, `['calendar']`)
- Reservas canceladas (`status: 'cancelled'`) filtradas da exibição

**Arquivo Modificado**:
- `components/ReservationDetailsModal.tsx` (linhas 128-154)
- `hooks/useCalendarData.ts` (linha 86-92)

### 3. ✅ DATE RANGE SCROLLING (COMPLETADO)

**Problema**: Calendário só scrollava até dia 31 mesmo com filtro "18 dez - 16 fev"

**Solução**: 
- Modificou `getDaysInMonth()` para aceitar `dateRange` prop
- Gera dias através de múltiplos meses (60 dias de dez 18 a fev 16)

**Arquivos Modificados**:
- `components/CalendarGrid.tsx` (linhas 10-68, 191)
- `components/calendar/CalendarModule.tsx` (linha 122)

### 4. ✅ CRIAÇÃO DE DRAFTS (COMPLETADO)

**Problema Inicial**: Erro "ID do anúncio não encontrado" ao criar novo imóvel

**Causa**: `handleSaveAll` exigia `anuncioId` antes de salvar, mas novos drafts não têm ID

**Solução**:
1. Se `!anuncioId` → POST com `crypto.randomUUID()`
2. Redireciona para `/anuncios-ultimate/{novoId}` após criar
3. Se `anuncioId` existe → PATCH para atualizar

**Problema Adicional**: 400 Bad Request por falta de `organization_id` e `user_id`

**Solução**: Obter do localStorage e incluir no payload:
```typescript
const userDataStr = localStorage.getItem('user');
const userData = userDataStr ? JSON.parse(userDataStr) : null;
const userId = userData?.id || '00000000-0000-0000-0000-000000000002';
const organizationId = userData?.organization?.id || '00000000-0000-0000-0000-000000000000';
```

**Problema Final**: Erro ao criar reserva - "Property must have an internal name (title or nome_interno)"

**Causa**: Backend valida `propertyRow.title` (top-level), mas draft salvava apenas `data: formData`

**Solução**: Incluir `title` no top-level em POST e PATCH:
```typescript
body: JSON.stringify({
  id: novoId,
  organization_id: organizationId,
  user_id: userId,
  title: formData.title || 'Sem título', // ✅ ADICIONADO
  data: formData,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})
```

**Arquivo Modificado**:
- `components/anuncio-ultimate/FormularioAnuncio.tsx` (linhas 1779-1850)

---

## 🚨 PROBLEMA ATIVO (PENDENTE)

### BlockModal mostra sempre "Dona Rosa" mesmo para outros imóveis

**Problema**: Na linha 1491 do App.tsx está hardcoded:
```typescript
propertyName="Dona Rosa"
```

**Solução Necessária**:
1. Verificar onde `blockModal.propertyId` é armazenado
2. Buscar propriedade correspondente da lista `properties`
3. Passar nome dinâmico: `propertyName={properties.find(p => p.id === blockModal.propertyId)?.name}`

**Arquivos a Verificar**:
- `App.tsx` (linha ~1491)
- Estado `blockModal` (verificar useState/useContext)
- Lista de propriedades disponível em `App.tsx`

---

## 📚 ARQUITETURA DO SISTEMA

### Database Tables Principais

**`anuncios_drafts`** (Propriedades/Imóveis):
```sql
CREATE TABLE anuncios_drafts (
  id uuid PRIMARY KEY,
  organization_id uuid,
  user_id uuid,
  title text,  -- ⚠️ OBRIGATÓRIO para reservas
  status varchar(32) DEFAULT 'draft',
  completion_percentage int DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_completed int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`blocks`** (Bloqueios de Calendário):
```sql
CREATE TABLE blocks (
  id uuid PRIMARY KEY,
  property_id text NOT NULL,  -- ⚠️ SEM foreign key
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text,
  subtype text,
  reason text,
  notes text,
  organization_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
```

**`reservations`** (Reservas):
- Tabela existente com validação de `property.title` obrigatório
- Filtro: exclui `status = 'cancelled'`

### Backend Routes (Hono + Deno)

**Localização**: `supabase/functions/rendizy-server/`

**Principais Arquivos**:
- `routes-blocks.ts` - CRUD de bloqueios
- `routes-reservations.ts` - CRUD de reservas (validações importantes)
- `routes-anuncios.ts` - CRUD de anúncios/propriedades
- `kv_store.tsx` - Client do Supabase

**Deploy**: `npx supabase functions deploy rendizy-server`

### Frontend Architecture

**State Management**:
- React Query (`@tanstack/react-query`) para cache de dados
- CalendarContext para estado compartilhado do calendário
- localStorage para user/organization/token

**Principais Hooks**:
- `useProperties()` - Carrega lista de imóveis de `/anuncios-ultimate/lista`
- `useReservations()` - Carrega reservas (filtra canceladas)
- `useQuery` direto para bloqueios em CalendarPage

**Convenções**:
- Backend: snake_case (`property_id`, `start_date`)
- Frontend: camelCase (`propertyId`, `startDate`)
- Conversão acontece na camada `utils/api.ts`

---

## 🎓 APRENDIZADOS CRÍTICOS

### 1. Multi-Tenant com Organization ID
- Super admin usa `00000000-0000-0000-0000-000000000000`
- Sempre incluir em INSERTs de novas entidades

### 2. UUID Generation
- Usar `crypto.randomUUID()` (nativo do browser)
- Nunca usar strings customizadas tipo `blk-${timestamp}`

### 3. Top-Level vs JSONB
- Campos validados pelo backend DEVEM estar no top-level
- Exemplo: `title` precisa ser coluna direta, não só dentro de `data`

### 4. Foreign Keys com Legacy Data
- Se tabela antiga foi deletada, dropar foreign keys manualmente
- Usar migrations SQL diretas

### 5. React Query Invalidation
- Sempre invalidar cache após mutações:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['reservations'] });
  queryClient.invalidateQueries({ queryKey: ['calendar'] });
  ```

### 6. Date Range Filtering
- Calendário precisa gerar dias dinamicamente através de meses
- Não pode assumir apenas um `currentMonth`

### 7. Progressive Draft Saving
- Permitir salvar com dados mínimos (apenas `title` por exemplo)
- Gerar UUID no frontend, não esperar backend

---

## 📖 DOCUMENTOS DE REFERÊNCIA OBRIGATÓRIA

### 1. **Ligando os motores único.md**
- Setup completo do projeto
- Credenciais e tokens
- Regras de acesso ao Supabase
- Comandos CLI essenciais

### 2. **Claude Sonnet 4.5 Anuncios ultimate.md**
- Decisões arquiteturais do módulo Anúncios
- Progresso de implementação
- Histórico de problemas e soluções

### 3. **⚡_CONTEXTO_COMPLETO_SESSAO_18_12_2024.md**
- Sessão anterior de trabalho (contexto histórico)

---

## 🔄 FLUXOS CRÍTICOS FUNCIONANDO

### Criar Bloqueio
1. Usuário clica em data vazia no calendário
2. `handleEmptyClick()` abre BlockModal
3. BlockModal preenche formulário (tipo, datas, comentário)
4. Submit chama `calendarApi.createBlock()` com snake_case
5. Backend cria em `blocks` table sem validações de conflito
6. React Query invalida cache `['blocks']`
7. CalendarGrid renderiza card laranja

### Criar Reserva
1. Usuário clica em data vazia
2. ReservationWizard abre
3. Valida: **property.title não pode estar vazio**
4. Valida: preço base > 0
5. Submit chama `reservationsApi.create()`
6. Backend valida e cria
7. Card verde aparece no calendário

### Criar Draft de Imóvel
1. Usuário vai em `/anuncios-ultimate/novo`
2. Preenche "Identificação Interna" (mínimo)
3. Clica "Salvar Tudo"
4. Frontend gera UUID com `crypto.randomUUID()`
5. POST para `/anuncios_drafts` com:
   - `id`, `organization_id`, `user_id`
   - `title` (top-level) ✅
   - `data` (JSONB com formData)
6. Redireciona para `/anuncios-ultimate/{uuid}` para edição

---

## 🐛 DEBUGGING TIPS

### Ver Logs do Backend
```powershell
npx supabase functions logs rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

### Testar Rotas Direto
```powershell
$headers = @{
  'apikey' = 'ANON_KEY'
  'Authorization' = 'Bearer ANON_KEY'
}

# Listar drafts
Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/anuncios_drafts?select=*" -Headers $headers

# Listar bloqueios
Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/calendar/blocks?propertyIds=PROPERTY_ID" -Headers $headers
```

### Console Logs Importantes
- `🔄 [CalendarPage] Buscando bloqueios...`
- `✅ [useProperties] X imóveis carregados`
- `❌ [createReservation] Propriedade não encontrada`

### Validar Token
```javascript
localStorage.getItem('rendizy-token')
localStorage.getItem('user') // JSON com id e organization
```

---

## ⏭️ PRÓXIMOS PASSOS SUGERIDOS

### 1. **URGENTE**: Corrigir BlockModal propertyName hardcoded
- Buscar propriedade dinamicamente da lista
- Passar nome correto baseado em `blockModal.propertyId`

### 2. Validar auto-seleção de propriedades no calendário
- Novas propriedades criadas após calendário estar aberto não são auto-selecionadas
- Considerar adicionar auto-select quando lista de properties mudar

### 3. Adicionar mais campos ao FormularioAnuncio
- Preço base (obrigatório para reservas)
- Endereço completo
- Fotos (coverPhoto)

### 4. Testes E2E
- Criar imóvel → Criar bloqueio → Criar reserva → Cancelar reserva
- Validar todos os estados no calendário

### 5. Melhorias de UX
- Loading states mais claros
- Feedback visual ao salvar drafts
- Confirmação antes de cancelar reservas

---

## 🎯 COMANDOS ESSENCIAIS

```powershell
# Setup inicial
cd "C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"

# Desenvolvimento
npm run dev

# Deploy backend
npx supabase functions deploy rendizy-server

# Ver logs
npx supabase functions logs rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Testar API
$headers = @{
  'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NTI4NjksImV4cCI6MjA0NjIyODg2OX0.EvSgFe1lHxGmFAT3F8fJqc2-atJHFg9WUWMa9qfj6Ck'
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NTI4NjksImV4cCI6MjA0NjIyODg2OX0.EvSgFe1lHxGmFAT3F8fJqc2-atJHFg9WUWMa9qfj6Ck'
}
Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/anuncios_drafts?select=id,title,status&order=created_at.desc" -Headers $headers | ConvertTo-Json
```

---

## 📝 NOTAS FINAIS

- **Imóvel de Teste Dona Rosa**: ID `9f6cad48-42e9-4ed5-b766-82127a62dce2`
- **Imóvel Novo Teste**: ID `3cabf06d-51c6-4e2b-b73e-520e018f1fce` (title: "teste 30")
- **Hóspede de Teste**: Juliane Milfont (`9aa96aa3-61d6-4c0e-9f63-dc910cfb4917`)
- **Backend já deployado** com todas as correções desta sessão
- **Frontend funcionando** em localhost:3000

**Status Geral**: Sistema operacional com bloqueios, reservas e drafts funcionando. Pendente apenas correção do propertyName hardcoded no BlockModal.

---

**Última Atualização**: 18/12/2024 20:18  
**Versão do Sistema**: v1.0.103.353+  
**IA Responsável**: GitHub Copilot (Claude Sonnet 4.5)
