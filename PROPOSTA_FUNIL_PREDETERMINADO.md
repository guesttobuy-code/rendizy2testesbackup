# Proposta: Funil Pré-determinado (Vertical/Wizard)

## 📋 O QUE ENTENDI

### Conceito Principal
Criar um **novo tipo de funil** dentro do sistema de Funis de Serviços que funciona como um **processo sequencial tipo wizard**, onde:

1. **Visualização Vertical** - Melhor para mobile, etapas empilhadas verticalmente
2. **Etapas Fixas e Sequenciais** - Não pode pular etapas, só avança se cumprir requisitos
3. **Visibilidade Compartilhada** - Imobiliária e cliente veem o mesmo processo
4. **Responsabilidades por Etapa** - Cada etapa pode ter um responsável diferente
5. **Validação de Requisitos** - Só passa para próxima etapa se validar condições

### Exemplo Prático: Vistoria de Imóvel

```
┌─────────────────────────────────────┐
│ ETAPA 1: Vistoria Inicial           │
│ Responsável: Vistoriador            │
│ Status: ✅ Concluída                 │
│ [Ver detalhes]                      │
├─────────────────────────────────────┤
│ ETAPA 2: Aprovação do Inquilino     │
│ Responsável: Cliente/Inquilino      │
│ Status: ⏳ Aguardando                │
│ [Aguardando ação do cliente...]    │
├─────────────────────────────────────┤
│ ETAPA 3: Proposta de Orçamento      │
│ Responsável: Imobiliária            │
│ Status: 🔒 Bloqueada                │
│ [Aguardando etapa anterior...]      │
├─────────────────────────────────────┤
│ ETAPA 4: Aprovação do Orçamento    │
│ Responsável: Cliente/Inquilino      │
│ Status: 🔒 Bloqueada                │
│ [Aguardando etapas anteriores...]   │
└─────────────────────────────────────┘
```

### Fluxo de Dados
1. **Etapa 1** → Vistoriador preenche formulário/fotos → Marca como concluída
2. **Etapa 2** → Cliente recebe notificação → Aceita/Rejeita → Passa para Etapa 3
3. **Etapa 3** → Imobiliária cria orçamento (usando produtos do ticket) → Passa para Etapa 4
4. **Etapa 4** → Cliente aprova orçamento → **Gera ação no módulo financeiro** (boletos/links de pagamento)

---

## 🎯 FUNCIONALIDADES NECESSÁRIAS

### 1. Tipo de Funil: `PREDETERMINED` (Pré-determinado)

Adicionar novo tipo ao `FunnelType`:
```typescript
export type FunnelType = 'SALES' | 'SERVICES' | 'PREDETERMINED';
```

### 2. Configuração do Funil Pré-determinado

```typescript
export interface PredeterminedFunnelConfig {
  isSequential: boolean; // true = só avança sequencialmente
  allowSkip: boolean; // false = não pode pular etapas
  requireValidation: boolean; // true = precisa validar requisitos
  visibility: 'internal' | 'shared' | 'public'; // Quem pode ver
  stageRequirements?: StageRequirement[]; // Requisitos por etapa
}

export interface StageRequirement {
  stageId: string;
  requiredTasks?: string[]; // IDs de tarefas obrigatórias
  requiredFields?: string[]; // Campos obrigatórios
  requiredApproval?: boolean; // Precisa aprovação
  requiredProducts?: boolean; // Precisa ter produtos/orçamento
  minProgress?: number; // Progresso mínimo (0-100)
}
```

### 3. Visualização Vertical (Wizard View)

Componente novo: `PredeterminedFunnelView.tsx`
- Layout vertical (mobile-first)
- Etapas empilhadas
- Indicadores visuais de progresso
- Botões de ação por etapa
- Bloqueio visual de etapas futuras

### 4. Validação de Etapas

Sistema de validação que verifica:
- ✅ Todas as tarefas obrigatórias completas
- ✅ Campos obrigatórios preenchidos
- ✅ Aprovações necessárias recebidas
- ✅ Produtos/orçamento adicionados (se necessário)
- ✅ Progresso mínimo atingido

### 5. Responsáveis por Etapa

Cada etapa pode ter:
- **Responsável fixo** (ex: "Vistoriador", "Cliente", "Imobiliária")
- **Responsável dinâmico** (baseado em relacionamentos do ticket)
- **Múltiplos responsáveis** (ex: "Cliente OU Proprietário")

### 6. Integração com Módulo Financeiro

Quando etapa final é concluída:
- Trigger para módulo financeiro
- Gerar boletos/links de pagamento
- Vincular ao ticket/orçamento

---

## 💡 MELHORIAS PROPOSTAS

### 1. **Sistema de Aprovações**
Adicionar sistema de aprovação explícita:
- Botão "Aprovar" / "Rejeitar" na etapa
- Comentário obrigatório ao rejeitar
- Notificação para responsável da próxima etapa
- Histórico de aprovações

### 2. **Templates de Funis Pré-determinados**
Criar templates prontos:
- "Vistoria Inicial e Final"
- "Check-in de Imóvel"
- "Check-out de Imóvel"
- "Processo de Manutenção"
- "Processo de Renovação"

### 3. **Notificações Automáticas**
- Email/SMS quando etapa é concluída
- Notificação push para responsável da próxima etapa
- Lembrete se etapa ficar parada por X dias

### 4. **Timeline Visual**
Mostrar linha do tempo:
- Quando cada etapa foi iniciada/concluída
- Tempo gasto em cada etapa
- Prazo estimado vs real

### 5. **Modo Cliente (Portal)**
Interface simplificada para cliente:
- Apenas etapas onde ele é responsável
- Formulários simplificados
- Aprovações com um clique
- Visualização de progresso geral

### 6. **Checklist por Etapa**
Cada etapa pode ter checklist:
- Itens obrigatórios
- Itens opcionais
- Upload de documentos
- Assinaturas digitais

### 7. **Regras de Negócio Customizáveis**
Permitir configurar:
- Condições para avançar (ex: "Se cliente aprovar, vai para Etapa 3, senão volta para Etapa 1")
- Ações automáticas (ex: "Ao concluir Etapa 4, criar boleto automaticamente")
- Timeouts (ex: "Se etapa 2 não for concluída em 7 dias, notificar supervisor")

### 8. **Relatórios e Analytics**
- Tempo médio por etapa
- Taxa de aprovação/rejeição
- Etapas que mais demoram
- Gargalos no processo

---

## 🏗️ ARQUITETURA PROPOSTA

### Estrutura de Arquivos

```
RendizyPrincipal/
├── types/
│   └── funnels.ts (adicionar tipos PREDETERMINED)
├── components/
│   └── crm/
│       ├── PredeterminedFunnelModule.tsx (novo)
│       ├── PredeterminedFunnelView.tsx (novo)
│       ├── PredeterminedStageCard.tsx (novo)
│       ├── StageValidation.tsx (novo)
│       └── ... (componentes existentes)
```

### Fluxo de Dados

```
1. Criar Funil Pré-determinado
   ↓
2. Configurar Etapas (fixas, sequenciais)
   ↓
3. Definir Requisitos por Etapa
   ↓
4. Criar Ticket no Funil Pré-determinado
   ↓
5. Renderizar Visualização Vertical
   ↓
6. Usuário completa Etapa 1
   ↓
7. Sistema valida requisitos
   ↓
8. Se válido: Desbloqueia Etapa 2
   ↓
9. Notifica responsável da Etapa 2
   ↓
10. Repete até etapa final
    ↓
11. Ao concluir: Trigger módulo financeiro
```

---

## 📱 DESIGN PROPOSTO

### Visualização Vertical (Mobile-First)

```
┌─────────────────────────────────────┐
│ 📋 Vistoria de Imóvel - Apt 201    │
│ Progresso: ████████░░ 60%          │
├─────────────────────────────────────┤
│                                     │
│ ✅ ETAPA 1: Vistoria Inicial       │
│    👤 Vistoriador                   │
│    ✅ Concluída em 15/01/2025      │
│    [Ver detalhes]                  │
│                                     │
│ ⏳ ETAPA 2: Aprovação Inquilino    │
│    👤 João Silva (Inquilino)       │
│    ⏳ Aguardando desde 15/01       │
│    [Aguardando ação...]            │
│                                     │
│ 🔒 ETAPA 3: Proposta Orçamento     │
│    🏢 Imobiliária                  │
│    🔒 Bloqueada                    │
│    [Aguardando etapa anterior...]  │
│                                     │
│ 🔒 ETAPA 4: Aprovação Orçamento    │
│    👤 João Silva (Inquilino)       │
│    🔒 Bloqueada                    │
│    [Aguardando etapas anteriores] │
│                                     │
└─────────────────────────────────────┘
```

### Indicadores Visuais

- ✅ **Verde** = Etapa concluída
- ⏳ **Amarelo** = Em andamento / Aguardando
- 🔒 **Cinza** = Bloqueada (aguardando etapas anteriores)
- ⚠️ **Laranja** = Requisitos não atendidos
- ❌ **Vermelho** = Rejeitada / Erro

---

## 🔄 INTEGRAÇÃO COM FUNCIONALIDADES EXISTENTES

### Reutilizar:

1. ✅ **Tarefas** - Cada etapa pode ter tarefas específicas
2. ✅ **Produtos/Orçamento** - Usar na etapa de orçamento
3. ✅ **Relacionamentos** - Pessoas, imóveis, automações
4. ✅ **Templates** - Criar templates de funis pré-determinados
5. ✅ **Chat IA** - Assistente para ajudar no processo
6. ✅ **Formulários** - Tarefas do tipo FORM
7. ✅ **Anexos** - Tarefas do tipo ATTACHMENT
8. ✅ **Histórico** - Audit log de todas as ações

### Novos Componentes:

1. 🆕 **PredeterminedFunnelView** - Visualização vertical
2. 🆕 **StageValidation** - Validação de requisitos
3. 🆕 **StageApproval** - Sistema de aprovações
4. 🆕 **StageProgress** - Indicador de progresso por etapa
5. 🆕 **StageTimeline** - Timeline visual

---

## ❓ PERGUNTAS PARA CLARIFICAÇÃO

1. **Visibilidade para Cliente:**
   - Cliente vê TODAS as etapas ou apenas as dele?
   - Cliente pode ver progresso geral ou só sua parte?

2. **Permissões:**
   - Cliente pode editar algo além de aprovar/rejeitar?
   - Imobiliária pode voltar etapas já concluídas?

3. **Validação:**
   - Quem valida se requisitos foram atendidos? (automático ou manual?)
   - Pode haver validação parcial? (ex: 80% das tarefas completas)

4. **Rejeição:**
   - O que acontece se cliente rejeitar etapa 2?
   - Volta para etapa 1? Cria novo ticket? Cancela processo?

5. **Múltiplos Responsáveis:**
   - Se etapa tem múltiplos responsáveis, todos precisam aprovar?
   - Ou apenas um deles?

6. **Integração Financeira:**
   - Qual módulo financeiro? (já existe ou precisa criar?)
   - Que dados enviar? (valor, descrição, vencimento, etc.)

---

## 🚀 PRÓXIMOS PASSOS

1. **Confirmar entendimento** ✅
2. **Aprovar melhorias propostas** ⏳
3. **Definir prioridades** ⏳
4. **Criar tipos TypeScript** ⏳
5. **Implementar visualização vertical** ⏳
6. **Sistema de validação** ⏳
7. **Integração com módulo financeiro** ⏳

---

## 📝 NOTAS

- Esta proposta mantém compatibilidade com funis existentes
- Funis pré-determinados são um **tipo especial** de funil de serviços
- Pode coexistir com funis tradicionais (Kanban/Lista)
- Reutiliza 80% das funcionalidades já criadas
- Adiciona apenas visualização e validação específicas

