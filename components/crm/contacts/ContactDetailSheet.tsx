/**
 * Sheet lateral para visualização detalhada de Contato
 */

import React from 'react';
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
} from 'lucide-react';
import { cn } from '../../ui/utils';
import { CrmContact, ContactType } from '../../../utils/api-crm-contacts';

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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold",
                typeColor
              )}>
                {contact.first_name?.[0]?.toUpperCase() || '?'}
                {contact.last_name?.[0]?.toUpperCase() || ''}
              </div>
              <div>
                <SheetTitle className="text-xl">
                  {contact.full_name || 'Sem nome'}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("border-0", typeColor)}>
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
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Ações rápidas */}
          <div className="flex gap-2">
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
                {contact.property_ids && contact.property_ids.length > 0 ? (
                  <div className="space-y-2">
                    {contact.property_ids.map((id, idx) => (
                      <div key={id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <Home className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">Imóvel #{idx + 1}</span>
                        <Button variant="ghost" size="sm" className="ml-auto">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
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
