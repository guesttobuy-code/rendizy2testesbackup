# 🌐 GUIA: URLs no Figma Make vs Produção

## ❓ SUA PERGUNTA

> "Nesse botão prévia, vc tem uma url interna sua? ou mesmo aqui na tela de prévia,  
> vc está usando a minha url já real www.suacasaavenda.com.br? nesse ambiente de testes, temos url?"

---

## ✅ RESPOSTA SIMPLES

### **No Figma Make (Preview):**
❌ **NÃO** é sua URL real (`www.suacasaavenda.com.br`)

✅ **SIM**, tem URLs internas temporárias:
```
Exemplo: https://figma-make-preview-abc123.web.app
         https://preview-xyz456.figma.com
```

### **Quando você fizer Deploy:**
✅ **SIM**, aí usa sua URL real:
```
https://suacasaavenda.com.br (configurada no Netlify/Vercel)
```

---

## 🔍 DETALHES TÉCNICOS

### 1. **Ambiente de Preview (Figma Make)**

**Como funciona:**
- O Figma Make **compila seu código** em tempo real
- **Gera URLs temporárias** para cada sessão
- **Renderiza em iframe** dentro do Figma
- **URLs mudam** a cada vez que você abre/fecha

**Exemplo de URLs internas:**
```
https://figma-make-preview-a1b2c3d4.web.app
https://project-xyz.figma.com/preview
https://preview-123456.figmake.app
```

**Características:**
- ✅ Apenas para desenvolvimento/teste
- ✅ Acessível apenas enquanto você está editando
- ❌ Não é indexada pelo Google
- ❌ Não é permanente
- ❌ Não é sua URL de produção

---

### 2. **Ambiente de Produção (Deploy)**

**Como funciona:**
- Você faz **deploy** do código para um serviço:
  - Netlify
  - Vercel
  - AWS Amplify
  - GitHub Pages
- Configura **domínio customizado**: `suacasaavenda.com.br`
- URL é **permanente** e **pública**

**Exemplo:**
```
URL inicial:     https://seu-projeto-abc123.netlify.app
Domínio custom:  https://suacasaavenda.com.br
```

**Características:**
- ✅ URL permanente
- ✅ Pública (acessível para todos)
- ✅ Indexada pelo Google
- ✅ SSL/HTTPS automático
- ✅ Pode ter domínio customizado

---

## 🐛 PROBLEMA: "NOT FOUND" NO PREVIEW

Vejo na imagem que está aparecendo **"Not Found"** no preview. Isso significa:

### **Causa:**
O componente `DashboardInicial` ou `EmergencyRecovery` está renderizando um erro.

### **Solução:**

Vou verificar se há erro no console do navegador:

```bash
1. Clique no botão "Prévia" (Preview)
2. Pressione F12 no navegador
3. Vá na aba Console
4. Copie TODOS os erros em vermelho
```

---

## 🔧 COMO TESTAR O SISTEMA

### **OPÇÃO 1: Preview no Figma Make (Recomendado para testes)**

```bash
1. Clique em "Prévia" no topo
2. Aguarde o carregamento
3. Teste as funcionalidades
4. Console aberto (F12) para ver erros
```

**Rotas disponíveis no Preview:**
```
/                    → Dashboard Inicial
/login               → Página de Login
/calendario          → Calendário
/properties          → Gestão de Imóveis
/properties/new      → Criar Novo Imóvel (Wizard)
/properties/:id/edit → Editar Imóvel
/reservas            → Gestão de Reservas
/chat                → Inbox WhatsApp
/financeiro          → Módulo Financeiro
/admin/reset-database → Reset do Banco (nova)
```

---

### **OPÇÃO 2: Deploy para Produção**

**Passo 1: Exportar código do Figma Make**
```bash
1. Clique em "Compartilhar" no topo
2. Escolha "Download Code"
3. Baixe o ZIP com todo o código
```

**Passo 2: Deploy no Netlify (Mais fácil)**
```bash
1. Acesse: https://netlify.com
2. Arraste a pasta do código
3. Aguarde build automático
4. Netlify gera URL: https://seu-projeto.netlify.app
```

**Passo 3: Configurar domínio customizado**
```bash
1. No Netlify: Settings → Domain Management
2. Adicionar domínio: suacasaavenda.com.br
3. Configurar DNS (CNAME ou A record)
4. Aguardar propagação (até 24h)
```

---

## 🎯 CORRIGINDO O "NOT FOUND"

### **Diagnóstico:**

A rota raiz `/` está configurada (linha 1540 do App.tsx), mas pode ter erro no componente.

### **Solução Rápida:**

1. **Verifique o Console:**
```bash
F12 → Console → Procure por erros em vermelho
```

2. **Teste rota específica:**
```bash
Mude a URL manualmente para:
/calendario
/properties
/login
```

3. **Se funcionar em outras rotas:**
O problema está no `DashboardInicial`. Vou criar um fix:

---

## 🔄 FIX: Dashboard Inicial

Vou criar uma versão segura do Dashboard que não quebra:

```typescript
// No App.tsx, linha 1540
<Route path="/" element={
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <MainSidebar
      activeModule="painel-inicial"
      onModuleChange={setActiveModule}
      collapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      onSearchReservation={handleSearchReservation}
      onAdvancedSearch={handleAdvancedSearch}
    />
    
    <div className={cn(
      "flex flex-col min-h-screen transition-all duration-300",
      sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
    )}>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">🏠 RENDIZY Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Sistema de Gestão de Imóveis de Temporada
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">📅 Calendário</h3>
            <p className="text-sm text-muted-foreground">
              Visualize todas as suas reservas
            </p>
            <a href="/calendario" className="text-blue-600 hover:underline mt-4 inline-block">
              Acessar →
            </a>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">🏠 Imóveis</h3>
            <p className="text-sm text-muted-foreground">
              Gerencie suas propriedades
            </p>
            <a href="/properties" className="text-blue-600 hover:underline mt-4 inline-block">
              Acessar →
            </a>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">📝 Nova Propriedade</h3>
            <p className="text-sm text-muted-foreground">
              Cadastre um novo imóvel
            </p>
            <a href="/properties/new" className="text-blue-600 hover:underline mt-4 inline-block">
              Cadastrar →
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
} />
```

---

## 📊 RESUMO

### **URLs no Figma Make:**
```
✅ Preview:  https://figma-preview-xxx.web.app (temporária)
❌ Produção: Não é suacasaavenda.com.br ainda
```

### **URLs em Produção:**
```
✅ Netlify:  https://seu-projeto.netlify.app
✅ Custom:   https://suacasaavenda.com.br (após configurar DNS)
```

### **Próximos Passos:**
1. ✅ Teste no Preview do Figma Make
2. ✅ Verifique console (F12) se houver erro
3. ✅ Quando estiver tudo OK, faça deploy
4. ✅ Configure domínio customizado
5. ✅ Sistema em produção! 🎉

---

## 🆘 SE PRECISAR DE AJUDA

**Envie:**
1. Screenshot do erro "Not Found"
2. Console completo (F12)
3. URL que você está tentando acessar

**Eu vou:**
1. Identificar o erro
2. Criar o fix específico
3. Testar e validar

---

**📅 Data:** 03/11/2025
**🔖 Versão:** v1.0.103.267
**🌐 Preview:** Figma Make (URLs temporárias)
**🚀 Produção:** Aguardando deploy
