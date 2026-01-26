/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         CRM TYPES - DEALS MODULE                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Tipos e Interfaces para o módulo CRM - Deals/Negócios
 * 
 * @version 2.0.0
 * @date 2026-01-25
 * 
 * CHANGELOG:
 * - v2.0.0: Adicionado contactPhone, contactWhatsAppJid para integração com Chat
 * - v1.0.0: Versão inicial
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type DealStage = 
  | 'QUALIFIED' 
  | 'CONTACT_MADE' 
  | 'MEETING_ARRANGED' 
  | 'PROPOSAL_MADE' 
  | 'NEGOTIATIONS'
  | 'WON'
  | 'LOST';

export type DealSource = 'WHATSAPP' | 'EMAIL' | 'AIRBNB' | 'PHONE' | 'WEBSITE' | 'OTHER';

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'STAGE_CHANGE';

// ============================================
// MAIN INTERFACES
// ============================================

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: 'BRL' | 'USD' | 'EUR';
  stage: DealStage;
  source: DealSource;
  probability: number; // 0-100
  
  // Contato principal
  contactId?: string;
  contactName: string;
  contactAvatar?: string;
  /** Telefone formatado: "+55 21 99441-4512" */
  contactPhone?: string;
  /** Email do contato */
  contactEmail?: string;
  /** JID WhatsApp: "5521994414512@c.us" - Se não informado, será derivado do contactPhone */
  contactWhatsAppJid?: string;
  
  // Owner/Responsável
  ownerId?: string;
  ownerName: string;
  ownerAvatar?: string;
  
  // Datas
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Status
  isStale?: boolean; // Lead estagnado (sem atividade há X dias)
  
  // Relacionamentos
  products?: DealProduct[];
  notes?: string;
  
  // Funil (para multi-funil)
  funnelId?: string;
  funnelName?: string;
}

export interface DealProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: ActivityType;
  title: string;
  description?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface DealContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  company?: string;
  source: DealSource;
}

export interface DealMessage {
  id: string;
  dealId: string;
  contactId: string;
  content: string;
  sender: 'USER' | 'CONTACT';
  source: DealSource;
  createdAt: string;
  read: boolean;
}

export interface DealStageConfig {
  id: DealStage;
  label: string;
  order: number;
  color: string;
  deals: Deal[];
  totalValue: number;
}

// ============================================
// FUNNEL INTERFACES (Multi-funil)
// ============================================

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  stages: FunnelStage[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStage {
  id: string;
  funnelId: string;
  name: string;
  order: number;
  color: string;
  probability?: number; // Probabilidade padrão para deals neste estágio
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Converte número de telefone para JID do WhatsApp
 * @param phone - Telefone formatado: "+55 21 99441-4512"
 * @returns JID: "5521994414512@c.us"
 */
export function phoneToWhatsAppJid(phone?: string): string | undefined {
  if (!phone) return undefined;
  // Remove +, -, espaços, parênteses
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  if (!cleaned || cleaned.length < 10) return undefined;
  return `${cleaned}@c.us`;
}

/**
 * Extrai número de telefone de um JID do WhatsApp
 * @param jid - JID: "5521994414512@c.us"
 * @returns Telefone limpo: "5521994414512"
 */
export function whatsAppJidToPhone(jid?: string): string | undefined {
  if (!jid) return undefined;
  return jid.replace('@c.us', '').replace('@s.whatsapp.net', '');
}

/**
 * Formata número de telefone brasileiro
 * @param phone - Telefone limpo: "5521994414512"
 * @returns Formatado: "+55 21 99441-4512"
 */
export function formatBrazilianPhone(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    if (rest.length === 9) {
      return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return `+55 ${ddd} ${rest}`;
  }
  
  return phone;
}

// ============================================
// QUICK ACTIONS TYPES
// ============================================

export type QuickActionType = 
  | 'CREATE_DEAL'
  | 'CREATE_RESERVATION'
  | 'CREATE_QUOTATION'
  | 'BLOCK_BROKER_VISIT'
  | 'BLOCK_CLIENT_VISIT'
  | 'BLOCK_GENERIC';

export interface QuickAction {
  type: QuickActionType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// ============================================
// RE-EXPORT para compatibilidade
// ============================================
export type CrmEntity = Deal | DealActivity | DealContact | DealMessage;
