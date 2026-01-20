# 🌐 Módulo: Sites dos Clientes (Edição de Site)

Este documento descreve o módulo **Sites dos Clientes** (menu: **Edição de site**) e o backend associado (Supabase Edge Function `rendizy-server`).

## Objetivo

Permitir que uma organização (imobiliária) crie/gerencie um site de reservas/portfólio e publique (servir) esse site de forma **segura**, com **persistência real** (SQL + Storage), sem dependência de KV para dados críticos.

## Catálogo de Prompt (Source of Truth)

O sistema possui um **catálogo centralizado** que define todas as regras para geração de sites:

- **Arquivo**: `components/client-sites/catalog.ts`
- **Versão atual**: v6.7 (2026-01-17)
- **Função principal**: `generatePromptFromCatalog()` - gera prompt completo para IAs

### Anti-Patterns (v6.7+)

O catálogo inclui uma lista de **anti-patterns** para evitar erros comuns de IAs:

| ID | Severidade | Descrição |
|----|------------|-----------|
| AP-CAL-001 | CRITICAL | Calendário DEVE bloquear datas passadas |
| AP-CHK-001 | CRITICAL | Checkout DEVE abrir em nova aba |
| AP-STR-001 | CRITICAL | PROIBIDO usar @supabase/supabase-js |
| AP-STR-002 | CRITICAL | PROIBIDO usar VITE_* env vars |

Ver lista completa em: `ANTI_PATTERNS_CHECKLIST` no catalog.ts

### Funções de Validação

```typescript
import { validateAgainstAntiPatterns } from './catalog';

const { errors, warnings } = validateAgainstAntiPatterns(code);
// errors: array de problemas críticos
// warnings: array de problemas médios
```

## Frontend

- UI principal: `ClientSitesManager`.
- Cápsula do módulo (entrypoint): `ClientSitesModule`.
- Rota protegida: `/sites-clientes`.

### Cápsula (arquitetura)

O módulo foi encapsulado para seguir o padrão de “cápsulas”:

- Arquivo: `components/client-sites/ClientSitesModule.tsx`
- Responsabilidades:
  - layout do módulo (sidebar + container)
  - seleção do módulo ativo: `activeModule="motor-reservas"`
  - render do `ClientSitesManager`

## Backend (Edge Function)

### Base

- Função: `rendizy-server`
- Router: `routes-client-sites.ts`

### Autenticação (privado)

**Endpoints privados exigem sessão válida** e devem receber o token do usuário via:

- Header: `X-Auth-Token: <token de sessão>`

Observação importante:
- O header `Authorization: Bearer ...` normalmente é usado pelo Supabase Gateway para o **anon key** (ou service role em ambiente inadequado). Portanto, para autenticação de usuário no backend do Rendizy, o padrão é **`X-Auth-Token`**.

### Multi-tenant (organização)

- Todo endpoint privado valida que o usuário tem acesso à organização alvo.
- `superadmin` pode bypass (quando aplicável).

### Rotas públicas vs privadas

Padrão:
- **Públicas**: servir o site e assets necessários para o navegador carregar o site.
- **Privadas**: CRUD, uploads, importações, updates e operações administrativas.

### Upload de site (ZIP)

O módulo suporta envio de um ZIP (build `dist/`), com persistência em Storage.

- O upload é feito via `multipart/form-data`.
- No backend, leitura de body JSON deve ser evitada em helpers globais para não consumir o stream do multipart.

## Persistência

- Dados críticos: SQL (tabelas do projeto) + Supabase Storage para arquivos.
- Evitar KV store para dados críticos.

## Troubleshooting

### 401 / Invalid JWT / anon key

Se o frontend estiver usando `VITE_SUPABASE_ANON_KEY` placeholder ou inválido, o Gateway pode retornar 401.

- Ver: `docs/FIX_401_SUPABASE_ANON_KEY_2025-12-24.md`

## Checklist rápido de validação

- [ ] A rota `/sites-clientes` abre (ProtectedRoute)
- [ ] `ClientSitesManager` consegue listar/criar/editar sites com `X-Auth-Token`
- [ ] Upload ZIP funciona (multipart)
- [ ] Rotas privadas negam acesso sem token (401)
- [ ] Organização errada retorna 403 (exceto superadmin)

## Precificação e descontos por pacote (site do cliente)

- O site público consome weeklyRate/monthlyRate do endpoint público (rendizy-public).
- weeklyRate/monthlyRate são calculados usando discount_packages (global ou override) quando o anúncio não define valores explícitos.
- Próxima etapa: considerar base_price por dia (calendar_pricing_rules) para compor weekly/monthly por período.
