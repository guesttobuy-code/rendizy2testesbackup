# Integração via I.A para Dados de Check-in

> **Documento Operacional Rendizy**  
> Criado em: 2026-02-01  
> Autor: GitHub Copilot (Claude Opus 4.5)  
> Versão: 1.0

---

## 📋 Resumo Executivo

Este documento descreve o processo de importação assistida por I.A. para migração de dados operacionais de check-in de planilhas Excel para o sistema Rendizy. O processo foi desenvolvido para facilitar o onboarding de clientes que já possuem dados estruturados em planilhas.

### Resultados da Primeira Importação (2026-02-01)

| Métrica | Valor |
|---------|-------|
| Total na Planilha | 163 imóveis |
| Total no Rendizy | 370 imóveis |
| Matching Automático | 135 imóveis (82.8%) |
| Com Observações Preenchidas | 110 imóveis |
| Categorias Atualizadas | 110 imóveis |
| Taxa de Sucesso | 100% |
| Erros | 0 |

#### Distribuição Final por Categoria

| Categoria | Quantidade | % |
|-----------|------------|---|
| grupo_whatsapp | 47 | 42.7% |
| normal | 33 | 30.0% |
| portaria_direta | 10 | 9.1% |
| pessoa_especifica | 8 | 7.3% |
| aplicativo | 5 | 4.5% |
| email_portaria | 4 | 3.6% |
| formulario | 3 | 2.7% |

---

## 🎯 Quando Usar Este Processo

Use a importação via I.A. quando:

1. **Cliente tem planilha operacional existente** com dados de check-in
2. **Volume grande de imóveis** (> 50 imóveis)
3. **Dados não-padronizados** que requerem interpretação inteligente
4. **Mapeamento complexo** entre nomes da planilha e IDs do sistema
5. **Clientes em migração** de outras plataformas

---

## 📁 Estrutura de Arquivos

```
/workspace/
├── _tmp_checkin_import_analysis.py     # Script de análise da planilha
├── _tmp_checkin_import_analysis.json   # Resultado da análise (intermediário)
├── _tmp_import_checkin_direct.py       # Script de importação
├── _tmp_checkin_import_log.json        # Log da última importação
└── [PLANILHA_CLIENTE].xlsx             # Planilha fonte do cliente
```

---

## 🔄 Fluxo do Processo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE IMPORTAÇÃO                             │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │   PLANILHA   │ ──▶  │   ANÁLISE    │ ──▶  │   MATCHING   │
    │    EXCEL     │      │   I.A.       │      │   IMÓVEIS    │
    └──────────────┘      └──────────────┘      └──────────────┘
                                                       │
    ┌──────────────┐      ┌──────────────┐            ▼
    │  VALIDAÇÃO   │ ◀──  │  MAPEAMENTO  │ ◀── ┌──────────────┐
    │   HUMANA     │      │  CATEGORIAS  │     │  EXTRAÇÃO    │
    └──────────────┘      └──────────────┘     │   CONFIGS    │
           │                                   └──────────────┘
           ▼
    ┌──────────────┐      ┌──────────────┐
    │  IMPORTAÇÃO  │ ──▶  │    BANCO     │
    │    DIRETA    │      │   SUPABASE   │
    └──────────────┘      └──────────────┘
```

---

## 📊 Etapa 1: Análise da Planilha

### Colunas Esperadas na Planilha

A I.A. consegue interpretar planilhas com diversas estruturas, mas o ideal é ter:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| Nome do Imóvel | Identificador principal | "Casa Inteira Joá - Eurípides" |
| Cidade | Localização | "Rio de Janeiro" |
| Tipo de Check-in | Categoria operacional | "Grupo WhatsApp", "Portaria", etc |
| Passo a Passo | Instruções detalhadas | "Enviar resumo para grupo..." |
| Contatos | Telefones/emails | "+55 21 99999-9999" |

### Script de Análise

```python
# Comando para executar a análise
# Pré-requisitos: pandas, openpyxl

import pandas as pd
import json

# 1. Carregar planilha
df = pd.read_excel('PLANILHA_CLIENTE.xlsx')

# 2. Buscar imóveis do Rendizy via API
properties = fetch_rendizy_properties()

# 3. Fazer matching por similaridade de nomes
# A I.A. usa algoritmos de fuzzy matching (difflib)

# 4. Gerar arquivo de análise
with open('_tmp_checkin_import_analysis.json', 'w') as f:
    json.dump(results, f)
```

---

## 🏷️ Etapa 2: Mapeamento de Categorias

### DE-PARA: Tipos da Planilha → Categorias do Sistema

| Tipo na Planilha | Categoria Sistema | Descrição |
|------------------|-------------------|-----------|
| `Grupo WhatsApp` | `grupo_whatsapp` | Comunicação via grupo de WhatsApp |
| `Normal` | `normal` | Processo padrão sem intermediários |
| `Portaria` / `Portaria Direta` | `portaria_direta` | Entrega via portaria do condomínio |
| `Comunicar [Nome]` | `pessoa_especifica` | Contato com pessoa específica |
| `Email para portaria` | `email_portaria` | Envio de dados por email |
| `Aplicativo` / `APP` | `aplicativo` | Check-in via app do condomínio |
| `Formulário` | `formulario` | Preenchimento de formulário |
| `Chaveiro` / `Lockbox` | `autoatendimento` | Retirada autônoma de chaves |

### Lógica de Inferência

```python
def infer_category(tipo_planilha):
    tipo = tipo_planilha.lower().strip()
    
    if 'grupo' in tipo or 'whatsapp' in tipo:
        return 'grupo_whatsapp'
    elif 'portaria' in tipo and 'email' not in tipo:
        return 'portaria_direta'
    elif 'email' in tipo:
        return 'email_portaria'
    elif 'comunicar' in tipo:
        return 'pessoa_especifica'
    elif 'app' in tipo or 'aplicativo' in tipo:
        return 'aplicativo'
    elif 'formulário' in tipo or 'formulario' in tipo:
        return 'formulario'
    elif 'lockbox' in tipo or 'chaveiro' in tipo:
        return 'autoatendimento'
    else:
        return 'normal'
```

---

## 🔍 Etapa 3: Matching de Imóveis

### Algoritmo de Similaridade

A I.A. usa o algoritmo `difflib.SequenceMatcher` para encontrar correspondências:

```python
from difflib import SequenceMatcher

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# Score mínimo aceito: 0.6 (60%)
# Score ideal: > 0.8 (80%)
```

### Casos de Match

| Score | Interpretação | Ação |
|-------|---------------|------|
| ≥ 0.9 | Match exato | ✅ Importar automaticamente |
| 0.7 - 0.89 | Match provável | ⚠️ Revisar antes de importar |
| 0.6 - 0.69 | Match possível | ⚠️ Validação manual necessária |
| < 0.6 | Sem match | ❌ Não importar |

### Imóveis Não Encontrados

Os imóveis sem match (17.2% no caso) podem significar:
- Imóvel ainda não cadastrado no Rendizy
- Nome muito diferente na planilha
- Imóvel desativado ou removido

---

## 📤 Etapa 4: Importação

### Estrutura dos Dados Importados

```json
{
  "checkin_category": "grupo_whatsapp",
  "checkin_config": {
    "imported_from": "planilha_operacional",
    "imported_at": "2026-02-01",
    "original_type": "Grupo WhatsApp",
    "original_step": "Resumo da reserva para grupo...",
    "phones": ["+55 21 99999-9999"],
    "emails": ["exemplo@email.com"],
    "required_documents": ["guest_name", "document_number"]
  }
}
```

### Campos do Banco de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `checkin_category` | TEXT | Categoria principal |
| `checkin_config` | JSONB | Configurações detalhadas |

### Script de Importação

```bash
# Pré-requisitos
. ./_rendizy-creds.local.ps1  # Carregar credenciais
. ./.venv/Scripts/Activate.ps1  # Ativar venv

# Executar
python _tmp_import_checkin_direct.py
```

---

## ✅ Etapa 5: Validação

### Verificar no Banco

```bash
# PowerShell
. ./_rendizy-creds.local.ps1
curl -s "$env:SUPABASE_URL/rest/v1/properties?select=id,checkin_category&checkin_category=neq.null&limit=10" \
  -H "apikey: $env:SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
```

### Verificar na Interface

1. Acessar: `http://localhost:3000/crm/configuracoes/gestao-tarefas/tarefas-operacionais`
2. Clicar na aba **"Check-in"**
3. Verificar se os imóveis aparecem com as categorias corretas
4. Conferir dashboard com estatísticas atualizadas

---

## 📈 Distribuição por Categoria (Importação 2026-02-01)

```
grupo_whatsapp      ████████████████████████████ 55 imóveis (40.7%)
normal              ████████████████████ 40 imóveis (29.6%)
portaria_direta     ███████ 14 imóveis (10.4%)
pessoa_especifica   █████ 10 imóveis (7.4%)
email_portaria      ███ 7 imóveis (5.2%)
aplicativo          ██ 5 imóveis (3.7%)
formulario          ██ 4 imóveis (3.0%)
```

---

## 🛠️ Troubleshooting

### Problema: Match rate baixo (< 70%)

**Causas possíveis:**
- Nomes muito diferentes entre planilha e sistema
- Imóveis não cadastrados no Rendizy
- Formatação inconsistente

**Soluções:**
1. Padronizar nomes na planilha antes de importar
2. Cadastrar imóveis faltantes primeiro
3. Usar matching manual para casos específicos

### Problema: Categoria inferida incorretamente

**Solução:**
1. Editar o arquivo `_tmp_checkin_import_analysis.json`
2. Alterar o campo `mapped_category` do imóvel
3. Re-executar o script de importação

### Problema: Erro de conexão com banco

**Verificar:**
```bash
. ./_rendizy-creds.local.ps1
echo $env:SUPABASE_URL
echo $env:SUPABASE_SERVICE_ROLE_KEY
```

---

## 📝 Checklist de Importação

- [ ] Obter planilha Excel do cliente
- [ ] Executar script de análise
- [ ] Verificar taxa de match (ideal > 80%)
- [ ] Revisar mapeamento de categorias
- [ ] Validar imóveis não encontrados
- [ ] Executar importação
- [ ] Verificar dados no banco
- [ ] Validar na interface web
- [ ] Documentar imóveis não importados

---

## 📞 Suporte

Para solicitar importação via I.A.:

1. **Requisitos:**
   - Planilha Excel com dados de check-in
   - Acesso ao ambiente Rendizy do cliente
   - Lista de imóveis cadastrados

2. **Entregáveis:**
   - Relatório de matching
   - Log de importação
   - Lista de imóveis pendentes

3. **SLA:**
   - Análise: até 30 minutos
   - Importação: até 1 hora
   - Validação: até 30 minutos

---

## 📚 Referências

- [CheckinTab.tsx](components/crm/settings/CheckinTab.tsx) - Componente de configuração
- [CheckinImportModal.tsx](components/crm/settings/CheckinImportModal.tsx) - Modal de importação manual
- [routes-anuncios.ts](supabase/functions/rendizy-server/routes-anuncios.ts) - API de atualização

---

> **Nota:** Este processo foi desenvolvido para assistir na migração de dados existentes. Para operação contínua, use a interface web em Configurações → Gestão de Tarefas → Tarefas Operacionais → Check-in.
