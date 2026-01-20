// ============================================================
// CATÁLOGO DE CONTRATO PÚBLICO — CLIENT SITES API
// ============================================================
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  🎯 OBJETIVO DESTE ARQUIVO (LEIA COM ATENÇÃO, IA!)                       ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║                                                                          ║
// ║  Este arquivo é o CATÁLOGO DE COMPONENTES E DADOS do Rendizy.            ║
// ║  Ele é IRMÃO SIAMÊS do PROMPT de criação de sites (v5.x).                ║
// ║                                                                          ║
// ║  📋 PROMPT diz O QUE FAZER e as REGRAS GERAIS                            ║
// ║  📦 CATÁLOGO diz COMO FAZER com COMPONENTES ESPECÍFICOS                  ║
// ║                                                                          ║
// ║  ⚠️ VOCÊ (IA) DEVE:                                                      ║
// ║    1. Ler o PROMPT primeiro para entender o contexto                     ║
// ║    2. Consultar este CATÁLOGO para ver os BLOCOS e ENDPOINTS             ║
// ║    3. Implementar EXATAMENTE como especificado aqui                      ║
// ║    4. Usar os campos EXATOS listados em requiredFields                   ║
// ║    5. Seguir os exemplos de código em codeBlocks                         ║
// ║                                                                          ║
// ║  🔗 VERSÃO SINCRONIZADA: CATALOG_VERSION deve ser igual ao PROMPT        ║
// ║     Se um atualiza, o outro DEVE atualizar junto.                        ║
// ║                                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// ⚠️ REGRA CANÔNICA (LEIA docs/Rules.md):
// O RENDIZY PROPÕE O PADRÃO. SITES EXTERNOS SEGUEM.
//
// Este arquivo é a FONTE DE VERDADE para a API pública.
// - Tipos aqui definidos são IMUTÁVEIS após publicação
// - Mudanças são ADITIVAS (novos campos opcionais)
// - Sites externos DEVEM implementar conforme especificado
// - NUNCA adapte o backend para aceitar formatos não documentados
//
// ============================================================

/**
        },
        {
          title: 'Modo 2 — site hospedado externamente (fetch direto)',
          language: 'ts',
          code: `// Base (Supabase Edge Function):
 * Formato: 'vX.Y' onde X é major (breaking), Y é minor (aditivo)
 */
export const CATALOG_VERSION = 'v6.9' as const;

/**
 * Data da última atualização (para referência humana)
 */
export const CATALOG_UPDATED_AT = '2026-01-18T02:30:00Z' as const;

export type ClientSitesCatalogStability = 'stable' | 'planned' | 'deprecated';

export type ClientSitesCatalogModality = 'universal' | 'venda' | 'locacao';

export type ClientSitesCatalogEndpoint = {
  id: string;
  title: string;
  method: 'GET' | 'POST';
  pathTemplate: string;
  stability: ClientSitesCatalogStability;
  notes?: string[];
};

export type ClientSitesCatalogFieldGroup = {
  title: string;
  fields: string[];
  notes?: string[];
};

export type ClientSitesCatalogBlock = {
  id: string;
  title: string;
  stability: ClientSitesCatalogStability;
  description: string;
  usesEndpoints: string[];
  requiredFields: string[];
  notes?: string[];
  modalities?: ClientSitesCatalogModality[];
};

export type ClientSitesCatalogIntegrationGuide = {
  title: string;
  notes: string[];
  codeBlocks?: Array<{ title: string; language?: string; code: string }>;
};

// ============================================================
// 🚨 ANTI-PATTERNS CHECKLIST (v6.7)
// ============================================================
//
// Lista de erros comuns que IAs (Bolt, Cursor, etc.) cometem ao gerar sites.
// Use para validação automática e para incluir no prompt.
// ============================================================

export type AntiPatternSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type AntiPattern = {
  id: string;
  title: string;
  severity: AntiPatternSeverity;
  category: 'calendar' | 'checkout' | 'payment' | 'structure' | 'data';
  wrongCode: string;
  correctCode: string;
  grepPattern?: string; // Regex para detectar automaticamente
  testDescription: string;
};

export const ANTI_PATTERNS_CHECKLIST: AntiPattern[] = [
  // ==================== CALENDÁRIO ====================
  {
    id: 'AP-CAL-001',
    title: 'Datas passadas devem ser bloqueadas',
    severity: 'CRITICAL',
    category: 'calendar',
    wrongCode: `// ❌ ERRADO - NÃO FAÇA ISSO:
const isDisabled = status === 'blocked';  // Falta verificar data passada!

// ❌ TAMBÉM ERRADO:
if (day.status !== 'available') { ... }  // Não verifica se é passado`,
    correctCode: `// ✅ CORRETO - Verificar data passada PRIMEIRO:
const today = new Date();
today.setHours(0, 0, 0, 0);
const isPast = new Date(dateStr + 'T00:00:00') < today;
const isDisabled = isPast || status === 'blocked' || status === 'reserved';

// Estilo visual para datas passadas:
// - bg-gray-50 (fundo cinza claro)
// - text-gray-300 (texto cinza)
// - cursor-not-allowed
// - NÃO exibir preço`,
    grepPattern: 'status.*blocked.*(?!isPast|Past)',
    testDescription: 'No calendário, tente clicar em uma data de ontem. Deve ser impossível e estar visualmente desabilitada (cinza).'
  },
  {
    id: 'AP-CAL-002',
    title: 'Status é STRING, não boolean',
    severity: 'CRITICAL',
    category: 'calendar',
    wrongCode: `// ❌ ERRADO - O CAMPO "available" NÃO EXISTE!
if (day.available) { ... }
if (day.isAvailable) { ... }
if (day.available === true) { ... }`,
    correctCode: `// ✅ CORRETO - Status é uma STRING:
if (day.status === 'available') { ... }

// Valores possíveis de status:
// - 'available' → pode reservar
// - 'blocked' → bloqueado manualmente
// - 'reserved' → já tem reserva`,
    grepPattern: 'day\\.available|day\\.isAvailable',
    testDescription: 'Grep no código: não deve existir "day.available" ou "day.isAvailable".'
  },
  {
    id: 'AP-CAL-003',
    title: 'NUNCA usar dados mock/fake',
    severity: 'CRITICAL',
    category: 'data',
    wrongCode: `// ❌ PROIBIDO - Dados fake:
const mockDays = [
  { date: '2026-01-20', status: 'blocked' },
  { date: '2026-01-21', status: 'available' },
];

// ❌ PROIBIDO - Gerar bloqueios baseado em Date.now():
const blockedDates = Array.from({ length: 10 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toISOString().split('T')[0];
});`,
    correctCode: `// ✅ CORRETO - Sempre buscar da API:
const result = await fetchCalendar(propertyId, startDate, endDate);
if (result.success && result.data) {
  setCalendarData(result.data);
}`,
    grepPattern: 'mockDays|MOCK_PROPERTIES|getMockData|mockProperties',
    testDescription: 'Grep no código: não deve existir nenhuma referência a "mock".'
  },
  {
    id: 'AP-CAL-004',
    title: 'Calendário DEVE ser MODAL CENTRALIZADO, não inline/embutido',
    severity: 'CRITICAL',
    category: 'calendar',
    wrongCode: `// ❌ ERRADO - Calendário inline ou dropdown que fica espremido:
<div className="relative">
  <button onClick={() => setIsOpen(!isOpen)}>Selecione...</button>
  {isOpen && (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-lg">
      {/* Calendário espremido no container pai */}
    </div>
  )}
</div>

// ❌ ERRADO - Calendário embutido diretamente na página:
<div className="w-64"> {/* Muito pequeno! */}
  <CalendarGrid ... />
</div>`,
    correctCode: `// ✅ CORRETO - Modal centralizado na tela (PADRÃO OBRIGATÓRIO):
{isOpen && (
  <>
    {/* Overlay escuro */}
    <div 
      className="fixed inset-0 bg-black/50 z-40"
      onClick={() => setIsOpen(false)}
    />
    {/* Modal centralizado */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Navegação entre meses */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth}><ChevronLeft /></button>
          <h2 className="text-lg font-semibold">Selecione as datas</h2>
          <button onClick={nextMonth}><ChevronRight /></button>
        </div>
        
        {/* 2 meses lado a lado (responsivo) */}
        <div className="flex flex-col md:flex-row gap-6">
          {renderMonth(0)}
          {renderMonth(1)}
        </div>
        
        {/* Legenda + Botão Fechar */}
        <div className="mt-6 flex justify-between border-t pt-4">
          <div className="flex gap-4">
            <span>🟢 Disponível</span>
            <span>⬜ Indisponível</span>
            <span>🔵 Selecionado</span>
          </div>
          <button onClick={() => setIsOpen(false)}>Fechar</button>
        </div>
      </div>
    </div>
  </>
)}`,
    grepPattern: 'absolute.*top-full.*calendar|className.*w-64.*calendar',
    testDescription: 'O calendário deve abrir como modal no centro da tela com overlay escuro, NÃO como dropdown ou inline.'
  },
  {
    id: 'AP-CAL-005',
    title: 'OBRIGATÓRIO exibir PREÇO dentro de cada célula do calendário (temporada)',
    severity: 'CRITICAL',
    category: 'calendar',
    wrongCode: `// ❌ ERRADO - Célula sem preço:
<div className="day-cell" onClick={() => handleDateClick(dateStr)}>
  <span>{day}</span>
  {/* Cadê o preço??? O usuário precisa saber quanto custa cada dia! */}
</div>

// ❌ ERRADO - Preço só no total, não nas células:
<div>Preço total: R$ {totalPrice}</div>
// As células do calendário não mostram o preço de cada dia`,
    correctCode: `// ✅ CORRETO - Cada célula DEVE mostrar o preço do dia:
// 1. Buscar dados do calendário com preços
const result = await fetchCalendar(propertyId, startDate, endDate);
// result.data = [{ date: "2026-01-20", status: "available", price: 480, minNights: 1 }, ...]

// 2. Função para obter preço do dia
const getDayPrice = (dateStr: string): number => {
  const day = calendarData.find(d => d.date === dateStr);
  return day?.price || 0;
};

// 3. Renderizar célula COM preço visível
const renderDayCell = (dateStr: string, dayNumber: number) => {
  const status = getDayStatus(dateStr);
  const price = getDayPrice(dateStr);
  
  return (
    <div 
      className="h-16 flex flex-col items-center justify-center border"
      onClick={() => status === 'available' && handleDateClick(dateStr)}
    >
      <span className="font-semibold">{dayNumber}</span>
      {/* 👇 OBRIGATÓRIO: Mostrar preço se disponível */}
      {status === 'available' && price > 0 && (
        <span className="text-xs text-green-600 mt-1">R$ {price}</span>
      )}
    </div>
  );
};

// VISUAL ESPERADO:
// ┌─────┬─────┬─────┐
// │  20 │  21 │  22 │  ← Número do dia
// │R$480│R$480│R$520│  ← Preço OBRIGATÓRIO
// └─────┴─────┴─────┘`,
    grepPattern: 'day\\.price|getDayPrice|price.*>.*0',
    testDescription: 'Cada célula do calendário DEVE exibir o preço do dia (ex: "R$ 480"). Verifique se o código busca day.price e renderiza na célula.'
  },

  // ==================== CHECKOUT ====================
  {
    id: 'AP-CHK-001',
    title: 'Checkout DEVE abrir em NOVA ABA',
    severity: 'CRITICAL',
    category: 'checkout',
    wrongCode: `// ❌❌❌ PROIBIDO!!! NUNCA FAÇA ISSO:
window.location.href = checkoutUrl;
window.location.assign(checkoutUrl);
window.location.replace(checkoutUrl);
navigate(checkoutUrl);
router.push(checkoutUrl);`,
    correctCode: `// ✅✅✅ ÚNICA FORMA CORRETA:
window.open(checkoutUrl, '_blank');

// A aba original PERMANECE intacta.
// A nova aba vai para o Stripe.
// Após pagamento, a nova aba redireciona para /api/checkout/success.`,
    grepPattern: 'window\\.location\\.(href|assign|replace).*checkout',
    testDescription: 'Grep: não deve existir window.location.href/assign/replace com "checkout".'
  },
  {
    id: 'AP-CHK-002',
    title: 'Mensagem correta antes do pagamento',
    severity: 'CRITICAL',
    category: 'checkout',
    wrongCode: `// ❌ ERRADO - Antes do pagamento:
toast.success('Reserva criada!');
toast.success('Reserva confirmada!');
setMessage('Sua reserva foi confirmada!');`,
    correctCode: `// ✅ CORRETO - Antes do pagamento:
toast.info('Pré-Reserva criada - Aguardando pagamento');
setBookingStatus('pending');
setMessage('Complete o pagamento para confirmar sua reserva');

// ✅ CORRETO - SOMENTE após webhook confirmar:
// (via BroadcastChannel ou polling)
toast.success('Reserva confirmada!');
setBookingStatus('confirmed');`,
    grepPattern: '"[Rr]eserva confirmada".*(?!webhook|polling|confirmed)',
    testDescription: 'Verificar que "Reserva confirmada" só aparece após confirmação do pagamento.'
  },
  {
    id: 'AP-CHK-003',
    title: 'URLs de retorno devem apontar para Rendizy',
    severity: 'CRITICAL',
    category: 'checkout',
    wrongCode: `// ❌ ERRADO - URLs internas do site:
successUrl: '#/pagamento-sucesso',
successUrl: '/success',
successUrl: window.location.origin + '/success',`,
    correctCode: `// ✅ CORRETO - URLs do domínio Rendizy:
// ⚠️ IMPORTANTE: O backend URL é HARDCODED, não dinâmico!
// O endpoint /api/checkout/success existe APENAS no backend Rendizy,
// NÃO nos sites dos clientes.
const RENDIZY_BACKEND_URL = 'https://rendizy2testesbackup.vercel.app';
successUrl: \`\${RENDIZY_BACKEND_URL}/api/checkout/success?siteSlug=\${subdomain}&reservationId=\${reservationId}\`,
cancelUrl: \`\${RENDIZY_BACKEND_URL}/api/checkout/cancel?siteSlug=\${subdomain}&reservationId=\${reservationId}\`,`,
    grepPattern: "successUrl.*#/|successUrl.*/success['\"]",
    testDescription: 'successUrl e cancelUrl devem apontar para /api/checkout/* do Rendizy.'
  },

  // ==================== PAGAMENTO ====================
  {
    id: 'AP-PAY-001',
    title: 'PaymentMethodSelector deve usar radio buttons',
    severity: 'HIGH',
    category: 'payment',
    wrongCode: `// ❌ ERRADO - Dropdown/Select:
<select name="paymentMethod" onChange={...}>
  <option value="">Selecione...</option>
  <option value="stripe:credit_card">Cartão de Crédito</option>
  <option value="pagarme:pix">PIX</option>
</select>`,
    correctCode: `// ✅ CORRETO - Radio buttons com visual:
{methods.map((method) => (
  <label
    key={method.id}
    className={\`flex items-center p-4 border-2 rounded-lg cursor-pointer
      \${selectedMethod === method.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}\`}
  >
    <input
      type="radio"
      name="paymentMethod"
      value={method.id}
      checked={selectedMethod === method.id}
      onChange={(e) => onSelect(e.target.value)}
    />
    <span className="ml-3">{method.icon} {method.label}</span>
  </label>
))}`,
    grepPattern: '<select[^>]*paymentMethod|<select[^>]*payment',
    testDescription: 'Não deve existir <select> para métodos de pagamento.'
  },

  // ==================== ESTRUTURA ====================
  {
    id: 'AP-STR-001',
    title: 'PROIBIDO usar @supabase/supabase-js',
    severity: 'CRITICAL',
    category: 'structure',
    wrongCode: `// ❌ PROIBIDO - Vai crashar o bundle:
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

// Erro que vai aparecer:
// Uncaught Error: supabaseUrl is required`,
    correctCode: `// ✅ CORRETO - Usar fetch direto:
const response = await fetch(
  \`https://\${projectRef}.supabase.co/functions/v1/rendizy-public/client-sites/api/\${subdomain}/properties\`
);
const result = await response.json();`,
    grepPattern: '@supabase/supabase-js|createClient.*supabase',
    testDescription: 'Grep: não deve existir import de @supabase/supabase-js.'
  },
  {
    id: 'AP-STR-002',
    title: 'PROIBIDO usar variáveis de ambiente VITE_',
    severity: 'CRITICAL',
    category: 'structure',
    wrongCode: `// ❌ PROIBIDO - Site é servido SEM env vars:
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const subdomain = process.env.SUBDOMAIN;`,
    correctCode: `// ✅ CORRETO - Hardcode em src/config/site.ts:
// src/config/site.ts
export const siteConfig = {
  subdomain: 'sua-casa-mobiliada',  // ← Valor fixo!
  siteName: 'Sua Casa Mobiliada',
  projectRef: 'odcgnzfremrqnvtitpcc',
};`,
    grepPattern: 'import\\.meta\\.env\\.VITE_|process\\.env\\.',
    testDescription: 'Grep: não deve existir referência a import.meta.env.VITE_ ou process.env.'
  },
  {
    id: 'AP-STR-003',
    title: 'PROIBIDO usar placeholders {{...}}',
    severity: 'CRITICAL',
    category: 'structure',
    wrongCode: `// ❌ PROIBIDO - Placeholders não são substituídos:
const subdomain = '{{SUBDOMAIN}}';
const orgId = '{{ORG_ID}}';
const apiKey = '{{API_KEY}}';`,
    correctCode: `// ✅ CORRETO - Valores concretos:
const subdomain = 'sua-casa-mobiliada';
const orgId = '7a0873d3-25f1-43d5-9d45-ca7beaa07f77';
// API key não é necessária para endpoints públicos`,
    grepPattern: '\\{\\{[A-Z_]+\\}\\}',
    testDescription: 'Grep: não deve existir {{PLACEHOLDER}}.'
  },
  {
    id: 'AP-STR-004',
    title: 'Deve usar HashRouter',
    severity: 'HIGH',
    category: 'structure',
    wrongCode: `// ❌ ERRADO - BrowserRouter não funciona em subpath:
import { BrowserRouter } from 'react-router-dom';
<BrowserRouter>
  <Routes>...</Routes>
</BrowserRouter>`,
    correctCode: `// ✅ CORRETO - HashRouter funciona em qualquer path:
import { HashRouter } from 'react-router-dom';
<HashRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/imovel/:id" element={<PropertyPage />} />
  </Routes>
</HashRouter>

// URLs resultantes:
// /site/subdomain/#/
// /site/subdomain/#/imovel/123`,
    grepPattern: 'BrowserRouter',
    testDescription: 'Grep: deve usar HashRouter, não BrowserRouter.'
  },
  {
    id: 'AP-STR-005',
    title: 'GuestAreaButton DEVE usar URL FIXA do backend, NÃO fetch dinâmico',
    severity: 'CRITICAL',
    category: 'structure',
    wrongCode: `// ❌ ERRADO - Buscar URL dinamicamente (vai quebrar!):
const GuestAreaButton = () => {
  const [backendUrl, setBackendUrl] = useState('');
  
  useEffect(() => {
    // NÃO FAÇA ISSO! Vai dar 404 se apontar pro domínio do site!
    fetchSiteConfig().then(config => {
      setBackendUrl(config.domain || window.location.origin);
    });
  }, []);
  
  return <a href={\`\${backendUrl}/guest-area/\`}>Entrar</a>;
};`,
    correctCode: `// ✅ CORRETO - URL FIXA do backend Rendizy:
const RENDIZY_BACKEND_URL = 'https://rendizy2testesbackup.vercel.app';

const GuestAreaButton = ({ siteConfig }) => {
  const handleClick = () => {
    const params = new URLSearchParams({
      slug: siteConfig.subdomain,
      primary: encodeURIComponent(siteConfig?.theme?.primaryColor || '#3B82F6'),
      secondary: encodeURIComponent(siteConfig?.theme?.secondaryColor || '#10B981'),
      accent: encodeURIComponent(siteConfig?.theme?.accentColor || '#F59E0B'),
    });
    // Sempre aponta pro backend Rendizy, NUNCA pro domínio do site!
    window.location.href = \`\${RENDIZY_BACKEND_URL}/guest-area/?\${params.toString()}\`;
  };
  
  return <button onClick={handleClick}>👤 Entrar</button>;
};`,
    grepPattern: 'fetchSiteConfig.*backendUrl|domain.*guest-area|window\\.location\\.origin.*guest',
    testDescription: 'O botão Entrar/Guest Area DEVE apontar para rendizy2testesbackup.vercel.app/guest-area/, NUNCA para o domínio do site do cliente.'
  }
];

// Função para gerar seção de anti-patterns no prompt
export function generateAntiPatternsSection(): string {
  let section = `## 🚨 ANTI-PATTERNS (ERROS COMUNS - LEIA COM ATENÇÃO!)

Esta seção lista erros que IAs frequentemente cometem. **VERIFIQUE SEU CÓDIGO** contra cada item.

`;

  const byCategory = {
    calendar: ANTI_PATTERNS_CHECKLIST.filter(ap => ap.category === 'calendar'),
    checkout: ANTI_PATTERNS_CHECKLIST.filter(ap => ap.category === 'checkout'),
    payment: ANTI_PATTERNS_CHECKLIST.filter(ap => ap.category === 'payment'),
    structure: ANTI_PATTERNS_CHECKLIST.filter(ap => ap.category === 'structure'),
    data: ANTI_PATTERNS_CHECKLIST.filter(ap => ap.category === 'data'),
  };

  const categoryTitles: Record<string, string> = {
    calendar: '📅 Calendário',
    checkout: '💳 Checkout',
    payment: '💰 Pagamento',
    structure: '🏗️ Estrutura',
    data: '📊 Dados',
  };

  for (const [cat, patterns] of Object.entries(byCategory)) {
    if (patterns.length === 0) continue;
    
    section += `### ${categoryTitles[cat]}\n\n`;
    
    for (const ap of patterns) {
      const severityIcon = ap.severity === 'CRITICAL' ? '🔴' : ap.severity === 'HIGH' ? '🟠' : '🟡';
      section += `#### ${severityIcon} ${ap.id}: ${ap.title}\n\n`;
      section += `**Severidade**: ${ap.severity}\n\n`;
      section += `**❌ ERRADO:**\n\`\`\`typescript\n${ap.wrongCode}\n\`\`\`\n\n`;
      section += `**✅ CORRETO:**\n\`\`\`typescript\n${ap.correctCode}\n\`\`\`\n\n`;
      section += `**🧪 Teste**: ${ap.testDescription}\n\n`;
      section += `---\n\n`;
    }
  }

  return section;
}

// Função para validar código contra anti-patterns (para uso em scripts)
export function validateAgainstAntiPatterns(code: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const ap of ANTI_PATTERNS_CHECKLIST) {
    if (!ap.grepPattern) continue;
    
    try {
      const regex = new RegExp(ap.grepPattern, 'gi');
      if (regex.test(code)) {
        if (ap.severity === 'CRITICAL') {
          errors.push(`[${ap.id}] ${ap.title}`);
        } else {
          warnings.push(`[${ap.id}] ${ap.title}`);
        }
      }
    } catch {
      // Regex inválida, ignorar
    }
  }

  return { errors, warnings };
}

export const CLIENT_SITES_PUBLIC_CONTRACT_V1 = {
  version: 'v1.1' as const,
  // v1.1 (2026-01-14): Adicionado checkout-v2-flow, booking-form-v2 (E.164, autofill/lock, nova aba)
  wrapperType: "{ success: boolean; data?: T; total?: number; error?: string; details?: string }",
  integrationGuides: [
    {
      title: 'Como integrar um site ao Rendizy (hoje)',
      notes: [
        'Este módulo é PUBLICO: não use X-Auth-Token no navegador. O site deve funcionar sem token.',
        'Existem 2 modos: (1) site servido pelo Rendizy (injeta helpers no HTML) e (2) site hospedado externamente (fetch direto na API pública).',
        'A API pública aceita os paths /client-sites/* e /rendizy-public/client-sites/* (compat).',
        'Contrato estável hoje: apenas imóveis (properties). O endpoint site-config pode existir como beta; trate como opcional e tenha fallback no front.',
        'Regra do contrato: o site SEMPRE exibe o título público usando o campo name (não usar identificadores internos do painel/admin).',
        '⚠️ CRÍTICO: NÃO use @supabase/supabase-js diretamente. O site é servido SEM variáveis de ambiente (VITE_SUPABASE_URL não existe). Se você usar createClient(...), o bundle vai crashar com "supabaseUrl is required". Use fetch() direto para a API pública.',
      ],
      codeBlocks: [
        {
          title: 'Modo 1 — quando o site é servido pelo Rendizy (recomendado)',
          language: 'ts',
          code: `// Quando servido por /client-sites/serve/:subdomain, o HTML injeta:
// - window.RENDIZY_CONFIG (API_BASE_URL, SUBDOMAIN, ORGANIZATION_ID, SITE_NAME)
// - window.RENDIZY.getProperties() (helper)

const result = await window.RENDIZY.getProperties();
if (result.success) {
  console.log('properties', result.data);
} else {
  console.error(result.error, result.details);
}`
        },
        {
          title: 'Modo 2 — site hospedado externamente (fetch direto)',
          language: 'ts',
          code: `// Base (Supabase Edge Function):
// https://<project-ref>.supabase.co/functions/v1/rendizy-public
// Exemplo (properties):
// https://<project-ref>.supabase.co/functions/v1/rendizy-public/client-sites/api/<subdomain>/properties

// Exemplo (site-config — opcional/beta):
// https://<project-ref>.supabase.co/functions/v1/rendizy-public/client-sites/api/<subdomain>/site-config

// Helpers de fetch
async function getProperties({ projectRef, subdomain }: { projectRef: string; subdomain: string }) {
  const url =
    'https://' +
    projectRef +
    '.supabase.co/functions/v1/rendizy-public/client-sites/api/' +
    encodeURIComponent(subdomain) +
    '/properties';
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  return json as { success: boolean; data?: unknown; total?: number; error?: string; details?: string };
}

async function getSiteConfig({ projectRef, subdomain }: { projectRef: string; subdomain: string }) {
  const url =
    'https://' +
    projectRef +
    '.supabase.co/functions/v1/rendizy-public/client-sites/api/' +
    encodeURIComponent(subdomain) +
    '/site-config';
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  return json as { success: boolean; data?: unknown; error?: string; details?: string };
}`
        },
        {
          title: 'Calendário (seletor de datas) — seleção por noites + preço por dia',
          notes: [
            'Regra: check-in é INCLUSIVO e check-out é EXCLUSIVO (seleção por noites).',
            'É permitido selecionar checkout em dia indisponível, desde que as noites ENTRE as datas estejam disponíveis.',
            'Exemplo válido: 21 → 22 (1 noite) mesmo que o dia 22 esteja reservado para outra entrada.',
            'Exibir preço por dia dentro da célula (ex.: R$ 480) usando availability[].price.',
            'Nunca calcule preço no front-end; sempre use o preço retornado pela API pública.'
          ],
          codeBlocks: [
            {
              title: 'Validação correta do range (end-exclusive)',
              language: 'ts',
              code: `function isRangeSelectable(days, checkIn, checkOut, minNights = 1) {
  if (!checkIn || !checkOut) return false;
  const diffDays = Math.round((checkOut - checkIn) / 86400000);
  if (diffDays < minNights) return false;

  // checkOut é exclusivo: validar APENAS as noites entre checkIn e checkOut
  for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = days.find(x => x.date === dateStr);
    if (!day || day.status !== 'available') return false;
  }
  return true;
}`
            }
          ]
        },
        {
          title: 'Wrapper (success/error) — exemplo real',
          language: 'json',
          code: `// Sucesso
{
  "success": true,
  "data": [/* properties */],
  "total": 12
}

// Erro
{
  "success": false,
  "error": "Site não encontrado",
  "details": "... opcional ..."
}`
        },
        {
          title: 'Property DTO (contrato público) — shape esperado (resumo)',
          language: 'ts',
          code: `type ClientSiteProperty = {
  id: string;
  // Título público do imóvel (o site deve exibir isso). Nunca use identificadores internos do admin.
  name: string;
  code: string | null;
  type: string | null;
  status: string | null;
  address: {
    city: string | null;
    state: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    zipCode: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  pricing: {
    // Preço canônico para diária (temporada). O front não deve recalcular nem buscar em campos internos.
    // ⚠️ IMPORTANTE: dailyRate pode ser 0 em alguns casos. SEMPRE use fallback: dailyRate || basePrice
    // weeklyRate/monthlyRate podem ser derivados de discount_packages (global/override) quando não há valores explícitos no anúncio.
    dailyRate: number;
    basePrice: number;
    weeklyRate: number;
    monthlyRate: number;
    cleaningFee: number;  // Taxa de limpeza (valor real do banco)
    serviceFee: number;   // Taxa de serviço (valor real do banco)
    petFee: number;       // Taxa pet (valor real do banco)
    minNights: number;    // Mínimo de noites para reserva (default: 1)
    currency: string;
    // planned: salePrice
  };
  capacity: {
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    area: number | null;
  };
  description: string;
  shortDescription: string | null;
  // ⚠️ IMPORTANTE: URLs de fotos podem ser relativas ou absolutas.
  // Se não começar com http, prefixe com base do Supabase Storage.
  photos: string[];
  coverPhoto: string | null;
  tags: string[];
  // ⚠️ IMPORTANTE: Amenities podem vir em português ou inglês. O site deve traduzir/mapear.
  amenities: string[];
  createdAt: string;
  updatedAt: string;
};`
        },
        {
          title: 'CalendarDay DTO (contrato /calendar) — CRÍTICO PARA RESERVAS',
          language: 'ts',
          code: `// ⚠️ ATENÇÃO: O campo é "status" (string), NÃO "available" (boolean)!
type CalendarDay = {
  date: string;           // "2026-01-15" (YYYY-MM-DD)
  status: string;         // "available" | "blocked" | "reserved" ← STRING!
  price: number;          // 200 (dailyRate para este dia)
  minNights: number;      // 2 (mínimo de noites)
  propertyId: string;     // UUID do imóvel
};

// ❌ ERRO COMUM - NÃO FAÇA ISSO:
if (day.available) { ... }  // ← O campo "available" NÃO EXISTE!

// ✅ CORRETO - FAÇA ASSIM:
if (day.status === "available") { ... }

// Função para verificar disponibilidade de um range:
function isRangeAvailable(days: CalendarDay[], startDate: Date, endDate: Date): boolean {
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = days.find(x => x.date === dateStr);
    if (!day || day.status !== "available") {
      return false;
    }
  }
  return true;
}`
        }
      ]
    },
    {
      title: 'Login Social OAuth para Hóspedes (Google One Tap)',
      notes: [
        'O site pode ter uma área interna onde o hóspede faz login para ver suas reservas e dados.',
        'O login é feito via Google Sign-In (One Tap ou botão), sem senha.',
        'NÃO crie páginas locais de login/cadastro. O botão "Entrar" deve redirecionar para a cápsula /guest-area/?slug=SUBDOMAIN.',
        'Email/senha NÃO são suportados hoje. O fluxo é Google One Tap + cookies HttpOnly via /api/auth/*.',
        'O hóspede fica na tabela guest_users (separada de auth_users do painel).',
        'O site NÃO deve usar @supabase/supabase-js para auth. Use os endpoints REST.',
        '⚠️ IMPORTANTE: Use os endpoints /api/auth/* do Vercel, NÃO os do Supabase diretamente.',
        '⚠️ CRÍTICO: O login DEVE usar /api/auth/google para setar cookies HttpOnly.',
        'O script booking-v2.js depende desses cookies para autofill automático.',
      ],
      codeBlocks: [
        {
          title: 'Carregar Google Identity Services',
          language: 'html',
          code: `<!-- Adicionar no <head> do HTML -->
<script src="https://accounts.google.com/gsi/client" async defer></script>`
        },
        {
          title: 'Inicializar Google One Tap',
          language: 'ts',
          code: `// Configuração do Google Sign-In
const GOOGLE_CLIENT_ID = '1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com';

function initGoogleOneTap(onSuccess: (credential: string) => void) {
  if (!window.google?.accounts?.id) {
    console.error('Google Identity Services não carregado');
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (response.credential) {
        onSuccess(response.credential);
      }
    },
    auto_select: true,
    cancel_on_tap_outside: false,
  });

  // Exibir One Tap popup
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed()) {
      console.log('One Tap não exibido:', notification.getNotDisplayedReason());
    }
  });
}`
        },
        {
          title: '⚠️ CRÍTICO: Enviar credential via endpoint do VERCEL (seta cookie)',
          language: 'ts',
          code: `// ⚠️ IMPORTANTE: Use /api/auth/google do VERCEL, não o endpoint do Supabase!
// Este endpoint seta cookies HttpOnly que o booking-v2.js usa para autofill.

async function loginWithGoogle(credential: string, siteSlug: string) {
  // ✅ CORRETO: Endpoint do Vercel (seta cookie)
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // ⚠️ OBRIGATÓRIO para cookies
    body: JSON.stringify({ credential, siteSlug }),
  });

  const result = await response.json();

  if (result.success) {
    // O cookie foi setado automaticamente pelo servidor
    // Salvar guest em localStorage para exibição imediata na UI
    localStorage.setItem('rendizy_guest', JSON.stringify(result.guest));
    console.log('Login OK:', result.guest.email);
    return result;
  } else {
    console.error('Login falhou:', result.error);
    throw new Error(result.error);
  }
}

// Verificar se está logado (lê cookie via servidor)
async function checkAuth(siteSlug: string) {
  const response = await fetch('/api/auth/me?siteSlug=' + encodeURIComponent(siteSlug), {
    credentials: 'include',  // ⚠️ OBRIGATÓRIO
  });
  const result = await response.json();
  return result.authenticated ? result.user : null;
}

// Logout (limpa cookies)
async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  localStorage.removeItem('rendizy_guest');
  google.accounts.id.disableAutoSelect();
  window.location.reload();
}`
        }
      ]
    }
  ] satisfies ClientSitesCatalogIntegrationGuide[],
  endpoints: [
    {
      id: 'serve-site',
      title: 'Site (HTML) — redirect para Storage dist/index.html',
      method: 'GET',
      pathTemplate: '/client-sites/serve/:subdomain',
      stability: 'stable',
      notes: [
        'Usado para servir o site (index.html) sem expor Storage diretamente.',
        'Em produção, o Vercel proxy pode ser usado como camada adicional para assets/HTML.'
      ]
    },
    {
      id: 'properties',
      title: 'Imóveis (lista pública) — contrato estável',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/properties',
      stability: 'stable',
      notes: [
        'No site, o acesso recomendado é via window.RENDIZY.getProperties() (quando servido pelo Rendizy).',
        'Este endpoint deve manter compatibilidade retroativa: campos ausentes devem ter fallback no backend.'
      ]
    },
    {
      id: 'site-config',
      title: 'Config do Site (branding, contato, features) — planejado',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/site-config',
      stability: 'planned',
      notes: [
        'Objetivo: evitar “hardcode” de contato/logo/tema no bundle do site.',
        'Retorna apenas dados públicos (sem segredos/tokens).',
        'Status: pode existir como beta em alguns ambientes; trate como opcional e tenha fallback no front.'
      ]
    },
    {
      id: 'availability-pricing',
      title: 'Disponibilidade + preço por dia (calendário) — estável',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/properties/:propertyId/availability?from=YYYY-MM-DD&to=YYYY-MM-DD',
      stability: 'stable',
      notes: [
        'Retorna disponibilidade por dia (available/blocked/reserved) + preço base por dia (dailyRate) para exibição no calendário.',
        'Importante: preço por dia NÃO é o “total da reserva”. Taxa de limpeza, desconto por pacote de noites, taxas/serviço são composição do total e exigem um endpoint de quote (planejado).',
        'Blocks com subtype=reservation contam como reserved (ex: iCal) — não trate como “bloqueio manual”.'
      ]
    },    {
      id: 'calendar',
      title: 'Calendário (alias para disponibilidade) — estável',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/calendar?propertyId=UUID&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      stability: 'stable',
      notes: [
        'Alias do endpoint /availability com parâmetros via query string (compatibilidade com sites Bolt.new).',
        'Retorna: { success: true, data: { days: [{ date, status, price, minNights, propertyId }] } } — segue wrapperType padrão.',
        '⚠️ IMPORTANTE: status é STRING ("available" | "blocked" | "reserved"), NÃO booleano!',
        '❌ ERRADO: if (day.available) { ... } — o campo "available" NÃO EXISTE!',
        '✅ CORRETO: if (day.status === "available") { ... }',
        'Headers: Cache-Control: no-cache, no-store, must-revalidate (dados sempre frescos).',
        '⚠️ PROIBIDO usar dados mock no cliente. O site DEVE chamar este endpoint para disponibilidade real.',
        '❌ ANTI-PATTERN: Funções que geram bloqueios baseados em Date.now() + X dias são PROIBIDAS.',
        '❌ ANTI-PATTERN: Arrays estáticos de datas bloqueadas no código são PROIBIDOS.',
        '✅ CORRETO: Sempre fazer fetch() para /calendar e usar os dados retornados.'
      ]
    },    {
      id: 'lead-create',
      title: 'Leads/Contato (form do site) — planejado',
      method: 'POST',
      pathTemplate: '/client-sites/api/:subdomain/leads',
      stability: 'planned',
      notes: [
        'Objetivo: padronizar captura de leads (nome, email, telefone, mensagem, propertyId opcional).',
        'Deve ter anti-abuso (rate limit/captcha) e validação server-side.'
      ]
    },
    {
      id: 'reservation-create',
      title: 'Criar Reserva (via site) — estável',
      method: 'POST',
      pathTemplate: '/client-sites/api/:subdomain/reservations',
      stability: 'stable',
      notes: [
        'Cria reserva real no banco com status "pending" e payment_status="pending".',
        'Campos obrigatórios: propertyId, checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), guestName.',
        'Campos opcionais: guests (número), guestEmail, guestPhone, message.',
        'Retorna: id, reservationCode, totalPrice, currency, status, payment_status, payment_expires_at, message.',
        'Valida disponibilidade antes de criar (retorna 409 se conflito com reserva/bloqueio existente).',
        'Valida minNights: retorna 400 se número de noites < mínimo exigido para o imóvel.',
        'O preço total inclui: (dailyRate × nights) + cleaningFee + serviceFee (taxas reais do banco).',
        '',
        '## ⚠️ MENSAGENS OBRIGATÓRIAS (UI)',
        '',
        '❌ ERRADO: Mostrar "Reserva Criada!" ou "Reserva Confirmada!" antes do pagamento',
        '✅ CORRETO: Mostrar "Pré-Reserva Criada - Aguardando Pagamento" antes do pagamento',
        '',
        'A reserva SÓ está confirmada APÓS o pagamento. Antes disso é uma PRÉ-RESERVA.',
        '',
        'Mensagens corretas por estado:',
        '  - Após criar reserva (sem pagar): "Pré-Reserva Criada - Aguardando Pagamento"',
        '  - Após pagamento confirmado: "Reserva Confirmada!"',
        '  - Se pagamento expirar: "Pré-Reserva Expirada"',
        '',
        '⏱️ Sistema de Pré-Reservas (timeout):',
        '  - Reservas criadas ficam com payment_status="pending" aguardando pagamento.',
        '  - payment_expires_at define o prazo máximo para pagamento (configurável pela organização).',
        '  - Se o pagamento não for feito até o prazo, a reserva é cancelada automaticamente pelo cron.',
        '  - Após pagamento confirmado (webhook Stripe/Pagar.me), status muda para "confirmed".',
        '  - O site deve exibir o prazo de pagamento ao hóspede.'
      ]
    },
    {
      id: 'calculate-price',
      title: 'Calcular Preço (antes de reservar) — estável',
      method: 'POST',
      pathTemplate: '/client-sites/api/:subdomain/calculate-price',
      stability: 'stable',
      notes: [
        'Calcula o preço detalhado ANTES de criar a reserva (para exibir breakdown ao usuário).',
        'Campos obrigatórios: propertyId, checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD).',
        'Retorna breakdown: { pricePerNight, nightsTotal, cleaningFee, serviceFee }, total, minNights.',
        'Valida minNights: retorna 400 com minNightsRequired e nightsRequested se violado.',
        '⚠️ OBRIGATÓRIO usar este endpoint para exibir preços no site, NUNCA calcular manualmente.',
        '❌ PROIBIDO: Inventar taxa de limpeza, taxa de serviço ou outros valores no front-end.',
        '✅ CORRETO: Chamar calculate-price e exibir breakdown.cleaningFee, breakdown.serviceFee, etc.'
      ]
    },
    {
      id: 'checkout-session',
      title: 'Checkout Multi-Gateway (pagamento) — estável',
      method: 'POST',
      pathTemplate: '/client-sites/api/:subdomain/checkout/session',
      stability: 'stable',
      notes: [
        'Cria sessão de checkout no gateway selecionado (Stripe ou Pagar.me).',
        'Campos obrigatórios: reservationId (UUID da reserva criada), successUrl, cancelUrl.',
        'Campo opcional: paymentMethod (formato "gateway:method", ex: "stripe:credit_card", "pagarme:pix").',
        'Se paymentMethod omitido, usa gateway com maior prioridade configurada.',
        'Retorna: sessionId/orderId, checkoutUrl, amount, currency, reservationId, gateway, paymentMethod.',
        'Para PIX (Pagar.me): retorna também pixQrCode, pixQrCodeUrl.',
        'Para Boleto (Pagar.me): retorna também boletoUrl, boletoBarcode.',
        'O site deve redirecionar o hóspede para checkoutUrl após receber a resposta.',
        '⚠️ IMPORTANTE: Usar em conjunto com GET /payment-methods para listar opções disponíveis.',
        'Fluxo típico: 1) calculate-price → 2) reservations → 3) payment-methods → 4) checkout/session → 5) redirect.'
      ]
    },
    {
      id: 'payment-methods',
      title: 'Métodos de Pagamento Disponíveis — estável',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/payment-methods',
      stability: 'stable',
      notes: [
        'Retorna os métodos de pagamento habilitados para a organização.',
        'Usado para exibir opções ao hóspede antes do checkout (radio buttons).',
        'Retorna: { methods: [{id, label, gateway, icon}], gateways: [{id, name, enabled, priority, methods}], hasPaymentEnabled }.',
        'Cada method.id está no formato "gateway:method" (ex: "stripe:credit_card", "pagarme:pix").',
        'O site deve chamar este endpoint ao iniciar fluxo de pagamento.',
        'Se hasPaymentEnabled=false, o site pode omitir botão de pagamento ou mostrar "Entre em contato".'
      ]
    },
    {
      id: 'auth-guest-google',
      title: 'Login Social Google (OAuth) — estável',
      method: 'POST',
      pathTemplate: '/client-sites/api/:subdomain/auth/guest/google',
      stability: 'stable',
      notes: [
        'Autentica hóspede via Google Sign-In (One Tap ou botão).',
        'Campos obrigatórios: credential (ID token do Google retornado pelo Sign-In).',
        'Retorna: { success: true, token, guest: { id, email, name, avatar_url } }.',
        'O token JWT retornado deve ser salvo em localStorage e enviado como Authorization: Bearer <token> em chamadas autenticadas.',
        'Cria hóspede na tabela guest_users se não existir, ou atualiza last_login_at se já existir.',
        'Usado para área interna do site (minhas reservas, histórico, dados do hóspede).',
        '⚠️ IMPORTANTE: Google Client ID deve estar configurado no Supabase Edge Functions (.env).'
      ]
    },
    {
      id: 'auth-guest-me',
      title: 'Dados do Hóspede Logado — estável',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/auth/guest/me',
      stability: 'stable',
      notes: [
        'Retorna dados do hóspede autenticado.',
        'Requer header Authorization: Bearer <token> (JWT retornado pelo login).',
        'Retorna: { success: true, guest: { id, email, name, phone, avatar_url } }.',
        'Usado para exibir perfil do hóspede na área interna do site.',
        'Retorna 401 se token inválido ou expirado.'
      ]
    },
    {
      id: 'reservations-mine',
      title: 'Reservas do Hóspede Logado — estável',
      method: 'GET',
      pathTemplate: '/client-sites/api/:subdomain/reservations/mine',
      stability: 'stable',
      notes: [
        'Retorna lista de reservas do hóspede autenticado.',
        'Requer header Authorization: Bearer <token> (JWT retornado pelo login).',
        'Busca por guest_id do token OU guest_email (para reservas criadas antes do login).',
        'Retorna: { success: true, data: [Reservation], total: number }.',
        '',
        'Cada reserva inclui:',
        '  - id, reservationCode, checkIn, checkOut, guests',
        '  - status: "pending" | "confirmed" | "cancelled" | "completed"',
        '  - paymentStatus: "pending" | "paid" | "expired" | "refunded"',
        '  - paymentExpiresAt: timestamp para reservas pendentes',
        '  - totalPrice, currency',
        '  - property: { id, name, coverPhoto, city, state }',
        '',
        'Usado para área interna do site (minhas reservas).',
        'Retorna 401 se token inválido ou expirado.',
        'Ordenado por check_in DESC (mais recentes primeiro).'
      ]
    }
  ] satisfies ClientSitesCatalogEndpoint[],

  propertyFieldGroups: [
    {
      title: 'Identidade',
      fields: ['id', 'name', 'code', 'type', 'status'],
      notes: [
        'name é o título público do imóvel (exibido no site). Nunca renderize “nome interno”/identificação administrativa.',
        'code é opcional e serve como código/identificador auxiliar (não é título).'
      ]
    },
    {
      title: 'Endereço',
      fields: [
        'address.city',
        'address.state',
        'address.street',
        'address.number',
        'address.neighborhood',
        'address.zipCode',
        'address.country',
        'address.latitude',
        'address.longitude'
      ]
    },
    {
      title: 'Capacidade',
      fields: ['capacity.bedrooms', 'capacity.bathrooms', 'capacity.maxGuests', 'capacity.area'],
      notes: ['O backend deve derivar capacity.maxGuests quando vier ausente/0.']
    },
    {
      title: 'Preço',
      fields: [
        'pricing.dailyRate',
        'pricing.basePrice',
        'pricing.weeklyRate',
        'pricing.monthlyRate',
        'pricing.cleaningFee',
        'pricing.serviceFee',
        'pricing.petFee',
        'pricing.minNights',
        'pricing.salePrice (planned)',
        'pricing.currency'
      ],
      notes: [
        'pricing.dailyRate é o campo canônico para valor diário (compatível com sites).',
        'Para anúncios vindos do Anúncio Ultimate, o backend deriva pricing.dailyRate a partir de preco_base_noite (fonte de verdade do admin).',
        'pricing.cleaningFee é a taxa de limpeza (taxa_limpeza no admin).',
        'pricing.serviceFee é a taxa de serviços extras (taxa_servicos_extras no admin).',
        'pricing.petFee é a taxa pet (taxa_pet no admin).',
        'pricing.minNights é o mínimo de noites para reserva (default: 1).',
        '⚠️ IMPORTANTE: O site DEVE usar os valores REAIS de taxas retornados pela API, NUNCA inventar/mockar valores.',
        'Locação residencial: preferir pricing.monthlyRate (mensal).',
        'Venda: será padronizado em pricing.salePrice (planejado). Até lá, alguns fluxos usam basePrice como fallback.',
        'pricing.basePrice deve permanecer por compatibilidade com templates antigos.'
      ]
    },
    {
      title: 'Conteúdo',
      fields: ['description', 'shortDescription', 'photos[]', 'coverPhoto', 'tags[]', 'amenities[]']
    }
  ] satisfies ClientSitesCatalogFieldGroup[],

  siteConfigFieldGroups: [
    {
      title: 'Identidade do Site',
      fields: ['siteName', 'subdomain', 'domain?']
    },
    {
      title: 'Branding',
      fields: ['theme.primaryColor', 'theme.secondaryColor', 'theme.accentColor', 'theme.fontFamily', 'logo?', 'favicon?'],
      notes: [
        'A UI interna pode ter mais opções; o contrato público deve ser minimalista e estável.',
        'Não expor URLs internas sensíveis; preferir URLs públicas (Storage/CDN).'
      ]
    },
    {
      title: 'Conteúdo do Site',
      fields: ['siteConfig.title', 'siteConfig.description', 'siteConfig.slogan?']
    },
    {
      title: 'Contato',
      fields: [
        'siteConfig.contactEmail',
        'siteConfig.contactPhone',
        'siteConfig.socialMedia.facebook?',
        'siteConfig.socialMedia.instagram?',
        'siteConfig.socialMedia.whatsapp?'
      ]
    },
    {
      title: 'Features',
      fields: ['features.shortTerm', 'features.longTerm', 'features.sale']
    }
  ] satisfies ClientSitesCatalogFieldGroup[]
};

export const CLIENT_SITES_BLOCKS_CATALOG = [
  {
    id: 'site-header',
    title: 'Header (Topo do Site)',
    stability: 'stable',
    description: 'Topo com logo + navegação. Sem lógica de dados de imóveis.',
    usesEndpoints: ['site-config'],
    requiredFields: ['siteConfig.title', 'logo?'],
    notes: [
      'Configurável: links do menu, logo (ou fallback para texto).',
      'Fixo: não pode depender de endpoints privados.'
    ]
  },
  {
    id: 'site-footer',
    title: 'Footer (Rodapé)',
    stability: 'stable',
    description: 'Rodapé com contato e redes sociais.',
    usesEndpoints: ['site-config'],
    requiredFields: ['siteConfig.contactEmail', 'siteConfig.contactPhone', 'siteConfig.socialMedia.*?'],
    notes: ['Configurável: textos/links. Fixo: sem dados privados.']
  },
  {
    id: 'hero',
    title: 'Hero (Capa) com CTA',
    stability: 'stable',
    description: 'Seção inicial com título/descrição e CTA para rolar até a listagem.',
    usesEndpoints: ['site-config'],
    requiredFields: ['siteConfig.title', 'siteConfig.description'],
    notes: ['Configurável: imagem/cta/textos.']
  },
  {
    id: 'properties-grid',
    title: 'Listagem de Imóveis',
    stability: 'stable',
    description: 'Grid/lista com cards de imóveis, consumindo o contrato público de properties.',
    usesEndpoints: ['properties'],
    requiredFields: [
      'id',
      'name',
      'address.city',
      'address.state',
      'pricing.dailyRate (ou pricing.basePrice)',
      'pricing.currency',
      'capacity.maxGuests',
      'coverPhoto (fallback: photos[0])'
    ],
    notes: [
      'Filtros/busca são no front-end, usando a lista retornada.',
      'Configurável: ordenação, layout do card (variações), labels.',
      'Modalidades: pode exibir labels/flags conforme features.shortTerm/longTerm/sale (siteConfig).',
      'Fixo: não inventar campos; usar apenas o contrato público.'
    ]
  },
  {
    id: 'modality-switcher',
    title: 'Seletor de Modalidade (Temporada / Locação / Venda)',
    stability: 'planned',
    description:
      'Controle para alternar o foco do site entre modalidades habilitadas, mudando labels e qual preço é exibido.',
    usesEndpoints: ['site-config'],
    requiredFields: ['features.shortTerm', 'features.longTerm', 'features.sale'],
    notes: [
      'Planejado porque o site precisa de um SiteConfig público estável (hoje pode estar embutido no bundle).',
      'Regra: o seletor só mostra modalidades habilitadas no site.'
    ]
  },
  {
    id: 'pricing-display-by-modality',
    title: 'Preço (por modalidade) — Diária / Mensal / Venda',
    stability: 'planned',
    description:
      'Componente/bloco que decide qual preço mostrar dependendo do contexto: diária (temporada), mensal (locação residencial) ou venda.',
    usesEndpoints: ['properties', 'site-config'],
    requiredFields: [
      'pricing.dailyRate (temporada)',
      'pricing.monthlyRate (locação residencial)',
      'pricing.salePrice (venda — planned)',
      'pricing.currency'
    ],
    notes: [
      'Hoje: dailyRate/basePrice já existe no DTO público; monthlyRate existe, mas pode ser apenas derivado (daily*30).',
      'Planejado: expor salePrice no DTO público e garantir monthlyRate canônico (mensal real), não derivado.'
    ]
  },
  {
    id: 'rent-pricing-panel',
    title: 'Preço de Locação Residencial',
    stability: 'stable',
    modalities: ['locacao'],
    description:
      'Bloco de preço mensal + custos recorrentes (quando disponíveis) para locação residencial.',
    usesEndpoints: ['properties', 'site-config'],
    requiredFields: [
      'pricing.monthlyRate',
      'pricing.currency',
      'features.longTerm'
    ],
    notes: [
      'Exibir aluguel mensal usando pricing.monthlyRate (fallback: pricing.basePrice quando mensal não existir).',
      'Se existirem custos recorrentes (IPTU/condomínio/taxas), exibir como breakdown. Se não existir, ocultar.',
      'Não use checkout/reservas para locação residencial; use CTA de contato/leads.'
    ]
  },
  {
    id: 'sale-pricing-panel',
    title: 'Preço de Venda',
    stability: 'stable',
    modalities: ['venda'],
    description:
      'Bloco de preço de venda e informações básicas para compra e venda.',
    usesEndpoints: ['properties', 'site-config'],
    requiredFields: [
      'pricing.salePrice (planned) OR pricing.basePrice (fallback)',
      'pricing.currency',
      'features.sale'
    ],
    notes: [
      'Preferir pricing.salePrice quando disponível; se ausente, usar pricing.basePrice como fallback.',
      'Se houver campos extras (ex.: IPTU anual), exibir como informação adicional; se ausente, ocultar.',
      'Não use checkout/reservas para venda; use CTA de contato/leads.'
    ]
  },
  {
    id: 'property-card',
    title: 'Card de Imóvel (reutilizável)',
    stability: 'stable',
    description: 'Card padrão para ser usado em grid/lista/carrossel.',
    usesEndpoints: ['properties'],
    requiredFields: [
      'id',
      'name',
      'coverPhoto (fallback: photos[0])',
      'address.city',
      'address.state',
      'pricing.dailyRate (ou pricing.basePrice)',
      'pricing.currency'
    ],
    notes: ['Fixo: cálculo de preço é do backend (dailyRate/basePrice).']
  },
  {
    id: 'property-detail',
    title: 'Detalhe do Imóvel',
    stability: 'stable',
    description: 'Página de detalhes: galeria, infos, CTA de contato (WhatsApp/form).',
    usesEndpoints: ['properties'],
    requiredFields: [
      'id',
      'name',
      'description',
      'photos[]',
      'coverPhoto',
      'pricing.dailyRate (ou pricing.basePrice)',
      'pricing.currency',
      'capacity.bedrooms',
      'capacity.bathrooms',
      'capacity.maxGuests',
      'address.*'
    ],
    notes: [
      'Fixo: o site não deve depender de formato interno do anúncios_ultimate, apenas do DTO público.',
      'Configurável: ordem/visibilidade de seções (galeria, amenities, mapa, etc.).'
    ]
  },
  {
    id: 'property-gallery',
    title: 'Galeria de Fotos',
    stability: 'stable',
    description: 'Galeria/carrossel de fotos do imóvel, com capa e thumbnails.',
    usesEndpoints: ['properties'],
    requiredFields: ['photos[]', 'coverPhoto'],
    notes: ['Fixo: coverPhoto deve existir; fallback para photos[0] deve ser garantido no backend.']
  },
  {
    id: 'property-amenities',
    title: 'Comodidades',
    stability: 'stable',
    description: 'Lista de amenities/benefícios do imóvel.',
    usesEndpoints: ['properties'],
    requiredFields: ['amenities[]'],
    notes: ['Configurável: ícones/labels locais. Fixo: não inventar novos campos.']
  },
  {
    id: 'property-map',
    title: 'Mapa do Imóvel',
    stability: 'stable',
    description: 'Mapa usando latitude/longitude quando disponível (ou fallback por cidade/bairro).',
    usesEndpoints: ['properties'],
    requiredFields: ['address.latitude?', 'address.longitude?', 'address.city', 'address.state'],
    notes: ['Fixo: não expor endereço completo se o cliente não quiser (pode ocultar rua/número).']
  },
  {
    id: 'contact-cta',
    title: 'CTA de Contato',
    stability: 'stable',
    description: 'Botões/ações para WhatsApp/telefone/email e/ou formulário de contato.',
    usesEndpoints: ['site-config', 'lead-create'],
    requiredFields: ['siteConfig.socialMedia.whatsapp? OR siteConfig.contactPhone', 'lead payload (planned)'],
    notes: [
      'Hoje: pode funcionar só com link WhatsApp (sem backend).',
      'Planejado: enviar lead via endpoint público padronizado.'
    ]
  },
  {
    id: 'calendar-daily-pricing',
    title: 'Seletor de Datas (Calendário) com Preço por Dia',
    stability: 'stable',
    description:
      'Calendário que mostra preço em cada dia e permite selecionar intervalo. O preço deve vir da lógica do Rendizy.',
    usesEndpoints: ['availability-pricing'],
    requiredFields: ['availability[].state', 'availability[].date', 'availability[].price', 'pricing.dailyRate'],
    notes: [
      'Quando este bloco estiver ativo, o site não deve calcular preço no front-end.',
      'Regra: o backend é a fonte de verdade (evita divergências entre sites).',
      'Nota: o bloco exibe preço por dia; o total da reserva (limpeza/descontos) é outro contrato (planejado).',
      '',
      '## 🚨 REGRAS OBRIGATÓRIAS DO CALENDÁRIO (NÃO PULE NENHUMA!)',
      '',
      '### 1️⃣ LAYOUT: Modal centralizado com overlay',
      '- O calendário DEVE abrir como MODAL no centro da tela',
      '- Usar overlay escuro (bg-black/50) que fecha ao clicar',
      '- Container com max-w-4xl para ter espaço',
      '- NÃO usar dropdown/absolute espremido em container pequeno',
      '',
      '### 2️⃣ ESTRUTURA: 2 meses lado a lado',
      '- Exibir 2 meses simultaneamente (mês atual + próximo)',
      '- Layout responsivo: flex-col em mobile, flex-row em desktop',
      '- Setas de navegação para avançar/voltar meses',
      '',
      '### 3️⃣ CÉLULA: Preço obrigatório em cada dia',
      '- Cada célula DEVE mostrar: número do dia + preço',
      '- Formato: "20" em cima, "R$ 480" embaixo',
      '- Tamanho mínimo: h-16 para caber os dois textos',
      '- Só exibir preço se status === "available" && price > 0',
      '',
      '### 4️⃣ DATAS PASSADAS: Visualmente bloqueadas',
      '- Fundo: bg-gray-50 (cinza claro)',
      '- Texto: text-gray-300 (bem claro)',
      '- Cursor: cursor-not-allowed',
      '- Clique: ignorado',
      '- Preço: NÃO exibir',
      '',
      '### 5️⃣ LEGENDA: Indicadores visuais',
      '- 🟢 Disponível (verde ou cor de destaque)',
      '- ⬜ Indisponível/Bloqueado (cinza)',
      '- 🔵 Selecionado (azul ou cor primária)',
      '',
      '## 📋 CÓDIGO DE REFERÊNCIA OBRIGATÓRIO',
      '',
      '```typescript',
      '// types/rendizy.ts',
      'export interface CalendarDay {',
      '  date: string;      // "2026-01-20"',
      '  status: "available" | "blocked" | "reserved";',
      '  price: number;     // 480 (preço do dia)',
      '  minNights: number;',
      '  propertyId: string;',
      '}',
      '',
      '// services/rendizy.ts - Buscar calendário da API',
      'export async function fetchCalendar(',
      '  propertyId: string,',
      '  startDate: string,',
      '  endDate: string',
      '): Promise<ApiResponse<CalendarDay[]>> {',
      '  const url = getApiUrl(`/calendar?propertyId=${propertyId}&startDate=${startDate}&endDate=${endDate}`);',
      '  const response = await fetch(url);',
      '  return response.json();',
      '}',
      '',
      '// components/DateRangePicker.tsx - Funções obrigatórias',
      'const getDayStatus = (dateStr: string): "available" | "blocked" | "reserved" | "past" => {',
      '  const today = new Date();',
      '  today.setHours(0, 0, 0, 0);',
      '  if (new Date(dateStr + "T00:00:00") < today) return "past";',
      '  const day = calendarData.find(d => d.date === dateStr);',
      '  return day?.status || "blocked";',
      '};',
      '',
      'const getDayPrice = (dateStr: string): number => {',
      '  const day = calendarData.find(d => d.date === dateStr);',
      '  return day?.price || 0;',
      '};',
      '',
      '// Renderizar célula do dia (MODELO OBRIGATÓRIO)',
      'const renderDayCell = (dateStr: string, dayNumber: number) => {',
      '  const status = getDayStatus(dateStr);',
      '  const price = getDayPrice(dateStr);',
      '  const isPast = status === "past";',
      '  const isUnavailable = isPast || status === "blocked" || status === "reserved";',
      '',
      '  // Classes condicionais',
      '  let className = "h-16 border flex flex-col items-center justify-center text-sm";',
      '  if (isPast) {',
      '    className += " bg-gray-50 text-gray-300 cursor-not-allowed";',
      '  } else if (isUnavailable) {',
      '    className += " bg-gray-100 text-gray-400 cursor-not-allowed";',
      '  } else {',
      '    className += " cursor-pointer hover:bg-blue-50";',
      '  }',
      '',
      '  return (',
      '    <div className={className} onClick={() => !isUnavailable && handleDateClick(dateStr)}>',
      '      <span className="font-semibold">{dayNumber}</span>',
      '      {/* 👇 OBRIGATÓRIO: Preço na célula */}',
      '      {status === "available" && price > 0 && (',
      '        <span className="text-xs text-green-600 mt-1">R$ {price}</span>',
      '      )}',
      '    </div>',
      '  );',
      '};',
      '',
      '// Modal centralizado (ESTRUTURA OBRIGATÓRIA)',
      '{isOpen && (',
      '  <>',
      '    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />',
      '    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">',
      '      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">',
      '        {/* Navegação */}',
      '        <div className="flex items-center justify-between mb-6">',
      '          <button onClick={prevMonth}><ChevronLeft /></button>',
      '          <h2>Selecione as datas</h2>',
      '          <button onClick={nextMonth}><ChevronRight /></button>',
      '        </div>',
      '        {/* 2 meses lado a lado */}',
      '        <div className="flex flex-col md:flex-row gap-6">',
      '          {renderMonth(0)}',
      '          {renderMonth(1)}',
      '        </div>',
      '        {/* Legenda */}',
      '        <div className="mt-6 flex justify-between border-t pt-4">',
      '          <div className="flex gap-4 text-sm">',
      '            <span>🟢 Disponível</span>',
      '            <span>⬜ Indisponível</span>',
      '            <span>🔵 Selecionado</span>',
      '          </div>',
      '          <button onClick={() => setIsOpen(false)}>Fechar</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </>',
      ')}',
      '```',
      '',
      '## ⚠️ VALIDAÇÃO DE MÍNIMO DE NOITES',
      '',
      'Se o usuário selecionar menos noites que o mínimo exigido:',
      '  1. Exibir mensagem de erro VISUAL no formulário (vermelho)',
      '  2. Mensagem: "Mínimo de X noites para este imóvel"',
      '  3. Botão de reserva DESABILITADO até corrigir',
      '  4. Preço total NÃO exibido (ou zerado)',
      '',
      '```typescript',
      'const minNights = property.pricing.minNights || 1;',
      'const nights = Math.ceil((checkOut - checkIn) / 86400000);',
      'const isBelowMin = nights > 0 && nights < minNights;',
      '// Se isBelowMin, mostrar erro e desabilitar submit',
      '```'
    ]
  },
  {
    id: 'booking-form',
    title: 'Formulário de Reserva',
    stability: 'stable',
    description:
      'Formulário para criar reservas diretamente do site público. Integra com calendário de disponibilidade.',
    usesEndpoints: ['availability-pricing', 'reservation-create'],
    requiredFields: [
      'propertyId',
      'checkIn (YYYY-MM-DD)',
      'checkOut (YYYY-MM-DD)',
      'guestName',
      'guestEmail (opcional)',
      'guestPhone (opcional)',
      'guests (opcional)',
      'message (opcional)'
    ],
    notes: [
      'Fluxo recomendado: (1) usuário seleciona datas no calendário, (2) valida disponibilidade via availability, (3) preenche formulário, (4) envia via POST /reservations.',
      'O endpoint valida novamente a disponibilidade antes de criar (retorna 409 se conflito).',
      'Preço total = dailyRate × nights (calculado no backend).',
      'Resposta de sucesso inclui reservationCode para o usuário anotar.',
      'Reservas criadas ficam com status "pending" aguardando confirmação do admin.'
    ]
  },
  {
    id: 'stripe-checkout',
    title: 'Botão de Pagamento Stripe (legacy)',
    stability: 'stable',
    description:
      'Botão que cria sessão de checkout no Stripe e redireciona o usuário para pagamento. Usado após criar reserva.',
    usesEndpoints: ['checkout-session', 'reservation-create'],
    requiredFields: [
      'reservationId (UUID retornado pelo endpoint de reserva)',
      'successUrl (URL de sucesso após pagamento)',
      'cancelUrl (URL de cancelamento)'
    ],
    notes: [
      '⚠️ DEPRECADO: Preferir usar o bloco "payment-method-selector" para multi-gateway.',
      'Fluxo completo: (1) calculate-price → (2) reservation-create → (3) checkout-session → (4) redirect para Stripe.',
      'O endpoint retorna checkoutUrl do Stripe para onde o hóspede deve ser redirecionado.',
      'Após pagamento, o Stripe redireciona para successUrl (sucesso) ou cancelUrl (cancelamento).',
      'Webhook do Stripe atualiza o status da reserva automaticamente.'
    ]
  },
  {
    id: 'payment-method-selector',
    title: 'Seletor de Método de Pagamento (Multi-Gateway)',
    stability: 'stable',
    description:
      'Radio buttons que permitem o hóspede escolher como pagar: Cartão, PIX, Boleto, PayPal. O backend roteia para o gateway correto (Stripe ou Pagar.me).',
    usesEndpoints: ['payment-methods', 'checkout-session', 'reservation-create'],
    requiredFields: [
      'reservationId (UUID retornado pelo endpoint de reserva)',
      'successUrl (URL de sucesso após pagamento)',
      'cancelUrl (URL de cancelamento)',
      'paymentMethod (formato gateway:method, ex: stripe:credit_card, pagarme:pix)'
    ],
    notes: [
      'Fluxo recomendado:',
      '  1) GET /payment-methods → lista opções disponíveis',
      '  2) Exibir radio buttons: 💳 Cartão de Crédito, 📱 PIX, 📄 Boleto, etc.',
      '  3) Usuário seleciona método de pagamento',
      '  4) POST /checkout/session com paymentMethod selecionado',
      '  5) Redirecionar para checkoutUrl (Stripe/Pagar.me)',
      '',
      'Para PIX (Pagar.me): o response inclui pixQrCode e pixQrCodeUrl.',
      '  → Opção 1: Exibir QR code inline (melhor UX)',
      '  → Opção 2: Redirecionar para pixQrCodeUrl',
      '',
      'Para Boleto: o response inclui boletoUrl (PDF) e boletoBarcode.',
      '  → Exibir link para PDF e código de barras copiável.',
      '',
      '⚠️ IMPORTANTE: Só exibir métodos retornados por /payment-methods.',
      '⚠️ IMPORTANTE: Se hasPaymentEnabled=false, omitir seção de pagamento.',
      '',
      'Exemplo de response do /payment-methods:',
      '{',
      '  "methods": [',
      '    { "id": "stripe:credit_card", "label": "Cartão de Crédito", "gateway": "stripe", "icon": "💳" },',
      '    { "id": "pagarme:pix", "label": "PIX", "gateway": "pagarme", "icon": "📱" },',
      '    { "id": "pagarme:boleto", "label": "Boleto Bancário", "gateway": "pagarme", "icon": "📄" }',
      '  ],',
      '  "gateways": [...],',
      '  "hasPaymentEnabled": true',
      '}'
    ]
  },
  {
    id: 'guest-login-social',
    title: 'Login Social do Hóspede (Google One Tap)',
    stability: 'stable',
    description:
      'Área de login para hóspedes usando Google Sign-In (One Tap ou botão). Permite acessar histórico de reservas e dados pessoais.',
    usesEndpoints: ['auth-guest-google', 'auth-guest-me'],
    requiredFields: [
      'GOOGLE_CLIENT_ID (configurado no backend)',
      'credential (ID token do Google)'
    ],
    notes: [
      'Fluxo de login:',
      '  1) Carregar Google Identity Services (gsi client)',
      '  2) Inicializar google.accounts.id.initialize({ client_id, callback })',
      '  3) google.accounts.id.prompt() para exibir One Tap ou renderButton()',
      '  4) Callback recebe credential (ID token JWT)',
      '  5) POST /auth/guest/google com { credential }',
      '  6) Salvar token JWT retornado em localStorage',
      '  7) Usar token em Authorization: Bearer <token> para chamadas autenticadas',
      '',
      'Dados retornados pelo login:',
      '{',
      '  "success": true,',
      '  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",',
      '  "guest": {',
      '    "id": "uuid",',
      '    "email": "guest@example.com",',
      '    "name": "João Silva",',
      '    "avatar_url": "https://lh3.googleusercontent.com/..."',
      '  }',
      '}',
      '',
      '⚠️ IMPORTANTE: Usar componente GoogleOneTap.tsx ou SocialLoginButtons.tsx do Rendizy.',
      '⚠️ IMPORTANTE: O hóspede logado fica na tabela guest_users (separada de auth_users do painel).',
      '',
      'Exemplo de área interna pós-login:',
      '  - Minhas Reservas: listar reservas do hóspede',
      '  - Meu Perfil: exibir/editar dados pessoais',
      '  - Logout: limpar localStorage e recarregar página'
    ]
  },
  {
    id: 'guest-area-capsule',
    title: '🏠 Área Interna (CÁPSULA SEPARADA)',
    stability: 'stable',
    description:
      'A área interna é uma aplicação SEPARADA servida centralmente. Sites apenas redirecionam para ela.',
    usesEndpoints: [],
    requiredFields: [
      'siteSlug (passado via URL param)',
      'primaryColor (passado via URL param)',
      'secondaryColor (passado via URL param)',
      'accentColor (passado via URL param)',
    ],
    notes: [
      '## ⚠️ IMPORTANTE: ARQUITETURA CÁPSULA',
      '',
      'A Área Interna NÃO é código embutido no site!',
      'NÃO crie rota /login ou /cadastro no site. Sempre redirecione para a cápsula.',
      'Sempre passe o parâmetro slug na URL da cápsula (multi-tenant).',
      'É uma aplicação separada em:',
      '',
      '  https://rendizy2testesbackup.vercel.app/guest-area/',
      '',
      '## Como Integrar no Site',
      '',
      '```typescript',
      'const GUEST_AREA_URL = "https://rendizy2testesbackup.vercel.app/guest-area/";',
      '',
      'function GuestAreaButton({ siteConfig }) {',
      '  const handleClick = () => {',
      '    const params = new URLSearchParams({',
      '      slug: getRendizySubdomain(),',
      '      primary: encodeURIComponent(siteConfig?.theme?.primaryColor || "#3B82F6"),',
      '      secondary: encodeURIComponent(siteConfig?.theme?.secondaryColor || "#10B981"),',
      '      accent: encodeURIComponent(siteConfig?.theme?.accentColor || "#F59E0B"),',
      '    });',
      '    window.location.href = GUEST_AREA_URL + "?" + params.toString();',
      '  };',
      '  return <button onClick={handleClick}>👤 Área do Cliente</button>;',
      '}',
      '```',
      '',
      '## Vantagens da Cápsula',
      '  ✅ Um update afeta TODOS os sites',
      '  ✅ Bundle do site menor',
      '  ✅ Manutenção centralizada',
      '  ✅ Versionamento independente',
      '',
      '## ⛔ O que NÃO fazer',
      '  ❌ NÃO crie componentes GuestLayout dentro do site',
      '  ❌ NÃO crie rotas #/area-interna/* no site',
      '  ❌ NÃO implemente login/logout no site',
    ]
  },
  {
    id: 'guest-area-layout-deprecated',
    title: 'Layout da Área Interna (DEPRECATED - Use Cápsula)',
    stability: 'deprecated',
    description:
      'DEPRECATED: Use guest-area-capsule. Este bloco era para código embutido, agora usamos cápsula.',
    usesEndpoints: ['auth-guest-me', 'reservations-mine', 'site-config'],
    requiredFields: [],
    notes: [
      '## ⚠️ DEPRECATED',
      '',
      'Este bloco foi substituído por guest-area-capsule.',
      'Não crie mais código de área interna dentro do site.',
      'Use o botão de redirecionamento para a cápsula.',
    ]
  },
  {
    id: 'guest-area-layout',
    title: 'Layout da Área Interna do Hóspede (Whitelabel)',
    stability: 'deprecated',
    description:
      'DEPRECATED: Use guest-area-capsule. Layout completo para área logada do hóspede.',
    usesEndpoints: ['auth-guest-me', 'reservations-mine', 'site-config'],
    requiredFields: [
      'site-config.theme (cores)',
      'site-config.logo',
      'site-config.siteName',
      'guest token (localStorage)'
    ],
    notes: [
      '## ⚠️ DEPRECATED - Use guest-area-capsule',
      '',
      '## Estrutura de Rotas (antiga)',
      '  - #/area-interna → redirect para /area-interna/reservas se logado',
      '  - #/area-interna/reservas → Minhas Reservas',
      '  - #/area-interna/perfil → Meu Perfil',
      '  - #/login → Página de login (Google One Tap)',
      '',
      '## Layout Desktop',
      '  ┌─────────────────────────────────────────┐',
      '  │ [Logo]  ÁREA DO CLIENTE  [Avatar][Sair] │',
      '  ├─────────┬───────────────────────────────┤',
      '  │ 📋 Res. │     CONTEÚDO PRINCIPAL        │',
      '  │ 👤 Perf │                               │',
      '  │         │                               │',
      '  └─────────┴───────────────────────────────┘',
      '',
      '## Layout Mobile',
      '  ┌─────────────────────────┐',
      '  │ [≡] ÁREA DO CLIENTE [👤]│',
      '  ├─────────────────────────┤',
      '  │   CONTEÚDO PRINCIPAL    │',
      '  ├─────────────────────────┤',
      '  │  [📋]  [👤]  [⚙️]       │ ← Bottom nav',
      '  └─────────────────────────┘',
      '',
      '## Componentes',
      '  - GuestLayout.tsx: Layout principal com sidebar',
      '  - GuestSidebar.tsx: Menu lateral responsivo',
      '  - GuestHeader.tsx: Header com avatar e nome',
      '  - GuestGuard.tsx: HOC que redireciona se não logado',
      '  - GuestMobileNav.tsx: Navegação inferior mobile',
      '',
      '## Cores Whitelabel',
      '  const theme = {',
      '    "--primary": siteConfig.theme.primaryColor || "#3B82F6",',
      '    "--secondary": siteConfig.theme.secondaryColor || "#10B981",',
      '    "--accent": siteConfig.theme.accentColor || "#F59E0B",',
      '  };',
      '',
      '## Menu Items',
      '  const MENU_ITEMS = [',
      '    { id: "reservas", icon: "📋", label: "Minhas Reservas", path: "/area-interna/reservas" },',
      '    { id: "perfil", icon: "👤", label: "Meu Perfil", path: "/area-interna/perfil" },',
      '  ];',
      '',
      '⚠️ IMPORTANTE: Usar window.location.hash para navegação, NUNCA useNavigate().',
      '⚠️ IMPORTANTE: Checar token em localStorage antes de exibir área interna.'
    ]
  },
  {
    id: 'checkout-v2-flow',
    title: '🆕 Checkout v2 (Nova Aba + Webhook Confirm)',
    stability: 'stable',
    description:
      'Padrão Rendizy: checkout Stripe abre em NOVA ABA. Reserva nasce "pending". Confirmação é assíncrona via webhook. Aba original recebe notificação via BroadcastChannel/localStorage.',
    usesEndpoints: ['reservation-create', 'checkout-session'],
    requiredFields: [
      'successUrl = /api/checkout/success (domínio Rendizy)',
      'cancelUrl = /api/checkout/cancel (domínio Rendizy)',
      'Abrir checkout em nova aba (window.open)',
      'Escutar eventos cross-tab para confirmação'
    ],
    notes: [
      '## 🚨🚨🚨 REGRA CRÍTICA #1: Checkout em NOVA ABA 🚨🚨🚨',
      '',
      'O Stripe Checkout DEVE OBRIGATORIAMENTE abrir em NOVA ABA.',
      'NUNCA, EM HIPÓTESE ALGUMA, navegar na mesma aba.',
      '',
      '❌❌❌ PROIBIDO (NÃO FAÇA DE JEITO NENHUM):',
      '  window.location.href = checkoutUrl;        // PROIBIDO!',
      '  window.location.assign(checkoutUrl);       // PROIBIDO!',
      '  window.location.replace(checkoutUrl);      // PROIBIDO!',
      '  navigate(checkoutUrl);                     // PROIBIDO!',
      '',
      '✅✅✅ OBRIGATÓRIO (ÚNICA FORMA CORRETA):',
      '  window.open(checkoutUrl, "_blank");        // CORRETO!',
      '',
      '## 🚨🚨🚨 REGRA CRÍTICA #2: Mensagem Correta 🚨🚨🚨',
      '',
      '❌❌❌ PROIBIDO mostrar antes do pagamento:',
      '  "Reserva Criada!"                          // PROIBIDO!',
      '  "Reserva Confirmada!"                      // PROIBIDO!',
      '',
      '✅✅✅ OBRIGATÓRIO mostrar antes do pagamento:',
      '  "Pré-Reserva Criada - Aguardando Pagamento" // CORRETO!',
      '',
      'A reserva SÓ é "Confirmada" DEPOIS que o pagamento for processado.',
      '',
      '## 🚨🚨🚨 REGRA CRÍTICA #3: NUNCA DEIXE A TELA EM BRANCO 🚨🚨🚨',
      '',
      'Após abrir o checkout em NOVA ABA, a aba original DEVE permanecer intacta.',
      'É PROIBIDO limpar o DOM, usar document.write, navegar para URL vazia, ou forçar reload.',
      'Se quiser indicar progresso, mostre loader/toast, mas NÃO apague o conteúdo.',
      '',
      '## URLs de Retorno (OBRIGATÓRIO)',
      '',
      'O successUrl e cancelUrl DEVEM apontar para o domínio Rendizy:',
      '',
      '  successUrl: "https://rendizy2testesbackup.vercel.app/api/checkout/success?siteSlug={slug}&reservationId={id}"',
      '  cancelUrl: "https://rendizy2testesbackup.vercel.app/api/checkout/cancel?siteSlug={slug}&reservationId={id}"',
      '',
      '❌ ERRADO: successUrl: "#/pagamento-sucesso"',
      '✅ CORRETO: successUrl usando domínio Rendizy como acima',
      '',
      '## Fluxo de Confirmação',
      '',
      '1. Site cria reserva (status: pending, payment_status: pending)',
      '2. Site chama POST /checkout/session',
      '3. Site abre checkoutUrl em NOVA ABA: window.open(checkoutUrl, "_blank")',
      '4. Hóspede paga no Stripe (aba nova)',
      '5. Stripe redireciona para /api/checkout/success (domínio Rendizy)',
      '6. Página success faz polling até webhook confirmar',
      '7. Aba do success notifica aba original via BroadcastChannel/localStorage',
      '8. Aba original recebe evento e mostra toast "Reserva confirmada!"',
      '',
      '## Notificação Cross-Tab',
      '',
      'A aba original deve escutar eventos (PADRÃO OFICIAL):',
      '',
      '```typescript',
      'useEffect(() => {',
      '  const channel = new BroadcastChannel("rendizy_checkout_v1");',
      '  channel.onmessage = (e) => {',
      '    if (e.data?.type === "confirmed") {',
      '      showToast("Reserva confirmada!");',
      '      refreshReservations();',
      '    }',
      '  };',
      '  return () => channel.close();',
      '}, []);',
      '```',
      '',
      'E também deve ouvir o localStorage:',
      '  key: "rendizy_checkout_event"',
      '  type: "confirmed" | "canceled"',
      '',
      '## Link "Ver Reserva"',
      '',
      'Após confirmação, direcionar para a Guest Area:',
      '',
      '  https://rendizy2testesbackup.vercel.app/guest-area/#/reservas?focus={reservationId}'
    ]
  },
  {
    id: 'booking-form-v2',
    title: '🆕 Formulário de Reserva v2 (Autofill + Lock + E.164)',
    stability: 'stable',
    description:
      'Formulário de reserva com regras: telefone obrigatório com país/prefixo (E.164), autofill + lock quando hóspede logado.',
    usesEndpoints: ['reservation-create', 'auth-guest-me'],
    requiredFields: [
      'guestName (obrigatório)',
      'guestEmail (opcional, preenchido se logado)',
      'guestPhone (obrigatório, formato E.164 ex: +5511999999999)',
      'propertyId, checkIn, checkOut, guests'
    ],
    notes: [
      '## ⚠️ REGRAS CRÍTICAS DO FORMULÁRIO DE RESERVA',
      '',
      'O Rendizy INJETA um script (booking-v2.js) que adiciona funcionalidades automaticamente.',
      'Seu trabalho é criar APENAS a estrutura HTML correta. O script faz o resto.',
      '',
      '---',
      '',
      '### 🚫 O QUE NÃO CRIAR (quando site servido com script injetado):',
      '',
      '⚠️ ATENÇÃO: As regras abaixo só se aplicam quando o site é servido pelo Rendizy',
      'com o script booking-v2.js injetado. Para sites standalone (ZIP upload), você',
      'DEVE implementar essas funcionalidades manualmente.',
      '',
      '### ✅ O QUE VOCÊ DEVE CRIAR (SEMPRE, para todos os sites):',
      '',
      '#### Estrutura do formulário de reserva:',
      '',
      '1. **Campo Nome** - obrigatório, preenchido se hóspede logado, readonly quando autofill',
      '2. **Campo Email** - opcional, preenchido se hóspede logado, readonly quando autofill',
      '3. **Campo Telefone** - OBRIGATÓRIO, com select de país (DDI), SEMPRE EDITÁVEL',
      '',
      '⚠️ REGRA DO TELEFONE:',
      '  - O campo de telefone DEVE ter um select de país/DDI (Brasil +55 default)',
      '  - O telefone NÃO deve ser preenchido automaticamente do perfil do hóspede',
      '  - Razão: o telefone no backend pode estar vinculado a outra organização',
      '  - O usuário SEMPRE deve digitar o telefone para cada reserva',
      '',
      '```tsx',
      '// Exemplo correto de autofill (nome e email, mas NÃO telefone):',
      'useEffect(() => {',
      '  const guest = getStoredGuest();',
      '  if (guest) {',
      '    setGuestName(guest.name || "");',
      '    setGuestEmail(guest.email || "");',
      '    // ⚠️ NÃO preencher telefone automaticamente!',
      '    // setGuestPhone(guest.phone);  // ❌ ERRADO',
      '    setIsGuestAuthed(true);',
      '  }',
      '}, []);',
      '```',
      '',
      '```html',
      '<!-- NOME -->',
      '<div>',
      '  <label for="guestName">Nome Completo *</label>',
      '  <input',
      '    id="guestName"',
      '    name="guestName"',
      '    type="text"',
      '    placeholder="Seu nome completo"',
      '    required',
      '  />',
      '</div>',
      '',
      '<!-- EMAIL -->',
      '<div>',
      '  <label for="guestEmail">E-mail</label>',
      '  <input',
      '    id="guestEmail"',
      '    name="guestEmail"',
      '    type="email"',
      '    placeholder="seu@email.com (opcional)"',
      '  />',
      '</div>',
      '',
      '<!-- TELEFONE (sem select de país!) -->',
      '<div>',
      '  <label for="guestPhone">Telefone *</label>',
      '  <input',
      '    id="guestPhone"',
      '    name="guestPhone"',
      '    type="tel"',
      '    placeholder="(11) 99999-9999"',
      '    required',
      '  />',
      '</div>',
      '```',
      '',
      '---',
      '',
      '### 📐 ESTRUTURA DO CONTAINER DE TELEFONE:',
      '',
      'O script modifica o container pai do input de telefone para layout flex.',
      'Para evitar conflitos visuais:',
      '',
      '```html',
      '<!-- ✅ CORRETO: div simples como wrapper -->',
      '<div class="phone-field">',
      '  <label for="guestPhone">Telefone *</label>',
      '  <div>  <!-- Este div vira flex pelo script -->',
      '    <input id="guestPhone" name="guestPhone" type="tel" />',
      '  </div>',
      '</div>',
      '',
      '<!-- ❌ ERRADO: input direto sem wrapper -->',
      '<label>Telefone</label>',
      '<input name="guestPhone" />  <!-- Sem div pai, layout pode quebrar -->',
      '```',
      '',
      '---',
      '',
      '### 🔒 IDs RESERVADOS (não use estes IDs):',
      '',
      '- `rendizy-form-error` - Usado pelo script para mensagens de erro',
      '- `rendizy-checkout-toast` - Usado pelo script para toast de confirmação',
      '- `rendizy-guest-hint` - Classe usada para hints de edição',
      '',
      '---',
      '',
      '### 📋 CHECKLIST DO FORMULÁRIO:',
      '',
      '- [ ] Input de nome com `name="guestName"` ou `id="guestName"`',
      '- [ ] Input de email com `name="guestEmail"` ou `id="guestEmail"`',
      '- [ ] Input de telefone com `name="guestPhone"` ou `id="guestPhone"`',
      '- [ ] Input de telefone tem um `<div>` pai (wrapper)',
      '- [ ] NÃO existe select de país (DDI) no HTML',
      '- [ ] NÃO existe lógica de autofill implementada',
      '- [ ] NÃO existe validação customizada de telefone',
      '- [ ] Formulário usa `<form>` tag padrão com submit'
    ]
  },
  {
    id: 'guest-reservations-list',
    title: 'Lista de Reservas do Hóspede',
    stability: 'stable',
    description:
      'Página que lista todas as reservas do hóspede logado, com status visual e ações.',
    usesEndpoints: ['reservations-mine'],
    requiredFields: [
      'Authorization: Bearer <token>',
      'subdomain'
    ],
    notes: [
      '## Exibição de cada reserva:',
      '  - Foto do imóvel (coverPhoto)',
      '  - Nome do imóvel',
      '  - Datas: check-in → check-out',
      '  - Número de hóspedes',
      '  - Status badge colorido',
      '  - Valor total',
      '',
      '## Badges de Status:',
      '  - pending + pending: 🟡 Aguardando Pagamento (+ countdown)',
      '  - pending + expired: 🔴 Expirada',
      '  - confirmed + paid: 🟢 Confirmada',
      '  - cancelled: ⚫ Cancelada',
      '  - completed: ✅ Concluída',
      '',
      '## Countdown para pendentes:',
      '  if (reservation.paymentStatus === "pending" && reservation.paymentExpiresAt) {',
      '    const remaining = new Date(reservation.paymentExpiresAt) - new Date();',
      '    // Exibir: "Pague em XX:XX:XX"',
      '  }',
      '',
      '## Ação de retomar pagamento:',
      '  - Se pending + pending: botão "Pagar Agora" → /checkout com reservationId',
      '',
      '⚠️ IMPORTANTE: Se lista vazia, exibir mensagem amigável com CTA para reservar.'
    ]
  }
] satisfies ClientSitesCatalogBlock[];

// ============================================================
// GERADOR DE PROMPT (O PROMPT É GERADO A PARTIR DO CATÁLOGO!)
// ============================================================
//
// O prompt e o catálogo são IRMÃOS SIAMESES:
// - PROMPT diz O QUE FAZER (regras, objetivo, contexto)
// - CATÁLOGO diz COMO FAZER (blocos, endpoints, campos, exemplos)
//
// Esta função gera o prompt completo a partir do catálogo,
// garantindo que qualquer mudança no catálogo reflita no prompt.
// ============================================================

/**
 * Gera a seção de blocos obrigatórios do prompt a partir do catálogo
 */
function generateBlocksSection(): string {
  const stableBlocks = CLIENT_SITES_BLOCKS_CATALOG.filter(b => b.stability === 'stable');
  const universalBlocks = stableBlocks.filter(
    (b) => !b.modalities || b.modalities.includes('universal')
  );
  const vendaBlocks = stableBlocks.filter((b) => b.modalities?.includes('venda'));
  const locacaoBlocks = stableBlocks.filter((b) => b.modalities?.includes('locacao'));

  const criticalIds = ['checkout-v2-flow', 'booking-form-v2', 'calendar-daily-pricing', 'payment-method-selector'];
  const criticalBlocks = universalBlocks.filter((b) => criticalIds.includes(b.id));
  const otherUniversalBlocks = universalBlocks.filter((b) => !criticalIds.includes(b.id));

  const modalityLabel = (block: ClientSitesCatalogBlock) => {
    if (!block.modalities || block.modalities.includes('universal')) {
      return '🌐 Universal (todas as modalidades)';
    }
    const labels = block.modalities.map((m) => {
      if (m === 'venda') return '🏘️ Venda';
      if (m === 'locacao') return '🏠 Locação Residencial';
      return '🌐 Universal';
    });
    return labels.join(' + ');
  };

  let section = `## 🧱 COMPONENTES POR MODALIDADE (Gerado do Catálogo ${CATALOG_VERSION})

Os blocos abaixo são OBRIGATÓRIOS e devem ser implementados EXATAMENTE como especificado.
Esta seção é gerada automaticamente do catálogo — mudanças no catálogo refletem aqui.

### ✅ Componentes Universais (válidos para Temporada, Venda e Locação Residencial)

`;

  if (criticalBlocks.length > 0) {
    section += `#### Blocos CRÍTICOS (implemente com atenção especial):\n\n`;
    for (const block of criticalBlocks) {
      section += `#### ${block.title}
- **ID**: \`${block.id}\`
    - **Modalidade**: ${modalityLabel(block)}
- **Descrição**: ${block.description}
- **Endpoints**: ${block.usesEndpoints.map(e => `\`${e}\``).join(', ') || 'nenhum'}
- **Campos obrigatórios**: ${block.requiredFields.map(f => `\`${f}\``).join(', ')}
`;
      if (block.notes && block.notes.length > 0) {
        section += `\n**📋 REGRAS DETALHADAS:**\n\n`;
        for (const note of block.notes) {
          if (note.startsWith('##')) {
            section += `\n${note}\n\n`;
          } else if (note.startsWith('#')) {
            section += `\n${note}\n\n`;
          } else if (note.startsWith('```')) {
            section += `${note}\n`;
          } else if (note.trim() === '') {
            section += '\n';
          } else {
            section += `${note}\n`;
          }
        }
      }
      section += '\n---\n\n';
    }
  }

  section += `#### Outros Blocos Universais:\n\n`;
  for (const block of otherUniversalBlocks) {
    section += `- **${block.title}** (\`${block.id}\`) — ${modalityLabel(block)}: ${block.description}\n`;
  }

  section += `\n---\n\n### 🏠 Venda de Imóveis (componentes específicos)\n\n`;
  if (vendaBlocks.length === 0) {
    section += '- (nenhum bloco específico no catálogo atual)\n';
  } else {
    for (const block of vendaBlocks) {
      section += `#### ${block.title}
- **ID**: \`${block.id}\`
    - **Modalidade**: ${modalityLabel(block)}
- **Descrição**: ${block.description}
- **Endpoints**: ${block.usesEndpoints.map(e => `\`${e}\``).join(', ') || 'nenhum'}
- **Campos obrigatórios**: ${block.requiredFields.map(f => `\`${f}\``).join(', ')}
`;
      if (block.notes && block.notes.length > 0) {
        section += `\n**📋 Observações:**\n\n`;
        for (const note of block.notes) {
          section += `${note}\n`;
        }
      }
      section += '\n---\n\n';
    }
  }

  section += `### 🏘️ Locação Residencial (componentes específicos)\n\n`;
  if (locacaoBlocks.length === 0) {
    section += '- (nenhum bloco específico no catálogo atual)\n';
  } else {
    for (const block of locacaoBlocks) {
      section += `#### ${block.title}
- **ID**: \`${block.id}\`
    - **Modalidade**: ${modalityLabel(block)}
- **Descrição**: ${block.description}
- **Endpoints**: ${block.usesEndpoints.map(e => `\`${e}\``).join(', ') || 'nenhum'}
- **Campos obrigatórios**: ${block.requiredFields.map(f => `\`${f}\``).join(', ')}
`;
      if (block.notes && block.notes.length > 0) {
        section += `\n**📋 Observações:**\n\n`;
        for (const note of block.notes) {
          section += `${note}\n`;
        }
      }
      section += '\n---\n\n';
    }
  }

  return section;
}

/**
 * Gera a seção de endpoints do prompt a partir do catálogo
 */
function generateEndpointsSection(): string {
  const stableBlocks = CLIENT_SITES_BLOCKS_CATALOG.filter(b => b.stability === 'stable');
  const universalBlocks = stableBlocks.filter(
    (b) => !b.modalities || b.modalities.includes('universal')
  );
  const vendaBlocks = stableBlocks.filter((b) => b.modalities?.includes('venda'));
  const locacaoBlocks = stableBlocks.filter((b) => b.modalities?.includes('locacao'));

  const getEndpointsForBlocks = (blocks: ClientSitesCatalogBlock[], extraIds: string[] = []) => {
    const ids = new Set<string>(extraIds);
    blocks.forEach((b) => b.usesEndpoints.forEach((id) => ids.add(id)));
    return CLIENT_SITES_PUBLIC_CONTRACT_V1.endpoints.filter((e) => ids.has(e.id));
  };

  const universalEndpoints = getEndpointsForBlocks(universalBlocks, ['serve-site']);
  const vendaEndpoints = getEndpointsForBlocks(vendaBlocks);
  const locacaoEndpoints = getEndpointsForBlocks(locacaoBlocks);

  const renderEndpoints = (title: string, endpoints: ClientSitesCatalogEndpoint[]) => {
    let out = `### ${title}\n\n`;
    const stable = endpoints.filter((e) => e.stability === 'stable');
    const planned = endpoints.filter((e) => e.stability === 'planned');

    if (stable.length === 0) {
      out += '- (nenhum endpoint estável específico)\n\n';
    } else {
      for (const endpoint of stable) {
        out += `#### ${endpoint.title}\n\`\`\`\n${endpoint.method} ${endpoint.pathTemplate}\n\`\`\`\n`;
        if (endpoint.notes && endpoint.notes.length > 0) {
          out += `${endpoint.notes.slice(0, 2).join('\n')}\n`;
        }
        out += '\n';
      }
    }

    if (planned.length > 0) {
      out += `**Endpoints Planejados (não implementar ainda):**\n`;
      for (const endpoint of planned) {
        out += `- \`${endpoint.method} ${endpoint.pathTemplate}\` — ${endpoint.title}\n`;
      }
      out += '\n';
    }

    return out;
  };

  let section = `## 🔌 ENDPOINTS DA API POR MODALIDADE (Gerado do Catálogo ${CATALOG_VERSION})\n\n`;
  section += renderEndpoints('Universais (todas as modalidades)', universalEndpoints);
  section += renderEndpoints('Venda de Imóveis', vendaEndpoints);
  section += renderEndpoints('Locação Residencial', locacaoEndpoints);

  return section;
}

/**
 * Gera a seção de checklist do prompt a partir dos blocos críticos
 */
function generateChecklistSection(): string {
  const checkoutBlock = CLIENT_SITES_BLOCKS_CATALOG.find(b => b.id === 'checkout-v2-flow');
  const formBlock = CLIENT_SITES_BLOCKS_CATALOG.find(b => b.id === 'booking-form-v2');
  const calendarBlock = CLIENT_SITES_BLOCKS_CATALOG.find(b => b.id === 'calendar-daily-pricing');

  return `## 📋 CHECKLIST DE VALIDAÇÃO (VERIFIQUE ANTES DE ENTREGAR!)

Antes de gerar o código final, verifique CADA item abaixo. Se algum estiver errado, CORRIJA.

### Checkout v2 (CRÍTICO — bloco \`checkout-v2-flow\`):
- [ ] Checkout abre em NOVA ABA: \`window.open(checkoutUrl, "_blank")\` ← NÃO use \`window.location.href\`!
- [ ] successUrl/cancelUrl apontam para domínio Rendizy (\`/api/checkout/success\`), NÃO para hash routes do site
- [ ] Após criar reserva, implementar listener de BroadcastChannel para confirmação cross-tab

### Formulário de Reserva v2 (CRÍTICO — bloco \`booking-form-v2\`):
- [ ] Campo telefone é OBRIGATÓRIO com select de país/DDI (+55 Brasil default)
- [ ] Telefone NÃO é preenchido automaticamente (usuário sempre digita)
- [ ] Inputs usam IDs canônicos: \`name="guestName"\`, \`name="guestEmail"\`, \`name="guestPhone"\`
- [ ] Se hóspede logado (\`localStorage.rendizy_guest\`), nome e email são preenchidos automaticamente
- [ ] Campos nome/email preenchidos via autofill ficam \`readOnly={true}\`
- [ ] Validação de mínimo de noites com mensagem de erro visual

### Calendário (CRÍTICO — bloco \`calendar-daily-pricing\`):
- [ ] 🗓️ **MODAL CENTRALIZADO**: Calendário abre como modal no centro da tela com overlay escuro
- [ ] 🗓️ **NÃO USAR**: dropdown espremido ou inline embutido no container
- [ ] 🗓️ **2 MESES**: Exibir 2 meses lado a lado (flex-row em desktop, flex-col em mobile)
- [ ] 🗓️ **NAVEGAÇÃO**: Setas para avançar/voltar meses
- [ ] 💰 **PREÇO NA CÉLULA**: Cada dia disponível DEVE mostrar o preço (ex.: "R$ 480") dentro da célula
- [ ] 💰 **BUSCAR PREÇO**: Usar \`fetchCalendar(propertyId, start, end)\` que retorna \`{ date, status, price }\`
- [ ] 💰 **FUNÇÃO getDayPrice**: Implementar para extrair preço do array de dias
- [ ] ⬜ **DATAS PASSADAS**: Bloqueadas visualmente (bg-gray-50, text-gray-300, cursor-not-allowed)
- [ ] ⬜ **SEM PREÇO EM PASSADAS**: Não exibir preço em datas passadas
- [ ] ✅ **STATUS STRING**: Verificar \`day.status === "available"\` (NÃO \`day.available\`)
- [ ] 📋 **LEGENDA**: Disponível/Indisponível/Selecionado com cores
- [ ] 📋 **BOTÃO FECHAR**: Visível e funcional
- [ ] 🔢 **MÍNIMO NOITES**: Validar e exibir erro se seleção < minNights

### Componentes Obrigatórios:
- [ ] \`BookingWidget.tsx\` ou \`BookingForm.tsx\` com todas as regras acima
- [ ] \`PaymentMethodSelector.tsx\` com PIX inline (QR code) + Boleto (PDF link)
- [ ] \`DateRangePicker.tsx\` ou \`CalendarPicker.tsx\` usando API real
- [ ] \`GuestAreaButton.tsx\` que redireciona para cápsula (NÃO código embutido)

### Venda de Imóveis (quando modalidade = venda):
- [ ] Exibir preço usando \`pricing.salePrice\` (fallback: \`pricing.basePrice\`)
- [ ] NÃO exibir checkout/reserva/calendário
- [ ] CTA principal é contato (WhatsApp/formulário)

### Locação Residencial (quando modalidade = locação):
- [ ] Exibir preço usando \`pricing.monthlyRate\` (mensal)
- [ ] Se existirem custos extras (IPTU/condomínio/taxas), exibir breakdown; se não existir, ocultar
- [ ] NÃO exibir checkout/reserva/calendário

### Dados Reais (PROIBIDO MOCKS):
- [ ] Remover páginas de demo (\`/demo\`) e arquivos \`mocks/*\`
- [ ] NÃO usar fallback com \`MOCK_PROPERTIES\` quando API falhar
- [ ] Calendário/Preço/Reserva sempre via API pública real

⚠️ Se você não marcar TODOS os itens acima, o site será rejeitado.
`;
}

/**
 * Gera a tabela de mapeamento Bloco ↔ Modalidade
 */
function generateModalitiesMapTable(): string {
  const rows = CLIENT_SITES_BLOCKS_CATALOG
    .filter((b) => b.stability !== 'deprecated')
    .map((b) => {
      const isUniversal = !b.modalities || b.modalities.includes('universal');
      const hasVenda = isUniversal || b.modalities?.includes('venda');
      const hasLocacao = isUniversal || b.modalities?.includes('locacao');
      const hasTemporada = true; // temporada é o padrão do catálogo atual

      const yes = '✅';
      const no = '⛔';

      return {
        id: b.id,
        temporada: hasTemporada ? yes : no,
        residencial: hasLocacao ? yes : no,
        venda: hasVenda ? yes : no,
        description: b.description,
      };
    });

  let table = `### 📋 MAPA DE BLOCOS POR MODALIDADE\n\n`;
  table += `| Bloco ID | 🏖️ Temporada | 🏠 Residencial | 🏘️ Venda | Descrição |\n`;
  table += `|----------|-------------|---------------|---------|-----------|\n`;
  for (const r of rows) {
    table += `| \`${r.id}\` | ${r.temporada} | ${r.residencial} | ${r.venda} | ${r.description} |\n`;
  }
  table += `\n`;
  return table;
}

function generateWhatsNewSection(): string {
  return `## 🆕 NOVIDADES ${CATALOG_VERSION}

### v6.9 - Anti-Pattern GuestAreaButton (18/01/2026)
- 🔐 **AP-STR-005** - GuestAreaButton DEVE usar URL FIXA do backend Rendizy
- ⚠️ **Erro comum** - NÃO buscar URL dinamicamente (vai dar 404 no domínio do cliente)
- ✅ **Padrão** - Sempre usar URL fixa: https://rendizy2testesbackup.vercel.app/guest-area/

### v6.8 - Calendário Modal + Preços nas Células (18/01/2026)
- 🗓️ **AP-CAL-004** - Calendário DEVE ser modal centralizado (NÃO dropdown/inline espremido)
- 💰 **AP-CAL-005** - OBRIGATÓRIO exibir preço dentro de cada célula do calendário (temporada)
- 📋 **Código de referência** - DateRangePicker.tsx completo como modelo obrigatório
- ⚠️ **Reforço** - Padrão visual MedHome é obrigatório (2 meses, overlay, setas)

### v6.7 - Anti-Patterns & Validação (17/01/2026)
- 🛡️ **ANTI_PATTERNS_CHECKLIST** - Lista de erros comuns que IAs cometem
- 🔒 **Validação de calendário** - Datas passadas DEVEM estar bloqueadas
- 💳 **Validação de checkout** - DEVE abrir em nova aba + mensagens corretas
- 🚫 **Proibições reforçadas** - Nada de supabase-js, env vars, placeholders
- ✅ **Função validateAgainstAntiPatterns()** - Valida código automaticamente

### v6.6 e anteriores
- ✅ Sistema compositor com detecção automática de modalidades
- ✅ Tabela de mapeamento bloco ↔ modalidade
- ✅ Marcação visual (🌐 🏖️ 🏠 🏘️) em todos os blocos
- ✅ Endpoints organizados por modalidade
- ✅ Prompt gerado automaticamente do catálogo
\n`;
}

function generateDecisionFlowSection(): string {
  return `## 🎛️ FLUXO DE DECISÃO (resumo visual)

Backend retorna features:
┌─────────────────────────────┐
│ features.shortTerm = true   │ → 🏖️ Implementar blocos Temporada
│ features.longTerm = false   │ → 🏠 IGNORAR blocos Residencial
│ features.sale = true        │ → 🏘️ Implementar blocos Venda
└─────────────────────────────┘
                ↓
        🌐 Blocos Universais → SEMPRE implementar
\n`;
}

function generateScenariosSection(): string {
  return `### 📦 CENÁRIOS COMUNS

#### Cenário 1: Site PURO de Temporada
\`\`\`json
{ "shortTerm": true, "longTerm": false, "sale": false }
\`\`\`
Implementar:
- ✅ Todos os blocos universais
- ✅ \`calendar-daily-pricing\`
- ✅ \`booking-form-v2\`
- ✅ \`checkout-v2-flow\`
- ⛔ \`rent-pricing-panel\`
- ⛔ \`sale-pricing-panel\`

#### Cenário 2: Site MISTO (Temporada + Venda)
\`\`\`json
{ "shortTerm": true, "longTerm": false, "sale": true }
\`\`\`
Implementar:
- ✅ Todos os blocos universais
- ✅ \`calendar-daily-pricing\` (temporada)
- ✅ \`booking-form-v2\` (temporada)
- ✅ \`checkout-v2-flow\` (temporada)
- ✅ \`sale-pricing-panel\` (venda)
- ✅ \`modality-switcher\` (para alternar Aluguel/Venda)
- ⛔ \`rent-pricing-panel\`

**UX crítico:**
- PropertyCard deve mostrar **ambos os preços** (diária + venda)
- Use tabs/toggle para alternar visualização
- Calendário aparece **somente** quando “Aluguel” está selecionado

#### Cenário 3: Site PURO de Venda
\`\`\`json
{ "shortTerm": false, "longTerm": false, "sale": true }
\`\`\`
Implementar:
- ✅ Todos os blocos universais
- ✅ \`sale-pricing-panel\`
- ⛔ \`calendar-daily-pricing\`
- ⛔ \`booking-form-v2\`
- ⛔ \`checkout-v2-flow\`
- ⛔ \`rent-pricing-panel\`
\n`;
}

function generateEndpointsTableSection(): string {
  const endpointModality = (id: string) => {
    if (['properties', 'site-config', 'serve-site', 'auth-guest-google', 'auth-guest-me'].includes(id)) return '🌐 Universal';
    if (['availability-pricing', 'calendar', 'reservation-create', 'calculate-price', 'checkout-session', 'payment-methods', 'reservations-mine'].includes(id)) return '🏖️ Temporada';
    if (['lead-create'].includes(id)) return '🌐 Universal';
    return '⚠️ Planejado';
  };

  const statusLabel = (stability: ClientSitesCatalogStability) => {
    if (stability === 'stable') return '✅ Estável';
    if (stability === 'planned') return '⚠️ Planejado';
    return '⛔ Deprecated';
  };

  let table = `### 🔌 ENDPOINTS POR MODALIDADE (tabela rápida)

| Endpoint | Modalidade | Status | Descrição |
|----------|-----------|--------|-----------|
`;

  for (const endpoint of CLIENT_SITES_PUBLIC_CONTRACT_V1.endpoints) {
    table += `| \`${endpoint.method} ${endpoint.pathTemplate}\` | ${endpointModality(endpoint.id)} | ${statusLabel(endpoint.stability)} | ${endpoint.title} |\n`;
  }

  table += `\n`;
  return table;
}

/**
 * Gera a seção de integration guides do prompt
 */
function generateIntegrationGuidesSection(): string {
  let section = `## 📚 GUIAS DE INTEGRAÇÃO (Gerado do Catálogo ${CATALOG_VERSION})

`;

  for (const guide of CLIENT_SITES_PUBLIC_CONTRACT_V1.integrationGuides) {
    section += `### ${guide.title}\n\n`;
    guide.notes.forEach(note => {
      section += `${note}\n`;
    });
    section += '\n';
    
    if (guide.codeBlocks && guide.codeBlocks.length > 0) {
      for (const cb of guide.codeBlocks) {
        section += `**${cb.title}:**\n`;
        section += `\`\`\`${cb.language || 'typescript'}\n${cb.code}\n\`\`\`\n\n`;
      }
    }
  }

  return section;
}

/**
 * Gera o prompt completo a partir do catálogo.
 * O prompt é composto de:
 * 1. Cabeçalho + Regra Fundamental (fixo)
 * 2. Checklist (gerado dos blocos críticos)
 * 3. Objetivo e Stack (fixo)
 * 4. Blocos (gerado do catálogo)
 * 5. Endpoints (gerado do catálogo)
 * 6. Guias de Integração (gerado do catálogo)
 * 7. Instruções de Build (fixo)
 */
export function generatePromptFromCatalog(): string {
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().slice(0, 5);

  // ==================== PARTE FIXA: CABEÇALHO ====================
  const header = `# RENDIZY — PROMPT PLUGÁVEL (${CATALOG_VERSION})

> **Catálogo**: ${CATALOG_VERSION} | **Sistema**: v1.0.104.x | **Gerado**: ${today} às ${time}
> **⚠️ ESTE PROMPT É GERADO AUTOMATICAMENTE DO CATÁLOGO** — Qualquer mudança no catálogo reflete aqui.

---
## ⚠️ REGRA FUNDAMENTAL — LEIA PRIMEIRO

**O RENDIZY PROPÕE O PADRÃO. VOCÊ SEGUE.**

Este prompt é PROPOSITIVO, não sugestivo. As especificações aqui são ORDENS, não recomendações.
- Você DEVE implementar exatamente como especificado.
- Você NÃO pode propor formatos alternativos.
- Você NÃO pode usar convenções próprias que desviem do contrato.
- Se algo não está claro, use o formato EXATO dos exemplos.

O Rendizy **NUNCA** adaptará seu código para "aceitar" implementações diferentes.
Se seu site não funcionar, é porque você desviou do padrão. Corrija seu código.

---
`;

  // ==================== PARTE DINÂMICA: NOVIDADES ====================
  const novidades = generateWhatsNewSection();

  // ==================== PARTE DINÂMICA: ANTI-PATTERNS ====================
  const antiPatterns = generateAntiPatternsSection();

  // ==================== PARTE DINÂMICA: CHECKLIST ====================
  const checklist = generateChecklistSection();

  // ==================== PARTE FIXA: OBJETIVO E STACK ====================
  const objetivoEStack = `---

## 🎛️ SISTEMA COMPOSITOR (OBRIGATÓRIO)

Este prompt é MODULAR. Você deve implementar **APENAS** os blocos compatíveis com as modalidades ativas do site.

**Modalidades suportadas**: 🏖️ Temporada | 🏠 Residencial | 🏘️ Venda

### Como detectar a modalidade (fonte de verdade)
- Use o **siteConfig** recebido do backend (quando disponível) e/ou configuração do site.
- Campo esperado: \`features.shortTerm\`, \`features.longTerm\`, \`features.sale\`.

\`\`\`ts
// Exemplo (site-config público ou config local)
const features = siteConfig?.features || {
  shortTerm: true,
  longTerm: false,
  sale: false,
};

const isVacation = !!features.shortTerm;
const isResidential = !!features.longTerm;
const isSale = !!features.sale;
\`\`\`

### Regra de composição
1. Blocos **universais** sempre entram.
2. Blocos marcados com 🏖️ entram **somente** se \`features.shortTerm\` = true.
3. Blocos marcados com 🏠 entram **somente** se \`features.longTerm\` = true.
4. Blocos marcados com 🏘️ entram **somente** se \`features.sale\` = true.

Exemplo: site misto (Temporada + Venda)
- ✅ Implementar: calendar, booking, checkout (🏖️)
- ✅ Implementar: sale-pricing-panel (🏘️)
- ⛔ Ignorar: rent-pricing-panel (🏠)

${generateDecisionFlowSection()}

## Objetivo (aceitação)
Você vai gerar um site (SPA) de imobiliária (temporada/locação/venda) que, ao ser enviado como ZIP no painel do RENDIZY, fica **funcionando imediatamente** em:
- \`/site/<subdomain>/\` (servido via proxy da Vercel)

Para ser aceito:
- A Home carrega.
- A listagem de imóveis carrega via API pública.
- Assets (JS/CSS/imagens) carregam sem 404.
- Calendário de disponibilidade busca dados da API real (NUNCA mock).

## 🔀 Modalidades (OBRIGATÓRIO seguir)

O Rendizy possui 3 tipos de cliente e **o site deve se adaptar** de forma clara:

### 1) Temporada (Aluguel por Diária)
- **Usa calendário + reservas + checkout.**
- Exibir preço diário com \`pricing.dailyRate\` (fallback: \`pricing.basePrice\`).
- Blocos críticos obrigatórios: \`calendar-daily-pricing\`, \`booking-form-v2\`, \`checkout-v2-flow\`, \`payment-method-selector\`.

**⛔ PROIBIDO em Temporada:**
- Omitir calendário/checkout quando a modalidade estiver ativa.
- Inventar preço no front-end (sempre via API pública).

### 2) Locação Residencial (Aluguel Mensal)
- **Não usa checkout/reserva/calendário.**
- Exibir preço mensal com \`pricing.monthlyRate\` (fallback: \`pricing.basePrice\`).
- Se houver custos recorrentes (IPTU/condomínio/taxas), exibir como breakdown opcional.
- CTA principal é contato/leads (WhatsApp/formulário).

**⛔ PROIBIDO em Locação Residencial:**
- Renderizar calendário, formulário de reserva ou checkout.
- Usar \`dailyRate\` como preço principal.

### 3) Venda de Imóveis
- **Não usa checkout/reserva/calendário.**
- Exibir preço de venda com \`pricing.salePrice\` (fallback: \`pricing.basePrice\`).
- Se houver IPTU anual ou outras infos, exibir como dados adicionais (opcional).
- CTA principal é contato/leads (WhatsApp/formulário).

**⛔ PROIBIDO em Venda:**
- Renderizar calendário, formulário de reserva ou checkout.
- Usar \`monthlyRate\` como preço principal.

### ✅ Regra de Visibilidade por Modalidade
- Se a modalidade **não estiver habilitada**, **não renderize** o bloco correspondente.
- Use \`features.shortTerm\`, \`features.longTerm\`, \`features.sale\` do \`siteConfig\`.

## Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- (Opcional) shadcn/ui

## Contexto real do RENDIZY (não invente)

### 1) O site é 100% estático
- Nada de SSR.
- Nada de Node server.
- Nada de chamadas para APIs privadas.

### 2) Restrições de segurança/CSP
- NÃO carregue JS de CDN.
- NÃO use scripts externos.
- Se usar fontes, prefira bundlar local (ou use fontes default do sistema).

### 3) ⚠️ PROIBIDO usar @supabase/supabase-js diretamente
**CRÍTICO**: NÃO instale nem importe \`@supabase/supabase-js\`.
O site será servido sem variáveis de ambiente (\`VITE_SUPABASE_URL\`, etc).
Se você usar \`createClient(...)\` do supabase-js, o bundle vai crashar com:
\`Uncaught Error: supabaseUrl is required\`

✅ **Forma correta**: use \`fetch()\` diretamente para a API pública.
❌ **Errado**: \`import { createClient } from '@supabase/supabase-js'\`

### 4) ⚠️ PROIBIDO usar variáveis de ambiente
**CRÍTICO**: O site é servido SEM NENHUMA variável de ambiente.
- NÃO crie arquivo \`.env\`
- NÃO use \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\` ou qualquer \`VITE_*\`
- NÃO use \`import.meta.env.VITE_*\`
- NÃO use placeholders como \`{{ORG_ID}}\`, \`{{SUBDOMAIN}}\`, etc

✅ **Forma correta**: hardcode o subdomain em \`src/config/site.ts\`
❌ **Errado**: \`subdomain: process.env.SUBDOMAIN\` ou \`subdomain: "{{SUBDOMAIN}}"\`

### 5) O site roda em subpath
Ele abre como:
- \`https://<dominio>/site/<subdomain>/\`

IMPORTANTE: esse ambiente NÃO garante fallback de rotas para SPA em deep-link.
Portanto: use **HashRouter**.

✅ Rotas devem ser assim:
- \`/site/<subdomain>/#/\`
- \`/site/<subdomain>/#/imoveis\`
- \`/site/<subdomain>/#/imovel/<id>\`

### 6) ⚠️ NÃO gere arquivos de documentação extras
O projeto deve conter APENAS código necessário.
- NÃO gere \`README.md\` customizado
- NÃO gere \`COMO_IMPORTAR.md\`, \`INSTRUCOES.md\`, etc
- NÃO gere arquivos \`.md\` dentro de \`src/\`
- NÃO gere pasta \`supabase/\` com migrations

Gere APENAS os arquivos de código (tsx, ts, css, json, config).

---
`;

  // ==================== PARTE DINÂMICA: BLOCOS ====================
  const blocos = generateBlocksSection();

  // ==================== PARTE DINÂMICA: MAPA BLOCOS x MODALIDADES ====================
  const mapaModalidades = generateModalitiesMapTable();

  // ==================== PARTE DINÂMICA: CENÁRIOS ====================
  const cenarios = generateScenariosSection();

  // ==================== PARTE DINÂMICA: ENDPOINTS ====================
  const endpoints = generateEndpointsSection();

  // ==================== PARTE DINÂMICA: ENDPOINTS (TABELA) ====================
  const endpointsTabela = generateEndpointsTableSection();

  // ==================== PARTE DINÂMICA: GUIAS ====================
  const guias = generateIntegrationGuidesSection();

  // ==================== PARTE FIXA: ESTRUTURA DE ARQUIVOS ====================
  const estrutura = `---

## 📁 ESTRUTURA DE ARQUIVOS OBRIGATÓRIA

### Arquivos Obrigatórios (Mínimo):
\`\`\`
/
├── package.json              ← DEVE estar na RAIZ do ZIP
├── vite.config.ts            ← com base: './'
├── tsconfig.json
├── index.html                ← com <script> do RENDIZY_CONFIG
├── src/
│   ├── main.tsx
│   ├── App.tsx               ← com HashRouter
│   ├── index.css
│   ├── config/
│   │   └── site.ts           ← com siteConfig hardcoded (NÃO usar env vars)
│   ├── services/
│   │   ├── api.ts            ← propertyService usando fetch
│   │   └── rendizy.ts        ← funções fetchProperties, fetchCalendar, etc
│   ├── types/
│   │   ├── index.ts
│   │   └── rendizy.ts
│   ├── components/
│   │   ├── BookingWidget.tsx ← ou BookingForm.tsx
│   │   ├── DateRangePicker.tsx
│   │   └── ... outros
│   └── pages/
│       ├── HomePage.tsx
│       ├── PropertiesPage.tsx
│       ├── PropertyDetailPage.tsx
│       └── ... outros
├── tailwind.config.js
└── postcss.config.js
\`\`\`

### ⚠️ NÃO CRIAR (proibido):
- \`.env\` ou qualquer arquivo de variáveis de ambiente
- \`supabase/\` (não precisa de migrations)
- Arquivos \`.md\` de documentação dentro do projeto
- \`COMO_IMPORTAR.md\`, \`README.md\` customizado, etc (lixo)
- Qualquer referência a \`VITE_SUPABASE_URL\` ou \`VITE_SUPABASE_ANON_KEY\`
- Arquivos \`.tar.gz\` ou \`.zip\` dentro do projeto
- Arquivos \`.sql\` (migrations)
- Imagens maiores que **100KB** (otimize antes de incluir!)

### ⚠️ IMAGENS - REGRAS CRÍTICAS:
- Máximo **3-5 imagens** no projeto (logo + favicon)
- Cada imagem DEVE ter menos de **100KB**
- Use ferramentas como TinyPNG para otimizar
- NÃO inclua múltiplas versões da mesma imagem ("image copy.png", etc)
- Prefira SVG para logos/ícones (menor tamanho)
- Coloque imagens em \`public/\` (não \`src/assets/\`)

### src/config/site.ts (MODELO OBRIGATÓRIO):
\`\`\`typescript
export const siteConfig = {
  subdomain: "SUBDOMAIN_AQUI",    // ← Substituir pelo subdomain real
  siteName: "Nome do Site",
  theme: {
    primaryColor: "#5DBEBD",
    secondaryColor: "#FF8B94"
  }
};
\`\`\`

❌ NUNCA usar: \`organizationId: "{{ORG_ID}}"\` ou qualquer placeholder/template string.
✅ SEMPRE usar valores concretos hardcoded.

`;

  // ==================== PARTE FIXA: BUILD ====================
  const build = `---

## Build / Entrega (OBRIGATÓRIO)

### Como o Rendizy processa o ZIP:
1. Você envia um ZIP com o **código-fonte** (NÃO o build)
2. O Rendizy envia para a Vercel que faz \`npm install\` + \`npm run build\`
3. A Vercel serve o \`dist/\` automaticamente

### Estrutura do ZIP:
\`\`\`
meuhsite.zip
├── package.json      ← NA RAIZ (sem pasta intermediária!)
├── src/
├── index.html
└── ... outros arquivos
\`\`\`

⚠️ **ERRADO**: ZIP com pasta intermediária:
\`\`\`
meuhsite.zip
└── meuhsite-main/    ← ERRADO! Pasta extra
    └── meuhsite/     ← ERRADO! Outra pasta extra
        ├── package.json
        └── ...
\`\`\`

### Regras de Build:
- Configure \`vite.config.ts\` com \`base: './'\`
- Não referencie imagens como \`/images/...\` ou \`/foo.png\` (root)
- Coloque assets em \`src/assets/\` ou \`public/\` (sem subpastas profundas)
- NÃO inclua \`node_modules/\`, \`.git/\`, \`.bolt/\` no ZIP
- NÃO gere arquivos \`.md\` extras de documentação
- NÃO inclua imagens maiores que 100KB (otimize antes!)

### Checklist final:
- [ ] \`package.json\` está na RAIZ do ZIP (sem pasta intermediária)
- [ ] \`vite.config.ts\` tem \`base: './'\`
- [ ] \`index.html\` tem script com \`window.RENDIZY_CONFIG = { SUBDOMAIN: '...' }\`
- [ ] NÃO existe nenhuma referência a variáveis de ambiente (\`VITE_\`, \`.env\`)
- [ ] NÃO existe nenhum placeholder como \`{{ORG_ID}}\` ou \`{{SUBDOMAIN}}\`
- [ ] O site usa HashRouter (\`/#/imoveis\`, \`/#/imovel/:id\`)
- [ ] \`src/services/rendizy.ts\` usa \`fetch()\` direto para a API pública
- [ ] NÃO existe import de \`@supabase/supabase-js\`
- [ ] NÃO existem arquivos \`.tar.gz\`, \`.zip\` ou \`.sql\` no projeto
- [ ] Imagens em \`public/\` são menores que 100KB cada
- [ ] Máximo 5 imagens no total (logo + favicon + hero)

Gere o projeto completo e pronto para ZIP seguindo TUDO acima.
`;

  // ==================== JUNTAR TUDO ====================
  return header + novidades + antiPatterns + checklist + objetivoEStack + blocos + '\n' + mapaModalidades + '\n' + cenarios + '\n' + endpointsTabela + '\n---\n\n' + endpoints + '\n---\n\n' + guias + estrutura + build;
}
