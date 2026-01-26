/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    LINK CONTACT TO DEAL MODAL                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Modal para vincular um contato (telefone/WhatsApp) a um Deal
 * Usado quando o Deal não tem telefone e queremos habilitar o chat
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * 
 * FUNCIONALIDADES:
 * - Buscar contato existente
 * - Criar novo contato
 * - Vincular ao Deal
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Search, 
  Plus, 
  Phone, 
  MessageCircle,
  User,
  Loader2,
  Check,
  ArrowLeft,
  Link2
} from 'lucide-react';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { Deal, phoneToWhatsAppJid, formatBrazilianPhone } from '../../types/crm';

// ============================================
// TYPES
// ============================================

export interface LinkContactToDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  /** Deal que precisa de contato */
  deal: Deal;
  
  /** Callback quando contato é vinculado */
  onContactLinked: (deal: Deal, contact: ContactInfo) => void;
}

export interface ContactInfo {
  id: string;
  name: string;
  phone: string;
  whatsAppJid: string;
  avatar?: string;
}

type Step = 'search' | 'create';

// ============================================
// MOCK DATA - Contatos existentes
// ============================================

const MOCK_CONTACTS: ContactInfo[] = [
  {
    id: 'contact-1',
    name: 'Rafa Claro 21',
    phone: '+55 21 99441-4512',
    whatsAppJid: '5521994414512@c.us',
  },
  {
    id: 'contact-2',
    name: 'Braga',
    phone: '+55 21 96530-6674',
    whatsAppJid: '5521965306674@c.us',
  },
  {
    id: 'contact-3',
    name: 'Claiton Lopes',
    phone: '+55 21 99999-0000',
    whatsAppJid: '5521999990000@c.us',
  },
  {
    id: 'contact-4',
    name: 'Euripedes Sua Casa',
    phone: '+55 21 99923-1862',
    whatsAppJid: '5521999231862@c.us',
  },
];

// ============================================
// COMPONENT
// ============================================

export function LinkContactToDealModal({
  open,
  onOpenChange,
  deal,
  onContactLinked,
}: LinkContactToDealModalProps) {
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form para novo contato
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setStep('search');
      setSearchQuery('');
      setNewContactName(deal.contactName || '');
      setNewContactPhone('');
    }
  }, [open, deal.contactName]);

  // Filtrar contatos
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return MOCK_CONTACTS;
    const query = searchQuery.toLowerCase();
    return MOCK_CONTACTS.filter(
      c => c.name.toLowerCase().includes(query) || 
           c.phone.includes(query)
    );
  }, [searchQuery]);

  const handleSelectContact = async (contact: ContactInfo) => {
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedDeal: Deal = {
        ...deal,
        contactId: contact.id,
        contactPhone: contact.phone,
        contactWhatsAppJid: contact.whatsAppJid,
        updatedAt: new Date().toISOString(),
      };

      toast.success('Contato vinculado!', {
        description: `${contact.name} vinculado ao deal`,
      });

      onContactLinked(updatedDeal, contact);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao vincular contato');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newContactName || !newContactPhone) return;

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const formattedPhone = formatBrazilianPhone(newContactPhone);
      const jid = phoneToWhatsAppJid(newContactPhone);

      const newContact: ContactInfo = {
        id: `contact-${Date.now()}`,
        name: newContactName,
        phone: formattedPhone,
        whatsAppJid: jid || '',
      };

      const updatedDeal: Deal = {
        ...deal,
        contactId: newContact.id,
        contactName: newContact.name,
        contactPhone: newContact.phone,
        contactWhatsAppJid: newContact.whatsAppJid,
        updatedAt: new Date().toISOString(),
      };

      toast.success('Contato criado e vinculado!', {
        description: `${newContact.name} vinculado ao deal`,
      });

      onContactLinked(updatedDeal, newContact);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao criar contato');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 'create' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setStep('search')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-green-600" />
                Vincular Contato
              </DialogTitle>
              <DialogDescription>
                {step === 'search' 
                  ? `Vincular contato ao deal "${deal.title}"`
                  : 'Criar novo contato'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* STEP 1: Buscar Contato */}
          {step === 'search' && (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Create New Button */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-dashed"
                onClick={() => setStep('create')}
              >
                <Plus className="w-4 h-4 text-green-600" />
                Criar novo contato
              </Button>

              {/* Contact List */}
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-auto py-3 px-3',
                        'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                      onClick={() => handleSelectContact(contact)}
                      disabled={isLoading}
                    >
                      <Avatar className="w-10 h-10 mr-3">
                        <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-700 text-sm">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{contact.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </p>
                      </div>
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    </Button>
                  ))}

                  {filteredContacts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum contato encontrado</p>
                      <Button
                        variant="link"
                        className="text-green-600"
                        onClick={() => setStep('create')}
                      >
                        Criar novo contato
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* STEP 2: Criar Contato */}
          {step === 'create' && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  O contato será criado e vinculado ao deal automaticamente.
                </p>
              </div>

              <div>
                <Label htmlFor="contactName">Nome do Contato</Label>
                <Input
                  id="contactName"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Telefone WhatsApp</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="contactPhone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+55 21 99999-9999"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +55 DDD número (ex: +55 21 99441-4512)
                </p>
              </div>
            </div>
          )}
        </div>

        {step === 'create' && (
          <DialogFooter>
            <Button
              onClick={handleCreateAndLink}
              disabled={isLoading || !newContactName || !newContactPhone}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Criar e Vincular
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LinkContactToDealModal;
