**Registro de Aprendizados e Ajustes — 11/12/2025**

Abaixo registro de forma estruturada os aprendizados, erros encontrados, correções aplicadas, SQLs executados e próximos passos — para referência futura.

- **Conquistas (o que conseguimos)**
  - Desabilitação temporária de RLS para testes (executado pelo usuário). Isso removeu bloqueios de permissão e permitiu testes diretos no banco.
  - Normalização aplicada no repositório: mapeamento de `basicInfo` para `wizard_data.basicInfo` e fallback sintetizado quando a API retorna `{}` (mantém UI estável enquanto corrigimos retornos).
  - Script de teste com `SUPABASE_SERVICE_ROLE_KEY` criado e executado (validação que `wizard_data` é persistido via server-side).
  - Deduplicação de `completed_steps` aplicada com sucesso na linha `8efe9eeb-22e7-467b-8350-7586e8e54f58` (resultado: ["1","2"]).
  - Inserção de uma `organization` de teste realizada com sucesso (`22222222-2222-2222-2222-222222222222`) e atualização de `organization_id` da propriedade de teste.

- **Erros comuns encontrados (e por que ocorreram)**
  - `responseBody: {}` em PATCH originado por PostgREST/PostgREST policies + falta de header `Prefer: return=representation` ou por RLS; RLS costumava bloquear returning representation.
  - `function jsonb_array_elements_text(text[]) does not exist` — causada por uso de função jsonb em uma coluna do tipo `text[]`; solução: usar `unnest()` para arrays SQL.
  - `insert or update violates foreign key constraint` — tentativa de atribuir `organization_id`/`owner_id` para UUIDs que não existiam; solução: criar ou usar UUIDs existentes nas tabelas referenciadas.
  - `syntax error at or near 'curl'` — execução de comandos HTTP dentro do editor SQL (uso incorreto do ambiente). Comandos HTTP devem rodar no terminal/PowerShell.
  - `null value in column "slug" violates not-null constraint` — a tabela `organizations` tem colunas NOT NULL; inserções precisam prover esses campos.

- **Ajustes aplicados**
  - `PropertyRepository.update` modificado (no repositório) para normalizar payloads e tentar retornar a representação; logs adicionados para `data` e `error`.
  - SQLs utilitários criados: dedupe `completed_steps` (por linha e para toda tabela), `jsonb_set` para atualizar `wizard_data.basicInfo`, e scripts para criar org/profile de teste.
  - Arquivo de instruções Antigravity criado para capturar reproducible traces do navegador (console + network + storage).

- **SQLs executados (resumo e resultados)**
  - Deduplicação (linha única):
    - `UPDATE public.properties SET completed_steps = (SELECT array_agg(DISTINCT elem) FROM unnest(completed_steps) AS elem) WHERE id = '8efe9eeb-22e7-467b-8350-7586e8e54f58';` — Resultado: `completed_steps` = ["1","2"].
  - Atualização `wizard_data`: `jsonb_set` usado para inserir `basicInfo` — Resultado: `wizard_data->'basicInfo'` reflete novos valores (`internalName` e `registrationNumber`).
  - Inserção de `organization` de teste com colunas obrigatórias preenchidas (ex.: `name`, `slug`, `status`, `plan`, `email`, `settings_*`) usando `ON CONFLICT (slug) DO UPDATE` — Resultado: org criada/retornada id `22222222-...`.
  - Atualização `properties.organization_id` apontando para a org de teste — Resultado: propriedade atualizada com sucesso.

- **Observações sobre FK e `owner_id`**
  - Vimos `owner_id` = `00000000-...` (UUID zero). Isso deve ser corrigido: opções são usar um `profile.id` existente ou criar um `profile` de teste e atribuir.
  - Recomenda-se não deixar UUID zero em produção; afetará lógicas que dependem de propriedade/tenancy.

- **Próximos passos recomendados (prioridade)**
  1. Forçar o retorno de representação no update do repositório (encadear `.select(...)` no `.update(...)`) para o cliente receber a linha atualizada sem fallback.
  2. Corrigir `owner_id`: decidir entre (a) usar um `profile.id` existente ou (b) criar `profile` de teste e aplicar update; eu posso gerar/rodar SQL seguro para isto.
  3. Rodar dedup em massa se houver muitas linhas com duplicatas (criar migration idempotente com backup).
  4. Reativar RLS e aplicar políticas apropriadas (ex.: permitir writes quando `owner_id = auth.uid()` e permitir leitura de drafts para owners) — só após validações.
  5. Remover fallback sintetizado quando a API retornar consistentemente a representação.

- **Checklists/QA rápidos**
  - Verificar que POST/PATCH retorna a representação (usar `Prefer: return=representation` ou `.select(...)`).
  - Confirmar `wizard_data.basicInfo` está salvo e consistente após refresh.
  - Confirmar `owner_id` e `organization_id` apontam para rows existentes nas tabelas `profiles`/`organizations`.
  - Confirmar `completed_steps` está sem duplicatas e em ordem desejada (usar rotina de dedupe preservando a primeira ocorrência quando a ordem importa).

---

Se quiser, eu gero também automaticamente:
- um arquivo de migration SQL para dedupe global com backup; e/ou
- um patch no repositório para encadear `.select(...)` no update e adicionar logs.

Diga qual artefato quer em seguida (migration SQL / patch no repo / criar profile de teste e atualizar owners), que eu executo o passo seguinte.
