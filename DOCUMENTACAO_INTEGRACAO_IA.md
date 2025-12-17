## Integração com Provedor de IA (Copiloto Rendizy)

### Objetivo
Conectar fornecedores de IA (OpenAI, Azure OpenAI, Hugging Face ou endpoints custom) para alimentar automações, assistentes e módulos inteligentes dentro do Rendizy.

### Visão Geral
1. **Configuração (Frontend)**  
   - Card em `Configurações → Integrações → Provedor de IA`.  
   - Usuário escolhe provedor, informa API key, URL base, modelo padrão, parâmetros (temperature, max tokens) e prompt base.  
   - MVP atual salva localmente; nova versão persistirá criptografado no backend.

2. **Persistência (Backend)**  
   - Tabela `ai_provider_configs` com campos: `organization_id`, `provider`, `api_key_encrypted`, `base_url`, `default_model`, `temperature`, `max_tokens`, `prompt_template`, `notes`, `created_at`, `updated_at`.  
   - API REST `/integrations/ai/config` (GET/PUT) + `/integrations/ai/test` (POST).  
   - Criptografia simétrica via `AI_PROVIDER_SECRET` (AES-GCM) — campo `api_key` nunca retorna em claro.

3. **Serviço Central (IAService)**  
   - Wrapper para chamadas (`generateText`, `completeChat`, `structuredPrompt`).  
   - Decide provedor conforme config do tenant, aplica prompt base e parâmetros.  
   - Ponto único para logging/contagem de tokens.

4. **Uso nos Módulos**  
   - Automações: campo de linguagem natural → IA gera JSON do workflow.  
   - Financeiro, CRM, Check-in: assistente contextual apoiando scripts e relatórios.  
   - Chat interno: respostas automáticas (futuro).

### Próximos Passos
1. Migration `20241126_create_ai_provider_configs.sql`.  
2. Rotas backend (`listAIConfig`, `upsertAIConfig`).  
3. Atualizar frontend para consumir API.  
4. Implementar `IAService` (backend) e util para módulos. ✅  
5. Endpoint `/automations/ai/interpret` para linguagem natural. ✅  
6. Logs de uso + limites.  
7. Assistente natural no módulo de automações. (Lab disponível em `/crm/automacoes-lab`)

### Observações
- **Segurança:** usar Supabase Secrets para chave de criptografia; campo `api_key` nunca retorna em claro.  
- **Multi-tenant:** superadmin usa default se tenant não tiver config.  
- **Fallback:** se provedor offline, emitir aviso e sugerir outro.  
- **Custos:** armazenar `last_usage_tokens`, `last_usage_value` para futuras análises.

