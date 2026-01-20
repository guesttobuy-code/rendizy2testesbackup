# 🔍 Verificação: Cápsulas de Módulos do Menu Lateral

**Data:** 2025-11-30  
**Status:** ⚠️ **ITENS SEM CÁPSULAS IDENTIFICADOS**

---

## ✅ ITENS DO MENU QUE JÁ TÊM CÁPSULAS

### **Principal:**
- ✅ `admin-master` → `/admin` → `AdminMasterModule` ✅
- ✅ `painel-inicial` → `/dashboard` → `DashboardModule` ✅
- ✅ `calendario` → `/calendario` → `CalendarModule` ✅
- ✅ `central-reservas` → `/reservations` → `ReservationsModule` ✅
- ✅ `central-mensagens` → `/chat` → `ChatModule` ✅
- ✅ `imoveis` → `/properties` → `PropertiesModule` ⚠️ **VERIFICAR SE ESTÁ USANDO**
- ✅ `motor-reservas` → `/sites-clientes` → ❌ **SEM CÁPSULA (JSX direto)**
- ✅ `precos-em-lote` → `/pricing` → ❌ **SEM CÁPSULA (JSX direto)**
- ✅ `promocoes` → ❌ **SEM ROTA DEFINIDA**
- ✅ `financeiro` → `/financeiro/*` → `FinanceiroModule` ✅

### **Operacional:**
- ✅ `usuarios-hospedes` → ❌ **SEM ROTA DEFINIDA**
- ✅ `notificacoes` → ❌ **SEM ROTA DEFINIDA**
- ✅ `catalogo` → ❌ **SEM ROTA DEFINIDA**

### **Módulos Avançados:**
- ✅ `modulo-financeiro` → `/financeiro` → `FinanceiroModule` ✅
- ✅ `modulo-crm-tasks` → `/crm` → `CRMTasksModule` ✅
- ✅ `modulo-automacoes` → `/crm/automacoes-lab` → ✅ (dentro do CRM)
- ✅ `modulo-bi` → `/bi` → `BIModule` ✅

### **Avançado:**
- ✅ `app-center` → ❌ **SEM ROTA DEFINIDA**
- ✅ `configuracoes` → `/settings` → `SettingsModule` ✅
- ✅ `assistentes` → ❌ **SEM ROTA DEFINIDA**

---

## ❌ ITENS QUE PRECISAM DE CÁPSULAS

### **1. Preços em Lote (`precos-em-lote`)**
- **Rota atual:** `/pricing`
- **Status:** ❌ JSX direto no `App.tsx`
- **Componente usado:** `BulkPricingManager`
- **Ação:** Criar `PricingModule.tsx`

### **2. Integrações Booking.com (`integracoes-bookingcom`)**
- **Rota atual:** `/integrations`
- **Status:** ❌ JSX direto no `App.tsx`
- **Componente usado:** `BookingComIntegration`
- **Ação:** Criar `IntegrationsModule.tsx`

### **3. Edição de Site (`motor-reservas`)**
- **Rota atual:** `/sites-clientes`
- **Status:** ❌ JSX direto no `App.tsx`
- **Componente usado:** `ClientSitesManager`
- **Ação:** Criar `ClientSitesModule.tsx`

### **4. Locais e Anúncios (`imoveis`)**
- **Rota atual:** `/properties`
- **Status:** ⚠️ **VERIFICAR** se `PropertiesModule` existe e está sendo usado
- **Componente usado:** `PropertiesManagement`
- **Ação:** Verificar se `PropertiesModule` existe, se não, criar

### **5. Rotas de Properties (sub-rotas)**
- `/properties/new` → ❌ JSX direto
- `/properties/:id/edit` → ❌ JSX direto
- `/properties/:id/diagnostico` → ❌ JSX direto
- **Ação:** Essas devem estar dentro do `PropertiesModule`

---

## 📋 ITENS SEM ROTAS DEFINIDAS

Estes itens aparecem no menu mas não têm rotas no `App.tsx`:

1. **`promocoes`** - Promoções
2. **`usuarios-hospedes`** - Usuários e Clientes (tem submenu)
3. **`notificacoes`** - Notificações
4. **`catalogo`** - Catálogo (tem submenu)
5. **`app-center`** - Loja de apps
6. **`assistentes`** - Suporte (tem submenu)

**Ação:** Decidir se:
- Criar cápsulas para esses itens
- Ou remover do menu se não estão implementados

---

## 🎯 PRIORIDADE DE CORREÇÃO

### **Alta Prioridade (afetam funcionalidades existentes):**
1. ✅ Criar `PricingModule` para `/pricing`
2. ✅ Criar `IntegrationsModule` para `/integrations`
3. ✅ Criar `ClientSitesModule` para `/sites-clientes`
4. ⚠️ Verificar `PropertiesModule` para `/properties`

### **Média Prioridade:**
5. Criar cápsulas para itens sem rotas (se forem implementar)

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Adicionar seção de cápsulas como REGRA DE OURO no `Ligando os motores.md` (CONCLUÍDO)
2. 🔄 Criar cápsulas faltantes (PricingModule, IntegrationsModule, ClientSitesModule)
3. 🔄 Verificar se PropertiesModule está sendo usado corretamente
4. 🔄 Decidir sobre itens sem rotas (criar ou remover do menu)

---

**Última atualização:** 2025-11-30 21:20
