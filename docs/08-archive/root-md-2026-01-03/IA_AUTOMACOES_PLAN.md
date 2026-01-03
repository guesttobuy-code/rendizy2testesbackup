## Plano do Módulo de IA e Automações Inteligentes

**Data:** 26/11/2025  
**Responsável:** GPT-5.1 Codex  

### 1. Objetivos
- Padronizar como o Rendizy conecta provedores de IA (ChatGPT, Azure OpenAI, Hugging Face, LLMs self-hosted).
- Disponibilizar IA como serviço interno para automações, assistentes contextuais, relatórios e scripts.
- Permitir criação de fluxos em linguagem natural, convertidos automaticamente em workflows estruturados.
- Garantir segurança (armazenamento de credenciais, auditoria, limites de uso).

### 2. Componentes Principais
1. **Configuração de Provedor IA**
   - UI em `Configurações → Integrações`.
   - Endpoint seguro para salvar credenciais por organização.
   - Suporte multi-provedor (OpenAI, Azure, HuggingFace, Custom).

2. **AI Service Backend**
   - Adapters para cada provedor (chat completions compatível).
   - Rotas: `POST /ai/generate`, `POST /ai/parse-automation`, `POST /ai/test-provider`.
   - Logs e métricas por tenant (tokens usados, custo estimado, latência).

3. **Motor de Automações Inteligentes**
   - Event Bus + catálogo de gatilhos/ações.
   - Builder visual + modo "natural language".
   - AI interpreta comandos e retorna JSON do workflow (com validação).

4. **Assistentes Contextuais**
   - Painel lateral nos módulos críticos (Financeiro, Chat, BI).
   - Templates prontos (resumo diário, diagnóstico, scripts SQL).

### 3. Fluxo de Dados (Visão Simplificada)
1. Usuário ativa provedor IA no card → Credenciais são enviadas ao backend (criptografadas) → guardadas em `ai_provider_configs`.
2. Quando um módulo solicita IA:
   - Front chama `POST /ai/generate` com contexto (ex.: prompt, variáveis, tenant).
   - Backend resolve provedor ativo, monta prompt final (Template + contexto), chama adapter e devolve resposta.
3. No modo linguagem natural:
   - Front envia texto livre → backend chama `POST /ai/parse-automation` → IA responde JSON com gatilhos/ações.
   - Backend valida, normaliza e grava o workflow.

### 4. Infraestrutura e Segurança
- **Tabela `ai_provider_configs`**
  - Campos: `organization_id`, `provider`, `api_key_encrypted`, `base_url`, `default_model`, `temperature`, `max_tokens`, `prompt_template`, `created_at`, `updated_at`.
  - Encryption: usar função `pgp_sym_encrypt` ou `vault` Supabase (avaliar).
- **Logs**: tabela `ai_requests_log` com: `id`, `organization_id`, `endpoint`, `model`, `tokens_input`, `tokens_output`, `status`, `duration_ms`, `created_at`.
- **Rate limiting**: middleware por tenant (ex.: 60 req/min) + limites diários configuráveis.

### 5. Roadmap Técnico
1. **Persistir Config Backend** ✅
   - Migration + routes `GET/PUT /integrations/ai/config`.
   - Frontend `AIIntegration` consumindo API segura.
2. **Service AI** ✅
   - Adapter OpenAI/HuggingFace/custom centralizado em `services/ai-service.ts`.
   - Endpoint `/integrations/ai/test` (server-to-server).
3. **Automações Natural Language (MVP)** ✅
   - Endpoint `/automations/ai/interpret` que recebe texto e devolve JSON.
   - Prompt engineering + schema `AutomationDefinition`.
   - UI `/crm/automacoes-lab` para prototipar.
4. **Event Bus + Executor**
   - Catálogo inicial de eventos (dashboard KPI, financeiro, cron, reservas).
   - Execução em fila (Redis/BullMQ).
5. **Assistentes Contextuais**
   - Painel lateral comum + hooks por módulo.
   - Templates IA (resumo diário, análise de indicadores, mensagens para hóspedes).

### 6. Pendências / Decisões
- Escolher estratégia de criptografia (Supabase Vault vs. pgcrypto).
- Definir limites por plano (ex.: 1M tokens/mês no plano Pro).
- Padronizar formato de automações (`trigger`, `conditions`, `actions`, `metadata`).
- Observabilidade (Supabase logs + dashboard interno).

---
_Documento inicial para guiar desenvolvimento. Atualizar conforme features forem entregues._

