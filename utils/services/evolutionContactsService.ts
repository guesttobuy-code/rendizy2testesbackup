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
  id: string;                    // ID interno Evolution (CUID)
  remoteJid: string;             // ID WhatsApp: "5511987654321@s.whatsapp.net" ou "123@g.us"
  name?: string | null;          // Nome do grupo (apenas para @g.us)
  pushName?: string | null;      // Nome configurado pelo usuário no WhatsApp
  profilePicUrl?: string | null; // URL da foto de perfil (geralmente null)
  labels?: string[] | null;      // Etiquetas da Evolution API
  createdAt?: string;            // Data de criação
  updatedAt?: string;            // Data de atualização
  // Campos legados para compatibilidade
  pushname?: string;             // Alias para pushName
  isBusiness?: boolean;
  isMyContact?: boolean;
}

export interface EvolutionChat {
  id: string;                    // ID interno Evolution (CUID)
  remoteJid: string;             // ID WhatsApp: "5511987654321@s.whatsapp.net" ou "123@g.us"
  name?: string | null;          // Nome do grupo (apenas para @g.us)
  pushName?: string | null;      // Nome do último que mandou mensagem
  profilePicUrl?: string | null; // URL da foto de perfil
  labels?: string[] | null;      // Etiquetas
  createdAt?: string;            // Data de criação
  updatedAt?: string;            // Data de atualização
  // Campos legados
  lastMessage?: string;
  unreadCount?: number;
  timestamp?: number;
}

export interface LocalContact {
  id: string;                        // remoteJid: "5511987654321@s.whatsapp.net" ou "123@g.us"
  name: string;                      // Nome para exibição (calculado)
  phone: string;                     // Número formatado: +55 11 98765-4321
  phoneRaw?: string;                 // Número limpo: só dígitos
  profilePicUrl?: string;            // URL da foto de perfil
  pushName?: string;                 // Nome do WhatsApp (pushName)
  groupName?: string;                // Nome do grupo (se for grupo)
  conversationType: 'contact' | 'group' | 'broadcast' | 'unknown'; // Tipo de conversa
  isGroup: boolean;                  // true se @g.us
  isBroadcast: boolean;              // true se @lid
  isBusiness: boolean;               // É conta business
  source: 'evolution' | 'manual';    // Fonte do contato
  lastMessage?: string;              // Última mensagem
  unreadCount: number;               // Não lidas
  isOnline: boolean;                 // Está online
  lastSeen?: Date;                   // Última vez visto
  labels?: string[];                 // Etiquetas
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;                 // Última sincronização
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
   * ✅ MELHORADO v1.0.104.019: Detectar tipo de conversa pelo remoteJid
   * CORREÇÃO: @lid são contatos normais (IDs encriptados do WhatsApp Cloud), não broadcasts
   */
  private detectConversationType(remoteJid: string): { type: 'contact' | 'group' | 'broadcast' | 'unknown', isGroup: boolean, isBroadcast: boolean } {
    if (remoteJid.includes('@g.us')) {
      return { type: 'group', isGroup: true, isBroadcast: false };
    }
    // ✅ @broadcast é lista de transmissão
    if (remoteJid.includes('@broadcast')) {
      return { type: 'broadcast', isGroup: false, isBroadcast: true };
    }
    // ✅ CORREÇÃO: @lid são contatos normais com IDs encriptados do WhatsApp Cloud API
    // Não são broadcasts - são números de telefone mascarados para privacidade
    if (remoteJid.includes('@lid')) {
      return { type: 'contact', isGroup: false, isBroadcast: false };
    }
    if (remoteJid.includes('@s.whatsapp.net') || remoteJid.includes('@c.us')) {
      return { type: 'contact', isGroup: false, isBroadcast: false };
    }
    return { type: 'unknown', isGroup: false, isBroadcast: false };
  }

  /**
   * ✅ MELHORADO v1.0.104.010: Extrair número limpo do remoteJid
   */
  private extractPhoneRaw(remoteJid: string): string {
    return remoteJid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace('@g.us', '')
      .replace('@lid', '')
      .replace('@broadcast', '');
  }

  /**
   * ✅ MELHORADO v1.0.104.019: Calcular nome de exibição inteligente
   * CORREÇÃO: Tratar @lid que não têm número de telefone visível
   */
  private calculateDisplayName(
    remoteJid: string,
    groupName?: string | null,
    pushName?: string | null,
    conversationType?: 'contact' | 'group' | 'broadcast' | 'unknown'
  ): string {
    // 1. Se tem nome do grupo (só para grupos)
    if (groupName && groupName.trim()) {
      return groupName.trim();
    }
    
    // 2. Se tem pushName (nome do WhatsApp)
    if (pushName && pushName.trim()) {
      return pushName.trim();
    }
    
    // 3. Fallback por tipo
    if (conversationType === 'group') {
      return 'Grupo sem nome';
    }
    if (conversationType === 'broadcast') {
      return 'Lista de transmissão';
    }
    
    // 4. Formatar telefone
    const phoneRaw = this.extractPhoneRaw(remoteJid);
    
    // ✅ v1.0.104.019: Se é @lid, o "número" é um ID encriptado (não telefone real)
    // Mostramos "Contato WhatsApp" em vez de um ID sem sentido
    if (remoteJid.includes('@lid')) {
      // ID encriptado - não tem número visível
      return 'Contato WhatsApp';
    }
    
    // Se é um número de telefone válido (apenas dígitos)
    if (/^\d+$/.test(phoneRaw) && phoneRaw.length >= 8) {
      return this.formatPhoneNumber(remoteJid);
    }
    
    return 'Desconhecido';
  }

  /**
   * ✅ MELHORADO v1.0.104.018: Merge contact com todos os campos da API
   * IMPORTANTE: updatedAt deve refletir o timestamp da última mensagem para ordenação correta
   */
  private mergeContactWithChat(
    contact: EvolutionContact,
    chat?: EvolutionChat
  ): LocalContact {
    // Usar remoteJid como ID principal (compatibilidade com código existente)
    const remoteJid = contact.remoteJid || contact.id;
    
    // Detectar tipo
    const { type: conversationType, isGroup, isBroadcast } = this.detectConversationType(remoteJid);
    
    // Obter nomes (priorizar da API, fallback para legado)
    const pushName = contact.pushName || contact.pushname || null;
    const groupName = contact.name || chat?.name || null;
    
    // Calcular nome para exibição
    const displayName = this.calculateDisplayName(remoteJid, groupName, pushName, conversationType);
    
    // Extrair número limpo
    const phoneRaw = this.extractPhoneRaw(remoteJid);
    
    // ✅ v1.0.104.018: Usar timestamp do CHAT (última mensagem) para ordenação correta
    // Prioridade: chat.timestamp > contact.updatedAt > now
    let lastActivityDate: Date;
    if (chat?.timestamp && chat.timestamp > 0) {
      lastActivityDate = new Date(chat.timestamp * 1000); // Evolution usa timestamp Unix
    } else if (contact.updatedAt) {
      lastActivityDate = new Date(contact.updatedAt);
    } else {
      lastActivityDate = new Date();
    }
    
    return {
      id: remoteJid,
      name: displayName,
      phone: isGroup || isBroadcast ? '' : this.formatPhoneNumber(remoteJid),
      phoneRaw: isGroup || isBroadcast ? '' : phoneRaw,
      profilePicUrl: contact.profilePicUrl || chat?.profilePicUrl || undefined,
      pushName: pushName || undefined,
      groupName: groupName || undefined,
      conversationType,
      isGroup,
      isBroadcast,
      isBusiness: contact.isBusiness || false,
      source: 'evolution',
      lastMessage: chat?.lastMessage,
      unreadCount: chat?.unreadCount || 0,
      isOnline: contact.isMyContact || false,
      lastSeen: chat?.timestamp ? new Date(chat.timestamp * 1000) : undefined,
      labels: contact.labels || chat?.labels || undefined,
      createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
      updatedAt: lastActivityDate, // ✅ Agora reflete última atividade do CHAT
      lastSyncAt: new Date(),
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
          .from('chat_contacts')
          .select('*')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.warn(`⚠️ [EvolutionContactsService] Erro ao buscar contatos do SQL para org ${organizationId}:`, error.message);
          // Fallback para localStorage
          return this.getStoredContactsFromLocalStorage();
        }
        
        console.log(`✅ [EvolutionContactsService] ${data.length} contatos carregados do SQL (chat_contacts) para org ${organizationId}`);
        // ✅ CORREÇÃO: Usar arrow function para manter contexto do this
        const mappedContacts = data.map((sqlContact) => this.mapSqlToLocalContact(sqlContact));
        console.log(`📱 [EvolutionContactsService] Primeiro contato mapeado:`, mappedContacts[0] ? { id: mappedContacts[0].id, phone: mappedContacts[0].phone, name: mappedContacts[0].name } : 'nenhum');
        return mappedContacts;
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
          .from('chat_contacts')
          .upsert(contactsToSave, { onConflict: 'id,organization_id' });
        
        if (error) {
          console.warn(`⚠️ [EvolutionContactsService] Erro ao salvar contatos no SQL (chat_contacts) para org ${organizationId}:`, error.message);
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
   * ✅ MELHORADO v1.0.104.010: Map SQL contact to LocalContact com todos os campos
   */
  private mapSqlToLocalContact(sqlContact: any): LocalContact {
    // Usar external_id (formato WhatsApp) como id
    const whatsappId = sqlContact.external_id || sqlContact.id;
    
    // Detectar tipo
    const { type: conversationType, isGroup, isBroadcast } = this.detectConversationType(whatsappId);
    
    // Calcular nome para exibição
    const displayName = this.calculateDisplayName(
      whatsappId,
      sqlContact.group_name,
      sqlContact.pushname || sqlContact.name,
      conversationType
    );
    
    return {
      id: whatsappId,
      name: displayName,
      phone: sqlContact.phone || '',
      phoneRaw: sqlContact.phone_raw || this.extractPhoneRaw(whatsappId),
      profilePicUrl: sqlContact.profile_pic_url || undefined,
      pushName: sqlContact.pushname || undefined,
      groupName: sqlContact.group_name || undefined,
      conversationType: sqlContact.conversation_type || conversationType,
      isGroup: sqlContact.is_group ?? isGroup,
      isBroadcast: sqlContact.is_broadcast ?? isBroadcast,
      isBusiness: sqlContact.is_business || false,
      source: sqlContact.source || 'evolution',
      lastMessage: sqlContact.last_message,
      unreadCount: sqlContact.unread_count || 0,
      isOnline: sqlContact.is_online || false,
      lastSeen: sqlContact.last_seen ? new Date(sqlContact.last_seen) : undefined,
      labels: sqlContact.labels || undefined,
      createdAt: new Date(sqlContact.created_at),
      updatedAt: new Date(sqlContact.updated_at),
      lastSyncAt: sqlContact.last_sync_at ? new Date(sqlContact.last_sync_at) : undefined,
    };
  }

  /**
   * ✅ MELHORADO v1.0.104.010: Map LocalContact to SQL contact com todos os campos
   */
  private mapLocalToSqlContact(localContact: LocalContact, organizationId: string): any {
    return {
      // IDs
      external_id: localContact.id,
      organization_id: organizationId,
      channel: 'whatsapp',
      
      // Nomes
      name: localContact.name,
      pushname: localContact.pushName || localContact.name,
      group_name: localContact.groupName || null,
      
      // Telefone
      phone: localContact.phone || null,
      phone_raw: localContact.phoneRaw || this.extractPhoneRaw(localContact.id),
      
      // Tipo de conversa
      conversation_type: localContact.conversationType || 'contact',
      is_group: localContact.isGroup || false,
      is_broadcast: localContact.isBroadcast || false,
      is_business: localContact.isBusiness || false,
      
      // Mídia
      profile_pic_url: localContact.profilePicUrl || null,
      
      // Status
      is_online: localContact.isOnline || false,
      last_seen: localContact.lastSeen?.toISOString() || null,
      
      // Mensagens
      last_message: typeof localContact.lastMessage === 'string' 
        ? localContact.lastMessage 
        : localContact.lastMessage ? JSON.stringify(localContact.lastMessage) : null,
      unread_count: localContact.unreadCount || 0,
      
      // Metadados
      labels: localContact.labels ? JSON.stringify(localContact.labels) : null,
      source: localContact.source || 'evolution',
      last_sync_at: new Date().toISOString(),
      
      // Datas (só atualizar se novo)
      updated_at: new Date().toISOString(),
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
 * 
 * ✅ v1.0.104.016: Auto-sync DESABILITADO - webhook mantém dados atualizados
 * O refresh automático a cada 5 minutos estava causando piscadas na tela.
 * Webhooks da Evolution API são responsáveis por manter os dados em tempo real.
 */
export function initializeEvolutionContactsService(): void {
  const service = getEvolutionContactsService();
  // ❌ DESABILITADO: Auto-sync causa refresh desnecessário na tela
  // service.startAutoSync();
  console.log('✅ Evolution Contacts Service inicializado (auto-sync DESABILITADO - webhook ativo)');
}
