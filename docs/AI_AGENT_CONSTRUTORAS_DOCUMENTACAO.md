# 🤖 AI Agent - Coletor de Construtoras
## Documentação Técnica e Desafios Mapeados

**Data:** 03/02/2026 (atualizado 05/02/2026 00:30)  
**Versão:** 2.2  
**Status:** ✅ Fase 2 Concluída + Parser Local Funcional

---

## 📋 Resumo Executivo

O agente de IA para coleta de dados de construtoras está **funcional e operacional**. Ele é capaz de:

1. Acessar Linktrees de construtoras (páginas renderizadas via JavaScript)
2. Extrair links categorizados (disponibilidade, tabelas, materiais, decorados virtuais)
3. Usar IA (Groq/Llama 3.3) para identificar e estruturar empreendimentos
4. **Extrair unidades individuais** de painéis de disponibilidade (código, tipologia, status, imobiliária)
5. **Enriquecer unidades** com andar inferido e área por tipologia
6. Salvar dados no banco PostgreSQL (Supabase) em tabelas `re_*`

---

## 📊 Dados Atuais no Banco (05/02/2026 01:00)

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `re_companies` | 7 | Calper + 6 exemplos |
| `re_developments` | 9 | Empreendimentos Calper |
| `re_units` | **1633** | Unidades (3 empreendimentos com dados) |

### Estado por Empreendimento:

| Empreendimento | Total | Disponíveis | Status |
|----------------|-------|-------------|--------|
| Arte Design | 1552 | 12 | 🔴 99% vendido |
| Arte Botânica | 38 | 0 | 🔴 100% vendido |
| Arte Jardim | 43 | 43 | 🟢 Lançamento! |
| Arte Wave | 0 | - | ⚠️ Painel não configurado |
| Arte Wood | 0 | - | ⚠️ Painel não configurado |
| Duo/Etehe/Murano | 0 | - | ⚠️ Formato diferente |
| **TOTAL** | **1633** | **55** | |

### Unidades Disponíveis:
```
Arte Design: 12 unidades (TH, GD no térreo/2º andar)
Arte Jardim: 43 unidades (TH e GD - lançamento recente)
```

---

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Edge Function  │────▶│   VPS Scraper   │
│   (Rendizy)     │     │   (Supabase)    │     │   (Puppeteer)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  Groq    │ │ Supabase │ │  Google  │
              │  (LLM)   │ │   (DB)   │ │  Drive   │
              └──────────┘ └──────────┘ └──────────┘
```

### Componentes:

| Componente | Tecnologia | Função |
|------------|------------|--------|
| **VPS Scraper** | Node.js + Puppeteer | Renderiza páginas JavaScript (Linktree) |
| **Edge Function** | Deno + Hono | Orquestra o fluxo, chama IA, salva dados |
| **LLM** | Groq (Llama 3.3 70B) | Analisa conteúdo e estrutura empreendimentos |
| **Banco** | PostgreSQL (Supabase) | Armazena construtoras e empreendimentos |

---

## 🔧 Endpoints da API

### Desenvolvimento (sem autenticação de usuário)

```bash
POST /ai-agents/dev/scrape-and-save
Headers:
  x-organization-id: UUID da organização
Body:
  {
    "construtora_id": "uuid",
    "api_key": "gsk_xxx" (opcional - busca do banco)
  }
```

### Produção (requer autenticação)

```bash
POST /ai-agents/construtoras/:id/scrape-and-save
GET /ai-agents/empreendimentos
GET /ai-agents/empreendimentos/:id
```

---

## 📊 Tabelas do Banco

### ai_agent_construtoras
```sql
- id: UUID
- organization_id: UUID
- name: VARCHAR(255)
- linktree_url: TEXT
- website_url: TEXT
- notes: TEXT
- is_active: BOOLEAN
- last_scraped_at: TIMESTAMPTZ
- empreendimentos_count: INTEGER
```

### ai_agent_empreendimentos
```sql
- id: UUID
- organization_id: UUID
- construtora_id: UUID (FK)
- nome: VARCHAR(255)
- slug: VARCHAR(255)
- bairro, cidade, estado, endereco
- tipologias: JSONB
- preco_min, preco_max: DECIMAL
- status: VARCHAR(50)
- links: JSONB
- dados_raw: JSONB
- last_scraped_at: TIMESTAMPTZ
```

---

## 🎯 Desafios Encontrados e Soluções

### 1. Linktree usa JavaScript Rendering

**Problema:** Linktree é uma SPA (Single Page Application) que renderiza todo o conteúdo via JavaScript. Um simples `fetch()` retorna apenas o HTML skeleton sem os links.

**Solução:** Implementamos um serviço separado com **Puppeteer** (headless Chrome) no VPS que:
- Navega para a URL
- Aguarda o JavaScript renderizar
- Extrai links e texto
- Retorna dados estruturados via API

**Código:** `vps-scraper/` rodando em `http://76.13.82.60:3100`

---

### 2. Categorização de Links

**Problema:** Construtoras organizam links de formas diferentes. Alguns têm "Disponibilidade Arte Wood", outros têm "Mapa Online".

**Solução:** Implementamos categorização por padrões:
```javascript
function categorizeLink(text, url) {
  if (text.includes('disponibilidade') || url.includes('painel')) return 'disponibilidade';
  if (text.includes('tabela') || text.includes('preço')) return 'tabela_precos';
  if (text.includes('material') || text.includes('book')) return 'material_vendas';
  if (text.includes('decorado') || url.includes('matterport')) return 'decorado_virtual';
  if (text.includes('andamento') || text.includes('obra')) return 'andamento_obra';
  // ...
}
```

---

### 3. Identificação de Empreendimentos

**Problema:** O Linktree não tem estrutura clara de "empreendimentos". Os links são sequenciais.

**Solução:** Usamos LLM (Groq/Llama 3.3) para:
1. Analisar o bodyText da página
2. Identificar padrões de nomes de empreendimentos
3. Agrupar links por empreendimento
4. Retornar JSON estruturado

**Prompt otimizado:** ~5.000 tokens por execução

---

### 4. Autenticação e Multi-tenancy

**Problema:** O sistema Rendizy é multi-tenant. Cada organização tem seus próprios dados.

**Solução:** 
- Endpoint de desenvolvimento aceita `x-organization-id` header
- Endpoint de produção usa `getOrganizationId()` via JWT
- Todas as queries filtram por `organization_id`

---

### 5. Links dentro de Google Drive

**Problema:** Tabelas de preços e materiais estão em pastas do Google Drive que requerem autenticação.

**Status:** ⚠️ **PENDENTE - Fase 2**

**Solução planejada:**
1. Usar Google Drive API com Service Account
2. Ou: Scraper com cookies de sessão autenticada
3. Ou: Solicitar permissão pública nas pastas

---

### 6. Extração de Dados de Disponibilidade

**Problema:** Painéis de disponibilidade (ex: `calper.tec.br/painel/artedesign/`) têm dados de unidades, preços, status.

**Status:** ⚠️ **PENDENTE - Fase 2**

**Solução planejada:**
1. Criar scraper específico para cada tipo de painel
2. Ou: Usar IA para analisar tabelas HTML
3. Popular tabela `ai_agent_unidades`

---

## 📊 FLUXO COMPLETO DE DADOS (Atualizado 04/02/2026)

### 🔄 Pipeline de Dados

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PIPELINE DE DADOS AI AGENT                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ENTRADA: Linktree da Construtora                                     │
│     URL: https://linktr.ee/calperconstrutora                             │
│                                                                          │
│  2. VPS SCRAPER (http://76.13.82.60:3100)                                │
│     ├── POST /scrape/linktree    → Extrai links do Linktree              │
│     ├── POST /scrape/calper      → Scrape painel de disponibilidade      │
│     ├── POST /scrape/availability → Status por unidade                   │
│     └── POST /scrape/prices      → Tabela de preços (PDFs)               │
│                                                                          │
│  3. EDGE FUNCTION (routes-ai-agents.ts)                                  │
│     ├── /ai-agents/dev/scrape-and-save   → Salva empreendimentos         │
│     ├── /ai-agents/dev/scrape-unidades   → Salva unidades                │
│     └── /ai-agents/empreendimentos       → Lista empreendimentos         │
│                                                                          │
│  4. GROQ LLM (Llama 3.3 70B)                                             │
│     └── Parseia texto bruto → JSON estruturado                           │
│                                                                          │
│  5. TABELAS STAGING (ai_agent_*)                                         │
│     ├── ai_agent_construtoras     → Dados da construtora                 │
│     ├── ai_agent_empreendimentos  → Empreendimentos + links              │
│     └── ai_agent_unidades         → Unidades individuais                 │
│                                                                          │
│  6. MIGRAÇÃO (20260204_migrate_ai_agent_to_re.sql)                       │
│     ├── ai_agent_empreendimentos → re_developments                       │
│     └── ai_agent_unidades        → re_units                              │
│                                                                          │
│  7. TABELAS PRODUÇÃO (re_*)                                              │
│     ├── re_companies      → Construtoras/Imobiliárias                    │
│     ├── re_developments   → Empreendimentos                              │
│     └── re_units          → Unidades                                     │
│                                                                          │
│  8. FRONTEND (React + Vite)                                              │
│     ├── useEmpreendimentos()  → Hook busca re_developments               │
│     ├── useUnidades()         → Hook busca re_units                      │
│     ├── EmpreendimentoCard    → Exibe cards com imagem/dados             │
│     └── ConstrutoraPerfilView → Tela de estoque da construtora           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 📋 Mapeamento de Campos: ai_agent_* → re_* → UI

#### Empreendimentos

| ai_agent_empreendimentos | re_developments | UI (Empreendimento) | Fonte |
|--------------------------|-----------------|---------------------|-------|
| `nome` | `name` | `name` | Linktree |
| `cidade` | `location.city` | `city` | LLM parsing |
| `estado` | `location.state` | `state` | LLM parsing |
| `bairro` | `location.address` | `neighborhood` | LLM parsing |
| `status` | `phase` | `status` | launch/construction/ready |
| `links.decorado_virtual` | `virtual_tour_url` | Tour Matterport | Linktree |
| `links.material_vendas` | `marketing_materials` | PDFs/Imagens | Google Drive |
| `links.tabela_precos` | `price_range` | `priceMin/priceMax` | ⚠️ PENDENTE |
| `tipologias` | `typologies` | Lista quartos | Panel scrape |
| `resumo_vendas.total` | `total_units` | `totalUnits` | Panel scrape |
| `resumo_vendas.disponiveis` | `available_units` | `availableUnits` | Panel scrape |
| - | `images` | `mainImage/images` | ⚠️ Google Drive |

#### Unidades

| ai_agent_unidades | re_units | UI (Unidade) | Fonte |
|-------------------|----------|--------------|-------|
| `codigo` | `unit_number` | `unitNumber` | Panel scrape |
| `tipologia` | `typology` | `typology` (1Q, 2Q, DS) | Panel scrape |
| `status` | `status` | available/reserved/sold | Panel scrape |
| `bloco` | `block` | `block` | Panel scrape |
| `imobiliaria` | - | Corretor responsável | Panel scrape |
| `data_venda` | `sold_date` | Data da venda | Panel scrape |
| - | `floor` | Andar (inferido do código) | ⚠️ PENDENTE |
| - | `price` | Preço unidade | ⚠️ Tabela preços |
| - | `private_area` | Área m² | ⚠️ Tabela preços |

### 🚨 Lacunas Críticas a Resolver

| Campo | Status | Solução |
|-------|--------|---------|
| `images` | ❌ Faltando | Extrair do Google Drive via API |
| `price_range` | ❌ Faltando | Scrape tabela de preços (PDF/HTML) |
| `floor` | ❌ Faltando | Inferir: código 1301 → andar 13 |
| `private_area` | ❌ Faltando | Mapear tipologia → área padrão |
| `bedrooms` | ❌ Faltando | Mapear: 1Q=1, 2Q=2, 3Q=3, DS=2 |

---

## 📈 Métricas do Primeiro Teste Real

| Métrica | Valor |
|---------|-------|
| **Construtora** | Calper |
| **Linktree URL** | linktr.ee/comercialcalper |
| **Links extraídos** | 41 |
| **Empreendimentos identificados** | 9 |
| **Tokens LLM usados** | 5.308 |
| **Tempo total** | ~10 segundos |
| **Custo estimado** | $0.00 (free tier Groq) |

### Dados Atuais (04/02/2026)

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `ai_agent_construtoras` | 2 | Calper + MedHome |
| `ai_agent_empreendimentos` | 9 | Empreendimentos Calper |
| `ai_agent_unidades` | 358 | Unidades (Arte Design) |
| `re_developments` | 9 | Migrados para produção |
| `re_units` | 358 | Migrados para produção |

### Empreendimentos Coletados (Calper)

| Empreendimento | Virtual Tour | Material | Status |
|----------------|--------------|----------|--------|
| Arte Design | ✅ Matterport | ✅ Drive | 99% vendido |
| Arte Wood | ✅ Matterport | ✅ Drive | Em vendas |
| Arte Wave | ✅ Matterport | ✅ Drive | Em vendas |
| Arte Botânica | ❌ | ❌ | Em vendas |
| Arte Jardim | ❌ | ❌ | Em vendas |
| Way Barra Bonita | ❌ | ❌ | Em vendas |
| Murano Residencial | ❌ | ❌ | Em vendas |
| Etehe Residencial | ❌ | ❌ | Em vendas |
| Duo Residenziale | ❌ | ❌ | Em vendas |

---

## 🚀 Roadmap de Desenvolvimento

### ✅ Fase 1 - Coleta Básica (CONCLUÍDA - 03/02/2026)
- [x] VPS Scraper com Puppeteer para Linktrees
- [x] Edge Function para orquestração
- [x] IA (Groq/Llama) para categorização
- [x] Tabelas `ai_agent_construtoras` e `ai_agent_empreendimentos`
- [x] 9 empreendimentos da Calper extraídos e salvos

### ✅ Fase 2 - Extração de Unidades (CONCLUÍDA - 04/02/2026)
- [x] Endpoint `/scrape/calper` no VPS para painéis de disponibilidade
- [x] Parser específico para formato Calper (TIPOLOGIA/IMOBILIARIA/CODIGO/DATA)
- [x] Tabela `ai_agent_unidades` criada (código, tipologia, status, imobiliária, bloco)
- [x] Coluna `resumo_vendas` (JSONB) em `ai_agent_empreendimentos`
- [x] Endpoint `POST /ai-agents/dev/scrape-unidades` funcionando
- [x] **358 unidades do Arte Design extraídas e salvas**
- [x] Resumo: 1554 total, 14 disponíveis, 2 reservadas, 1896 vendidas

### 🔄 Fase 3 - Interface Visual (EM ANDAMENTO)
- [ ] Página `/ai-agent` no frontend Rendizy
- [ ] Dashboard com cards por construtora/empreendimento
- [ ] Visualização de disponibilidade em tempo real
- [ ] Botão "Atualizar agora" para scraping manual
- [ ] Histórico de mudanças (vendas, reservas)

### 📋 Fase 4 - Automação
- [ ] Cron job para re-scraping 1-2x por dia
- [ ] Detecção automática de mudanças (diff de status)
- [ ] Alertas via WhatsApp (usando Evolution API)
- [ ] Logs de auditoria por empreendimento

### 📋 Fase 5 - Multi-construtora
- [ ] Parser para Calçada (formato diferente)
- [ ] Parser para Patrimar (formato diferente)
- [ ] Adaptar categorização para diferentes formatos
- [ ] Suporte a múltiplos formatos de painel

### 📋 Fase 6 - Google Drive Integration
- [ ] Leitura de tabelas de preços em PDF
- [ ] Extração de imagens de materiais
- [ ] OCR para documentos escaneados

---

## 🔑 Credenciais e Endpoints

### VPS Scraper
```
URL: http://76.13.82.60:3100
API Key: rendizy-scraper-2026
Health: GET /health
Scrape: POST /scrape/linktree
```

### Groq API
```
Free tier: 14.400 tokens/dia
Modelo: llama-3.3-70b-versatile
Console: https://console.groq.com
```

---

## 📁 Arquivos Relacionados

```
Pasta oficial Rendizy/
├── supabase/
│   ├── functions/rendizy-server/
│   │   └── routes-ai-agents.ts      # Backend principal (1784 linhas)
│   └── migrations/
│       ├── 20260203_ai_agent_empreendimentos.sql
│       └── 20260204_migrate_ai_agent_to_re.sql  # Migração para re_*
│
├── components/real-estate/
│   ├── hooks/
│   │   ├── useEmpreendimentos.ts    # Busca re_developments
│   │   └── useUnidades.ts           # Busca re_units
│   ├── components/
│   │   └── empreendimentos/
│   │       └── EmpreendimentoCard.tsx
│   └── types/index.ts               # Interface Empreendimento, Unidade
│
vps-scraper/
├── index.js                          # API Express (312 linhas)
├── scraper.js                        # Lógica Puppeteer (697 linhas)
├── Dockerfile                        # Container config
├── docker-compose.yml                # Orquestração
└── COPIAR_COLAR_NO_VPS.sh           # Script instalação
```

---

## 🔧 Código-Chave do Scraper

### VPS: Endpoints principais (index.js)

```javascript
// POST /scrape/linktree - Extrai links do Linktree
app.post('/scrape/linktree', authMiddleware, async (req, res) => {
  const { url } = req.body;
  const data = await scrapeLinktree(url);
  // Retorna: { profile, links: [{title, url, category}], rawText }
});

// POST /scrape/calper - Scrape painel de disponibilidade Calper
app.post('/scrape/calper', authMiddleware, async (req, res) => {
  const { url } = req.body;
  const data = await scrapeCalperPanel(url);
  // Retorna: { empreendimento, resumo, unidades: [{codigo, tipologia, status, imobiliaria, data_venda}] }
});
```

### VPS: Parser de painel Calper (scraper.js)

```javascript
// Formato Calper: TIPOLOGIA → IMOBILIARIA → CODIGO → DATA(se vendido)
// Exemplo: "1Q" → "Imoverso" → "1301" → "15/01/2026"

function parseCalperPanelText(rawText) {
  const tipologias = ['1Q', '2Q', '3Q', 'DS', 'COB', 'GARDEN', 'LOFT'];
  const imobiliarias = ['Imoverso', 'Lopes', 'Parceiros', 'Patrimovel', 'VG', 'Calper'];
  
  // Percorre linhas em grupos de 3-4
  // Se linha4 é data (dd/mm/yyyy) → vendido
  // Se não → disponível
  
  return { resumo: {...}, unidades: [...], blocos: [...] };
}
```

### Backend: Endpoint de scrape (routes-ai-agents.ts)

```typescript
// POST /ai-agents/dev/scrape-unidades
app.post('/dev/scrape-unidades', async (c) => {
  const { empreendimento_id, disponibilidade_url } = await c.req.json();
  
  // 1. Chama VPS scraper
  const vpsResponse = await fetch(`${VPS_URL}/scrape/calper`, {
    method: 'POST',
    headers: { 'x-api-key': VPS_API_KEY },
    body: JSON.stringify({ url: disponibilidade_url })
  });
  
  // 2. Salva unidades no banco
  const unidades = data.unidades.map(u => ({
    organization_id: orgId,
    empreendimento_id,
    codigo: u.codigo,
    tipologia: u.tipologia,
    status: u.status,
    imobiliaria: u.imobiliaria
  }));
  
  await supabase.from('ai_agent_unidades').upsert(unidades);
});
```

### Frontend: Hook useEmpreendimentos

```typescript
// components/real-estate/hooks/useEmpreendimentos.ts
export function useEmpreendimentos(filtro?: FiltroEmpreendimento) {
  const loadEmpreendimentos = async () => {
    const { data } = await supabase
      .from('re_developments')
      .select(`*, company:re_companies(id, name, logo_url)`)
      .order('created_at', { ascending: false });
    
    // Formata para interface Empreendimento
    return data.map(dev => ({
      id: dev.id,
      name: dev.name,
      mainImage: dev.images?.[0] || placeholderImage,
      city: dev.location?.city,
      status: dev.phase,
      totalUnits: dev.total_units,
      availableUnits: dev.available_units,
      // ...
    }));
  };
}
```

---

## ✅ Conclusão

O agente de IA está **funcional para coleta básica de empreendimentos**. Os principais desafios técnicos (JavaScript rendering, categorização, identificação via IA) foram resolvidos.

Os próximos passos focam em **extração de dados mais detalhados** (unidades, preços) e **automação**.

---

## 🎯 PRÓXIMOS PASSOS DETALHADOS

### Fase 3A: Extração de Imagens do Google Drive

```
1. Acessar links em marketing_materials (ex: drive.google.com/drive/folders/xxx)
2. Usar Google Drive API com Service Account
3. Listar arquivos da pasta
4. Filtrar imagens (jpg, png, webp)
5. Baixar e fazer upload para Supabase Storage
6. Atualizar re_developments.images com URLs públicas

Endpoint a criar: POST /ai-agents/dev/extract-images
```

### Fase 3B: Extração de Preços

```
1. Acessar link tabela_precos (pode ser PDF ou HTML)
2. Se PDF: Usar pdf-parse + OCR se necessário
3. Se HTML: Scrape direto com Puppeteer
4. Usar LLM para estruturar tabela de preços
5. Mapear tipologia → preço
6. Atualizar re_developments.price_range e re_units.price

Formato esperado:
{
  "tipologias": {
    "1Q": { "area": 45, "preco_min": 350000, "preco_max": 420000 },
    "2Q": { "area": 65, "preco_min": 520000, "preco_max": 680000 },
    "DS": { "area": 85, "preco_min": 750000, "preco_max": 950000 }
  }
}
```

### Fase 3C: Enriquecimento de Unidades

```javascript
// Inferir andar do código (1301 → andar 13)
function inferFloor(codigo) {
  const num = parseInt(codigo);
  if (num >= 100 && num < 10000) {
    return Math.floor(num / 100);
  }
  return null;
}

// Mapear tipologia → quartos
const tipologiaToQuartos = {
  '1Q': 1,
  '2Q': 2,
  '3Q': 3,
  'DS': 2,  // Duplex/Suite
  'COB': 3, // Cobertura
  'GARDEN': 2,
  'LOFT': 1,
  'STUDIO': 0
};
```

### Fase 3D: Mapa Espelho (Visualização)

```
Objetivo: Exibir grid visual de unidades por andar/bloco

┌─────────────────────────────────────────┐
│           BLOCO 1 - Arte Design         │
├─────────────────────────────────────────┤
│ Andar │  01  │  02  │  03  │  04  │     │
├───────┼──────┼──────┼──────┼──────┤     │
│  15   │ 🟢   │ 🔴   │ 🔴   │ 🟡   │     │
│  14   │ 🔴   │ 🔴   │ 🔴   │ 🔴   │     │
│  13   │ 🔴   │ 🔴   │ 🔴   │ 🔴   │     │
│  ...  │      │      │      │      │     │
└─────────────────────────────────────────┘

🟢 Disponível  🟡 Reservado  🔴 Vendido

Componente: MapaEspelhoUnidades.tsx
Props: { developmentId, bloco? }
```

---

**Última atualização:** 05/02/2026 01:00
