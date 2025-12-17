# Proposta: Configurações Avançadas para Automações

## 📋 Contexto

O usuário precisa de configurações mais flexíveis para criar automações que envolvem:
1. **Múltiplos módulos** (ex: Reservas + Chat + Notificações)
2. **Seleção de imóveis específicos** (ex: apenas imóveis do Rio de Janeiro)

## 🎯 Objetivos

### 1. Módulos - Múltipla Escolha
- ✅ Listar TODOS os módulos do menu lateral
- ✅ Permitir seleção múltipla (checkbox)
- ✅ Organizar por seções (Principal, Operacional, Módulos Avançados, Avançado)
- ✅ Incluir submenus quando relevante
- ✅ Busca/filtro para facilitar seleção

### 2. Seleção de Imóveis
- ✅ Campo de seleção múltipla de imóveis
- ✅ Busca por nome/código
- ✅ Filtros: Cidade, Tipo, Status
- ✅ Opção "Todos os imóveis" ou "Nenhum" (global)
- ✅ Visualização clara dos imóveis selecionados

## 📐 Estrutura de Dados

```typescript
interface AutomationContext {
  // ANTES: module: string
  // DEPOIS: modules: string[] (múltipla escolha)
  modules: string[];
  
  // NOVO: Seleção de imóveis
  properties: string[]; // IDs dos imóveis, ou [] para global
  propertyFilters?: {
    cities?: string[];
    types?: string[];
    status?: string[];
  };
  
  // Mantém os existentes
  channel: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
  priority: AutomationPriority;
  language: string;
}
```

## 🗂️ Estrutura de Módulos

Baseado no `MainSidebar.tsx`:

### Seção: Principal
- Dashboard
- Calendário
- Reservas
- Chat
- Locais e Anúncios
- Edição de site
- Preços em Lote
- Promoções
- Finanças

### Seção: Operacional
- Usuários e Clientes
  - Usuários
  - Clientes e Hóspedes
  - Proprietários
  - Documentos e Listas
- Notificações
- Catálogo
  - Grupos
  - Restrições
  - Regras Tarifárias
  - Modelos de E-mail
  - Modelos para Impressão
  - Gerenciador de Mídia

### Seção: Módulos Avançados
- CRM & Tasks
- Automações
- BI & Relatórios

### Seção: Avançado
- Loja de apps
- Configurações
- Suporte
  - E-mails Duplicados
  - Perfis de Cadastro
  - Funções e Permissões
  - Usuários Online
  - Atividade dos Usuários
  - Histórico de Login

## 🎨 Interface Proposta

### Componente: Seleção de Módulos
```
┌─────────────────────────────────────┐
│ Módulos (3 selecionados)           │
├─────────────────────────────────────┤
│ 🔍 Buscar módulos...                │
├─────────────────────────────────────┤
│ 📁 Principal                        │
│  ☑ Reservas                        │
│  ☐ Calendário                       │
│  ☑ Chat                            │
│                                     │
│ 📁 Operacional                     │
│  ☐ Notificações                    │
│  ☑ Usuários e Clientes             │
│    ☐ Usuários                      │
│    ☐ Clientes e Hóspedes          │
│                                     │
│ 📁 Módulos Avançados               │
│  ☐ CRM & Tasks                     │
│  ☐ BI & Relatórios                 │
└─────────────────────────────────────┘
```

### Componente: Seleção de Imóveis
```
┌─────────────────────────────────────┐
│ Imóveis (2 selecionados)            │
├─────────────────────────────────────┤
│ 🔍 Buscar imóveis...                │
│                                     │
│ Filtros:                            │
│ [Cidade: Rio de Janeiro ▼]         │
│ [Tipo: Apartamento ▼]              │
│                                     │
│ ☑ Apartamento Copacabana - AP 101  │
│ ☑ Casa Ipanema - Casa 1            │
│ ☐ Studio Leblon - Studio 1         │
│                                     │
│ ☐ Todos os imóveis (global)        │
└─────────────────────────────────────┘
```

## 🔄 Fluxo de Uso

1. Usuário abre o Laboratório de Automações
2. Nas configurações, seleciona:
   - Módulos: Reservas + Chat + Notificações
   - Imóveis: Apenas imóveis do Rio de Janeiro
3. Descreve a automação: "Quero receber notificação quando houver reserva de plataforma externa em imóveis do Rio"
4. IA gera automação com contexto completo
5. Automação é salva com todas as configurações

## ✅ Benefícios

1. **Flexibilidade**: Automações podem envolver múltiplos módulos
2. **Precisão**: Automações podem ser específicas para imóveis/cidades
3. **Organização**: Módulos organizados por seções facilita navegação
4. **Escalabilidade**: Fácil adicionar novos módulos no futuro

## 🚀 Próximos Passos

1. Criar componente `ModuleSelector` (seleção múltipla)
2. Criar componente `PropertySelector` (seleção de imóveis)
3. Atualizar `AutomationContext` interface
4. Atualizar `AutomationsChatLab` para usar novos componentes
5. Atualizar backend para aceitar arrays de módulos e propriedades

