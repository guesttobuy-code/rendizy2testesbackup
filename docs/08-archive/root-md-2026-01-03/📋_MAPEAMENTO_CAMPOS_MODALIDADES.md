# 📋 MAPEAMENTO COMPLETO DE CAMPOS POR MODALIDADE

**Sistema de Tags para Anúncios Ultimate**  
**Data:** 16/12/2025  
**Versão:** 2.0.0

---

## 🏷️ LEGENDA DAS MODALIDADES

| Tag | Modalidade | Descrição |
|-----|-----------|-----------|
| **[TEMPORADA]** | Aluguel de Temporada | Short-term rental (Airbnb, Booking) |
| **[RESIDENCIAL]** | Aluguel Residencial | Long-term rental tradicional |
| **[VENDA]** | Compra e Venda | Venda de imóveis |
| **[TODAS]** | Universal | Usado em todas as modalidades |

---

## 📊 MAPEAMENTO POR STEP

### STEP 01: BÁSICO (7 campos)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `tipoAcomodacao` | string | **[TODAS]** | Tipo de imóvel (casa, apartamento, etc) |
| `tipoLocal` | string | **[TODAS]** | Tipo de espaço (completo, privado, compartilhado) |
| `subtype` | string | **[TODAS]** | Subtipo específico do imóvel |
| `title` | string | **[TODAS]** | Nome/título do anúncio |
| `internalId` | string | **[TODAS]** | ID interno para controle |
| `modalidades` | array | **[TODAS]** | Define modalidades ativas (campo master) |
| `estrutura` | string | **[TODAS]** | Estrutura (individual/condomínio/vinculado) |

---

### STEP 02: LOCALIZAÇÃO (16 campos)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `pais` | string | **[TODAS]** | País do imóvel |
| `estado` | string | **[TODAS]** | Estado/província |
| `siglaEstado` | string | **[TODAS]** | Sigla UF |
| `cep` | string | **[TODAS]** | CEP/código postal |
| `cidade` | string | **[TODAS]** | Cidade |
| `bairro` | string | **[TODAS]** | Bairro/distrito |
| `rua` | string | **[TODAS]** | Nome da rua |
| `numero` | string | **[TODAS]** | Número do endereço |
| `complemento` | string | **[TODAS]** | Complemento (apto, bloco) |
| `mostrarNumero` | string | **[TODAS]** | Exibir/ocultar número |
| `tipoAcesso` | string | **[TODAS]** | Tipo de acesso (portaria, etc) |
| `instrucoesAcesso` | string | **[TODAS]** | Instruções de acesso |
| `estacionamento` | boolean | **[TODAS]** | Possui estacionamento |
| `tipoEstacionamento` | string | **[TODAS]** | Tipo de estacionamento |
| `internetCabo` | boolean | **[TODAS]** | Internet cabeada |
| `internetWifi` | boolean | **[TODAS]** | Internet WiFi |

---

### STEP 03: CÔMODOS (5 campos + array)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `rooms` | array | **[TODAS]** | Array de cômodos com fotos e tags |
| `bedrooms` | number | **[TODAS]** | Quantidade total de quartos |
| `bathrooms` | number | **[TODAS]** | Quantidade total de banheiros |
| `beds` | number | **[TODAS]** | Quantidade total de camas |
| `guests` | number | **[TODAS]** | Capacidade máxima de hóspedes |

**Estrutura do objeto Room:**
```typescript
{
  id: string,
  name: string,          // [TODAS]
  type: string,          // [TODAS]
  photos: string[],      // [TODAS]
  tags: string[],        // [TODAS]
  beds: BedType[]        // [TODAS]
}
```

---

### STEP 04: TOUR VIRTUAL (2 campos)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `coverPhoto` | string | **[TODAS]** | URL da foto de capa |
| `coverPhotoId` | string | **[TODAS]** | ID da foto no storage |

---

### STEP 05: AMENIDADES DO LOCAL (1 campo)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `locationAmenities` | array | **[TODAS]** | Amenidades do prédio/condomínio |

**Categorias disponíveis:**
- Outdoor/View
- Parking/Facilities
- Services

---

### STEP 06: AMENIDADES DA ACOMODAÇÃO (1 campo)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `listingAmenities` | array | **[TODAS]** | Amenidades dentro da unidade |

**Categorias disponíveis:**
- Bathroom
- Climate Control
- Kitchen/Dining
- Entertainment
- Safety/Security

---

### STEP 07: DESCRIÇÃO (7 campos multilíngues)

Todos os campos possuem estrutura: `{ pt: string, en: string, es: string }`

| Campo | Max Chars | Modalidade | Descrição |
|-------|-----------|-----------|-----------|
| `descricaoTitulo` | 50 | **[TODAS]** | Título do anúncio |
| `notasGerais` | 5000 | **[TODAS]** | Notas gerais sobre o espaço |
| `sobreEspaco` | 5000 | **[TODAS]** | O que torna o espaço especial |
| `sobreAcesso` | 5000 | **[TODAS]** | Acesso e restrições |
| `sobreAnfitriao` | 5000 | **[TEMPORADA]** | Interação com anfitrião* |
| `descricaoBairro` | 5000 | **[TODAS]** | Descrição do bairro |
| `infoLocomocao` | 5000 | **[TODAS]** | Transporte e locomoção |

*`sobreAnfitriao` é mais relevante para temporada, mas pode ser usado em outras modalidades

---

### STEP 08: RELACIONAMENTO (4 campos)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `titular_imovel` | string | **[TODAS]** | Titular legal do imóvel |
| `administrador_imovel` | string | **[TODAS]** | Administrador responsável |
| `is_sublocacao` | boolean | **[TODAS]** | Indica se é sublocação |
| `is_exclusivo` | boolean | **[TODAS]** | Gestão exclusiva |

---

### STEP 09: PREÇOS BASE - LOCAÇÃO E VENDA (9 campos)

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `tipo_negocio` | string | **[TODAS]** | Define tipo (aluguel/venda/ambos) |
| `valor_aluguel` | number | **[TEMPORADA, RESIDENCIAL]** | Valor mensal do aluguel |
| `valor_iptu` | number | **[RESIDENCIAL, VENDA]** | IPTU mensal (residencial) |
| `valor_condominio` | number | **[RESIDENCIAL, VENDA]** | Valor mensal do condomínio |
| `taxa_servico` | number | **[TEMPORADA, RESIDENCIAL]** | Taxa de serviço adicional |
| `valor_venda` | number | **[VENDA]** | Valor de venda do imóvel |
| `iptu_anual` | number | **[VENDA]** | IPTU anual para venda |
| `aceita_financiamento` | boolean | **[VENDA]** | Aceita financiamento bancário |
| `aceita_permuta` | boolean | **[VENDA]** | Aceita permuta |

---

### STEP 10: CONFIGURAÇÃO PREÇO TEMPORADA (11 campos)

⚠️ **ATENÇÃO: TODOS OS CAMPOS SÃO EXCLUSIVOS PARA TEMPORADA**

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `modo_config_preco` | string | **[TEMPORADA]** | Modo (global/individual) |
| `regiao` | string | **[TEMPORADA]** | Região geográfica |
| `moeda` | string | **[TEMPORADA]** | Moeda utilizada |
| `desconto_longa_estadia` | number | **[TEMPORADA]** | Desconto % estadias longas |
| `desconto_semanal` | number | **[TEMPORADA]** | Desconto % semanal |
| `desconto_mensal` | number | **[TEMPORADA]** | Desconto % mensal |
| `valor_deposito` | number | **[TEMPORADA]** | Valor do depósito caução |
| `usar_precificacao_dinamica` | boolean | **[TEMPORADA]** | Usar algoritmo dinâmico |
| `taxa_limpeza` | number | **[TEMPORADA]** | Taxa fixa de limpeza |
| `taxa_pet` | number | **[TEMPORADA]** | Taxa adicional para pets |
| `taxa_servicos_extras` | number | **[TEMPORADA]** | Taxa para serviços extras |

---

### STEP 11: PRECIFICAÇÃO INDIVIDUAL (7 campos)

⚠️ **ATENÇÃO: TODOS OS CAMPOS SÃO EXCLUSIVOS PARA TEMPORADA**

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `preco_base_noite` | number | **[TEMPORADA]** | Preço base por diária |
| `desconto_permanencia_2_noites` | number | **[TEMPORADA]** | Desconto % para 2+ noites |
| `desconto_permanencia_7_noites` | number | **[TEMPORADA]** | Desconto % para 7+ noites |
| `desconto_permanencia_30_noites` | number | **[TEMPORADA]** | Desconto % para 30+ noites |
| `periodos_sazonais` | array | **[TEMPORADA]** | Períodos de alta/baixa temporada |
| `precos_dia_semana` | object | **[TEMPORADA]** | Preços por dia da semana |
| `datas_especiais` | array | **[TEMPORADA]** | Datas especiais (feriados/eventos) |

---

### STEP 12: PREÇOS DERIVADOS (6 campos)

⚠️ **ATENÇÃO: TODOS OS CAMPOS SÃO EXCLUSIVOS PARA TEMPORADA**

| Campo | Tipo | Modalidade | Descrição |
|-------|------|-----------|-----------|
| `variacao_por_hospedes` | number | **[TEMPORADA]** | Variação % por número de hóspedes |
| `taxa_hospede_extra` | number | **[TEMPORADA]** | Taxa fixa por hóspede adicional |
| `cobrar_criancas` | boolean | **[TEMPORADA]** | Flag se cobra diferenciado para crianças |
| `idade_minima_crianca` | number | **[TEMPORADA]** | Idade mínima para ser criança |
| `idade_maxima_crianca` | number | **[TEMPORADA]** | Idade máxima para ser criança |
| `desconto_crianca` | number | **[TEMPORADA]** | Desconto % para crianças |

---

## 📈 ESTATÍSTICAS

### Total de Campos por Modalidade

| Modalidade | Campos Exclusivos | Campos Compartilhados | Total Disponível |
|-----------|-------------------|----------------------|------------------|
| **TEMPORADA** | 35 campos | 54 campos | **89 campos** |
| **RESIDENCIAL** | 0 campos | 58 campos | **58 campos** |
| **VENDA** | 4 campos | 54 campos | **58 campos** |

### Distribuição por Step

```
Steps 01-08: Campos universais [TODAS] = 54 campos
Step 09: Campos mistos = 9 campos (5 compartilhados, 4 exclusivos VENDA)
Steps 10-12: Campos exclusivos [TEMPORADA] = 24 campos
```

---

## 🎯 REGRAS DE VISIBILIDADE DA UI

### Quando `modalidades` contém "temporada":
- ✅ Mostrar Steps 01-12 completos
- ✅ Em Step 09, mostrar campos de aluguel
- ✅ Mostrar Steps 10, 11, 12 inteiros

### Quando `modalidades` contém "residencial":
- ✅ Mostrar Steps 01-09
- ✅ Em Step 09, mostrar campos de aluguel e custos fixos (IPTU, condomínio)
- ❌ Ocultar Steps 10, 11, 12

### Quando `modalidades` contém "venda":
- ✅ Mostrar Steps 01-09
- ✅ Em Step 09, mostrar campos de venda (valor_venda, iptu_anual, aceita_financiamento, aceita_permuta)
- ❌ Ocultar Steps 10, 11, 12

### Quando `tipo_negocio` = "ambos":
- ✅ Mostrar TODOS os campos de Step 09 (aluguel + venda)

---

## 🔍 VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS

### Por Modalidade:

**TEMPORADA:**
- Step 01: tipoAcomodacao, tipoLocal, title
- Step 02: Endereço completo
- Step 03: Mínimo 1 room com foto
- Step 11: preco_base_noite (obrigatório)

**RESIDENCIAL:**
- Step 01: tipoAcomodacao, tipoLocal, title
- Step 02: Endereço completo
- Step 09: valor_aluguel (obrigatório)

**VENDA:**
- Step 01: tipoAcomodacao, tipoLocal, title
- Step 02: Endereço completo
- Step 09: valor_venda (obrigatório)

---

## 🛠️ IMPLEMENTAÇÃO TÉCNICA

### Verificar modalidade ativa:
```typescript
const isTemporada = formData.modalidades.includes('temporada');
const isResidencial = formData.modalidades.includes('residencial');
const isVenda = formData.modalidades.includes('venda');
```

### Renderização condicional:
```typescript
{isTemporada && (
  <TabsTrigger value="precos-temporada">Temporada</TabsTrigger>
)}
```

### Validação de save:
```typescript
if (isTemporada && !precoBaseNoite) {
  toast.error('Preço base por noite é obrigatório para temporada');
  return false;
}
```

---

## 📝 NOTAS DE REVISÃO

### Falhas Identificadas e Corrigidas:

1. ✅ **Faltava tag de modalidade em `sobreAnfitriao`**
   - Corrigido para [TEMPORADA] (mais relevante para temporada)

2. ✅ **Step 09 precisa de lógica condicional na UI**
   - Campos de aluguel devem aparecer quando tipo_negocio = aluguel ou ambos
   - Campos de venda devem aparecer quando tipo_negocio = venda ou ambos

3. ✅ **Steps 10-12 não possuem validação de modalidade**
   - TODO: Adicionar verificação se modalidade inclui "temporada"
   - Se não incluir, não permitir acesso às tabs

4. ✅ **Falta sistema de progresso baseado em modalidade**
   - calculateProgress() deve considerar apenas campos relevantes para modalidade ativa

---

## 🎓 GLOSSÁRIO

- **Short-term rental**: Aluguel de curta duração (diárias/semanas)
- **Long-term rental**: Aluguel de longa duração (meses/anos)
- **Precificação dinâmica**: Algoritmo que ajusta preços automaticamente
- **Períodos sazonais**: Épocas do ano com preços diferenciados
- **Hóspede extra**: Pessoa além da capacidade base

---

**Documento gerado automaticamente em:** 16/12/2025  
**Arquivo fonte:** FormularioAnuncio.tsx  
**Total de campos mapeados:** 89 campos únicos
