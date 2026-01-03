# Proposta: Funil Pré-determinado (Sistema Genérico de Processos)

## 🎯 CONCEITO PRINCIPAL

### Sistema Genérico e Flexível
Este **NÃO é um funil específico para vistoria**, mas sim um **sistema genérico de processos pré-determinados** que pode ser usado para:

- ✅ Vistoria de Imóvel (exemplo inicial)
- ✅ Processo de Fechamento e Implantação
- ✅ Check-in/Check-out
- ✅ Processo de Manutenção
- ✅ Processo de Renovação
- ✅ Onboarding de Cliente
- ✅ Aprovação de Anúncios
- ✅ Processo de Venda
- ✅ E **qualquer outro processo** que a imobiliária precisar criar

### Características Essenciais

1. **Ferramentas de Criação Flexíveis** - Permitir criar processos customizados
2. **Visualização Vertical (Wizard)** - Mobile-first, etapas sequenciais
3. **Portal do Cliente** - Cliente acessa via site da imobiliária (área de login)
4. **Gestão Compartilhada** - Imobiliária + Time interno gerenciam, cliente participa
5. **Gatilhos Automáticos** - Pode ser iniciado por eventos (ex: contrato assinado)

---

## 📋 EXEMPLOS DE USO

### Exemplo 1: Processo de Implantação (Seu Exemplo)

```
GATILHO: Cliente assina contrato → Inicia funil automaticamente

┌─────────────────────────────────────┐
│ ETAPA 1: Análise do Contrato        │
│ Responsável: Time Interno           │
│ Tarefas:                            │
│   • Ler contrato completo           │
│   • Verificar cláusulas             │
│   • Validar dados do imóvel          │
│ Status: ⏳ Em andamento              │
├─────────────────────────────────────┤
│ ETAPA 2: Aprovação do Anúncio       │
│ Responsável: Cliente (Portal)       │
│ Tarefas:                            │
│   • Revisar anúncio criado          │
│   • Fazer observações               │
│   • Aprovar ou solicitar alterações │
│ Status: 🔒 Bloqueada                 │
├─────────────────────────────────────┤
│ ETAPA 3: Definição de Preço         │
│ Responsável: Imobiliária            │
│ Tarefas:                            │
│   • Analisar mercado                │
│   • Definir preço de locação       │
│   • Adicionar ao sistema            │
│ Status: 🔒 Bloqueada                 │
├─────────────────────────────────────┤
│ ETAPA 4: Onboarding do Cliente       │
│ Responsável: Cliente (Portal)       │
│ Tarefas:                            │
│   • Assistir vídeo 1: Como usar...  │
│   • Assistir vídeo 2: Dicas de...   │
│   • Confirmar visualização          │
│ Status: 🔒 Bloqueada                 │
└─────────────────────────────────────┘
```

### Exemplo 2: Vistoria de Imóvel

```
GATILHO: Manual ou automático (ex: 30 dias antes do check-out)

┌─────────────────────────────────────┐
│ ETAPA 1: Vistoria Inicial           │
│ Responsável: Vistoriador             │
│ Tarefas:                            │
│   • Fotos do imóvel                 │
│   • Checklist de itens              │
│   • Relatório de condições          │
│ Status: ✅ Concluída                 │
├─────────────────────────────────────┤
│ ETAPA 2: Aprovação do Inquilino     │
│ Responsável: Cliente (Portal)       │
│ Tarefas:                            │
│   • Revisar relatório               │
│   • Aceitar ou contestar            │
│ Status: ⏳ Aguardando                │
├─────────────────────────────────────┤
│ ETAPA 3: Proposta de Orçamento      │
│ Responsável: Imobiliária            │
│ Tarefas:                            │
│   • Criar orçamento de consertos   │
│   • Adicionar produtos/serviços     │
│ Status: 🔒 Bloqueada                 │
├─────────────────────────────────────┤
│ ETAPA 4: Aprovação e Pagamento      │
│ Responsável: Cliente (Portal)       │
│ Tarefas:                            │
│   • Aprovar orçamento               │
│   • Efetuar pagamento               │
│ Status: 🔒 Bloqueada                 │
│ → GATILHO: Gera boleto no financeiro│
└─────────────────────────────────────┘
```

---

## 🛠️ FERRAMENTAS DE CRIAÇÃO (Construtor de Processos)

### Editor Visual de Funis Pré-determinados

Interface drag-and-drop para criar processos:

```
┌─────────────────────────────────────────────┐
│ Construtor de Processo Pré-determinado      │
├─────────────────────────────────────────────┤
│                                             │
│ Nome do Processo: [Processo de Implantação]│
│ Descrição: [Descreva quando usar...]        │
│                                             │
│ ┌─────────────────────────────────────┐     │
│ │ ETAPAS DO PROCESSO                 │     │
│ │                                     │     │
│ │ [➕] Adicionar Etapa               │     │
│ │                                     │     │
│ │ ┌─────────────────────────────┐   │     │
│ │ │ Etapa 1: Análise Contrato   │   │     │
│ │ │ 👤 Time Interno              │   │     │
│ │ │ [Editar] [Configurar] [🗑️]  │   │     │
│ │ └─────────────────────────────┘   │     │
│ │                                     │     │
│ │ ┌─────────────────────────────┐   │     │
│ │ │ Etapa 2: Aprovação Anúncio  │   │     │
│ │ │ 👤 Cliente (Portal)          │   │     │
│ │ │ [Editar] [Configurar] [🗑️]  │   │     │
│ │ └─────────────────────────────┘   │     │
│ │                                     │     │
│ │ [➕] Adicionar Etapa               │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ GATILHOS:                                   │
│ ☑ Iniciar quando contrato for assinado     │
│ ☑ Iniciar manualmente                      │
│ ☑ Iniciar em data específica               │
│                                             │
│ [Salvar Processo] [Cancelar]               │
└─────────────────────────────────────────────┘
```

### Configuração de Etapa

Ao clicar em "Configurar" em uma etapa:

```
┌─────────────────────────────────────────────┐
│ Configurar Etapa: Análise do Contrato      │
├─────────────────────────────────────────────┤
│                                             │
│ Nome da Etapa: [Análise do Contrato]       │
│ Descrição: [Time interno analisa...]       │
│                                             │
│ RESPONSÁVEL:                                │
│ ○ Time Interno (fixo)                       │
│ ○ Cliente (Portal)                         │
│ ○ Imobiliária                              │
│ ○ Dinâmico (baseado em relacionamentos)    │
│ ○ Múltiplos (todos precisam aprovar)       │
│                                             │
│ TAREFAS DESTA ETAPA:                        │
│ ┌─────────────────────────────────────┐   │
│ │ [➕] Adicionar Tarefa                │   │
│ │                                     │   │
│ │ ☑ Ler contrato completo (obrigatória)│   │
│ │ ☐ Verificar cláusulas (opcional)    │   │
│ │ ☐ Validar dados do imóvel (opcional) │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ REQUISITOS PARA AVANÇAR:                   │
│ ☑ Todas as tarefas obrigatórias completas  │
│ ☑ Aprovação do responsável                 │
│ ☐ Produtos/orçamento adicionados           │
│ ☐ Progresso mínimo: [80]%                  │
│                                             │
│ AÇÕES AO CONCLUIR:                         │
│ ☑ Notificar responsável da próxima etapa   │
│ ☑ Enviar email ao cliente                  │
│ ☐ Criar tarefa em outro funil              │
│ ☐ Trigger em automação                     │
│                                             │
│ VISIBILIDADE:                              │
│ ☑ Visível para imobiliária                │
│ ☑ Visível para time interno                │
│ ☑ Visível para cliente (portal)            │
│                                             │
│ [Salvar] [Cancelar]                        │
└─────────────────────────────────────────────┘
```

---

## 🌐 PORTAL DO CLIENTE

### Área de Login do Cliente

Cliente acessa via site da imobiliária (dentro do Rendizy):

```
┌─────────────────────────────────────────────┐
│ Área do Cliente - Imobiliária XYZ          │
├─────────────────────────────────────────────┤
│                                             │
│ Olá, João Silva 👤                          │
│                                             │
│ MEUS PROCESSOS ATIVOS:                      │
│ ┌─────────────────────────────────────┐   │
│ │ 📋 Processo de Implantação - Apt 201 │   │
│ │ Progresso: ████████░░ 60%            │   │
│ │                                     │   │
│ │ ✅ Etapa 1: Análise do Contrato     │   │
│ │ ⏳ Etapa 2: Aprovação do Anúncio    │   │
│ │    [Ação Necessária] ← Clique aqui  │   │
│ │ 🔒 Etapa 3: Definição de Preço     │   │
│ │ 🔒 Etapa 4: Onboarding              │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 📋 Vistoria de Imóvel - Casa 123    │   │
│ │ Progresso: ████████████ 100%        │   │
│ │ ✅ Todas as etapas concluídas       │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ [Ver Todos os Processos]                   │
└─────────────────────────────────────────────┘
```

### Interface do Cliente na Etapa

Quando cliente clica em "Ação Necessária":

```
┌─────────────────────────────────────────────┐
│ Etapa 2: Aprovação do Anúncio              │
├─────────────────────────────────────────────┤
│                                             │
│ Por favor, revise o anúncio criado e       │
│ faça suas observações:                     │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ ANÚNCIO CRIADO                      │   │
│ │                                     │   │
│ │ [Preview do anúncio aqui...]        │   │
│ │                                     │   │
│ │ [Ver anúncio completo]             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ SUAS OBSERVAÇÕES:                          │
│ ┌─────────────────────────────────────┐   │
│ │ [Digite suas observações aqui...]    │   │
│ │                                     │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ AÇÃO:                                      │
│ ○ Aprovar anúncio como está               │
│ ○ Solicitar alterações                    │
│                                             │
│ [Enviar] [Cancelar]                       │
└─────────────────────────────────────────────┘
```

### Tarefas do Cliente (Ex: Assistir Vídeos)

```
┌─────────────────────────────────────────────┐
│ Etapa 4: Onboarding do Cliente            │
├─────────────────────────────────────────────┤
│                                             │
│ Por favor, assista aos vídeos abaixo:      │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 📹 Vídeo 1: Como usar a plataforma  │   │
│ │ Duração: 5 min                       │   │
│ │ [▶ Assistir Vídeo]                  │   │
│ │ Status: ⏳ Não assistido             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 📹 Vídeo 2: Dicas de hospedagem     │   │
│ │ Duração: 3 min                       │   │
│ │ [▶ Assistir Vídeo]                  │   │
│ │ Status: ⏳ Não assistido             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ [Marcar como Concluído]                   │
└─────────────────────────────────────────────┘
```

---

## 🔧 FUNCIONALIDADES DO CONSTRUTOR

### 1. Templates de Processos

Biblioteca de templates prontos:
- "Processo de Implantação"
- "Vistoria Inicial e Final"
- "Check-in de Imóvel"
- "Check-out de Imóvel"
- "Processo de Manutenção"
- "Onboarding de Cliente"
- "Aprovação de Anúncios"
- "Processo de Renovação"

### 2. Gatilhos Automáticos

Configurar como o processo é iniciado:
- ✅ Quando contrato é assinado
- ✅ Quando reserva é confirmada
- ✅ Quando ticket é criado
- ✅ Manualmente
- ✅ Em data específica
- ✅ Quando automação é acionada

### 3. Tipos de Tarefas por Etapa

Cada etapa pode ter:
- ✅ Tarefas STANDARD (checklist)
- ✅ Tarefas FORM (formulários)
- ✅ Tarefas ATTACHMENT (upload de arquivos)
- ✅ Tarefas VIDEO (link para vídeo - novo tipo)
- ✅ Tarefas APPROVAL (aprovação/rejeição)
- ✅ Tarefas SIGNATURE (assinatura digital)

### 4. Regras de Negócio

Configurar lógica:
- **Condições:** "Se cliente aprovar → Etapa 3, senão → Volta para Etapa 1"
- **Ações:** "Ao concluir Etapa 4 → Criar boleto automaticamente"
- **Timeouts:** "Se etapa não concluída em 7 dias → Notificar supervisor"
- **Paralelismo:** "Etapas 2 e 3 podem ser feitas simultaneamente"

### 5. Visibilidade e Permissões

Por etapa:
- Quem pode ver (imobiliária, time interno, cliente)
- Quem pode editar
- Quem pode aprovar
- O que cliente pode ver (apenas sua etapa ou progresso geral)

---

## 🏗️ ARQUITETURA TÉCNICA

### Novos Tipos TypeScript

```typescript
export type FunnelType = 'SALES' | 'SERVICES' | 'PREDETERMINED';

export interface PredeterminedFunnel extends Funnel {
  type: 'PREDETERMINED';
  config: PredeterminedFunnelConfig;
  triggers: ProcessTrigger[];
  stages: PredeterminedStage[];
}

export interface PredeterminedStage extends FunnelStage {
  responsibleType: 'internal' | 'client' | 'agency' | 'dynamic' | 'multiple';
  responsibleIds?: string[]; // IDs de usuários/pessoas
  tasks: ServiceTask[]; // Tarefas específicas desta etapa
  requirements: StageRequirement;
  visibility: {
    agency: boolean;
    internal: boolean;
    client: boolean;
  };
  actions: StageAction[]; // Ações ao concluir
}

export interface ProcessTrigger {
  type: 'contract_signed' | 'reservation_confirmed' | 'manual' | 'date' | 'automation';
  config: TriggerConfig;
}

export interface TaskType {
  type: 'STANDARD' | 'FORM' | 'ATTACHMENT' | 'VIDEO' | 'APPROVAL' | 'SIGNATURE';
  config: TaskConfig;
}
```

### Componentes Principais

```
RendizyPrincipal/
├── components/
│   └── crm/
│       ├── PredeterminedFunnelModule.tsx (módulo principal)
│       ├── PredeterminedFunnelBuilder.tsx (construtor visual)
│       ├── PredeterminedFunnelView.tsx (visualização vertical)
│       ├── PredeterminedStageCard.tsx (card de etapa)
│       ├── StageConfigModal.tsx (configurar etapa)
│       ├── ProcessTriggerConfig.tsx (configurar gatilhos)
│       └── client-portal/
│           ├── ClientProcessView.tsx (visualização do cliente)
│           ├── ClientStageView.tsx (etapa do cliente)
│           └── ClientTaskView.tsx (tarefa do cliente)
```

---

## ✅ CONFIRMAÇÃO DO ENTENDIMENTO

### Pontos Chave Confirmados:

1. ✅ **Sistema Genérico** - Não é só para vistoria, serve para qualquer processo
2. ✅ **Ferramentas de Criação** - Construtor visual flexível para criar processos
3. ✅ **Portal do Cliente** - Cliente acessa via site da imobiliária, área de login
4. ✅ **Gestão Compartilhada** - Imobiliária + Time interno gerenciam, cliente participa
5. ✅ **Gatilhos Automáticos** - Pode iniciar por eventos (contrato assinado, etc.)
6. ✅ **Reutilização** - Usa tarefas, produtos, relacionamentos já existentes
7. ✅ **Tarefas Especiais** - Vídeos, aprovações, assinaturas

### Exemplos Confirmados:

- ✅ Processo de Implantação (seu exemplo detalhado)
- ✅ Vistoria de Imóvel (exemplo inicial)
- ✅ E qualquer outro processo que a imobiliária criar

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Confirmar entendimento
2. ⏳ Aprovar proposta
3. ⏳ Definir prioridades de implementação
4. ⏳ Criar tipos TypeScript
5. ⏳ Implementar construtor visual
6. ⏳ Implementar visualização vertical
7. ⏳ Implementar portal do cliente
8. ⏳ Sistema de gatilhos
9. ⏳ Integração com módulo financeiro

---

## 📝 NOTAS FINAIS

- Sistema **100% genérico e reutilizável**
- **Ferramentas de criação** são o coração do sistema
- **Portal do cliente** é essencial para processos colaborativos
- **Reutiliza** todas as funcionalidades existentes
- **Extensível** para novos tipos de tarefas e gatilhos

