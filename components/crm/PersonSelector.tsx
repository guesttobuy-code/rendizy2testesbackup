import React, { useState, useEffect, useCallback } from 'react';
import { MultiSelect, MultiSelectOption } from './MultiSelect';
import { User, Users, UserCircle, ShoppingCart, Store, Loader2, AlertCircle } from 'lucide-react';
import { guestsApi, apiRequest } from '../../utils/api';
import { User as UserType } from '../../types/tenancy';
import { useAuth } from '../../contexts/AuthContext';
import { getEvolutionContactsService, LocalContact } from '../../utils/services/evolutionContactsService';
import { toast } from 'sonner';

export type PersonType = 'user' | 'contact' | 'guest' | 'buyer' | 'seller';

interface PersonSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  personTypes?: PersonType[]; // Tipos permitidos (padrão: todos)
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface Person {
  id: string;
  type: PersonType;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export function PersonSelector({
  selected,
  onChange,
  personTypes = ['user', 'contact', 'guest', 'buyer', 'seller'],
  placeholder = 'Selecione pessoas...',
  className,
  disabled = false,
}: PersonSelectorProps) {
  const { user, organization } = useAuth();
  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPeople();
  }, [personTypes]);

  const loadPeople = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const allPeople: Person[] = [];

      // Carregar usuários da organização
      if (personTypes.includes('user')) {
        try {
          const response = await apiRequest<UserType[]>('/users', { method: 'GET' });
          if (response.success && response.data) {
            allPeople.push(...response.data
              .filter(u => !search || 
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase()) ||
                u.phone?.toLowerCase().includes(search.toLowerCase())
              )
              .map(u => ({
                id: `user-${u.id}`,
                type: 'user' as PersonType,
                name: u.name,
                email: u.email,
                phone: u.phone,
                avatar: u.avatar,
              })));
          }
        } catch (error) {
          console.warn('Erro ao carregar usuários:', error);
        }
      }

      // Carregar contatos do WhatsApp/Evolution
      if (personTypes.includes('contact')) {
        try {
          const contactsService = getEvolutionContactsService();
          const contacts = await contactsService.getAllContacts();
          const filteredContacts = contacts
            .filter(c => !search || 
              c.name?.toLowerCase().includes(search.toLowerCase()) ||
              c.number?.includes(search)
            )
            .slice(0, 100); // Limitar a 100 contatos para performance
          
          allPeople.push(...filteredContacts.map(c => ({
            id: `contact-${c.number || c.id}`,
            type: 'contact' as PersonType,
            name: c.name || c.number || 'Contato sem nome',
            phone: c.number,
            email: c.email,
            avatar: c.avatar,
          })));
        } catch (error) {
          console.warn('Erro ao carregar contatos:', error);
        }
      }

      // Carregar hóspedes da API
      if (personTypes.includes('guest')) {
        try {
          const response = await guestsApi.list(search);
          if (response.success && response.data) {
            allPeople.push(...response.data.map(g => ({
              id: `guest-${g.id}`,
              type: 'guest' as PersonType,
              name: `${g.firstName} ${g.lastName}`.trim() || 'Hóspede sem nome',
              email: g.email,
              phone: g.phone,
            })));
          }
        } catch (error) {
          console.warn('Erro ao carregar hóspedes:', error);
        }
      }

      // Compradores e vendedores - por enquanto usar contatos como base
      // TODO: Implementar APIs específicas quando disponíveis
      if (personTypes.includes('buyer') || personTypes.includes('seller')) {
        // Usar contatos como base para compradores/vendedores
        try {
          const contactsService = getEvolutionContactsService();
          const contacts = await contactsService.getAllContacts();
          const type = personTypes.includes('buyer') ? 'buyer' : 'seller';
          allPeople.push(...contacts
            .filter(c => !search || 
              c.name?.toLowerCase().includes(search.toLowerCase()) ||
              c.number?.includes(search)
            )
            .slice(0, 50)
            .map(c => ({
              id: `${type}-${c.number || c.id}`,
              type: type as PersonType,
              name: c.name || c.number || `${type === 'buyer' ? 'Comprador' : 'Vendedor'} sem nome`,
              phone: c.number,
              email: c.email,
            })));
        } catch (error) {
          console.warn(`Erro ao carregar ${personTypes.includes('buyer') ? 'compradores' : 'vendedores'}:`, error);
        }
      }

      // Converter para MultiSelectOption
      const selectOptions: MultiSelectOption[] = allPeople.map(person => ({
        id: person.id,
        label: person.name,
        description: person.email || person.phone || '',
        avatar: person.avatar,
        icon: getPersonIcon(person.type),
        metadata: { type: person.type, ...person },
      }));

      setOptions(selectOptions);
    } catch (error: any) {
      console.error('Erro ao carregar pessoas:', error);
      setError(error.message || 'Erro ao carregar pessoas');
      toast.error('Erro ao carregar pessoas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [personTypes, user, organization]);

  const getPersonIcon = (type: PersonType) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'contact':
        return <UserCircle className="w-4 h-4" />;
      case 'guest':
        return <Users className="w-4 h-4" />;
      case 'buyer':
        return <ShoppingCart className="w-4 h-4" />;
      case 'seller':
        return <Store className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2 || query.length === 0) {
      loadPeople(query || undefined);
    }
  }, [loadPeople]);

  if (loading && options.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando pessoas...
        </div>
      </div>
    );
  }

  if (error && options.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <MultiSelect
      options={options}
      selected={selected}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Buscar por nome, email ou telefone..."
      emptyMessage={searchQuery ? "Nenhuma pessoa encontrada" : "Digite para buscar pessoas..."}
      className={className}
      disabled={disabled}
      onSearch={handleSearch}
      loading={loading}
    />
  );
}

