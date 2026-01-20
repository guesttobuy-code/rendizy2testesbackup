# ⭐ URL CONVENCIONADA - Troubleshooting

## 🎯 OBJETIVO

Estabelecer uma **URL fixa e confiável** que sempre funciona no ambiente de preview do Figma Make, para facilitar troubleshooting quando o sistema travar.

---

## ✅ URL CONVENCIONADA

### **Dashboard Inicial (sempre funciona):**

```
/dashboard
```

**Características:**
- ✅ **SEMPRE funciona** - usa componente simplificado
- ✅ **Não quebra** - sem dependências complexas
- ✅ **Ponto de partida confiável** para troubleshooting
- ✅ **URL fixa** - convenção estabelecida

---

## 📍 TODAS AS URLs CONVENCIONADAS

### **URLs Primárias (Sempre Funcionam)**

```bash
/dashboard              # Dashboard Inicial (CONVENÇÃO PRINCIPAL)
/login                  # Sistema de Login
/calendario             # Calendário de Reservas
/properties             # Gestão de Imóveis
/properties/new         # Criar Novo Imóvel (Wizard)
```

### **URLs Secundárias (Módulos Específicos)**

```bash
/reservas               # Gestão de Reservas
/chat                   # Inbox WhatsApp
/financeiro             # Módulo Financeiro
/crm                    # CRM e Tarefas
/bi                     # Business Intelligence
/clientes               # Clientes e Hóspedes
/proprietarios          # Proprietários
/integracao/bookingcom  # Integração Booking.com
/integracao/staysnet    # Integração Stays.net
/admin                  # Painel SuperAdmin
/settings               # Configurações Globais
```

### **URLs de Desenvolvimento**

```bash
/admin/reset-database   # Reset do Banco de Dados
/icons                  # Preview de Ícones
/dev/fonts              # Teste de Fontes
```

---

## 🚨 QUANDO USAR

### **Cenário 1: Preview não carrega**

```bash
1. Clique em "Prévia" no Figma Make
2. Adicione /dashboard no final da URL
3. Pressione Enter
4. ✅ Dashboard sempre carrega!
```

**Exemplo:**
```
DE:   https://preview-abc123.figma.com/
PARA: https://preview-abc123.figma.com/dashboard
```

---

### **Cenário 2: Tela em branco / Not Found**

```bash
1. Abra F12 → Console
2. Copie os erros
3. Mude URL para: /dashboard
4. Envie: "Erro em [URL original], console: [erros]"
```

---

### **Cenário 3: Comunicação com assistente**

**ANTES (confuso):**
```
"Não está funcionando, dá erro na tela inicial"
```

**AGORA (convencionado):**
```
"Preview URL: https://preview-xyz.figma.com/dashboard
Status: ✅ Funciona
Erro em: / (rota raiz)
Console: [cola erros]"
```

---

## 📋 PROTOCOLO DE TROUBLESHOOTING

### **Passo 1: Testar URL Convencionada**

```bash
1. Abra preview do Figma Make
2. Mude URL para: /dashboard
3. Verifique se carrega
```

**Se carregar:**
- ✅ Sistema OK
- ❌ Problema específico na rota original
- 📧 Envie: "Dashboard funciona, erro em [outra rota]"

**Se NÃO carregar:**
- ❌ Problema crítico
- 📧 Envie: "Dashboard não carrega, console: [erros]"

---

### **Passo 2: Testar outras rotas**

```bash
/dashboard     → ✅ Funciona
/calendario    → ✅ ou ❌?
/properties    → ✅ ou ❌?
/             → ✅ ou ❌?
```

**Reporte:**
```
✅ Funcionando:
- /dashboard
- /calendario
- /properties

❌ Com erro:
- / (rota raiz)
  Console: [erros específicos]
```

---

### **Passo 3: Console e Screenshots**

```bash
1. F12 → Console
2. Copie TODOS os erros (Ctrl+A → Ctrl+C)
3. Screenshot da tela
4. Envie com URL específica
```

**Template de reporte:**
```markdown
## Bug Report

**URL Testada:** /dashboard
**Status:** ❌ Erro

**Console Errors:**
```
[Cole aqui os erros do F12 Console]
```

**Screenshot:**
[Cole imagem]

**URL do Preview:**
https://preview-xyz123.figma.com/dashboard
```

---

## 🎯 VANTAGENS DA CONVENÇÃO

### **Para Você (Usuário):**
- ✅ Sempre tem uma URL que funciona
- ✅ Ponto de partida confiável
- ✅ Comunicação mais clara com assistente
- ✅ Troubleshooting mais rápido

### **Para Mim (Assistente):**
- ✅ Entendo exatamente onde está o erro
- ✅ Posso reproduzir o problema
- ✅ Fix mais preciso
- ✅ Menos idas e vindas

---

## 🔧 MANUTENÇÃO DA CONVENÇÃO

### **URLs que NUNCA devem mudar:**

```bash
/dashboard      # Principal (NUNCA MUDE)
/login          # Autenticação
/calendario     # Módulo principal
/properties     # Módulo principal
```

### **URLs que podem evoluir:**

```bash
/admin/*        # Rotas admin podem mudar
/dev/*          # Rotas desenvolvimento podem mudar
/test/*         # Rotas teste podem ser removidas
```

---

## 📊 DIFERENÇAS: / vs /dashboard

| Característica | `/` (Raiz) | `/dashboard` (Convenção) |
|----------------|------------|--------------------------|
| **Estabilidade** | Pode ter bugs | Sempre funciona |
| **Componente** | DashboardInicial (complexo) | DashboardInicialSimple (seguro) |
| **Dependências** | Muitas | Mínimas |
| **Uso** | URL padrão do sistema | URL de troubleshooting |
| **Prioridade** | Produção | Desenvolvimento |

---

## 🚀 COMO FUNCIONA TECNICAMENTE

### **Rota /dashboard (Convencionada)**

```typescript
<Route path="/dashboard" element={
  <div className="min-h-screen">
    <MainSidebar activeModule="painel-inicial" ... />
    <DashboardInicialSimple
      conflicts={conflicts}
      reservations={reservations}
      properties={properties}
    />
  </div>
} />
```

**Características técnicas:**
- ✅ Componente simplificado (DashboardInicialSimple)
- ✅ Sem API calls complexas
- ✅ Sem estados compartilhados problemáticos
- ✅ Renderiza sempre, mesmo com dados vazios
- ✅ Sem dependências de outros módulos

### **Rota / (Raiz Normal)**

```typescript
<Route path="/" element={
  <div className="min-h-screen">
    <MainSidebar activeModule={activeModule} ... />
    <DashboardInicial
      conflicts={conflicts}
      reservations={reservations}
      properties={properties}
    />
  </div>
} />
```

**Características técnicas:**
- ⚠️ Componente completo (DashboardInicial)
- ⚠️ API calls para estatísticas
- ⚠️ Estados complexos
- ⚠️ Pode quebrar se backend falhar
- ⚠️ Dependências de múltiplos módulos

---

## 📱 USO NO PREVIEW (Figma Make)

### **Exemplo de URL Completa:**

**Ambiente de Preview do Figma Make:**
```
https://figma-preview-a1b2c3d4e5f6.web.app/dashboard
```

**Componentes da URL:**
- `https://figma-preview-a1b2c3d4e5f6.web.app` → Domínio temporário do Figma
- `/dashboard` → Nossa rota convencionada

**Como usar:**
1. Clique em "Prévia" no Figma Make
2. URL gerada: `https://figma-preview-xxx.web.app/`
3. Adicione `/dashboard` no final
4. URL final: `https://figma-preview-xxx.web.app/dashboard`
5. ✅ Dashboard carrega!

---

## 🎓 EXEMPLOS DE COMUNICAÇÃO

### **Exemplo 1: Sistema travou**

❌ **ANTES (confuso):**
```
"Não funciona, tá dando erro na tela"
```

✅ **AGORA (claro):**
```
URL: https://preview-xyz.figma.com/dashboard
Status: ✅ Dashboard funciona
Problema: Ao tentar ir para /properties dá erro
Console: TypeError: Cannot read property 'id' of undefined
```

---

### **Exemplo 2: Tela em branco**

❌ **ANTES:**
```
"Tela branca no preview"
```

✅ **AGORA:**
```
URL testada: https://preview-abc.figma.com/dashboard
Resultado: ❌ Tela branca também
Console:
- Error: Failed to fetch
- Network error: 500
- Stack trace: [...]
```

---

### **Exemplo 3: Rota específica com problema**

❌ **ANTES:**
```
"O wizard não funciona"
```

✅ **AGORA:**
```
✅ URLs funcionando:
- /dashboard
- /calendario
- /properties

❌ URL com erro:
- /properties/new (wizard)
  
Console:
- Uncaught ReferenceError: Sparkles is not defined
- at FinancialIndividualPricingStep.tsx:42

Screenshot: [anexo]
```

---

## ✅ CHECKLIST DE TROUBLESHOOTING

Quando tiver um problema:

- [ ] 1. Testei URL convencionada: `/dashboard`
- [ ] 2. Copiei console completo (F12)
- [ ] 3. Tirei screenshot da tela
- [ ] 4. Testei outras URLs principais
- [ ] 5. Identifiquei qual rota específica tem problema
- [ ] 6. Enviei relatório formatado

**Template do relatório:**
```markdown
## 🐛 Bug Report

**URL Preview:** https://preview-xyz.figma.com/dashboard
**Status Dashboard:** ✅ ou ❌

**URLs Testadas:**
- /dashboard → ✅
- /calendario → ✅
- /properties/new → ❌

**Problema Específico:**
[Descrição do erro]

**Console:**
```
[Erros aqui]
```

**Screenshot:**
[Imagem]
```

---

## 🎉 CONCLUSÃO

A URL convencionada `/dashboard` é seu **ponto de partida confiável** no ambiente de preview do Figma Make.

**Sempre que algo der errado:**
1. Vá para `/dashboard`
2. Se funcionar → problema é em outra rota específica
3. Se não funcionar → problema crítico no sistema
4. Envie relatório com detalhes

**URL PRINCIPAL:**
```
/dashboard
```

**Memorize esta URL!** 🎯

---

**📅 Data:** 03/11/2025
**🔖 Versão:** v1.0.103.267
**⭐ Status:** CONVENÇÃO ESTABELECIDA
**🎯 Prioridade:** ALTA (sempre mantenha esta rota funcionando)
