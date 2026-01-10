export type PaymentProviderId = 'stripe' | 'pagarme';

export type PaymentFeatureId =
  | 'checkout_sessions'
  | 'products'
  | 'payment_links'
  | 'invoices'
  | 'customers'
  | 'refunds'
  | 'webhooks'
  | 'tax'
  | 'connect_splits'
  | 'subscriptions'
  | 'customer_portal';

export type PaymentFeature = {
  id: PaymentFeatureId;
  title: string;
  description: string;
};

export type PaymentProviderDefinition = {
  id: PaymentProviderId;
  name: string;
  description: string;
  features: PaymentFeature[];
};

// Nota: isto é “catálogo/metadata” para o app decidir por demanda
// quais features aparecem/ativam em cada client site.
export const paymentProviders: PaymentProviderDefinition[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description:
      'Gateway global (cartão, PIX via parceiros/integrações), com Checkout, Links, Webhooks, Invoices e mais.',
    features: [
      {
        id: 'checkout_sessions',
        title: 'Checkout Sessions',
        description: 'Criar sessões de checkout e redirecionar o hóspede para pagamento.',
      },
      {
        id: 'products',
        title: 'Products & Prices',
        description: 'Gerenciar produtos e preços diretamente via API (sem usar dashboard Stripe).',
      },
      {
        id: 'payment_links',
        title: 'Payment Links',
        description: 'Gerar links de pagamento prontos (sem UI própria).',
      },
      {
        id: 'invoices',
        title: 'Invoices',
        description: 'Faturas, cobrança recorrente e envio automático (quando aplicável).',
      },
      {
        id: 'customers',
        title: 'Customers',
        description: 'Cadastro e relacionamento com clientes (ex: e-mail, histórico).',
      },
      {
        id: 'refunds',
        title: 'Refunds',
        description: 'Estornos e ajustes de pagamentos.',
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        description: 'Receber eventos (pagamento confirmado, falha, estorno etc.).',
      },
      {
        id: 'subscriptions',
        title: 'Subscriptions',
        description: 'Assinaturas e cobranças recorrentes (quando necessário).',
      },
      {
        id: 'customer_portal',
        title: 'Customer Portal',
        description: 'Portal do cliente para gerenciar pagamentos (dependendo do plano).',
      },
      {
        id: 'connect_splits',
        title: 'Connect / Splits',
        description: 'Split de pagamento entre recebedores (mais avançado).',
      },
    ],
  },
  {
    id: 'pagarme',
    name: 'Pagar.me',
    description: 'Gateway focado no Brasil (PIX/cartão/boleto), ideal para imobiliárias locais.',
    features: [
      {
        id: 'checkout_sessions',
        title: 'Checkout (via API)',
        description: 'Criar cobranças e direcionar o hóspede para pagamento.',
      },
      {
        id: 'refunds',
        title: 'Refunds',
        description: 'Estornos e cancelamentos.',
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        description: 'Eventos de pagamento para conciliação e automação.',
      },
    ],
  },
];
