## Arquitetura de “Cápsulas de Módulos” do Rendizy

**Objetivo:** garantir que cada item principal do menu lateral seja encapsulado em um módulo próprio (cápsula), para que mudanças em uma área não quebrem outras.

---

### 1. Conceito de Cápsula

- **Cápsula de módulo** = componente raiz responsável por:
  - Layout completo daquela área (sidebar principal + conteúdo).
  - Roteamento interno (quando houver subpáginas).
  - Busca e carregamento de dados específicos do módulo.
  - Integração com contexts globais (Auth, Tema, Idioma) apenas por interfaces claras.
- Cada botão principal do menu lateral deve apontar para **uma cápsula**.

Exemplos existentes:

- `FinanceiroModule` → cápsula do botão **Finanças** (`/financeiro/*`).
- `CRMTasksModule` → cápsula do módulo **CRM & Tasks** (`/crm/*`).
- `BIModule` → cápsula do módulo **BI & Relatórios** (`/bi/*`).

---

### 2. Padrão de Cápsula para Botões do Menu Lateral

Para cada item principal do menu lateral (seção **Principal**, **Operacional**, **Avançado**, **Módulos Avançados**), deve existir:

1. **Um componente de cápsula** em `components/<area>/<NomeModulo>.tsx`, por exemplo:
   - `components/admin/AdminMasterModule.tsx` (Admin Master)
   - `components/dashboard/DashboardModule.tsx` (Dashboard inicial)
   - `components/calendar/CalendarModule.tsx` (Calendário)
   - `components/properties/PropertiesModule.tsx` (Locais & Anúncios)
   - `components/guests/GuestsModule.tsx` (Hóspedes)
   - `components/settings/SettingsModule.tsx` (Configurações)

2. **Uma rota raiz em `App.tsx`** que aponta para a cápsula:

```tsx
<Route path="/calendario" element={
  <ProtectedRoute>
    <CalendarModule />
  </ProtectedRoute>
} />
```

3. **O botão do menu lateral (`MainSidebar.tsx`)** chama sempre a rota da cápsula (`/calendario`, `/properties`, `/guests`, etc.), nunca componentes internos.

---

### 3. Estrutura Interna de uma Cápsula

Cada cápsula deve seguir este padrão básico:

```tsx
// Exemplo: CalendarModule.tsx
export function CalendarModule() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <MainSidebar
        activeModule="calendario"
        onModuleChange={...}
        collapsed={...}
        onToggleCollapse={...}
        onSearchReservation={...}
        onAdvancedSearch={...}
      />

      <div className={cn(
        "flex flex-col min-h-screen transition-all duration-300",
        collapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        {/* Conteúdo específico do módulo (CalendarHeader, CalendarGrid, etc.) */}
      </div>
    </div>
  );
}
```

**Regras:**

- O componente de cápsula:
  - Importa apenas os componentes necessários para aquela área.
  - Não depende de detalhes de outros módulos (ex.: Financeiro não importa componentes de Chat).
- O `App.tsx` deve conhecer apenas:
  - As rotas.
  - As cápsulas de alto nível (não os detalhes internos).

---

### 4. Situação Atual vs. Meta

**Já encapsulados (seguindo padrão de cápsula):**

- `FinanceiroModule` (`/financeiro/*`)
- `CRMTasksModule` (`/crm/*`)
- `BIModule` (`/bi/*`)

**A serem migrados para cápsulas dedicadas:**

- Admin Master (`/admin`)
- Dashboard Inicial (`/dashboard`)
- Calendário (`/calendario`)
- Central de Reservas (`/reservations`)
- Chat / Mensagens (`/chat`)
- Locais & Anúncios (`/properties` / `/locations`)
- Hóspedes (`/guests`)
- Configurações (`/settings`)
- Loja de apps (`/app-center` quando virar módulo completo)

Enquanto a migração não estiver 100% concluída, `App.tsx` ainda contém o layout de algumas rotas diretamente; essas devem ser gradualmente extraídas para cápsulas específicas.

---

### 5. Regras para Novos Botões Laterais

Sempre que for criado um **novo botão** no menu lateral (em `MainSidebar.tsx`):

1. **Criar uma cápsula nova** em `components/<area>/<NomeModulo>Module.tsx` seguindo o padrão:

```tsx
export default function <NomeModulo>Module() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <MainSidebar ... />
      <div className={cn("flex flex-col min-h-screen transition-all duration-300", ... )}>
        {/* Conteúdo do módulo */}
      </div>
    </div>
  );
}
```

2. **Adicionar rota raiz em `App.tsx`** apontando para a cápsula.
3. **Atualizar `getModuleName` e `getModuleDescription`** em `App.tsx` com o novo `moduleId`.
4. **Nunca colocar JSX grande diretamente na rota de `App.tsx`**; sempre extrair para a cápsula.

---

### 6. Vantagens da Arquitetura de Cápsulas

- **Isolamento:** alterações em um módulo (ex.: calendário) não exigem mexer em `App.tsx` nem em outros módulos.
- **Previsibilidade:** cada botão do menu lateral tem um “entry point” único e claro.
- **Lazy loading por módulo:** fica mais fácil aplicar `React.lazy` em cápsulas (como já feito em Financeiro/CRM/BI).
- **Organização:** código de cada área fica em sua própria pasta, com menos risco de “sujar” outros fluxos.

---

### 7. Roadmap de Migração

1. **Curto prazo**
   - Manter cápsulas já existentes (Financeiro, CRM, BI) como padrão de referência.
   - Criar cápsulas novas para:
     - Dashboard (`DashboardModule`)
     - Calendário (`CalendarModule`)
     - Admin Master (`AdminMasterModule`)
2. **Médio prazo**
   - Migrar gradualmente as demais rotas grandes de `App.tsx` para módulos-cápsula.
3. **Longo prazo**
   - Considerar separar alguns domínios em Edge Functions independentes (ex.: financeiro vs. core), mantendo a mesma filosofia de cápsulas no frontend.

---

**Regra de Ouro:**  
> **Todo botão principal do menu lateral deve apontar para uma única cápsula de módulo.  
> `App.tsx` conhece apenas as cápsulas, nunca os detalhes internos de layout de cada área.**  


