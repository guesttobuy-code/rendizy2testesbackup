import * as kv from './kv_store.tsx';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'guest' | 'staff' | 'system';
  sender_name: string;
  sender_id?: string;
  content: string;
  sent_at: string;
  read_at?: string;
  organization_id: string;
  attachments?: string[];
}

interface Conversation {
  id: string;
  organization_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  reservation_code?: string;
  property_name?: string;
  property_id?: string;
  channel: 'email' | 'system' | 'whatsapp';
  status: 'unread' | 'read' | 'resolved';
  category: 'urgent' | 'normal' | 'resolved';
  conversation_type: 'guest' | 'lead';
  last_message: string;
  last_message_at: string;
  checkin_date?: string;
  checkout_date?: string;
  order?: number;
  isPinned?: boolean;
  tags?: string[];
  lead_data?: {
    desired_location?: string;
    num_guests?: number;
    desired_checkin?: string;
    desired_checkout?: string;
  };
  created_at: string;
  updated_at: string;
}

interface MessageTemplate {
  id: string;
  organization_id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  content: string;
  content_en?: string;
  content_es?: string;
  category: 'pre_checkin' | 'post_checkout' | 'during_stay' | 'payment' | 'general' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface ChatTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  conversations_count: number;
}

export async function seedChatData(organizationId: string = 'org-default') {
  console.log('🌱 Seeding chat data...');

  const now = new Date().toISOString();

  // ============================================
  // CREATE TAGS
  // ============================================

  const tags: ChatTag[] = [
    {
      id: 'tag-urgent',
      organization_id: organizationId,
      name: 'Urgente',
      color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
      description: 'Questões urgentes que precisam de atenção imediata',
      created_at: now,
      conversations_count: 0,
    },
    {
      id: 'tag-vip',
      organization_id: organizationId,
      name: 'VIP',
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      description: 'Hóspedes VIP e especiais',
      created_at: now,
      conversations_count: 0,
    },
    {
      id: 'tag-payment',
      organization_id: organizationId,
      name: 'Pagamento',
      color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
      description: 'Questões relacionadas a pagamento',
      created_at: now,
      conversations_count: 0,
    },
    {
      id: 'tag-maintenance',
      organization_id: organizationId,
      name: 'Manutenção',
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
      description: 'Problemas de manutenção reportados',
      created_at: now,
      conversations_count: 0,
    },
    {
      id: 'tag-followup',
      organization_id: organizationId,
      name: 'Follow-up',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      description: 'Requer acompanhamento',
      created_at: now,
      conversations_count: 0,
    },
  ];

  for (const tag of tags) {
    await kv.set(`chat:tag:${organizationId}:${tag.id}`, tag);
  }

  console.log(`✅ Created ${tags.length} tags`);

  // ============================================
  // CREATE TEMPLATES
  // ============================================

  const templates: MessageTemplate[] = [
    {
      id: 'tpl-001',
      organization_id: organizationId,
      name: 'Confirmação de Reserva',
      content: `Olá {guest_name}!

Sua reserva foi confirmada com sucesso! ✅

📅 Check-in: {checkin_date}
📅 Check-out: {checkout_date}
🏠 Imóvel: {property_name}
📍 Código da Reserva: {reservation_code}

Em breve enviaremos mais informações sobre o check-in.

Equipe RENDIZY`,
      category: 'pre_checkin',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-002',
      organization_id: organizationId,
      name: 'Instruções de Check-in',
      content: `Olá {guest_name}!

Estamos aguardando você! 🎉

📍 Endereço: {property_address}
🔑 Código de acesso: {access_code}
⏰ Horário de check-in: 14h às 22h

📶 WiFi: {wifi_name}
🔐 Senha WiFi: {wifi_password}

Qualquer dúvida, estamos à disposição!

Até breve!`,
      category: 'pre_checkin',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-003',
      organization_id: organizationId,
      name: 'Lembrete 24h antes',
      content: `Olá {guest_name}!

Seu check-in é amanhã às {checkin_time}! ⏰

Estamos ansiosos para recebê-lo em {property_name}.

Já enviamos as instruções de acesso por e-mail. Não se esqueça de levar um documento de identificação.

Tem alguma dúvida? Estamos aqui para ajudar!`,
      category: 'pre_checkin',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-004',
      organization_id: organizationId,
      name: 'Boas-vindas',
      content: `Olá {guest_name}!

Bem-vindo(a) ao {property_name}! 🏡

Esperamos que aproveite sua estadia conosco. Se precisar de qualquer coisa, não hesite em nos contatar.

Algumas informações úteis:
- Check-out: {checkout_date} às 12h
- WiFi: {wifi_name} / {wifi_password}
- Emergências: +55 11 99999-9999

Boa estadia! 😊`,
      category: 'during_stay',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-005',
      organization_id: organizationId,
      name: 'Agradecimento pós check-out',
      content: `Olá {guest_name}!

Obrigado por se hospedar conosco! 😊

Esperamos que tenha aproveitado sua estadia em {property_name}.

Seria uma honra recebê-lo novamente em breve!

Até a próxima!`,
      category: 'post_checkout',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-006',
      organization_id: organizationId,
      name: 'Pedido de Avaliação',
      content: `Olá {guest_name}!

Sua opinião é muito importante para nós! ⭐

Poderia nos contar como foi sua experiência em {property_name}?

Sua avaliação nos ajuda a melhorar cada vez mais e ajuda outros viajantes a conhecerem nosso trabalho.

Muito obrigado!`,
      category: 'post_checkout',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-007',
      organization_id: organizationId,
      name: 'Lembrete de Pagamento',
      content: `Olá {guest_name}!

Lembramos que o pagamento da sua reserva está pendente.

💰 Valor: R$ {total_amount}
📅 Vencimento: {due_date}
🔢 Reserva: {reservation_code}

Por favor, efetue o pagamento até a data de vencimento para confirmar sua reserva.

Link de pagamento: {payment_link}

Obrigado!`,
      category: 'payment',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tpl-008',
      organization_id: organizationId,
      name: 'Resposta rápida - Disponibilidade',
      content: `Olá!

Obrigado pelo seu interesse! 😊

Para verificar a disponibilidade, preciso de algumas informações:

📅 Datas desejadas (check-in e check-out)
👥 Número de hóspedes
🏠 Preferência de imóvel (se houver)

Aguardo seu retorno!`,
      category: 'general',
      created_at: now,
      updated_at: now,
    },
  ];

  for (const template of templates) {
    await kv.set(`chat:template:${organizationId}:${template.id}`, template);
  }

  console.log(`✅ Created ${templates.length} templates`);

  // ============================================
  // CREATE CONVERSATIONS
  // ============================================

  const conversations: Conversation[] = [
    {
      id: 'conv-001',
      organization_id: organizationId,
      guest_name: 'Maria Silva',
      guest_email: 'maria.silva@email.com',
      guest_phone: '+55 11 98765-4321',
      reservation_code: 'RES-2024-001',
      property_name: 'Apartamento Copacabana Vista Mar',
      property_id: 'prop-001',
      channel: 'whatsapp',
      status: 'unread',
      category: 'urgent',
      conversation_type: 'guest',
      last_message: 'Olá, tenho uma dúvida sobre o check-in...',
      last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      checkin_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0], // 2 days from now
      checkout_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0], // 7 days from now
      isPinned: true,
      tags: ['tag-urgent'],
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'conv-002',
      organization_id: organizationId,
      guest_name: 'João Santos',
      guest_email: 'joao.santos@email.com',
      guest_phone: '+55 21 99876-5432',
      reservation_code: 'RES-2024-002',
      property_name: 'Casa Lagoa Rodrigo de Freitas',
      property_id: 'prop-002',
      channel: 'email',
      status: 'read',
      category: 'normal',
      conversation_type: 'guest',
      last_message: 'Obrigado pelas informações!',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      checkin_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().split('T')[0],
      checkout_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
      isPinned: false,
      tags: ['tag-vip'],
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: 'conv-003',
      organization_id: organizationId,
      guest_name: 'Ana Costa',
      guest_email: 'ana.costa@email.com',
      guest_phone: '+55 11 97654-3210',
      channel: 'system',
      status: 'unread',
      category: 'normal',
      conversation_type: 'lead',
      last_message: 'Gostaria de saber mais sobre apartamentos em Ipanema',
      last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
      isPinned: false,
      tags: [],
      lead_data: {
        desired_location: 'Ipanema, Rio de Janeiro',
        num_guests: 4,
        desired_checkin: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString().split('T')[0],
        desired_checkout: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString().split('T')[0],
      },
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 min ago
      updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'conv-004',
      organization_id: organizationId,
      guest_name: 'Carlos Oliveira',
      guest_email: 'carlos.oliveira@email.com',
      guest_phone: '+55 21 96543-2109',
      reservation_code: 'RES-2024-003',
      property_name: 'Cobertura Leblon Luxury',
      property_id: 'prop-003',
      channel: 'whatsapp',
      status: 'read',
      category: 'normal',
      conversation_type: 'guest',
      last_message: 'Tudo certo, muito obrigado!',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      checkin_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().split('T')[0],
      checkout_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString().split('T')[0],
      isPinned: false,
      tags: ['tag-payment'],
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: 'conv-005',
      organization_id: organizationId,
      guest_name: 'Beatriz Lima',
      guest_email: 'beatriz.lima@email.com',
      guest_phone: '+55 11 95432-1098',
      reservation_code: 'RES-2024-004',
      property_name: 'Studio Botafogo Moderno',
      property_id: 'prop-004',
      channel: 'email',
      status: 'resolved',
      category: 'resolved',
      conversation_type: 'guest',
      last_message: 'Problema resolvido, obrigada!',
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
      checkin_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString().split('T')[0], // already checked in
      checkout_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0],
      isPinned: false,
      tags: ['tag-maintenance', 'tag-followup'],
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
  ];

  for (const conversation of conversations) {
    await kv.set(`chat:conversation:${organizationId}:${conversation.id}`, conversation);
  }

  console.log(`✅ Created ${conversations.length} conversations`);

  // ============================================
  // CREATE MESSAGES
  // ============================================

  const messagesByConversation: Record<string, Message[]> = {
    'conv-001': [
      {
        id: 'msg-001-001',
        conversation_id: 'conv-001',
        sender_type: 'guest',
        sender_name: 'Maria Silva',
        content: 'Olá! Acabei de fazer a reserva e gostaria de confirmar o horário de check-in.',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'msg-001-002',
        conversation_id: 'conv-001',
        sender_type: 'staff',
        sender_name: 'Equipe RENDIZY',
        sender_id: 'staff-001',
        content: 'Olá Maria! Tudo bem? O check-in pode ser feito entre 14h e 22h. Você já tem previsão de horário?',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
        read_at: new Date(Date.now() - 1000 * 60 * 60 * 1.3).toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'msg-001-003',
        conversation_id: 'conv-001',
        sender_type: 'guest',
        sender_name: 'Maria Silva',
        content: 'Sim, pretendo chegar por volta das 16h.',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'msg-001-004',
        conversation_id: 'conv-001',
        sender_type: 'guest',
        sender_name: 'Maria Silva',
        content: 'Olá, tenho uma dúvida sobre o check-in...',
        sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        organization_id: organizationId,
      },
    ],
    'conv-002': [
      {
        id: 'msg-002-001',
        conversation_id: 'conv-002',
        sender_type: 'guest',
        sender_name: 'João Santos',
        content: 'Bom dia! Gostaria de informações sobre estacionamento no local.',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'msg-002-002',
        conversation_id: 'conv-002',
        sender_type: 'staff',
        sender_name: 'Equipe RENDIZY',
        sender_id: 'staff-001',
        content: 'Bom dia João! O imóvel possui 1 vaga de garagem coberta incluída na diária. Deseja mais alguma informação?',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        read_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'msg-002-003',
        conversation_id: 'conv-002',
        sender_type: 'guest',
        sender_name: 'João Santos',
        content: 'Obrigado pelas informações!',
        sent_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        organization_id: organizationId,
      },
    ],
    'conv-003': [
      {
        id: 'msg-003-001',
        conversation_id: 'conv-003',
        sender_type: 'guest',
        sender_name: 'Ana Costa',
        content: 'Olá! Estou planejando uma viagem para o Rio em janeiro e gostaria de saber mais sobre apartamentos em Ipanema.',
        sent_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'msg-003-002',
        conversation_id: 'conv-003',
        sender_type: 'guest',
        sender_name: 'Ana Costa',
        content: 'Gostaria de saber mais sobre apartamentos em Ipanema',
        sent_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        organization_id: organizationId,
      },
    ],
  };

  for (const [conversationId, messages] of Object.entries(messagesByConversation)) {
    for (const message of messages) {
      await kv.set(
        `chat:message:${organizationId}:${conversationId}:${message.id}`,
        message
      );
    }
  }

  console.log(`✅ Created messages for ${Object.keys(messagesByConversation).length} conversations`);

  return {
    tags,
    templates,
    conversations,
    messages: Object.values(messagesByConversation).flat(),
  };
}
