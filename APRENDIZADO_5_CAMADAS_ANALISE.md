# 🎓 Aprendizado: As 5 Camadas de Análise em Desenvolvimento

## 📍 Contexto
Durante o debugging de uma issue onde o modal de reserva mostrava "R$ 0.00" (bug de pricing), foi necessário investigar através de múltiplas camadas do sistema. O aprendizado não foi apenas técnico, mas arquitetural.

### O Problema Inicial
```
✗ Modal exibindo R$ 0.00/noite (erro)
✗ Dialog Portal crash ao fechar modal
✓ Esperado: R$ 200/noite + R$ 129 limpeza = R$ 729
```

### Como Chegamos ao Topo
**Tentativa 1-4**: Corrigir código do componente `dialog.tsx` (trocar container, usar useEffect, etc)
- ❌ Resultado: Erro persiste

**Tentativa 5**: Pensar diferente → Investigar a **ferramenta escolhida**, não o código
- ✅ Resultado: Identificar React.StrictMode como raiz do problema

---

## 🎯 As 5 Camadas de Análise (Em Ordem)

### **Camada 1: Backend API**
**O quê**: Serviços que alimentam o frontend  
**Como testar**: Fazer requisição HTTP direta

```javascript
// ✅ Teste direto
fetch('https://supabase.com/functions/v1/rendizy-server/anuncios-ultimate/ID')
  .then(r => r.json())
  .then(d => console.log('Preço:', d.anuncio.pricing))
```

**Problema típico**: API retorna estrutura incorreta, valores faltando, endpoint errado  
**Status neste caso**: ✅ PASSOU - Backend retornava dados corretos

---

### **Camada 2: Banco de Dados**
**O quê**: Dados persistidos (PostgreSQL, estrutura JSONB, etc)  
**Como testar**: Query SQL direta no Supabase SQL Editor

```sql
-- ✅ Teste direto
SELECT id, 
  data->>'pricing' as pricing,
  (data->'pricing'->>'basePrice')::numeric as base_price
FROM anuncios_drafts 
WHERE id = '...';
```

**Problema típico**: Campo vazio, tipo errado (string vs number), estrutura JSONB malformada  
**Status neste caso**: ❌ FALHOU - Database tinha `pricing = undefined`

**Solução**: SQL UPDATE para popular o campo
```sql
UPDATE anuncios_drafts 
SET data = jsonb_set(COALESCE(data, '{}'), '{pricing}', 
    '{"basePrice": 200, "cleaningFee": 129, "currency": "BRL"}')
WHERE id = '...';
```

---

### **Camada 3: Frontend - Extração de Dados**
**O quê**: Como o React extrai dados da API  
**Como testar**: Console logs + verificação de tipos

```typescript
// ✅ Logs detalhados
console.log('anuncio.data?.pricing:', anuncio.data?.pricing);
console.log('basePrice extraído:', basePrice, typeof basePrice);
console.log('cleaningFee extraído:', cleaningFee, typeof cleaningFee);
```

**Problema típico**: Destructuring errado, `undefined` vs `null`, fallbacks ausentes  
**Status neste caso**: ✅ PASSOU - Após banco estar certo, extração funcionou

```typescript
// ✅ Boas práticas:
const pricingData = anuncio.data?.pricing || anuncio.pricing || {};
let basePrice = pricingData.basePrice || anuncio.data?.preco_base_noite || 0;
// Múltiplos fallbacks em cascata
```

---

### **Camada 4: UI/UX - Renderização**
**O quê**: Como dados são exibidos visualmente  
**Como testar**: Inspecionar elemento no DevTools, verificar CSS

```html
<!-- Problema típico: formatação incorreta, zero-padding, moeda errada -->
<div>${{ 0.00 }} ← ❌ Zero-padding: "R$ 0129"
<div>${{ 200.00 }} ← ✅ Correto: "R$ 200,00"
```

**Problema neste caso**: Após banco estar correto, UI mostrou R$ 729 ✅  
**Não era um problema de CSS ou Intl.format - era a falta de dados**

---

### **Camada 5: Componente/Ferramenta Escolhida ⚠️ CRÍTICA**
**O quê**: A escolha arquitetural do tipo de componente (Wizard vs Tabs vs Action Sheet)  
**Por que importa**: Alguns componentes têm **propensão intrínseca a erros**

**Exemplo: Wizard vs React.StrictMode**
```
┌─────────────────────────────────────────┐
│ React.StrictMode (desenvolvimento)      │
│ - Double-render propositalmente         │
│ - Detecta efeitos colaterais            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Wizard com múltiplas etapas             │
│ - useState para cada step               │
│ - Navegação customizada                 │
│ - Múltiplos Dialog elements             │
└─────────────────────────────────────────┘
         ↓
❌ CONFLITO: Double-render + múltiplos Dialog 
            → Radix UI Portal crashes
```

**Solução**: Usar **Tabs** (Radix UI)
```
┌─────────────────────────────────────────┐
│ React.StrictMode (desenvolvimento)      │
│ - Double-render propositalmente         │
│ - Detecta efeitos colaterais            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Tabs com 3 seções                       │
│ - Um único Dialog                       │
│ - Sem estado complexo de navegação      │
│ - TabsContent é simples                 │
└─────────────────────────────────────────┘
         ↓
✅ COMPATÍVEL: Double-render não afeta Tabs
```

---

## 🔍 A Lição Crítica: Camada 5 é Invisível

### Por que as primeiras 4 análises falharam?
- ✅ Backend: Estava correto
- ❌ Banco: Estava vazio (problema resolvido)
- ✅ Frontend: Lógica correta
- ✅ UI: Formatação correta
- **❌ Ferramenta (Camada 5): Wizard era inadequado**

### O erro foi tentar "consertar" camadas 1-4
```
Tentativa 1-4: "Por que o Dialog crash?"
└─ Investigação: Container? useEffect? Portal?
└─ Resultado: Todos os "fixes" falharam
└─ Razão verdadeira: Componente errado para o job

Tentativa 5: "Será que a raiz está em outro lugar?"
└─ Investigação: React config? StrictMode?
└─ Resultado: Achamos!
└─ Razão: Wizard + StrictMode = incompatível
```

### Consequência
- **Tentativas 1-4**: 4 horas de work, 0 resultado
- **Tentativa 5** (pensar diferente): 30 min, problema resolvido + refactoring para Tabs

---

## 📊 Matriz de Diagnóstico - Quando Usar Cada Camada

| Sintoma | Camadas a Investigar | Primeiro |
|---------|---------------------|----------|
| Dados não aparecem | Backend → Banco → Frontend | **Banco** |
| Dados aparecem errados | Frontend → UI → Backend | **Frontend** |
| Formatação errada | UI → Frontend | **UI** |
| Crashes aleatórios | Camada 5 (Componente) | **Componente** |
| Tudo está certo, mas falha | Camada 5 (Ferramenta) | **Reconhecer** |

---

## 🎯 Regra de Ouro: Diagnosticar de Cima para Baixo

```
┌──────────────────────────┐
│  5. FERRAMENTA/COMPONENTE │ ← Começar aqui em "crashes sem razão"
├──────────────────────────┤
│  4. UI/UX RENDERING      │ ← Depois verificar visual
├──────────────────────────┤
│  3. FRONTEND EXTRACTION  │ ← Verificar logs/console
├──────────────────────────┤
│  2. DATABASE             │ ← Query SQL direto
├──────────────────────────┤
│  1. BACKEND API          │ ← Teste HTTP puro
└──────────────────────────┘

❌ ERRADO: Começar em camada 1 quando o problema é em camada 5
✅ CORRETO: Identificar a camada do sintoma ANTES de investigar
```

---

## 🛠️ Checklist de Diagnóstico Profundo

Quando encontrar um bug obscuro:

### 1️⃣ **Perguntar a si mesmo**
- [ ] O código está correto? (lógica de negócio)
- [ ] Os dados existem? (banco de dados)
- [ ] A extração é correta? (frontend parsing)
- [ ] A renderização é correta? (UI)
- [ ] A **ferramenta escolhida é adequada**? (componente/lib)

### 2️⃣ **Investigar pelo MAIS ALTO**
- [ ] Qual é o padrão? Sempre falha? Às vezes? Com StrictMode?
- [ ] Funciona em produção? (sem StrictMode)
- [ ] É específico de um componente?
- [ ] É específico de uma combinação de ferramentas?

### 3️⃣ **Testar isolado**
- [ ] Reproduzir erro minimal
- [ ] Testar cada camada separadamente
- [ ] Desabilitar features uma por uma
- [ ] Mudar a "ferramenta" (ex: Wizard → Tabs)

---

## 📝 Aplicação Prática: Nosso Caso

### Checklist Retrospectivo

✅ **Código** - Review linha por linha: OK  
❌ **Banco** - Query SQL: Vazio! → FIX applied  
✅ **Extração** - Logs do console: Funcionando  
✅ **Renderização** - DevTools: Formatação correta  
❌ **Ferramenta** - Dialog + StrictMode: Incompatível! → Refatorar para Tabs

### Resultado
```
Antes:
  - Dialog crashes em close
  - R$ 0.00 display
  - 4 horas de troubleshooting

Depois:
  - Converted to Tabs (elimina Dialog crash)
  - Database populated (elimina R$ 0.00)
  - Pricing correto: R$ 729 ✓
  - Code simplificado: -40% linhas de state management
```

---

## 🚀 Aplicar Agora

### Ao trabalhar no projeto:
1. **Antes de bugfix**: Identificar em qual camada está o problema
2. **Ao debugar**: Investigar de cima para baixo (Camada 5 → 1)
3. **Ao escolher componentes**: Considerar compatibilidade com StrictMode, React 18, etc
4. **Ao escrever código**: Documentar por que escolheu **essa** ferramenta (Tabs vs Wizard)

---

## 📌 Referência Rápida

**Se encontrar erro obscuro:**
1. "Será que é o dado?" → Verificar Banco (Camada 2)
2. "Será que é a extração?" → Verificar Frontend (Camada 3)
3. "Será que é visual?" → Verificar UI (Camada 4)
4. **"Será que é a ferramenta?"** → Verificar Componente (Camada 5) ← **MAS NINGUÉM PENSA NISSO**
5. "Será que outro lugar?" → Ir pra 4, depois 3, depois 2, depois 1

---

## 📚 Documentos Relacionados
- [`Ligando os motores único.md`](Ligando%20os%20motores%20único.md) - Configuração única
- [`Claude Sonnet 4.5 Anuncios ultimate.md`](Claude%20Sonnet%204.5%20Anuncios%20ultimate.md) - Histórico do módulo
- CHECKLIST: Verificar antes de mudar código

---

**Versão**: 1.0  
**Data**: 17/12/2025  
**Status**: ✅ Aplicado em CreateReservationWizard (Wizard → Tabs)
