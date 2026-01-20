# 💰 DOCUMENTAÇÃO COMPLETA - MÓDULO FINANCEIRO RENDIZY

**Versão:** v1.0.103.260  
**Data:** 03 NOV 2025  
**Status:** 🟡 EM DESENVOLVIMENTO (BETA)  
**Tipo:** Módulo Full-Stack Multi-Tenant

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estado Atual (Implementado)](#estado-atual-implementado)
4. [Roadmap (Planejado)](#roadmap-planejado)
5. [Estrutura Frontend](#estrutura-frontend)
6. [Estrutura Backend](#estrutura-backend)
7. [Tipos e Interfaces](#tipos-e-interfaces)
8. [Componentes Principais](#componentes-principais)
9. [Páginas/Telas](#páginas-telas)
10. [Fluxos de Dados](#fluxos-de-dados)
11. [Regras de Negócio](#regras-de-negócio)
12. [Integrações](#integrações)
13. [Segurança e Permissões](#segurança-e-permissões)
14. [Performance e Escalabilidade](#performance-e-escalabilidade)
15. [Testes](#testes)
16. [Deploy e Configuração](#deploy-e-configuração)

---

## 🎯 VISÃO GERAL

### **Propósito**

O Módulo Financeiro do RENDIZY é uma solução **completa de gestão financeira** para imobiliárias de temporada, permitindo:

- ✅ **Controle total** de receitas e despesas
- ✅ **Conciliação bancária** automatizada com Open Finance
- ✅ **Gestão de títulos** a receber e a pagar
- ✅ **Relatórios gerenciais** (DRE, Fluxo de Caixa, etc.)
- ✅ **Multi-moeda** (BRL, USD, EUR)
- ✅ **Multi-tenant** com isolamento de dados
- ✅ **Rateio e split** de lançamentos
- ✅ **Integração fiscal** (NF-e, NFS-e)
- ✅ **Projeções** e cenários

---

### **Diferenciais**

1. **Totalmente integrado** com o módulo de Reservas
2. **Automação inteligente** com regras de conciliação
3. **Open Finance** para importação automática de extratos
4. **Machine Learning** para sugestões de classificação
5. **Plano de contas** hierárquico e customizável
6. **Centro de custos** por propriedade/projeto
7. **Split de receitas** para múltiplos proprietários
8. **DRE gerencial** com mapeamento IFRS

---

## 🏗️ ARQUITETURA

### **Stack Tecnológica**

```
Frontend:
├── React 18 + TypeScript
├── TailwindCSS + shadcn/ui
├── React Router v6
├── Recharts (gráficos)
├── date-fns (datas)
└── Lucide React (ícones)

Backend:
├── Supabase Edge Functions (Deno)
├── Hono Web Framework
├── KV Store (Postgres)
└── Supabase Auth

Integrações:
├── Open Finance (API Bacen)
├── API Sefaz (NF-e/NFS-e)
├── Machine Learning (Categorização)
└── Webhooks (eventos)
```

---

### **Diagrama de Arquitetura**

```
┌─────────────────────────────────────────────────────────────────┐
│                      RENDIZY FINANCEIRO                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │   FRONTEND   │                                              │
│  │              │                                              │
│  │  Dashboard   │                                              │
│  │  Lançamentos │                                              │
│  │  Contas      │                                              │
│  │  Relatórios  │                                              │
│  └──────┬───────┘                                              │
│         │ API Calls (fetch)                                    │
│         ▼                                                      │
│  ┌─────────────────────────────────────────┐                  │
│  │         BACKEND (Edge Functions)        │                  │
│  │                                         │                  │
│  │  /financeiro/lancamentos                │                  │
│  │  /financeiro/titulos                    │                  │
│  │  /financeiro/contas-bancarias           │                  │
│  │  /financeiro/conciliacao                │                  │
│  │  /financeiro/categorias                 │                  │
│  │  /financeiro/centro-custos              │                  │
│  │  /financeiro/relatorios/dre             │                  │
│  │  /financeiro/relatorios/fluxo-caixa     │                  │
│  └──────┬──────────────────────────────────┘                  │
│         │ KV Store Operations                                 │
│         ▼                                                      │
│  ┌──────────────────────────────────────┐                     │
│  │    SUPABASE (kv_store_67caf26a)     │                     │
│  │                                      │                     │
│  │  financeiro_lancamento:{id}          │                     │
│  │  financeiro_titulo:{id}              │                     │
│  │  financeiro_conta_bancaria:{id}      │                     │
│  │  financeiro_linha_extrato:{id}       │                     │
│  │  financeiro_categoria:{id}           │                     │
│  │  financeiro_centro_custo:{id}        │                     │
│  │  financeiro_regra_conciliacao:{id}   │                     │
│  │  financeiro_config:{orgId}           │                     │
│  └──────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Integrações Externas:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Open Finance  │  │   Sefaz NF-e   │  │   Webhooks     │
│  (Extratos)    │  │   (Fiscal)     │  │   (Eventos)    │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

## ✅ ESTADO ATUAL (IMPLEMENTADO)

### **1. Frontend Estruturado (80%)**

#### **Componentes Base:**
- ✅ `/components/financeiro/FinanceiroModule.tsx` - Container principal
- ✅ `/components/financeiro/FinanceiroDashboard.tsx` - Dashboard com KPIs
- ✅ `/components/financeiro/FinanceiroSidebar.tsx` - Menu lateral próprio

#### **Componentes Reutilizáveis:**
- ✅ `/components/financeiro/components/KpiCard.tsx` - Cards de métricas
- ✅ `/components/financeiro/components/Money.tsx` - Formatação monetária
- ✅ `/components/financeiro/components/CurrencyBadge.tsx` - Badge de moeda
- ✅ `/components/financeiro/components/PeriodPicker.tsx` - Seletor de período
- ✅ `/components/financeiro/components/DataTable.tsx` - Tabela genérica
- ✅ `/components/financeiro/components/SplitEditor.tsx` - Editor de rateio

#### **Páginas Implementadas:**
- ✅ `/components/financeiro/pages/LancamentosPage.tsx` - Lançamentos manuais
- ✅ `/components/financeiro/pages/ContasReceberPage.tsx` - Contas a receber
- ✅ `/components/financeiro/pages/ContasPagarPage.tsx` - Contas a pagar
- ✅ `/components/financeiro/pages/DREPage.tsx` - Demonstrativo de Resultados
- ✅ `/components/financeiro/pages/FluxoCaixaPage.tsx` - Fluxo de Caixa

---

### **2. TypeScript Types (100%)**

✅ **Arquivo completo:** `/types/financeiro.ts` (493 linhas)

**Tipos definidos:**
- `ContaBancaria` - Contas bancárias
- `LinhaExtrato` - Linhas de extrato bancário
- `RegraConciliacao` - Regras de conciliação automática
- `Lancamento` - Lançamentos contábeis
- `SplitDestino` - Rateio de lançamentos
- `Titulo` - Títulos a receber/pagar
- `CentroCusto` - Centros de custo
- `ContaContabil` - Plano de contas
- `DocumentoFiscal` - NF-e/NFS-e
- `ConfiguracaoFinanceira` - Configurações
- `KPI`, `ItemDRE`, `EventoFluxoCaixa`, etc.

---

### **3. Rotas Frontend (100%)**

```typescript
// Em /App.tsx
<Route path="/financeiro" element={<FinanceiroModule />}>
  <Route index element={<FinanceiroDashboard />} />
  <Route path="lancamentos" element={<LancamentosPage />} />
  <Route path="contas-receber" element={<ContasReceberPage />} />
  <Route path="contas-pagar" element={<ContasPagarPage />} />
  <Route path="dre" element={<DREPage />} />
  <Route path="fluxo-caixa" element={<FluxoCaixaPage />} />
  {/* Rotas adicionais planejadas */}
</Route>
```

---

### **4. UI/UX Design (90%)**

**Features implementadas:**
- ✅ Dashboard com 4 KPIs principais
- ✅ Gráficos de receitas vs despesas (placeholder)
- ✅ Filtros avançados (período, moeda, status)
- ✅ Tabelas paginadas e ordenáveis
- ✅ Badges de status coloridos
- ✅ Dark mode completo
- ✅ Responsivo (mobile + desktop)
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling

**Paleta de Cores:**
```css
Receitas/Positivo: Verde (#10b981)
Despesas/Negativo: Vermelho (#ef4444)
Neutro/Info:       Azul (#3b82f6)
Alerta:            Laranja (#f59e0b)
```

---

## 🚧 ROADMAP (PLANEJADO)

### **FASE 1: Backend Core (0%)**

**Prioridade:** 🔴 CRÍTICA

#### **1.1 Estrutura de Rotas Backend**

Criar arquivo: `/supabase/functions/server/routes-financeiro.ts`

```typescript
// Rotas a implementar:

// LANÇAMENTOS
POST   /make-server-67caf26a/financeiro/lancamentos
GET    /make-server-67caf26a/financeiro/lancamentos
GET    /make-server-67caf26a/financeiro/lancamentos/:id
PUT    /make-server-67caf26a/financeiro/lancamentos/:id
DELETE /make-server-67caf26a/financeiro/lancamentos/:id

// TÍTULOS (RECEBER/PAGAR)
POST   /make-server-67caf26a/financeiro/titulos
GET    /make-server-67caf26a/financeiro/titulos
GET    /make-server-67caf26a/financeiro/titulos/:id
PUT    /make-server-67caf26a/financeiro/titulos/:id
DELETE /make-server-67caf26a/financeiro/titulos/:id
POST   /make-server-67caf26a/financeiro/titulos/:id/quitar
POST   /make-server-67caf26a/financeiro/titulos/:id/cancelar

// CONTAS BANCÁRIAS
POST   /make-server-67caf26a/financeiro/contas-bancarias
GET    /make-server-67caf26a/financeiro/contas-bancarias
GET    /make-server-67caf26a/financeiro/contas-bancarias/:id
PUT    /make-server-67caf26a/financeiro/contas-bancarias/:id
DELETE /make-server-67caf26a/financeiro/contas-bancarias/:id

// EXTRATOS
POST   /make-server-67caf26a/financeiro/extratos/importar
GET    /make-server-67caf26a/financeiro/extratos
POST   /make-server-67caf26a/financeiro/extratos/sincronizar

// CONCILIAÇÃO
GET    /make-server-67caf26a/financeiro/conciliacao/pendentes
POST   /make-server-67caf26a/financeiro/conciliacao/match
POST   /make-server-67caf26a/financeiro/conciliacao/criar-lancamento
POST   /make-server-67caf26a/financeiro/conciliacao/transferencia
POST   /make-server-67caf26a/financeiro/conciliacao/split
GET    /make-server-67caf26a/financeiro/conciliacao/sugestoes

// CATEGORIAS
POST   /make-server-67caf26a/financeiro/categorias
GET    /make-server-67caf26a/financeiro/categorias
GET    /make-server-67caf26a/financeiro/categorias/:id
PUT    /make-server-67caf26a/financeiro/categorias/:id
DELETE /make-server-67caf26a/financeiro/categorias/:id

// CENTRO DE CUSTOS
POST   /make-server-67caf26a/financeiro/centro-custos
GET    /make-server-67caf26a/financeiro/centro-custos
GET    /make-server-67caf26a/financeiro/centro-custos/:id
PUT    /make-server-67caf26a/financeiro/centro-custos/:id
DELETE /make-server-67caf26a/financeiro/centro-custos/:id

// RELATÓRIOS
GET    /make-server-67caf26a/financeiro/relatorios/dre
GET    /make-server-67caf26a/financeiro/relatorios/fluxo-caixa
GET    /make-server-67caf26a/financeiro/relatorios/balancete
GET    /make-server-67caf26a/financeiro/relatorios/aging

// CONFIGURAÇÕES
GET    /make-server-67caf26a/financeiro/config
PUT    /make-server-67caf26a/financeiro/config
```

#### **1.2 KV Store Keys**

**Estrutura de chaves no Supabase:**

```typescript
// Lançamentos
financeiro_lancamento:{id}
financeiro_lancamentos:{organizationId}:index

// Títulos
financeiro_titulo:{id}
financeiro_titulos:{organizationId}:receber:index
financeiro_titulos:{organizationId}:pagar:index

// Contas Bancárias
financeiro_conta_bancaria:{id}
financeiro_contas_bancarias:{organizationId}:index

// Extratos
financeiro_linha_extrato:{id}
financeiro_linhas_extrato:{contaId}:index
financeiro_linhas_extrato:{contaId}:{data}:index

// Categorias (Plano de Contas)
financeiro_categoria:{id}
financeiro_categorias:{organizationId}:index

// Centro de Custos
financeiro_centro_custo:{id}
financeiro_centros_custo:{organizationId}:index

// Regras de Conciliação
financeiro_regra_conciliacao:{id}
financeiro_regras_conciliacao:{organizationId}:index

// Configurações
financeiro_config:{organizationId}

// Documentos Fiscais
financeiro_documento_fiscal:{id}
financeiro_documentos_fiscais:{organizationId}:index

// Índices por data
financeiro_lancamentos:{organizationId}:{YYYY-MM}:index
financeiro_titulos:{organizationId}:{YYYY-MM}:index
```

---

### **FASE 2: Funcionalidades Core (0%)**

**Prioridade:** 🟠 ALTA

#### **2.1 Plano de Contas**

**Features:**
- ✅ Estrutura hierárquica (até 5 níveis)
- ✅ Categorias padrão pré-cadastradas
- ✅ Customização por organização
- ✅ Mapeamento para DRE/IFRS
- ✅ Importação/exportação

**Categorias padrão:**
```
1. RECEITAS
   1.1 Receitas de Aluguéis
       1.1.1 Temporada Alta
       1.1.2 Temporada Baixa
       1.1.3 Eventos Especiais
   1.2 Taxas e Serviços
       1.2.1 Taxa de Limpeza
       1.2.2 Pet Fee
       1.2.3 Late Check-out
   1.3 Multas e Compensações
   
2. DESPESAS
   2.1 Despesas Operacionais
       2.1.1 Limpeza
       2.1.2 Manutenção
       2.1.3 Utilidades (água, luz, gás)
       2.1.4 Internet e TV
   2.2 Despesas Administrativas
       2.2.1 Comissões
       2.2.2 Taxas de Plataforma
       2.2.3 Marketing
   2.3 Despesas Fixas
       2.3.1 IPTU
       2.3.2 Condomínio
       2.3.3 Seguros
```

#### **2.2 Lançamentos Contábeis**

**Features:**
- ✅ Criar lançamento manual (entrada/saída/transferência)
- ✅ Editar lançamento
- ✅ Excluir lançamento (com auditoria)
- ✅ Anexar documentos (PDF, imagens)
- ✅ Split de lançamentos (múltiplos beneficiários)
- ✅ Rateio por percentual ou valor fixo
- ✅ Data de competência vs data de caixa
- ✅ Multi-moeda com conversão automática
- ✅ Campos customizados
- ✅ Tags e observações

**Validações:**
- Data não pode ser futura (opcional)
- Valor maior que zero
- Categoria obrigatória
- Conta bancária obrigatória
- Splits devem somar 100% ou valor total

#### **2.3 Títulos a Receber/Pagar**

**Features:**
- ✅ Criar título (manual ou via reserva)
- ✅ Editar título
- ✅ Quitar título (total ou parcial)
- ✅ Cancelar título
- ✅ Gerar carnê/boleto
- ✅ Enviar cobrança (email/WhatsApp)
- ✅ Recorrência (mensal, anual, etc.)
- ✅ Parcelas automáticas
- ✅ Cálculo de juros/multa
- ✅ Desconto por antecipação
- ✅ Renegociação de dívidas

**Status possíveis:**
- `aberto` - A vencer
- `pago` - Quitado
- `vencido` - Vencido
- `parcial` - Pagamento parcial
- `cancelado` - Cancelado

**Regras de negócio:**
- Título pago não pode ser editado
- Título cancelado não pode ser quitado
- Juros aplicados após vencimento
- Desconto apenas para pagamento antecipado
- Parcelas geradas automaticamente

---

### **FASE 3: Conciliação Bancária (0%)**

**Prioridade:** 🟡 MÉDIA

#### **3.1 Importação de Extratos**

**Métodos suportados:**
- ✅ Upload manual (OFX, CSV, XLSX)
- ✅ Open Finance (API Bacen)
- ✅ Scraping (último recurso)
- ✅ API bancária direta (parceiros)

**Campos extraídos:**
- Data da transação
- Descrição/histórico
- Valor (débito/crédito)
- Saldo
- Referência/ID do banco
- Categoria sugerida (ML)

**Deduplicação:**
- Hash único por linha (data + valor + descrição)
- Verificação de transações já importadas
- Alert de possíveis duplicatas

#### **3.2 Regras de Conciliação**

**Tipos de regras:**
1. **Por padrão de texto:**
   - Descrição contém "ALUGUEL" → Categoria "Receita de Aluguéis"
   - Descrição contém "IPTU" → Categoria "IPTU"

2. **Por valor:**
   - Valor exato = R$ 3.500,00 → Match com título específico
   - Valor entre R$ 100 e R$ 200 → Categoria "Pequenas despesas"

3. **Por tipo:**
   - Débito/Crédito → Categorias diferentes

4. **Combinadas:**
   - Descrição contém "PIX" AND Valor > 1000 → Alta prioridade

**Ações das regras:**
- `sugerir` - Apenas sugere, usuário confirma
- `auto_conciliar` - Concilia automaticamente
- `auto_criar` - Cria lançamento automaticamente

**Prioridade:**
- Regras executadas por ordem de prioridade (0-100)
- Primeira regra que der match vence
- Usuário pode reordenar prioridades

#### **3.3 Machine Learning**

**Features:**
- ✅ Aprendizado com histórico de conciliações
- ✅ Sugestões baseadas em padrões
- ✅ Confiança em % (0-100%)
- ✅ Melhora com o tempo
- ✅ Por organização (multi-tenant)

**Modelo:**
```typescript
interface MLModel {
  features: string[];      // [descrição, valor, tipo, dia_mes, dia_semana]
  algorithm: 'naive_bayes' | 'decision_tree' | 'random_forest';
  accuracy: number;        // 0-100%
  trainedAt: string;
  predictions: number;     // Total de previsões feitas
}
```

---

### **FASE 4: Relatórios (0%)**

**Prioridade:** 🟡 MÉDIA

#### **4.1 DRE (Demonstrativo de Resultados)**

**Estrutura:**
```
Receitas Brutas                     R$ 150.000,00
  (-) Deduções                      R$  (5.000,00)
= Receita Líquida                   R$ 145.000,00

Custos Diretos                      R$ (45.000,00)
  Limpeza                           R$ (15.000,00)
  Manutenção                        R$ (20.000,00)
  Utilidades                        R$ (10.000,00)
= Lucro Bruto                       R$ 100.000,00
  Margem Bruta: 68.97%

Despesas Operacionais               R$ (30.000,00)
  Administrativas                   R$ (15.000,00)
  Comerciais                        R$ (10.000,00)
  Financeiras                       R$  (5.000,00)
= EBITDA                            R$  70.000,00
  Margem EBITDA: 48.28%

Depreciação/Amortização             R$  (5.000,00)
= EBIT                              R$  65.000,00

Resultado Financeiro                R$  (2.000,00)
= Resultado antes dos Impostos      R$  63.000,00

Impostos                            R$ (18.900,00)
= Lucro Líquido                     R$  44.100,00
  Margem Líquida: 30.41%
```

**Features:**
- ✅ Comparativo mensal/anual
- ✅ Análise vertical (%)
- ✅ Análise horizontal (variação %)
- ✅ Drill-down por categoria
- ✅ Filtros (período, centro de custo, moeda)
- ✅ Exportação (PDF, Excel, CSV)
- ✅ Gráficos interativos

#### **4.2 Fluxo de Caixa**

**Tipos:**
1. **Realizado:** Transações já ocorridas
2. **Projetado:** Títulos a receber/pagar
3. **Cenários:** Otimista, base, pessimista

**Visualizações:**
- Diário (30 dias)
- Semanal (12 semanas)
- Mensal (12 meses)
- Anual (5 anos)

**Features:**
- ✅ Saldo inicial configurável
- ✅ Entradas vs Saídas
- ✅ Saldo final acumulado
- ✅ Ponto de ruptura (quando saldo fica negativo)
- ✅ Alertas de baixo caixa
- ✅ Projeções com base em histórico

#### **4.3 Outros Relatórios**

**Balancete:**
- Saldos de todas as contas
- Saldos devedores e credores
- Totalizações por tipo

**Aging (Contas a Receber):**
```
Cliente          0-30d    31-60d   61-90d   90+d     Total
João Silva       3.500    -        -        -        3.500
Maria Santos     -        5.000    -        -        5.000
Carlos (venc.)   -        -        2.800    -        2.800
TOTAL            3.500    5.000    2.800    -        11.300
```

**Centro de Custos:**
- Gastos por propriedade
- Gastos por projeto
- Comparativo orçado vs realizado
- ROI por propriedade

---

### **FASE 5: Integrações (0%)**

**Prioridade:** 🟢 BAIXA

#### **5.1 Open Finance**

**Bancos suportados:**
- Banco do Brasil
- Bradesco
- Itaú
- Santander
- Caixa
- Nubank
- Inter
- C6 Bank

**Fluxo:**
```
1. Usuário concede consentimento
2. Redirect para autenticação no banco
3. Callback com authorization_code
4. Troca por access_token
5. Consulta extratos via API
6. Importação automática
7. Conciliação com regras
```

**Periodicidade:**
- Manual (sob demanda)
- Automática (diária, semanal)
- Webhook (em tempo real, se disponível)

#### **5.2 NF-e / NFS-e**

**Emissão:**
- Integração com SEFAZ via API
- Certificado digital A1/A3
- Ambiente homologação + produção
- DANFE em PDF
- XML assinado

**Recepção:**
- Import de XML de fornecedores
- Parsing automático de valores/impostos
- Criação automática de títulos a pagar
- Validação de chave de acesso

#### **5.3 Reservas → Financeiro**

**Automação:**
```typescript
// Quando uma reserva é criada/confirmada:
1. Criar título a receber (valor total)
2. Criar parcelas (se parcelado)
3. Criar lançamento de receita (se pago)
4. Atualizar fluxo de caixa projetado
5. Notificar hóspede (cobrança)

// Quando uma reserva é cancelada:
1. Cancelar títulos relacionados
2. Criar título de multa (se aplicável)
3. Estornar lançamentos (se necessário)
4. Atualizar projeções
```

**Split de receita:**
```typescript
// Exemplo: Propriedade com 2 proprietários
Reserva: R$ 5.000,00
├── Taxa plataforma (15%): R$ 750,00 → Despesa
├── Proprietário A (60%):  R$ 2.550,00 → A pagar
├── Proprietário B (40%):  R$ 1.700,00 → A pagar
└── TOTAL: R$ 5.000,00
```

---

## 📁 ESTRUTURA FRONTEND

### **Arquitetura de Pastas**

```
/components/financeiro/
├── FinanceiroModule.tsx          # Container principal (Router Outlet)
├── FinanceiroDashboard.tsx       # Dashboard inicial
├── FinanceiroSidebar.tsx         # Menu lateral próprio
│
├── components/                   # Componentes reutilizáveis
│   ├── KpiCard.tsx              # Card de KPI
│   ├── Money.tsx                # Formatação de moeda
│   ├── CurrencyBadge.tsx        # Badge de moeda
│   ├── PeriodPicker.tsx         # Seletor de período
│   ├── DataTable.tsx            # Tabela genérica
│   ├── SplitEditor.tsx          # Editor de rateio
│   ├── CategoryPicker.tsx       # Seletor de categoria (PLANEADO)
│   ├── CentroCustoPicker.tsx    # Seletor de centro de custo (PLANEADO)
│   ├── ContaBancariaPicker.tsx  # Seletor de conta (PLANEADO)
│   └── FileUploader.tsx         # Upload de anexos (PLANEADO)
│
└── pages/                        # Páginas do módulo
    ├── LancamentosPage.tsx      # Lançamentos manuais
    ├── ContasReceberPage.tsx    # Títulos a receber
    ├── ContasPagarPage.tsx      # Títulos a pagar
    ├── DREPage.tsx              # Demonstrativo de Resultados
    ├── FluxoCaixaPage.tsx       # Fluxo de Caixa
    ├── PlanoContasPage.tsx      # Plano de contas (PLANEADO)
    ├── CentroCustosPage.tsx     # Centro de custos (PLANEADO)
    ├── ContasBancariasPage.tsx  # Contas bancárias (PLANEADO)
    ├── ConciliacaoPage.tsx      # Conciliação bancária (PLANEADO)
    ├── RelatoriosPage.tsx       # Relatórios gerenciais (PLANEADO)
    └── ConfigPage.tsx           # Configurações (PLANEADO)
```

---

### **Componentes Principais**

#### **1. KpiCard.tsx**

```typescript
interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  trend?: {
    direction: 'up' | 'down' | 'flat';
    pct?: number;
  };
}
```

**Uso:**
```tsx
<KpiCard
  title="Receita Total"
  value={<Money amount={145850} />}
  hint="Neste mês"
  icon={<TrendingUp className="h-5 w-5" />}
  tone="success"
  trend={{ direction: 'up', pct: 12.5 }}
/>
```

#### **2. Money.tsx**

```typescript
interface MoneyProps {
  amount: number;
  currency?: Currency;
  colorize?: boolean;        // Vermelho se negativo
  showCurrency?: boolean;    // Mostrar símbolo
  decimals?: number;         // Casas decimais
}
```

**Uso:**
```tsx
<Money amount={3500} currency="BRL" colorize />
// Renderiza: R$ 3.500,00 (em verde)

<Money amount={-1200} currency="USD" colorize />
// Renderiza: $ -1,200.00 (em vermelho)
```

#### **3. PeriodPicker.tsx**

```typescript
interface PeriodPickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
  presets?: boolean;         // Mostrar presets (Este mês, Último mês, etc)
  className?: string;
}
```

**Presets:**
- Hoje
- Ontem
- Últimos 7 dias
- Últimos 30 dias
- Este mês
- Mês passado
- Este ano
- Ano passado
- Customizado

#### **4. SplitEditor.tsx**

```typescript
interface SplitEditorProps {
  valorTotal: number;
  splits: SplitDestino[];
  onChange: (splits: SplitDestino[]) => void;
  readonly?: boolean;
}
```

**Features:**
- Adicionar/remover destinos
- Tipo: percentual ou valor fixo
- Validação: soma = 100% ou valor total
- Seletor de conta bancária/categoria
- Observações por split

---

## 🗄️ ESTRUTURA BACKEND

### **Arquivo Principal: routes-financeiro.ts**

**Estrutura proposta:**

```typescript
// /supabase/functions/server/routes-financeiro.ts

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { createHash } from 'node:crypto';

const app = new Hono();

// ============================================================================
// MIDDLEWARES
// ============================================================================

// Verificar autenticação
app.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  const session = await kv.get(`session:${token}`);
  
  if (!session) {
    return c.json({ success: false, error: 'Não autenticado' }, 401);
  }
  
  c.set('session', session);
  c.set('userId', session.userId);
  c.set('organizationId', session.imobiliariaId);
  
  await next();
});

// ============================================================================
// LANÇAMENTOS
// ============================================================================

// GET /lancamentos - Listar lançamentos
app.get('/lancamentos', async (c) => {
  try {
    const organizationId = c.get('organizationId');
    
    // Query params
    const { page = 1, limit = 25, dataInicio, dataFim, tipo, categoriaId } = c.req.query();
    
    // Buscar lançamentos da organização
    const allLancamentos = await kv.getByPrefix(`financeiro_lancamento:`);
    
    // Filtrar por organização
    let lancamentos = allLancamentos.filter(l => 
      l.organizationId === organizationId
    );
    
    // Aplicar filtros
    if (dataInicio) {
      lancamentos = lancamentos.filter(l => l.data >= dataInicio);
    }
    if (dataFim) {
      lancamentos = lancamentos.filter(l => l.data <= dataFim);
    }
    if (tipo) {
      lancamentos = lancamentos.filter(l => l.tipo === tipo);
    }
    if (categoriaId) {
      lancamentos = lancamentos.filter(l => l.categoriaId === categoriaId);
    }
    
    // Ordenar por data (decrescente)
    lancamentos.sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    
    // Paginar
    const total = lancamentos.length;
    const skip = (Number(page) - 1) * Number(limit);
    const data = lancamentos.slice(skip, skip + Number(limit));
    
    return c.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar lançamentos:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /lancamentos - Criar lançamento
app.post('/lancamentos', async (c) => {
  try {
    const organizationId = c.get('organizationId');
    const userId = c.get('userId');
    const data = await c.req.json();
    
    // Validações
    if (!data.tipo || !data.data || !data.valor) {
      return c.json({ success: false, error: 'Campos obrigatórios faltando' }, 400);
    }
    
    if (data.valor <= 0) {
      return c.json({ success: false, error: 'Valor deve ser maior que zero' }, 400);
    }
    
    // Gerar ID
    const id = `lancamento_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Criar lançamento
    const lancamento = {
      id,
      organizationId,
      tipo: data.tipo,
      data: data.data,
      competencia: data.competencia || data.data,
      descricao: data.descricao,
      valor: data.valor,
      moeda: data.moeda || 'BRL',
      categoriaId: data.categoriaId,
      categoriaNome: data.categoriaNome,
      contaId: data.contaId,
      contaNome: data.contaNome,
      centroCustoId: data.centroCustoId,
      documento: data.documento,
      observacoes: data.observacoes,
      conciliado: false,
      hasSplit: data.hasSplit || false,
      splits: data.splits || [],
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salvar
    await kv.set(`financeiro_lancamento:${id}`, lancamento);
    
    // Atualizar saldo da conta (se aplicável)
    if (data.contaId) {
      await atualizarSaldoConta(data.contaId, data.tipo, data.valor);
    }
    
    console.log(`✅ Lançamento criado: ${id}`);
    
    return c.json({
      success: true,
      data: lancamento
    });
  } catch (error) {
    console.error('Erro ao criar lançamento:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /lancamentos/:id - Atualizar lançamento
app.put('/lancamentos/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const organizationId = c.get('organizationId');
    const data = await c.req.json();
    
    // Buscar lançamento existente
    const lancamento = await kv.get(`financeiro_lancamento:${id}`);
    
    if (!lancamento) {
      return c.json({ success: false, error: 'Lançamento não encontrado' }, 404);
    }
    
    // Verificar permissão (mesmo tenant)
    if (lancamento.organizationId !== organizationId) {
      return c.json({ success: false, error: 'Sem permissão' }, 403);
    }
    
    // Atualizar campos
    const updated = {
      ...lancamento,
      ...data,
      id, // Preservar ID
      organizationId, // Preservar tenant
      createdBy: lancamento.createdBy, // Preservar criador
      createdAt: lancamento.createdAt, // Preservar data criação
      updatedAt: new Date().toISOString()
    };
    
    // Salvar
    await kv.set(`financeiro_lancamento:${id}`, updated);
    
    console.log(`✅ Lançamento atualizado: ${id}`);
    
    return c.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar lançamento:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /lancamentos/:id - Excluir lançamento
app.delete('/lancamentos/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const organizationId = c.get('organizationId');
    
    // Buscar lançamento
    const lancamento = await kv.get(`financeiro_lancamento:${id}`);
    
    if (!lancamento) {
      return c.json({ success: false, error: 'Lançamento não encontrado' }, 404);
    }
    
    // Verificar permissão
    if (lancamento.organizationId !== organizationId) {
      return c.json({ success: false, error: 'Sem permissão' }, 403);
    }
    
    // Verificar se está conciliado
    if (lancamento.conciliado) {
      return c.json({ 
        success: false, 
        error: 'Lançamento conciliado não pode ser excluído' 
      }, 400);
    }
    
    // Deletar
    await kv.del(`financeiro_lancamento:${id}`);
    
    console.log(`✅ Lançamento excluído: ${id}`);
    
    return c.json({
      success: true,
      message: 'Lançamento excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir lançamento:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================================
// TÍTULOS (Similar structure for receber/pagar)
// ============================================================================

// ============================================================================
// RELATÓRIOS
// ============================================================================

// GET /relatorios/dre - Demonstrativo de Resultados
app.get('/relatorios/dre', async (c) => {
  try {
    const organizationId = c.get('organizationId');
    const { dataInicio, dataFim } = c.req.query();
    
    // Buscar lançamentos do período
    const allLancamentos = await kv.getByPrefix(`financeiro_lancamento:`);
    const lancamentos = allLancamentos.filter(l => 
      l.organizationId === organizationId &&
      l.competencia >= dataInicio &&
      l.competencia <= dataFim
    );
    
    // Calcular receitas
    const receitas = lancamentos
      .filter(l => l.tipo === 'entrada')
      .reduce((sum, l) => sum + l.valor, 0);
    
    // Calcular despesas
    const despesas = lancamentos
      .filter(l => l.tipo === 'saida')
      .reduce((sum, l) => sum + l.valor, 0);
    
    // Lucro líquido
    const lucroLiquido = receitas - despesas;
    const margemLiquida = receitas > 0 ? (lucroLiquido / receitas) * 100 : 0;
    
    // Agrupar por categoria
    const porCategoria = {};
    lancamentos.forEach(l => {
      const cat = l.categoriaNome || 'Sem categoria';
      if (!porCategoria[cat]) {
        porCategoria[cat] = { receitas: 0, despesas: 0 };
      }
      if (l.tipo === 'entrada') {
        porCategoria[cat].receitas += l.valor;
      } else {
        porCategoria[cat].despesas += l.valor;
      }
    });
    
    return c.json({
      success: true,
      data: {
        periodo: { inicio: dataInicio, fim: dataFim },
        resumo: {
          receitas,
          despesas,
          lucroLiquido,
          margemLiquida
        },
        porCategoria
      }
    });
  } catch (error) {
    console.error('Erro ao gerar DRE:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================================
// HELPERS
// ============================================================================

async function atualizarSaldoConta(contaId: string, tipo: string, valor: number) {
  const conta = await kv.get(`financeiro_conta_bancaria:${contaId}`);
  if (!conta) return;
  
  if (tipo === 'entrada') {
    conta.saldo = (conta.saldo || 0) + valor;
  } else if (tipo === 'saida') {
    conta.saldo = (conta.saldo || 0) - valor;
  }
  
  await kv.set(`financeiro_conta_bancaria:${contaId}`, conta);
}

export default app;
```

---

### **Registrar no Index**

```typescript
// /supabase/functions/server/index.tsx

import financeiroApp from './routes-financeiro.ts';

// ... outras rotas ...

app.route('/make-server-67caf26a/financeiro', financeiroApp);
```

---

## 🔐 SEGURANÇA E PERMISSÕES

### **1. Isolamento Multi-Tenant**

**TODAS as queries devem filtrar por `organizationId`:**

```typescript
// ❌ ERRADO - Retorna dados de todos os tenants
const lancamentos = await kv.getByPrefix('financeiro_lancamento:');

// ✅ CORRETO - Filtra por organização
const lancamentos = await kv.getByPrefix('financeiro_lancamento:');
const filtered = lancamentos.filter(l => l.organizationId === session.imobiliariaId);
```

### **2. Validação de Permissões**

```typescript
// Verificar se usuário tem permissão
function verificarPermissao(session, recurso, acao) {
  // SuperAdmin tem tudo
  if (session.type === 'superadmin') return true;
  
  // Verificar role
  const permissoes = {
    admin: ['create', 'read', 'update', 'delete'],
    manager: ['create', 'read', 'update'],
    staff: ['read'],
    readonly: ['read']
  };
  
  return permissoes[session.role]?.includes(acao) || false;
}
```

### **3. Auditoria**

**Todas as ações críticas devem ser auditadas:**

```typescript
async function criarAuditoria(acao, recurso, detalhes, userId, organizationId) {
  const auditoria = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    acao, // 'create', 'update', 'delete'
    recurso, // 'lancamento', 'titulo', etc
    detalhes,
    userId,
    organizationId,
    timestamp: new Date().toISOString(),
    ip: c.req.header('x-forwarded-for')
  };
  
  await kv.set(`auditoria:${auditoria.id}`, auditoria);
}
```

---

## 📊 REGRAS DE NEGÓCIO

### **1. Lançamentos**

```typescript
// Data de competência vs Data de caixa
competencia: Data em que a receita/despesa foi gerada
data: Data em que o dinheiro efetivamente entrou/saiu

Exemplo:
- Reserva de Janeiro paga em Dezembro
  competencia: '2025-01-15' (quando hóspede ficou)
  data: '2024-12-20' (quando pagou)
```

### **2. Títulos**

```typescript
// Cálculo de juros e multa
const calcularJurosMulta = (titulo, dataPagamento) => {
  const diasAtraso = diferençaDias(titulo.vencimento, dataPagamento);
  
  if (diasAtraso <= 0) {
    return { juros: 0, multa: 0 };
  }
  
  // Multa: 2% sobre o valor
  const multa = titulo.valor * 0.02;
  
  // Juros: 1% ao mês (pro-rata)
  const juros = titulo.valor * 0.01 * (diasAtraso / 30);
  
  return { juros, multa };
};

// Valor total a pagar
valorTotal = titulo.valor + juros + multa - desconto;
```

### **3. Conciliação**

```typescript
// Score de confiança
const calcularConfianca = (linhaExtrato, lancamento) => {
  let score = 0;
  
  // Valor exato (+50 pontos)
  if (linhaExtrato.valor === lancamento.valor) {
    score += 50;
  }
  
  // Valor próximo (±5%) (+30 pontos)
  else if (Math.abs(linhaExtrato.valor - lancamento.valor) / lancamento.valor <= 0.05) {
    score += 30;
  }
  
  // Datas próximas (±3 dias) (+30 pontos)
  const diasDiferenca = diferençaDias(linhaExtrato.data, lancamento.data);
  if (diasDiferenca <= 3) {
    score += 30;
  }
  
  // Descrição similar (+20 pontos)
  if (similaridade(linhaExtrato.descricao, lancamento.descricao) > 0.7) {
    score += 20;
  }
  
  return Math.min(score, 100); // Max 100%
};
```

---

## 📈 PERFORMANCE E ESCALABILIDADE

### **1. Índices e Caching**

```typescript
// Cache em memória para categorias (não mudam frequentemente)
const cacheCategories = new Map();

async function getCategorias(organizationId) {
  const cacheKey = `cat_${organizationId}`;
  
  if (cacheCategories.has(cacheKey)) {
    return cacheCategories.get(cacheKey);
  }
  
  const categorias = await kv.getByPrefix(`financeiro_categoria:`);
  const filtered = categorias.filter(c => c.organizationId === organizationId);
  
  cacheCategories.set(cacheKey, filtered);
  
  return filtered;
}
```

### **2. Paginação Eficiente**

```typescript
// Usar cursores ao invés de offset para grandes datasets
interface PaginationCursor {
  lastId: string;
  lastDate: string;
}

async function getLancamentosPaginated(cursor?: PaginationCursor, limit = 25) {
  let lancamentos = await kv.getByPrefix('financeiro_lancamento:');
  
  if (cursor) {
    lancamentos = lancamentos.filter(l => 
      l.data < cursor.lastDate || 
      (l.data === cursor.lastDate && l.id > cursor.lastId)
    );
  }
  
  const page = lancamentos.slice(0, limit);
  const nextCursor = page.length === limit 
    ? { lastId: page[page.length - 1].id, lastDate: page[page.length - 1].data }
    : null;
  
  return { data: page, nextCursor };
}
```

### **3. Batch Operations**

```typescript
// Importar múltiplos lançamentos de uma vez
async function importarLancamentosBatch(lancamentos: Lancamento[]) {
  const operations = lancamentos.map(l => ({
    key: `financeiro_lancamento:${l.id}`,
    value: l
  }));
  
  // Usar mset para salvar todos de uma vez
  await kv.mset(operations);
  
  console.log(`✅ ${lancamentos.length} lançamentos importados`);
}
```

---

## 🧪 TESTES

### **1. Testes Unitários (Vitest)**

```typescript
// tests/financeiro/calculos.test.ts

import { describe, it, expect } from 'vitest';
import { calcularJurosMulta, calcularDRE } from '../utils/financeiro';

describe('Cálculos Financeiros', () => {
  it('deve calcular juros e multa corretamente', () => {
    const titulo = {
      valor: 1000,
      vencimento: '2025-10-01'
    };
    
    const result = calcularJurosMulta(titulo, '2025-10-15');
    
    expect(result.multa).toBe(20); // 2%
    expect(result.juros).toBeCloseTo(5, 1); // ~1% * (15/30)
  });
  
  it('deve gerar DRE corretamente', () => {
    const lancamentos = [
      { tipo: 'entrada', valor: 1000, categoriaId: 'cat1' },
      { tipo: 'saida', valor: 400, categoriaId: 'cat2' }
    ];
    
    const dre = calcularDRE(lancamentos);
    
    expect(dre.receitas).toBe(1000);
    expect(dre.despesas).toBe(400);
    expect(dre.lucroLiquido).toBe(600);
    expect(dre.margemLiquida).toBe(60);
  });
});
```

### **2. Testes de Integração**

```typescript
// tests/financeiro/api.test.ts

describe('API Financeiro', () => {
  it('deve criar lançamento via API', async () => {
    const response = await fetch('/make-server-67caf26a/financeiro/lancamentos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tipo: 'entrada',
        data: '2025-11-01',
        descricao: 'Test',
        valor: 1000,
        moeda: 'BRL'
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
  });
});
```

---

## 🚀 PRÓXIMOS PASSOS (ROADMAP)

### **Sprint 1 (2 semanas)** ⬅️ **COMEÇAR AQUI**

**Objetivo:** Backend básico funcionando

- [ ] Criar arquivo `/supabase/functions/server/routes-financeiro.ts`
- [ ] Implementar rotas de lançamentos (CRUD)
- [ ] Implementar rotas de categorias
- [ ] Registrar rotas no `index.tsx`
- [ ] Testar com Postman/cURL
- [ ] Integrar frontend com API real
- [ ] Remover dados mock do frontend

**Critério de aceite:**
- Criar, listar, editar e excluir lançamentos via API
- Dados salvos no Supabase
- Multi-tenant funcionando (isolamento por organização)

---

### **Sprint 2 (2 semanas)**

**Objetivo:** Títulos a Receber/Pagar

- [ ] Implementar rotas de títulos
- [ ] Criar página de gestão de títulos
- [ ] Implementar quitação de títulos
- [ ] Criar integração com Reservas (auto-criar títulos)
- [ ] Implementar cálculo de juros/multa
- [ ] Notificações de vencimento (email/WhatsApp)

---

### **Sprint 3 (2 semanas)**

**Objetivo:** Contas Bancárias e Extratos

- [ ] Implementar rotas de contas bancárias
- [ ] Criar página de gestão de contas
- [ ] Implementar upload de OFX/CSV
- [ ] Parser de extratos
- [ ] Deduplicação de transações
- [ ] Visualização de extratos importados

---

### **Sprint 4 (3 semanas)**

**Objetivo:** Conciliação Bancária

- [ ] Implementar regras de conciliação
- [ ] Criar UI de conciliação
- [ ] Sugestões automáticas
- [ ] Match manual
- [ ] Criar lançamento a partir do extrato
- [ ] Dashboard de pendências

---

### **Sprint 5 (2 semanas)**

**Objetivo:** Relatórios

- [ ] Implementar DRE backend
- [ ] Criar visualização DRE frontend
- [ ] Implementar Fluxo de Caixa
- [ ] Gráficos interativos (Recharts)
- [ ] Exportação em Excel/PDF
- [ ] Aging de contas a receber

---

### **Sprint 6 (3 semanas)**

**Objetivo:** Integrações

- [ ] Open Finance (autenticação)
- [ ] Importação automática de extratos
- [ ] NF-e/NFS-e (emissão básica)
- [ ] Webhooks (eventos)
- [ ] Machine Learning (categorização)

---

## 📞 SUPORTE E CONTATO

**Documentação:**
- Este arquivo: `/docs/MODULO_FINANCEIRO_COMPLETO_v1.0.103.260.md`
- Types: `/types/financeiro.ts`
- Componentes: `/components/financeiro/`

**Para Desenvolvedores:**
- Issues: GitHub Issues
- Chat: Slack #financeiro
- Email: dev@rendizy.com

**Status do Módulo:**
- 🟢 Frontend: 80% completo
- 🔴 Backend: 0% completo
- 🟡 Integrações: 0% completo
- **OVERALL: 30% completo**

---

**Última atualização:** 03 NOV 2025  
**Versão do sistema:** v1.0.103.260-MULTI-TENANT-AUTH  
**Autor:** Equipe RENDIZY  

---

# 🎯 RESUMO EXECUTIVO PARA CODEX

## O QUE JÁ TEMOS:

1. ✅ **Frontend completo** (80%)
   - Dashboard com KPIs
   - 5 páginas implementadas
   - Componentes reutilizáveis
   - Dark mode, responsivo

2. ✅ **TypeScript types** (100%)
   - Todas interfaces definidas
   - 493 linhas de tipos
   - Documentado e comentado

3. ✅ **UI/UX Design** (90%)
   - shadcn/ui components
   - Lucide icons
   - Tailwind CSS
   - Profissional e polido

## O QUE FALTA:

1. ❌ **Backend** (0%)
   - Criar arquivo `routes-financeiro.ts`
   - Implementar CRUD de lançamentos
   - Implementar CRUD de títulos
   - Implementar relatórios (DRE, Fluxo)

2. ❌ **Conciliação** (0%)
   - Import de extratos
   - Regras automáticas
   - Machine Learning

3. ❌ **Integrações** (0%)
   - Open Finance
   - NF-e/NFS-e

## PRÓXIMO PASSO:

**COMEÇAR PELO SPRINT 1:**

1. Criar `/supabase/functions/server/routes-financeiro.ts`
2. Implementar rotas básicas de lançamentos
3. Conectar frontend com backend
4. Testar multi-tenant

**Tempo estimado:** 2 semanas  
**Complexidade:** Média  
**Prioridade:** 🔴 ALTA  

---

**Este documento está pronto para ser enviado ao Codex ou qualquer ferramenta de IA para continuar o desenvolvimento.** 🚀
