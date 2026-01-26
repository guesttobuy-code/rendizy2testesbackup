/**
 * CHAT DETAILS SIDEBAR
 * 
 * Painel lateral direito com detalhes da conversa e observações
 * Componente ISOLADO - Coluna 3 do Chat
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * 
 * FUNCIONALIDADES:
 * - Dados do contato/hóspede
 * - Código de reserva
 * - Propriedade vinculada
 * - Datas de check-in/out
 * - Área de observações (notas internas)
 * - Botões de ações (preparados para ativação futura)
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  User,
  Phone,
  Mail,
  Home,
  Calendar,
  Tag,
  StickyNote,
  Save,
  Loader2,
  X,
  ChevronRight,
  Building2,
  Clock,
  MessageSquare,
  Users,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { toast } from 'sonner';
import { ChatAutomationButton } from '../automations/AutomationTriggerButton';
// import { getSupabaseClient } from '../../utils/supabase/client'; // TODO: Habilitar quando coluna 'notes' existir

// ============================================
// TYPES
// ============================================

export interface ChatDetailsSidebarProps {
  /** Dados do contato selecionado */
  contact: ChatContactDetails | null;
  
  /** Callback para abrir modal de ações rápidas */
  onOpenQuickActions?: () => void;
  
  /** Callback para abrir modal de bloqueio */
  onOpenBlockModal?: () => void;
  
  /** Callback para abrir modal de cotação */
  onOpenQuotation?: () => void;
  
  /** Callback para abrir modal de criar reserva */
  onOpenCreateReservation?: () => void;
  
  /** Classe CSS adicional */
  className?: string;
  
  /** Callback quando fechar/minimizar */
  onClose?: () => void;
}

export interface ChatContactDetails {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  type: 'guest' | 'lead';
  channel: string;
  
  // Dados de reserva (se for guest)
  reservationCode?: string;
  propertyId?: string;
  propertyName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  
  // Dados de lead (se for negociação)
  desiredLocation?: string;
  desiredGuests?: number;
  desiredCheckIn?: string;
  desiredCheckOut?: string;
  
  // Tags
  tags?: string[];
  
  // Observações
  notes?: string;
}

// ============================================
// COMPONENT
// ============================================

export function ChatDetailsSidebar({
  contact,
  onOpenQuickActions,
  onOpenBlockModal,
  onOpenQuotation,
  onOpenCreateReservation,
  onClose,
  className = ''
}: ChatDetailsSidebarProps) {
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);

  // Carregar observações quando mudar o contato
  useEffect(() => {
    if (contact?.notes) {
      setNotes(contact.notes);
    } else {
      setNotes('');
    }
    setNotesChanged(false);
  }, [contact?.id, contact?.notes]);

  // Salvar observações
  const handleSaveNotes = useCallback(async () => {
    if (!contact?.id) return;
    
    setIsSavingNotes(true);
    try {
      // Extrair o external_conversation_id (JID)
      const externalId = contact.id.startsWith('whatsapp-') 
        ? contact.id.replace('whatsapp-', '') 
        : contact.id;
      
      // Salvar localmente por enquanto (TODO: implementar API endpoint)
      // Por enquanto só simula o salvamento
      console.log('[ChatDetailsSidebar] Salvando notas para:', externalId, notes);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Quando a coluna 'notes' existir no banco, descomentar:
      // const supabase = getSupabaseClient();
      // await supabase.from('conversations').update({ notes }).eq('external_conversation_id', externalId);
      
      setNotesChanged(false);
      toast.success('Observações salvas!');
    } catch (error) {
      console.error('[ChatDetailsSidebar] Erro ao salvar:', error);
      toast.error('Erro ao salvar observações');
    } finally {
      setIsSavingNotes(false);
    }
  }, [contact?.id, notes]);

  // Formatar telefone
  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      const ddd = cleaned.substring(2, 4);
      const rest = cleaned.substring(4);
      if (rest.length === 9) return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
      if (rest.length === 8) return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return phone;
  };

  // Formatar data
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Calcular noites
  const calculateNights = () => {
    if (!contact?.checkInDate || !contact?.checkOutDate) return null;
    try {
      const checkIn = new Date(contact.checkInDate);
      const checkOut = new Date(contact.checkOutDate);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  // Se não há contato selecionado
  if (!contact) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-gray-400 ${className}`}>
        <User className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm text-center">Selecione uma conversa para ver os detalhes</p>
      </div>
    );
  }

  const nights = calculateNights();

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Detalhes</h3>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Avatar e Nome */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={contact.avatar} />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {contact.name?.substring(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{contact.name}</p>
            <div className="flex items-center gap-1.5">
              <Badge 
                variant={contact.type === 'guest' ? 'default' : 'secondary'}
                className={contact.type === 'guest' ? 'bg-blue-500' : 'bg-orange-500 text-white'}
              >
                {contact.type === 'guest' ? (
                  <><Home className="h-3 w-3 mr-1" /> Hóspede</>
                ) : (
                  <><Users className="h-3 w-3 mr-1" /> Lead</>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Scrollável - min-h-0 é essencial para flex overflow funcionar */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Seção: Contato */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Contato</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{formatPhone(contact.phone)}</span>
            </div>
            
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300 truncate">{contact.email}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 capitalize">{contact.channel}</span>
            </div>
          </div>
        </div>

        {/* Seção: Reserva (se for guest) */}
        {contact.type === 'guest' && (contact.reservationCode || contact.propertyName) && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Reserva</h4>
            
            <div className="space-y-3">
              {contact.reservationCode && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {contact.reservationCode}
                  </Badge>
                </div>
              )}
              
              {contact.propertyName && (
                <div className="flex items-start gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{contact.propertyName}</span>
                </div>
              )}
              
              {(contact.checkInDate || contact.checkOutDate) && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Check-in
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(contact.checkInDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Check-out
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(contact.checkOutDate)}
                    </span>
                  </div>
                  {nights && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        Total
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {nights} {nights === 1 ? 'noite' : 'noites'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seção: Interesse (se for lead) */}
        {contact.type === 'lead' && (contact.desiredLocation || contact.desiredCheckIn) && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Interesse</h4>
            
            <div className="space-y-2 text-sm">
              {contact.desiredLocation && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{contact.desiredLocation}</span>
                </div>
              )}
              {contact.desiredGuests && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{contact.desiredGuests} hóspedes</span>
                </div>
              )}
              {contact.desiredCheckIn && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatDate(contact.desiredCheckIn)} → {formatDate(contact.desiredCheckOut)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seção: Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Seção: Observações (Notas Internas) */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Observações
            </h4>
            {notesChanged && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-blue-600"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
              >
                {isSavingNotes ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Salvar
              </Button>
            )}
          </div>
          
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesChanged(true);
            }}
            placeholder="Adicione observações sobre esta conversa... (somente equipe)"
            className="min-h-[100px] text-sm resize-none bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 focus:border-yellow-400"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            💡 Notas internas - não visíveis para o cliente
          </p>
        </div>
      </div>

      {/* Footer: Ações */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-2">
        {/* 🤖 Botão de Automação - NOVO */}
        <ChatAutomationButton 
          contactId={contact.id}
          prefillInput={`Quando receber mensagem de ${contact.name}, `}
          onAutomationCreated={(automation) => {
            toast.success(`Automação "${automation.name}" criada!`);
          }}
          variant="default"
          size="sm"
          className="w-full justify-between bg-purple-600 hover:bg-purple-700 text-white"
          label="Criar Automação"
          icon={<Sparkles className="h-4 w-4" />}
        />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between"
          onClick={onOpenQuickActions}
          disabled={!onOpenQuickActions}
        >
          <span>Ações Rápidas</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {contact.type === 'lead' && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between text-green-600 border-green-200 hover:bg-green-50"
              onClick={onOpenQuotation}
              disabled={!onOpenQuotation}
            >
              <span>Fazer Cotação</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={onOpenCreateReservation}
              disabled={!onOpenCreateReservation}
            >
              <span>Criar Reserva</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {contact.type === 'guest' && contact.propertyId && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-between"
            onClick={onOpenBlockModal}
            disabled={!onOpenBlockModal}
          >
            <span>Criar Bloqueio</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default ChatDetailsSidebar;
