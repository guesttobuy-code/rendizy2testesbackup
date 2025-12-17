# 🎯 HANDOFF COMPLETO - MÓDULO CRM TASKS RENDIZY

**Destinatário:** Codex AI / Equipe de Desenvolvimento  
**Data:** 03 NOV 2025  
**Versão RENDIZY:** v1.0.103.260-MULTI-TENANT-AUTH  
**Status:** 🟡 FRONTEND BÁSICO | 🔴 BACKEND PENDENTE  

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Estado Atual](#estado-atual)
3. [Frontend Planejado](#frontend-planejado)
4. [Contratos de API](#contratos-de-api)
5. [Modelo de Dados](#modelo-de-dados)
6. [Regras de Negócio](#regras-de-negócio)
7. [Automações](#automações)
8. [Plano de Implementação](#plano-de-implementação)

---

## 🎯 VISÃO GERAL

### **Propósito**

O Módulo CRM Tasks do RENDIZY é uma **solução completa de gestão de relacionamento com clientes** para imobiliárias de temporada, permitindo:

- ✅ **Gestão de tarefas** (criar, agendar, acompanhar)
- ✅ **Pipeline de vendas** (funil visual de oportunidades)
- ✅ **Follow-ups automáticos** (lembretes inteligentes)
- ✅ **Histórico de interações** (emails, calls, WhatsApp)
- ✅ **Segmentação de clientes** (tags, categorias, scores)
- ✅ **Automações** (emails, WhatsApp, tarefas recorrentes)
- ✅ **Metas e KPIs** (conversão, tempo médio, NPS)
- ✅ **Integração com WhatsApp** (criar tarefas de conversas)

---

### **Diferenciais**

1. **Especializado em temporada:** Funil adaptado (consulta → orçamento → reserva → pós-estadia)
2. **Integração nativa** com WhatsApp Evolution API
3. **Automações inteligentes** baseadas em eventos (nova reserva, check-in, check-out)
4. **Score de qualificação** automático (interesse × urgência × budget)
5. **Templates de follow-up** pré-configurados
6. **Multi-canal** (WhatsApp, Email, Telefone, Presencial)

---

## 📊 ESTADO ATUAL

### **Frontend existente (20%):**

```
/components/crm/
├── CRMTasksModule.tsx          ✅ Container básico com Outlet
├── CRMTasksDashboard.tsx       ✅ Dashboard placeholder
└── CRMTasksSidebar.tsx         ✅ Menu lateral básico
```

**CRMTasksModule.tsx:**
```typescript
import React from 'react';
import { Outlet } from 'react-router-dom';
import CRMTasksSidebar from './CRMTasksSidebar';

export default function CRMTasksModule() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <CRMTasksSidebar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
```

**CRMTasksDashboard.tsx:**
```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ClipboardList } from 'lucide-react';

export default function CRMTasksDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">CRM & Tasks</h1>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            <CardTitle>Módulo em Construção</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gestão de tarefas e relacionamento com clientes será implementada em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**CRMTasksSidebar.tsx:**
```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  ClipboardList,
  Users,
  TrendingUp,
  Mail,
  ChevronLeft
} from 'lucide-react';

export default function CRMTasksSidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg">CRM & Tasks</h2>
        <p className="text-xs text-muted-foreground">Gestão de Clientes</p>
      </div>
      
      <div className="p-4">
        <Button variant="outline" className="w-full" onClick={() => navigate('/modules')}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar aos Módulos
        </Button>
      </div>
      
      <div className="p-2">
        <p className="text-xs font-semibold text-muted-foreground px-3 py-2">EM CONSTRUÇÃO</p>
      </div>
    </div>
  );
}
```

### **Backend existente (0%):**

❌ **Arquivo não existe:** `/supabase/functions/server/routes-crm.ts`

---

## 🎨 FRONTEND PLANEJADO

### **1. Estrutura de Componentes**

```
/components/crm/
├── CRMTasksModule.tsx              ✅ Existe
├── CRMTasksDashboard.tsx           ✅ Existe (placeholder)
├── CRMTasksSidebar.tsx             ✅ Existe (básico)
│
├── components/                     ❌ Criar
│   ├── TaskCard.tsx                ❌ Card de tarefa
│   ├── TaskList.tsx                ❌ Lista de tarefas
│   ├── TaskModal.tsx               ❌ Modal criar/editar tarefa
│   ├── PipelineColumn.tsx          ❌ Coluna do pipeline (Kanban)
│   ├── PipelineCard.tsx            ❌ Card de oportunidade
│   ├── LeadScoreBadge.tsx          ❌ Badge de score (A, B, C, D)
│   ├── ActivityTimeline.tsx        ❌ Timeline de interações
│   ├── FollowUpSuggestion.tsx      ❌ Sugestão de follow-up
│   ├── ClientQuickView.tsx         ❌ Visualização rápida do cliente
│   ├── AutomationBuilder.tsx       ❌ Construtor de automações
│   ├── TemplateSelector.tsx        ❌ Seletor de templates
│   └── MetricsWidget.tsx           ❌ Widget de métricas
│
└── pages/                          ❌ Criar
    ├── TasksPage.tsx               ❌ Gestão de tarefas
    ├── PipelinePage.tsx            ❌ Pipeline de vendas
    ├── ClientesPage.tsx            ❌ Gestão de clientes
    ├── AutomacoesPage.tsx          ❌ Automações
    ├── RelatoriosPage.tsx          ❌ Relatórios CRM
    └── ConfiguracoesPage.tsx       ❌ Configurações do CRM
```

---

### **2. Páginas Detalhadas**

#### **2.1 TasksPage.tsx**

**Propósito:** Gestão completa de tarefas

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Minhas Tarefas                 [Filtros] [+ Nova Tarefa]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Pendentes: 8]  [Atrasadas: 3]  [Concluídas: 45]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Hoje (3)                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ☐ Enviar orçamento - Casa 12 p/ João Silva          │  │
│  │   WhatsApp • 14:00 • Alta prioridade                │  │
│  │   [Ver Cliente] [Marcar como Concluída]             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ☐ Follow-up proposta #1234                          │  │
│  │   Email • 16:00 • Média                             │  │
│  │   Cliente aguardando há 2 dias                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Amanhã (2)                                                 │
│  [...]                                                      │
│                                                             │
│  Atrasadas (3) ⚠️                                          │
│  [...]                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Componentes usados:**
- `TaskCard` (cards de tarefas)
- `TaskModal` (criar/editar)
- `ClientQuickView` (preview do cliente)
- `FollowUpSuggestion` (sugestões automáticas)

**Dados necessários:**
```typescript
interface Task {
  id: string;
  organizationId: string;
  titulo: string;
  descricao?: string;
  tipo: 'call' | 'email' | 'whatsapp' | 'meeting' | 'other';
  dataVencimento: string;
  horaVencimento?: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  
  // Relacionamentos
  clienteId?: string;
  clienteNome?: string;
  oportunidadeId?: string;
  reservaId?: string;
  
  // Atribuição
  responsavelId: string;
  responsavelNome: string;
  
  // Recorrência
  recorrente: boolean;
  frequencia?: 'diaria' | 'semanal' | 'mensal';
  
  // Resultado
  dataConclusao?: string;
  resultado?: string;
  notasInternas?: string;
  
  // Automação
  criadaPor: 'manual' | 'automacao';
  automacaoId?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

#### **2.2 PipelinePage.tsx**

**Propósito:** Pipeline visual de vendas (Kanban)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Pipeline de Vendas                   [Filtros] [Configurar]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Novo Lead]   [Qualificado]   [Orçamento]   [Reservado]   │
│     8             5              3             2            │
│   R$ 40k        R$ 35k         R$ 28k        R$ 18k         │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐  │
│  │ João S.  │   │ Maria O. │   │ Carlos L.│   │ Ana P. │  │
│  │ 5 dias   │   │ 3 dias   │   │ 1 dia    │   │ Hoje   │  │
│  │ R$ 5.000 │   │ R$ 8.000 │   │ R$ 12k   │   │ R$ 9k  │  │
│  │ Score: B │   │ Score: A │   │ Score: A │   │ Score: A│  │
│  │ [Ver]    │   │ [Ver]    │   │ [Ver]    │   │ [Ver]  │  │
│  └──────────┘   └──────────┘   └──────────┘   └────────┘  │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ Pedro M. │   │ Lucia R. │   │ Bruno S. │                │
│  │ ...      │   │ ...      │   │ ...      │                │
│  └──────────┘   └──────────┘   └──────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Drag & Drop entre colunas
- Filtro por responsável, período, score
- Visualização de valor total por etapa
- Tempo médio em cada etapa
- Taxa de conversão entre etapas

**Dados necessários:**
```typescript
interface Oportunidade {
  id: string;
  organizationId: string;
  titulo: string;
  descricao?: string;
  
  // Cliente
  clienteId: string;
  clienteNome: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  
  // Pipeline
  etapa: 'novo_lead' | 'qualificado' | 'orcamento_enviado' | 'negociacao' | 'ganho' | 'perdido';
  etapaAnterior?: string;
  dataEntradaEtapa: string;
  
  // Valor
  valor: number;
  moeda: 'BRL';
  probabilidade: number;  // 0-100%
  valorPonderado: number; // valor × probabilidade
  
  // Qualificação
  score: 'A' | 'B' | 'C' | 'D';  // A = Quente, D = Frio
  origem: 'whatsapp' | 'site' | 'telefone' | 'indicacao' | 'outro';
  
  // Período desejado
  periodoDesejado?: {
    inicio: string;
    fim: string;
    flexivel: boolean;
  };
  propriedadesInteresse?: string[];  // IDs
  
  // Responsável
  responsavelId: string;
  responsavelNome: string;
  
  // Histórico
  atividades: Atividade[];
  tarefas: Task[];
  
  // Resultado (se ganho/perdido)
  dataFechamento?: string;
  motivoPerda?: string;
  reservaId?: string;
  
  createdAt: string;
  updatedAt: string;
}

interface Atividade {
  id: string;
  tipo: 'nota' | 'email' | 'call' | 'whatsapp' | 'meeting' | 'proposta_enviada';
  descricao: string;
  data: string;
  usuarioId: string;
  usuarioNome: string;
  anexos?: string[];
}
```

---

#### **2.3 ClientesPage.tsx**

**Propósito:** Gestão e segmentação de clientes

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Clientes                      [Busca] [Filtros] [+ Novo]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Todos: 156]  [Ativos: 89]  [Inativos: 45]  [VIPs: 22]   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Cliente         Telefone        Última interação   Score   │
│  ──────────────────────────────────────────────────────────  │
│  João Silva     (21) 99999-0001   Há 2 dias        ⭐⭐⭐   │
│  [WhatsApp] [Email] [Ver Histórico]                         │
│                                                             │
│  Maria Santos   (21) 98888-0002   Há 1 semana      ⭐⭐⭐⭐│
│  [WhatsApp] [Email] [Ver Histórico]                         │
│                                                             │
│  Carlos Oliveira (11) 97777-0003  Há 3 meses       ⭐⭐    │
│  [WhatsApp] [Email] [Ver Histórico]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Busca por nome, telefone, email
- Filtros por tags, score, última interação
- Exportar lista de clientes
- Envio em massa (email/WhatsApp)
- Segmentação avançada

---

#### **2.4 AutomacoesPage.tsx**

**Propósito:** Criar e gerenciar automações

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Automações                              [+ Nova Automação] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✅ Pós-Reserva: Boas-vindas               [Editar]   │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │ Quando: Nova reserva confirmada                      │  │
│  │ Aguardar: 1 hora                                     │  │
│  │ Ação: Enviar WhatsApp com template "boas-vindas"    │  │
│  │ Executadas: 45 vezes • Taxa sucesso: 98%            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✅ Follow-up Orçamento                    [Editar]   │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │ Quando: Orçamento enviado                            │  │
│  │ Aguardar: 2 dias                                     │  │
│  │ Condição: Se não houve resposta                      │  │
│  │ Ação: Criar tarefa "Follow-up orçamento"            │  │
│  │ Executadas: 23 vezes • Taxa conversão: 35%          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ❌ Pré-Check-in: Instruções          [Inativa] [Edit]│  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │ Quando: 1 dia antes do check-in                      │  │
│  │ Ação: Enviar WhatsApp com instruções                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 CONTRATOS DE API

### **Base URL:**
```
https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/crm
```

---

### **1. TAREFAS**

#### **1.1 Criar Tarefa**

```http
POST /crm/tasks
```

**Request Body:**
```json
{
  "titulo": "Enviar orçamento - Casa 12",
  "descricao": "Cliente interessado em 7 dias no Natal",
  "tipo": "whatsapp",
  "dataVencimento": "2025-11-05",
  "horaVencimento": "14:00",
  "prioridade": "alta",
  "clienteId": "cliente_001",
  "oportunidadeId": "opp_123",
  "responsavelId": "user_rppt",
  "recorrente": false
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "task_1730649600000_abc123",
    "organizationId": "org_rppt_001",
    "titulo": "Enviar orçamento - Casa 12",
    "descricao": "Cliente interessado em 7 dias no Natal",
    "tipo": "whatsapp",
    "dataVencimento": "2025-11-05",
    "horaVencimento": "14:00",
    "prioridade": "alta",
    "status": "pendente",
    "clienteId": "cliente_001",
    "clienteNome": "João Silva",
    "oportunidadeId": "opp_123",
    "responsavelId": "user_rppt",
    "responsavelNome": "Admin RPPT",
    "recorrente": false,
    "criadaPor": "manual",
    "createdAt": "2025-11-03T10:00:00.000Z",
    "updatedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

#### **1.2 Listar Tarefas**

```http
GET /crm/tasks
```

**Query Parameters:**
```
?status=pendente              // pendente|em_andamento|concluida|cancelada
&responsavelId=user_rppt      // Filtrar por responsável
&dataInicio=2025-11-01        // Vencimento >= data
&dataFim=2025-11-30           // Vencimento <= data
&prioridade=alta              // baixa|media|alta|urgente
&clienteId=cliente_001        // Filtrar por cliente
&incluirAtrasadas=true        // Mostrar atrasadas separadamente
&page=1
&limit=25
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "hoje": [
      {
        "id": "task_001",
        "titulo": "Enviar orçamento - Casa 12",
        "tipo": "whatsapp",
        "dataVencimento": "2025-11-03",
        "horaVencimento": "14:00",
        "prioridade": "alta",
        "status": "pendente",
        "clienteNome": "João Silva",
        "responsavelNome": "Admin RPPT"
      }
    ],
    "amanha": [
      // ... tarefas de amanhã
    ],
    "proximos7dias": [
      // ... tarefas dos próximos 7 dias
    ],
    "atrasadas": [
      {
        "id": "task_002",
        "titulo": "Follow-up proposta #1234",
        "dataVencimento": "2025-11-01",
        "diasAtraso": 2,
        "prioridade": "urgente"
      }
    ]
  },
  "summary": {
    "total": 45,
    "pendentes": 8,
    "atrasadas": 3,
    "concluidas": 34
  }
}
```

---

#### **1.3 Marcar Tarefa como Concluída**

```http
POST /crm/tasks/:id/concluir
```

**Request Body:**
```json
{
  "resultado": "Orçamento enviado via WhatsApp. Cliente vai analisar e retornar em 2 dias.",
  "notasInternas": "Cliente mencionou interesse em propriedades na praia"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "task_001",
    "status": "concluida",
    "dataConclusao": "2025-11-03T14:30:00.000Z",
    "resultado": "Orçamento enviado via WhatsApp...",
    "updatedAt": "2025-11-03T14:30:00.000Z"
  },
  "proximasTarefas": [
    {
      "sugestao": "Follow-up em 2 dias",
      "dataVencimento": "2025-11-05",
      "tipo": "whatsapp"
    }
  ]
}
```

---

### **2. OPORTUNIDADES (PIPELINE)**

#### **2.1 Criar Oportunidade**

```http
POST /crm/oportunidades
```

**Request Body:**
```json
{
  "titulo": "João Silva - Natal 2025",
  "clienteId": "cliente_001",
  "valor": 5000.00,
  "probabilidade": 60,
  "origem": "whatsapp",
  "periodoDesejado": {
    "inicio": "2025-12-23",
    "fim": "2025-12-30",
    "flexivel": true
  },
  "propriedadesInteresse": ["prop_001", "prop_002"],
  "responsavelId": "user_rppt"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "opp_1730649600000_xyz789",
    "organizationId": "org_rppt_001",
    "titulo": "João Silva - Natal 2025",
    "clienteId": "cliente_001",
    "clienteNome": "João Silva",
    "clienteEmail": "joao@email.com",
    "clienteTelefone": "(21) 99999-0001",
    "etapa": "novo_lead",
    "dataEntradaEtapa": "2025-11-03T10:00:00.000Z",
    "valor": 5000.00,
    "moeda": "BRL",
    "probabilidade": 60,
    "valorPonderado": 3000.00,
    "score": "B",
    "origem": "whatsapp",
    "periodoDesejado": {
      "inicio": "2025-12-23",
      "fim": "2025-12-30",
      "flexivel": true
    },
    "propriedadesInteresse": ["prop_001", "prop_002"],
    "responsavelId": "user_rppt",
    "responsavelNome": "Admin RPPT",
    "atividades": [],
    "tarefas": [],
    "createdAt": "2025-11-03T10:00:00.000Z",
    "updatedAt": "2025-11-03T10:00:00.000Z"
  },
  "tarefasCriadas": [
    {
      "id": "task_auto_001",
      "titulo": "Qualificar lead - João Silva",
      "dataVencimento": "2025-11-03",
      "prioridade": "alta"
    }
  ]
}
```

---

#### **2.2 Mover Oportunidade no Pipeline**

```http
PUT /crm/oportunidades/:id/mover
```

**Request Body:**
```json
{
  "novaEtapa": "orcamento_enviado",
  "observacao": "Orçamento enviado via WhatsApp com 3 opções de propriedades"
}
```

**Validações:**
- Etapas válidas: `novo_lead → qualificado → orcamento_enviado → negociacao → ganho|perdido`
- Não pode pular etapas (exceto admin)
- Se mover para "ganho", obrigatório informar `reservaId`
- Se mover para "perdido", obrigatório informar `motivoPerda`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "opp_001",
    "etapa": "orcamento_enviado",
    "etapaAnterior": "qualificado",
    "dataEntradaEtapa": "2025-11-03T15:00:00.000Z",
    "probabilidade": 75,
    "updatedAt": "2025-11-03T15:00:00.000Z"
  },
  "atividade": {
    "id": "ativ_001",
    "tipo": "nota",
    "descricao": "Movido para Orçamento Enviado: Orçamento enviado via WhatsApp..."
  },
  "tarefasCriadas": [
    {
      "id": "task_auto_002",
      "titulo": "Follow-up orçamento - João Silva",
      "dataVencimento": "2025-11-05",
      "tipo": "whatsapp"
    }
  ]
}
```

---

#### **2.3 Obter Pipeline (Kanban)**

```http
GET /crm/oportunidades/pipeline
```

**Query Parameters:**
```
?responsavelId=user_rppt      // Filtrar por responsável
&score=A                      // Filtrar por score
&dataInicio=2025-11-01        // Criadas a partir de
&dataFim=2025-11-30           // Criadas até
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "colunas": [
      {
        "etapa": "novo_lead",
        "label": "Novo Lead",
        "oportunidades": [
          {
            "id": "opp_001",
            "titulo": "João Silva - Natal 2025",
            "clienteNome": "João Silva",
            "valor": 5000.00,
            "score": "B",
            "diasNaEtapa": 2,
            "proximaTarefa": {
              "id": "task_001",
              "titulo": "Qualificar lead",
              "dataVencimento": "2025-11-03"
            }
          }
          // ... mais oportunidades
        ],
        "totalOportunidades": 8,
        "valorTotal": 40000.00,
        "taxaConversao": 65.5
      },
      {
        "etapa": "qualificado",
        "label": "Qualificado",
        "oportunidades": [ /* ... */ ],
        "totalOportunidades": 5,
        "valorTotal": 35000.00,
        "taxaConversao": 70.0
      },
      {
        "etapa": "orcamento_enviado",
        "label": "Orçamento Enviado",
        "oportunidades": [ /* ... */ ],
        "totalOportunidades": 3,
        "valorTotal": 28000.00,
        "taxaConversao": 80.0
      },
      {
        "etapa": "negociacao",
        "label": "Negociação",
        "oportunidades": [ /* ... */ ],
        "totalOportunidades": 2,
        "valorTotal": 18000.00,
        "taxaConversao": 90.0
      }
    ],
    "metricas": {
      "totalOportunidades": 18,
      "valorTotalPipeline": 121000.00,
      "valorPonderado": 96800.00,
      "ticketMedio": 6722.22,
      "tempoMedioPorEtapa": {
        "novo_lead": 1.5,
        "qualificado": 2.3,
        "orcamento_enviado": 3.8,
        "negociacao": 5.2
      },
      "taxaConversaoGlobal": 45.5
    }
  }
}
```

---

### **3. CLIENTES**

#### **3.1 Criar/Atualizar Cliente**

```http
POST /crm/clientes
```

**Request Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "telefone": "(21) 99999-0001",
  "cpf": "123.456.789-00",
  "dataNascimento": "1985-05-15",
  "origem": "whatsapp",
  "tags": ["vip", "corporativo", "recorrente"],
  "score": 4,
  "observacoes": "Cliente fiel, sempre reserva no verão",
  "preferencias": {
    "propriedadesTipo": ["casa", "apto_luxo"],
    "localizacoes": ["copacabana", "ipanema"],
    "orcamentoMedio": 5000.00
  }
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "cliente_1730649600000_abc",
    "organizationId": "org_rppt_001",
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "(21) 99999-0001",
    "cpf": "123.456.789-00",
    "dataNascimento": "1985-05-15",
    "origem": "whatsapp",
    "tags": ["vip", "corporativo", "recorrente"],
    "score": 4,
    "status": "ativo",
    "observacoes": "Cliente fiel...",
    "preferencias": { /* ... */ },
    "estatisticas": {
      "totalReservas": 0,
      "receitaGerada": 0,
      "ultimaReserva": null,
      "ultimaInteracao": "2025-11-03T10:00:00.000Z"
    },
    "createdAt": "2025-11-03T10:00:00.000Z",
    "updatedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

### **4. AUTOMAÇÕES**

#### **4.1 Criar Automação**

```http
POST /crm/automacoes
```

**Request Body:**
```json
{
  "nome": "Pós-Reserva: Boas-vindas",
  "descricao": "Enviar mensagem de boas-vindas 1h após confirmação",
  "gatilho": {
    "evento": "reserva_confirmada",
    "aguardar": 60,
    "aguardarUnidade": "minutos"
  },
  "condicoes": [
    {
      "campo": "reserva.status",
      "operador": "equals",
      "valor": "confirmada"
    }
  ],
  "acoes": [
    {
      "tipo": "enviar_whatsapp",
      "templateId": "template_boas_vindas",
      "variaveis": {
        "nome_hospede": "{{reserva.hospedeNome}}",
        "propriedade": "{{reserva.propriedadeNome}}",
        "checkin": "{{reserva.checkin}}"
      }
    },
    {
      "tipo": "criar_tarefa",
      "titulo": "Confirmar recebimento - {{reserva.hospedeNome}}",
      "dataVencimento": "+2 dias",
      "tipo": "whatsapp",
      "responsavelId": "{{reserva.responsavelId}}"
    }
  ],
  "ativo": true
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "automacao_001",
    "organizationId": "org_rppt_001",
    "nome": "Pós-Reserva: Boas-vindas",
    "descricao": "Enviar mensagem de boas-vindas...",
    "gatilho": { /* ... */ },
    "condicoes": [ /* ... */ ],
    "acoes": [ /* ... */ ],
    "ativo": true,
    "estatisticas": {
      "executadas": 0,
      "sucesso": 0,
      "erro": 0,
      "taxaSucesso": 0
    },
    "createdAt": "2025-11-03T10:00:00.000Z",
    "updatedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

## 🗄️ MODELO DE DADOS

### **KV Store - Estrutura de Chaves**

```typescript
// TAREFAS
crm_task:{id}
crm_tasks:{organizationId}:index
crm_tasks:{organizationId}:{responsavelId}:index
crm_tasks:{organizationId}:{clienteId}:cliente

// OPORTUNIDADES
crm_oportunidade:{id}
crm_oportunidades:{organizationId}:index
crm_oportunidades:{organizationId}:{etapa}:etapa
crm_oportunidades:{organizationId}:{responsavelId}:responsavel

// CLIENTES
crm_cliente:{id}
crm_clientes:{organizationId}:index
crm_clientes:{organizationId}:telefone:{telefone}
crm_clientes:{organizationId}:email:{email}

// ATIVIDADES
crm_atividade:{id}
crm_atividades:{oportunidadeId}:index
crm_atividades:{clienteId}:timeline

// AUTOMAÇÕES
crm_automacao:{id}
crm_automacoes:{organizationId}:index
crm_automacoes:{organizationId}:ativas

// EXECUÇÕES DE AUTOMAÇÃO
crm_automacao_execucao:{id}
crm_automacoes_execucoes:{automacaoId}:index

// TEMPLATES
crm_template:{id}
crm_templates:{organizationId}:index

// CONFIGURAÇÕES
crm_config:{organizationId}
```

---

### **Interfaces TypeScript**

Criar arquivo: `/types/crm.ts`

```typescript
/**
 * RENDIZY - Tipos do Módulo CRM
 */

export interface Task {
  id: string;
  organizationId: string;
  titulo: string;
  descricao?: string;
  tipo: 'call' | 'email' | 'whatsapp' | 'meeting' | 'other';
  dataVencimento: string;
  horaVencimento?: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  
  // Relacionamentos
  clienteId?: string;
  clienteNome?: string;
  oportunidadeId?: string;
  reservaId?: string;
  
  // Atribuição
  responsavelId: string;
  responsavelNome: string;
  
  // Recorrência
  recorrente: boolean;
  frequencia?: 'diaria' | 'semanal' | 'mensal';
  
  // Resultado
  dataConclusao?: string;
  resultado?: string;
  notasInternas?: string;
  
  // Automação
  criadaPor: 'manual' | 'automacao';
  automacaoId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Oportunidade {
  id: string;
  organizationId: string;
  titulo: string;
  descricao?: string;
  
  // Cliente
  clienteId: string;
  clienteNome: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  
  // Pipeline
  etapa: 'novo_lead' | 'qualificado' | 'orcamento_enviado' | 'negociacao' | 'ganho' | 'perdido';
  etapaAnterior?: string;
  dataEntradaEtapa: string;
  
  // Valor
  valor: number;
  moeda: 'BRL';
  probabilidade: number;
  valorPonderado: number;
  
  // Qualificação
  score: 'A' | 'B' | 'C' | 'D';
  origem: 'whatsapp' | 'site' | 'telefone' | 'indicacao' | 'outro';
  
  // Período desejado
  periodoDesejado?: {
    inicio: string;
    fim: string;
    flexivel: boolean;
  };
  propriedadesInteresse?: string[];
  
  // Responsável
  responsavelId: string;
  responsavelNome: string;
  
  // Histórico
  atividades: Atividade[];
  tarefas: Task[];
  
  // Resultado
  dataFechamento?: string;
  motivoPerda?: string;
  reservaId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Atividade {
  id: string;
  tipo: 'nota' | 'email' | 'call' | 'whatsapp' | 'meeting' | 'proposta_enviada';
  descricao: string;
  data: string;
  usuarioId: string;
  usuarioNome: string;
  anexos?: string[];
}

export interface Cliente {
  id: string;
  organizationId: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  dataNascimento?: string;
  origem: 'whatsapp' | 'site' | 'telefone' | 'indicacao' | 'outro';
  tags: string[];
  score: number;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  preferencias?: {
    propriedadesTipo?: string[];
    localizacoes?: string[];
    orcamentoMedio?: number;
  };
  estatisticas: {
    totalReservas: number;
    receitaGerada: number;
    ultimaReserva?: string;
    ultimaInteracao?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Automacao {
  id: string;
  organizationId: string;
  nome: string;
  descricao?: string;
  gatilho: {
    evento: string;
    aguardar?: number;
    aguardarUnidade?: 'minutos' | 'horas' | 'dias';
  };
  condicoes: Condicao[];
  acoes: Acao[];
  ativo: boolean;
  estatisticas: {
    executadas: number;
    sucesso: number;
    erro: number;
    taxaSucesso: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Condicao {
  campo: string;
  operador: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt';
  valor: any;
}

export interface Acao {
  tipo: 'enviar_whatsapp' | 'enviar_email' | 'criar_tarefa' | 'mover_pipeline' | 'adicionar_tag';
  [key: string]: any;
}

export default {};
```

---

## 📅 PLANO DE IMPLEMENTAÇÃO

### **SPRINT 1 (2 semanas) - TAREFAS**

**Tasks:**
1. [ ] Criar arquivo `/supabase/functions/server/routes-crm.ts`
2. [ ] Implementar CRUD de tarefas
3. [ ] Implementar listagem com agrupamento (hoje, amanhã, atrasadas)
4. [ ] Implementar marcar como concluída
5. [ ] Frontend: TasksPage.tsx
6. [ ] Frontend: TaskCard, TaskModal

---

### **SPRINT 2 (3 semanas) - PIPELINE**

**Tasks:**
1. [ ] Implementar CRUD de oportunidades
2. [ ] Implementar movimentação no pipeline
3. [ ] Cálculo de score automático
4. [ ] Frontend: PipelinePage.tsx (Kanban)
5. [ ] Drag & Drop entre colunas

---

### **SPRINT 3 (2 semanas) - CLIENTES**

**Tasks:**
1. [ ] Implementar CRUD de clientes
2. [ ] Timeline de atividades
3. [ ] Frontend: ClientesPage.tsx
4. [ ] Integração com WhatsApp (criar cliente da conversa)

---

### **SPRINT 4 (3 semanas) - AUTOMAÇÕES**

**Tasks:**
1. [ ] Engine de automações
2. [ ] Templates pré-definidos
3. [ ] Frontend: AutomacoesPage.tsx
4. [ ] Testes de automações

---

**FIM DO DOCUMENTO** 🚀
