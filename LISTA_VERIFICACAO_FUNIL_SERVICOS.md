# Lista de Verificação - Funil de Serviços

## Funcionalidades Implementadas e Status de Teste

### ✅ 1. Estrutura Básica do Funil
- [x] Criação e edição de funis
- [x] Seleção de funil ativo
- [x] Etapas do funil (stages)
- [x] Status configuráveis (Resolvido, Não Resolvido, Em Análise)
- [x] Funis globais (Default Global) - apenas super_admin

### ✅ 2. Tickets de Serviço
- [x] Criação de tickets
- [x] Visualização Kanban
- [x] Visualização Lista
- [x] Busca de tickets
- [x] Drag & drop entre etapas
- [x] Detalhes do ticket (modal/split-view)

### ✅ 3. Tarefas (Tasks)
- [x] Adicionar tarefas
- [x] Tipos de tarefa (STANDARD, FORM, ATTACHMENT)
- [x] Tarefas vinculadas à etapa do funil (wizard-like)
- [x] Subtarefas
- [x] Atribuição de pessoas
- [x] Data de vencimento
- [x] Status (TODO, IN_PROGRESS, COMPLETED)
- [x] Drag & drop para reordenar
- [x] Progresso automático baseado em tarefas completas

### ✅ 4. Produtos e Orçamento
- [x] Adicionar produtos ao ticket
- [x] Quantidade e preço por produto
- [x] Cálculo automático do total
- [x] Formatação de moeda (BRL, USD, EUR)
- [x] **OCULTAR PRODUTOS** - Função para ocultar valores
- [ ] **VERIFICAR: Valor total aparece no header do ticket?**
- [ ] **VERIFICAR: Seção de produtos aparece na aba Detalhes?**

### ✅ 5. Relacionamentos
- [x] Pessoas relacionadas (usuários, contatos, hóspedes, compradores, vendedores)
- [x] Imóveis relacionados
- [x] Automações relacionadas
- [x] Seletores com busca avançada

### ✅ 6. Templates
- [x] Criar template a partir de ticket
- [x] Criar ticket a partir de template
- [x] Templates globais (Default Global)
- [x] Lista de templates separada (globais vs. organização)

### ✅ 7. Funcionalidades Avançadas
- [x] Salvar como modelo
- [x] Progresso visual (barras de progresso)
- [x] Filtro de tarefas por etapa
- [x] Tags
- [x] Comentários em tarefas
- [x] Upload de arquivos
- [x] Formulários em tarefas

### ❌ PROBLEMAS IDENTIFICADOS

#### 1. Valor Total de Produtos no Header
**Status:** ❌ NÃO APARECE (mesmo com produtos no mock)
**Localização:** Abaixo do nome do ticket e badges (pendente, high)
**Código:** `ServicesTicketDetailLeft.tsx` linha ~258-272
**Problema:** 
- Ticket mock foi atualizado com produtos: `{ id: 'prod1', name: 'Manutenção de ar condicionado', quantity: 2, price: 6000 }`
- Total esperado: R$ 12.000,00
- Condição: `ticket.products && ticket.products.length > 0 && !ticket.hideProducts`
- **POSSÍVEL CAUSA:** O ticket pode não estar sendo carregado com os produtos do mock, ou o estado não está sendo atualizado corretamente

#### 2. Seção de Produtos na Aba Detalhes
**Status:** ❓ PRECISA VERIFICAR (aba foi clicada, mas snapshot muito grande)
**Localização:** Aba "Detalhes" do ticket
**Código:** `ServicesTicketDetailLeft.tsx` linha ~621-631
**Problema:** 
- Componente `TicketProductsManager` está sendo renderizado
- Pode não estar aparecendo se não houver produtos ou se estiver oculto

#### 3. Toggle Ocultar/Mostrar Produtos
**Status:** ❓ PRECISA VERIFICAR
**Localização:** Seção de produtos na aba Detalhes
**Código:** `TicketProductsManager.tsx`
**Problema:** 
- Toggle implementado com ícones Eye/EyeOff
- Só aparece se `onHideProductsChange` for fornecido
- **VERIFICAR:** Se o prop está sendo passado corretamente

### 🔍 PRÓXIMOS PASSOS PARA TESTE

1. Abrir ticket "Implantação teste"
2. Verificar se valor total aparece no header (abaixo de "Implantação teste pendente high")
3. Ir para aba "Detalhes"
4. Verificar se seção "Products" aparece
5. Adicionar um produto de teste
6. Verificar se valor total aparece no header após adicionar
7. Testar toggle "Ocultar/Mostrar"
8. Verificar se valor desaparece quando oculto

