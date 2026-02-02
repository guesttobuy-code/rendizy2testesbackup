# Prompt de continuidade (novo chat) — StaysNet → Rendizy — Campos personalizados (Anúncios Ultimate)

> **Idioma**: PT-BR (responder sempre em português)
>
> **Data de referência**: 31/12/2025
>
> **Objetivo deste prompt**: permitir que você (Copilot) retome o trabalho **exatamente do estado atual** sem precisar reler toda a conversa anterior.

---

## 0) TL;DR do que foi feito (vitórias)

1. **URL canônica única** para Anúncios Ultimate definida e documentada.
   - Frontend e scripts devem chamar **somente**: `/functions/v1/rendizy-server/properties/*`.
   - Corrigido o 404 de settings (causa raiz: mount/`pathname` prefixado no runtime do Supabase).

2. **Endpoints de settings** funcionando (200) e com estrutura default estável.
   - `GET /settings/locations-listings`
   - `POST /settings/locations-listings`

3. **UI ajustada** para ler/gravar settings reais e suportar campos personalizados.
   - IDs robustos (sem duplicidade) + geração segura.
   - Form do anúncio (Step 07) renderiza e salva campos custom multilíngues (PT/EN/ES).

4. **E2E real comprovado**: seed → import → persistência no anúncio.
   - Settings seedados com `customDescriptionFieldsCount=2`.
   - Import via service role executado.
   - Persistência confirmada em `properties.data.custom_description_fields_values` e `custom_description_fields_meta`.

5. **Correção crítica no import** para não depender das “definições” do StaysNet.
   - Quando StaysNet não expõe endpoints de definições/labels, o import agora usa fallback `Stays customField {id}` e ainda assim casa com settings.

---

## 1) Regras/padrões (imutáveis)

### 1.1 URL canônica (externa)

- **CANÔNICA (única)**: `/functions/v1/rendizy-server/properties/*`

### 1.2 Mount interno (runtime Supabase + Hono)

- Internamente, o Supabase pode entregar ao Hono um `pathname` prefixado com o nome da Edge Function.
- Portanto, o app de Anúncios Ultimate deve estar montado em:
  - `/rendizy-server/properties/*`

### 1.3 Proibições

- **Proibido** duplicar prefixos do tipo:
  - `/functions/v1/rendizy-server/rendizy-server/...`

---

## 2) Arquitetura do que está em jogo

### 2.1 Frontend

- React + Vite.
- Duas áreas principais alteradas:
  - Configurações de “Locais e Anúncios” (settings do módulo)
  - Formulário do anúncio “Anúncios Ultimate” (wizard) com Step 07 para descrição.

### 2.2 Backend

- Supabase Edge Functions (Deno) usando Hono.
- Entry: `Rendizyoficial-main/supabase/functions/rendizy-server/index.ts`.
- Rotas do módulo Anúncios Ultimate em `Rendizyoficial-main/supabase/functions/rendizy-server/routes-anuncios.ts`.

### 2.3 Persistência (Supabase Postgres)

- **Settings** armazenados como um registro especial dentro de `properties.data`:
  - `__kind = 'settings'`
  - `__settings_key = 'locations_listings'`

- **Valores por anúncio**:
  - `properties.data.custom_description_fields_values`
    - Mapa: `fieldId(UUID) -> { pt: string, en: string, es: string }`
  - `properties.data.custom_description_fields_meta`
    - Metadados do valor (ex.: origem StaysNet, stays_custom_field_id, stays_label).

---

## 3) Principais arquivos mexidos (inventário de mudanças)

> Use isso como “mapa” para localizar rapidamente o que foi feito.

### 3.1 Backend — mount/roteamento

- `Rendizyoficial-main/supabase/functions/rendizy-server/index.ts`
  - Mount definitivo:
    - `app.route("/rendizy-server/properties", anunciosApp);`
  - Comentário explicando:
    - URL canônica externa
    - Por que o mount interno precisa do prefixo `/rendizy-server`.

### 3.2 Backend — endpoints de settings + lista

- `Rendizyoficial-main/supabase/functions/rendizy-server/routes-anuncios.ts`
  - Endpoints relevantes:
    - `GET /properties/lista` (exclui registros de settings)
    - `GET /properties/settings/locations-listings`
    - `POST /properties/settings/locations-listings`
  - Default de settings inclui:
    - `customDescriptionFields: []`

### 3.3 Frontend — settings (Locais e Anúncios)

- `Rendizyoficial-main/components/LocationsListingsSettings.tsx`
  - Agora faz `GET` e `POST` no endpoint canônico.
  - Geração robusta de IDs de `customDescriptionFields` usando `crypto.randomUUID()` com fallback.

### 3.4 Frontend — wizard do anúncio (Step 07)

- `Rendizyoficial-main/components/anuncio-ultimate/FormularioAnuncio.tsx`
  - Correção UI:
    - removeu duplicidade de `id` em cards de cômodos
    - trocou scroll para refs (`useRef`) ao invés de `document.getElementById`
  - Integração “Campos personalizados”:
    - lê `customDescriptionFields` das settings
    - renderiza inputs multilíngues (pt/en/es)
    - salva em `custom_description_fields_values` junto com os 7 campos multilíngues padrão.

### 3.5 Import — StaysNet properties → Anúncios Ultimate

- `Rendizyoficial-main/supabase/functions/rendizy-server/import-staysnet-properties.ts`
  - Lógica adicionada:
    - carrega settings `customDescriptionFields`
    - tenta buscar definições de custom fields do StaysNet via múltiplos endpoints (best-effort)
    - mapeia `customFields` do listing para `custom_description_fields_values` + `custom_description_fields_meta`
  - **Correção crítica final**:
    - se não conseguir resolver `label` do StaysNet:
      - usa fallback: `Stays customField ${staysFieldId}`
      - e tenta casar com settings seedados nesse padrão.

### 3.6 Documentação

- `Rendizyoficial-main/RULES.md`
  - Documenta a URL canônica e a regra de mount interno.
  - Registra “proibido duplicar prefixos”.

---

## 4) Scripts temporários (PS1) relevantes e o que cada um prova

> **Importante**: não vazar chaves/tokens no chat; use `.env.local` local e variáveis.

- `_tmp_seed_custom_description_fields_from_stays.ps1`
  - Faz seed das settings `customDescriptionFields` via endpoint canônico.
  - Teve correção por erro `22P02 invalid input syntax for type uuid` (parsing de array no CLI).
  - Versão final: hardcode de `StaysCustomFieldIds` como strings (ex.: `1177706048195`, `1544539867206`).

- `_tmp_import_single_property_servicekey.ps1`
  - Importa UM listing do StaysNet usando **service role** (não depende de token de usuário).
  - Foi criado porque script via token retornou `401 Unauthorized` (token expirado).

- `_tmp_probe_custom_fields_anuncio.ps1`
  - Prova final do E2E: verifica se o anúncio tem `custom_description_fields_values` e `custom_description_fields_meta`.
  - Exemplo de execução (foi rodado com sucesso):
    - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\_tmp_probe_custom_fields_anuncio.ps1 -AnuncioId '3b3cf365-bb91-4298-9dea-7765da4ce0bb'`

- `_tmp_debug_resolve_anuncio_by_stays_listing_param.ps1`
  - Ajuda a resolver/confirmar qual `anuncio_id` corresponde a um listing StaysNet via `externalIds`/raw.

---

## 5) Evidências e resultados (o que ficou comprovado)

### 5.1 Settings seedados (customDescriptionFields)

- Seed executado com sucesso.
- Resultado observado: `customDescriptionFieldsCount=2`.

### 5.2 Import via service role (sucesso)

- Import do listing alvo executado.
- Stats observadas (resumo): `success:true`, `errors=0`, com registros atualizados.

### 5.3 Antes/depois do bug de customFields

- **Antes da correção**:
  - Probe retornava:
    - `has_custom_values: false`
    - `custom_values: null`
    - `custom_meta: null`
  - Diagnóstico:
    - import dependia de “labels/definições” do StaysNet; como endpoints falharam, o mapping era pulado.

- **Depois da correção + deploy + reimport**:
  - Probe retornou:
    - `has_custom_values: true`
    - `custom_values` com **2 chaves** (UUIDs dos fields seedados) com `pt/en/es`
    - `custom_meta` com `stays_custom_field_id` e `stays_label` no formato fallback.

---

## 6) Estado atual (o que está pronto)

- Backend:
  - rotas canônicas de Anúncios Ultimate funcionam
  - settings de Locais e Anúncios funcionam sem 404
  - import de propriedades consegue preencher custom fields mesmo sem definições do StaysNet

- Frontend:
  - settings UI lê/grava no backend
  - Formulário do anúncio tem suporte a campos custom multilíngues

- DB:
  - anúncio alvo tem valores persistidos

---

## 7) Pendências (opcionais) e próximos passos sugeridos

### 7.1 (Opcional) Labels amigáveis (human-friendly)

- Hoje o fallback usa:
  - `Stays customField {id}`
- Se quiser labels reais:
  1) descobrir endpoints corretos do StaysNet para definições, OU
  2) mapear manualmente (dicionário) e seedar settings com labels finais.

### 7.2 Validação visual no UI

- Abrir o anúncio (o que tem `AnuncioId = 3b3cf365-bb91-4298-9dea-7765da4ce0bb`).
- Ir no Step 07.
- Conferir:
  - campos custom aparecem
  - valores batem com os do StaysNet
  - salvar persiste alterações

---

## 8) Checklist operacional para você (Copilot) no novo chat

1. Confirmar a regra da URL canônica e evitar qualquer caminho duplicado.
2. Se houver novo 404, verificar primeiro o mount em `index.ts`.
3. Para reproduzir E2E do zero:
   - Rodar seed (settings)
   - Rodar import (service role)
   - Rodar probe (confirmar valores)
4. Não vazar segredos (service role key, tokens, etc.) nas respostas.

---

## 9) Contexto de execução (workspace)

- Workspace root (Windows):
  - `C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025`
- Projeto principal: dentro de `Rendizyoficial-main\...`

---

## 10) Pedido explícito do usuário (para guiar comportamento)

- “faça tudo” e pode quebrar compat (não há clientes ainda)
- padronizar e documentar “uma URL só”
- foco em E2E real e evidência (seed → import → persistência → UI)

---

## 11) O que NÃO fazer

- Não adicionar páginas extras, modais, filtros ou features “nice to have”.
- Não inventar design novo; manter tokens/componentes existentes.
- Não mudar regras de URL; apenas reforçar o padrão canônico.
- Não expor chaves/tokens em logs/respostas.

---

## 12) Perguntas rápidas (se e somente se necessário)

Se precisar destravar “labels reais”:
- O StaysNet fornece algum endpoint/documentação de definições de custom fields (IDs → labels)?
- Se não, você quer manter o fallback `Stays customField {id}` ou prefere um mapeamento manual por ID?
