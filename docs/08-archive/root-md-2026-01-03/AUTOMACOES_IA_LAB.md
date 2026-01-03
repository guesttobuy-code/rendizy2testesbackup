## Laboratório de Automações Inteligentes (Beta)

**Data:** 26/11/2025  
**Módulo:** CRM (`/crm/automacoes-lab`)

### Objetivo
Permitir que o usuário descreva automações em linguagem natural e receba um fluxo estruturado contendo gatilho, condições e ações. O backend utiliza o provedor de IA configurado para interpretar o texto e devolver um JSON pronto para ser salvo no motor de automações.

### Arquitetura
1. **Frontend**
   - Componente `AutomationsNaturalLanguageLab` (CRM → Inteligência).
   - Formulário com descrição livre + contexto (módulo, canal, prioridade, idioma).
   - Botão “Gerar automação” chama `automationsApi.ai.interpretNaturalLanguage`.
   - Resultado exibido em cards + opção para copiar o JSON.

2. **API (Supabase Functions)**
   - `POST /make-server-67caf26a/automations/ai/interpret`
   - Corpo:
     ```json
     {
       "input": "texto livre",
       "module": "financeiro",
       "channel": "chat",
       "priority": "media",
       "language": "pt-BR"
     }
     ```
   - Resposta:
     ```json
     {
       "success": true,
       "data": {
         "definition": { ... },
         "provider": "openai",
         "model": "gpt-4o-mini",
         "rawText": "{json}"
       }
     }
     ```

3. **Service**
   - `services/ai-service.ts`: resolve config do tenant, descriptografa API key e chama o provedor correto.
   - Suporta OpenAI/Azure/HuggingFace/custom compatível com Chat Completions.

### Uso sugerido
1. Ativar provedor em `Configurações → Integrações → Provedor de IA`.
2. Acessar `/crm/automacoes-lab`.
3. Descrever o fluxo (ex.: “Quando o faturamento diário passar de 50 mil, enviar alerta no chat financeiro e WhatsApp”).
4. Revisar gatilho/ações retornadas e salvar (integração com motor ainda pendente).

### Próximos passos
- Persistir as automações sugeridas diretamente no motor (CRUD).
- Permitir edição manual do JSON e validação antes de salvar.
- Registrar logs de requisições e contabilizar tokens.
- Adicionar templates rápidos (“Alerta KPI”, “Resumo Diário”, “Follow-up automático”).








