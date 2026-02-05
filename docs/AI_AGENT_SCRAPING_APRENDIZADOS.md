# 🔧 AI Agent - Aprendizados Críticos do Scraping

**Data:** 05/02/2026 00:45  
**Versão:** 1.1

---

## 📊 Estado Atual do Banco

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `re_companies` | 7 | Calper + 6 exemplos |
| `re_developments` | 9 | Empreendimentos Calper |
| `re_units` | **1633** | Unidades (3 empreendimentos com dados) |

### Por Empreendimento:

| Empreendimento | Total | Disponíveis | Status |
|----------------|-------|-------------|--------|
| Arte Design | 1552 | 12 | 🔴 99% vendido |
| Arte Botânica | 38 | 0 | 🔴 100% vendido |
| Arte Jardim | 43 | 43 | 🟢 Lançamento! |
| Arte Wave | 0 | - | ⚠️ Painel não configurado |
| Arte Wood | 0 | - | ⚠️ Painel não configurado |
| Duo Residenziale | 0 | - | ⚠️ Formato diferente |
| Etehe Residencial | 0 | - | ⚠️ Formato diferente |
| Murano Residencial | 0 | - | ⚠️ Formato diferente |
| Way Barra Bonita | 0 | - | ⚠️ Painel não configurado |
| **TOTAL** | **1633** | **55** | |

---

## 🔐 Autenticação do VPS Scraper

**CRÍTICO:** O VPS usa `Authorization: Bearer` e **NÃO** `x-api-key`!

```javascript
// ✅ CORRETO
const response = await fetch('http://76.13.82.60:3100/scrape/calper', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rendizy-scraper-2026',  // ← CORRETO
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: 'https://calper.tec.br/painel/artedesign/' })
});

// ❌ ERRADO - vai retornar 401 Unauthorized
headers: {
  'x-api-key': 'rendizy-scraper-2026'  // ← ERRADO!
}
```

---

## 📋 Schema da Tabela re_units

```sql
CREATE TABLE re_units (
  id UUID PRIMARY KEY,
  development_id UUID REFERENCES re_developments(id),
  unit_number VARCHAR,      -- "1301", "201", "TH01"
  floor INTEGER,            -- 13, 2, 1 (inferido do código)
  tower VARCHAR,            -- Torre A, Torre B
  block VARCHAR,            -- "1", "2", "01" (bloco do empreendimento)
  typology VARCHAR,         -- "1Q", "2Q", "DS", "COB", "TH", "GD"
  area_sqm DECIMAL,         -- 45.0, 95.0, 200.0
  price DECIMAL,            -- 450000.00
  status VARCHAR,           -- "available", "reserved", "sold"
  reserved_by UUID,         -- FK para usuário (se reservado)
  reserved_at TIMESTAMPTZ,
  reservation_expires_at TIMESTAMPTZ,
  sold_by UUID,             -- FK para usuário (NÃO é nome da imobiliária!)
  sold_at TIMESTAMPTZ,
  sold_date DATE,           -- Data da venda
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**ATENÇÃO:** `sold_by` é UUID de usuário, não o nome da imobiliária (Lopes, Patrimovel, etc).

---

## 📝 Formato do Painel Calper

O texto do painel vem separado por tabs (`\t`) e newlines (`\n`) no formato:

```
BLOCO 1

TIPOLOGIA
IMOBILIÁRIA
CÓDIGO
DATA

TIPOLOGIA
IMOBILIÁRIA
...
```

### Padrão de Unidade:
```
1Q          ← Tipologia
Lopes       ← Imobiliária (ou "Disponível" se à venda)
1301        ← Código da unidade
23/09/2024  ← Data da venda (ausente se disponível)
```

### Status:
- **Disponível**: Imobiliária = "Disponível" e sem data
- **Vendido**: Qualquer outra imobiliária + data

---

## 🏢 Mapeamento de Tipologia

```javascript
const TIPOLOGIA_MAP = {
  '1Q':    { area: 45,  bedrooms: 1, type: 'apartment' },
  '2Q':    { area: 65,  bedrooms: 2, type: 'apartment' },
  '3Q':    { area: 85,  bedrooms: 3, type: 'apartment' },
  'DS':    { area: 95,  bedrooms: 2, type: 'duplex' },
  'DS/GD': { area: 95,  bedrooms: 2, type: 'garden_duplex' },
  'GD':    { area: 45,  bedrooms: 1, type: 'garden' },
  'COB':   { area: 150, bedrooms: 3, type: 'penthouse' },
  'TH':    { area: 200, bedrooms: 3, type: 'townhouse' },
  'LJ':    { area: 50,  bedrooms: 0, type: 'commercial' },
  'LOJA':  { area: 50,  bedrooms: 0, type: 'commercial' },
};
```

### Inferir Andar do Código:
```javascript
function inferFloor(codigo) {
  const num = parseInt(codigo);
  if (num >= 1000 && num < 10000) {
    return Math.floor(num / 100);  // 1301 → 13
  } else if (num >= 100 && num < 1000) {
    return Math.floor(num / 10);   // 301 → 30
  } else if (num >= 10 && num < 100) {
    return Math.floor(num / 10);   // 31 → 3
  }
  return null;
}
```

---

## ⚠️ Painéis Problemáticos

### Painéis Não Configurados (173 chars)
- Arte Wave
- Arte Wood  
- Way Barra Bonita

Retornam apenas "Painel Calper" sem dados de unidades.

### Painéis com Formato Diferente (~14k chars mas 0 unidades parseadas)
- Duo Residenziale
- Etehe Residencial
- Murano Residencial

Precisam de parser customizado - provavelmente usam um formato de grid diferente.

---

## 🔄 Duplicação de Códigos por Bloco

**Problema:** Arte Design tem 4 blocos, cada um com unidades de código igual.
Exemplo: Unidade 1301 existe no Bloco 1, Bloco 2, Bloco 3 e Bloco 4.

**Solução atual:** O script salva por `unit_number` sem considerar bloco, causando updates em vez de inserts.

**Resultado:** 1552 unidades parseadas → 478 únicas no banco (1 por código).

**Solução futura:** Identificador único = `unit_number + block` ou código composto (`1-1301`, `2-1301`).

---

## 📁 Scripts de Referência

| Script | Função |
|--------|--------|
| `_tmp_parse_calper_local.cjs` | Scrape via VPS + parser local melhorado + upsert no banco |
| `_tmp_check_db.cjs` | Verificar estado atual do banco de dados |
| `_tmp_enrich_units.cjs` | Enriquecer unidades com floor inferido e area por tipologia |
| `_tmp_scrape_all_empreendimentos.cjs` | Scrape batch de todos os empreendimentos |

---

## 📡 Endpoints do VPS

| Endpoint | Método | Função |
|----------|--------|--------|
| `/health` | GET | Health check |
| `/scrape/linktree` | POST | Extrai links de Linktree |
| `/scrape/calper` | POST | Scrape painel Calper (retorna rawText) |
| `/scrape/generic` | POST | Scrape genérico de páginas |

### Exemplo de uso:

```javascript
// Scrape painel Calper
const response = await fetch('http://76.13.82.60:3100/scrape/calper', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rendizy-scraper-2026',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    url: 'https://calper.tec.br/painel/artedesign/' 
  })
});

const result = await response.json();
// result.data.rawText contém o texto bruto do painel
// O parser do VPS não funciona bem - usar parser local!
```

---

## 🎯 Próximos Passos (Roadmap)

### ✅ Concluído:
- [x] Corrigir duplicação por bloco - Implementado `block:unit_number` como chave única
- [x] Parser local melhorado funcionando
- [x] 1633 unidades no banco

### 🔄 Em Andamento / Próximas Tarefas:

#### Fase 3A: Parser para Duo/Etehe/Murano
- [ ] Analisar rawText desses painéis (têm ~14k chars mas formato diferente)
- [ ] Criar parser específico para esse formato
- [ ] Testar e popular unidades

#### Fase 3B: Verificar Arte Wave/Wood/Way
- [ ] Confirmar se painéis estão inativos ou se URL é diferente
- [ ] Contatar Calper se necessário

#### Fase 3C: Extrair Preços
- [ ] Implementar scrape de tabelas de preços (PDF ou HTML)
- [ ] Usar LLM para estruturar preços por tipologia
- [ ] Popular `re_units.price` e `re_developments.price_range`

#### Fase 3D: Imagens do Google Drive
- [ ] Extrair imagens dos links em `marketing_materials`
- [ ] Upload para Supabase Storage
- [ ] Atualizar `re_developments.images`

#### Fase 3E: Mapa Espelho (UI)
- [ ] Criar componente `MapaEspelhoUnidades.tsx`
- [ ] Grid visual de unidades por andar/bloco
- [ ] Cores: 🟢 Disponível / 🟡 Reservado / 🔴 Vendido

---

**Última atualização:** 05/02/2026 01:00
