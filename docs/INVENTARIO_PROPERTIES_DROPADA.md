# INVENTÁRIO: Migração properties → properties

**Data:** 2026-01-06  
**Status:** ✅ **CONCLUÍDO**

---

## 📊 Resumo Executivo

| Item | Status |
|------|--------|
| Código Edge Functions | ✅ 100% migrado |
| SQL para DROP | ✅ Script pronto (`EXECUTE_DROP_PROPERTIES.sql`) |
| Deploy realizado | ✅ rendizy-server deployed |
| Documentação | ✅ Completa |

---

## Progresso de Correção

### ✅ Arquivos CORRIGIDOS (TODOS)

| Arquivo | Ação Tomada |
|---------|-------------|
| `rendizy-public/index.ts` | Removidas queries `.from("properties")`, usa apenas properties |
| `routes-anuncios.ts` | Removida função `syncCapacityToProperties` (2 ocorrências) |
| `routes-blocks.ts` | Query de validação alterada para properties |
| `routes-client-sites.ts` | Removido bloco de properties, usa apenas properties |
| `staysnet-full-sync.ts` | Query de fallback alterada para properties |
| `migrate-properties-to-listings.ts` | Adicionado aviso de depreciação no cabeçalho |
| `routes-properties.ts` | ✅ **REFATORADO 2026-01-06**: Todas 14 queries alteradas de `.from("properties")` para `.from("properties")`. Criado adapter `utils-anuncio-property-adapter.ts` com funções `anuncioToProperty` e `propertyToAnuncio`. |
| `migrate-properties-to-listings.ts` | ⚠️ Marcado como DEPRECIADO, não executar |

### 📝 Nota sobre migrate-properties-to-listings.ts

Este arquivo ainda contém `.from('properties')` mas está **marcado como DEPRECIADO** e não é chamado por nenhuma rota. É apenas referência histórica.

### ⚠️ Arquivos PENDENTES

**NENHUM** - Todos os arquivos de Edge Function foram corrigidos.

## Adapter Criado

**utils-anuncio-property-adapter.ts** (407 linhas)
- `ANUNCIO_SELECT_FOR_PROPERTY` - campos a selecionar
- `anuncioToProperty(row)` - converte properties → Property
- `propertyToAnuncio(property, orgId, userId?)` - converte Property → properties
- `buildAnuncioDataUpdate(updates, existingData)` - helper para updates parciais

## Componentes Frontend Afetados

| Componente | Usa Rotas de | Impacto |
|------------|--------------|---------|
| PropertyWizardPage.tsx | /properties | 🔴 Vai quebrar |
| PropertiesModule.tsx | /properties | 🔴 Vai quebrar |
| PropertiesManagement.tsx | /properties | 🔴 Vai quebrar |

## Estratégia de Correção para routes-properties.ts

### Opção A: Refatorar para properties
- Manter rotas `/properties` funcionando
- Traduzir campos internamente para properties.data
- PRÓS: Compatibilidade total
- CONTRAS: Trabalho extensivo (~2500 linhas)

### Opção B: Proxy para rotas de anuncios
- Redirecionar `/properties` → `/properties`
- Frontend ajusta minimamente
- PRÓS: Menos código para manter
- CONTRAS: Pode ter incompatibilidades

### Opção C: Depreciar e migrar frontend
- Marcar rotas como deprecated
- Migrar frontend para usar anuncios diretamente
- PRÓS: Arquitetura limpa
- CONTRAS: Mais trabalho no frontend

## Campos de Mapeamento properties → properties

| Campo properties | Equivalente properties.data |
|------------------|-----------------------------------|
| name | data.name / data.title |
| code | data.codigo / data.propertyCode |
| type | data.type / data.tipoAcomodacao |
| status | status (coluna separada) |
| address_city | data.address.city / data.cidade |
| address_state | data.address.state / data.sigla_estado |
| pricing_base_price | data.pricing.dailyRate |
| bedrooms | data.bedrooms / data.quartos |
| bathrooms | data.bathrooms / data.banheiros |
| max_guests | data.guests / data.maxGuests |
| photos | data.photos |
| cover_photo | data.coverPhoto |
| amenities | data.comodidades / data.amenities |
| organization_id | organization_id (coluna separada) |
