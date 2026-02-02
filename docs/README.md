# 📚 Documentação - Rendizy PMS

> **Portal Central de Documentação do Projeto**
> 
> Este é o índice completo de toda a documentação do Rendizy PMS.  
> Navegue pelas seções abaixo para encontrar o que precisa.

**Última atualização**: 20/12/2024  
**Versão do sistema**: v1.0.103.405

---

## ⚠️ LEITURA OBRIGATÓRIA

Antes de fazer QUALQUER alteração no código:

1. 🔒 **[RULES.md](/RULES.md)** - Regras de Ouro imutáveis (especialmente Seção 0)
2. 📋 **[CHANGELOG.md](/CHANGELOG.md)** - Histórico completo de mudanças
3. 📖 **Este arquivo** - Para encontrar documentação específica

---

## 📂 ESTRUTURA DA DOCUMENTAÇÃO

```
docs/
├── 01-setup/          → Configuração inicial e ambiente
├── 02-architecture/   → Decisões arquiteturais do sistema
├── 03-conventions/    → Padrões de código e commits
├── 04-modules/        → Documentação por módulo funcional
├── 05-operations/     → Operações, deploy e manutenção
├── 06-troubleshooting/→ Diagnósticos e soluções de problemas
├── 07-sessions/       → Histórico de sessões de desenvolvimento
└── 08-archive/        → Documentos históricos preservados
```

---

## 1️⃣ SETUP E CONFIGURAÇÃO INICIAL

> Tudo sobre como configurar o ambiente de desenvolvimento

### 📄 Documentos Principais

- **[LIGANDO_MOTORES.md](01-setup/LIGANDO_MOTORES.md)** - Guia completo de inicialização
  - Como iniciar o projeto pela primeira vez
  - Configuração de variáveis de ambiente
  - Setup do Supabase CLI
  - Troubleshooting inicial

- **SETUP_COMPLETO.md** - Protocolo detalhado para IAs
  - Checklist completo de setup
  - Configurações avançadas
  - Integração com ferramentas

- **GUIA_CONFIGURACAO_SUPABASE.md** - Supabase específico
  - Edge Functions setup
  - Database migrations
  - RLS policies

- **GITHUB_SETUP.md** - Configuração do Git e GitHub
  - Autenticação
  - Workflow de commits
  - CI/CD básico

### 🎯 Quando Usar Esta Seção

- ✅ Primeira vez configurando o projeto
- ✅ Novo desenvolvedor entrando no time
- ✅ Reconfigurando ambiente após formatação
- ✅ Problemas com variáveis de ambiente

---

## 2️⃣ ARQUITETURA

> Decisões arquiteturais e estrutura do sistema

### 📄 Documentos Principais

- **ARQUITETURA_CAPSULAS_MODULOS.md** - Sistema de cápsulas isoladas
  - Conceito de cápsula
  - Independência entre módulos
  - Padrões de comunicação

- **ARQUITETURA_ANUNCIO_ULTIMATE.md** - Módulo de anúncios
  - Estrutura JSONB
  - Sistema de tabs vs wizard
  - Tabela única: `properties` (não existe tabela separada de rascunhos)

- **ARQUITETURA_ESCALAVEL_SAAS.md** - Arquitetura SaaS multi-tenant
  - Row Level Security (RLS)
  - Organization context
  - Isolamento de dados

- **ARQUITETURA_MULTI_TENANT_v1.md** - Multi-tenancy detalhado
  - Modelo de dados
  - Autenticação e autorização
  - Políticas de acesso

- **ARQUITETURA_MOTOR_RESERVAS.md** - Sistema de reservas
  - Fluxo de criação de reservas
  - Bloqueios de calendário
  - Integração com properties

- **ARQUITETURA_CLIENT_SITES_PROXY_SUPABASE_MEDHOME_2026-01-04.md** - Sites públicos por subdomínio (Supabase Storage + Vercel proxy)
  - Fluxo `/site/<subdomain>` → `rendizy-public/serve` → Storage
  - Proxy para Content-Type/CSP + compatibilidade com bundle do cliente
  - Caso real MedHome (lições aprendidas)

### 🎯 Quando Usar Esta Seção

- ✅ Entender decisões de design
- ✅ Implementar novo módulo seguindo padrões
- ✅ Refatorar código existente
- ✅ Resolver conflitos arquiteturais

---

## 3️⃣ CONVENÇÕES E PADRÕES

> Regras de código, commits e documentação

### 📄 Documentos Principais

- **CONVENTIONS.md** - Padrões gerais de desenvolvimento
  - Nomenclatura de arquivos
  - Estrutura de pastas
  - Padrões de código TypeScript/React

- **CHECKLIST_ANTES_DE_MUDAR_CODIGO.md** - Checklist obrigatório
  - O que verificar antes de modificar código
  - Perguntas de validação
  - Fluxo de aprovação

- **BOAS_PRATICAS_LOGIN_MULTI_TENANT.md** - Autenticação
  - Padrões de auth
  - Separação de contextos
  - Edge Functions vs REST API

- **Scripts:**
  - `validar-regras.ps1` - Validação automática pre-commit
  - Detecta duplicatas
  - Verifica padrões

### 🎯 Quando Usar Esta Seção

- ✅ Antes de criar novo arquivo
- ✅ Antes de commitar código
- ✅ Dúvidas sobre nomenclatura
- ✅ Revisar mudanças antes de push

---

## 4️⃣ MÓDULOS FUNCIONAIS

> Documentação específica de cada módulo do sistema

### 📁 Estrutura

```
04-modules/
├── properties/    → Sistema de anúncios (tabs + wizard deprecated)
├── staysnet/             → Integração Stays.net
├── calendario/           → Calendário de reservas e bloqueios
├── reservas/             → Sistema de reservas
├── financeiro/           → Módulo financeiro
├── crm/                  → CRM e automações
└── [outros]/
```

### 📄 Documentos por Módulo

#### **Anúncios Ultimate**
- `README.md` - Overview do módulo
- `Claude_Sonnet_properties.md` - Documento de controle (histórico completo)
- Todas as issues e fixes relacionados

#### **StaysNet**
- Integração com API Stays.net
- Sincronização de propriedades
- Deduplicação e mapeamento

#### **Calendário**
- Visualização de reservas
- Bloqueios manuais
- Disponibilidade

### 🎯 Quando Usar Esta Seção

- ✅ Trabalhando em módulo específico
- ✅ Entender regras de negócio
- ✅ Ver histórico de decisões
- ✅ Documentar nova feature

---

## 5️⃣ OPERAÇÕES E DEPLOY

> Procedimentos operacionais, deploy e manutenção

### 📄 Documentos Principais

- **DEPLOY_BACKEND_AGORA.md** - Deploy de Edge Functions
  - Comandos Supabase CLI
  - Checklist pre-deploy
  - Verificação pós-deploy

- **GUIA_PUSH_SIMPLES.md** - Git workflow simplificado
  - Como fazer push seguro
  - Resolver conflitos
  - Sincronizar com remoto

- **INSTRUCOES_*.md** - Instruções específicas
  - Aplicar migrations
  - Configurar secrets
  - Troubleshooting deploy

- **Validação WhatsApp (Evolution)**
  - [MAPA_VALIDACAO_WHATSAPP_2025-12-24.md](05-operations/MAPA_VALIDACAO_WHATSAPP_2025-12-24.md)
  - [TEST-WHATSAPP-PROD_2025-12-24.ps1](05-operations/TEST-WHATSAPP-PROD_2025-12-24.ps1)

### 🎯 Quando Usar Esta Seção

- ✅ Fazer deploy de changes
- ✅ Aplicar migrations no banco
- ✅ Configurar variáveis de produção
- ✅ Troubleshooting deploy

---

## 6️⃣ TROUBLESHOOTING

> Diagnósticos e soluções para problemas comuns

### 📄 Tipos de Documentos

- **DIAGNOSTICO_*.md** - Análises de problemas
  - Sintomas observados
  - Investigação realizada
  - Causa raiz identificada

- **SOLUCAO_*.md** - Soluções aplicadas
  - Problema resolvido
  - Steps da solução
  - Como prevenir recorrência

- **DEBUG_*.md** - Processos de debug
  - Como debugar específico problema
  - Ferramentas utilizadas
  - Queries úteis

### 📋 Problemas Documentados

- Login e autenticação
- RLS policies bloqueando queries
- CORS issues
- Edge Functions retornando 404
- Duplicatas no banco
- Migrations falhando

### 🎯 Quando Usar Esta Seção

- ✅ Sistema apresenta erro conhecido
- ✅ Reproduzir solução anterior
- ✅ Entender causa de bug histórico
- ✅ Documentar novo problema resolvido

---

## 7️⃣ HISTÓRICO DE SESSÕES

> Registro cronológico de desenvolvimento

### 📁 Organização

```
07-sessions/
├── 2024-12-19/
│   ├── RESUMO_SESSAO_19_12_2024.md
│   ├── FIX_*.md
│   └── ANALISE_*.md
├── 2024-12-20/
│   ├── PROMPT_INICIALIZACAO_v1.0.103.405.md
│   ├── FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md
│   ├── FIX_MIGRACAO_PROPERTIES_v1.0.103.405.md
│   └── AUDITORIA_*.md
└── [outras datas]/
```

### 📄 Conteúdo Típico

- Resumo da sessão (o que foi feito)
- Fixes aplicados (issues resolvidos)
- Análises realizadas (descobertas)
- Decisões tomadas (architectural decisions)
- Próximos passos (pending tasks)

### 🎯 Quando Usar Esta Seção

- ✅ Entender contexto de mudança específica
- ✅ Ver evolução do projeto ao longo do tempo
- ✅ Recuperar decisão de data específica
- ✅ Onboarding de novo membro (ler últimas sessões)

---

## 8️⃣ ARQUIVO HISTÓRICO

> Documentos antigos preservados para referência

### 📁 Conteúdo

- Versões antigas de documentos importantes
- Experimentos que não foram para produção
- Análises de abordagens descartadas
- Backups de configurações antigas

### ⚠️ Aviso

Arquivos aqui são **SOMENTE LEITURA**.  
Não use código daqui sem validar primeiro.

### 🎯 Quando Usar Esta Seção

- ✅ Pesquisa histórica
- ✅ Entender por que abordagem foi descartada
- ✅ Recuperar configuração antiga específica
- ❌ **NÃO** copiar código diretamente

---

## 🔍 COMO ENCONTRAR O QUE PRECISO?

### Por Tipo de Tarefa

| Tarefa | Seção | Documentos |
|--------|-------|------------|
| Configurar ambiente novo | 1. Setup | LIGANDO_MOTORES.md |
| Entender decisão arquitetural | 2. Arquitetura | ARQUITETURA_*.md |
| Criar novo componente | 3. Convenções | CONVENTIONS.md |
| Trabalhar em módulo específico | 4. Módulos | /04-modules/[nome]/ |
| Fazer deploy | 5. Operações | DEPLOY_*.md |
| Resolver erro | 6. Troubleshooting | DIAGNOSTICO_*, SOLUCAO_* |
| Ver o que foi feito em data | 7. Sessões | /07-sessions/[data]/ |

### Por Palavra-Chave

**Autenticação:**
- `/RULES.md` - Seção 3
- `/docs/03-conventions/BOAS_PRATICAS_LOGIN_MULTI_TENANT.md`

**Anúncios:**
- `/docs/04-modules/properties/`
- `/RULES.md` - Seção 1

**StaysNet:**
- `/docs/04-modules/staysnet/`
- `/RULES.md` - Seção 4

**Deploy:**
- `/docs/05-operations/`

**Banco de Dados:**
- `/RULES.md` - Seção 1, 9
- `/docs/02-architecture/ARQUITETURA_ESCALAVEL_SAAS.md`

---

## 🆘 FLUXO DE NAVEGAÇÃO RECOMENDADO

### Para Desenvolvedores Novos

```
1. Ler: /RULES.md (especialmente Seção 0)
2. Ler: /docs/01-setup/LIGANDO_MOTORES.md
3. Ler: /docs/02-architecture/ (overview de cada arquivo)
4. Ler: /docs/03-conventions/CONVENTIONS.md
5. Explorar: /docs/04-modules/ (módulos que irá trabalhar)
6. Ler últimas 3 sessões: /docs/07-sessions/ (contexto recente)
```

### Para IAs Iniciando Sessão

```
1. Ler: /RULES.md COMPLETO (todas as seções)
2. Ler: /docs/README.md (este arquivo)
3. git status (verificar estado limpo)
4. Perguntar: "O que precisamos fazer hoje?"
```

### Para Resolver Problema Específico

```
1. Verificar: /docs/06-troubleshooting/ (já foi resolvido antes?)
2. Consultar: /RULES.md seção relevante
3. Buscar em: /docs/04-modules/[modulo-afetado]/
4. Se não encontrou: Perguntar com contexto completo
```

---

## 📝 MANTENDO A DOCUMENTAÇÃO ATUALIZADA

### Quando Criar Novo Documento

✅ **Situações que exigem documentação:**
- Fix importante (salvar em `/docs/07-sessions/[DATA]/FIX_*.md`)
- Nova feature (atualizar `/docs/04-modules/[modulo]/README.md`)
- Decisão arquitetural (novo arquivo em `/docs/02-architecture/`)
- Problema resolvido (criar `/docs/06-troubleshooting/SOLUCAO_*.md`)

### Padrão de Nomenclatura

```
FIX_[DESCRICAO]_v[VERSAO].md
DIAGNOSTICO_[PROBLEMA]_[DATA].md
SOLUCAO_[PROBLEMA].md
ANALISE_[TEMA].md
RESUMO_SESSAO_[DATA].md
```

### Atualizar Arquivos Existentes

- **CHANGELOG.md**: A cada commit significativo
- **RULES.md**: Apenas se regra fundamental mudar (raro)
- **docs/README.md**: Ao adicionar nova seção ou documento importante
- **Módulo README**: Quando feature do módulo mudar

---

## 🔗 LINKS RÁPIDOS

### Documentos Mais Acessados

- [RULES.md](/RULES.md) - Regras imutáveis
- [CHANGELOG.md](/CHANGELOG.md) - Histórico de mudanças
- [LIGANDO_MOTORES.md](01-setup/LIGANDO_MOTORES.md) - Setup inicial
- [CONVENTIONS.md](03-conventions/CONVENTIONS.md) - Padrões de código

### Controles de Módulos

- [Anúncios Ultimate](04-modules/properties/README.md)
- [StaysNet](04-modules/staysnet/README.md)
- [Calendário](04-modules/calendario/README.md)

### Operações Comuns

- [Deploy Backend](05-operations/DEPLOY_BACKEND_AGORA.md)
- [Git Push Simples](05-operations/GUIA_PUSH_SIMPLES.md)

---

## � CRM MODULAR (2026-01-26)

### ADRs (Architecture Decision Records)

| ADR | Título | Status | Data |
|-----|--------|--------|------|
| [ADR-001](adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md) | CRM Modular Multi-Tenant | ✅ Implementado | 2026-01-26 |

### Changelogs CRM

| Data | Título | Impacto |
|------|--------|---------|
| [2026-01-26](changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md) | CRM Modular Multi-Tenant | Alto |

### Referência Rápida: CRM Modular

**Tabelas por Módulo:**
```
VENDAS:           sales_funnels, sales_funnel_stages, sales_deals
SERVIÇOS:         service_funnels, service_funnel_stages, service_tickets
PRÉ-DETERMINADOS: predetermined_funnels, predetermined_funnel_stages, predetermined_items
```

**APIs Frontend:**
```typescript
import { crmSalesApi } from '@/utils/api-crm-sales';
import { crmServicesApi } from '@/utils/api-crm-services';
import { crmPredeterminedApi } from '@/utils/api-crm-predetermined';
```

**Rotas Backend:**
```
/crm/sales/*         → routes-sales.ts
/crm/services/*      → routes-services.ts
/crm/predetermined/* → routes-predetermined.ts
```

---

## �📞 SUPORTE E CONTATO

**Para Problemas:**
1. Verificar `/docs/06-troubleshooting/`
2. Consultar `/RULES.md` seção relevante
3. Buscar em `/docs/07-sessions/` (últimas 5 datas)
4. Perguntar com contexto completo

**Para Sugestões de Melhoria da Documentação:**
- Abrir issue ou enviar commit com proposta
- Seguir padrões existentes

---

**Última atualização**: 20/12/2024  
**Mantenedores**: Equipe Rendizy + IAs assistentes

Este documento é vivo e deve ser atualizado conforme o projeto evolui.
