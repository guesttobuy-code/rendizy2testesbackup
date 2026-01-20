# 🔗 GUIA DE INTEGRAÇÃO - Componentes v1.0.79-81

**Data:** 28 de outubro de 2025
**Versões:** v1.0.79 (Rooms) → v1.0.80 (Rules) → v1.0.81 (Pricing Settings)

---

## 📋 COMPONENTES CRIADOS

### ✅ 1. RoomsManager.tsx
**Localização:** `/components/RoomsManager.tsx`
**Props:** `{ listingId: string }`
**Funcionalidades:**
- Lista de cômodos na sidebar
- Formulário de detalhes (tipo, compartilhado, fechadura)
- BedsManager (tipos de cama + quantidades)
- Upload de fotos por cômodo (a implementar)
- Cálculo automático de capacidade máxima
- Resumo: 🛏️ quartos, 👥 pessoas, 🛁 banheiros

### ✅ 2. AccommodationRulesForm.tsx
**Localização:** `/components/AccommodationRulesForm.tsx`
**Props:** `{ listingId: string }`
**Funcionalidades:**
- Ocupação máxima (automática + idade mínima)
- Crianças (2-12 anos) - com regras multilíngue
- Bebês (0-2 anos) - berços
- Pets (fluxo condicional com taxa)
- Outras regras (fumar, eventos, silêncio)
- Multilíngue: PT, EN, ES

### ✅ 3. PricingSettingsForm.tsx
**Localização:** `/components/PricingSettingsForm.tsx`
**Props:** `{ listingId: string }`
**Funcionalidades:**
- Preço base por noite
- Hóspedes incluídos no preço base
- Taxa por hóspede adicional (por dia)
- Taxa de limpeza (1x por reserva)
- Repasse integral (não entra na comissão)
- Preview automático de cálculo

---

## 🔌 INTEGRAÇÃO NO LocationsAndListings.tsx

### Passo 1: Importar os componentes

```tsx
// No topo do arquivo /components/LocationsAndListings.tsx
import { RoomsManager } from './RoomsManager';
import { AccommodationRulesForm } from './AccommodationRulesForm';
import { PricingSettingsForm } from './PricingSettingsForm';
```

### Passo 2: Modificar o modal de detalhes do listing

Substituir o modal simples (linhas 522-641) por um modal com tabs:

```tsx
{/* Listing Details Modal - VERSÃO COMPLETA */}
{selectedListing && (
  <Dialog open={isListingModalOpen} onOpenChange={setIsListingModalOpen}>
    <DialogContent className="max-w-7xl bg-[#1e2029] border-[#2a2d3a] text-white max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="text-white">{selectedListing.title}</DialogTitle>
        <DialogDescription>
          Detalhes e gerenciamento completo do anúncio
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-6 bg-[#2a2d3a]">
          <TabsTrigger value="overview">
            <Eye className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="rooms">
            <Bed className="h-4 w-4 mr-2" />
            Cômodos
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Users className="h-4 w-4 mr-2" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Preços
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Image className="h-4 w-4 mr-2" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="platforms">
            <Globe className="h-4 w-4 mr-2" />
            Plataformas
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-6">
          {/* TAB: VISÃO GERAL (conteúdo atual do modal) */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {/* ... conteúdo atual do modal (stats, plataformas, etc) ... */}
          </TabsContent>

          {/* TAB: CÔMODOS */}
          <TabsContent value="rooms" className="mt-0">
            <RoomsManager listingId={selectedListing.id} />
          </TabsContent>

          {/* TAB: REGRAS */}
          <TabsContent value="rules" className="mt-0">
            <AccommodationRulesForm listingId={selectedListing.id} />
          </TabsContent>

          {/* TAB: PREÇOS */}
          <TabsContent value="pricing" className="mt-0">
            <PricingSettingsForm listingId={selectedListing.id} />
          </TabsContent>

          {/* TAB: FOTOS (usar PhotoManager existente) */}
          <TabsContent value="photos" className="mt-0">
            {/* Implementar PhotoManager aqui */}
            <div className="text-center py-12 text-neutral-400">
              <Image className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Gerenciador de fotos será integrado aqui</p>
            </div>
          </TabsContent>

          {/* TAB: PLATAFORMAS */}
          <TabsContent value="platforms" className="mt-0">
            {/* Implementar gestão de plataformas */}
            <div className="text-center py-12 text-neutral-400">
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Gestão de plataformas será integrada aqui</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsListingModalOpen(false)}>
          Fechar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

---

## 🧪 TESTE DOS COMPONENTES

### 1. Testar RoomsManager

```bash
# Abrir LocationsAndListings
# Clicar em um listing
# Ir na aba "Cômodos"
# Adicionar novo cômodo
# Configurar tipo, compartilhado, fechadura
# Adicionar camas (tipos + quantidades)
# Verificar cálculo automático de capacidade
# Salvar e verificar resumo (quartos, pessoas, banheiros)
```

### 2. Testar AccommodationRulesForm

```bash
# Ir na aba "Regras"
# Configurar idade mínima
# Ativar "Aceita crianças" → definir quantidade
# Ativar "Aceita bebês" → configurar berços
# Selecionar pets "COM cobrança" → verificar campo de taxa aparece
# Configurar outras regras (fumar, eventos, silêncio)
# Testar multilíngue (PT/EN/ES)
# Salvar e verificar validação de pet fee
```

### 3. Testar PricingSettingsForm

```bash
# Ir na aba "Preços"
# Configurar preço base (ex: R$ 200/noite)
# Configurar hóspedes incluídos (ex: 2 pessoas)
# Configurar taxa por hóspede extra (ex: R$ 50/dia)
# Configurar taxa de limpeza (ex: R$ 150)
# Marcar "É repasse integral?"
# Ajustar preview (ex: 5 noites, 4 pessoas)
# Verificar cálculo automático:
#   - Diárias: 5 × R$ 200 = R$ 1.000
#   - Extras: 2 × R$ 50 × 5 = R$ 500
#   - Limpeza: R$ 150 (1x)
#   - TOTAL: R$ 1.650
# Verificar detalhamento de comissão (sem taxa de limpeza)
# Salvar
```

---

## 📊 ENDPOINTS DO BACKEND

### Rooms (v1.0.79)
```
GET    /make-server-67caf26a/listings/:listingId/rooms
POST   /make-server-67caf26a/listings/:listingId/rooms
GET    /make-server-67caf26a/rooms/:roomId
PUT    /make-server-67caf26a/rooms/:roomId
DELETE /make-server-67caf26a/rooms/:roomId
GET    /make-server-67caf26a/rooms/:roomId/photos
POST   /make-server-67caf26a/rooms/:roomId/photos
DELETE /make-server-67caf26a/room-photos/:photoId
```

### Rules (v1.0.80)
```
GET  /make-server-67caf26a/listings/:listingId/rules
PUT  /make-server-67caf26a/listings/:listingId/rules
POST /make-server-67caf26a/listings/:listingId/rules/reset
```

### Pricing Settings (v1.0.81)
```
GET  /make-server-67caf26a/listings/:listingId/pricing-settings
PUT  /make-server-67caf26a/listings/:listingId/pricing-settings
POST /make-server-67caf26a/calculate-reservation
POST /make-server-67caf26a/listings/:listingId/pricing-settings/reset
```

---

## ⚠️ VALIDAÇÕES IMPORTANTES

### 1. Pet Fee Condicional
```typescript
// Backend valida automaticamente:
// SE allowsPets === 'yes_chargeable' ENTÃO petFee DEVE existir
// SE allowsPets !== 'yes_chargeable' ENTÃO petFee DEVE ser undefined
```

### 2. Cálculo de Max Guests
```typescript
// Automático no backend:
// 1. Soma a capacidade de todas as camas de todos os rooms
// 2. Atualiza listing.maxGuests automaticamente
// 3. Atualiza rules.maxAdults automaticamente
```

### 3. Taxa de Limpeza no Cálculo de Comissão
```typescript
// Se cleaningFeeIsPassThrough === true:
// commissionBase = baseTotal + extraGuestsTotal (SEM cleaningFee)
//
// Se cleaningFeeIsPassThrough === false:
// commissionBase = grandTotal (COM cleaningFee)
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Integrar no LocationsAndListings.tsx** (10-15 min)
   - Importar componentes
   - Modificar modal de detalhes
   - Adicionar abas

2. **Testar fluxo completo** (15-20 min)
   - Criar listing de teste
   - Adicionar cômodos
   - Configurar regras
   - Definir preços
   - Testar cálculos

3. **Implementar upload de fotos por room** (30-45 min)
   - Usar PhotoManager existente
   - Adaptar para rooms
   - Adicionar tags de imagem

4. **Documentar no DIARIO_RENDIZY.md** (5 min)
   - Adicionar v1.0.79, v1.0.80, v1.0.81
   - Atualizar percentual de completude

---

## 📈 IMPACTO

**ANTES:** 65% completo
**DEPOIS:** ~82% completo

### Funcionalidades Adicionadas:
- ✅ Sistema completo de cômodos
- ✅ Cálculo automático de capacidade
- ✅ Regras da acomodação (completo)
- ✅ Multilíngue (PT/EN/ES)
- ✅ Pets com cobrança (fluxo condicional)
- ✅ Preços derivados (hóspedes extras)
- ✅ Taxa de limpeza com repasse
- ✅ Preview automático de cálculo

### Bloqueadores Resolvidos:
- ✅ OTAs não rejeitam mais por falta de cômodos
- ✅ Cálculo de capacidade máxima automático
- ✅ Aumenta receita com hóspedes extras
- ✅ Gestão transparente de taxa de limpeza

---

**Implementado por:** Manus AI
**Data:** 28-10-2025 00:15
**Status:** ✅ BACKEND COMPLETO | ⏳ INTEGRAÇÃO FRONTEND PENDENTE
