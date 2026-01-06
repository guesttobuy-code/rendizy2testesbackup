# 🚨 REGRAS CANÔNICAS PARA AI/COPILOT - RENDIZY

> **ATENÇÃO AI:** Este arquivo contém regras que DEVEM ser seguidas ao modificar código neste repositório.
> Violações podem causar problemas graves em produção.

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
4. Checar tabela `anuncios_ultimate` diretamente

```sql
-- Verificar anúncios por organização
SELECT organization_id, COUNT(*) 
FROM anuncios_ultimate 
GROUP BY organization_id;
```

---

**Última atualização:** 2026-01-05  
**Mantido por:** Equipe Rendizy
