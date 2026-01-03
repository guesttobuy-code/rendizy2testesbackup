## Resumo do Fluxo Auth + ProtectedRoute + Cápsulas (v1.0.103.400+)

**Objetivo:** documentar o fluxo completo de autenticação e proteção de rotas no Rendizy após a arquitetura de cápsulas de módulos, garantindo login estável mesmo com F5, navegação direta via URL e múltiplos módulos grandes.

---

### 1. Peças Envolvidas

- `AuthContext.tsx`
  - Fonte de verdade sobre **usuário logado**, **organização atual**, **permissões** e **estado de loading**.
  - Garante:
    - Token salvo apenas em `localStorage` (`rendizy-token`).
    - Validação SIEMPRE via backend SQL (`/rendizy-server/auth/me`).
    - Validação periódica + refresh automático.
    - Não limpar token em validações periódicas por erro de rede.

- `ProtectedRoute.tsx`
  - Camada de proteção em torno de **todas as rotas privadas**.
  - Lida com:
    - Rotas públicas (`/login`, `/signup`, `/reset-password`).
    - Timeout de validação do token (5s) antes de redirecionar.
    - Redirecionamento para `/onboarding` quando não há organização.

- **Cápsulas de módulos**
  - `AdminMasterModule`, `DashboardModule`, `CalendarModule`, `ReservationsModule`, `ChatModule`, `LocationsModule`, `PropertiesModule`, `GuestsModule`, `SettingsModule`, `FinanceiroModule`, `CRMTasksModule`, `BIModule`, etc.
  - Cada cápsula cuida apenas do layout + lógica da sua área, sendo sempre renderizada **dentro** de um `<ProtectedRoute>`.

---

### 2. Fluxo em Alto Nível

1. Usuário acessa uma rota (ex.: `/dashboard`, `/calendario`, `/properties`, etc.).
2. React Router entra na rota:
   - `<Route path="/dashboard" element={<ProtectedRoute><DashboardModule ... /></ProtectedRoute>} />`.
3. `ProtectedRoute` consulta `AuthContext`:
   - `isLoading`, `user`, `organization`, `isAuthenticated`.
   - Verifica se existe `rendizy-token` no `localStorage`.
4. **Se houver token e ainda estiver validando**:
   - Mostra tela de loading (“Verificando autenticação...”) até:
     - `AuthContext` finalizar a chamada para `/auth/me`, ou
     - exceder o timeout de 5s (`validationTimeout`).
5. **Se não houver token**:
   - E a rota não for pública → redireciona para `/login`.
6. **Se token inválido após timeout**:
   - `ProtectedRoute` limpa o token e redireciona para `/login`.
7. **Se usuário autenticado mas sem organização**:
   - `ProtectedRoute` redireciona para `/onboarding` (exceto se a rota for `/onboarding`).
8. **Se tudo ok**:
   - `ProtectedRoute` apenas renderiza o `children` (ex.: `DashboardModule`).

Graças às cápsulas, o que acontece *dentro* do módulo (Dashboard, Calendário, etc.) não interfere no comportamento de login/refresh: a proteção acontece **antes** e é a mesma para todos.

---

### 3. Por que o login ficou estável com F5

Antes da arquitetura de cápsulas:

- `App.tsx` misturava:
  - Lógica global (estado de calendário, reservas, properties, etc.).
  - JSX de layout das páginas (Dashboard, Calendário, Reservas, Chat...).
  - Integração direta com `ProtectedRoute` em rotas muito grandes.
- Em algumas situações, o React podia:
  - Montar parcialmente trechos de UI enquanto a validação de sessão ainda estava em andamento.
  - Gerar corridas de estado (`race conditions`) entre `AuthContext` atualizando `user` e `ProtectedRoute` decidindo redirecionar.

Após as cápsulas:

- `App.tsx` ficou responsável principalmente por:
  - Definir rotas.
  - Injetar estados/handlers como **props** para os módulos.
  - Envolver cada rota sensível em **um único `<ProtectedRoute>` claro**.
- Cada módulo (`DashboardModule`, `CalendarModule`, etc.):
  - É montado **apenas depois** que `ProtectedRoute` decide que a sessão é válida.
  - Não mexe diretamente em `AuthContext` / login.

Resultado prático:

- Ao dar F5 em `/dashboard` ou `/calendario`:
  - `AuthContext` valida o token via `/auth/me`.
  - `ProtectedRoute` aguarda essa validação (até 5s).
  - Só depois disso a cápsula é montada.
  - Isso evita o antigo sintoma de “parece que deslogou ao dar refresh”.

---

### 4. Regras ao Criar Novas Rotas Protegidas

1. **Sempre** envolver a rota em `<ProtectedRoute>`:
   ```tsx
   <Route path="/meu-modulo" element={
     <ProtectedRoute>
       <MeuModuloModule />
     </ProtectedRoute>
   } />
   ```
2. **Nunca** acessar `AuthContext` diretamente nas cápsulas para decidir login/logout (usar só para coisas de UI se necessário).
3. **Sempre** usar `AuthContext` para:
   - Login/logout (`login`, `logout`),
   - Troca de organização (`switchOrganization`),
   - Checks de permissão (`hasPermission`, `canRead`, etc.).
4. **Nunca** usar `localStorage` fora de `AuthContext` para validar sessão (apenas para ler/escrever token em casos muito específicos e bem documentados).

---

### 5. Testes Recomendados com a Arquitetura Atual

- **F5 em rotas principais:**
  - `/dashboard`, `/calendario`, `/reservations`, `/chat`, `/properties`, `/financeiro`, etc.
  - Resultado esperado: usuário continua logado, cápsula recarrega normalmente.
- **Navegação direta por URL:**
  - Colar diretamente uma URL protegida na barra (`/properties/:id/edit`, `/financeiro/configuracoes`).
  - Resultado: `ProtectedRoute` aguarda a validação, depois libera a cápsula.
- **Sessão expirada (token inválido):**
  - Forçar token curto ou inválido.
  - Resultado: após timeout de validação, token é limpo e usuário é enviado para `/login`.

---

### 6. Documentos Relacionados

- `RESUMO_IMPLEMENTACAO_PROTECTED_ROUTE.md` – detalhes da implementação inicial do `ProtectedRoute`.
- `LOGIN_VITORIAS_CONSOLIDADO.md` – resumo das vitórias do fluxo de login/persistência.
- `ESTRUTURA_MODULOS_RENDIZY.md` – padrão para grandes módulos (Financeiro, CRM, BI, Automações).
- `ARQUITETURA_CAPSULAS_MODULOS.md` – regra de cápsulas por botão lateral.


