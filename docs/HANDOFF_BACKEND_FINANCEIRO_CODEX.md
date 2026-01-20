# 📦 HANDOFF COMPLETO - BACKEND FINANCEIRO RENDIZY

**Destinatário:** Codex AI / Equipe de Desenvolvimento  
**Data:** 03 NOV 2025  
**Versão RENDIZY:** v1.0.103.260-MULTI-TENANT-AUTH  
**Status:** ✅ FRONTEND COMPLETO | 🔴 BACKEND PENDENTE  

---

## 📋 ÍNDICE

1. [Visão Geral do Handoff](#visão-geral-do-handoff)
2. [Contratos de API (REST)](#contratos-de-api-rest)
3. [Modelo de Dados Completo](#modelo-de-dados-completo)
4. [Regras de Negócio Detalhadas](#regras-de-negócio-detalhadas)
5. [Integrações Externas](#integrações-externas)
6. [Requisitos Não Funcionais](#requisitos-não-funcionais)
7. [Evidências Visuais](#evidências-visuais)
8. [Cenários de Teste](#cenários-de-teste)
9. [Plano de Implementação](#plano-de-implementação)

---

## 🎯 VISÃO GERAL DO HANDOFF

### **O que já temos:**

✅ **Frontend 100% implementado**
- 5 páginas funcionais: Dashboard, Lançamentos, Contas a Receber, Contas a Pagar, DRE, Fluxo de Caixa
- 6 componentes reutilizáveis: KpiCard, Money, PeriodPicker, DataTable, SplitEditor, CurrencyBadge
- TypeScript types completos (493 linhas em `/types/financeiro.ts`)
- UI/UX com shadcn/ui, dark mode, responsivo
- Rotas configuradas no React Router

✅ **Arquitetura definida**
- Multi-tenant com isolamento por `organizationId`
- Autenticação via Supabase Auth
- KV Store no Supabase (tabela `kv_store_67caf26a`)
- Edge Functions (Deno + Hono)

### **O que precisamos:**

❌ **Backend 0% implementado**
- Arquivo `/supabase/functions/server/routes-financeiro.ts` (CRIAR)
- Rotas REST para CRUD de lançamentos, títulos, contas, etc.
- Lógica de cálculos (juros, multa, DRE, fluxo de caixa)
- Conciliação bancária (regras e machine learning)
- Relatórios gerenciais

---

## 📡 CONTRATOS DE API (REST)

### **Base URL:**
```
https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/financeiro
```

### **Headers obrigatórios:**
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

### **1. LANÇAMENTOS**

#### **1.1 Criar Lançamento**

```http
POST /financeiro/lancamentos
```

**Request Body:**
```json
{
  "tipo": "entrada",
  "data": "2025-11-03",
  "competencia": "2025-11-03",
  "descricao": "Aluguel recebido - Apt 501",
  "valor": 3500.00,
  "moeda": "BRL",
  "categoriaId": "cat_1234",
  "categoriaNome": "Receita de Aluguéis",
  "contaId": "conta_5678",
  "contaNome": "Banco Itaú CC 1234-5",
  "centroCustoId": "cc_apt501",
  "centroCustoNome": "Apartamento 501",
  "projetoId": null,
  "documento": "REC-2025-001",
  "notaFiscal": null,
  "observacoes": "Pagamento via PIX",
  "hasSplit": false,
  "splits": []
}
```

**Validações:**
- `tipo` obrigatório: `'entrada' | 'saida' | 'transferencia'`
- `data` obrigatória: formato ISO 8601 (YYYY-MM-DD)
- `valor` obrigatório: number > 0
- `moeda` obrigatória: `'BRL' | 'USD' | 'EUR'`
- `categoriaId` obrigatório para tipo !== 'transferencia'
- `contaId` obrigatório (conta bancária)
- Se `hasSplit = true`, `splits` deve ter ao menos 2 itens
- Soma de `splits.valor` ou `splits.percentual` deve = 100% ou valor total

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "lancamento_1730649600000_abc123",
    "organizationId": "org_rppt_001",
    "tipo": "entrada",
    "data": "2025-11-03",
    "competencia": "2025-11-03",
    "descricao": "Aluguel recebido - Apt 501",
    "valor": 3500.00,
    "moeda": "BRL",
    "categoriaId": "cat_1234",
    "categoriaNome": "Receita de Aluguéis",
    "contaId": "conta_5678",
    "contaNome": "Banco Itaú CC 1234-5",
    "centroCustoId": "cc_apt501",
    "centroCustoNome": "Apartamento 501",
    "documento": "REC-2025-001",
    "observacoes": "Pagamento via PIX",
    "conciliado": false,
    "hasSplit": false,
    "splits": [],
    "createdBy": "user_rppt",
    "createdAt": "2025-11-03T10:00:00.000Z",
    "updatedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Valor deve ser maior que zero",
  "code": "INVALID_VALOR",
  "field": "valor"
}
```

**Response Error (401):**
```json
{
  "success": false,
  "error": "Não autenticado",
  "code": "UNAUTHORIZED"
}
```

**Response Error (403):**
```json
{
  "success": false,
  "error": "Sem permissão para criar lançamentos",
  "code": "FORBIDDEN"
}
```

---

#### **1.2 Listar Lançamentos**

```http
GET /financeiro/lancamentos
```

**Query Parameters:**
```
?page=1                     // Página atual (default: 1)
&limit=25                   // Itens por página (default: 25, max: 100)
&dataInicio=2025-11-01      // Filtrar por data >= (opcional)
&dataFim=2025-11-30         // Filtrar por data <= (opcional)
&tipo=entrada               // Filtrar por tipo (opcional)
&categoriaId=cat_1234       // Filtrar por categoria (opcional)
&centroCustoId=cc_apt501    // Filtrar por centro de custo (opcional)
&contaId=conta_5678         // Filtrar por conta bancária (opcional)
&conciliado=false           // Filtrar por status conciliação (opcional)
&busca=aluguel              // Busca texto livre (descrição) (opcional)
&orderBy=data               // Campo ordenação (default: data)
&order=desc                 // Direção (asc|desc, default: desc)
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "lancamento_1730649600000_abc123",
      "organizationId": "org_rppt_001",
      "tipo": "entrada",
      "data": "2025-11-03",
      "descricao": "Aluguel recebido - Apt 501",
      "valor": 3500.00,
      "moeda": "BRL",
      "categoriaId": "cat_1234",
      "categoriaNome": "Receita de Aluguéis",
      "contaId": "conta_5678",
      "contaNome": "Banco Itaú CC 1234-5",
      "centroCustoId": "cc_apt501",
      "conciliado": false,
      "hasSplit": false,
      "createdAt": "2025-11-03T10:00:00.000Z"
    }
    // ... mais lançamentos
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 25,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "totalEntradas": 125000.00,
    "totalSaidas": 45000.00,
    "saldo": 80000.00
  }
}
```

---

#### **1.3 Obter Lançamento por ID**

```http
GET /financeiro/lancamentos/:id
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "lancamento_1730649600000_abc123",
    // ... todos os campos do lançamento
    "anexos": [
      {
        "id": "anexo_001",
        "nome": "comprovante.pdf",
        "url": "https://storage.supabase.co/...",
        "tipo": "application/pdf",
        "tamanho": 245632
      }
    ]
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": "Lançamento não encontrado",
  "code": "NOT_FOUND"
}
```

---

#### **1.4 Atualizar Lançamento**

```http
PUT /financeiro/lancamentos/:id
```

**Request Body:** (mesmos campos do POST, todos opcionais)
```json
{
  "descricao": "Aluguel recebido - Apt 501 (Atualizado)",
  "observacoes": "Pagamento via PIX - Confirmado"
}
```

**Validações:**
- Lançamento não pode estar conciliado (conciliado = false)
- Não pode alterar `organizationId`, `id`, `createdBy`, `createdAt`
- Mesmo tenant (verificar `organizationId`)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    // Lançamento atualizado
    "updatedAt": "2025-11-03T15:30:00.000Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Lançamento conciliado não pode ser alterado",
  "code": "RECONCILED_IMMUTABLE"
}
```

---

#### **1.5 Excluir Lançamento**

```http
DELETE /financeiro/lancamentos/:id
```

**Validações:**
- Lançamento não pode estar conciliado
- Mesmo tenant

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lançamento excluído com sucesso"
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Lançamento conciliado não pode ser excluído",
  "code": "RECONCILED_IMMUTABLE"
}
```

---

### **2. TÍTULOS (RECEBER/PAGAR)**

#### **2.1 Criar Título**

```http
POST /financeiro/titulos
```

**Request Body:**
```json
{
  "tipo": "receber",
  "emissao": "2025-11-03",
  "vencimento": "2025-12-03",
  "competencia": "2025-11-03",
  "pessoa": "João Silva",
  "pessoaId": "cliente_001",
  "descricao": "Aluguel Novembro/2025 - Apt 501",
  "moeda": "BRL",
  "valor": 3500.00,
  "categoriaId": "cat_1234",
  "centroCustoId": "cc_apt501",
  "contaBancariaId": "conta_5678",
  "projetoId": null,
  "numeroDocumento": "BOL-2025-001",
  "observacoes": "Gerar boleto automático",
  "recorrente": true,
  "recorrenciaFrequencia": "mensal",
  "recorrenciaTotal": 12
}
```

**Validações:**
- `tipo` obrigatório: `'receber' | 'pagar'`
- `emissao`, `vencimento`, `valor`, `pessoa` obrigatórios
- `vencimento` >= `emissao`
- Se `recorrente = true`, `recorrenciaFrequencia` e `recorrenciaTotal` obrigatórios

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "titulo_1730649600000_xyz789",
    "organizationId": "org_rppt_001",
    "tipo": "receber",
    "emissao": "2025-11-03",
    "vencimento": "2025-12-03",
    "pessoa": "João Silva",
    "pessoaId": "cliente_001",
    "descricao": "Aluguel Novembro/2025 - Apt 501",
    "moeda": "BRL",
    "valorOriginal": 3500.00,
    "valor": 3500.00,
    "saldo": 3500.00,
    "valorPago": 0,
    "status": "aberto",
    "diasVencimento": 30,
    "recorrente": true,
    "parcela": 1,
    "totalParcelas": 12,
    "createdAt": "2025-11-03T10:00:00.000Z"
  },
  "parcelas": [
    {
      "id": "titulo_1730649600001_001",
      "parcela": 2,
      "vencimento": "2026-01-03",
      "valor": 3500.00
    }
    // ... demais parcelas
  ]
}
```

---

#### **2.2 Listar Títulos**

```http
GET /financeiro/titulos
```

**Query Parameters:**
```
?tipo=receber               // Filtrar por tipo (obrigatório)
&page=1
&limit=25
&dataInicio=2025-11-01      // Por vencimento
&dataFim=2025-11-30
&status=aberto              // aberto|pago|vencido|parcial|cancelado
&pessoaId=cliente_001
&categoriaId=cat_1234
&busca=joão
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "titulo_001",
      "tipo": "receber",
      "vencimento": "2025-12-03",
      "pessoa": "João Silva",
      "descricao": "Aluguel Nov/2025",
      "valor": 3500.00,
      "saldo": 3500.00,
      "status": "aberto",
      "diasVencimento": 30
    }
  ],
  "pagination": { /* ... */ },
  "summary": {
    "totalAberto": 50000.00,
    "totalVencido": 12000.00,
    "totalPago": 85000.00,
    "count": {
      "aberto": 15,
      "vencido": 5,
      "pago": 45
    }
  }
}
```

---

#### **2.3 Quitar Título**

```http
POST /financeiro/titulos/:id/quitar
```

**Request Body:**
```json
{
  "dataPagamento": "2025-11-15",
  "valorPago": 3500.00,
  "formaPagamento": "PIX",
  "contaBancariaId": "conta_5678",
  "desconto": 0,
  "juros": 0,
  "multa": 0,
  "observacoes": "Pagamento antecipado",
  "criarLancamento": true
}
```

**Validações:**
- Título deve estar `aberto`, `vencido` ou `parcial`
- `valorPago` > 0
- `valorPago` <= `saldo`
- Se `dataPagamento` > `vencimento`, calcular juros/multa automaticamente

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "titulo_001",
    "status": "pago",
    "valorPago": 3500.00,
    "saldo": 0,
    "dataPagamento": "2025-11-15",
    "updatedAt": "2025-11-15T14:00:00.000Z"
  },
  "lancamento": {
    "id": "lancamento_auto_001",
    "tipo": "entrada",
    "valor": 3500.00,
    "descricao": "Quitação Título #titulo_001"
  },
  "calculos": {
    "valorOriginal": 3500.00,
    "desconto": 0,
    "juros": 0,
    "multa": 0,
    "valorTotal": 3500.00
  }
}
```

---

#### **2.4 Cancelar Título**

```http
POST /financeiro/titulos/:id/cancelar
```

**Request Body:**
```json
{
  "motivo": "Reserva cancelada pelo cliente",
  "observacoes": "Cancelamento solicitado em 03/11/2025"
}
```

**Validações:**
- Título não pode estar `pago` ou `cancelado`
- `motivo` obrigatório

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "titulo_001",
    "status": "cancelado",
    "motivoCancelamento": "Reserva cancelada pelo cliente",
    "canceladoEm": "2025-11-03T16:00:00.000Z",
    "canceladoPor": "user_rppt"
  }
}
```

---

### **3. CONTAS BANCÁRIAS**

#### **3.1 Criar Conta Bancária**

```http
POST /financeiro/contas-bancarias
```

**Request Body:**
```json
{
  "nome": "Banco Itaú - Conta Corrente",
  "banco": "Itaú Unibanco",
  "agencia": "1234",
  "numero": "12345-6",
  "tipo": "corrente",
  "moeda": "BRL",
  "saldoInicial": 10000.00,
  "ativo": true
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "conta_1730649600000_itau001",
    "organizationId": "org_rppt_001",
    "nome": "Banco Itaú - Conta Corrente",
    "banco": "Itaú Unibanco",
    "agencia": "1234",
    "numero": "12345-6",
    "tipo": "corrente",
    "moeda": "BRL",
    "saldo": 10000.00,
    "saldoInicial": 10000.00,
    "ativo": true,
    "statusFeed": "desconectado",
    "createdAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

#### **3.2 Listar Contas Bancárias**

```http
GET /financeiro/contas-bancarias
```

**Query Parameters:**
```
?ativo=true                 // Filtrar por ativas (opcional)
&moeda=BRL                  // Filtrar por moeda (opcional)
&tipo=corrente              // Filtrar por tipo (opcional)
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "conta_001",
      "nome": "Banco Itaú CC",
      "banco": "Itaú",
      "tipo": "corrente",
      "moeda": "BRL",
      "saldo": 45320.50,
      "ativo": true,
      "statusFeed": "conectado",
      "ultimaSincronizacao": "2025-11-03T08:00:00.000Z"
    }
  ],
  "summary": {
    "totalBRL": 45320.50,
    "totalUSD": 5000.00,
    "totalEUR": 0,
    "totalContas": 3,
    "contasConectadas": 1
  }
}
```

---

### **4. EXTRATOS E CONCILIAÇÃO**

#### **4.1 Importar Extrato (Upload OFX/CSV)**

```http
POST /financeiro/extratos/importar
```

**Request Body (multipart/form-data):**
```
contaId: "conta_001"
arquivo: [binary file]
formato: "ofx" | "csv"
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "importacaoId": "import_001",
    "contaId": "conta_001",
    "formato": "ofx",
    "linhasImportadas": 45,
    "linhasDuplicadas": 3,
    "linhasErro": 0,
    "periodo": {
      "inicio": "2025-10-01",
      "fim": "2025-10-31"
    }
  },
  "linhas": [
    {
      "id": "extrato_001",
      "data": "2025-10-15",
      "descricao": "PIX RECEBIDO JOAO SILVA",
      "valor": 3500.00,
      "tipo": "credito",
      "conciliado": false,
      "sugestaoConfianca": 95,
      "sugestaoLancamentoId": "lancamento_123"
    }
    // ... mais linhas
  ]
}
```

---

#### **4.2 Listar Linhas de Extrato Pendentes**

```http
GET /financeiro/conciliacao/pendentes
```

**Query Parameters:**
```
?contaId=conta_001          // Filtrar por conta (opcional)
&dataInicio=2025-11-01
&dataFim=2025-11-30
&conciliado=false           // Default: false
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "extrato_001",
      "contaId": "conta_001",
      "contaNome": "Banco Itaú CC",
      "data": "2025-10-15",
      "descricao": "PIX RECEBIDO JOAO SILVA",
      "valor": 3500.00,
      "tipo": "credito",
      "conciliado": false,
      "sugestoes": [
        {
          "id": "sug_001",
          "tipo": "match",
          "confianca": 95,
          "lancamentoId": "lancamento_123",
          "lancamentoDescricao": "Aluguel - João Silva - Apt 501",
          "motivo": "Valor exato + descrição similar + data próxima"
        }
      ]
    }
  ],
  "pagination": { /* ... */ },
  "summary": {
    "totalPendente": 12350.00,
    "countPendente": 8
  }
}
```

---

#### **4.3 Conciliar Linha de Extrato**

```http
POST /financeiro/conciliacao/match
```

**Request Body:**
```json
{
  "linhaExtratoId": "extrato_001",
  "lancamentoId": "lancamento_123",
  "observacoes": "Conciliação manual"
}
```

**Validações:**
- Linha não pode estar conciliada
- Lançamento não pode estar conciliado
- Mesma moeda
- Valores devem ser iguais (tolerância de ±5%)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "linhaExtrato": {
      "id": "extrato_001",
      "conciliado": true,
      "lancamentoId": "lancamento_123",
      "concilidoEm": "2025-11-03T10:00:00.000Z",
      "concilidoPor": "user_rppt"
    },
    "lancamento": {
      "id": "lancamento_123",
      "conciliado": true
    }
  }
}
```

---

#### **4.4 Criar Lançamento a partir de Extrato**

```http
POST /financeiro/conciliacao/criar-lancamento
```

**Request Body:**
```json
{
  "linhaExtratoId": "extrato_001",
  "tipo": "entrada",
  "categoriaId": "cat_1234",
  "centroCustoId": "cc_apt501",
  "descricao": "Receita identificada no extrato",
  "observacoes": "Criado automaticamente da conciliação"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "lancamento": {
      "id": "lancamento_auto_002",
      // ... campos do lançamento
      "conciliado": true,
      "linhaExtratoId": "extrato_001"
    },
    "linhaExtrato": {
      "id": "extrato_001",
      "conciliado": true,
      "lancamentoId": "lancamento_auto_002"
    }
  }
}
```

---

### **5. CATEGORIAS (PLANO DE CONTAS)**

#### **5.1 Criar Categoria**

```http
POST /financeiro/categorias
```

**Request Body:**
```json
{
  "codigo": "1.1.1",
  "nome": "Receita de Aluguéis - Temporada Alta",
  "tipo": "receita",
  "natureza": "credora",
  "nivel": 3,
  "parentId": "cat_parent_001",
  "analitica": true,
  "ativo": true,
  "grupo": "Receitas Operacionais",
  "subgrupo": "Aluguéis"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "cat_1730649600000_abc",
    "organizationId": "org_rppt_001",
    "codigo": "1.1.1",
    "nome": "Receita de Aluguéis - Temporada Alta",
    "tipo": "receita",
    "natureza": "credora",
    "nivel": 3,
    "parentId": "cat_parent_001",
    "analitica": true,
    "ativo": true,
    "createdAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

#### **5.2 Listar Categorias (Hierárquico)**

```http
GET /financeiro/categorias
```

**Query Parameters:**
```
?tipo=receita               // Filtrar por tipo (opcional)
&ativo=true                 // Apenas ativas (opcional)
&analitica=true             // Apenas analíticas (opcional)
&hierarquico=true           // Retornar em árvore (default: false)
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_001",
      "codigo": "1",
      "nome": "RECEITAS",
      "tipo": "receita",
      "nivel": 1,
      "analitica": false,
      "children": [
        {
          "id": "cat_002",
          "codigo": "1.1",
          "nome": "Receita de Aluguéis",
          "nivel": 2,
          "analitica": false,
          "children": [
            {
              "id": "cat_003",
              "codigo": "1.1.1",
              "nome": "Temporada Alta",
              "nivel": 3,
              "analitica": true,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

### **6. CENTRO DE CUSTOS**

#### **6.1 Criar Centro de Custo**

```http
POST /financeiro/centro-custos
```

**Request Body:**
```json
{
  "codigo": "APT501",
  "nome": "Apartamento 501 - Copacabana",
  "descricao": "Apartamento de luxo frente mar",
  "tipo": "unidade",
  "parentId": null,
  "ativo": true,
  "percentualRateio": 15,
  "orcamentoMensal": 10000.00,
  "orcamentoAnual": 120000.00
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": "cc_1730649600000_apt501",
    "organizationId": "org_rppt_001",
    "codigo": "APT501",
    "nome": "Apartamento 501 - Copacabana",
    "tipo": "unidade",
    "ativo": true,
    "createdAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

#### **6.2 Listar Centros de Custo**

```http
GET /financeiro/centro-custos
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cc_001",
      "codigo": "APT501",
      "nome": "Apartamento 501",
      "tipo": "unidade",
      "ativo": true,
      "totalGastos": 8500.00,
      "orcamentoMensal": 10000.00,
      "percentualUtilizado": 85
    }
  ]
}
```

---

### **7. RELATÓRIOS**

#### **7.1 DRE (Demonstrativo de Resultados)**

```http
GET /financeiro/relatorios/dre
```

**Query Parameters:**
```
?dataInicio=2025-11-01      // Obrigatório
&dataFim=2025-11-30         // Obrigatório
&centroCustoId=cc_001       // Opcional (filtrar por CC)
&comparativo=2024-11        // Opcional (período comparativo)
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
    "estrutura": [
      {
        "id": "receitas_brutas",
        "codigo": "1",
        "nome": "RECEITAS BRUTAS",
        "tipo": "grupo",
        "nivel": 1,
        "valor": 150000.00,
        "percentual": 100.00,
        "children": [
          {
            "id": "receitas_alugueis",
            "codigo": "1.1",
            "nome": "Receita de Aluguéis",
            "tipo": "grupo",
            "nivel": 2,
            "valor": 145000.00,
            "percentual": 96.67,
            "children": [
              {
                "id": "cat_1234",
                "codigo": "1.1.1",
                "nome": "Temporada Alta",
                "tipo": "conta",
                "nivel": 3,
                "valor": 100000.00,
                "percentual": 66.67,
                "children": []
              }
            ]
          }
        ]
      },
      {
        "id": "deducoes",
        "codigo": "(-)",
        "nome": "(-) DEDUÇÕES",
        "tipo": "grupo",
        "nivel": 1,
        "valor": -5000.00,
        "percentual": -3.33,
        "children": []
      },
      {
        "id": "receita_liquida",
        "codigo": "=",
        "nome": "= RECEITA LÍQUIDA",
        "tipo": "resultado",
        "nivel": 1,
        "valor": 145000.00,
        "percentual": 100.00,
        "children": []
      },
      {
        "id": "custos_diretos",
        "codigo": "2",
        "nome": "CUSTOS DIRETOS",
        "tipo": "grupo",
        "nivel": 1,
        "valor": -45000.00,
        "percentual": -31.03,
        "children": []
      },
      {
        "id": "lucro_bruto",
        "codigo": "=",
        "nome": "= LUCRO BRUTO",
        "tipo": "resultado",
        "nivel": 1,
        "valor": 100000.00,
        "percentual": 68.97,
        "children": []
      },
      {
        "id": "despesas_operacionais",
        "codigo": "3",
        "nome": "DESPESAS OPERACIONAIS",
        "tipo": "grupo",
        "nivel": 1,
        "valor": -30000.00,
        "percentual": -20.69,
        "children": []
      },
      {
        "id": "ebitda",
        "codigo": "=",
        "nome": "= EBITDA",
        "tipo": "resultado",
        "nivel": 1,
        "valor": 70000.00,
        "percentual": 48.28,
        "children": []
      },
      {
        "id": "lucro_liquido",
        "codigo": "=",
        "nome": "= LUCRO LÍQUIDO",
        "tipo": "resultado",
        "nivel": 1,
        "valor": 44100.00,
        "percentual": 30.41,
        "children": []
      }
    ],
    "indicadores": {
      "receitaBruta": 150000.00,
      "receitaLiquida": 145000.00,
      "lucroBruto": 100000.00,
      "margemBruta": 68.97,
      "ebitda": 70000.00,
      "margemEbitda": 48.28,
      "lucroLiquido": 44100.00,
      "margemLiquida": 30.41
    }
  }
}
```

---

#### **7.2 Fluxo de Caixa**

```http
GET /financeiro/relatorios/fluxo-caixa
```

**Query Parameters:**
```
?dataInicio=2025-11-01
&dataFim=2025-12-31
&granularidade=mensal       // diario|semanal|mensal
&cenario=base               // otimista|base|pessimista
&incluirProjetado=true      // Incluir títulos futuros
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-12-31"
    },
    "saldoInicial": 50000.00,
    "periodos": [
      {
        "periodo": "2025-11",
        "dataInicio": "2025-11-01",
        "dataFim": "2025-11-30",
        "entradas": {
          "realizado": 125000.00,
          "projetado": 25000.00,
          "total": 150000.00
        },
        "saidas": {
          "realizado": 68000.00,
          "projetado": 12000.00,
          "total": 80000.00
        },
        "saldo": 70000.00,
        "saldoAcumulado": 120000.00
      },
      {
        "periodo": "2025-12",
        "dataInicio": "2025-12-01",
        "dataFim": "2025-12-31",
        "entradas": {
          "realizado": 0,
          "projetado": 180000.00,
          "total": 180000.00
        },
        "saidas": {
          "realizado": 0,
          "projetado": 90000.00,
          "total": 90000.00
        },
        "saldo": 90000.00,
        "saldoAcumulado": 210000.00
      }
    ],
    "resumo": {
      "totalEntradas": 330000.00,
      "totalSaidas": 170000.00,
      "saldoFinal": 210000.00,
      "variacao": 160000.00,
      "pontoRuptura": null
    }
  }
}
```

---

#### **7.3 Balancete**

```http
GET /financeiro/relatorios/balancete
```

**Query Parameters:**
```
?dataInicio=2025-11-01
&dataFim=2025-11-30
&nivel=3                    // Nível de detalhamento (1-5)
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
    "contas": [
      {
        "codigo": "1.1.1",
        "nome": "Receita de Aluguéis - Alta",
        "tipo": "receita",
        "natureza": "credora",
        "saldoAnterior": 0,
        "debitos": 0,
        "creditos": 100000.00,
        "saldoAtual": 100000.00
      }
      // ... mais contas
    ],
    "totalizadores": {
      "ativo": {
        "saldoAnterior": 500000.00,
        "debitos": 200000.00,
        "creditos": 150000.00,
        "saldoAtual": 550000.00
      },
      "passivo": {
        "saldoAnterior": 300000.00,
        "debitos": 100000.00,
        "creditos": 120000.00,
        "saldoAtual": 320000.00
      },
      "receitas": {
        "saldoAnterior": 0,
        "debitos": 0,
        "creditos": 150000.00,
        "saldoAtual": 150000.00
      },
      "despesas": {
        "saldoAnterior": 0,
        "debitos": 68000.00,
        "creditos": 0,
        "saldoAtual": 68000.00
      }
    }
  }
}
```

---

#### **7.4 Aging (Contas a Receber)**

```http
GET /financeiro/relatorios/aging
```

**Query Parameters:**
```
?dataBase=2025-11-03        // Data base para cálculo (default: hoje)
&tipo=receber               // receber|pagar
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "dataBase": "2025-11-03",
    "tipo": "receber",
    "clientes": [
      {
        "cliente": "João Silva",
        "clienteId": "cliente_001",
        "faixa_0_30": 3500.00,
        "faixa_31_60": 0,
        "faixa_61_90": 0,
        "faixa_90_plus": 0,
        "total": 3500.00,
        "titulos": 1
      },
      {
        "cliente": "Maria Santos",
        "clienteId": "cliente_002",
        "faixa_0_30": 0,
        "faixa_31_60": 5000.00,
        "faixa_61_90": 2800.00,
        "faixa_90_plus": 1500.00,
        "total": 9300.00,
        "titulos": 3
      }
    ],
    "totais": {
      "faixa_0_30": 3500.00,
      "faixa_31_60": 5000.00,
      "faixa_61_90": 2800.00,
      "faixa_90_plus": 1500.00,
      "total": 12800.00,
      "percentual_0_30": 27.34,
      "percentual_31_60": 39.06,
      "percentual_61_90": 21.88,
      "percentual_90_plus": 11.72
    }
  }
}
```

---

### **8. CONFIGURAÇÕES**

#### **8.1 Obter Configurações**

```http
GET /financeiro/config
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "config_org_rppt_001",
    "organizationId": "org_rppt_001",
    "moedasAtivas": ["BRL", "USD"],
    "moedaPrincipal": "BRL",
    "contaCaixaId": "conta_001",
    "contaBancoId": "conta_002",
    "casasDecimais": 2,
    "separadorMilhar": ".",
    "separadorDecimal": ",",
    "toleranciaDias": 3,
    "toleranciaValor": 5,
    "autoAplicarRegras": true,
    "ordemPrioridadeRegras": "decrescente",
    "ambienteFiscal": "homologacao",
    "createdAt": "2025-10-01T10:00:00.000Z",
    "updatedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

---

#### **8.2 Atualizar Configurações**

```http
PUT /financeiro/config
```

**Request Body:** (todos campos opcionais)
```json
{
  "moedasAtivas": ["BRL", "USD", "EUR"],
  "autoAplicarRegras": false,
  "toleranciaDias": 5
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    // Configurações atualizadas
    "updatedAt": "2025-11-03T15:00:00.000Z"
  }
}
```

---

## 🗄️ MODELO DE DADOS COMPLETO

### **KV Store - Estrutura de Chaves**

```typescript
// LANÇAMENTOS
financeiro_lancamento:{id}
// Exemplo: financeiro_lancamento:lancamento_1730649600000_abc123

// ÍNDICES DE LANÇAMENTOS
financeiro_lancamentos:{organizationId}:index
// Array de IDs: ["lancamento_001", "lancamento_002", ...]

financeiro_lancamentos:{organizationId}:{YYYY-MM}:index
// Exemplo: financeiro_lancamentos:org_rppt_001:2025-11:index

// TÍTULOS
financeiro_titulo:{id}
financeiro_titulos:{organizationId}:receber:index
financeiro_titulos:{organizationId}:pagar:index
financeiro_titulos:{organizationId}:{YYYY-MM}:index

// CONTAS BANCÁRIAS
financeiro_conta_bancaria:{id}
financeiro_contas_bancarias:{organizationId}:index

// LINHAS DE EXTRATO
financeiro_linha_extrato:{id}
financeiro_linhas_extrato:{contaId}:index
financeiro_linhas_extrato:{contaId}:{YYYY-MM-DD}:index

// CATEGORIAS (PLANO DE CONTAS)
financeiro_categoria:{id}
financeiro_categorias:{organizationId}:index
financeiro_categorias:{organizationId}:hierarquia
// Estrutura hierárquica pré-calculada

// CENTRO DE CUSTOS
financeiro_centro_custo:{id}
financeiro_centros_custo:{organizationId}:index

// REGRAS DE CONCILIAÇÃO
financeiro_regra_conciliacao:{id}
financeiro_regras_conciliacao:{organizationId}:index

// SUGESTÕES DE CONCILIAÇÃO
financeiro_sugestao:{id}
financeiro_sugestoes:{linhaExtratoId}:index

// DOCUMENTOS FISCAIS
financeiro_documento_fiscal:{id}
financeiro_documentos_fiscais:{organizationId}:index

// CONFIGURAÇÕES
financeiro_config:{organizationId}
// Exemplo: financeiro_config:org_rppt_001

// AUDITORIA
financeiro_auditoria:{id}
financeiro_auditorias:{organizationId}:{YYYY-MM}:index
```

---

### **Entidades TypeScript** (já definidas em `/types/financeiro.ts`)

Todas as interfaces já estão implementadas. Principais:

1. **Lancamento** (137 linhas)
2. **Titulo** (202 linhas)
3. **ContaBancaria** (44 linhas)
4. **LinhaExtrato** (63 linhas)
5. **RegraConciliacao** (95 linhas)
6. **SplitDestino** (149 linhas)
7. **CentroCusto** (225 linhas)
8. **ContaContabil** (251 linhas)
9. **DocumentoFiscal** (318 linhas)
10. **ConfiguracaoFinanceira** (357 linhas)

**Referência completa:** `/types/financeiro.ts` (493 linhas)

---

## 📐 REGRAS DE NEGÓCIO DETALHADAS

### **1. Lançamentos**

#### **1.1 Validações de Criação**

```typescript
// Pseudocódigo
function validarLancamento(data: Lancamento) {
  // Tipo obrigatório
  if (!data.tipo || !['entrada', 'saida', 'transferencia'].includes(data.tipo)) {
    throw new Error('Tipo inválido');
  }
  
  // Data obrigatória e não futura (opcional)
  if (!data.data) {
    throw new Error('Data obrigatória');
  }
  
  if (new Date(data.data) > new Date()) {
    throw new Error('Data não pode ser futura');
  }
  
  // Valor positivo
  if (!data.valor || data.valor <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }
  
  // Categoria obrigatória (exceto transferência)
  if (data.tipo !== 'transferencia' && !data.categoriaId) {
    throw new Error('Categoria obrigatória');
  }
  
  // Conta bancária obrigatória
  if (!data.contaId) {
    throw new Error('Conta bancária obrigatória');
  }
  
  // Validação de splits
  if (data.hasSplit) {
    if (!data.splits || data.splits.length < 2) {
      throw new Error('Split deve ter ao menos 2 destinos');
    }
    
    // Validar soma dos splits
    const somaPercentual = data.splits
      .filter(s => s.tipo === 'percentual')
      .reduce((sum, s) => sum + (s.percentual || 0), 0);
    
    const somaValor = data.splits
      .filter(s => s.tipo === 'valor')
      .reduce((sum, s) => sum + (s.valor || 0), 0);
    
    if (somaPercentual > 0 && Math.abs(somaPercentual - 100) > 0.01) {
      throw new Error('Soma de percentuais deve ser 100%');
    }
    
    if (somaValor > 0 && Math.abs(somaValor - data.valor) > 0.01) {
      throw new Error('Soma de valores deve igual ao total');
    }
  }
  
  return true;
}
```

---

#### **1.2 Atualização de Saldo da Conta**

```typescript
async function atualizarSaldoConta(contaId: string, tipo: string, valor: number) {
  const conta = await kv.get(`financeiro_conta_bancaria:${contaId}`);
  
  if (!conta) {
    throw new Error('Conta bancária não encontrada');
  }
  
  // Inicializar saldo se não existir
  if (conta.saldo === undefined) {
    conta.saldo = conta.saldoInicial || 0;
  }
  
  // Atualizar saldo baseado no tipo
  if (tipo === 'entrada') {
    conta.saldo += valor;
  } else if (tipo === 'saida') {
    conta.saldo -= valor;
  }
  // Transferência não altera saldo (afeta contaOrigem e contaDestino separadamente)
  
  // Atualizar timestamp
  conta.updatedAt = new Date().toISOString();
  
  // Salvar
  await kv.set(`financeiro_conta_bancaria:${contaId}`, conta);
  
  console.log(`✅ Saldo da conta ${contaId} atualizado: ${conta.saldo}`);
}
```

---

#### **1.3 Competência vs Caixa**

```typescript
// Data de CAIXA: quando o dinheiro efetivamente entrou/saiu
// Data de COMPETÊNCIA: quando a receita/despesa foi GERADA

// Exemplo 1: Aluguel de Janeiro pago em Dezembro
{
  data: '2024-12-28',           // Caixa: pagou em dez/2024
  competencia: '2025-01-15',    // Competência: aluguel de jan/2025
  descricao: 'Aluguel Janeiro/2025 pago antecipado'
}

// Exemplo 2: Despesa de Outubro paga em Novembro
{
  data: '2025-11-05',           // Caixa: pagou em nov/2025
  competencia: '2025-10-28',    // Competência: despesa de out/2025
  descricao: 'Manutenção Outubro/2025'
}

// Regras:
// - DRE usa COMPETÊNCIA
// - Fluxo de Caixa usa DATA (caixa)
// - Se competencia não informada, assume = data
```

---

### **2. Títulos a Receber/Pagar**

#### **2.1 Cálculo de Juros e Multa**

```typescript
interface CalculoJurosMulta {
  valorOriginal: number;
  diasAtraso: number;
  juros: number;
  multa: number;
  desconto: number;
  valorTotal: number;
}

function calcularJurosMulta(
  titulo: Titulo,
  dataPagamento: string,
  desconto = 0
): CalculoJurosMulta {
  const vencimento = new Date(titulo.vencimento);
  const pagamento = new Date(dataPagamento);
  
  // Calcular dias de atraso
  const diasAtraso = Math.max(0, 
    Math.floor((pagamento.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
  );
  
  let juros = 0;
  let multa = 0;
  
  // Se houver atraso
  if (diasAtraso > 0) {
    // Multa: 2% sobre o valor original (uma única vez)
    multa = titulo.valor * 0.02;
    
    // Juros: 1% ao mês (pro-rata por dia)
    // 1% ao mês = 0.01 / 30 = 0.000333... por dia
    const taxaDiaria = 0.01 / 30;
    juros = titulo.valor * taxaDiaria * diasAtraso;
  }
  
  // Valor total = valor original + juros + multa - desconto
  const valorTotal = titulo.valor + juros + multa - desconto;
  
  return {
    valorOriginal: titulo.valor,
    diasAtraso,
    juros: parseFloat(juros.toFixed(2)),
    multa: parseFloat(multa.toFixed(2)),
    desconto,
    valorTotal: parseFloat(valorTotal.toFixed(2))
  };
}

// Exemplo de uso:
const titulo = {
  id: 'titulo_001',
  valor: 1000.00,
  vencimento: '2025-10-01'
};

// Pagamento 15 dias após vencimento
const resultado = calcularJurosMulta(titulo, '2025-10-16', 0);
console.log(resultado);
// {
//   valorOriginal: 1000.00,
//   diasAtraso: 15,
//   juros: 5.00,        // 1% ao mês pro-rata (15 dias)
//   multa: 20.00,       // 2% de multa
//   desconto: 0,
//   valorTotal: 1025.00
// }
```

---

#### **2.2 Estados e Transições de Títulos**

```typescript
// Estados possíveis
type StatusTitulo = 'aberto' | 'pago' | 'vencido' | 'cancelado' | 'parcial';

// Diagrama de estados:
//
//  [aberto] → [pago]       (quitação total)
//     ↓
//  [vencido] → [pago]      (quitação após vencimento)
//     ↓
//  [parcial] → [pago]      (pagamento parcial + complemento)
//     ↓
//  [cancelado]             (terminal - não sai mais)

// Transições válidas
const transicoesValidas: Record<StatusTitulo, StatusTitulo[]> = {
  'aberto': ['pago', 'vencido', 'parcial', 'cancelado'],
  'vencido': ['pago', 'parcial', 'cancelado'],
  'parcial': ['pago', 'cancelado'],
  'pago': [],        // Terminal
  'cancelado': []    // Terminal
};

function podeTransitar(statusAtual: StatusTitulo, statusNovo: StatusTitulo): boolean {
  return transicoesValidas[statusAtual].includes(statusNovo);
}

// Atualização automática de status
async function atualizarStatusTitulo(tituloId: string) {
  const titulo = await kv.get(`financeiro_titulo:${tituloId}`);
  
  if (!titulo) return;
  
  // Se já está pago ou cancelado, não muda
  if (titulo.status === 'pago' || titulo.status === 'cancelado') {
    return;
  }
  
  const hoje = new Date();
  const vencimento = new Date(titulo.vencimento);
  
  // Se venceu e ainda está aberto, marcar como vencido
  if (hoje > vencimento && titulo.status === 'aberto') {
    titulo.status = 'vencido';
    titulo.diasVencimento = Math.floor(
      (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    await kv.set(`financeiro_titulo:${tituloId}`, titulo);
    console.log(`✅ Título ${tituloId} marcado como vencido`);
  }
}
```

---

#### **2.3 Quitação de Títulos**

```typescript
async function quitarTitulo(
  tituloId: string,
  dataPagamento: string,
  valorPago: number,
  formaPagamento: string,
  contaBancariaId: string,
  desconto = 0,
  observacoes = '',
  criarLancamento = true
) {
  const titulo = await kv.get(`financeiro_titulo:${tituloId}`);
  
  if (!titulo) {
    throw new Error('Título não encontrado');
  }
  
  // Validar status
  if (!['aberto', 'vencido', 'parcial'].includes(titulo.status)) {
    throw new Error(`Título com status "${titulo.status}" não pode ser quitado`);
  }
  
  // Validar valor pago
  if (valorPago <= 0 || valorPago > titulo.saldo) {
    throw new Error('Valor pago inválido');
  }
  
  // Calcular juros e multa
  const calculos = calcularJurosMulta(titulo, dataPagamento, desconto);
  
  // Atualizar título
  titulo.valorPago = (titulo.valorPago || 0) + valorPago;
  titulo.saldo = titulo.valor - titulo.valorPago;
  titulo.dataPagamento = dataPagamento;
  titulo.formaPagamento = formaPagamento;
  titulo.desconto = desconto;
  titulo.juros = calculos.juros;
  titulo.multa = calculos.multa;
  
  // Determinar novo status
  if (titulo.saldo <= 0.01) {  // Tolerância de R$ 0,01
    titulo.status = 'pago';
    titulo.saldo = 0;
  } else {
    titulo.status = 'parcial';
  }
  
  titulo.updatedAt = new Date().toISOString();
  
  // Salvar título
  await kv.set(`financeiro_titulo:${tituloId}`, titulo);
  
  // Criar lançamento automático
  let lancamento = null;
  if (criarLancamento) {
    lancamento = {
      id: `lancamento_auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId: titulo.organizationId,
      tipo: titulo.tipo === 'receber' ? 'entrada' : 'saida',
      data: dataPagamento,
      competencia: titulo.competencia || titulo.vencimento,
      descricao: `Quitação ${titulo.tipo === 'receber' ? 'Recebimento' : 'Pagamento'} - ${titulo.descricao}`,
      valor: valorPago,
      moeda: titulo.moeda,
      categoriaId: titulo.categoriaId,
      contaId: contaBancariaId,
      centroCustoId: titulo.centroCustoId,
      documento: titulo.numeroDocumento,
      observacoes: `Quitação de título #${tituloId}. ${observacoes}`,
      conciliado: false,
      hasSplit: false,
      tituloId: tituloId,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`financeiro_lancamento:${lancamento.id}`, lancamento);
    
    // Atualizar saldo da conta
    await atualizarSaldoConta(contaBancariaId, lancamento.tipo, valorPago);
  }
  
  return {
    titulo,
    lancamento,
    calculos
  };
}
```

---

#### **2.4 Recorrência de Títulos**

```typescript
async function criarTituloRecorrente(
  dadosBase: Partial<Titulo>,
  frequencia: 'mensal' | 'trimestral' | 'semestral' | 'anual',
  totalParcelas: number
) {
  const titulos: Titulo[] = [];
  
  const intervaloMeses: Record<string, number> = {
    'mensal': 1,
    'trimestral': 3,
    'semestral': 6,
    'anual': 12
  };
  
  const meses = intervaloMeses[frequencia];
  
  for (let i = 0; i < totalParcelas; i++) {
    const vencimento = new Date(dadosBase.vencimento!);
    vencimento.setMonth(vencimento.getMonth() + (i * meses));
    
    const titulo: Titulo = {
      id: `titulo_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId: dadosBase.organizationId!,
      tipo: dadosBase.tipo!,
      emissao: dadosBase.emissao!,
      vencimento: vencimento.toISOString().split('T')[0],
      competencia: vencimento.toISOString().split('T')[0],
      pessoa: dadosBase.pessoa!,
      pessoaId: dadosBase.pessoaId,
      descricao: `${dadosBase.descricao} - Parcela ${i + 1}/${totalParcelas}`,
      moeda: dadosBase.moeda!,
      valorOriginal: dadosBase.valor!,
      valor: dadosBase.valor!,
      saldo: dadosBase.valor!,
      valorPago: 0,
      status: 'aberto',
      recorrente: true,
      recorrenciaId: `recorrencia_${Date.now()}`,
      parcela: i + 1,
      totalParcelas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Salvar título
    await kv.set(`financeiro_titulo:${titulo.id}`, titulo);
    titulos.push(titulo);
  }
  
  return titulos;
}

// Exemplo de uso:
const titulos = await criarTituloRecorrente({
  organizationId: 'org_rppt_001',
  tipo: 'receber',
  emissao: '2025-11-03',
  vencimento: '2025-12-03',
  pessoa: 'João Silva',
  pessoaId: 'cliente_001',
  descricao: 'Aluguel Mensal - Apt 501',
  moeda: 'BRL',
  valor: 3500.00
}, 'mensal', 12);

// Retorna 12 títulos com vencimentos mensais
```

---

### **3. Conciliação Bancária**

#### **3.1 Score de Confiança**

```typescript
interface SugestaoConciliacao {
  id: string;
  linhaExtratoId: string;
  lancamentoId: string;
  confianca: number;  // 0-100
  motivo: string;
  detalhes: {
    matchValor: boolean;
    matchData: boolean;
    matchDescricao: boolean;
    pontuacao: {
      valor: number;
      data: number;
      descricao: number;
    };
  };
}

function calcularConfianca(
  linhaExtrato: LinhaExtrato,
  lancamento: Lancamento
): number {
  let score = 0;
  const detalhes = {
    matchValor: false,
    matchData: false,
    matchDescricao: false,
    pontuacao: {
      valor: 0,
      data: 0,
      descricao: 0
    }
  };
  
  // 1. VALOR (50 pontos)
  const valorExtrato = Math.abs(linhaExtrato.valor);
  const valorLancamento = Math.abs(lancamento.valor);
  
  // Valor exato (+50 pontos)
  if (Math.abs(valorExtrato - valorLancamento) < 0.01) {
    score += 50;
    detalhes.pontuacao.valor = 50;
    detalhes.matchValor = true;
  }
  // Valor próximo ±5% (+30 pontos)
  else if (Math.abs(valorExtrato - valorLancamento) / valorLancamento <= 0.05) {
    score += 30;
    detalhes.pontuacao.valor = 30;
  }
  // Valor próximo ±10% (+15 pontos)
  else if (Math.abs(valorExtrato - valorLancamento) / valorLancamento <= 0.10) {
    score += 15;
    detalhes.pontuacao.valor = 15;
  }
  
  // 2. DATA (30 pontos)
  const dataExtrato = new Date(linhaExtrato.data);
  const dataLancamento = new Date(lancamento.data);
  const diasDiferenca = Math.abs(
    Math.floor((dataExtrato.getTime() - dataLancamento.getTime()) / (1000 * 60 * 60 * 24))
  );
  
  // Mesma data (+30 pontos)
  if (diasDiferenca === 0) {
    score += 30;
    detalhes.pontuacao.data = 30;
    detalhes.matchData = true;
  }
  // Diferença de 1-3 dias (+20 pontos)
  else if (diasDiferenca <= 3) {
    score += 20;
    detalhes.pontuacao.data = 20;
  }
  // Diferença de 4-7 dias (+10 pontos)
  else if (diasDiferenca <= 7) {
    score += 10;
    detalhes.pontuacao.data = 10;
  }
  
  // 3. DESCRIÇÃO (20 pontos)
  const descExtrato = (linhaExtrato.descricao || '').toLowerCase();
  const descLancamento = (lancamento.descricao || '').toLowerCase();
  
  // Calcular similaridade (Levenshtein simplificado)
  const similaridade = calcularSimilaridadeTexto(descExtrato, descLancamento);
  
  // Muito similar (>80%) (+20 pontos)
  if (similaridade > 0.8) {
    score += 20;
    detalhes.pontuacao.descricao = 20;
    detalhes.matchDescricao = true;
  }
  // Similar (60-80%) (+15 pontos)
  else if (similaridade > 0.6) {
    score += 15;
    detalhes.pontuacao.descricao = 15;
  }
  // Pouco similar (40-60%) (+10 pontos)
  else if (similaridade > 0.4) {
    score += 10;
    detalhes.pontuacao.descricao = 10;
  }
  // Contém palavras-chave (+5 pontos)
  else if (descExtrato.includes('aluguel') && descLancamento.includes('aluguel')) {
    score += 5;
    detalhes.pontuacao.descricao = 5;
  }
  
  return Math.min(score, 100);  // Max 100%
}

// Helper: Similaridade de Levenshtein simplificada
function calcularSimilaridadeTexto(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
```

---

#### **3.2 Regras de Conciliação Automática**

```typescript
interface RegraConciliacao {
  id: string;
  organizationId: string;
  nome: string;
  ativo: boolean;
  prioridade: number;  // 0-100, maior = mais importante
  
  // Condições
  padrao: {
    operador: 'contains' | 'equals' | 'regex';
    termo: string;
  };
  valor?: {
    operador: 'eq' | 'gte' | 'lte' | 'between';
    a?: number;
    b?: number;
  };
  tipo?: 'entrada' | 'saida';
  
  // Ações
  categoriaId?: string;
  centroCustoId?: string;
  acao: 'sugerir' | 'auto_conciliar' | 'auto_criar';
}

async function aplicarRegrasConciliacao(linhaExtrato: LinhaExtrato) {
  // Buscar regras da organização
  const regras = await kv.getByPrefix(`financeiro_regra_conciliacao:`);
  const regrasOrg = regras.filter(r => 
    r.organizationId === linhaExtrato.organizationId &&
    r.ativo
  );
  
  // Ordenar por prioridade (decrescente)
  regrasOrg.sort((a, b) => b.prioridade - a.prioridade);
  
  // Aplicar regras
  for (const regra of regrasOrg) {
    const match = avaliarRegra(regra, linhaExtrato);
    
    if (match) {
      console.log(`✅ Regra aplicada: ${regra.nome}`);
      
      // Executar ação
      if (regra.acao === 'auto_criar') {
        await criarLancamentoAutomatico(linhaExtrato, regra);
      } else if (regra.acao === 'auto_conciliar') {
        await conciliarAutomatico(linhaExtrato, regra);
      } else if (regra.acao === 'sugerir') {
        await criarSugestao(linhaExtrato, regra);
      }
      
      // Atualizar contador
      regra.aplicacoes = (regra.aplicacoes || 0) + 1;
      regra.ultimaAplicacao = new Date().toISOString();
      await kv.set(`financeiro_regra_conciliacao:${regra.id}`, regra);
      
      // Primeira regra que der match vence
      break;
    }
  }
}

function avaliarRegra(regra: RegraConciliacao, linhaExtrato: LinhaExtrato): boolean {
  // Verificar padrão de texto
  const descricao = (linhaExtrato.descricao || '').toLowerCase();
  const termo = regra.padrao.termo.toLowerCase();
  
  let matchPadrao = false;
  if (regra.padrao.operador === 'contains') {
    matchPadrao = descricao.includes(termo);
  } else if (regra.padrao.operador === 'equals') {
    matchPadrao = descricao === termo;
  } else if (regra.padrao.operador === 'regex') {
    matchPadrao = new RegExp(termo, 'i').test(descricao);
  }
  
  if (!matchPadrao) return false;
  
  // Verificar valor (se especificado)
  if (regra.valor) {
    const valor = Math.abs(linhaExtrato.valor);
    
    if (regra.valor.operador === 'eq') {
      if (Math.abs(valor - (regra.valor.a || 0)) > 0.01) return false;
    } else if (regra.valor.operador === 'gte') {
      if (valor < (regra.valor.a || 0)) return false;
    } else if (regra.valor.operador === 'lte') {
      if (valor > (regra.valor.a || 0)) return false;
    } else if (regra.valor.operador === 'between') {
      if (valor < (regra.valor.a || 0) || valor > (regra.valor.b || 0)) return false;
    }
  }
  
  // Verificar tipo (se especificado)
  if (regra.tipo) {
    const tipoExtrato = linhaExtrato.tipo === 'credito' ? 'entrada' : 'saida';
    if (tipoExtrato !== regra.tipo) return false;
  }
  
  return true;
}
```

---

### **4. Relatórios**

#### **4.1 Cálculo de DRE**

```typescript
async function calcularDRE(
  organizationId: string,
  dataInicio: string,
  dataFim: string
) {
  // Buscar lançamentos do período (por competência)
  const allLancamentos = await kv.getByPrefix('financeiro_lancamento:');
  const lancamentos = allLancamentos.filter(l =>
    l.organizationId === organizationId &&
    l.competencia >= dataInicio &&
    l.competencia <= dataFim
  );
  
  // Agrupar por categoria
  const porCategoria: Record<string, { receitas: number; despesas: number }> = {};
  
  for (const lancamento of lancamentos) {
    const categoriaId = lancamento.categoriaId || 'sem_categoria';
    
    if (!porCategoria[categoriaId]) {
      porCategoria[categoriaId] = { receitas: 0, despesas: 0 };
    }
    
    if (lancamento.tipo === 'entrada') {
      porCategoria[categoriaId].receitas += lancamento.valor;
    } else if (lancamento.tipo === 'saida') {
      porCategoria[categoriaId].despesas += lancamento.valor;
    }
  }
  
  // Buscar categorias
  const categorias = await kv.getByPrefix('financeiro_categoria:');
  const categoriasOrg = categorias.filter(c => c.organizationId === organizationId);
  
  // Construir estrutura hierárquica
  const estrutura = construirEstruturaHierarquica(categoriasOrg, porCategoria);
  
  // Calcular totalizadores
  const receitas = Object.values(porCategoria).reduce((sum, c) => sum + c.receitas, 0);
  const despesas = Object.values(porCategoria).reduce((sum, c) => sum + c.despesas, 0);
  const lucroLiquido = receitas - despesas;
  const margemLiquida = receitas > 0 ? (lucroLiquido / receitas) * 100 : 0;
  
  return {
    periodo: { inicio: dataInicio, fim: dataFim },
    estrutura,
    indicadores: {
      receitaBruta: receitas,
      receitaLiquida: receitas,
      lucroBruto: receitas - despesas,
      margemBruta: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0,
      lucroLiquido,
      margemLiquida
    }
  };
}
```

---

## 🔗 INTEGRAÇÕES EXTERNAS

### **1. Open Finance (Banco Central)**

**Status:** 🟡 Planejado  
**Prioridade:** Baixa (Sprint 6)

**Fluxo de autenticação:**
1. Usuário seleciona banco na interface
2. Redirect para autenticação do banco
3. Banco retorna `authorization_code`
4. Trocar por `access_token` + `refresh_token`
5. Salvar tokens no KV Store
6. Usar token para consultar extratos

**Endpoints necessários:**
```
GET /accounts/{accountId}/transactions
GET /accounts/{accountId}/balance
```

**Renovação de consentimento:**
- Consentimento válido por 12 meses
- Avisar usuário 30 dias antes de expirar
- Re-autenticar se expirado

---

### **2. NF-e / NFS-e (SEFAZ)**

**Status:** 🟡 Planejado  
**Prioridade:** Baixa (Sprint 6)

**Requisitos:**
- Certificado digital A1 ou A3
- Ambiente homologação + produção
- Integração com API SEFAZ

**Funcionalidades:**
- Emitir NF-e/NFS-e a partir de título
- Receber XML de fornecedores
- Criar título a pagar automaticamente
- Validar chave de acesso

---

### **3. Integração com Módulo de Reservas**

**Status:** ✅ Planejado (Sprint 2)  
**Prioridade:** Alta

**Fluxo:**
```
Reserva Criada → Criar Título a Receber
Reserva Confirmada → Criar Lançamento de Receita (se pago)
Reserva Cancelada → Cancelar Título
```

**Endpoint interno:**
```http
POST /financeiro/integracoes/reserva
```

**Payload:**
```json
{
  "acao": "criar_titulo",
  "reservaId": "reserva_001",
  "valor": 3500.00,
  "vencimento": "2025-12-03",
  "hospedeNome": "João Silva",
  "hospedeId": "cliente_001"
}
```

---

## ⚙️ REQUISITOS NÃO FUNCIONAIS

### **1. Performance**

- **Latência:** APIs devem responder em < 300ms (p95)
- **Throughput:** Suportar 100 req/s
- **Paginação:** Máximo 100 itens por página
- **Caching:** Categorias e configurações em memória

---

### **2. Segurança**

#### **Autenticação:**
```typescript
// Middleware de autenticação
app.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return c.json({ success: false, error: 'Token não fornecido' }, 401);
  }
  
  // Buscar sessão
  const session = await kv.get(`session:${token}`);
  
  if (!session || !session.imobiliariaId) {
    return c.json({ success: false, error: 'Sessão inválida' }, 401);
  }
  
  // Injetar no contexto
  c.set('session', session);
  c.set('userId', session.userId);
  c.set('organizationId', session.imobiliariaId);
  
  await next();
});
```

#### **Isolamento Multi-Tenant:**
```typescript
// SEMPRE filtrar por organizationId
const lancamentos = await kv.getByPrefix('financeiro_lancamento:');
const filtered = lancamentos.filter(l => 
  l.organizationId === session.imobiliariaId
);
```

#### **Auditoria:**
```typescript
async function criarAuditoria(acao, recurso, detalhes, userId, organizationId) {
  const auditoria = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    acao,
    recurso,
    detalhes,
    userId,
    organizationId,
    timestamp: new Date().toISOString(),
    ip: c.req.header('x-forwarded-for') || 'unknown'
  };
  
  await kv.set(`financeiro_auditoria:${auditoria.id}`, auditoria);
}
```

---

### **3. Disponibilidade**

- **SLA:** 99.5% uptime
- **Backup:** Automático (Supabase)
- **Recovery:** RPO < 1h, RTO < 4h

---

### **4. Compliance**

- **LGPD:** Dados sensíveis criptografados
- **Retenção:** Dados financeiros por 5 anos
- **Auditoria:** Todas ações críticas logadas

---

## 📸 EVIDÊNCIAS VISUAIS

### **1. Dashboard Financeiro**

**Arquivo:** `/components/financeiro/FinanceiroDashboard.tsx`

**KPIs exibidos:**
- Receita Total (verde)
- Despesas (vermelho)
- Lucro Líquido (azul)
- Inadimplência (laranja)

**Ações necessárias:**
- 8 contas a pagar vencendo hoje
- 12 títulos em atraso

**Gráficos (placeholder):**
- Receitas vs Despesas (12 meses)
- Despesas por Categoria

---

### **2. Página de Lançamentos**

**Arquivo:** `/components/financeiro/pages/LancamentosPage.tsx`

**Campos do formulário:**
- Tipo (entrada/saída/transferência)
- Data
- Valor
- Descrição
- Categoria (select)
- Conta Bancária (select)
- Centro de Custo (select)
- Split (checkbox + editor)

**Tabela:**
- Data, Tipo, Descrição, Categoria, Valor, Status

**Filtros:**
- Período (PeriodPicker)
- Tipo
- Categoria
- Status conciliação

---

### **3. Página de Contas a Receber**

**Arquivo:** `/components/financeiro/pages/ContasReceberPage.tsx`

**KPIs:**
- Total a Receber
- Recebidos
- Vencidos
- Prazo Médio (AR Days)

**Tabela:**
- Emissão, Vencimento, Cliente, Descrição, Valor, Saldo, Status

**Ações por título:**
- Receber (ícone check)
- Enviar cobrança (ícone mail)
- Detalhes (ícone file)

---

## 🧪 CENÁRIOS DE TESTE

### **Cenário 1: Criar Lançamento Simples**

```bash
POST /financeiro/lancamentos
{
  "tipo": "entrada",
  "data": "2025-11-03",
  "descricao": "Aluguel Apt 501",
  "valor": 3500.00,
  "moeda": "BRL",
  "categoriaId": "cat_receita_alugueis",
  "contaId": "conta_itau_cc"
}

Expected:
- Status 201
- Lançamento criado com ID
- Saldo da conta atualizado (+3500)
```

---

### **Cenário 2: Listar Lançamentos com Filtros**

```bash
GET /financeiro/lancamentos?dataInicio=2025-11-01&dataFim=2025-11-30&tipo=entrada

Expected:
- Status 200
- Array de lançamentos filtrados
- Pagination metadata
- Summary (totalEntradas, totalSaidas, saldo)
```

---

### **Cenário 3: Criar Título com Recorrência**

```bash
POST /financeiro/titulos
{
  "tipo": "receber",
  "emissao": "2025-11-03",
  "vencimento": "2025-12-03",
  "pessoa": "João Silva",
  "descricao": "Aluguel Mensal",
  "valor": 3500.00,
  "moeda": "BRL",
  "recorrente": true,
  "recorrenciaFrequencia": "mensal",
  "recorrenciaTotal": 12
}

Expected:
- Status 201
- Título principal criado
- 11 títulos adicionais (parcelas 2-12)
- Vencimentos mensais
```

---

### **Cenário 4: Quitar Título com Juros**

```bash
POST /financeiro/titulos/titulo_001/quitar
{
  "dataPagamento": "2025-12-18",
  "valorPago": 3525.00,
  "formaPagamento": "PIX",
  "contaBancariaId": "conta_itau_cc",
  "criarLancamento": true
}

Expected:
- Status 200
- Título com status "pago"
- Cálculo de juros/multa
- Lançamento automático criado
- Saldo da conta atualizado
```

---

### **Cenário 5: Conciliar Linha de Extrato**

```bash
POST /financeiro/conciliacao/match
{
  "linhaExtratoId": "extrato_001",
  "lancamentoId": "lancamento_123"
}

Expected:
- Status 200
- Linha de extrato marcada como conciliada
- Lançamento marcado como conciliado
- Link bidirecional criado
```

---

### **Cenário 6: Gerar DRE**

```bash
GET /financeiro/relatorios/dre?dataInicio=2025-11-01&dataFim=2025-11-30

Expected:
- Status 200
- Estrutura hierárquica de receitas/despesas
- Indicadores calculados (receita, lucro, margens)
- Análise vertical (percentuais)
```

---

## 📅 PLANO DE IMPLEMENTAÇÃO

### **SPRINT 1 (2 semanas) - BACKEND BÁSICO** ⬅️ **COMEÇAR AQUI**

**Objetivos:**
- ✅ Backend funcional de lançamentos
- ✅ CRUD completo
- ✅ Multi-tenant funcionando
- ✅ Integração frontend → backend

**Tasks:**
1. [ ] Criar arquivo `/supabase/functions/server/routes-financeiro.ts`
2. [ ] Implementar middleware de autenticação
3. [ ] Implementar rotas de lançamentos:
   - [ ] POST /lancamentos (criar)
   - [ ] GET /lancamentos (listar com filtros e paginação)
   - [ ] GET /lancamentos/:id (obter)
   - [ ] PUT /lancamentos/:id (atualizar)
   - [ ] DELETE /lancamentos/:id (excluir)
4. [ ] Implementar atualização de saldo de conta
5. [ ] Implementar validações
6. [ ] Registrar rotas no `index.tsx`
7. [ ] Testar com Postman/cURL
8. [ ] Integrar frontend (remover mock, conectar API real)
9. [ ] Testes end-to-end

**Critérios de aceite:**
- CRUD de lançamentos funcional
- Dados salvos no Supabase
- Multi-tenant isolado
- Frontend conectado ao backend

---

### **SPRINT 2 (2 semanas) - TÍTULOS E CATEGORIAS**

**Tasks:**
1. [ ] Implementar rotas de categorias (CRUD)
2. [ ] Criar categorias padrão (seed)
3. [ ] Implementar rotas de títulos (CRUD)
4. [ ] Implementar quitação de títulos
5. [ ] Implementar cálculo de juros/multa
6. [ ] Implementar recorrência de títulos
7. [ ] Integração com módulo Reservas
8. [ ] Frontend: páginas de Contas a Receber/Pagar

---

### **SPRINT 3 (2 semanas) - CONTAS BANCÁRIAS E EXTRATOS**

**Tasks:**
1. [ ] Implementar rotas de contas bancárias
2. [ ] Implementar upload de OFX/CSV
3. [ ] Parser de extratos
4. [ ] Deduplicação de transações
5. [ ] Frontend: gestão de contas

---

### **SPRINT 4 (3 semanas) - CONCILIAÇÃO BANCÁRIA**

**Tasks:**
1. [ ] Implementar regras de conciliação
2. [ ] Implementar score de confiança
3. [ ] Implementar sugestões automáticas
4. [ ] Frontend: tela de conciliação
5. [ ] Machine Learning básico

---

### **SPRINT 5 (2 semanas) - RELATÓRIOS**

**Tasks:**
1. [ ] Implementar DRE backend
2. [ ] Implementar Fluxo de Caixa
3. [ ] Implementar Balancete
4. [ ] Implementar Aging
5. [ ] Frontend: visualizações e gráficos
6. [ ] Exportação em Excel/PDF

---

### **SPRINT 6 (3 semanas) - INTEGRAÇÕES**

**Tasks:**
1. [ ] Open Finance (autenticação)
2. [ ] NF-e/NFS-e (emissão básica)
3. [ ] Webhooks
4. [ ] Machine Learning avançado

---

## 📞 CONTATO E PRÓXIMOS PASSOS

**Documentação completa disponível em:**
- `/docs/MODULO_FINANCEIRO_COMPLETO_v1.0.103.260.md`
- `/docs/HANDOFF_BACKEND_FINANCEIRO_CODEX.md` (este arquivo)
- `/types/financeiro.ts`

**Arquivos frontend:**
- `/components/financeiro/` (módulo completo)

**Próximo passo:**
1. **Revisar este handoff**
2. **Esclarecer dúvidas**
3. **COMEÇAR SPRINT 1:** Criar arquivo `routes-financeiro.ts`

---

**Última atualização:** 03 NOV 2025  
**Versão:** v1.0.103.260-MULTI-TENANT-AUTH  
**Preparado para:** Codex AI / Equipe de Desenvolvimento  
**Status:** ✅ HANDOFF COMPLETO E PRONTO PARA DESENVOLVIMENTO  

---

**FIM DO DOCUMENTO** 🚀
