# 🚀 Implementação: Importação Completa Stays.net

**Data:** 22/11/2025  
**Status:** 🟡 Em Progresso

---

## ✅ O QUE FOI IMPLEMENTADO

### **1. Mappers Atualizados com Campos Reais**

#### **Reservation Mapper** (`staysnet-reservation-mapper.ts`)
- ✅ Campos reais mapeados:
  - `checkInDate` / `checkOutDate` (ao invés de `from`/`to`)
  - `checkInTime` / `checkOutTime`
  - `creationDate`
  - `price.hostingDetails.fees` (taxas de limpeza, serviço, etc.)
  - `price.hostingDetails._f_nightPrice`
  - `type` ("booked", "cancelled", etc.)
  - `partner.name` (plataforma: "API booking.com", "Airbnb", etc.)
  - `partnerCode` (ID externo)
  - `reservationUrl` (URL completa)
  - `stats._f_totalPaid` (valor pago)

#### **Listing Mapper** (`staysnet-listing-mapper.ts`)
- ✅ Novo arquivo criado
- Converte listings (anúncios) para Properties
- Extrai:
  - Nome traduzido (`_mstitle.pt_BR`)
  - Descrição (`_msdesc.pt_BR`)
  - Endereço completo
  - Capacidade (`_i_maxGuests`, `_i_rooms`, `_i_beds`, `_f_bathrooms`)
  - Foto principal (`_t_mainImageMeta.url`)
  - Canais OTA (`otaChannels`)

#### **Guest Mapper** (`staysnet-guest-mapper.ts`)
- ✅ Já existia, mantido
- Extrai telefones, documentos, avaliações de OTA

---

### **2. Função de Importação Completa** (`staysnet-full-sync.ts`)

#### **FASE 1: Importar Hóspedes**
- ✅ Busca hóspedes via `/booking/clients`
- ✅ Mapeia para formato Rendizy
- ✅ Salva no banco SQL (`guests` table)
- ✅ Cria mapa `clientId -> guestId` para usar nas reservas

#### **FASE 2: Importar Propriedades (Listings)**
- ✅ Busca listings via `/content/listings`
- ✅ Filtra por propriedades selecionadas (se fornecido)
- ✅ Converte para Properties
- ✅ Salva no banco SQL (`properties` table)
- ✅ Cria mapa `listingId -> propertyId` para usar nas reservas

#### **FASE 3: Importar Reservas**
- ✅ Busca reservas de `2025-01-01` até `2026-12-31`
- ✅ Mapeia usando os maps criados nas fases anteriores
- ✅ Salva no banco SQL (`reservations` table)
- ✅ Inclui campos extras de OTA (external_ids, ota_reviews, ota_ratings)

#### **Estatísticas de Sincronização**
```typescript
interface SyncStats {
  guests: { fetched: number; created: number; updated: number; failed: number };
  properties: { fetched: number; created: number; updated: number; failed: number };
  reservations: { fetched: number; created: number; updated: number; failed: number };
  errors: string[];
}
```

---

### **3. Rotas Backend**

#### **POST `/staysnet/sync/reservations`**
- ✅ Atualizado para salvar no banco (não apenas retornar dados)
- ✅ Usa `fullSyncStaysNet` para importar reservas
- ✅ Retorna estatísticas de importação

#### **POST `/staysnet/import/full`** (NOVO)
- ✅ Importação completa: hóspedes + propriedades + reservas
- ✅ Aceita `selectedPropertyIds` (array) para filtrar propriedades
- ✅ Retorna estatísticas detalhadas

---

## ⏳ PENDENTE

### **1. Sincronização Automática (Polling a cada 1 minuto)**

**Objetivo:**
- Verificar reservas novas
- Verificar reservas canceladas
- Atualizar calendário automaticamente

**Implementação:**
```typescript
// Criar: supabase/functions/rendizy-server/sync/staysnet-auto-sync.ts
// Usar: setInterval ou cron job no Supabase
```

**Estratégia:**
1. Criar Edge Function separada para sincronização automática
2. Usar Supabase Cron Jobs (pg_cron) ou
3. Usar polling no frontend (menos ideal)

---

### **2. Interface Frontend**

**Localização:** `Configuração > Integrações > Stays.net`

**Componente:** `StaysNetIntegrationSettings.tsx`

**Funcionalidades:**
- ✅ Botão "Importar Dados"
- ⏳ Modal de importação com:
  - Checkboxes para selecionar propriedades
  - Botões: "Importar Hóspedes", "Importar Propriedades", "Importar Reservas", "Importar Tudo"
  - Barra de progresso
  - Exibição de estatísticas após importação

---

### **3. Exibição de Reservas no Calendário**

**Verificar:**
- ✅ Reservas já aparecem no calendário (via `calendarApi.getData()`)
- ⏳ Verificar se reservas importadas aparecem corretamente
- ⏳ Verificar se cancelamentos são refletidos no calendário

---

## 🔍 CAMPOS FALTANTES IDENTIFICADOS

### **Reservations Table:**
- ✅ `check_in_time` / `check_out_time` (adicionados)
- ✅ `external_ids` (JSONB) - IDs de OTA
- ✅ `external_urls` (JSONB) - URLs de OTA
- ✅ `ota_reviews` (JSONB) - Avaliações de OTA
- ✅ `ota_ratings` (JSONB) - Ratings de OTA

### **Properties Table:**
- ✅ `ota_metadata` (JSONB) - Metadados de OTA (superhost, verified, etc.)

### **Guests Table:**
- ✅ `external_ids` (JSONB) - IDs de OTA
- ✅ `ota_reviews` (JSONB) - Avaliações de OTA
- ✅ `ota_ratings` (JSONB) - Ratings de OTA

---

## 📝 PRÓXIMOS PASSOS

1. **Testar importação completa:**
   ```bash
   POST /staysnet/import/full
   Body: { "selectedPropertyIds": [] } // ou array de IDs
   ```

2. **Verificar dados no banco:**
   - Verificar tabela `reservations`
   - Verificar tabela `guests`
   - Verificar tabela `properties`

3. **Implementar sincronização automática**

4. **Criar interface frontend**

5. **Testar exibição no calendário**

---

**Última atualização:** 22/11/2025  
**Próxima etapa:** Testar importação completa e implementar sincronização automática

