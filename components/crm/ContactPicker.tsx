/**
 * ContactPicker - Seletor de Contato para uso em formulários
 * Usado em: Deal, Reserva, etc.
 * 
 * Features:
 * - Busca em tempo real
 * - Criar novo contato inline
 * - Mostrar contato selecionado
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import { cn } from '../ui/utils';
import {
  Search,
  User,
  UserPlus,
  X,
  Check,
  Building2,
  Phone,
  Mail,
  ChevronsUpDown,
  Loader2,
} from 'lucide-react';
import { crmContactsApi, CrmContact, ContactType } from '../../src/utils/api-crm-contacts';
import { ContactFormModal } from './contacts/ContactFormModal';

// ============================================================================
// TYPES
// ============================================================================

interface ContactPickerProps {
  value?: string | null; // contact_id
  onChange: (contactId: string | null, contact?: CrmContact) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean;
  filterTypes?: ContactType[];
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  guest: 'bg-blue-100 text-blue-700',
  lead: 'bg-yellow-100 text-yellow-700',
  cliente: 'bg-green-100 text-green-700',
  'ex-cliente': 'bg-gray-100 text-gray-700',
  proprietario: 'bg-purple-100 text-purple-700',
  parceiro: 'bg-orange-100 text-orange-700',
  fornecedor: 'bg-indigo-100 text-indigo-700',
  outro: 'bg-gray-100 text-gray-600',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ContactPicker({
  value,
  onChange,
  placeholder = 'Selecione um contato...',
  disabled = false,
  className,
  allowCreate = true,
  filterTypes,
  error,
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar contato selecionado se value mudar
  useEffect(() => {
    if (value && !selectedContact) {
      crmContactsApi.get(value).then(response => {
        setSelectedContact(response.data || null);
      }).catch(err => {
        console.error('Erro ao carregar contato selecionado:', err);
      });
    } else if (!value) {
      setSelectedContact(null);
    }
  }, [value]);

  // Buscar contatos quando digitar
  useEffect(() => {
    if (!open) return;

    // Debounce
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let result: CrmContact[];
        
        if (search.trim()) {
          const response = await crmContactsApi.search(
            search, 
            filterTypes?.length === 1 ? filterTypes[0] : undefined,
            20
          );
          result = response.data || [];
        } else {
          const response = await crmContactsApi.list({ limit: 20 });
          result = response.data?.data || [];
        }

        // Filtrar por tipos se especificado
        if (filterTypes && filterTypes.length > 0) {
          result = result.filter(c => filterTypes.includes(c.contact_type as ContactType));
        }

        setContacts(result);
      } catch (error) {
        console.error('Erro ao buscar contatos:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, open, filterTypes]);

  // Carregar contatos iniciais ao abrir
  useEffect(() => {
    if (open && contacts.length === 0) {
      setLoading(true);
      crmContactsApi.list({ limit: 20 }).then(res => {
        let result = res.data?.data || [];
        if (filterTypes && filterTypes.length > 0) {
          result = result.filter(c => filterTypes.includes(c.contact_type as ContactType));
        }
        setContacts(result);
      }).catch(err => {
        console.error('Erro ao carregar contatos:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open]);

  const handleSelect = (contact: CrmContact) => {
    setSelectedContact(contact);
    onChange(contact.id, contact);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedContact(null);
    onChange(null);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    // Recarregar lista
    setSearch('');
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !selectedContact && "text-muted-foreground",
              error && "border-red-500",
              className
            )}
          >
            {selectedContact ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                  TYPE_COLORS[selectedContact.contact_type] || TYPE_COLORS.outro
                )}>
                  {selectedContact.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="truncate">{selectedContact.full_name}</span>
                {selectedContact.company_name && (
                  <span className="text-xs text-gray-400 truncate">
                    ({selectedContact.company_name})
                  </span>
                )}
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {selectedContact && (
                <X 
                  className="h-4 w-4 hover:text-red-500 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar por nome, email ou telefone..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : contacts.length === 0 ? (
                <CommandEmpty>
                  <div className="text-center py-4">
                    <User className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      {search ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelect(contact)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                          TYPE_COLORS[contact.contact_type] || TYPE_COLORS.outro
                        )}>
                          {contact.first_name?.[0]?.toUpperCase() || '?'}
                          {contact.last_name?.[0]?.toUpperCase() || ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {contact.full_name || 'Sem nome'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {contact.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        {value === contact.id && (
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {allowCreate && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        setCreateModalOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      <span>Criar novo contato</span>
                      {search && (
                        <span className="ml-1 text-gray-400">"{search}"</span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Modal criar contato */}
      <ContactFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
        defaultType={filterTypes?.[0] || 'lead'}
      />
    </>
  );
}

export default ContactPicker;
