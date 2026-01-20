# PROPOSTA: Catálogo v6.7 - Anti-Vacilo do Bolt

**Data**: 2026-01-17
**Autor**: Copilot + Rafael
**Objetivo**: Adicionar regras mais rígidas e código de validação para evitar que o Bolt.new (ou outras IAs) "vacilem" ao criar sites.

---

## 🚨 PROBLEMAS DETECTADOS NO SUACASAMOBILIADA

| # | Problema | Regra no Catálogo | O que o Bolt fez | Status |
|---|----------|-------------------|------------------|--------|
| 1 | Datas passadas não bloqueadas | `calendar-daily-pricing` diz para bloquear | ❌ Não implementou | ✅ CORRIGIDO |
| 2 | PaymentMethodSelector como dropdown | Deveria ser radio buttons | ⚠️ Parece dropdown | A VERIFICAR |
| 3 | Mensagem pós-reserva errada | "Pré-Reserva Criada" antes do pagamento | ❓ Não verificado | A VERIFICAR |
| 4 | Checkout na mesma aba | Deve abrir em NOVA ABA | ❓ Não verificado | A VERIFICAR |

---

## 🛡️ PROPOSTAS DE MELHORIA NO CATÁLOGO

### 1. Adicionar seção `ANTI-PATTERNS` mais agressiva

```typescript
// Adicionar ao catalog.ts, seção nova:

export const ANTI_PATTERNS_CHECKLIST = {
  calendar: [
    {
      id: 'AP-CAL-001',
      title: 'Datas passadas devem ser bloqueadas',
      severity: 'CRITICAL',
      wrongCode: `// ❌ ERRADO - NÃO FAÇA ISSO:
const isDisabled = status === 'blocked';  // Falta verificar data passada!`,
      correctCode: `// ✅ CORRETO:
const today = new Date();
today.setHours(0, 0, 0, 0);
const isPast = new Date(dateStr) < today;
const isDisabled = isPast || status === 'blocked' || status === 'reserved';`,
      testCommand: '// No console: tente clicar em uma data de ontem. Deve ser impossível.'
    },
    {
      id: 'AP-CAL-002',
      title: 'Status é STRING, não boolean',
      severity: 'CRITICAL',
      wrongCode: `// ❌ ERRADO - O CAMPO available NÃO EXISTE!
if (day.available) { ... }`,
      correctCode: `// ✅ CORRETO:
if (day.status === 'available') { ... }`,
      testCommand: '// Verificar no código: grep -r "day.available" src/'
    },
    {
      id: 'AP-CAL-003',
      title: 'NUNCA usar dados mock/fake',
      severity: 'CRITICAL',
      wrongCode: `// ❌ ERRADO - PROIBIDO:
const mockDays = [
  { date: '2026-01-20', status: 'blocked' },
  ...
];`,
      correctCode: `// ✅ CORRETO - Sempre buscar da API:
const result = await fetchCalendar(propertyId, startDate, endDate);
const days = result.data || [];`,
      testCommand: '// grep -r "mock" src/ | grep -v node_modules'
    }
  ],
  checkout: [
    {
      id: 'AP-CHK-001',
      title: 'Checkout DEVE abrir em nova aba',
      severity: 'CRITICAL',
      wrongCode: `// ❌ PROIBIDO!!! NUNCA FAÇA ISSO:
window.location.href = checkoutUrl;
window.location.assign(checkoutUrl);
navigate(checkoutUrl);`,
      correctCode: `// ✅ ÚNICA FORMA CORRETA:
window.open(checkoutUrl, '_blank');`,
      testCommand: '// grep -r "window.location" src/ - deve dar vazio para checkout'
    },
    {
      id: 'AP-CHK-002',
      title: 'Mensagem correta antes do pagamento',
      severity: 'CRITICAL',
      wrongCode: `// ❌ ERRADO:
toast.success('Reserva criada!');
toast.success('Reserva confirmada!');`,
      correctCode: `// ✅ CORRETO (antes do pagamento):
toast.info('Pré-Reserva criada - Aguardando pagamento');
// Só após webhook confirmar:
toast.success('Reserva confirmada!');`,
      testCommand: '// grep -r "Reserva confirmada" src/ - verificar contexto'
    }
  ],
  paymentMethods: [
    {
      id: 'AP-PAY-001',
      title: 'Usar radio buttons, não dropdown',
      severity: 'HIGH',
      wrongCode: `// ❌ ERRADO:
<select name="paymentMethod">
  <option value="stripe:credit_card">Cartão</option>
</select>`,
      correctCode: `// ✅ CORRETO:
{methods.map((method) => (
  <label key={method.id} className="flex items-center ...">
    <input type="radio" name="paymentMethod" value={method.id} />
    <span>{method.label}</span>
  </label>
))}`,
      testCommand: '// grep -r "<select" src/components/Payment - deve dar vazio'
    }
  ]
};
```

---

### 2. Adicionar SCRIPT DE VALIDAÇÃO que roda no build

Criar um arquivo `scripts/validate-site.mjs` que o Rendizy pode rodar antes de aceitar o ZIP:

```javascript
#!/usr/bin/env node
// scripts/validate-site.mjs
// Roda antes de aceitar um site no Rendizy

import fs from 'fs';
import path from 'path';

const ERRORS = [];
const WARNINGS = [];

function checkFile(filePath, checks) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      if (check.severity === 'error') {
        ERRORS.push(`${filePath}: ${check.message}`);
      } else {
        WARNINGS.push(`${filePath}: ${check.message}`);
      }
    }
  }
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') {
        walkDir(fullPath, callback);
      }
    } else {
      callback(fullPath);
    }
  });
}

// REGRAS DE VALIDAÇÃO
const CHECKS = [
  // Anti-patterns críticos
  {
    pattern: /day\.available/,
    message: '[AP-CAL-002] Usando day.available em vez de day.status',
    severity: 'error'
  },
  {
    pattern: /window\.location\.href\s*=.*checkout/i,
    message: '[AP-CHK-001] Checkout não deve usar window.location.href',
    severity: 'error'
  },
  {
    pattern: /window\.location\.assign.*checkout/i,
    message: '[AP-CHK-001] Checkout não deve usar window.location.assign',
    severity: 'error'
  },
  {
    pattern: /["']Reserva confirmada["']/i,
    message: '[AP-CHK-002] Verificar se "Reserva confirmada" só aparece após pagamento',
    severity: 'warning'
  },
  {
    pattern: /@supabase\/supabase-js/,
    message: '[CRITICAL] Importando @supabase/supabase-js - PROIBIDO!',
    severity: 'error'
  },
  {
    pattern: /VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY/,
    message: '[CRITICAL] Usando variáveis de ambiente VITE_ - PROIBIDO!',
    severity: 'error'
  },
  {
    pattern: /import\.meta\.env\.VITE_/,
    message: '[CRITICAL] Usando import.meta.env.VITE_ - PROIBIDO!',
    severity: 'error'
  },
  {
    pattern: /{{[A-Z_]+}}/,
    message: '[CRITICAL] Usando placeholder {{...}} - PROIBIDO!',
    severity: 'error'
  },
  {
    pattern: /MOCK_PROPERTIES|mockProperties|getMockData/,
    message: '[AP-CAL-003] Usando dados mock - PROIBIDO!',
    severity: 'error'
  },
  {
    pattern: /<select[^>]*name=["']?paymentMethod/i,
    message: '[AP-PAY-001] PaymentMethod como select (deveria ser radio buttons)',
    severity: 'warning'
  }
];

// VALIDAÇÕES ESTRUTURAIS
function validateStructure() {
  // 1. package.json na raiz
  if (!fs.existsSync('package.json')) {
    ERRORS.push('[STRUCTURE] package.json não encontrado na raiz');
  }
  
  // 2. vite.config.ts com base: './'
  if (fs.existsSync('vite.config.ts')) {
    const viteConfig = fs.readFileSync('vite.config.ts', 'utf-8');
    if (!viteConfig.includes("base: './'") && !viteConfig.includes('base: "./"')) {
      ERRORS.push('[STRUCTURE] vite.config.ts deve ter base: "./"');
    }
  }
  
  // 3. src/config/site.ts existe
  if (!fs.existsSync('src/config/site.ts')) {
    ERRORS.push('[STRUCTURE] src/config/site.ts não encontrado');
  }
  
  // 4. Verificar HashRouter
  if (fs.existsSync('src/App.tsx')) {
    const appContent = fs.readFileSync('src/App.tsx', 'utf-8');
    if (!appContent.includes('HashRouter')) {
      ERRORS.push('[STRUCTURE] App.tsx deve usar HashRouter');
    }
  }
}

// EXECUTAR
console.log('🔍 Validando site Rendizy...\n');

validateStructure();

walkDir('src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    checkFile(filePath, CHECKS);
  }
});

// RESULTADO
if (WARNINGS.length > 0) {
  console.log('⚠️ AVISOS:');
  WARNINGS.forEach(w => console.log(`  ${w}`));
  console.log('');
}

if (ERRORS.length > 0) {
  console.log('❌ ERROS (site será REJEITADO):');
  ERRORS.forEach(e => console.log(`  ${e}`));
  console.log('');
  console.log(`\n❌ FALHOU: ${ERRORS.length} erro(s) encontrado(s)`);
  process.exit(1);
} else {
  console.log('✅ VALIDAÇÃO OK - Site pode ser aceito');
  process.exit(0);
}
```

---

### 3. Adicionar ao prompt a seção de "TESTES OBRIGATÓRIOS"

```markdown
## 🧪 TESTES QUE O BOLT DEVE FAZER ANTES DE ENTREGAR

Antes de finalizar o código, VOCÊ (IA) deve verificar mentalmente:

### Calendário
- [ ] Abrir calendário e verificar se dias antes de HOJE estão cinza
- [ ] Verificar se o código usa `day.status === "available"` (string)
- [ ] Não existe nenhum `MOCK_PROPERTIES` ou dados fake

### Checkout
- [ ] O código de checkout usa `window.open(url, "_blank")`, NÃO `window.location`
- [ ] A mensagem antes do pagamento diz "Pré-Reserva" ou "Aguardando pagamento"

### PaymentMethods
- [ ] É um componente com `<input type="radio">`, NÃO um `<select>`
- [ ] Os métodos vêm da API `/payment-methods`

### Estrutura
- [ ] `package.json` está na raiz
- [ ] `vite.config.ts` tem `base: "./"` 
- [ ] Usa `HashRouter`
- [ ] Não existe nenhum `VITE_` ou `.env`
```

---

### 4. Criar template de componentes "blindados"

Incluir no catálogo um **código de referência** que o Bolt pode copiar:

```typescript
// TEMPLATE BLINDADO: DateRangePicker.tsx
// Este código já segue TODAS as regras do catálogo v6.7

export function DateRangePicker({ propertyId, onSelect }) {
  // ... código completo e correto ...
  
  // ✅ REGRA AP-CAL-001: Verificar data passada
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDate = (dateStr: string) => new Date(dateStr) < today;
  
  // ✅ REGRA AP-CAL-002: Usar status como string
  const isAvailable = (dateStr: string) => {
    const day = calendarData.find(d => d.date === dateStr);
    return day?.status === 'available'; // ← STRING!
  };
  
  // ✅ REGRA AP-CAL-003: Dados da API real
  const loadCalendar = async () => {
    const result = await fetchCalendar(propertyId, startDate, endDate);
    setCalendarData(result.data || []);
  };
  
  // ...
}
```

---

## 📊 IMPACTO NO BACKEND

**NENHUM** - estas mudanças são apenas no PROMPT/CATÁLOGO e afetam como a IA gera os sites.

O backend continua igual:
- `/calendar` retorna `{ date, status, price }`
- `/payment-methods` retorna `{ methods: [...], hasPaymentEnabled }`
- `/checkout/session` retorna `{ checkoutUrl, ... }`

---

## ✅ PRÓXIMOS PASSOS

1. [ ] Revisar esta proposta
2. [ ] Atualizar `catalog.ts` para v6.7 com as novas regras
3. [ ] Criar `scripts/validate-site.mjs` no projeto
4. [ ] Testar com um novo site no Bolt.new
5. [ ] Documentar no README do Rendizy

---

## 🔗 ARQUIVOS RELACIONADOS

- `components/client-sites/catalog.ts` - Fonte de verdade
- `_tmp_suacasa_repo/src/components/DateRangePicker.tsx` - Exemplo corrigido
- `_tmp_medhome_repo/src/components/DateRangePicker.tsx` - Exemplo que já estava correto
