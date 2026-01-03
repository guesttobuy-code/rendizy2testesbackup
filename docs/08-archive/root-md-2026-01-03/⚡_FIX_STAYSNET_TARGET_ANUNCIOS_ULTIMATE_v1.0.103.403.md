# ⚡ FIX: StaysNet Exporta para Anúncios Ultimate v1.0.103.403

**Data**: 2025-12-20  
**Versão**: 1.0.103.403  
**Issue**: #47 - StaysNet exportando para wizard antigo ao invés de Anúncios Ultimate

## 🎯 Problema Identificado

A integração StaysNet estava **funcionando corretamente** ao importar anúncios via API, porém estava salvando no **lugar errado**:

- ❌ **Antes**: Salvava na tabela `properties` (wizard antigo abandonado)
- ✅ **Depois**: Salva na tabela `anuncios_drafts` (Anúncios Ultimate - modelo oficial)

### Diferenças entre os Modelos

| Aspecto | Properties (Wizard Antigo) | Anuncios Ultimate (Modelo Oficial) |
|---------|---------------------------|-----------------------------------|
| **Tabela** | `properties` | `anuncios_drafts` |
| **Rota** | `/properties` | `/anuncios-ultimate/lista` |
| **Estrutura** | Campos individuais SQL | Campo JSONB `data` flexível |
| **Status** | ⚠️ Abandonado | ✅ Modelo oficial |

## 🔧 Correção Aplicada

### Arquivo Modificado

**`supabase/functions/rendizy-server/staysnet-full-sync.ts`**

### O Que Foi Alterado

1. **Mudança de Tabela**: `properties` → `anuncios_drafts`
2. **Estrutura de Dados**: Adaptada para formato JSONB do Anúncios Ultimate
3. **Query de Verificação**: Usa `contains` em campo JSONB para buscar `externalIds.stays_net_id`

### Código Anterior (Linha ~320)

```typescript
const sqlData = propertyToSql(property, finalOrgId);

const { data: existing } = await supabase
  .from('properties')  // ❌ Tabela errada
  .select('id')
  .eq('organization_id', organizationId)
  .contains('external_ids', { stays_net_id: staysListingId })
  .maybeSingle();

if (existing) {
  await supabase
    .from('properties')  // ❌ Tabela errada
    .update(sqlData)
    .eq('id', existing.id);
}
```

### Código Novo (v1.0.103.403)

```typescript
// ✅ Estrutura adaptada para anuncios_drafts
const anuncioDraft = {
  id: propertyId,
  organization_id: finalOrgId,
  user_id: defaultOwnerId,
  data: {  // ✅ Campo JSONB flexível
    title: property.name,
    internalId: property.code || staysListingId,
    description: property.description,
    propertyType: property.type || 'apartment',
    guests: property.maxGuests || 2,
    bedrooms: property.bedrooms || 0,
    beds: property.beds || 0,
    bathrooms: property.bathrooms || 0,
    basePrice: property.pricing?.basePrice || 0,
    photos: property.photos || [],
    address: property.address || {},
    externalIds: {
      stays_net_id: staysListingId,  // ✅ ID original preservado
    },
  },
  status: property.isActive ? 'active' : 'draft',
};

// ✅ Query JSONB correta
const { data: existing } = await supabase
  .from('anuncios_drafts')  // ✅ Tabela correta
  .select('id')
  .eq('organization_id', finalOrgId)
  .contains('data', { externalIds: { stays_net_id: staysListingId } })
  .maybeSingle();

if (existing) {
  await supabase
    .from('anuncios_drafts')  // ✅ Tabela correta
    .update({
      data: anuncioDraft.data,
      status: anuncioDraft.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);
}
```

## 📊 Mapeamento de Campos

| Campo StaysNet | Campo anuncios_drafts.data |
|----------------|----------------------------|
| `_mstitle.pt_BR` | `title` |
| `id / _id` | `internalId` |
| `_msdesc.pt_BR` | `description` |
| `_i_maxGuests` | `guests` |
| `_i_rooms` | `bedrooms` |
| `_i_beds` | `beds` |
| `_f_bathrooms` | `bathrooms` |
| `address.*` | `address.*` |
| `_t_mainImageMeta.url` | `photos[0]` |
| `_id (original)` | `externalIds.stays_net_id` |

## ✅ Validação

### Como Testar

1. **Configurar StaysNet**: Painel → Configurações → Integrações → StaysNet
2. **Importar Anúncios**: Selecionar propriedades e clicar em "Importar"
3. **Verificar Destino**: Acessar `/anuncios-ultimate/lista`
4. **Conferir Anúncios**: Devem aparecer na lista de Anúncios Ultimate

### Checklist de Validação

- [ ] Anúncios aparecem em `/anuncios-ultimate/lista`
- [ ] **NÃO** aparecem em `/properties` (wizard antigo)
- [ ] Campo `data.externalIds.stays_net_id` preservado
- [ ] Status correto (`active` ou `draft`)
- [ ] Informações básicas preenchidas (título, descrição, hóspedes, quartos)
- [ ] Endereço importado corretamente
- [ ] Fotos importadas (se disponíveis)

## 🔄 Sincronização de Dados Existentes

### Anúncios Já Importados

Se você já importou anúncios antes desta correção, eles estarão em `properties`. Você pode:

**Opção 1: Reimportar** (recomendado)
```sql
-- Limpar anúncios antigos da tabela errada (CUIDADO!)
DELETE FROM properties WHERE external_ids->>'stays_net_id' IS NOT NULL;
```

**Opção 2: Migrar Manualmente**
```sql
-- Copiar de properties para anuncios_drafts
INSERT INTO anuncios_drafts (id, organization_id, user_id, data, status)
SELECT 
  id,
  organization_id,
  owner_id,
  jsonb_build_object(
    'title', name,
    'internalId', code,
    'description', description,
    'guests', max_guests,
    'bedrooms', bedrooms,
    'beds', beds,
    'bathrooms', bathrooms,
    'photos', photos,
    'address', address,
    'externalIds', external_ids
  ),
  CASE WHEN is_active THEN 'active' ELSE 'draft' END
FROM properties
WHERE external_ids->>'stays_net_id' IS NOT NULL;
```

## 📝 Próximos Passos

1. ✅ **Deploy da Correção**: Fazer deploy do Edge Function atualizado
2. ✅ **Testar Importação**: Importar um anúncio de teste do StaysNet
3. ✅ **Validar Lista**: Verificar se aparece em Anúncios Ultimate
4. ⚠️ **Limpar Dados Antigos**: Decidir o que fazer com anúncios em `properties`

## ⚠️ Avisos Importantes

### Não Misturar Modelos

- **Properties (Wizard Antigo)**: Será removido em versões futuras
- **Anuncios Ultimate**: Único modelo suportado daqui para frente
- **Reservas**: Já usam `anuncios_drafts` como referência

### Consistência de Dados

```typescript
// ✅ SEMPRE salvar em anuncios_drafts
await supabase.from('anuncios_drafts').insert(data);

// ❌ NUNCA mais salvar em properties (obsoleto)
await supabase.from('properties').insert(data); // ❌ OBSOLETO
```

## 🔗 Referências

- Issue #46: Fix StaysNet auth header
- Issue #47: StaysNet exporta para lugar errado (este fix)
- `⚡_FIX_STAYSNET_AUTH_HEADER_v1.0.103.502.md`
- `Ligando os motores único.md` (regras de commit)

---

**Status**: ✅ Correção aplicada  
**Próximo Passo**: Deploy e teste em produção
