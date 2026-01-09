# 🚨 REGRAS CANÔNICAS PARA AI/COPILOT - RENDIZY

> **ATENÇÃO AI:** Este arquivo contém regras que DEVEM ser seguidas ao modificar código neste repositório.
> Violações podem causar problemas graves em produção.
>
> 📚 **Documento principal:** [docs/Rules.md](../docs/Rules.md) - Regras canônicas gerais do Rendizy

## 🔴 ZONAS CRÍTICAS - NÃO MODIFICAR SEM AUTORIZAÇÃO

### 1. Carregamento de Propriedades (App.tsx)

**Arquivo:** `App.tsx`  
**Função:** `loadProperties`  
**Marcador:** `[ZONA_CRITICA]`

**PROIBIDO:**
- ❌ Alterar a lógica de fetch de `anuncios-ultimate/lista`
- ❌ Adicionar filtros extras que possam excluir propriedades
- ❌ Modificar `setProperties()` ou `setSelectedProperties()` sem validação
- ❌ Remover logs de diagnóstico `[ZONA_CRITICA]`
- ❌ Adicionar dependências no `useCallback` que causem re-fetch infinito

**OBRIGATÓRIO:**
- ✅ Manter todos os logs `console.log` com prefixo `[ZONA_CRITICA]`
- ✅ Validar que `apiProperties.length > 0` antes de setar
- ✅ Preservar fallback em caso de erro (não zerar lista)

---

### 2. Rota de Listagem de Anúncios (routes-anuncios.ts)

**Arquivo:** `supabase/functions/rendizy-server/routes-anuncios.ts`  
**Rota:** `GET /anuncios-ultimate/lista`  
**Marcador:** `[ZONA_CRITICA]`

**PROIBIDO:**
- ❌ Adicionar filtros que excluam anúncios válidos
- ❌ Alterar `.eq('organization_id', organizationId)`
- ❌ Remover campos do `select`
- ❌ Alterar filtro de `__kind` (exclusão de settings)
- ❌ Adicionar `.limit()` sem motivo explícito

**OBRIGATÓRIO:**
- ✅ Log com `organization_id` no início da rota
- ✅ Log com contagem de anúncios retornados
- ✅ Retornar `{ ok: true, anuncios: [] }` mesmo se vazio

---

### 3. Multi-Tenancy (utils-multi-tenant.ts)

**Arquivo:** `supabase/functions/rendizy-server/utils-multi-tenant.ts`

**PROIBIDO:**
- ❌ Alterar `RENDIZY_MASTER_ORG_ID`
- ❌ Modificar lógica de `getOrganizationIdForRequest`
- ❌ Mudar regra de superadmin

---

### 4. Reservas (routes-reservations.ts)

**Arquivo:** `supabase/functions/rendizy-server/routes-reservations.ts`  
**Marcador:** `🔒 CADEADO DE CONTRATO`

**PROIBIDO:**
- ❌ Alterar filtro `.eq('organization_id', organizationId)` - vazamento de dados entre tenants
- ❌ Modificar contrato de input/output sem criar versão v2
- ❌ Remover validação de datas (check_in, check_out)
- ❌ Alterar lógica de cálculo de `calculateNights`
- ❌ Remover verificação de conflito de datas (overlap)

**OBRIGATÓRIO:**
- ✅ Manter cadeado de contrato no topo do arquivo
- ✅ Manter integridade tenant: reservas nunca podem vazar entre organizações
- ✅ Preservar logs de diagnóstico existentes
- ✅ Retornar `{ success: true, data: [] }` mesmo se vazio

**DEPENDÊNCIAS CRÍTICAS:**
- Calendar Module exibe reservas no calendário
- Properties Module vincula reservas a propriedades
- Guests Module associa hóspedes às reservas

---

### 5. Hóspedes (routes-guests.ts)

**Arquivo:** `supabase/functions/rendizy-server/routes-guests.ts`

**PROIBIDO:**
- ❌ Alterar filtro `.eq('organization_id', organizationId)` - vazamento de dados entre tenants
- ❌ Remover sanitização de dados (CPF, email, telefone)
- ❌ Modificar lógica de busca/filtro sem testar regressão
- ❌ Expor dados sensíveis (CPF completo) em listagens públicas

**OBRIGATÓRIO:**
- ✅ Manter filtro de tenant em TODAS as queries
- ✅ Sanitizar inputs: `sanitizeString`, `sanitizeEmail`, `sanitizePhone`, `sanitizeCPF`
- ✅ Preservar busca por múltiplos campos (nome, email, telefone, CPF)
- ✅ Manter validação de blacklist

**DEPENDÊNCIAS CRÍTICAS:**
- Reservations Module vincula hóspedes às reservas
- WhatsApp Module envia mensagens para hóspedes

---

### 6. Calendário (routes-calendar.ts)

**Arquivo:** `supabase/functions/rendizy-server/routes-calendar.ts`  
**Rotas:** `GET /calendar`, `GET /calendar/blocks`

**PROIBIDO:**
- ❌ Alterar filtro de `organization_id` - vazamento de dados entre tenants
- ❌ Modificar lógica de overlap de datas sem testes
- ❌ Remover parâmetros de filtro existentes (startDate, endDate, propertyIds)
- ❌ Quebrar contrato de retorno que sites externos consomem

**OBRIGATÓRIO:**
- ✅ Manter consistência com tabelas `reservations` e `blocks`
- ✅ Preservar filtros de data para performance
- ✅ Manter flags: `includeBlocks`, `includePrices`
- ✅ Retornar dados de calendário no formato esperado pelo frontend

**DEPENDÊNCIAS CRÍTICAS:**
- CalendarGrid.tsx consome dados do calendário
- Sites externos (Bolt) consomem `/calendar` via API pública
- CalendarBulkRules.tsx depende de regras de calendário

---

### 7. Blocks (routes-blocks.ts)

**Arquivo:** `supabase/functions/rendizy-server/routes-blocks.ts`

**PROIBIDO:**
- ❌ Alterar filtro de `organization_id` - vazamento de bloqueios entre tenants
- ❌ Remover validação de sobreposição de datas
- ❌ Permitir blocks sem property_id válido
- ❌ Quebrar integridade com tabela `blocks` no SQL

**OBRIGATÓRIO:**
- ✅ Aplicar `tenancyMiddleware` em todas as rotas
- ✅ Manter filtro por `propertyIds` (múltiplas propriedades)
- ✅ Ordenar por `start_date` ascending
- ✅ Usar mapper `sqlToBlock` para converter dados SQL

**DEPENDÊNCIAS CRÍTICAS:**
- Calendar Module exibe bloqueios
- Reservations verifica conflitos com bloqueios
- StaysNet importa bloqueios externos

---

### 8. Stays.net (imports + webhooks) — custo e escala

**Arquivos principais:**
- `supabase/functions/rendizy-server/import-staysnet-*.ts`
- `supabase/functions/rendizy-server/routes-staysnet*.ts`

**PROIBIDO:**
- ❌ Logar credenciais, headers completos, ou payloads completos de Stays.net
- ❌ Fazer fan-out por item sem orçamento (ex.: 1 request por reserva/cliente sem limite)
- ❌ Fazer DB roundtrip por item quando existir alternativa em lote (dedupe/insert/update)
- ❌ Executar “full import” inline dentro de webhook (webhook deve enfileirar e sair)
- ❌ Criar pipeline paralelo de sync (full-sync e modular devem convergir)

**OBRIGATÓRIO:**
- ✅ Respeitar multi-tenancy (`organization_id`) em todas as queries
- ✅ Implementar/usar cursor de continuidade (`next.skip` / `hasMore`) em imports
- ✅ Aplicar orçamento de runtime (`maxRuntimeMs`) e timeout de fetch (`fetchTimeoutMs`) em imports
- ✅ Padrão de logs: endpoint/status/duration/contagens (sem dados sensíveis)

**DOCUMENTO CANÔNICO:**
- `docs/06-integrations/STAYSNET_SCALE_ROADMAP.md`

---

## 🟡 REGRAS GERAIS

### Antes de Alterar Código Crítico

1. **PERGUNTE AO USUÁRIO** antes de modificar zonas críticas
2. **EXPLIQUE O IMPACTO** das mudanças propostas
3. **MANTENHA LOGS** de diagnóstico - eles existem por um motivo
4. **NÃO REMOVA COMENTÁRIOS** de bloqueio (╔══════...╚══════)

### Padrões de Código

- Prefixo `[ZONA_CRITICA]` = não alterar sem autorização
- Prefixo `🔒 PROTEÇÃO:` = validação crítica, não remover
- Prefixo `🚨 ALERTA:` = log de erro que deve ser preservado

---

## 📝 Histórico de Problemas

| Data | Problema | Causa | Solução |
|------|----------|-------|---------|
| 2026-01-05 | Propriedades sumiram | Filtro incorreto de organization_id | Adicionadas validações e logs |
| (anterior) | Propriedades vazias | Mapeamento retornava array vazio | Validação antes de setProperties |

---

## 🔧 Como Diagnosticar Problemas

Se propriedades sumirem:

1. Verificar console do navegador por logs `[ZONA_CRITICA]`
2. Verificar logs do Edge Function no Supabase Dashboard
3. Confirmar `organization_id` do usuário logado
4. Checar tabela `properties` diretamente

```sql
-- Verificar anúncios por organização
SELECT organization_id, COUNT(*) 
FROM properties 
GROUP BY organization_id;
```

---

## 🛡️ REGRAS DE COMMIT SEGURO (OBRIGATÓRIO PARA IA)

> **ATENÇÃO AI:** Esta seção define o fluxo OBRIGATÓRIO para qualquer mudança de código.
> Seguir estas regras previne quebra de código em produção.

### Fluxo Obrigatório

```
1. git checkout -b feature/nome-descritivo
2. Fazer mudanças
3. git commit -m "tipo(escopo): descrição"
4. git push origin feature/nome-descritivo
5. MOSTRAR O DIFF ao usuário antes de qualquer merge
6. AGUARDAR aprovação explícita ("siga", "merge", "aprovo")
7. Só então: git checkout main && git merge feature/nome
```

### ❌ PROIBIDO

- ❌ `git push origin main` direto (NUNCA!)
- ❌ Merge sem mostrar diff ao usuário
- ❌ Assumir que mudança é "pequena demais para PR"
- ❌ Modificar múltiplos módulos críticos no mesmo commit

### ✅ OBRIGATÓRIO

- ✅ Sempre usar branch para qualquer mudança
- ✅ Mostrar resumo do diff antes de pedir aprovação
- ✅ Commits atômicos (uma mudança = um commit)
- ✅ Mensagens de commit seguindo Conventional Commits

### 📦 Módulos Protegidos (v1.0.104-stable)

Estes módulos estão **validados e funcionando**. Qualquer alteração requer:
1. Branch separada
2. Review do diff
3. Teste de smoke após merge

| Módulo | Caminho | Status |
|--------|---------|--------|
| Import Blocks | `supabase/functions/rendizy-server/modules/staysnet/import-staysnet-blocks.ts` | ✅ Validado 2026-01-09 |
| Import Reservations | `supabase/functions/rendizy-server/modules/staysnet/import-staysnet-reservations.ts` | ✅ Validado |
| Import Properties | `supabase/functions/rendizy-server/modules/staysnet/import-staysnet-properties.ts` | ✅ Validado |
| Auth Module | `supabase/functions/rendizy-server/modules/auth/*` | ✅ Crítico |
| Client Sites | `supabase/functions/rendizy-public/*` | ✅ Medhome funcionando |
| Multi-Tenant | `supabase/functions/rendizy-server/utils-multi-tenant.ts` | ✅ Crítico |

### 🏷️ Tags de Estabilidade

Antes de mudanças grandes, criar tag:
```bash
git tag -a vX.Y.Z-stable -m "Descrição do estado estável"
git push origin vX.Y.Z-stable
```

Para restaurar estado estável:
```bash
git checkout vX.Y.Z-stable
```

### 📜 Script de Commit Seguro

Use `scripts/safe-commit.ps1` para garantir o fluxo:
```powershell
.\scripts\safe-commit.ps1 -Branch "feature/minha-mudanca" -Message "tipo(escopo): descrição"
```

---

**Última atualização:** 2026-01-09  
**Mantido por:** Equipe Rendizy
