# INVENTÁRIO: Arquivos que referenciam tabela `properties` (DROPADA)

Data: 2026-01-06
Status da tabela: **DROPADA** (executado EXECUTE_DROP_PROPERTIES.sql)
Última atualização: 2026-01-06

## Progresso de Correção

### ✅ Arquivos CORRIGIDOS

| Arquivo | Ação Tomada |
|---------|-------------|
| `rendizy-public/index.ts` | Removidas queries `.from("properties")`, usa apenas anuncios_ultimate |
| `routes-anuncios.ts` | Removida função `syncCapacityToProperties` (2 ocorrências) |
| `routes-blocks.ts` | Query de validação alterada para anuncios_ultimate |
| `routes-client-sites.ts` | Removido bloco de properties, usa apenas anuncios_ultimate |
| `staysnet-full-sync.ts` | Query de fallback alterada para anuncios_ultimate |
| `migrate-properties-to-listings.ts` | Adicionado aviso de depreciação no cabeçalho |
| `routes-properties.ts` | ✅ **REFATORADO 2026-01-06**: Todas 14 queries alteradas de `.from("properties")` para `.from("anuncios_ultimate")`. Criado adapter `utils-anuncio-property-adapter.ts` com funções `anuncioToProperty` e `propertyToAnuncio`. |

### ⚠️ Arquivos PENDENTES

Nenhum arquivo Edge Function pendente.

## Adapter Criado

**utils-anuncio-property-adapter.ts** (407 linhas)
- `ANUNCIO_SELECT_FOR_PROPERTY` - campos a selecionar
- `anuncioToProperty(row)` - converte anuncios_ultimate → Property
- `propertyToAnuncio(property, orgId, userId?)` - converte Property → anuncios_ultimate
- `buildAnuncioDataUpdate(updates, existingData)` - helper para updates parciais

## Componentes Frontend Afetados

| Componente | Usa Rotas de | Impacto |
|------------|--------------|---------|
| PropertyWizardPage.tsx | /properties | 🔴 Vai quebrar |
| PropertiesModule.tsx | /properties | 🔴 Vai quebrar |
| PropertiesManagement.tsx | /properties | 🔴 Vai quebrar |

## Estratégia de Correção para routes-properties.ts

### Opção A: Refatorar para anuncios_ultimate
- Manter rotas `/properties` funcionando
- Traduzir campos internamente para anuncios_ultimate.data
- PRÓS: Compatibilidade total
- CONTRAS: Trabalho extensivo (~2500 linhas)

### Opção B: Proxy para rotas de anuncios
- Redirecionar `/properties` → `/anuncios-ultimate`
- Frontend ajusta minimamente
- PRÓS: Menos código para manter
- CONTRAS: Pode ter incompatibilidades

### Opção C: Depreciar e migrar frontend
- Marcar rotas como deprecated
- Migrar frontend para usar anuncios diretamente
- PRÓS: Arquitetura limpa
- CONTRAS: Mais trabalho no frontend

## Campos de Mapeamento properties → anuncios_ultimate

| Campo properties | Equivalente anuncios_ultimate.data |
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
