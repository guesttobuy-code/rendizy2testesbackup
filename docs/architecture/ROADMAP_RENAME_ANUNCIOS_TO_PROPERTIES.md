# 📋 ROADMAP: Renomear `anuncios_ultimate` → `properties`

**Objetivo:** Tornar o nome da tabela intuitivo para desenvolvedores e IAs.

**Data:** 2026-01-07  
**Status:** 🟡 PLANEJADO (não executar sem validação completa)

---

## 📊 RESUMO DA AUDITORIA

| Tipo de Arquivo | Referências Encontradas | Ação Necessária |
|-----------------|------------------------|-----------------|
| **TypeScript (*.ts)** | 189 | Buscar/Substituir + Deploy |
| **Markdown (*.md)** | 200+ (truncado) | Arquivar obsoletos + Atualizar core |
| **SQL (*.sql)** | 100+ | Migrations + RPC updates |
| **PowerShell (*.ps1)** | 50+ | Atualizar scripts |
| **RPCs no Banco** | ~5 funções | Recriar com novo nome |
| **Triggers/Indexes** | ~8 | Renomear via ALTER |
| **FKs** | 3-5 | Atualizar automaticamente |

---

## 🚨 RISCOS E IMPACTOS

### ⚠️ ALTO RISCO
1. **RPC `save_anuncio_field`** - Referencia `anuncios_ultimate` diretamente em SQL
2. **FKs existentes** - `reservations.property_id`, `blocks.property_id`
3. **Triggers** - `trg_prevent_anuncios_ultimate_staysnet_placeholder`
4. **Indexes únicos** - `anuncios_ultimate_stays_property_uidx`
5. **Edge Functions em produção** - Downtime durante deploy

### ⚠️ MÉDIO RISCO
1. **Documentação desatualizada** - Confusão futura se não atualizar tudo
2. **Scripts auxiliares** - PowerShell usado para debug/operações
3. **Cache de tipos** - TypeScript types podem precisar refresh

### ✅ BAIXO RISCO
1. **ALTER TABLE RENAME** - Operação atômica, FKs seguem automaticamente
2. **Buscar/Substituir código** - Mecânico, sem lógica complexa

---

## 📝 FASES DE EXECUÇÃO

### FASE 0: PREPARAÇÃO (Antes de qualquer mudança)
- [ ] Backup completo do banco de dados
- [ ] Snapshot do código (tag git: `pre-rename-anuncios-to-properties`)
- [ ] Comunicar equipe sobre janela de manutenção
- [ ] Testar rollback plan

### FASE 1: RENOMEAR TABELA NO BANCO (SQL)
```sql
-- 1.1 Renomear tabela (FKs seguem automaticamente)
ALTER TABLE public.anuncios_ultimate RENAME TO properties;

-- 1.2 Renomear indexes
ALTER INDEX IF EXISTS idx_anuncios_ultimate_id RENAME TO idx_properties_id;
ALTER INDEX IF EXISTS idx_anuncios_ultimate_organization_id RENAME TO idx_properties_organization_id;
ALTER INDEX IF EXISTS anuncios_ultimate_stays_property_uidx RENAME TO properties_stays_property_uidx;
ALTER INDEX IF EXISTS anuncios_ultimate_stays_property_idx RENAME TO properties_stays_property_idx;

-- 1.3 Renomear trigger
ALTER TRIGGER trg_prevent_anuncios_ultimate_staysnet_placeholder 
ON public.properties RENAME TO trg_prevent_properties_staysnet_placeholder;

-- 1.4 Renomear função do trigger
ALTER FUNCTION public.prevent_anuncios_ultimate_staysnet_placeholder() 
RENAME TO prevent_properties_staysnet_placeholder;

-- 1.5 Atualizar comentário
COMMENT ON TABLE public.properties IS 
  'Tabela principal de imóveis/propriedades. Renomeada de anuncios_ultimate em 2026-01-XX.';
```

### FASE 2: ATUALIZAR RPCs (SQL)
**Arquivos a atualizar:**
- `supabase/migrations/20251212_rpc_save_anuncio_field.sql`
- `fix-rpc.sql`

**Ação:** Recriar RPC `save_anuncio_field` com referências a `properties`:
```sql
-- Substituir todas as ocorrências de:
--   public.anuncios_ultimate  →  public.properties
--   anuncios_ultimate.id      →  properties.id
--   anuncios_ultimate.data    →  properties.data
```

### FASE 3: ATUALIZAR CÓDIGO TYPESCRIPT (23 arquivos)

**Arquivos principais (Edge Functions):**

| Arquivo | Ocorrências | Complexidade |
|---------|-------------|--------------|
| `routes-properties.ts` | 14+ | Média (tem adapter) |
| `routes-anuncios.ts` | 10+ | Média |
| `rendizy-public/index.ts` | 5 | Baixa |
| `import-staysnet-properties.ts` | 20+ | Alta |
| `import-staysnet-reservations.ts` | 10+ | Média |
| `import-staysnet-blocks.ts` | 3 | Baixa |
| `staysnet-full-sync.ts` | 8+ | Média |
| `routes-staysnet.ts` | 8+ | Média |
| `routes-staysnet-webhooks.ts` | 3 | Baixa |
| `routes-staysnet-import.ts` | 4 | Baixa |
| `routes-reservations.ts` | 8+ | Média |
| `routes-blocks.ts` | 2 | Baixa |
| `routes-client-sites.ts` | 3 | Baixa |
| `routes-data-reconciliation.ts` | 4 | Baixa |
| `execute-rpc-fix/index.ts` | 12 (SQL embeded) | Alta |
| `fix-rpc-function/index.ts` | 12 (SQL embeded) | Alta |
| `utils-anuncio-property-adapter.ts` | 20+ (remover?) | Especial |

**Comando buscar/substituir:**
```bash
# Em todos os *.ts dentro de supabase/functions
sed -i 's/anuncios_ultimate/properties/g' **/*.ts
sed -i 's/ANUNCIOS_ULTIMATE/PROPERTIES/g' **/*.ts
```

### FASE 4: SIMPLIFICAR ADAPTER (OPCIONAL)

O arquivo `utils-anuncio-property-adapter.ts` foi criado para traduzir entre `anuncios_ultimate` e o tipo `Property`. Após renomear a tabela para `properties`, este adapter pode ser **simplificado ou removido**.

**Opções:**
1. **Remover completamente** - Se o schema da tabela `properties` já bate com o tipo `Property`
2. **Manter simplificado** - Se ainda precisar de transformações JSONB → flat

### FASE 5: ATUALIZAR MIGRATIONS

**Criar nova migration:**
```
supabase/migrations/20260107_rename_anuncios_ultimate_to_properties.sql
```

**Arquivar migrations antigas:**
```
supabase/migrations/archive/20251212_create_anuncios_ultimate.sql → archive
supabase/migrations/archive/20251221_rename_anuncios_drafts_to_ultimate.sql → archive
```

### FASE 6: ATUALIZAR DOCUMENTAÇÃO

**Documentos CORE (atualizar imediatamente):**
- [ ] `RULES.md` - 15+ referências
- [ ] `docs/Rules.md` - 12+ referências  
- [ ] `docs/02-architecture/ARQUITETURA_ANUNCIO_ULTIMATE.md` - Renomear arquivo
- [ ] `docs/03-conventions/MULTI_TENANCY_CANONICAL.md`
- [ ] `docs/03-conventions/RULE_RESERVAS_SEM_IMOVEL_NAO_EXISTEM.md`
- [ ] `docs/GUIA_RAPIDO_IA.md`
- [ ] `CHANGELOG.md`
- [ ] `.github/AI_RULES.md`

**Documentos para ARQUIVAR:**
Mover para `docs/08-archive/legacy-anuncios-ultimate/`:
- `MAPEAMENTO-CAMPOS-STAYSNET.md`
- `📋_MAPEAMENTO_CAMPOS_INTEGRACAO_UNIVERSAL.md`
- `🔍_ANALISE_IMPORT_STAYSNET_PROPERTIES_v1.0.105.md`
- `_tmp_audit_field_by_field_*.md`
- `⚡_AUDITORIA_CAMPO_A_CAMPO_ce101549.md`
- Outros docs de debug/troubleshooting antigos

**Documentos HANDOFF (não arquivar, atualizar):**
- `_PROMPT_HANDOFF_CALENDAR_RULES_2026_01_06.md`
- `_PROMPT_NOVO_CHAT__*.md`

### FASE 7: ATUALIZAR SCRIPTS POWERSHELL

**Scripts principais:**
- `EXTRAIR-STAYSNET-RAW.ps1`
- `VER-TODOS-ANUNCIOS.ps1`
- `VER-ANUNCIO-ESPECIFICO.ps1`
- `detectar-duplicatas.ps1`
- `check-anuncios.ps1`
- Todos os `_tmp_*.ps1` com referências

**Comando:**
```powershell
Get-ChildItem -Recurse -Filter *.ps1 | ForEach-Object {
  (Get-Content $_.FullName) -replace 'anuncios_ultimate', 'properties' | Set-Content $_.FullName
}
```

### FASE 8: DEPLOY E VALIDAÇÃO

1. **Deploy Edge Functions:**
```bash
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
npx supabase functions deploy rendizy-public --project-ref odcgnzfremrqnvtitpcc
```

2. **Testar endpoints críticos:**
- [ ] GET /properties
- [ ] POST /properties/create
- [ ] PATCH /properties/:id
- [ ] StaysNet import
- [ ] Reservations create
- [ ] Blocks create/update

3. **Verificar logs:**
```sql
SELECT * FROM postgres_logs WHERE message LIKE '%anuncios_ultimate%';
```

---

## 🔄 PLANO DE ROLLBACK

Se algo falhar após renomear:

```sql
-- Reverter nome da tabela
ALTER TABLE public.properties RENAME TO anuncios_ultimate;

-- Reverter indexes
ALTER INDEX IF EXISTS idx_properties_id RENAME TO idx_anuncios_ultimate_id;
-- ... (reverter todos)

-- Reverter trigger
ALTER TRIGGER trg_prevent_properties_staysnet_placeholder 
ON public.anuncios_ultimate RENAME TO trg_prevent_anuncios_ultimate_staysnet_placeholder;
```

Para código: `git checkout pre-rename-anuncios-to-properties`

---

## 📅 CRONOGRAMA SUGERIDO

| Fase | Tempo Estimado | Dependências |
|------|----------------|--------------|
| Fase 0: Preparação | 1 hora | Nenhuma |
| Fase 1: Rename SQL | 5 minutos | Backup OK |
| Fase 2: RPCs | 30 minutos | Fase 1 |
| Fase 3: TypeScript | 2-3 horas | Fase 2 |
| Fase 4: Adapter | 1 hora | Fase 3 |
| Fase 5: Migrations | 30 minutos | Fase 3 |
| Fase 6: Docs | 2-4 horas | Fase 3 |
| Fase 7: PowerShell | 1 hora | Fase 3 |
| Fase 8: Deploy | 1 hora | Fases 1-7 |

**Total estimado:** 8-12 horas (recomendado fazer em 2-3 sessões)

---

## ✅ CHECKLIST FINAL PRÉ-EXECUÇÃO

- [ ] Backup do banco feito e verificado
- [ ] Tag git criada
- [ ] Equipe notificada
- [ ] Horário de baixo tráfego escolhido
- [ ] Scripts de rollback prontos
- [ ] Endpoints de teste listados
- [ ] Documentação de rollback impressa/acessível offline

---

## 📚 REFERÊNCIAS

- Migration original: `20251212_create_anuncios_ultimate.sql`
- Rename drafts→ultimate: `20251221_rename_anuncios_drafts_to_ultimate.sql`
- Drop properties antigo: `EXECUTE_DROP_PROPERTIES.sql`
- Adapter atual: `utils-anuncio-property-adapter.ts`

---

**Autor:** GitHub Copilot  
**Revisado:** Pendente aprovação do usuário
