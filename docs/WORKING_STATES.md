# 📸 Estados Funcionais Conhecidos (Working States)

> Este arquivo documenta estados do sistema que foram testados e estão funcionando corretamente.
> Use as tags Git para voltar a um estado anterior se algo quebrar.

---

## Como Usar Este Arquivo

### Se algo quebrar:
```bash
# 1. Ver diferença entre estado funcionando e atual:
git diff <tag-name>..HEAD -- <caminho/do/arquivo>

# 2. Voltar para estado funcionando (modo leitura):
git checkout <tag-name>

# 3. Voltar para main:
git checkout main
```

---

## 🟢 Estados Estáveis

### 1. Stays.net Import (Reservas + Bloqueios + Stats UI)

| Campo | Valor |
|-------|-------|
| **Data** | 2026-01-06 |
| **Tag Git** | `stable-staysnet-import-2026-01-06` |
| **Commit** | `7ecd0cb` (refactor: rename anuncios_ultimate to properties) |
| **Edge Function** | `rendizy-server` (deployed 2026-01-06) |

**Arquivos Críticos:**
- `supabase/functions/rendizy-server/import-staysnet-reservations.ts`
- `supabase/functions/rendizy-server/import-staysnet-blocks.ts`
- `supabase/functions/rendizy-server/import-staysnet-properties.ts`
- `components/StaysNetIntegration/services/staysnet.service.ts`
- `components/StaysNetIntegration/hooks/useStaysNetImport.ts`
- `components/StaysNetIntegration/components/ImportStats.tsx`

**Tabelas Envolvidas:**
- `properties` (antes era `anuncios_ultimate`)
- `reservations`
- `blocks`
- `guests`

**Como Testar:**
```powershell
.\TEST-STAYSNET-MODULAR.ps1 -MaxBatches 5 -IncludeBlocks
```

**O que funciona neste estado:**
- ✅ Importação de propriedades da Stays.net
- ✅ Importação de reservas com vínculo correto a `properties`
- ✅ Importação de bloqueios
- ✅ Exibição de estatísticas na UI após import
- ✅ Trigger `enforce_reservation_property_link` validando FK

---

### 2. Trigger de Reservas (FK para Properties)

| Campo | Valor |
|-------|-------|
| **Data** | 2026-01-06 |
| **Tag Git** | `stable-staysnet-import-2026-01-06` |
| **Função SQL** | `enforce_reservation_property_link()` |

**O que funciona:**
- ✅ Validação de `property_id` contra tabela `properties`
- ✅ Reservas só são criadas se propriedade existir
- ✅ Teste manual: reserva `9f36ca89-667f-4181-b2d2-3bc2dfb0d446` criada com sucesso

**SQL do Trigger (referência):**
```sql
CREATE OR REPLACE FUNCTION public.enforce_reservation_property_link()
RETURNS trigger AS $$
BEGIN
  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'property_id is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = NEW.property_id) THEN
    RAISE EXCEPTION 'property_id % not found in properties', NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📋 Template para Novos Estados

```markdown
### [Nome do Módulo/Feature]

| Campo | Valor |
|-------|-------|
| **Data** | YYYY-MM-DD |
| **Tag Git** | `stable-<nome>-<data>` |
| **Commit** | `<hash>` |
| **Edge Function** | `<nome>` (se aplicável) |

**Arquivos Críticos:**
- `path/to/file1.ts`
- `path/to/file2.ts`

**Como Testar:**
\`\`\`powershell
# comando de teste
\`\`\`

**O que funciona neste estado:**
- ✅ Feature 1
- ✅ Feature 2
```

---

## 🔧 Como Criar Nova Tag

```bash
# 1. Garantir que está tudo commitado
git status

# 2. Criar tag anotada
git tag -a stable-<modulo>-<data> -m "Descrição do estado funcionando"

# 3. Enviar para remoto
git push testes stable-<modulo>-<data>
```

---

## 📜 Histórico de Tags

| Tag | Data | Descrição |
|-----|------|-----------|
| `stable-staysnet-import-2026-01-06` | 2026-01-06 | Import Stays.net funcionando com properties |

