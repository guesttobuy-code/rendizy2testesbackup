# 🎯 ROADMAP: Experiência do Hóspede Unificada v2.0

> **Data**: 2026-01-13  
> **Autor**: GitHub Copilot + Rafael  
> **Status**: Em Implementação

---

## 📋 Problemas Identificados

### 1. ❌ Login Desconectado (Site ↔ Guest-Area)
- Usuário logado no guest-area (Gmail OAuth) não é reconhecido no site medhome
- Botão "Faça Login" continua aparecendo mesmo logado
- **Causa**: Tokens de autenticação são separados entre os sistemas

### 2. ❌ Dados Duplicados no Checkout
- Mesmo logado, o site pede Nome, Email, Telefone novamente
- Deveria auto-preencher com dados do perfil do guest
- **Causa**: Formulário de reserva não consulta dados do guest logado

### 3. ❌ Status Incorreto da Reserva
- Reserva criada como "confirmed" antes do pagamento
- Deveria ser "pending" até confirmação do Stripe webhook
- **Causa**: Lógica de criação de reserva não distingue pré-reserva de reserva confirmada

### 4. ❌ Métodos de Pagamento Não Salvos
- Usuário precisa inserir dados do cartão toda vez
- Apps modernos salvam métodos de pagamento (Stripe Customer + PaymentMethods)
- **Causa**: Não há vínculo entre guest e Stripe Customer ID

---

## 🛠️ Soluções Propostas

### Fase 1: Autenticação Unificada (SSO) ⭐ PRIORITÁRIO

#### 1.1 Sincronizar Token entre Site e Guest-Area
```
Site MedHome ←→ LocalStorage ←→ Guest-Area Capsule
                    ↓
            rendizy-guest-token (JWT)
```

**Implementação**:
- Site lê `rendizy-guest-token` do localStorage
- Se existir, chama `/auth/validate` para obter dados do guest
- Header mostra avatar + nome ou "Faça Login"

**Arquivos a alterar**:
- `client-sites/bolt-template/src/App.tsx` - Verificar token no mount
- `client-sites/bolt-template/src/components/Header.tsx` - Mostrar estado logado
- `api/site.js` - Patch para injetar verificação de token

#### 1.2 Unificar Sistema de Login
- Botão "Faça Login" no site redireciona para guest-area login
- Após login, volta para o site com token no localStorage
- Guest-area já implementa Google OAuth

---

### Fase 2: Auto-Preenchimento de Dados

#### 2.1 Formulário de Reserva Inteligente
```javascript
// Se logado, buscar dados do guest
const guestData = await fetchGuestProfile(token);
if (guestData) {
  setFormData({
    name: guestData.name,
    email: guestData.email,
    phone: guestData.phone
  });
  // Pular para step de pagamento
}
```

**Arquivos a alterar**:
- `PropertyPage.tsx` ou equivalente - Formulário de reserva
- `rendizy-public/index.ts` - Endpoint `/guest/profile`

#### 2.2 Novo Fluxo de Checkout
```
[Usuário Logado]
    ↓
[Seleciona Datas] → [Confirma Dados (readonly)] → [Pagamento] → [Pré-Reserva Pending]
    
[Usuário Não Logado]  
    ↓
[Seleciona Datas] → [Preenche Dados] → [Pagamento] → [Pré-Reserva Pending + Guest Criado]
```

---

### Fase 3: Status de Reserva Correto

#### 3.1 Fluxo de Reserva com Pagamento
```
1. Usuário clica "Reservar Agora"
2. Cria PRÉ-RESERVA com status = "pending_payment"
3. Redireciona para Stripe Checkout
4. Stripe Webhook confirma pagamento
5. Atualiza reserva para status = "confirmed"
6. Envia email de confirmação
```

**Arquivos a alterar**:
- `rendizy-public/index.ts` - Criar endpoint `/reservations/create-checkout`
- `rendizy-server/index.ts` - Webhook handler atualiza status
- Database: Adicionar status `pending_payment` se não existir

#### 3.2 Estados da Reserva
| Status | Descrição |
|--------|-----------|
| `pending_payment` | Aguardando pagamento (pré-reserva) |
| `confirmed` | Pagamento confirmado |
| `cancelled` | Cancelada (timeout ou usuário) |
| `completed` | Check-out realizado |

---

### Fase 4: Métodos de Pagamento Salvos

#### 4.1 Vincular Guest ao Stripe Customer
```javascript
// Na primeira compra ou no login
if (!guest.stripe_customer_id) {
  const customer = await stripe.customers.create({
    email: guest.email,
    name: guest.name,
    metadata: { guest_id: guest.id }
  });
  await updateGuest(guest.id, { stripe_customer_id: customer.id });
}
```

#### 4.2 Listar Métodos de Pagamento Salvos
```javascript
// No checkout
const paymentMethods = await stripe.paymentMethods.list({
  customer: guest.stripe_customer_id,
  type: 'card'
});
// Mostrar cards salvos com últimos 4 dígitos
```

**Arquivos a alterar**:
- Database: Adicionar coluna `stripe_customer_id` na tabela `guests`
- `rendizy-public/index.ts` - Endpoint `/payment-methods/list`
- `rendizy-server/index.ts` - Endpoint `/payment-methods/save`

---

## 📝 Changelog para Prompt de IA (Versionamento)

### v1.1.0 - Autenticação Unificada
```markdown
## Requisitos de Autenticação
- Site deve verificar `rendizy-guest-token` no localStorage ao carregar
- Se token válido, Header mostra avatar e nome do usuário
- Botão "Faça Login" redireciona para `/guest-area/?returnUrl=...`
- Após login bem-sucedido, retorna para URL original
```

### v1.2.0 - Checkout Inteligente
```markdown
## Requisitos de Checkout
- Se usuário logado, auto-preencher Nome, Email, Telefone
- Campos auto-preenchidos são readonly (editável via "Editar Perfil")
- Mostrar "Olá, [Nome]! Confirme os dados abaixo"
- Skip para step de pagamento se dados completos
```

### v1.3.0 - Status de Reserva
```markdown
## Fluxo de Reserva
- Reserva inicial tem status "pending_payment"
- Mostrar "Pré-Reserva Confirmada - Aguardando Pagamento"
- Webhook do Stripe atualiza para "confirmed"
- Timeout de 30 min cancela pré-reserva sem pagamento
```

### v1.4.0 - Pagamentos Salvos
```markdown
## Métodos de Pagamento
- Guest pode salvar cartões para futuras reservas
- No checkout, mostrar "Usar cartão salvo •••• 4242" ou "Novo cartão"
- Stripe Customer vinculado ao guest.id
```

---

## 🚀 Plano de Execução

### Sprint 1 (Hoje - Imediato)
- [x] ~~Corrigir redirect área interna~~
- [ ] **1.1** Patch no site para verificar token e mostrar estado logado
- [ ] **3.1** Alterar criação de reserva para status "pending_payment"
- [ ] **3.1** Alterar mensagem de "Reserva Confirmada" → "Pré-Reserva"

### Sprint 2 (Próximos dias)
- [ ] **1.2** Implementar fluxo de login unificado
- [ ] **2.1** Auto-preenchimento de dados no checkout
- [ ] **2.2** Novo fluxo de checkout para usuários logados

### Sprint 3 (Semana seguinte)
- [ ] **4.1** Vincular guest ao Stripe Customer
- [ ] **4.2** Listar e usar métodos de pagamento salvos

---

## 📌 Notas de Implementação

### Alterações Diretas no Site MedHome
> ⚠️ Autorizado por Rafael em 2026-01-13

Como o site medhome está publicado via Storage e servido pelo proxy `api/site.js`, 
as alterações serão feitas de duas formas:

1. **Patches em tempo real** no `api/site.js` (modificações urgentes)
2. **Rebuild do bundle** quando necessário mudanças maiores

Cada patch será documentado aqui para inclusão no prompt de criação de sites.

---

## 🔧 Patches Aplicados

### Patch #1 - InternalAreaPage Redirect (2026-01-13)
```javascript
// api/site.js - Linha ~290
// Redireciona área interna para guest-area capsule
function s1(){k.useEffect(()=>{
  window.location.href='https://rendizy2testesbackup.vercel.app/guest-area/?slug=medhome&...';
},[]);...
```
**Impacto no Prompt**: Sites devem ter área interna que redireciona para guest-area capsule.

### Patch #2 - Token Check & Header State (A IMPLEMENTAR)
```javascript
// Verificar token no carregamento
// Mostrar estado logado no header
```

### Patch #3 - Reservation Status (A IMPLEMENTAR)
```javascript
// Alterar status inicial para pending_payment
// Alterar mensagem de confirmação
```

