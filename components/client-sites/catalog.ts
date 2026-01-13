// ============================================================
// CATÁLOGO DE CONTRATO PÚBLICO — CLIENT SITES API
// ============================================================
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

export type ClientSitesCatalogStability = 'stable' | 'planned';

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
};

export type ClientSitesCatalogIntegrationGuide = {
  title: string;
  notes: string[];
  codeBlocks?: Array<{ title: string; language?: string; code: string }>;
};

export const CLIENT_SITES_PUBLIC_CONTRACT_V1 = {
  version: 'v1' as const,
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
        'O hóspede fica na tabela guest_users (separada de auth_users do painel).',
        'O site NÃO deve usar @supabase/supabase-js para auth. Use os endpoints REST.',
        '⚠️ IMPORTANTE: O GOOGLE_CLIENT_ID deve estar configurado nas Edge Functions.',
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
          title: 'Enviar credential para backend e salvar token',
          language: 'ts',
          code: `// Após receber credential do Google
async function loginWithGoogle(credential: string, subdomain: string) {
  const API_BASE = window.RENDIZY_CONFIG?.API_BASE_URL ||
    'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public';

  const response = await fetch(
    API_BASE + '/client-sites/api/' + subdomain + '/auth/guest/google',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    }
  );

  const result = await response.json();

  if (result.success) {
    // Salvar token para uso futuro
    localStorage.setItem('rendizy_guest_token', result.token);
    localStorage.setItem('rendizy_guest', JSON.stringify(result.guest));
    console.log('Login OK:', result.guest.email);
    return result;
  } else {
    console.error('Login falhou:', result.error);
    throw new Error(result.error);
  }
}

// Obter dados do hóspede logado
async function getGuestMe(subdomain: string) {
  const token = localStorage.getItem('rendizy_guest_token');
  if (!token) return null;

  const API_BASE = window.RENDIZY_CONFIG?.API_BASE_URL ||
    'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public';

  const response = await fetch(
    API_BASE + '/client-sites/api/' + subdomain + '/auth/guest/me',
    {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token },
    }
  );

  const result = await response.json();
  return result.success ? result.guest : null;
}

// Logout
function logout() {
  localStorage.removeItem('rendizy_guest_token');
  localStorage.removeItem('rendizy_guest');
  google.accounts.id.disableAutoSelect();
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
      'Nota: o bloco exibe preço por dia; o total da reserva (limpeza/descontos) é outro contrato (planejado).'
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
  }
] satisfies ClientSitesCatalogBlock[];
