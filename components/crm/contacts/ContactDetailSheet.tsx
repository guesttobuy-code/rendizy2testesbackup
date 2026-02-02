/**
 * Sheet lateral para visualização detalhada de Contato
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../ui/sheet';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import {
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Linkedin,
  Instagram,
  UserCog,
  ExternalLink,
  Home,
  Briefcase,
  FileText,
  Clock,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '../../ui/utils';
import { CrmContact, ContactType } from '../../../src/utils/api-crm-contacts';

interface LinkedProperty {
  id: string;
  name: string;
  code: string;
  status: string;
  city?: string;
}

interface ContactDetailSheetProps {
  contact: CrmContact | null;
  onClose: () => void;
  onEdit: (contact: CrmContact) => void;
  onDelete: (contact: CrmContact) => void;
  onCreateUser: (contact: CrmContact) => void;
}

const TYPE_LABELS: Record<ContactType, string> = {
  guest: 'Hóspede',
  lead: 'Lead',
  cliente: 'Cliente',
  'ex-cliente': 'Ex-Cliente',
  proprietario: 'Proprietário',
  parceiro: 'Parceiro',
  fornecedor: 'Fornecedor',
  outro: 'Outro',
};

const TYPE_COLORS: Record<ContactType, string> = {
  guest: 'bg-blue-100 text-blue-700',
  lead: 'bg-yellow-100 text-yellow-700',
  cliente: 'bg-green-100 text-green-700',
  'ex-cliente': 'bg-gray-100 text-gray-700',
  proprietario: 'bg-purple-100 text-purple-700',
  parceiro: 'bg-orange-100 text-orange-700',
  fornecedor: 'bg-indigo-100 text-indigo-700',
  outro: 'bg-gray-100 text-gray-600',
};

export function ContactDetailSheet({
  contact,
  onClose,
  onEdit,
  onDelete,
  onCreateUser,
}: ContactDetailSheetProps) {
  const [linkedProperties, setLinkedProperties] = useState<LinkedProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Buscar imóveis vinculados quando o contato é proprietário
  useEffect(() => {
    if (!contact || contact.contact_type !== 'proprietario') {
      setLinkedProperties([]);
      return;
    }

    const fetchLinkedProperties = async () => {
      setLoadingProperties(true);
      try {
        // Usar mesma API que o ContactFormModal
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/lista`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const anuncios = result.anuncios || [];
          
          // Filtrar apenas imóveis deste proprietário
          const ownerProperties = anuncios.filter(
            (a: any) => a.owner_contact_id === contact.id
          );
          
          setLinkedProperties(ownerProperties.map((a: any) => ({
            id: a.id,
            name: a.data?.title || a.title || 'Sem nome',
            code: a.data?.internalId || a.data?.internal_id || a.data?.identificacao_interna || '-',
            status: a.status === 'active' ? 'Ativo' : (a.status || 'Ativo'),
            city: a.data?.address?.city || a.data?.cidade || '',
          })));
        }
      } catch (error) {
        console.error('Erro ao buscar imóveis vinculados:', error);
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchLinkedProperties();
  }, [contact?.id, contact?.contact_type]);

  if (!contact) return null;

  const typeLabel = TYPE_LABELS[contact.contact_type as ContactType] || 'Contato';
  const typeColor = TYPE_COLORS[contact.contact_type as ContactType] || TYPE_COLORS.outro;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <Sheet open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header com fundo colorido */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-6 border-b">
          <div className="flex items-start gap-4">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm",
              typeColor
            )}>
              {contact.first_name?.[0]?.toUpperCase() || '?'}
              {contact.last_name?.[0]?.toUpperCase() || ''}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {contact.full_name || 'Sem nome'}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("border-0 font-medium", typeColor)}>
                  {typeLabel}
                  {contact.is_type_locked && ' 🔒'}
                </Badge>
                {contact.user_id && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-0">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Tem acesso
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Conteúdo principal com padding */}
        <div className="p-6 space-y-6">
          {/* Ações rápidas */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            {!contact.user_id && contact.email && (
              <Button variant="outline" size="sm" onClick={() => onCreateUser(contact)}>
                <UserCog className="h-4 w-4 mr-2" />
                Criar acesso
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:bg-red-50"
              onClick={() => onDelete(contact)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>

          <Separator />

          {/* Contato */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Contato
            </h3>
            <div className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.mobile && contact.mobile !== contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{contact.mobile} (celular)</span>
                </div>
              )}
              {!contact.email && !contact.phone && !contact.mobile && (
                <p className="text-gray-400 text-sm">Nenhum contato informado</p>
              )}
            </div>
          </section>

          <Separator />

          {/* Empresa */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Empresa
            </h3>
            <div className="space-y-3">
              {contact.company_name ? (
                <>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{contact.company_name}</span>
                  </div>
                  {contact.job_title && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span>{contact.job_title}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm">Nenhuma empresa vinculada</p>
              )}
            </div>
          </section>

          {/* Proprietário: Imóveis vinculados */}
          {contact.contact_type === 'proprietario' && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Imóveis Vinculados
                </h3>
                {loadingProperties ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando imóveis...</span>
                  </div>
                ) : linkedProperties.length > 0 ? (
                  <div className="space-y-2">
                    {linkedProperties.map((property) => (
                      <div 
                        key={property.id} 
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                      >
                        <Home className="h-5 w-5 text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{property.name}</p>
                          <p className="text-xs text-gray-500">
                            {property.code}{property.city ? ` • ${property.city}` : ''}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs flex-shrink-0",
                            property.status === 'Ativo' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-gray-50 text-gray-600'
                          )}
                        >
                          {property.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Nenhum imóvel vinculado</p>
                )}
              </section>
            </>
          )}

          <Separator />

          {/* Endereço */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Endereço
            </h3>
            {contact.address_street || contact.address_city ? (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="text-sm">
                  {contact.address_street && <p>{contact.address_street}</p>}
                  <p>
                    {[contact.address_city, contact.address_state].filter(Boolean).join(', ')}
                    {contact.address_zip && ` - ${contact.address_zip}`}
                  </p>
                  {contact.address_country && contact.address_country !== 'Brasil' && (
                    <p>{contact.address_country}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Nenhum endereço informado</p>
            )}
          </section>

          {/* Redes Sociais */}
          {(contact.linkedin_url || contact.instagram_url) && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Redes Sociais
                </h3>
                <div className="flex gap-2">
                  {contact.linkedin_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {contact.instagram_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={contact.instagram_url} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4 mr-2" />
                        Instagram
                      </a>
                    </Button>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Notas */}
          {contact.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Observações
                </h3>
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Metadados */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Informações
            </h3>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4" />
                <span>Criado em {formatDateTime(contact.created_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4" />
                <span>Atualizado em {formatDateTime(contact.updated_at)}</span>
              </div>
              {contact.source && (
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4" />
                  <span>Origem: {contact.source}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
