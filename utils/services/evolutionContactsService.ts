/**
 * RENDIZY - Evolution API Contacts & Chats Sync Service
 * 
 * Importa contatos e conversas da Evolution API automaticamente
 * Igual ao Chatwoot - sincronização automática a cada 5 minutos
 * 
 * @version v1.0.103.164
 * @date 2025-10-31
 */

// ============================================
// TYPES
// ============================================

export interface EvolutionContact {
  id: string; // e.g., "5511987654321@c.us"
  name: string;
  pushname: string;
  isBusiness: boolean;
  profilePicUrl?: string;
  isMyContact: boolean;
}

export interface EvolutionChat {
  id: string; // Same format as contact.id
  name: string;
  lastMessage?: string;
  unreadCount: number;
  timestamp?: number;
}

export interface LocalContact {
  id: string;
  name: string;
  phone: string; // Formatted: +55 11 98765-4321
  profilePicUrl?: string;
  isBusiness: boolean;
  source: 'evolution' | 'manual';
  lastMessage?: string;
  unreadCount: number;
  isOnline: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncStats {
  contactsImported: number;
  contactsUpdated: number;
  chatsImported: number;
  errors: number;
  lastSync: Date;
}

// ============================================
// EVOLUTION CONTACTS SERVICE
// ============================================

export class EvolutionContactsService {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
  private readonly STORAGE_KEY = 'rendizy_evolution_contacts';

  constructor(apiUrl: string, apiKey: string, instanceName: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.instanceName = instanceName;
  }

  /**
   * Fetch contacts from Evolution API via Supabase backend
   * ✅ ETAPA 3 - Agora usa o proxy Supabase
   */
  async fetchContacts(): Promise<EvolutionContact[]> {
    try {
      // ✅ ARQUITETURA SQL v1.0.103.950 - Usar token do usuário autenticado
      const token = localStorage.getItem('rendizy-token');
      
      if (!token) {
        console.error('[Evolution] ❌ Token não encontrado - usuário não autenticado');
        return [];
      }
      
      // Import necessário para obter projectId
      const { projectId } = await import('../supabase/info');
      
      console.log('[Evolution] 🔑 Token:', token ? `${token.substring(0, 20)}...` : 'NONE');
      
      // Import necessário para obter publicAnonKey
      const { publicAnonKey } = await import('../supabase/info');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/whatsapp/contacts`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
            'X-Auth-Token': token, // ✅ Token do usuário (evita validação JWT automática)
            'Content-Type': 'application/json'
          },
          credentials: 'omit' // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        }
      );

      if (!response.ok) {
        console.warn('[Evolution] ⚠️ API indisponível - modo offline ativo');
        return [];
      }

      const result = await response.json();
      
      // Verificar se está em modo offline
      if (result.offline) {
        // Silenciado v1.0.103.299 - warning não útil para usuário
        // console.warn('[Evolution] ⚠️ Modo offline:', result.message);
        return [];
      }
      
      const contacts = result.data || [];
      console.log(`✅ ${contacts.length} contatos encontrados via backend`);
      
      return Array.isArray(contacts) ? contacts : [];
    } catch (error) {
      console.warn('[Evolution] Erro ao buscar contatos:', error);
      return [];
    }
  }

  /**
   * Fetch chats from Evolution API via Supabase backend
   * ✅ ETAPA 3 - Agora usa o proxy Supabase
   */
  async fetchChats(): Promise<EvolutionChat[]> {
    try {
      // ✅ ARQUITETURA SQL v1.0.103.950 - Usar token do usuário autenticado
      const token = localStorage.getItem('rendizy-token');
      
      if (!token) {
        console.error('[Evolution] ❌ Token não encontrado - usuário não autenticado');
        return [];
      }
      
      // Import necessário para obter projectId
      const { projectId } = await import('../supabase/info');
      
      console.log('[Evolution] 🔑 Token:', token ? `${token.substring(0, 20)}...` : 'NONE');
      
      // Import necessário para obter publicAnonKey
      const { publicAnonKey } = await import('../supabase/info');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/whatsapp/chats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
            'X-Auth-Token': token, // ✅ Token do usuário (evita validação JWT automática)
            'Content-Type': 'application/json'
          },
          credentials: 'omit' // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        }
      );

      if (!response.ok) {
        console.warn('[Evolution] ⚠️ API indisponível - modo offline ativo');
        return [];
      }

      const result = await response.json();
      
      // Verificar se está em modo offline
      if (result.offline) {
        // Silenciado v1.0.103.299 - warning não útil para usuário
        // console.warn('[Evolution] ⚠️ Modo offline:', result.message);
        return [];
      }
      
      const chats = result.data || [];
      console.log(`✅ ${chats.length} conversas encontradas via backend`);
      
      return Array.isArray(chats) ? chats : [];
    } catch (error) {
      console.warn('[Evolution] ⚠️ Erro ao buscar conversas - modo offline:', error);
      return [];
    }
  }

  /**
   * Format phone number
   * Input: "5511987654321@c.us"
   * Output: "+55 11 98765-4321"
   */
  private formatPhoneNumber(id: string): string {
    // Remove @c.us or @s.whatsapp.net
    const number = id.replace('@c.us', '').replace('@s.whatsapp.net', '');
    
    // Brazilian format: +55 11 98765-4321
    if (number.startsWith('55') && number.length === 13) {
      const countryCode = number.substring(0, 2);
      const areaCode = number.substring(2, 4);
      const firstPart = number.substring(4, 9);
      const secondPart = number.substring(9, 13);
      return `+${countryCode} ${areaCode} ${firstPart}-${secondPart}`;
    }
    
    // Default: just add +
    return `+${number}`;
  }

  /**
   * Merge contact with chat data
   */
  private mergeContactWithChat(
    contact: EvolutionContact,
    chat?: EvolutionChat
  ): LocalContact {
    return {
      id: contact.id,
      name: contact.name || contact.pushname || 'Sem nome',
      phone: this.formatPhoneNumber(contact.id),
      profilePicUrl: contact.profilePicUrl,
      isBusiness: contact.isBusiness,
      source: 'evolution',
      lastMessage: chat?.lastMessage,
      unreadCount: chat?.unreadCount || 0,
      isOnline: contact.isMyContact,
      lastSeen: chat?.timestamp ? new Date(chat.timestamp * 1000) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Sync contacts and chats
   * ✅ RESTAURADO: Salva no SQL primeiro, fallback para localStorage
   */
  async syncContactsAndChats(organizationId?: string): Promise<SyncStats> {
    console.log('🔄 Iniciando sincronização de contatos e conversas...');
    
    const stats: SyncStats = {
      contactsImported: 0,
      contactsUpdated: 0,
      chatsImported: 0,
      errors: 0,
      lastSync: new Date()
    };

    try {
      // Buscar contatos e chats em paralelo
      const [contacts, chats] = await Promise.all([
        this.fetchContacts(),
        this.fetchChats()
      ]);

      // Criar mapa de chats por ID para acesso rápido
      const chatsMap = new Map<string, EvolutionChat>();
      chats.forEach(chat => {
        chatsMap.set(chat.id, chat);
        stats.chatsImported++;
      });

      // ✅ RESTAURADO: Carregar contatos existentes (SQL primeiro, fallback localStorage)
      const existingContacts = await this.getStoredContacts(organizationId);
      const existingContactsMap = new Map<string, LocalContact>();
      existingContacts.forEach(contact => {
        existingContactsMap.set(contact.id, contact);
      });

      // Processar cada contato
      const updatedContacts: LocalContact[] = [];
      
      for (const contact of contacts) {
        const chat = chatsMap.get(contact.id);
        const localContact = this.mergeContactWithChat(contact, chat);
        
        // Verificar se já existe
        const existing = existingContactsMap.get(contact.id);
        
        if (existing) {
          // Atualizar contato existente
          localContact.createdAt = existing.createdAt;
          stats.contactsUpdated++;
        } else {
          // Novo contato
          stats.contactsImported++;
        }
        
        updatedContacts.push(localContact);
      }

      // ✅ RESTAURADO: Salvar no SQL primeiro, fallback para localStorage
      await this.saveContacts(updatedContacts, organizationId);

      console.log('✅ Sincronização concluída:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      stats.errors++;
      return stats;
    }
  }

  /**
   * ✅ RESTAURADO: Get stored contacts (SQL primeiro, fallback localStorage)
   */
  async getStoredContacts(organizationId?: string): Promise<LocalContact[]> {
    // ✅ Tentar SQL primeiro se organizationId disponível
    if (organizationId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { projectId, publicAnonKey } = await import('../supabase/info');
        const supabaseUrl = `https://${projectId}.supabase.co`;
        const supabase = createClient(supabaseUrl, publicAnonKey);
        
        const { data, error } = await supabase
          .from('evolution_contacts')
          .select('*')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.warn(`⚠️ [EvolutionContactsService] Erro ao buscar contatos do SQL para org ${organizationId}:`, error.message);
          // Fallback para localStorage
          return this.getStoredContactsFromLocalStorage();
        }
        
        console.log(`✅ [EvolutionContactsService] ${data.length} contatos carregados do SQL para org ${organizationId}`);
        return data.map(this.mapSqlToLocalContact);
      } catch (sqlError) {
        console.error(`❌ [EvolutionContactsService] Erro crítico ao buscar contatos do SQL para org ${organizationId}:`, sqlError);
        // Fallback para localStorage
        return this.getStoredContactsFromLocalStorage();
      }
    }
    
    // Fallback: localStorage se não há organizationId
    return this.getStoredContactsFromLocalStorage();
  }

  /**
   * ✅ RESTAURADO: Get stored contacts from localStorage (fallback)
   */
  private getStoredContactsFromLocalStorage(): LocalContact[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const contacts = JSON.parse(stored);
      
      // Parse dates
      return contacts.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        lastSeen: c.lastSeen ? new Date(c.lastSeen) : undefined
      }));
    } catch (error) {
      console.error('Error loading contacts from localStorage:', error);
      return [];
    }
  }

  /**
   * ✅ RESTAURADO: Save contacts (SQL primeiro, fallback localStorage)
   */
  private async saveContacts(contacts: LocalContact[], organizationId?: string): Promise<void> {
    // ✅ Tentar SQL primeiro se organizationId disponível
    if (organizationId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { projectId, publicAnonKey } = await import('../supabase/info');
        const supabaseUrl = `https://${projectId}.supabase.co`;
        const supabase = createClient(supabaseUrl, publicAnonKey);
        
        const contactsToSave = contacts.map(c => this.mapLocalToSqlContact(c, organizationId));
        
        const { error } = await supabase
          .from('evolution_contacts')
          .upsert(contactsToSave, { onConflict: 'id,organization_id' });
        
        if (error) {
          console.warn(`⚠️ [EvolutionContactsService] Erro ao salvar contatos no SQL para org ${organizationId}:`, error.message);
          // Fallback para localStorage
          this.saveContactsToLocalStorage(contacts);
          return;
        }
        
        console.log(`💾 [EvolutionContactsService] ${contacts.length} contatos salvos no SQL para org ${organizationId}`);
        return;
      } catch (sqlError) {
        console.error(`❌ [EvolutionContactsService] Erro crítico ao salvar contatos no SQL para org ${organizationId}:`, sqlError);
        // Fallback para localStorage
        this.saveContactsToLocalStorage(contacts);
        return;
      }
    }
    
    // Fallback: localStorage se não há organizationId
    this.saveContactsToLocalStorage(contacts);
  }

  /**
   * ✅ RESTAURADO: Save contacts to localStorage (fallback)
   */
  private saveContactsToLocalStorage(contacts: LocalContact[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
      console.log(`💾 ${contacts.length} contatos salvos no localStorage`);
    } catch (error) {
      console.error('Error saving contacts to localStorage:', error);
    }
  }

  /**
   * ✅ RESTAURADO: Map SQL contact to LocalContact
   */
  private mapSqlToLocalContact(sqlContact: any): LocalContact {
    return {
      id: sqlContact.id,
      name: sqlContact.name,
      phone: sqlContact.phone,
      profilePicUrl: sqlContact.profile_pic_url,
      isBusiness: sqlContact.is_business || false,
      source: sqlContact.source || 'evolution',
      lastMessage: sqlContact.last_message,
      unreadCount: sqlContact.unread_count || 0,
      isOnline: sqlContact.is_online || false,
      lastSeen: sqlContact.last_seen ? new Date(sqlContact.last_seen) : undefined,
      createdAt: new Date(sqlContact.created_at),
      updatedAt: new Date(sqlContact.updated_at)
    };
  }

  /**
   * ✅ RESTAURADO: Map LocalContact to SQL contact
   */
  private mapLocalToSqlContact(localContact: LocalContact, organizationId: string): any {
    return {
      id: localContact.id,
      organization_id: organizationId,
      name: localContact.name,
      phone: localContact.phone,
      phone_raw: localContact.id.replace('@c.us', '').replace('@s.whatsapp.net', ''),
      pushname: localContact.name,
      is_business: localContact.isBusiness,
      is_my_contact: false,
      is_online: localContact.isOnline,
      profile_pic_url: localContact.profilePicUrl,
      last_message: typeof localContact.lastMessage === 'string' 
        ? localContact.lastMessage 
        : JSON.stringify(localContact.lastMessage),
      unread_count: localContact.unreadCount,
      last_seen: localContact.lastSeen?.toISOString(),
      source: localContact.source,
      created_at: localContact.createdAt.toISOString(),
      updated_at: localContact.updatedAt.toISOString(),
      last_sync_at: new Date().toISOString()
    };
  }

  /**
   * Start automatic sync (every 5 minutes)
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      console.warn('⚠️ Auto-sync já está ativo');
      return;
    }

    console.log('🔄 Iniciando sincronização automática (a cada 5 minutos)...');
    
    // Sync imediata
    this.syncContactsAndChats();
    
    // Sync a cada 5 minutos
    this.syncInterval = setInterval(() => {
      console.log('🔄 Sincronização automática agendada...');
      this.syncContactsAndChats();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Sincronização automática parada');
    }
  }

  /**
   * Search contacts by name or phone
   * ✅ CORRIGIDO: Agora é assíncrono e aceita organizationId
   */
  async searchContacts(query: string, organizationId?: string): Promise<LocalContact[]> {
    const contacts = await this.getStoredContacts(organizationId);
    const lowerQuery = query.toLowerCase();
    
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.phone.includes(lowerQuery)
    );
  }

  /**
   * Filter contacts by criteria
   * ✅ CORRIGIDO: Agora é assíncrono e aceita organizationId
   */
  async filterContacts(filters: {
    unreadOnly?: boolean;
    businessOnly?: boolean;
    onlineOnly?: boolean;
  }, organizationId?: string): Promise<LocalContact[]> {
    let contacts = await this.getStoredContacts(organizationId);
    
    if (filters.unreadOnly) {
      contacts = contacts.filter(c => c.unreadCount > 0);
    }
    
    if (filters.businessOnly) {
      contacts = contacts.filter(c => c.isBusiness);
    }
    
    if (filters.onlineOnly) {
      contacts = contacts.filter(c => c.isOnline);
    }
    
    return contacts;
  }

  /**
   * Get contact by ID
   * ✅ CORRIGIDO: Agora é assíncrono e aceita organizationId
   */
  async getContactById(id: string, organizationId?: string): Promise<LocalContact | undefined> {
    const contacts = await this.getStoredContacts(organizationId);
    return contacts.find(c => c.id === id);
  }

  /**
   * Clear all contacts
   */
  clearContacts(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Todos os contatos foram removidos');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let serviceInstance: EvolutionContactsService | null = null;

/**
 * Get or create Evolution Contacts Service instance
 */
export function getEvolutionContactsService(): EvolutionContactsService {
  if (!serviceInstance) {
    // Configuration from environment or defaults
    const apiUrl = 'https://evo.boravendermuito.com.br/api';
    const apiKey = '4de7861e944e291b56fe9781d2b00b36';
    const instanceName = 'Rendizy';
    
    serviceInstance = new EvolutionContactsService(apiUrl, apiKey, instanceName);
  }
  
  return serviceInstance;
}

/**
 * Initialize Evolution Contacts Service
 * Call this once when app starts
 */
export function initializeEvolutionContactsService(): void {
  const service = getEvolutionContactsService();
  service.startAutoSync();
  console.log('✅ Evolution Contacts Service inicializado');
}
