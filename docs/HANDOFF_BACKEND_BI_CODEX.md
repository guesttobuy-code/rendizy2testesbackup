# 📊 HANDOFF COMPLETO - MÓDULO BI (BUSINESS INTELLIGENCE) RENDIZY

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
7. [Componentes Necessários](#componentes-necessários)
8. [Páginas Necessárias](#páginas-necessárias)
9. [Integrações](#integrações)
10. [Plano de Implementação](#plano-de-implementação)

---

## 🎯 VISÃO GERAL

### **Propósito**

O Módulo BI (Business Intelligence) do RENDIZY é uma **solução completa de análise de dados** para gestão de imóveis de temporada, permitindo:

- ✅ **Dashboards personalizáveis** com KPIs principais
- ✅ **Análise de ocupação** (taxa, ADR, RevPAR)
- ✅ **Análise de receita** por período/propriedade
- ✅ **Comparativos** (ano vs ano, mês vs mês)
- ✅ **Previsões** baseadas em histórico
- ✅ **Relatórios exportáveis** (PDF, Excel)
- ✅ **Métricas de desempenho** (conversion rate, booking window)
- ✅ **Análise por canal** (Booking.com, Airbnb, direto)

---

### **Diferenciais**

1. **Métricas hoteleiras** adaptadas para temporada (ADR, RevPAR, OCC)
2. **Comparativos inteligentes** com períodos anteriores
3. **Previsões automáticas** baseadas em sazonalidade
4. **Multi-propriedade** e consolidado
5. **Drill-down** em qualquer métrica
6. **Exportação customizável**

---

## 📊 ESTADO ATUAL

### **Frontend existente (20%):**

```
/components/bi/
├── BIModule.tsx          ✅ Container básico com Outlet
├── BIDashboard.tsx       ✅ Dashboard placeholder
└── BISidebar.tsx         ✅ Menu lateral básico
```

**BIModule.tsx:**
```typescript
import React from 'react';
import { Outlet } from 'react-router-dom';
import BISidebar from './BISidebar';

export default function BIModule() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <BISidebar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
```

**BIDashboard.tsx:**
```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart3 } from 'lucide-react';

export default function BIDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Business Intelligence</h1>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            <CardTitle>Módulo em Construção</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Dashboards e relatórios gerenciais serão implementados em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**BISidebar.tsx:**
```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  ChevronLeft
} from 'lucide-react';

export default function BISidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg">Business Intelligence</h2>
        <p className="text-xs text-muted-foreground">Análises e Relatórios</p>
      </div>
      
      <div className="p-4">
        <Button variant="outline" className="w-full" onClick={() => navigate('/modules')}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar aos Módulos
        </Button>
      </div>
      
      <div className="p-2">
        <p className="text-xs font-semibold text-muted-foreground px-3 py-2">EM CONSTRUÇÃO</p>
        {/* Menu items will be added */}
      </div>
    </div>
  );
}
```

### **Backend existente (0%):**

❌ **Arquivo não existe:** `/supabase/functions/server/routes-bi.ts`

---

## 🎨 FRONTEND PLANEJADO

### **1. Estrutura de Componentes**

```
/components/bi/
├── BIModule.tsx                    ✅ Existe
├── BIDashboard.tsx                 ✅ Existe (placeholder)
├── BISidebar.tsx                   ✅ Existe (básico)
│
├── components/                     ❌ Criar
│   ├── KPICard.tsx                 ❌ Card de métrica
│   ├── MetricTrend.tsx             ❌ Indicador de tendência
│   ├── ComparisonChart.tsx         ❌ Gráfico comparativo
│   ├── OccupancyChart.tsx          ❌ Gráfico de ocupação
│   ├── RevenueChart.tsx            ❌ Gráfico de receita
│   ├── ChannelPerformance.tsx     ❌ Performance por canal
│   ├── PropertyComparison.tsx      ❌ Comparativo de propriedades
│   ├── DateRangePicker.tsx         ✅ Reutilizar do sistema
│   ├── ExportButton.tsx            ❌ Botão de exportação
│   └── FilterPanel.tsx             ❌ Painel de filtros
│
└── pages/                          ❌ Criar
    ├── OcupacaoPage.tsx            ❌ Análise de ocupação
    ├── ReceitasPage.tsx            ❌ Análise de receitas
    ├── ComparativosPage.tsx        ❌ Comparativos temporais
    ├── PrevisõesPage.tsx           ❌ Previsões e tendências
    ├── CanaisPage.tsx              ❌ Performance por canal
    ├── PropriedadesPage.tsx        ❌ Análise por propriedade
    └── RelatoriosPage.tsx          ❌ Relatórios customizados
```

---

### **2. Páginas Detalhadas**

#### **2.1 OcupacaoPage.tsx**

**Propósito:** Análise completa de taxa de ocupação

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Análise de Ocupação                          [Filtros] [Export] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Taxa Ocupação]  [ADR]  [RevPAR]  [Diárias Vendidas]     │
│     78.5%        R$450   R$353      156 dias               │
│    +5.2%         +8%     +12%       +15 dias               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ocupação nos Últimos 12 Meses                             │
│  [Gráfico de Linha - Ocupação % por mês]                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ocupação por Dia da Semana                                │
│  [Gráfico de Barras - % por dia]                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Top Propriedades - Taxa de Ocupação                       │
│  1. Apt 501 - Copacabana         95%  ████████████████▓░░  │
│  2. Casa 12 - Ipanema            88%  ██████████████░░░░░  │
│  3. Studio 203 - Leblon          75%  ████████████░░░░░░░  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Componentes usados:**
- `KPICard` x4 (métricas principais)
- `MetricTrend` (tendências)
- `OccupancyChart` (gráfico temporal)
- `FilterPanel` (filtros de período/propriedade)
- `ExportButton` (exportar relatório)

**Dados necessários:**
```typescript
interface OccupancyData {
  periodo: {
    inicio: string;
    fim: string;
  };
  metricas: {
    taxaOcupacao: number;           // %
    taxaOcupacaoAnterior: number;   // % período anterior
    variacao: number;                // %
    adr: number;                     // Average Daily Rate (R$)
    revpar: number;                  // Revenue Per Available Room
    diariasVendidas: number;
    diariasDisponiveis: number;
    receita: number;
  };
  porMes: Array<{
    mes: string;
    taxaOcupacao: number;
    adr: number;
    revpar: number;
  }>;
  porDiaSemana: Array<{
    dia: string;
    taxaOcupacao: number;
  }>;
  porPropriedade: Array<{
    propriedadeId: string;
    nome: string;
    taxaOcupacao: number;
    diariasVendidas: number;
    receita: number;
  }>;
}
```

---

#### **2.2 ReceitasPage.tsx**

**Propósito:** Análise completa de receitas

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Análise de Receitas                      [Filtros] [Export] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Receita Total]  [Ticket Médio]  [Reservas]  [ADR]        │
│   R$ 145.000      R$ 3.500        42          R$ 450       │
│    +12%           +8%             +5          +8%          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Receitas nos Últimos 12 Meses                             │
│  [Gráfico de Barras - Receita por mês + linha de meta]     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Receita por Propriedade                                   │
│  [Gráfico de Pizza - % de contribuição]                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ranking de Propriedades                                   │
│  Propriedade          Receita      Reservas   ADR          │
│  Apt 501             R$ 45.000     12        R$ 650        │
│  Casa 12             R$ 38.000     10        R$ 580        │
│  Studio 203          R$ 28.000     15        R$ 380        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### **2.3 ComparativosPage.tsx**

**Propósito:** Comparar períodos (ano vs ano, mês vs mês)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Análise Comparativa                      [Períodos] [Export]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Período A: Nov/2024           Período B: Nov/2025         │
│  01/11 - 30/11                01/11 - 30/11                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Métrica          2024        2025       Variação           │
│  ────────────────────────────────────────────────────────   │
│  Receita         R$ 120k      R$ 145k     +20.8% ↑         │
│  Ocupação        72%          78%         +6.0pp ↑         │
│  ADR             R$ 410       R$ 450      +9.8% ↑          │
│  RevPAR          R$ 295       R$ 353      +19.7% ↑         │
│  Reservas        38           42          +10.5% ↑         │
│  Ticket Médio    R$ 3.158     R$ 3.450    +9.2% ↑          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Receita Comparativa - Dia a Dia                           │
│  [Gráfico de Linha Dupla - 2024 vs 2025]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### **3. Componentes Reutilizáveis**

#### **KPICard.tsx**

```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;      // % ou valor absoluto
    direction: 'up' | 'down' | 'neutral';
    isGood?: boolean;   // Verde se true, vermelho se false
  };
  icon?: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
  subtitle?: string;
}

export function KPICard({ title, value, trend, icon, format, subtitle }: KPICardProps) {
  // Renderizar card com valor formatado e tendência
}
```

#### **OccupancyChart.tsx**

```typescript
interface OccupancyChartProps {
  data: Array<{
    periodo: string;
    ocupacao: number;
    target?: number;
  }>;
  type: 'line' | 'bar' | 'area';
  showTarget?: boolean;
  height?: number;
}

export function OccupancyChart({ data, type, showTarget, height }: OccupancyChartProps) {
  // Renderizar gráfico usando Recharts
}
```

---

## 📡 CONTRATOS DE API

### **Base URL:**
```
https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/bi
```

---

### **1. ANÁLISE DE OCUPAÇÃO**

#### **1.1 Obter Análise de Ocupação**

```http
GET /bi/ocupacao
```

**Query Parameters:**
```
?dataInicio=2025-11-01      // Obrigatório
&dataFim=2025-11-30         // Obrigatório
&propriedadeIds=prop1,prop2 // Opcional (filtrar propriedades)
&granularidade=mensal       // diaria|semanal|mensal (default: mensal)
&incluirComparacao=true     // Incluir período anterior (default: false)
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "metricas": {
      "taxaOcupacao": 78.5,
      "taxaOcupacaoAnterior": 73.3,
      "variacao": 5.2,
      "adr": 450.00,
      "adrAnterior": 416.67,
      "revpar": 353.25,
      "revparAnterior": 305.42,
      "diariasVendidas": 156,
      "diariasDisponiveis": 199,
      "receita": 70200.00
    },
    "porMes": [
      {
        "mes": "2025-01",
        "taxaOcupacao": 85.0,
        "adr": 520.00,
        "revpar": 442.00,
        "receita": 65000.00
      }
      // ... mais meses
    ],
    "porDiaSemana": [
      {
        "dia": "Segunda",
        "taxaOcupacao": 72.0,
        "diariasVendidas": 18
      },
      {
        "dia": "Terça",
        "taxaOcupacao": 75.0,
        "diariasVendidas": 19
      }
      // ... outros dias
    ],
    "porPropriedade": [
      {
        "propriedadeId": "prop_001",
        "nome": "Apt 501 - Copacabana",
        "taxaOcupacao": 95.0,
        "diariasVendidas": 28,
        "diariasDisponiveis": 30,
        "receita": 18200.00,
        "adr": 650.00
      }
      // ... mais propriedades
    ],
    "comparacao": {
      "periodoAnterior": {
        "inicio": "2024-11-01",
        "fim": "2024-11-30"
      },
      "metricas": {
        "taxaOcupacao": 73.3,
        "adr": 416.67,
        "revpar": 305.42,
        "receita": 58500.00
      }
    }
  }
}
```

---

### **2. ANÁLISE DE RECEITAS**

#### **2.1 Obter Análise de Receitas**

```http
GET /bi/receitas
```

**Query Parameters:**
```
?dataInicio=2025-11-01
&dataFim=2025-11-30
&propriedadeIds=prop1,prop2
&granularidade=mensal
&agruparPor=propriedade     // propriedade|canal|tipo (opcional)
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "resumo": {
      "receitaTotal": 145000.00,
      "receitaTotalAnterior": 120000.00,
      "variacao": 20.8,
      "ticketMedio": 3450.00,
      "totalReservas": 42,
      "adr": 450.00
    },
    "porMes": [
      {
        "mes": "2025-11",
        "receita": 145000.00,
        "reservas": 42,
        "ticketMedio": 3450.00,
        "meta": 150000.00,
        "atingimentoMeta": 96.67
      }
    ],
    "porPropriedade": [
      {
        "propriedadeId": "prop_001",
        "nome": "Apt 501",
        "receita": 45000.00,
        "percentual": 31.03,
        "reservas": 12,
        "adr": 650.00,
        "ranking": 1
      }
      // ... mais propriedades
    ],
    "porCanal": [
      {
        "canal": "Booking.com",
        "receita": 58000.00,
        "percentual": 40.0,
        "reservas": 18,
        "comissao": 8700.00
      },
      {
        "canal": "Direto",
        "receita": 52000.00,
        "percentual": 35.86,
        "reservas": 15,
        "comissao": 0
      },
      {
        "canal": "Airbnb",
        "receita": 35000.00,
        "percentual": 24.14,
        "reservas": 9,
        "comissao": 5250.00
      }
    ]
  }
}
```

---

### **3. COMPARATIVOS**

#### **3.1 Comparar Dois Períodos**

```http
POST /bi/comparativos
```

**Request Body:**
```json
{
  "periodoA": {
    "inicio": "2024-11-01",
    "fim": "2024-11-30",
    "label": "Novembro 2024"
  },
  "periodoB": {
    "inicio": "2025-11-01",
    "fim": "2025-11-30",
    "label": "Novembro 2025"
  },
  "metricas": ["receita", "ocupacao", "adr", "revpar", "reservas"],
  "propriedadeIds": ["prop_001", "prop_002"]
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "periodoA": {
      "inicio": "2024-11-01",
      "fim": "2024-11-30",
      "label": "Novembro 2024",
      "metricas": {
        "receita": 120000.00,
        "ocupacao": 72.0,
        "adr": 410.00,
        "revpar": 295.20,
        "reservas": 38
      }
    },
    "periodoB": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30",
      "label": "Novembro 2025",
      "metricas": {
        "receita": 145000.00,
        "ocupacao": 78.0,
        "adr": 450.00,
        "revpar": 353.25,
        "reservas": 42
      }
    },
    "variacoes": {
      "receita": {
        "absoluta": 25000.00,
        "percentual": 20.8,
        "tendencia": "up"
      },
      "ocupacao": {
        "absoluta": 6.0,
        "percentual": 8.3,
        "tendencia": "up"
      },
      "adr": {
        "absoluta": 40.00,
        "percentual": 9.8,
        "tendencia": "up"
      },
      "revpar": {
        "absoluta": 58.05,
        "percentual": 19.7,
        "tendencia": "up"
      },
      "reservas": {
        "absoluta": 4,
        "percentual": 10.5,
        "tendencia": "up"
      }
    },
    "porDia": [
      {
        "data": "2024-11-01",
        "receitaA": 4200.00,
        "receitaB": 5100.00
      }
      // ... todos os dias
    ]
  }
}
```

---

### **4. PREVISÕES**

#### **4.1 Obter Previsão de Ocupação/Receita**

```http
GET /bi/previsoes
```

**Query Parameters:**
```
?tipo=ocupacao              // ocupacao|receita
&mesesFuturos=3             // Quantos meses prever
&algoritmo=sazonalidade     // sazonalidade|tendencia|ml
&propriedadeIds=prop1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "tipo": "ocupacao",
    "algoritmo": "sazonalidade",
    "baseHistorica": {
      "periodoInicio": "2024-01-01",
      "periodoFim": "2025-10-31",
      "mesesAnalisados": 22
    },
    "previsoes": [
      {
        "mes": "2025-12",
        "previsao": 92.0,
        "confianca": 85,
        "limiteInferior": 85.0,
        "limiteSuperior": 98.0,
        "fatores": [
          "Alta temporada (verão)",
          "Fim de ano",
          "Histórico de 2024: 90%"
        ]
      },
      {
        "mes": "2026-01",
        "previsao": 95.0,
        "confianca": 90,
        "limiteInferior": 90.0,
        "limiteSuperior": 100.0,
        "fatores": [
          "Pico de temporada",
          "Janeiro sempre alto",
          "Histórico de 2024: 98%"
        ]
      },
      {
        "mes": "2026-02",
        "previsao": 88.0,
        "confianca": 85,
        "limiteInferior": 82.0,
        "limiteSuperior": 94.0,
        "fatores": [
          "Carnaval",
          "Fim da alta temporada",
          "Histórico de 2024: 85%"
        ]
      }
    ],
    "recomendacoes": [
      "Aumentar preços em Dezembro devido à alta demanda prevista",
      "Garantir manutenções antes de Janeiro (pico)",
      "Considerar promoções para Março (baixa temporada)"
    ]
  }
}
```

---

### **5. PERFORMANCE POR CANAL**

#### **5.1 Análise de Canais**

```http
GET /bi/canais
```

**Query Parameters:**
```
?dataInicio=2025-11-01
&dataFim=2025-11-30
&incluirComissoes=true
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "resumo": {
      "receitaTotal": 145000.00,
      "comissaoTotal": 13950.00,
      "receitaLiquida": 131050.00,
      "margemMedia": 90.38
    },
    "canais": [
      {
        "canal": "Booking.com",
        "reservas": 18,
        "receita": 58000.00,
        "percentualReceita": 40.0,
        "comissao": 8700.00,
        "taxaComissao": 15.0,
        "receitaLiquida": 49300.00,
        "ticketMedio": 3222.22,
        "leadTime": 25.5,
        "taxaCancelamento": 8.5,
        "noShow": 2
      },
      {
        "canal": "Direto",
        "reservas": 15,
        "receita": 52000.00,
        "percentualReceita": 35.86,
        "comissao": 0,
        "taxaComissao": 0,
        "receitaLiquida": 52000.00,
        "ticketMedio": 3466.67,
        "leadTime": 35.2,
        "taxaCancelamento": 4.0,
        "noShow": 0
      },
      {
        "canal": "Airbnb",
        "reservas": 9,
        "receita": 35000.00,
        "percentualReceita": 24.14,
        "comissao": 5250.00,
        "taxaComissao": 15.0,
        "receitaLiquida": 29750.00,
        "ticketMedio": 3888.89,
        "leadTime": 18.3,
        "taxaCancelamento": 12.0,
        "noShow": 1
      }
    ],
    "tendencias": [
      {
        "canal": "Booking.com",
        "variacao": +15.2,
        "tendencia": "up"
      },
      {
        "canal": "Direto",
        "variacao": +8.5,
        "tendencia": "up"
      },
      {
        "canal": "Airbnb",
        "variacao": -3.2,
        "tendencia": "down"
      }
    ]
  }
}
```

---

### **6. EXPORTAÇÃO DE RELATÓRIOS**

#### **6.1 Exportar Relatório**

```http
POST /bi/exportar
```

**Request Body:**
```json
{
  "tipo": "ocupacao",
  "formato": "pdf",           // pdf|excel|csv
  "dataInicio": "2025-11-01",
  "dataFim": "2025-11-30",
  "secoes": [
    "resumo",
    "graficos",
    "tabelas",
    "analise"
  ],
  "propriedadeIds": ["prop_001", "prop_002"],
  "incluirLogomarca": true,
  "idioma": "pt-BR"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "arquivoId": "export_1730649600000_abc123",
    "url": "https://storage.supabase.co/.../relatorio_ocupacao_nov2025.pdf",
    "formato": "pdf",
    "tamanho": 2458624,
    "expiraEm": "2025-11-10T10:00:00.000Z"
  }
}
```

---

## 🗄️ MODELO DE DADOS

### **KV Store - Estrutura de Chaves**

```typescript
// DASHBOARDS SALVOS
bi_dashboard:{id}
bi_dashboards:{organizationId}:index

// RELATÓRIOS AGENDADOS
bi_relatorio_agendado:{id}
bi_relatorios_agendados:{organizationId}:index

// CACHE DE MÉTRICAS (performance)
bi_cache:ocupacao:{organizationId}:{hash}
bi_cache:receitas:{organizationId}:{hash}
bi_cache:previsoes:{organizationId}:{hash}

// EXPORTAÇÕES
bi_exportacao:{id}
bi_exportacoes:{organizationId}:index

// CONFIGURAÇÕES
bi_config:{organizationId}
```

---

### **Interfaces TypeScript**

Criar arquivo: `/types/bi.ts`

```typescript
/**
 * RENDIZY - Tipos do Módulo BI
 * Business Intelligence e Analytics
 */

// ============================================================================
// MÉTRICAS PRINCIPAIS
// ============================================================================

export interface MetricasOcupacao {
  taxaOcupacao: number;           // %
  taxaOcupacaoAnterior?: number;  // % (período anterior)
  variacao?: number;               // %
  adr: number;                     // Average Daily Rate (R$)
  revpar: number;                  // Revenue Per Available Room
  diariasVendidas: number;
  diariasDisponiveis: number;
  receita: number;
}

export interface MetricasReceita {
  receitaTotal: number;
  receitaTotalAnterior?: number;
  variacao?: number;               // %
  ticketMedio: number;
  totalReservas: number;
  adr: number;
  comissaoTotal?: number;
  receitaLiquida?: number;
}

export interface MetricasCanal {
  canal: string;
  reservas: number;
  receita: number;
  percentualReceita: number;
  comissao: number;
  taxaComissao: number;
  receitaLiquida: number;
  ticketMedio: number;
  leadTime: number;               // dias médios de antecedência
  taxaCancelamento: number;       // %
  noShow: number;                 // quantidade
}

// ============================================================================
// ANÁLISES
// ============================================================================

export interface AnaliseOcupacao {
  periodo: {
    inicio: string;
    fim: string;
  };
  metricas: MetricasOcupacao;
  porMes: Array<{
    mes: string;
    taxaOcupacao: number;
    adr: number;
    revpar: number;
    receita: number;
  }>;
  porDiaSemana: Array<{
    dia: string;
    taxaOcupacao: number;
    diariasVendidas: number;
  }>;
  porPropriedade: Array<{
    propriedadeId: string;
    nome: string;
    taxaOcupacao: number;
    diariasVendidas: number;
    diariasDisponiveis: number;
    receita: number;
    adr: number;
  }>;
  comparacao?: {
    periodoAnterior: {
      inicio: string;
      fim: string;
    };
    metricas: MetricasOcupacao;
  };
}

export interface AnaliseReceita {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: MetricasReceita;
  porMes: Array<{
    mes: string;
    receita: number;
    reservas: number;
    ticketMedio: number;
    meta?: number;
    atingimentoMeta?: number;
  }>;
  porPropriedade: Array<{
    propriedadeId: string;
    nome: string;
    receita: number;
    percentual: number;
    reservas: number;
    adr: number;
    ranking: number;
  }>;
  porCanal: MetricasCanal[];
}

// ============================================================================
// COMPARATIVOS
// ============================================================================

export interface Comparativo {
  periodoA: {
    inicio: string;
    fim: string;
    label: string;
    metricas: Record<string, number>;
  };
  periodoB: {
    inicio: string;
    fim: string;
    label: string;
    metricas: Record<string, number>;
  };
  variacoes: Record<string, {
    absoluta: number;
    percentual: number;
    tendencia: 'up' | 'down' | 'neutral';
  }>;
  porDia?: Array<{
    data: string;
    [key: string]: any;
  }>;
}

// ============================================================================
// PREVISÕES
// ============================================================================

export interface Previsao {
  tipo: 'ocupacao' | 'receita';
  algoritmo: 'sazonalidade' | 'tendencia' | 'ml';
  baseHistorica: {
    periodoInicio: string;
    periodoFim: string;
    mesesAnalisados: number;
  };
  previsoes: Array<{
    mes: string;
    previsao: number;
    confianca: number;          // 0-100%
    limiteInferior: number;
    limiteSuperior: number;
    fatores: string[];
  }>;
  recomendacoes: string[];
}

// ============================================================================
// DASHBOARDS
// ============================================================================

export interface Dashboard {
  id: string;
  organizationId: string;
  nome: string;
  descricao?: string;
  widgets: Widget[];
  layout: LayoutConfig;
  filtros: {
    periodo?: string;
    propriedadeIds?: string[];
    canais?: string[];
  };
  publico: boolean;
  compartilhadoCom?: string[];  // userIds
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Widget {
  id: string;
  tipo: 'kpi' | 'grafico' | 'tabela' | 'mapa' | 'texto';
  titulo: string;
  config: WidgetConfig;
  posicao: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface WidgetConfig {
  metrica?: string;
  fonte?: string;
  granularidade?: string;
  tipoGrafico?: 'line' | 'bar' | 'pie' | 'area';
  cores?: string[];
  mostrarLegenda?: boolean;
  [key: string]: any;
}

export interface LayoutConfig {
  cols: number;
  rowHeight: number;
  breakpoints: Record<string, number>;
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export interface Exportacao {
  id: string;
  organizationId: string;
  tipo: 'ocupacao' | 'receita' | 'comparativo' | 'completo';
  formato: 'pdf' | 'excel' | 'csv';
  parametros: {
    dataInicio: string;
    dataFim: string;
    propriedadeIds?: string[];
    secoes?: string[];
  };
  status: 'processando' | 'concluido' | 'erro';
  url?: string;
  tamanho?: number;
  expiraEm?: string;
  erro?: string;
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

export interface ConfiguracaoBI {
  id: string;
  organizationId: string;
  
  // Metas
  metaOcupacao?: number;          // %
  metaReceitaMensal?: number;     // R$
  metaADR?: number;               // R$
  
  // Alertas
  alertas: {
    ocupacaoAbaixo?: number;      // %
    receitaAbaixo?: number;       // %
    cancelamentoAcima?: number;   // %
  };
  
  // Relatórios agendados
  relatoriosAgendados: RelatorioAgendado[];
  
  // Customizações
  coresGraficos?: string[];
  logomarca?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface RelatorioAgendado {
  id: string;
  tipo: 'ocupacao' | 'receita' | 'completo';
  frequencia: 'diaria' | 'semanal' | 'mensal';
  diaSemana?: number;             // 0-6 (domingo-sábado)
  diaMes?: number;                // 1-31
  hora: string;                   // HH:mm
  formato: 'pdf' | 'excel';
  destinatarios: string[];        // emails
  ativo: boolean;
  ultimoEnvio?: string;
  proximoEnvio: string;
}

export default {};
```

---

## 📐 REGRAS DE NEGÓCIO

### **1. Cálculo de Métricas Hoteleiras**

```typescript
/**
 * ADR - Average Daily Rate (Diária Média)
 * Fórmula: Receita Total / Diárias Vendidas
 */
function calcularADR(receitaTotal: number, diariasVendidas: number): number {
  if (diariasVendidas === 0) return 0;
  return receitaTotal / diariasVendidas;
}

/**
 * RevPAR - Revenue Per Available Room (Receita por Quarto Disponível)
 * Fórmula: Receita Total / Diárias Disponíveis
 * OU: ADR × Taxa de Ocupação
 */
function calcularRevPAR(receitaTotal: number, diariasDisponiveis: number): number {
  if (diariasDisponiveis === 0) return 0;
  return receitaTotal / diariasDisponiveis;
}

/**
 * Taxa de Ocupação
 * Fórmula: (Diárias Vendidas / Diárias Disponíveis) × 100
 */
function calcularTaxaOcupacao(diariasVendidas: number, diariasDisponiveis: number): number {
  if (diariasDisponiveis === 0) return 0;
  return (diariasVendidas / diariasDisponiveis) * 100;
}

/**
 * Exemplo de uso:
 */
const periodo = {
  diariasVendidas: 156,
  diariasDisponiveis: 199,
  receitaTotal: 70200.00
};

const adr = calcularADR(periodo.receitaTotal, periodo.diariasVendidas);
// ADR = 70200 / 156 = R$ 450,00

const revpar = calcularRevPAR(periodo.receitaTotal, periodo.diariasDisponiveis);
// RevPAR = 70200 / 199 = R$ 352,76

const ocupacao = calcularTaxaOcupacao(periodo.diariasVendidas, periodo.diariasDisponiveis);
// Ocupação = (156 / 199) × 100 = 78,39%

// Validação: RevPAR = ADR × Ocupação
// 352,76 = 450 × 0,7839 ✓
```

---

### **2. Cálculo de Diárias Disponíveis**

```typescript
function calcularDiariasDisponiveis(
  propriedades: Propriedade[],
  dataInicio: string,
  dataFim: string
): number {
  let totalDiarias = 0;
  
  const dias = calcularDiasEntreDatas(dataInicio, dataFim);
  
  for (const propriedade of propriedades) {
    // Cada propriedade × número de dias
    totalDiarias += dias;
    
    // Subtrair dias bloqueados (manutenção, etc)
    const bloqueios = buscarBloqueios(propriedade.id, dataInicio, dataFim);
    totalDiarias -= bloqueios.length;
  }
  
  return totalDiarias;
}

// Exemplo:
// 5 propriedades × 30 dias = 150 diárias
// - 8 dias bloqueados = 142 diárias disponíveis
```

---

### **3. Algoritmo de Previsão por Sazonalidade**

```typescript
function preverOcupacaoPorSazonalidade(
  historicoMensal: Array<{ mes: string; ocupacao: number }>,
  mesesFuturos: number
): Previsao {
  // 1. Agrupar histórico por mês do ano (Jan, Fev, etc.)
  const mediaPorMes: Record<string, number> = {};
  
  for (let i = 1; i <= 12; i++) {
    const mesStr = i.toString().padStart(2, '0');
    const dadosMes = historicoMensal.filter(h => h.mes.endsWith(`-${mesStr}`));
    
    if (dadosMes.length > 0) {
      const media = dadosMes.reduce((sum, d) => sum + d.ocupacao, 0) / dadosMes.length;
      mediaPorMes[mesStr] = media;
    }
  }
  
  // 2. Calcular tendência geral (crescimento/queda)
  const tendencia = calcularTendenciaLinear(historicoMensal.map(h => h.ocupacao));
  
  // 3. Gerar previsões
  const previsoes = [];
  const hoje = new Date();
  
  for (let i = 0; i < mesesFuturos; i++) {
    const dataFutura = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 1);
    const mesFuturo = (dataFutura.getMonth() + 1).toString().padStart(2, '0');
    
    // Previsão base = média histórica do mês
    let previsaoBase = mediaPorMes[mesFuturo] || 0;
    
    // Ajustar pela tendência
    previsaoBase += (tendencia * (i + 1));
    
    // Limitar entre 0-100%
    const previsao = Math.max(0, Math.min(100, previsaoBase));
    
    // Calcular intervalo de confiança (±10%)
    const limiteInferior = Math.max(0, previsao - 10);
    const limiteSuperior = Math.min(100, previsao + 10);
    
    previsoes.push({
      mes: `${dataFutura.getFullYear()}-${mesFuturo}`,
      previsao,
      confianca: calcularConfianca(dadosMes.length),
      limiteInferior,
      limiteSuperior,
      fatores: identificarFatores(mesFuturo, previsao)
    });
  }
  
  return {
    tipo: 'ocupacao',
    algoritmo: 'sazonalidade',
    baseHistorica: {
      periodoInicio: historicoMensal[0].mes,
      periodoFim: historicoMensal[historicoMensal.length - 1].mes,
      mesesAnalisados: historicoMensal.length
    },
    previsoes,
    recomendacoes: gerarRecomendacoes(previsoes)
  };
}

function calcularConfianca(quantidadeDados: number): number {
  // Quanto mais dados históricos, maior a confiança
  if (quantidadeDados >= 24) return 95;  // 2+ anos
  if (quantidadeDados >= 12) return 85;  // 1+ ano
  if (quantidadeDados >= 6) return 70;   // 6+ meses
  return 50;                              // Pouco histórico
}

function identificarFatores(mes: string, ocupacao: number): string[] {
  const fatores: string[] = [];
  
  // Sazonalidade do Rio de Janeiro (exemplo)
  const altaTemporada = ['12', '01', '02', '07'];  // Verão + Férias
  const mediaTemporada = ['03', '06', '10', '11'];
  
  if (altaTemporada.includes(mes)) {
    fatores.push('Alta temporada');
    if (mes === '12') fatores.push('Fim de ano e festas');
    if (mes === '01') fatores.push('Verão e férias');
    if (mes === '02') fatores.push('Carnaval');
  }
  
  if (ocupacao > 85) {
    fatores.push('Demanda muito alta prevista');
  }
  
  return fatores;
}
```

---

## 🔧 COMPONENTES NECESSÁRIOS

### **Criar em `/components/bi/components/`**

1. **KPICard.tsx** - Card de métrica com tendência
2. **MetricTrend.tsx** - Seta + percentual de variação
3. **OccupancyChart.tsx** - Gráfico de ocupação (Recharts)
4. **RevenueChart.tsx** - Gráfico de receita
5. **ChannelPerformance.tsx** - Performance por canal
6. **PropertyComparison.tsx** - Comparativo de propriedades
7. **ComparisonChart.tsx** - Gráfico comparativo de períodos
8. **FilterPanel.tsx** - Painel de filtros
9. **ExportButton.tsx** - Botão exportar (PDF/Excel)
10. **DateRangePicker.tsx** - Reutilizar do sistema

---

## 📄 PÁGINAS NECESSÁRIAS

### **Criar em `/components/bi/pages/`**

1. **OcupacaoPage.tsx** - Análise de ocupação completa
2. **ReceitasPage.tsx** - Análise de receitas
3. **ComparativosPage.tsx** - Comparativos temporais
4. **PrevisoesPage.tsx** - Previsões e tendências
5. **CanaisPage.tsx** - Performance por canal
6. **PropriedadesPage.tsx** - Análise por propriedade
7. **RelatoriosPage.tsx** - Relatórios customizados

---

## 🔗 INTEGRAÇÕES

### **1. Módulo de Reservas**

**Fonte de dados principal:**
- Buscar todas as reservas do período
- Calcular diárias vendidas
- Calcular receita por reserva
- Identificar canal de origem

**Endpoint a consumir:**
```http
GET /make-server-67caf26a/reservations
?dataInicio=2025-11-01&dataFim=2025-11-30
```

---

### **2. Módulo de Propriedades**

**Fonte de dados:**
- Total de propriedades ativas
- Cálculo de diárias disponíveis
- Bloqueios de manutenção

**Endpoint a consumir:**
```http
GET /make-server-67caf26a/properties
GET /make-server-67caf26a/blocks?dataInicio=X&dataFim=Y
```

---

### **3. Módulo Financeiro (Futuro)**

**Fonte de dados:**
- Receitas recebidas vs previstas
- Comissões pagas
- Margem líquida real

---

## 📅 PLANO DE IMPLEMENTAÇÃO

### **SPRINT 1 (2 semanas) - BACKEND BÁSICO**

**Objetivos:**
- ✅ Backend de análise de ocupação
- ✅ Backend de análise de receitas
- ✅ Cálculos de ADR/RevPAR

**Tasks:**
1. [ ] Criar arquivo `/supabase/functions/server/routes-bi.ts`
2. [ ] Implementar GET /bi/ocupacao
3. [ ] Implementar GET /bi/receitas
4. [ ] Implementar cálculos de métricas hoteleiras
5. [ ] Implementar agregação por período/propriedade
6. [ ] Registrar rotas no `index.tsx`
7. [ ] Testar com dados reais de reservas

**Critérios de aceite:**
- Métricas calculadas corretamente
- Comparação com período anterior funcionando
- Multi-tenant isolado

---

### **SPRINT 2 (2 semanas) - FRONTEND BÁSICO**

**Tasks:**
1. [ ] Criar componentes base (KPICard, Charts)
2. [ ] Implementar OcupacaoPage
3. [ ] Implementar ReceitasPage
4. [ ] Conectar ao backend
5. [ ] Implementar filtros de período
6. [ ] Testes visuais

---

### **SPRINT 3 (2 semanas) - FEATURES AVANÇADAS**

**Tasks:**
1. [ ] Implementar POST /bi/comparativos
2. [ ] Criar ComparativosPage
3. [ ] Implementar algoritmo de previsão
4. [ ] Criar PrevisoesPage
5. [ ] Implementar cache de métricas

---

### **SPRINT 4 (1 semana) - EXPORTAÇÃO**

**Tasks:**
1. [ ] Implementar POST /bi/exportar
2. [ ] Gerar PDF com métricas
3. [ ] Gerar Excel
4. [ ] Criar ExportButton no frontend

---

## 🧪 CENÁRIOS DE TESTE

### **Cenário 1: Calcular Ocupação Mensal**

```bash
GET /bi/ocupacao?dataInicio=2025-11-01&dataFim=2025-11-30

Dado:
- 5 propriedades
- 30 dias
- 150 diárias disponíveis (5 × 30)
- 8 bloqueios = 142 diárias disponíveis
- 112 diárias vendidas (reservas)
- Receita total: R$ 50.400

Espera-se:
- taxaOcupacao: 78.87% (112/142)
- adr: R$ 450,00 (50400/112)
- revpar: R$ 354,93 (50400/142)
```

---

### **Cenário 2: Comparar Nov/2024 vs Nov/2025**

```bash
POST /bi/comparativos
{
  "periodoA": { "inicio": "2024-11-01", "fim": "2024-11-30" },
  "periodoB": { "inicio": "2025-11-01", "fim": "2025-11-30" }
}

Dado:
- 2024: Receita R$ 40.000, Ocupação 70%
- 2025: Receita R$ 50.400, Ocupação 78.87%

Espera-se:
- variacoes.receita.percentual: +26%
- variacoes.ocupacao.absoluta: +8.87pp
```

---

**FIM DO DOCUMENTO** 🚀

**Próximos passos:** Enviar para Codex e iniciar Sprint 1
