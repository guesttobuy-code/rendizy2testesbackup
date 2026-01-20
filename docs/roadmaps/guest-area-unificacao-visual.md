# Roadmap — Unificação visual do Guest Area com o Rendizy (sem inventar design)

Objetivo: fazer o `/guest-area/` “parecer Rendizy” (mesmo layout, componentes e padrões), apenas whitelabelizando cores/logos/textos quando necessário — sem criar um design paralelo.

## Princípios

- **Mesma estrutura de layout**: shell com menu lateral + header + conteúdo.
- **Mesmos componentes**: filtros, cards/listas, botões, inputs, badges, skeletons.
- **Mesma hierarquia visual**: tipografia, espaçamentos, estados (hover/disabled/loading), mensagens.
- **Whitelabel só no que importa**: tokens de cor, logo, nome do hotel, e textos.
- **Sem duplicar CSS**: preferir extrair/reusar (ou espelhar) a base de estilos do Rendizy.

## Fase 0 — Auditoria (1–2 horas)

1. **Inventário do guest-area**
   - Rotas/páginas: Login, Minhas Reservas, Detalhe da Reserva, etc.
   - Componentes usados e padrões atuais (cards, listas, botões, inputs).
2. **Inventário do Rendizy (área interna)**
   - Identificar layout shell e componentes equivalentes.
   - Mapear quais classes/tokens Tailwind e quais componentes React são base.
3. **Gap list**
   - O que existe no Rendizy e falta no guest-area (sidebar, filtros avançados, listagem rica, etc.).

Entregável: checklist “o que copiar/reusar” + lista de componentes alvo.

## Fase 1 — Base de design (tokens) (meio dia)

- Definir tokens mínimos (em Tailwind):
  - `brand`, `brand-foreground`, `surface`, `surface-2`, `border`, `text`, `muted`, `success/warn/danger`.
- Whitelabel via runtime config (já existe `RENDIZY_CONFIG`) ou `data-theme`:
  - Cores por cliente (`medhome`, etc.) sem rebuild.
- Garantir que tipografia/spacing do guest-area bate com o Rendizy.

Entregável: `tailwind.config`/CSS base ajustado + tokens documentados.

## Fase 2 — Layout shell (1 dia)

- Implementar no guest-area um `AppShell` alinhado ao Rendizy:
  - Sidebar (menu lateral) com itens mínimos (Reservas, Perfil, Sair)
  - Header/topbar com título, breadcrumb simples, CTA contextual
  - Conteúdo com container e grid igual ao Rendizy

Entregável: todas as páginas renderizam dentro do shell.

## Fase 3 — Listagem de Reservas “padrão Rendizy” (1–2 dias)

- Substituir layout atual por um padrão equivalente ao Rendizy:
  - Barra de filtros (status, período, busca)
  - Cards/tabela com colunas e badges
  - Estados: loading skeleton, vazio, erro
  - Paginação (se o endpoint suportar) ou infinite scroll (se for padrão no Rendizy)

Entregável: Minhas Reservas com UX idêntica ao Rendizy.

## Fase 4 — Detalhe da Reserva (1 dia)

- Página de detalhe com a mesma hierarquia do Rendizy:
  - Resumo (status, datas, hóspedes, total)
  - Ações (ex: pagar, falar no WhatsApp, cancelar) seguindo o padrão
  - Seções colapsáveis conforme padrão do app principal

Entregável: Detalhe consistente com o painel.

## Fase 5 — Qualidade (meio dia)

- Responsivo (mobile/tablet)
- A11y mínima (foco, labels, contraste)
- Performance: evitar re-renders, lazy-load de rotas, skeletons
- Consistência de copy (ex: “Pré-reserva registrada” vs “Confirmada”)

## Estratégia de reuso (recomendação)

- **Opção A (ideal)**: extrair componentes/estilos do Rendizy para uma pasta compartilhada (ex: `components/ui/*`) e importar no guest-area.
- **Opção B (rápida)**: espelhar componentes essenciais no guest-area (copiar 1:1) e depois refatorar para compartilhado.

## Referências reais do Rendizy (para não inventar)

- **Padrões de tela “details” (sheet lateral / hierarquia / ações)**
  - Ver docs: `docs/DIARIO_RENDIZY.md` (padrão de Details Sidebar / sheet lateral)
- **Módulo Reservas (padrões de filtros, cards/listas, estados)**
  - Código: `components/ReservationsManagement.tsx`
- **Shell com sidebar/header (layout padrão do app)**
  - Referência de layout em docs: `docs/CHAT_TELAS_1.0_REFERENCIA.md` (estrutura header + sidebar + conteúdo)

Regra: qualquer mudança visual no guest-area deve apontar qual tela/padrão do Rendizy ela está espelhando.

## Checklist de aceite (definição de pronto)

- O usuário leigo não percebe que são apps diferentes.
- Sidebar/topbar/filtros seguem o mesmo padrão do Rendizy.
- Componentes (buttons/inputs/badges) têm o mesmo “toque”.
- Whitelabel funciona só por configuração (sem rebuild).
