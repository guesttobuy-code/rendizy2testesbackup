# 📋 ANÁLISE: CAMPOS FALTANTES - STAYS.NET → RENDIZY

**Data:** 22/11/2025  
**Status:** ✅ Análise Completa

---

## 🔍 METODOLOGIA

Comparação entre:
- **Campos retornados pela API Stays.net** (dados reais)
- **Campos existentes no banco Rendizy** (schema atual)
- **Campos mapeados nos mappers** (implementação atual)

---

## 👤 HÓSPEDES (Guests)

### **Campos da API Stays.net:**
- `_id`, `id`, `kind`, `fName`, `lName`, `name`
- `email`, `phones[]`, `documents[]`
- `prefLang`, `alternateLangs[]`
- `internalNote`
- `clientSource` (airbnb, booking, etc.)
- `creationDate`
- `airbnb_guest_id`, `booking_guest_id`
- `airbnb_reviews[]`, `booking_reviews[]`
- `airbnb_rating`, `booking_rating`
- `totalReservations`, `totalNights`, `totalSpent`, `averageRating`, `lastStayDate`

### **Campos no Banco Rendizy:**
- ✅ `id`, `organization_id`
- ✅ `first_name`, `last_name`, `full_name`
- ✅ `email`, `phone`
- ✅ `cpf`, `passport`, `rg`
- ✅ `language`
- ✅ `source`
- ✅ `notes`
- ✅ `stats` (JSONB) - `totalReservations`, `totalNights`, `totalSpent`, `averageRating`, `lastStayDate`
- ✅ `external_ids` (JSONB) - `airbnb`, `booking`
- ✅ `ota_reviews` (JSONB) - reviews das OTAs
- ✅ `ota_ratings` (JSONB) - ratings das OTAs
- ✅ `preferences` (JSONB)
- ✅ `tags[]`
- ✅ `is_blacklisted`
- ✅ `created_at`, `updated_at`

### **Campos Faltantes:**
- ⚠️ `kind` (person/company) - **Pode ser útil para distinguir pessoa física/jurídica**
- ⚠️ `isUser` - **Indica se é usuário do sistema Stays.net**
- ⚠️ `creationDate` - **Já temos `created_at`, mas pode ser útil manter o original**
- ⚠️ `alternateLangs[]` - **Idiomas alternativos (atualmente só mapeamos `prefLang`)**

### **Recomendação:**
- ✅ **Campos críticos já estão mapeados**
- ⚠️ **Campos opcionais podem ser adicionados ao JSONB `preferences` ou `external_ids`**

---

## 🏠 PROPRIEDADES (Properties)

### **Campos da API Stays.net:**
- `_id`, `id`, `internalName`, `name`
- `code`, `status`
- `_idtype`, `_t_typeMeta` (traduções)
- `address` (objeto completo)
- `maxGuests`, `bedrooms`, `bathrooms`
- `amenities[]`, `photos[]`
- `description`, `shortDescription`
- `pricing` (objeto)
- `otaChannels[]` (Airbnb, Booking, Website)
- `groupIds[]` (múltiplos anúncios)

### **Campos no Banco Rendizy:**
- ✅ `id`, `organization_id`
- ✅ `name`, `code`
- ✅ `type`, `status`
- ✅ `address` (JSONB)
- ✅ `max_guests`, `bedrooms`, `beds`, `bathrooms`, `area`
- ✅ `amenities[]`, `photos[]`
- ✅ `description`, `short_description`
- ✅ `pricing` (JSONB)
- ✅ `platforms` (JSONB) - `direct`, `airbnb`, `booking`
- ✅ `ota_metadata` (JSONB)
- ✅ `cover_photo`
- ✅ `created_at`, `updated_at`

### **Campos Faltantes:**
- ⚠️ `internalName` - **Nome interno vs nome público (pode ser útil)**
- ⚠️ `_t_typeMeta` - **Traduções em múltiplos idiomas (pode ser útil para internacionalização)**
- ⚠️ `groupIds[]` - **IDs de grupos (múltiplos anúncios da mesma propriedade)**
- ⚠️ `instantBooking` - **Reserva instantânea (pode ser útil)**

### **Recomendação:**
- ✅ **Campos críticos já estão mapeados**
- ⚠️ **Campos opcionais podem ser adicionados ao JSONB `ota_metadata`**

---

## 📅 RESERVAS (Reservations)

### **Campos da API Stays.net:**
- `_id`, `id`, `creationDate`
- `checkInDate`, `checkInTime`, `checkOutDate`, `checkOutTime`
- `_idlisting`, `_idclient`
- `type` (booked, cancelled, etc.)
- `price` (objeto complexo com `hostingDetails`, `extrasDetails`)
- `stats._f_totalPaid`
- `guests`, `guestsDetails` (adults, children, infants)
- `partner` (objeto com OTA e comissão)
- `partnerCode`
- `reservationUrl`
- `guest_review`, `guest_rating`
- `airbnb_review`, `booking_review`
- `notes`, `internalComments`, `specialRequests`
- `cancelledAt`, `cancelledBy`, `cancellationReason`

### **Campos no Banco Rendizy:**
- ✅ `id`, `organization_id`
- ✅ `property_id`, `guest_id`
- ✅ `check_in`, `check_out`, `nights`
- ✅ `guests` (JSONB) - `adults`, `children`, `infants`, `pets`, `total`
- ✅ `pricing` (JSONB) - `pricePerNight`, `baseTotal`, `cleaningFee`, `serviceFee`, `taxes`, `discount`, `total`, `currency`
- ✅ `payment` (JSONB) - `status`, `method`, `transactionId`, `paidAt`, `refundedAt`
- ✅ `status` (pending, confirmed, cancelled, completed)
- ✅ `platform` (airbnb, booking, direct, etc.)
- ✅ `external_id`, `external_url`
- ✅ `external_ids` (JSONB)
- ✅ `external_urls` (JSONB)
- ✅ `ota_reviews` (JSONB)
- ✅ `ota_ratings` (JSONB)
- ✅ `notes`, `internal_comments`, `special_requests`
- ✅ `cancelled_at`, `cancelled_by`, `cancellation_reason`
- ✅ `created_at`, `updated_at`, `created_by`, `confirmed_at`

### **Campos Faltantes:**
- ⚠️ `checkInTime`, `checkOutTime` - **Horários específicos (atualmente só temos datas)**
- ⚠️ `partner` (objeto completo) - **Informações detalhadas do parceiro/OTA e comissão**
- ⚠️ `partnerCode` - **Código do parceiro (diferente de `external_id`)**
- ⚠️ `stats._f_totalPaid` - **Total pago (pode ser diferente de `pricing.total`)**

### **Recomendação:**
- ✅ **Campos críticos já estão mapeados**
- ⚠️ **Adicionar `check_in_time` e `check_out_time` como campos separados**
- ⚠️ **Adicionar `partner_info` ao JSONB `external_ids` ou criar campo dedicado**

---

## 🏢 PROPRIETÁRIOS (Owners)

### **Status:** ⚠️ **ENDPOINT NÃO IDENTIFICADO NA API**

A documentação da Stays.net não menciona endpoint específico para proprietários.

**Possíveis fontes:**
- Pode estar dentro de `properties` ou `listings`
- Pode precisar de endpoint diferente
- Pode não estar disponível na API externa

### **Recomendação:**
- ⚠️ **Investigar se existe endpoint de proprietários**
- ⚠️ **Se não existir, considerar como funcionalidade futura**

---

## 📅 CALENDÁRIO (Calendar)

### **Campos da API Stays.net:**
- `getAvailabilityCalendar()` - Endpoint disponível
- Retorna disponibilidade, bloqueios, tarifas

### **Campos no Banco Rendizy:**
- ✅ `reservations` (tabela) - já cria bloqueios no calendário
- ⚠️ **Falta:** Tabela específica para disponibilidade
- ⚠️ **Falta:** Tabela específica para bloqueios (diferentes de reservas)
- ⚠️ **Falta:** Tabela específica para tarifas dinâmicas

### **Recomendação:**
- ⚠️ **Implementar sincronização de calendário**
- ⚠️ **Criar/atualizar tabelas se necessário**

---

## 📊 RESUMO

| Categoria | Campos Críticos | Campos Opcionais | Status |
|-----------|----------------|------------------|--------|
| **Hóspedes** | ✅ Todos mapeados | ⚠️ 4 opcionais | ✅ Completo |
| **Propriedades** | ✅ Todos mapeados | ⚠️ 4 opcionais | ✅ Completo |
| **Reservas** | ✅ Todos mapeados | ⚠️ 4 opcionais | ✅ Completo |
| **Proprietários** | ⚠️ Endpoint não encontrado | - | ⏳ Pendente |
| **Calendário** | ⚠️ Parcialmente mapeado | ⚠️ Falta estrutura | ⏳ Pendente |

---

## 🎯 PRIORIDADES

### **Alta Prioridade:**
1. ✅ **Nenhuma** - Todos os campos críticos já estão mapeados

### **Média Prioridade:**
1. ⚠️ **Calendário** - Implementar sincronização completa
2. ⚠️ **Horários de check-in/check-out** - Adicionar campos `check_in_time` e `check_out_time`

### **Baixa Prioridade:**
1. ⚠️ **Campos opcionais** - Adicionar ao JSONB quando necessário
2. ⚠️ **Proprietários** - Investigar endpoint ou implementar como funcionalidade futura

---

**Última atualização:** 22/11/2025  
**Status:** ✅ **Análise completa - Campos críticos mapeados**

