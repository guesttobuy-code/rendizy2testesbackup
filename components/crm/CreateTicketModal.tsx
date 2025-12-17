import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ServiceTicket, ServiceTicketTemplate, Funnel, TicketPerson, TicketProperty, TicketAutomation } from '../../types/funnels';
import { ticketTemplatesApi, servicesTicketsApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Copy, FileText, Globe } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { PersonSelector } from './PersonSelector';
import { PropertySelector } from './PropertySelector';
import { AutomationSelector } from './AutomationSelector';
import { guestsApi, propertiesApi, automationsApi, reservationsApi } from '../../utils/api';
import { getEvolutionContactsService } from '../../utils/services/evolutionContactsService';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (ticket: ServiceTicket) => void;
  funnel: Funnel;
  // Dados pré-preenchidos do chat (opcional)
  prefillContactId?: string;
  prefillContactName?: string;
  prefillContactPhone?: string;
  prefillContactEmail?: string;
  prefillPropertyId?: string;
  prefillPropertyName?: string;
  prefillReservationId?: string;
  prefillReservationCode?: string;
  prefillGuestId?: string;
  prefillGuestName?: string;
}

export function CreateTicketModal({ 
  open, 
  onClose, 
  onSuccess, 
  funnel,
  prefillContactId,
  prefillContactName,
  prefillContactPhone,
  prefillContactEmail,
  prefillPropertyId,
  prefillPropertyName,
  prefillReservationId,
  prefillReservationCode,
  prefillGuestId,
  prefillGuestName,
}: CreateTicketModalProps) {
  const { isSuperAdmin } = useAuth();
  const [templates, setTemplates] = useState<ServiceTicketTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isCreating, setIsCreating] = useState(false);
  // Relacionamentos
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedAutomations, setSelectedAutomations] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadTemplates();
      // Pré-preencher dados do chat se disponíveis
      const peopleToSelect: string[] = [];
      
      // Adicionar contato/hóspede da conversa
      if (prefillGuestId && prefillGuestName) {
        peopleToSelect.push(`guest-${prefillGuestId}`);
      } else if (prefillContactId) {
        // Se for contato do WhatsApp, usar número como ID
        const contactId = prefillContactPhone || prefillContactId;
        peopleToSelect.push(`contact-${contactId}`);
      }
      
      if (peopleToSelect.length > 0) {
        setSelectedPeople(peopleToSelect);
      }
      
      // Adicionar imóvel da conversa
      if (prefillPropertyId) {
        setSelectedProperties([prefillPropertyId]);
      }
      
      // Se houver código de reserva, adicionar na descrição
      if (prefillReservationCode && !description.trim()) {
        setDescription(`Ticket relacionado à reserva ${prefillReservationCode}${prefillPropertyName ? ` - ${prefillPropertyName}` : ''}`);
      }
    }
  }, [open, prefillContactId, prefillContactName, prefillContactPhone, prefillContactEmail, prefillPropertyId, prefillPropertyName, prefillReservationId, prefillReservationCode, prefillGuestId, prefillGuestName]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await ticketTemplatesApi.list();
      let allTemplates: ServiceTicketTemplate[] = [];
      let globalTemplates: ServiceTicketTemplate[] = [];
      let organizationTemplates: ServiceTicketTemplate[] = [];

      if (response.success && response.data) {
        // Separar templates globais dos templates da organização
        globalTemplates = response.data.filter(t => t.isGlobalDefault === true);
        organizationTemplates = response.data.filter(t => !t.isGlobalDefault);
        // Combinar: globais primeiro, depois os da organização
        allTemplates = [...globalTemplates, ...organizationTemplates];
        setTemplates(allTemplates);
      } else {
        // Fallback para localStorage
        const savedTemplates = localStorage.getItem('rendizy_ticket_templates');
        if (savedTemplates) {
          const parsed = JSON.parse(savedTemplates);
          globalTemplates = parsed.filter((t: ServiceTicketTemplate) => t.isGlobalDefault === true);
          organizationTemplates = parsed.filter((t: ServiceTicketTemplate) => !t.isGlobalDefault);
          allTemplates = [...globalTemplates, ...organizationTemplates];
          setTemplates(allTemplates);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      const savedTemplates = localStorage.getItem('rendizy_ticket_templates');
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        const globalTemplates = parsed.filter((t: ServiceTicketTemplate) => t.isGlobalDefault === true);
        const organizationTemplates = parsed.filter((t: ServiceTicketTemplate) => !t.isGlobalDefault);
        setTemplates([...globalTemplates, ...organizationTemplates]);
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsCreating(true);
    try {
      let newTicket: ServiceTicket;

      if (selectedTemplate !== 'none') {
        // Criar a partir de template
        const template = templates.find(t => t.id === selectedTemplate);
        if (!template) {
          throw new Error('Template não encontrado');
        }

        // Carregar dados dos relacionamentos selecionados
        const relatedPeople = await loadSelectedPeople(selectedPeople);
        const relatedProperties = await loadSelectedProperties(selectedProperties);
        const relatedAutomations = await loadSelectedAutomations(selectedAutomations);

        // Copiar estrutura do template
        newTicket = {
          id: Date.now().toString(),
          organizationId: '',
          funnelId: funnel.id,
          stageId: funnel.stages[0]?.id || '',
          title,
          description: description || template.description,
          status: 'PENDING',
          priority,
          createdBy: '', // Será preenchido pelo backend
          createdByName: 'Sistema',
          progress: 0,
          templateId: template.id,
          relatedPeople,
          relatedProperties,
          relatedAutomations,
          // Copiar tarefas do template (resetando IDs e status)
          tasks: template.tasks.map((task, index) => ({
            ...task,
            id: `${Date.now()}-${index}`,
            ticketId: '', // Será preenchido após criação
            status: 'TODO' as const,
            subtasks: task.subtasks.map((subtask, subIndex) => ({
              ...subtask,
              id: `${Date.now()}-${index}-${subIndex}`,
              taskId: `${Date.now()}-${index}`,
              status: 'TODO' as const,
            })),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Tentar criar via API (se disponível)
        try {
          const response = await servicesTicketsApi.create({
            title,
            description: description || template.description,
            priority,
            funnelId: funnel.id,
            stageId: funnel.stages[0]?.id || '',
            templateId: template.id,
            tasks: template.tasks,
          });

          if (response.success && response.data) {
            newTicket = response.data;
          } else {
            // Fallback: criar localmente
            toast.warning('Criado localmente (API não disponível)');
          }
        } catch (apiError) {
          // Fallback: criar localmente
          toast.warning('Criado localmente (API não disponível)');
        }
      } else {
        // Carregar dados dos relacionamentos selecionados
        const relatedPeople = await loadSelectedPeople(selectedPeople);
        const relatedProperties = await loadSelectedProperties(selectedProperties);
        const relatedAutomations = await loadSelectedAutomations(selectedAutomations);

        // Criar do zero
        newTicket = {
          id: Date.now().toString(),
          organizationId: '',
          funnelId: funnel.id,
          stageId: funnel.stages[0]?.id || '',
          title,
          description,
          status: 'PENDING',
          priority,
          createdBy: '',
          createdByName: 'Sistema',
          progress: 0,
          relatedPeople,
          relatedProperties,
          relatedAutomations,
          tasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Tentar criar via API
        const response = await servicesTicketsApi.create({
          title,
          description,
          priority,
          funnelId: funnel.id,
          stageId: funnel.stages[0]?.id || '',
        });

        if (response.success && response.data) {
          newTicket = response.data;
        } else {
          toast.warning('Criado localmente (API não disponível)');
        }
      }

      toast.success('Ticket criado com sucesso!');
      onSuccess(newTicket);
      handleClose();
    } catch (error: any) {
      console.error('Erro ao criar ticket:', error);
      toast.error(error.message || 'Erro ao criar ticket');
    } finally {
      setIsCreating(false);
    }
  };

  // Funções auxiliares para carregar dados dos relacionamentos
  const loadSelectedPeople = async (selectedIds: string[]): Promise<TicketPerson[]> => {
    const people: TicketPerson[] = [];
    
    for (const id of selectedIds) {
      const [type, ...rest] = id.split('-');
      const realId = rest.join('-');
      
      try {
        if (type === 'guest') {
          // Carregar hóspede da API
          const response = await guestsApi.get(realId);
          if (response.success && response.data) {
            const guest = response.data;
            people.push({
              id,
              type: 'guest',
              name: `${guest.firstName} ${guest.lastName}`.trim() || 'Hóspede sem nome',
              email: guest.email,
              phone: guest.phone,
            });
          }
        } else if (type === 'contact') {
          // Carregar contato do WhatsApp
          const contactsService = getEvolutionContactsService();
          const contacts = await contactsService.getAllContacts();
          const contact = contacts.find(c => c.number === realId || c.id === realId);
          if (contact) {
            people.push({
              id,
              type: 'contact',
              name: contact.name || contact.number || 'Contato sem nome',
              phone: contact.number,
              email: contact.email,
              avatar: contact.avatar,
            });
          } else {
            // Fallback: usar dados pré-preenchidos
            people.push({
              id,
              type: 'contact',
              name: prefillContactName || 'Contato',
              phone: prefillContactPhone || realId,
              email: prefillContactEmail,
            });
          }
        } else if (type === 'user') {
          // Carregar usuário (já deve estar na lista de opções)
          people.push({
            id,
            type: 'user',
            name: `Usuário ${realId}`,
          });
        } else {
          // Fallback para outros tipos
          people.push({
            id,
            type: type as TicketPerson['type'],
            name: `${type} ${realId}`,
          });
        }
      } catch (error) {
        console.warn(`Erro ao carregar pessoa ${id}:`, error);
        // Fallback
        people.push({
          id,
          type: type as TicketPerson['type'],
          name: `${type} ${realId}`,
        });
      }
    }
    
    return people;
  };

  const loadSelectedProperties = async (selectedIds: string[]): Promise<TicketProperty[]> => {
    const properties: TicketProperty[] = [];
    
    for (const id of selectedIds) {
      try {
        const response = await propertiesApi.get(id);
        if (response.success && response.data) {
          const property = response.data;
          properties.push({
            id: property.id,
            name: property.name || property.code || `Imóvel ${property.id}`,
            code: property.code,
            address: property.address
              ? `${property.address.street}, ${property.address.number} - ${property.address.neighborhood}, ${property.address.city}`
              : undefined,
            type: property.type,
          });
        } else {
          // Fallback
          properties.push({
            id,
            name: prefillPropertyName || `Imóvel ${id}`,
            code: id,
          });
        }
      } catch (error) {
        console.warn(`Erro ao carregar imóvel ${id}:`, error);
        // Fallback
        properties.push({
          id,
          name: prefillPropertyName || `Imóvel ${id}`,
          code: id,
        });
      }
    }
    
    return properties;
  };

  const loadSelectedAutomations = async (selectedIds: string[]): Promise<TicketAutomation[]> => {
    const automations: TicketAutomation[] = [];
    
    for (const id of selectedIds) {
      try {
        const response = await automationsApi.get(id);
        if (response.success && response.data) {
          const automation = response.data;
          automations.push({
            id: automation.id,
            name: automation.name,
            description: automation.description || automation.definition?.description,
          });
        } else {
          // Fallback
          automations.push({
            id,
            name: `Automação ${id}`,
          });
        }
      } catch (error) {
        console.warn(`Erro ao carregar automação ${id}:`, error);
        // Fallback
        automations.push({
          id,
          name: `Automação ${id}`,
        });
      }
    }
    
    return automations;
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSelectedTemplate('none');
    setSelectedPeople([]);
    setSelectedProperties([]);
    setSelectedAutomations([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Ticket</DialogTitle>
          <DialogDescription>
            Crie um novo ticket do zero ou copie de um modelo existente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Template */}
          <div>
            <Label>Criar a partir de modelo</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Criar do zero
                  </div>
                </SelectItem>
                {loadingTemplates ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Carregando modelos...
                  </SelectItem>
                ) : templates.length > 0 ? (
                  <>
                    {/* Separador para templates globais */}
                    {templates.some(t => t.isGlobalDefault) && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase border-b">
                        Modelos Globais
                      </div>
                    )}
                    {templates
                      .filter(t => t.isGlobalDefault)
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-2">
                              <Copy className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium flex-1">{template.name}</span>
                              <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-xs flex-shrink-0">
                                <Globe className="w-3 h-3 mr-1" />
                                Global
                              </Badge>
                            </div>
                            {template.description && (
                              <span className="text-xs text-muted-foreground ml-6">
                                {template.description}
                              </span>
                            )}
                            {template.globalDefaultNote && (
                              <span className="text-xs text-purple-600 ml-6 italic">
                                {template.globalDefaultNote}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    {/* Separador para templates da organização */}
                    {templates.some(t => !t.isGlobalDefault) && templates.some(t => t.isGlobalDefault) && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase border-b mt-1">
                        Meus Modelos
                      </div>
                    )}
                    {templates
                      .filter(t => !t.isGlobalDefault)
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Copy className="w-4 h-4" />
                              <span className="font-medium">{template.name}</span>
                            </div>
                            {template.description && (
                              <span className="text-xs text-muted-foreground ml-6">
                                {template.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </>
                ) : (
                  <SelectItem value="no-templates" disabled>
                    Nenhum modelo disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedTemplate !== 'none' && (
              <p className="text-xs text-muted-foreground mt-1">
                O ticket será criado com todas as tarefas do modelo
              </p>
            )}
          </div>

          {/* Título */}
          <div>
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Problema com Check-in - Apartamento 201"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema ou situação..."
              rows={4}
            />
          </div>

          {/* Prioridade */}
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Relacionamentos */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label>Pessoas Relacionadas</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione usuários, contatos, hóspedes, compradores ou vendedores
              </p>
              <PersonSelector
                selected={selectedPeople}
                onChange={setSelectedPeople}
                placeholder="Selecione pessoas..."
              />
            </div>

            <div>
              <Label>Imóveis Relacionados</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione um ou mais imóveis relacionados a este ticket
              </p>
              <PropertySelector
                selected={selectedProperties}
                onChange={setSelectedProperties}
                placeholder="Selecione imóvel(is)..."
                allowMultiple={true}
              />
            </div>

            <div>
              <Label>Automações</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione automações que serão executadas para este ticket
              </p>
              <AutomationSelector
                selected={selectedAutomations}
                onChange={setSelectedAutomations}
                placeholder="Selecione automação(ões)..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Ticket'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

