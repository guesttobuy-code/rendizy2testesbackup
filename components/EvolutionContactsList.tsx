/**
 * RENDIZY - Evolution Contacts List Component
 * 
 * Exibe contatos e conversas importados da Evolution API
 * Interface semelhante ao Chatwoot
 * 
 * @version v1.0.103.164
 * @date 2025-10-31
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Circle,
  MessageCircle,
  Phone,
  Building2,
  User,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  getEvolutionContactsService,
  LocalContact,
  SyncStats
} from '../utils/services/evolutionContactsService';
import { useAuth } from '../src/contexts/AuthContext';

interface EvolutionContactsListProps {
  onContactSelect?: (contact: LocalContact) => void;
  selectedContactId?: string;
}

export function EvolutionContactsList({
  onContactSelect,
  selectedContactId
}: EvolutionContactsListProps) {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<LocalContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [filters, setFilters] = useState({
    unreadOnly: false,
    businessOnly: false,
    onlineOnly: false
  });

  const service = getEvolutionContactsService();

  /**
   * ✅ CORRIGIDO: Load contacts from service (agora assíncrono e usa SQL)
   */
  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const storedContacts = await service.getStoredContacts(organizationId);
      setContacts(storedContacts);
      setFilteredContacts(storedContacts);
      console.log(`📋 ${storedContacts.length} contatos carregados${organizationId ? ' do SQL' : ' do localStorage'}`);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ✅ CORRIGIDO: Sync contacts from Evolution API (agora passa organizationId)
   */
  const handleSync = async () => {
    setIsSyncing(true);
    toast.info('Sincronizando contatos da Evolution API...');
    
    try {
      const stats: SyncStats = await service.syncContactsAndChats(organizationId);
      
      // Reload contacts
      await loadContacts();
      setLastSync(new Date());
      
      // Show success message
      const message = `✅ ${stats.contactsImported} novos contatos, ${stats.contactsUpdated} atualizados, ${stats.chatsImported} conversas`;
      toast.success(message);
      
      console.log('📊 Estatísticas da sincronização:', stats);
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error('Erro ao sincronizar contatos');
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Filter contacts based on search and filters
   */
  useEffect(() => {
    let result = [...contacts];

    // Apply filters
    if (filters.unreadOnly) {
      result = result.filter(c => c.unreadCount > 0);
    }
    if (filters.businessOnly) {
      result = result.filter(c => c.isBusiness);
    }
    if (filters.onlineOnly) {
      result = result.filter(c => c.isOnline);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query)
      );
    }

    // Sort: unread first, then by last message
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0);
    });

    setFilteredContacts(result);
  }, [contacts, searchQuery, filters]);

  /**
   * ✅ CORRIGIDO: Load contacts on mount (agora assíncrono)
   */
  useEffect(() => {
    loadContacts();
  }, [organizationId]); // Recarregar quando organizationId mudar

  // ✅ REQUISITO 2: Sincronização automática ao montar e atualização periódica
  // ✅ CORRIGIDO: Agora passa organizationId para salvar no SQL
  useEffect(() => {
    let mounted = true;
    
    // Sincronizar imediatamente ao montar
    const syncOnMount = async () => {
      if (!isSyncing && mounted && organizationId) {
        console.log('🔄 [EvolutionContactsList] Sincronizando conversas ao entrar na tela...');
        setIsSyncing(true);
        toast.info('Sincronizando contatos da Evolution API...');
        
        try {
          const stats: SyncStats = await service.syncContactsAndChats(organizationId);
          
          if (mounted) {
            // Reload contacts
            await loadContacts();
            setLastSync(new Date());
            
            // Show success message
            const message = `✅ ${stats.contactsImported} novos contatos, ${stats.contactsUpdated} atualizados, ${stats.chatsImported} conversas`;
            toast.success(message);
            
            console.log('📊 Estatísticas da sincronização:', stats);
          }
        } catch (error) {
          if (mounted) {
            console.error('Erro na sincronização:', error);
            toast.error('Erro ao sincronizar contatos');
          }
        } finally {
          if (mounted) {
            setIsSyncing(false);
          }
        }
      }
    };
    
    if (organizationId) {
      syncOnMount();
    }
    
    // ✅ REQUISITO 2: Atualização automática de conversas (polling a cada 30 segundos)
    const interval = setInterval(() => {
      if (!isSyncing && mounted && organizationId) {
        console.log('🔄 [EvolutionContactsList] Atualizando conversas automaticamente...');
        handleSync();
      }
    }, 30000); // 30 segundos

    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]); // Recarregar quando organizationId mudar

  /**
   * Get initials for avatar
   */
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  /**
   * Toggle filter
   */
  const toggleFilter = (filterKey: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (date?: Date): string => {
    if (!date) return '';
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            WhatsApp Contacts
          </h2>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            size="sm"
            variant="outline"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar contatos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={filters.unreadOnly ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('unreadOnly')}
          >
            {filters.unreadOnly && <CheckCircle2 className="w-3 h-3 mr-1" />}
            Não lidas
          </Badge>
          <Badge
            variant={filters.businessOnly ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('businessOnly')}
          >
            {filters.businessOnly && <CheckCircle2 className="w-3 h-3 mr-1" />}
            Business
          </Badge>
          <Badge
            variant={filters.onlineOnly ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFilter('onlineOnly')}
          >
            {filters.onlineOnly && <CheckCircle2 className="w-3 h-3 mr-1" />}
            Online
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filteredContacts.length} contatos</span>
          {lastSync && (
            <span>Última sync: {formatTimeAgo(lastSync)}</span>
          )}
        </div>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2">
              {searchQuery || Object.values(filters).some(f => f)
                ? 'Nenhum contato encontrado'
                : 'Nenhum contato sincronizado'}
            </p>
            <Button onClick={handleSync} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar agora
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onContactSelect?.(contact)}
                className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                  selectedContactId === contact.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={contact.profilePicUrl} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    {contact.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-900 truncate">
                          {contact.name}
                        </span>
                        {contact.isBusiness && (
                          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {contact.lastSeen && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTimeAgo(contact.lastSeen)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {contact.phone}
                      </span>
                    </div>

                    {contact.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {contact.lastMessage}
                      </p>
                    )}

                    {contact.unreadCount > 0 && (
                      <div className="mt-2">
                        <Badge variant="default" className="bg-green-500">
                          {contact.unreadCount} nova{contact.unreadCount > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
