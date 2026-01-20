## Estrutura de Módulos do Rendizy (Financeiro, CRM/Tasks, BI, Automações)

**Objetivo:** padronizar como grandes módulos (Finanças, CRM/Tasks, BI, Automações) são organizados no frontend, garantindo:

- Carregamento sob demanda (lazy loading / code splitting).
- Layouts próprios (sidebar, header) por módulo, mas dentro do mesmo app.
- Isolamento de estado por módulo.
- Comunicação clara entre módulos e núcleo (calendário, reservas, etc.).

---

### 1. Conceito de Módulo

- **Módulo** = conjunto de telas de uma área grande do produto, com:
  - Rota raiz própria (ex.: `/financeiro`, `/crm`, `/bi`).
  - Sidebar própria (menu lateral independente do `MainSidebar`).
  - Layout de página separado (ocupando a tela inteira, com `Outlet` para sub-rotas).
  - Integração com o restante do sistema apenas via:
    - APIs REST (`/rendizy-server/...`).
    - Contextos globais (Auth, Tema, Idioma).
    - Navegação (React Router).

Exemplos atuais:

- `FinanceiroModule` → rota `/financeiro/*`.
- `CRMTasksModule` → rota `/crm/*`.
- `BIModule` → rota `/bi/*`.

---

### 2. Padrão de Estrutura em Pastas

Cada módulo deve seguir este padrão mínimo:

```text
RendizyPrincipal/
  components/
    financeiro/
      FinanceiroModule.tsx          ← Layout do módulo (sidebar própria + Outlet)
      FinanceiroSidebar.tsx         ← Menu lateral do módulo
      pages/
        PlanoContasPage.tsx
        ...
    crm/
      CRMTasksModule.tsx
      CRMTasksSidebar.tsx
      pages/
        ...
    bi/
      BIModule.tsx
      BISidebar.tsx
      pages/
        ...
    automations/
      AutomationsNaturalLanguageLab.tsx
      (futuro: AutomationsModule.tsx, sidebar, pages/)
```

**Regras:**

- **Layout raiz do módulo** (`*Module.tsx`) deve:
  - Renderizar apenas layout + sidebar do módulo.
  - Expor um `<Outlet />` para as sub-rotas.
- **Páginas internas** ficam sempre em `pages/` dentro da pasta do módulo.
- Componentes compartilhados entre módulos continuam em `components/` de nível superior.

---

### 3. Padrão de Rotas por Módulo

Todas as rotas de módulos grandes seguem o mesmo padrão em `App.tsx`:

```tsx
// Exemplo Financeiro (já implementado)
<Route path="/financeiro/*" element={
  <ProtectedRoute>
    <FinanceiroModule />
  </ProtectedRoute>
}>
  <Route index element={<FinanceiroDashboard />} />
  <Route path="plano-contas" element={<PlanoContasPage />} />
  <Route path="lancamentos" element={<LancamentosPage />} />
  {/* ...demais sub-rotas */}
</Route>
```

Exatamente o mesmo padrão é usado para:

- `/crm/*` → `CRMTasksModule` + sub-rotas.
- `/bi/*` → `BIModule` + sub-rotas.

**Importante:** a rota raiz (`/financeiro`, `/crm`, `/bi`) sempre aponta para o módulo (layout + sidebar), nunca diretamente para uma página.

---

### 4. Lazy Loading (Code Splitting por Módulo)

Para evitar carregar todos os módulos pesados no bundle inicial:

- Usar `React.lazy` + `Suspense` em `App.tsx` para módulos grandes:

```tsx
// Padrão recomendado (a ser aplicado gradualmente)
const FinanceiroModule = React.lazy(() => import('./components/financeiro/FinanceiroModule'));
const CRMTasksModule = React.lazy(() => import('./components/crm/CRMTasksModule'));
const BIModule = React.lazy(() => import('./components/bi/BIModule'));

// Dentro do JSX:
<Suspense fallback={<LoadingProgress isLoading={true} />}>
  <Routes>
    {/* ...rotas normais */}
    <Route path="/financeiro/*" element={
      <ProtectedRoute>
        <FinanceiroModule />
      </ProtectedRoute>
    }>
      {/* sub-rotas */}
    </Route>
    {/* demais módulos */}
  </Routes>
</Suspense>
```

**Regra:** novos módulos grandes (ex.: Automações completas, um futuro módulo “Tasks standalone”, etc.) **devem ser importados via `React.lazy`** para não aumentar o bundle inicial.

---

### 5. Comunicação entre Módulos e Núcleo

Os módulos conversam com o resto do Rendizy **apenas pelos pontos abaixo**:

- **Autenticação / Tenant / Usuário atual**
  - Via `AuthContext` e rotas protegidas (`ProtectedRoute`).
  - Nunca reimplementar login dentro de um módulo.

- **Dados de negócio** (reservas, properties, financeiro, etc.)
  - Sempre via funções de API em `RendizyPrincipal/utils/api.ts` ou arquivos específicos (`chatApi`, `whatsappChatApi`, etc.).
  - **Proibido** acessar Supabase direto no frontend por módulo (mantém o padrão atual).

- **Navegação**
  - Sempre usando React Router (`Navigate`, `useNavigate`) e rotas já descritas.
  - Módulos podem navegar entre si (ex.: Financeiro abrir um relatório em `/bi/financeiro`) usando URLs declaradas, sem dependência circular de componentes.

---

### 6. Financeiro como Modelo de Referência

O módulo financeiro já segue o padrão desejado:

- `FinanceiroModule`:
  - Usa `FinanceiroSidebar` próprio.
  - Renderiza sub-rotas com `<Outlet />`.
  - Ocupa a tela inteira (layout isolado).
- Rotas:
  - `/financeiro` → `FinanceiroDashboard`.
  - `/financeiro/plano-contas`, `/financeiro/lancamentos`, `/financeiro/configuracoes`, etc.
- Integração:
  - Usa apenas APIs HTTP via `utils/api.ts` com rotas `/rendizy-server/financeiro/...`.
  - Não mistura contexto de calendário, reservas ou outros módulos.

**Regra:** novos módulos (CRM/Tasks, BI, Automações) devem se espelhar nesse padrão de:

1. Layout próprio + sidebar.
2. Rotas aninhadas em `App.tsx`.
3. Integração por APIs e contextos globais (Auth/Tema/Idioma).

---

### 7. Módulos Futuros (Automations / IA)

Para o laboratório de automações e futuros módulos IA:

- Estrutura sugerida:

```text
components/
  automations/
    AutomationsModule.tsx       ← layout + sidebar (quando virar módulo completo)
    AutomationsSidebar.tsx
    pages/
      AutomationsLabPage.tsx    ← hoje: AutomationsNaturalLanguageLab
      AutomationListPage.tsx
      AutomationDetailPage.tsx
```

- Rotas sugeridas em `App.tsx` (quando for módulo completo):

```tsx
const AutomationsModule = React.lazy(() => import('./components/automations/AutomationsModule'));

<Route path="/automacoes/*" element={
  <ProtectedRoute>
    <AutomationsModule />
  </ProtectedRoute>
}>
  <Route index element={<AutomationsLabPage />} />
  {/* demais telas */}
</Route>
```

Por enquanto, o laboratório está em `/crm/automacoes-lab` para testes, mas a arquitetura acima define como ficará quando virar módulo “de primeira classe”.

---

### 8. Regras Rápidas para Não Virar Bagunça

1. **Sempre** criar um `*Module.tsx` para módulos grandes (layout + sidebar + `Outlet`).
2. **Sempre** colocar páginas internas em `components/<modulo>/pages/`.
3. **Sempre** registrar as rotas do módulo em `App.tsx` como `/<modulo>/*` + sub-rotas.
4. **Sempre** usar APIs centralizadas (`utils/api.ts`, etc.) para falar com o backend.
5. **Sempre** usar `React.lazy` + `Suspense` para novos módulos grandes.
6. **Nunca** duplicar lógica de auth/login dentro de módulos.
7. **Nunca** acessar Supabase direto do módulo; sempre via camada de API já existente.

---

### 9. Próximos Passos Recomendados

1. Aplicar `React.lazy` para `FinanceiroModule`, `CRMTasksModule` e `BIModule` em `App.tsx`.
2. Manter este documento atualizado sempre que um novo módulo grande for criado.
3. Quando o módulo de Automações “graduar” de laboratório para módulo principal, criar:
   - `AutomationsModule.tsx`, `AutomationsSidebar.tsx`, `pages/` internas.
   - Rotas dedicadas em `/automacoes/*`.

---

**Resumo:**  
Os módulos Financeiro, CRM/Tasks e BI já seguem o padrão “módulo isolado com sidebar própria”, plugados em rotas `/<modulo>/*`. O próximo passo é garantir lazy loading por módulo e usar este documento como referência para todos os novos módulos grandes, evitando crescimento desorganizado do front.


