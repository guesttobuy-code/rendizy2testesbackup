# CHANGELOG V1.0.103.409

**Data:** 2026-01-06  
**Tag Git:** `stable-staysnet-import-2026-01-06`

---

## 🎯 Resumo

Migração completa de `anuncios_ultimate` para `properties` no módulo Stays.net e correção do trigger de reservas.

---

## ✅ Alterações

### 🗄️ Backend (Edge Functions)

- **`import-staysnet-reservations.ts`**: Atualizado para usar tabela `properties` em vez de `anuncios_ultimate`
- **`import-staysnet-blocks.ts`**: Atualizado para usar tabela `properties`
- **`import-staysnet-properties.ts`**: Atualizado para usar tabela `properties`
- **`routes-anuncios.ts`**: Atualizado para usar tabela `properties`

### 🗃️ Banco de Dados

- **Trigger `enforce_reservation_property_link`**: Corrigido para validar FK contra `properties` (antes referenciava `anuncios_ultimate` que não existe mais)

### 🖥️ Frontend

- **`MainSidebar.tsx`**: Renomeado menu "Anúncio Ultimate" → "Propriedades e anúncios"
- **40+ arquivos .md**: Atualizados com nova nomenclatura

### 📚 Documentação

- **`WORKING_STATES.md`**: Novo arquivo para documentar estados funcionais conhecidos
- Criada tag `stable-staysnet-import-2026-01-06` para referência futura

---

## 🔧 Deploy Realizado

```bash
# Edge Function atualizada
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

---

## 🧪 Testes Realizados

| Teste | Resultado |
|-------|-----------|
| Criação de reserva com property_id válido | ✅ OK |
| Import de reservas Stays.net | ✅ OK |
| Exibição de stats após import | ✅ OK |
| Trigger rejeita property_id inválido | ✅ OK |

**Reserva de teste:** `9f36ca89-667f-4181-b2d2-3bc2dfb0d446`

---

## 📋 Como Testar

```powershell
# Testar import Stays.net
.\TEST-STAYSNET-MODULAR.ps1 -MaxBatches 5 -IncludeBlocks

# Verificar tabela properties
SELECT id, name, status FROM properties LIMIT 10;

# Verificar reservas vinculadas
SELECT r.id, r.property_id, p.name 
FROM reservations r 
JOIN properties p ON r.property_id = p.id 
LIMIT 10;
```

---

## 🔄 Rollback (se necessário)

```bash
# Voltar para estado anterior
git checkout stable-staysnet-import-2026-01-06

# Ver diferenças
git diff stable-staysnet-import-2026-01-06..HEAD -- supabase/functions/rendizy-server/
```

---

## 📎 Commits Relacionados

- `7ecd0cb` - refactor: rename anuncios_ultimate to properties
- `80489e4` - refactor(ui): rename menu Anuncio Ultimate to Propriedades e anuncios
- `1fbcc46` - refactor(properties): migrate routes-properties.ts

---

## 👤 Autor

Sessão de desenvolvimento com IA - 2026-01-06
