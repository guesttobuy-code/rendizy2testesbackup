# Funcionalidades Detalhadas - Funil de Serviços
## Parte 3: Produtos e Relacionamentos

---

## 💰 7. PRODUTOS E ORÇAMENTO

### 7.1. Seção de Produtos na Aba Detalhes
**Onde aparece:** Aba "Detalhes", seção "Produtos / Orçamento"
**Elementos visuais:**
- Título: "Produtos / Orçamento" com ícone Package
- Componente TicketProductsManager
- Se não houver produtos:
  - Mensagem: "Nenhum produto adicionado"
  - Botão "+ Adicionar produto"
- Se houver produtos:
  - Total do orçamento (card)
  - Lista de produtos
  - Botão "Adicionar" no header
  - Toggle "Visível/Oculto"

**Comportamento:**
- Adicionar, editar, excluir produtos
- Calcular total automaticamente
- Ocultar/mostrar produtos

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Produtos / Orçamento 📦            │
├─────────────────────────────────────┤
│ Products [👁️ Visível]              │
│ R$ 12.000,00                        │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Manutenção AC (2x)          │   │
│ │ R$ 6.000,00 cada = R$ 12k   │   │
│ │ Descrição...                 │   │
│ │ [Editar] [🗑️]               │   │
│ └─────────────────────────────┘   │
│                                     │
│ [+ Adicionar]                       │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Seção "Produtos / Orçamento" na aba Detalhes
- ✅ Componente TicketProductsManager renderizado
- ✅ Header com "Products" e toggle Visível/Oculto
- ✅ Total do orçamento formatado em moeda
- ✅ Lista de produtos com detalhes
- ✅ Botão "Adicionar" no header
- ✅ Botão "Editar" em cada produto
- ✅ Botão "Excluir" em cada produto
- ✅ Estado vazio com mensagem e botão
- ✅ Modal para adicionar/editar produto

---

### 7.2. Adicionar/Editar Produto
**Onde aparece:** Modal ao clicar "Adicionar" ou "Editar" produto
**Elementos visuais:**
- Modal com título "Adicionar Produto" ou "Editar Produto"
- Campos:
  - Nome do Produto (obrigatório)
  - Quantidade (number, min: 1)
  - Preço Unitário (number, min: 0, step: 0.01)
  - Descrição (opcional, textarea)
- Botões: Cancelar, Adicionar/Salvar

**Comportamento:**
- Validação de campos
- Salva no array `ticket.products`
- Atualiza total automaticamente

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Adicionar Produto                   │
├─────────────────────────────────────┤
│ Nome do Produto *:                  │
│ [Manutenção de Ar Condicionado]     │
│                                     │
│ Quantidade: [2]                     │
│ Preço Unitário (BRL): [6000.00]     │
│                                     │
│ Descrição (Opcional):               │
│ [Serviço completo...]               │
│                                     │
│ [Cancelar] [Adicionar Produto]      │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Abrir modal ao clicar "Adicionar"
- ✅ Abrir modal ao clicar "Editar" (com dados preenchidos)
- ✅ Campo nome (obrigatório, validação)
- ✅ Campo quantidade (number, min: 1)
- ✅ Campo preço (number, min: 0, step: 0.01)
- ✅ Campo descrição (opcional, textarea)
- ✅ Validação de campos
- ✅ Salvar produto no array `ticket.products`
- ✅ Atualizar produto existente
- ✅ Calcular total automaticamente
- ✅ Fechar modal após salvar
- ✅ Atualizar lista de produtos
- ✅ Toast de sucesso

---

### 7.3. Lista de Produtos
**Onde aparece:** Dentro da seção "Produtos / Orçamento"
**Elementos visuais:**
- Card para cada produto com:
  - Nome e quantidade (ex: "Manutenção AC (2x)")
  - Preço unitário e total (ex: "R$ 6.000,00 cada = R$ 12.000,00")
  - Descrição (se houver)
  - Botões: Editar, Excluir

**Comportamento:**
- Mostra todos os produtos do ticket
- Formatação de moeda
- Cálculo automático de total por produto

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Manutenção AC (2x)                 │
│ R$ 6.000,00 cada = R$ 12.000,00    │
│ Serviço completo de manutenção...   │
│ [Editar] [🗑️]                       │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Renderizar card para cada produto
- ✅ Mostrar nome e quantidade
- ✅ Mostrar preço unitário formatado
- ✅ Mostrar total (preço × quantidade) formatado
- ✅ Mostrar descrição (se houver)
- ✅ Botão "Editar" abre modal com dados
- ✅ Botão "Excluir" remove produto
- ✅ Formatação de moeda (BRL/USD/EUR)
- ✅ Atualizar total do orçamento

---

### 7.4. Total do Orçamento
**Onde aparece:** Header da seção "Produtos / Orçamento"
**Elementos visuais:**
- Texto "Products"
- Toggle "Visível/Oculto" (botão com ícone Eye/EyeOff)
- Valor total formatado (ex: "R$ 12.000,00")
- Se oculto: Mensagem "Produtos ocultos (não visível para clientes)"

**Comportamento:**
- Calculado automaticamente: `products.reduce((total, p) => total + p.price * p.quantity, 0)`
- Formatação baseada em `ticket.currency`
- Oculto quando `hideProducts === true`

**O que deve aparecer na tela:**
```
Products [👁️ Visível]
R$ 12.000,00

OU (se oculto):

Products [👁️‍🗨️ Oculto]
Produtos ocultos (não visível para clientes)
```

**Micro-funcionalidades:**
- ✅ Calcular total: soma de (preço × quantidade) de todos os produtos
- ✅ Formatação de moeda (Intl.NumberFormat)
- ✅ Moeda baseada em `ticket.currency` (BRL/USD/EUR)
- ✅ Toggle "Visível/Oculto" (botão com ícone)
- ✅ Mostrar valor se visível
- ✅ Mostrar mensagem se oculto
- ✅ Atualizar ao adicionar/editar/excluir produto

---

### 7.5. Função Ocultar Produtos
**Onde aparece:** Toggle na seção de produtos e no header do ticket
**Elementos visuais:**
- Botão toggle com ícone Eye (visível) ou EyeOff (oculto)
- Texto "Visível" ou "Oculto"
- Quando oculto:
  - Valor total não aparece no header do ticket
  - Seção mostra mensagem "Produtos ocultos"
  - Botão "Adicionar" fica oculto

**Comportamento:**
- Alterna entre `hideProducts: true/false`
- Quando oculto, valores não são visíveis para clientes
- Produtos permanecem salvos, apenas não exibidos

**O que deve aparecer na tela:**
```
No header do ticket (quando oculto):
[Valor total NÃO aparece]

Na seção de produtos (quando oculto):
┌─────────────────────────────────────┐
│ Products [👁️‍🗨️ Oculto]            │
│ Produtos ocultos (não visível...)   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 👁️‍🗨️                        │   │
│ │ Produtos ocultos             │   │
│ │ Os produtos e valores não... │   │
│ │ [Mostrar produtos]           │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Toggle "Visível/Oculto" na seção de produtos
- ✅ Ícone Eye quando visível
- ✅ Ícone EyeOff quando oculto
- ✅ Ao clicar, alternar `hideProducts`
- ✅ Salvar mudança no ticket
- ✅ Ocultar valor total no header quando `hideProducts === true`
- ✅ Mostrar mensagem "Produtos ocultos" na seção
- ✅ Ocultar botão "Adicionar" quando oculto
- ✅ Botão "Mostrar produtos" quando oculto
- ✅ Condição no header: `ticket.products && ticket.products.length > 0 && (ticket.hideProducts !== true)`

---

### 7.6. Valor Total no Header
**Onde aparece:** Header do ticket, abaixo dos badges (status e prioridade)
**Elementos visuais:**
- Texto "Products" (text-sm, text-gray-500)
- Valor formatado (text-xl, font-bold)
- Só aparece se:
  - `ticket.products` existe
  - `ticket.products.length > 0`
  - `ticket.hideProducts !== true`

**Comportamento:**
- Calculado automaticamente
- Atualiza quando produtos mudam
- Desaparece quando oculto

**O que deve aparecer na tela:**
```
Implantação teste                    [Salvar como Modelo]
[Pendente] [high]

Products
R$ 12.000,00
```

**Micro-funcionalidades:**
- ✅ Renderizar seção se condições atendidas
- ✅ Texto "Products" (label)
- ✅ Valor formatado em moeda
- ✅ Formatação baseada em `ticket.currency`
- ✅ Cálculo: `products.reduce((total, p) => total + p.price * p.quantity, 0)`
- ✅ Atualizar automaticamente ao mudar produtos
- ✅ Ocultar quando `hideProducts === true`
- ✅ Condição: `ticket.products && ticket.products.length > 0 && (ticket.hideProducts !== true)`

---

## 🔗 8. RELACIONAMENTOS

### 8.1. Pessoas Relacionadas
**Onde aparece:** Aba "Detalhes", seção "Relacionamentos"
**Elementos visuais:**
- Título: "Pessoas Relacionadas" com ícone Users
- Lista de pessoas (chips/badges)
- Cada pessoa mostra:
  - Ícone do tipo (User/UserCircle/Users/ShoppingCart/Store)
  - Nome
  - Email (se houver)
  - Botão X para remover
- Botão "Adicionar pessoas"

**Comportamento:**
- Multi-select de pessoas
- Tipos: user, contact, guest, buyer, seller
- Busca em tempo real

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Pessoas Relacionadas 👥            │
├─────────────────────────────────────┤
│ [👤 João Silva ✕]                  │
│    joao@example.com                 │
│ [👥 Maria Santos ✕]                 │
│    maria@example.com                │
│                                     │
│ [+ Adicionar pessoas]               │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Seção "Pessoas Relacionadas" na aba Detalhes
- ✅ Lista de pessoas como chips/badges
- ✅ Ícone do tipo de pessoa
- ✅ Nome da pessoa
- ✅ Email (se houver)
- ✅ Botão X para remover
- ✅ Botão "Adicionar pessoas" abre PersonSelector
- ✅ PersonSelector com busca
- ✅ Multi-select (múltiplas pessoas)
- ✅ Busca em tempo real
- ✅ Carregar dados reais (usersApi, guestsApi)
- ✅ Salvar no `ticket.relatedPeople`

---

### 8.2. Imóveis Relacionados
**Onde aparece:** Aba "Detalhes", seção "Relacionamentos"
**Elementos visuais:**
- Título: "Imóveis Relacionados" com ícone Home/Building2
- Lista de imóveis (chips/badges)
- Cada imóvel mostra:
  - Nome
  - Código (se houver)
  - Endereço (se houver)
  - Botão X para remover
- Botão "Adicionar imóveis"

**Comportamento:**
- Multi-select de imóveis
- Busca em tempo real

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Imóveis Relacionados 🏠            │
├─────────────────────────────────────┤
│ [🏠 Apartamento 201 ✕]             │
│    Código: APT201                   │
│    Rua das Flores, 123              │
│                                     │
│ [+ Adicionar imóveis]               │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Seção "Imóveis Relacionados" na aba Detalhes
- ✅ Lista de imóveis como chips/badges
- ✅ Nome do imóvel
- ✅ Código (se houver)
- ✅ Endereço (se houver)
- ✅ Botão X para remover
- ✅ Botão "Adicionar imóveis" abre PropertySelector
- ✅ PropertySelector com busca
- ✅ Multi-select (múltiplos imóveis)
- ✅ Busca em tempo real
- ✅ Carregar dados reais (propertiesApi)
- ✅ Salvar no `ticket.relatedProperties`

---

### 8.3. Automações Relacionadas
**Onde aparece:** Aba "Detalhes", seção "Relacionamentos"
**Elementos visuais:**
- Título: "Automações Relacionadas" com ícone Zap
- Lista de automações (chips/badges)
- Cada automação mostra:
  - Nome
  - Descrição (se houver)
  - Botão X para remover
- Botão "Adicionar automações"

**Comportamento:**
- Multi-select de automações
- Busca em tempo real

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Automações Relacionadas ⚡          │
├─────────────────────────────────────┤
│ [⚡ Notificação Check-in ✕]         │
│    Envia notificação quando...      │
│                                     │
│ [+ Adicionar automações]             │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Seção "Automações Relacionadas" na aba Detalhes
- ✅ Lista de automações como chips/badges
- ✅ Nome da automação
- ✅ Descrição (se houver)
- ✅ Botão X para remover
- ✅ Botão "Adicionar automações" abre AutomationSelector
- ✅ AutomationSelector com busca
- ✅ Multi-select (múltiplas automações)
- ✅ Busca em tempo real
- ✅ Carregar dados reais (automationsApi)
- ✅ Salvar no `ticket.relatedAutomations`

---

### 8.4. Seletores Multi-Select
**Onde aparece:** Modal ao clicar "Adicionar pessoas/imóveis/automações"
**Elementos visuais:**
- Modal com título específico
- Campo de busca no topo
- Lista de itens disponíveis
- Checkbox ao lado de cada item
- Botões: Cancelar, Adicionar

**Comportamento:**
- Busca filtra lista em tempo real
- Seleção múltipla com checkboxes
- Adiciona itens selecionados ao ticket

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Adicionar Pessoas                  │
├─────────────────────────────────────┤
│ [🔍 Buscar...]                      │
│                                     │
│ ☑ 👤 João Silva                     │
│    joao@example.com                 │
│ ☐ 👥 Maria Santos                   │
│    maria@example.com                │
│                                     │
│ [Cancelar] [Adicionar (2)]          │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Modal com título específico
- ✅ Campo de busca no topo
- ✅ Busca em tempo real (filtra lista)
- ✅ Lista de itens com checkbox
- ✅ Checkbox para seleção múltipla
- ✅ Contador de itens selecionados
- ✅ Botão "Adicionar (X)" com contador
- ✅ Adicionar itens selecionados ao ticket
- ✅ Fechar modal após adicionar
- ✅ Atualizar lista de relacionamentos

---

---

## 📊 RESUMO DA VERIFICAÇÃO - PARTE 3

### ✅ VERIFICADO (via código)

1. **Estrutura de Produtos**
   - ✅ Interface `ServiceTicketProduct` definida
   - ✅ Campo `products?: ServiceTicketProduct[]` em `ServiceTicket`
   - ✅ Campo `hideProducts?: boolean` em `ServiceTicket`
   - ✅ Componente `TicketProductsManager` criado
   - ✅ Integrado em `ServicesTicketDetailLeft.tsx`

2. **Valor Total no Header**
   - ✅ Código implementado em `ServicesTicketDetailLeft.tsx`
   - ✅ Condição: `ticket.products && ticket.products.length > 0 && (ticket.hideProducts !== true)`
   - ✅ Formatação de moeda implementada
   - ✅ Cálculo automático implementado

### ⚠️ PRECISA TESTAR/VERIFICAR (visualmente)

1. **Seção de Produtos na Aba Detalhes**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Seção "Produtos / Orçamento" aparece
   - ⚠️ Componente TicketProductsManager renderizado
   - ⚠️ Header com toggle Visível/Oculto
   - ⚠️ Total do orçamento formatado
   - ⚠️ Lista de produtos

2. **Valor Total no Header do Ticket**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Valor total aparece abaixo do título
   - ⚠️ Formatação correta (R$ 12.000,00)
   - ⚠️ Só aparece se `hideProducts !== true`

3. **Adicionar/Editar Produto**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Modal abre ao clicar "Adicionar"
   - ⚠️ Modal abre ao clicar "Editar" (com dados)
   - ⚠️ Validação de campos
   - ⚠️ Salvar produto

4. **Toggle Ocultar/Mostrar Produtos**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Botão toggle aparece
   - ⚠️ Ícone Eye/EyeOff muda
   - ⚠️ Produtos desaparecem quando oculto
   - ⚠️ Mensagem "Produtos ocultos" aparece

5. **Relacionamentos**
   - ⚠️ PersonSelector (não visível no modal de criação)
   - ⚠️ PropertySelector (não visível no modal de criação)
   - ⚠️ AutomationSelector ✅ **VERIFICADO: Aparece no modal**

### 🔍 PRÓXIMAS AÇÕES

1. Resolver problema de abrir ticket
2. Verificar seção de produtos na aba Detalhes
3. Verificar valor total no header
4. Testar adicionar/editar produto
5. Testar toggle ocultar/mostrar produtos
6. Fazer scroll no modal de criação para ver PersonSelector e PropertySelector

---

**FIM DA PARTE 3**

