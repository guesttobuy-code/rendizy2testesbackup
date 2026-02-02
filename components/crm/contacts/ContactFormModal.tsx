/**
 * Modal de criação/edição de Contato
 * Suporta campos condicionais para Proprietário e Hóspede
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { toast } from 'sonner';
import { Loader2, User, Building2, MapPin, Globe, Info, Crown, CreditCard, Home, FileText, Plus, X, Trash2, Search } from 'lucide-react';
import { crmContactsApi, CrmContact, ContactType, ContractType, BankData } from '../../../src/utils/api-crm-contacts';
import { crmCompaniesApi, CrmCompany } from '../../../src/utils/api-crm-companies';
import { Badge } from '../../ui/badge';

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: CrmContact | null;
  onSuccess: (savedContact?: CrmContact) => void; // Agora retorna o contato salvo
  defaultType?: ContactType;
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'guest', label: 'Hóspede' },
  { value: 'lead', label: 'Lead' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'ex-cliente', label: 'Ex-Cliente' },
  { value: 'proprietario', label: 'Proprietário' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'outro', label: 'Outro' },
];

const SOURCES = [
  { value: 'MANUAL', label: 'Cadastro Manual' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WEBSITE', label: 'Site' },
  { value: 'INDICACAO', label: 'Indicação' },
  { value: 'IMPORT', label: 'Importação' },
  { value: 'RESERVA', label: 'Reserva (StaysNet)' },
  { value: 'OUTRO', label: 'Outro' },
];

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'exclusivity', label: 'Exclusividade' },
  { value: 'non_exclusive', label: 'Não Exclusivo' },
  { value: 'temporary', label: 'Temporário' },
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'boleto', label: 'Boleto' },
];

export function ContactFormModal({
  open,
  onOpenChange,
  contact,
  onSuccess,
  defaultType = 'lead',
}: ContactFormModalProps) {
  const isEdit = !!contact;
  const isTypeLocked = contact?.is_type_locked;

  // Form state
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  
  // Imóveis vinculados (para proprietários)
  const [linkedProperties, setLinkedProperties] = useState<any[]>([]);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [selectedPropertiesToAdd, setSelectedPropertiesToAdd] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    contact_type: defaultType as ContactType,
    company_id: '',
    job_title: '',
    department: '',
    source: 'MANUAL',
    source_detail: '',
    // Endereço
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_country: 'Brasil',
    address_zip: '',
    // Social
    linkedin_url: '',
    instagram_url: '',
    // Outros
    birth_date: '',
    notes: '',
    // Documentos (hóspede/proprietário)
    cpf: '',
    rg: '',
    passport: '',
    // Proprietário específico
    profissao: '',
    renda_mensal: '',
    contract_type: 'non_exclusive' as ContractType,
    contract_start_date: '',
    contract_end_date: '',
    is_premium: false,
    taxa_comissao: '',
    forma_pagamento_comissao: '',
    // Dados bancários
    bank_banco: '',
    bank_agencia: '',
    bank_conta: '',
    bank_tipo_conta: '',
    bank_chave_pix: '',
  });

  // Mostrar campos específicos conforme tipo
  const isProprietario = formData.contact_type === 'proprietario';
  const isGuest = formData.contact_type === 'guest';
  const showDocuments = isProprietario || isGuest;

  // Carregar dados do contato se edição
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        contact_type: contact.contact_type as ContactType,
        company_id: contact.company_id || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        source: contact.source || 'MANUAL',
        source_detail: contact.source_detail || '',
        address_street: contact.address_street || '',
        address_number: contact.address_number || '',
        address_complement: contact.address_complement || '',
        address_neighborhood: contact.address_neighborhood || '',
        address_city: contact.address_city || '',
        address_state: contact.address_state || '',
        address_country: contact.address_country || 'Brasil',
        address_zip: contact.address_zip || '',
        linkedin_url: contact.linkedin_url || '',
        instagram_url: contact.instagram_url || '',
        birth_date: contact.birth_date || '',
        notes: contact.notes || '',
        // Documentos
        cpf: contact.cpf || '',
        rg: contact.rg || '',
        passport: contact.passport || '',
        // Proprietário
        profissao: contact.profissao || '',
        renda_mensal: contact.renda_mensal?.toString() || '',
        contract_type: (contact.contract_type as ContractType) || 'non_exclusive',
        contract_start_date: contact.contract_start_date || '',
        contract_end_date: contact.contract_end_date || '',
        is_premium: contact.is_premium || false,
        taxa_comissao: contact.taxa_comissao?.toString() || '',
        forma_pagamento_comissao: contact.forma_pagamento_comissao || '',
        // Dados bancários
        bank_banco: contact.bank_data?.banco || '',
        bank_agencia: contact.bank_data?.agencia || '',
        bank_conta: contact.bank_data?.conta || '',
        bank_tipo_conta: contact.bank_data?.tipo_conta || '',
        bank_chave_pix: contact.bank_data?.chave_pix || '',
      });
    } else {
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        contact_type: defaultType,
        company_id: '',
        job_title: '',
        department: '',
        source: 'MANUAL',
        source_detail: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_country: 'Brasil',
        address_zip: '',
        linkedin_url: '',
        instagram_url: '',
        birth_date: '',
        notes: '',
        cpf: '',
        rg: '',
        passport: '',
        profissao: '',
        renda_mensal: '',
        contract_type: 'non_exclusive',
        contract_start_date: '',
        contract_end_date: '',
        is_premium: false,
        taxa_comissao: '',
        forma_pagamento_comissao: '',
        bank_banco: '',
        bank_agencia: '',
        bank_conta: '',
        bank_tipo_conta: '',
        bank_chave_pix: '',
      });
    }
  }, [contact, defaultType]);

  // Carregar empresas para seleção
  useEffect(() => {
    if (open) {
      crmCompaniesApi.list({ limit: 100 }).then(res => {
        setCompanies(res.data?.data || []);
      }).catch(err => {
        console.error('Erro ao carregar empresas:', err);
      });
    }
  }, [open]);

  // Estado para controlar "Salvar e Continuar"
  const [savedContact, setSavedContact] = useState<CrmContact | null>(null);
  
  // Se salvou via "Salvar e Continuar", usar o contato salvo como base
  const effectiveContact = savedContact || contact;
  const effectiveIsEdit = !!effectiveContact;

  // Carregar propriedades do Anúncios Ultimate (mesma fonte do calendário)
  useEffect(() => {
    const isProprietarioType = formData.contact_type === 'proprietario';
    
    if (open && isProprietarioType) {
      setLoadingProperties(true);
      
      // Usar mesma API que o App.tsx usa para carregar imóveis
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/lista`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
          'Content-Type': 'application/json'
        }
      })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Erro ao carregar propriedades');
        }
        const result = await response.json();
        const anuncios = result.anuncios || [];
        
        // Mapear para formato mais amigável
        const props = anuncios.map((a: any) => ({
          id: a.id,
          name: a.data?.title || a.title || 'Sem nome',
          code: a.data?.internalId || a.data?.internal_id || a.data?.identificacao_interna || '',
          status: a.status,
          owner_contact_id: a.owner_contact_id,
          address: {
            city: a.data?.address?.city || a.data?.cidade || '',
          },
          // Dados originais para referência
          _raw: a
        }));
        
        setAllProperties(props);
        
        // Se é edição, filtrar propriedades vinculadas a este contato
        if (effectiveContact?.id) {
          const linked = props.filter((p: any) => 
            p.owner_contact_id === effectiveContact.id
          );
          setLinkedProperties(linked);
        } else {
          setLinkedProperties([]);
        }
      })
      .catch(err => {
        console.error('Erro ao carregar propriedades:', err);
        toast.error('Erro ao carregar lista de imóveis');
      })
      .finally(() => {
        setLoadingProperties(false);
      });
    }
  }, [open, formData.contact_type, effectiveContact?.id]);

  // Helper para atualizar propriedade via API de anúncios
  const updatePropertyOwner = async (propertyId: string, ownerContactId: string | null) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/${propertyId}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ owner_contact_id: ownerContactId })
    });
    
    if (!response.ok) {
      throw new Error('Erro ao atualizar vínculo');
    }
    return response.json();
  };

  // Adicionar múltiplos imóveis ao proprietário
  const handleAddProperties = async () => {
    if (selectedPropertiesToAdd.length === 0 || !effectiveContact?.id) return;
    
    try {
      // Vincular todos os selecionados
      await Promise.all(
        selectedPropertiesToAdd.map(propertyId => 
          updatePropertyOwner(propertyId, effectiveContact!.id)
        )
      );
      
      toast.success(`${selectedPropertiesToAdd.length} ${selectedPropertiesToAdd.length === 1 ? 'imóvel vinculado' : 'imóveis vinculados'} com sucesso!`);
      
      // Atualizar lista local
      const newLinked = allProperties.filter(p => selectedPropertiesToAdd.includes(p.id));
      setLinkedProperties(prev => [...prev, ...newLinked]);
      setSelectedPropertiesToAdd([]);
      setPropertySearchTerm('');
    } catch (err) {
      console.error('Erro ao vincular imóveis:', err);
      toast.error('Erro ao vincular imóveis');
    }
  };

  // Toggle seleção de imóvel
  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertiesToAdd(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // Remover vínculo de imóvel
  const handleRemoveProperty = async (propertyId: string) => {
    if (!propertyId) return;
    
    try {
      await updatePropertyOwner(propertyId, null);
      toast.success('Vínculo removido');
      setLinkedProperties(prev => prev.filter(p => p.id !== propertyId));
    } catch (err) {
      console.error('Erro ao remover vínculo:', err);
      toast.error('Erro ao remover vínculo');
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, continueEditing = false) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Montar dados bancários se proprietário
      const bank_data: BankData | undefined = isProprietario ? {
        banco: formData.bank_banco || undefined,
        agencia: formData.bank_agencia || undefined,
        conta: formData.bank_conta || undefined,
        tipo_conta: formData.bank_tipo_conta as 'corrente' | 'poupanca' | undefined,
        chave_pix: formData.bank_chave_pix || undefined,
      } : undefined;

      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        contact_type: formData.contact_type,
        company_id: formData.company_id || null,
        job_title: formData.job_title || null,
        department: formData.department || null,
        source: formData.source,
        source_detail: formData.source_detail || null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_complement: formData.address_complement || null,
        address_neighborhood: formData.address_neighborhood || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
        address_country: formData.address_country || null,
        address_zip: formData.address_zip || null,
        linkedin_url: formData.linkedin_url || null,
        instagram_url: formData.instagram_url || null,
        birth_date: formData.birth_date || null,
        notes: formData.notes || null,
      };

      // Campos de documentos (guest e proprietário)
      if (showDocuments) {
        payload.cpf = formData.cpf || null;
        payload.rg = formData.rg || null;
        payload.passport = formData.passport || null;
      }

      // Campos específicos de proprietário
      if (isProprietario) {
        payload.profissao = formData.profissao || null;
        payload.renda_mensal = formData.renda_mensal ? parseFloat(formData.renda_mensal) : null;
        payload.contract_type = formData.contract_type;
        payload.contract_start_date = formData.contract_start_date || null;
        payload.contract_end_date = formData.contract_end_date || null;
        payload.is_premium = formData.is_premium;
        payload.taxa_comissao = formData.taxa_comissao ? parseFloat(formData.taxa_comissao) : null;
        payload.forma_pagamento_comissao = formData.forma_pagamento_comissao || null;
        payload.bank_data = bank_data;
      }

      let resultContact: CrmContact | null = null;

      if (effectiveIsEdit && effectiveContact) {
        // Se tipo bloqueado, não enviar contact_type
        if (isTypeLocked) {
          delete payload.contact_type;
        }
        const result = await crmContactsApi.update(effectiveContact.id, payload);
        resultContact = result.data || null;
        toast.success('Contato atualizado com sucesso');
      } else {
        const result = await crmContactsApi.create(payload);
        resultContact = result.data || null;
        toast.success('Contato criado com sucesso');
      }

      if (continueEditing && resultContact) {
        // Salvar e continuar - manter modal aberto em modo edição
        setSavedContact(resultContact);
        toast.info('Agora você pode vincular imóveis na aba "Imóveis"');
      } else {
        onSuccess(resultContact || undefined);
      }
    } catch (error: any) {
      console.error('Erro ao salvar contato:', error);
      toast.error(error.message || 'Erro ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setSavedContact(null); // Reset ao fechar
      }
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl min-h-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {effectiveIsEdit ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
          <DialogDescription>
            {effectiveIsEdit 
              ? 'Atualize as informações do contato'
              : 'Preencha os dados para criar um novo contato'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            {/* Tabs em 2+ linhas para proprietário (7 tabs), ou 1 linha para outros */}
            <TabsList className={`w-full h-auto flex flex-wrap gap-1 ${isProprietario ? 'grid grid-cols-4 grid-rows-2' : showDocuments ? 'grid grid-cols-5' : 'grid grid-cols-4'}`}>
              <TabsTrigger value="basic" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <User className="h-4 w-4" />
                <span>Básico</span>
              </TabsTrigger>
              {showDocuments && (
                <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <FileText className="h-4 w-4" />
                  <span>Documentos</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="company" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" />
                <span>Empresa</span>
              </TabsTrigger>
              <TabsTrigger value="address" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <MapPin className="h-4 w-4" />
                <span>Endereço</span>
              </TabsTrigger>
              {isProprietario && (
                <TabsTrigger value="owner" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Crown className="h-4 w-4" />
                  <span>Proprietário</span>
                </TabsTrigger>
              )}
              {isProprietario && effectiveIsEdit && (
                <TabsTrigger value="properties" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Home className="h-4 w-4" />
                  <span>Imóveis</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="other" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Info className="h-4 w-4" />
                <span>Outros</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Básico */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="Nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Sobrenome"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_type">Tipo de Contato *</Label>
                  <Select
                    value={formData.contact_type}
                    onValueChange={(value) => handleChange('contact_type', value)}
                    disabled={isTypeLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {isTypeLocked && contact?.contact_type === 'guest' && (
                        <SelectItem value="guest">🔒 Hóspede</SelectItem>
                      )}
                      {CONTACT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isTypeLocked && (
                    <p className="text-xs text-gray-500">
                      Este tipo não pode ser alterado (criado automaticamente)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Origem</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => handleChange('source', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Origem do contato" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Celular</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Documentos (Guest/Proprietário) */}
            {showDocuments && (
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => handleChange('rg', e.target.value)}
                      placeholder="00.000.000-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport">Passaporte</Label>
                    <Input
                      id="passport"
                      value={formData.passport}
                      onChange={(e) => handleChange('passport', e.target.value)}
                      placeholder="Passaporte"
                    />
                  </div>
                </div>

                {isProprietario && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="profissao">Profissão</Label>
                      <Input
                        id="profissao"
                        value={formData.profissao}
                        onChange={(e) => handleChange('profissao', e.target.value)}
                        placeholder="Profissão"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="renda_mensal">Renda Mensal</Label>
                      <Input
                        id="renda_mensal"
                        type="number"
                        value={formData.renda_mensal}
                        onChange={(e) => handleChange('renda_mensal', e.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Tab: Empresa */}
            <TabsContent value="company" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="company_id">Empresa</Label>
                <Select
                  value={formData.company_id || '_none_'}
                  onValueChange={(value) => handleChange('company_id', value === '_none_' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Nenhuma</SelectItem>
                    {companies.filter(c => c.id).map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Cargo</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => handleChange('job_title', e.target.value)}
                    placeholder="Ex: Diretor Comercial"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="Ex: Comercial"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Endereço */}
            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address_street">Logradouro</Label>
                  <Input
                    id="address_street"
                    value={formData.address_street}
                    onChange={(e) => handleChange('address_street', e.target.value)}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={formData.address_number}
                    onChange={(e) => handleChange('address_number', e.target.value)}
                    placeholder="Nº"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => handleChange('address_complement', e.target.value)}
                    placeholder="Apto, Bloco..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    value={formData.address_neighborhood}
                    onChange={(e) => handleChange('address_neighborhood', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input
                    id="address_city"
                    value={formData.address_city}
                    onChange={(e) => handleChange('address_city', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_state">Estado</Label>
                  <Input
                    id="address_state"
                    value={formData.address_state}
                    onChange={(e) => handleChange('address_state', e.target.value)}
                    placeholder="Estado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_zip">CEP</Label>
                  <Input
                    id="address_zip"
                    value={formData.address_zip}
                    onChange={(e) => handleChange('address_zip', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_country">País</Label>
                  <Input
                    id="address_country"
                    value={formData.address_country}
                    onChange={(e) => handleChange('address_country', e.target.value)}
                    placeholder="País"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Proprietário (campos específicos) */}
            {isProprietario && (
              <TabsContent value="owner" className="space-y-4 mt-4">
                {/* Tipo de Contrato */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Tipo de Contrato</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contract_type">Tipo</Label>
                      <Select
                        value={formData.contract_type}
                        onValueChange={(value) => handleChange('contract_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract_start_date">Início</Label>
                      <Input
                        id="contract_start_date"
                        type="date"
                        value={formData.contract_start_date}
                        onChange={(e) => handleChange('contract_start_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract_end_date">Fim</Label>
                      <Input
                        id="contract_end_date"
                        type="date"
                        value={formData.contract_end_date}
                        onChange={(e) => handleChange('contract_end_date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Comissões */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Comissões</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxa_comissao">Taxa de Comissão (%)</Label>
                      <Input
                        id="taxa_comissao"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.taxa_comissao}
                        onChange={(e) => handleChange('taxa_comissao', e.target.value)}
                        placeholder="10.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forma_pagamento_comissao">Forma de Pagamento</Label>
                      <Select
                        value={formData.forma_pagamento_comissao || '_none_'}
                        onValueChange={(value) => handleChange('forma_pagamento_comissao', value === '_none_' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">Selecione</SelectItem>
                          {PAYMENT_METHODS.map(method => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Dados Bancários */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Dados Bancários</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_banco">Banco</Label>
                      <Input
                        id="bank_banco"
                        value={formData.bank_banco}
                        onChange={(e) => handleChange('bank_banco', e.target.value)}
                        placeholder="Nome do banco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_agencia">Agência</Label>
                      <Input
                        id="bank_agencia"
                        value={formData.bank_agencia}
                        onChange={(e) => handleChange('bank_agencia', e.target.value)}
                        placeholder="0000-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_conta">Conta</Label>
                      <Input
                        id="bank_conta"
                        value={formData.bank_conta}
                        onChange={(e) => handleChange('bank_conta', e.target.value)}
                        placeholder="00000-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_tipo_conta">Tipo de Conta</Label>
                      <Select
                        value={formData.bank_tipo_conta || '_none_'}
                        onValueChange={(value) => handleChange('bank_tipo_conta', value === '_none_' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">Selecione</SelectItem>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_chave_pix">Chave PIX</Label>
                    <Input
                      id="bank_chave_pix"
                      value={formData.bank_chave_pix}
                      onChange={(e) => handleChange('bank_chave_pix', e.target.value)}
                      placeholder="CPF, email, telefone ou chave aleatória"
                    />
                  </div>
                </div>

                {/* Premium */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.is_premium}
                      onCheckedChange={(checked) => handleChange('is_premium', checked)}
                    />
                    <div>
                      <Label className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        Proprietário Premium
                      </Label>
                      <p className="text-sm text-gray-500">
                        Proprietários premium recebem benefícios exclusivos
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Tab: Imóveis (só para proprietários em edição) */}
            {isProprietario && effectiveIsEdit && (
              <TabsContent value="properties" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Imóveis Vinculados</h3>
                      <p className="text-sm text-gray-500">
                        {linkedProperties.length} {linkedProperties.length === 1 ? 'imóvel vinculado' : 'imóveis vinculados'} a este proprietário
                      </p>
                    </div>
                  </div>

                  {/* Adicionar imóveis - Busca e seleção múltipla */}
                  <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    <Label className="font-medium">Adicionar Imóveis</Label>
                    
                    {/* Campo de busca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar imóvel por nome..."
                        value={propertySearchTerm}
                        onChange={(e) => setPropertySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Lista de imóveis disponíveis com checkboxes */}
                    {(() => {
                      const availableProperties = allProperties
                        .filter(p => !linkedProperties.some(lp => lp.id === p.id))
                        .filter(p => {
                          if (!propertySearchTerm.trim()) return true;
                          const searchLower = propertySearchTerm.toLowerCase();
                          // Usar mesma lógica do PropertySidebar - campos vêm do adapter: name, code, address.city
                          const name = (p.name || p.title || '').toLowerCase();
                          const code = (p.code || '').toLowerCase();
                          const city = (p.address?.city || '').toLowerCase();
                          return name.includes(searchLower) || code.includes(searchLower) || city.includes(searchLower);
                        });

                      if (availableProperties.length === 0) {
                        return (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            {propertySearchTerm 
                              ? 'Nenhum imóvel encontrado com esse nome'
                              : 'Todos os imóveis já estão vinculados'}
                          </div>
                        );
                      }

                      return (
                        <div className="max-h-48 overflow-y-auto border rounded-lg bg-white divide-y" style={{ overflowX: 'hidden' }}>
                          {availableProperties.map(property => {
                            const isSelected = selectedPropertiesToAdd.includes(property.id);
                            // Usar mesma lógica do PropertySidebar - code é a identificação interna
                            const propertyLabel = property.code || property.name || 'Sem nome';
                            // Truncar nome se muito longo (máx 40 chars)
                            const displayLabel = propertyLabel.length > 40 
                              ? propertyLabel.substring(0, 37) + '...' 
                              : propertyLabel;
                            return (
                              <label
                                key={property.id}
                                className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePropertySelection(property.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                />
                                <div className="flex-1 overflow-hidden" style={{ maxWidth: 'calc(100% - 30px)' }}>
                                  <p className="text-xs font-medium text-gray-900" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</p>
                                  {property.address?.city && (
                                    <p className="text-[10px] text-gray-500 truncate">{property.address.city}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Botão de vincular */}
                    {selectedPropertiesToAdd.length > 0 && (
                      <Button
                        type="button"
                        onClick={handleAddProperties}
                        disabled={loadingProperties}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Vincular {selectedPropertiesToAdd.length} {selectedPropertiesToAdd.length === 1 ? 'imóvel' : 'imóveis'}
                      </Button>
                    )}
                  </div>

                  {/* Lista de imóveis vinculados */}
                  {loadingProperties ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : linkedProperties.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                      <Home className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Nenhum imóvel vinculado a este proprietário</p>
                      <p className="text-sm">Use a busca acima para encontrar e vincular imóveis</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="font-medium text-xs text-gray-600">Imóveis vinculados:</Label>
                      {linkedProperties.map(property => {
                        const propertyLabel = property.code || property.name || 'Sem nome';
                        // Truncar nome se muito longo
                        const displayLabel = propertyLabel.length > 35 
                          ? propertyLabel.substring(0, 32) + '...' 
                          : propertyLabel;
                        return (
                        <div
                          key={property.id}
                          className="flex items-center gap-2 p-2 border rounded bg-white hover:bg-gray-50"
                          style={{ maxWidth: '100%', overflow: 'hidden' }}
                        >
                          <div className="p-1 rounded bg-green-100 flex-shrink-0">
                            <Home className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
                            <p className="text-xs font-medium text-gray-900" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {displayLabel}
                            </p>
                            <div className="flex items-center gap-1">
                              {property.address?.city && (
                                <span className="text-[10px] text-gray-500 truncate">{property.address.city}</span>
                              )}
                              {property.status && (
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-green-50 text-green-700 border-green-200">
                                  {property.status === 'active' ? 'Ativo' : property.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => handleRemoveProperty(property.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Tab: Outros */}
            <TabsContent value="other" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    value={formData.instagram_url}
                    onChange={(e) => handleChange('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Anotações sobre o contato..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {/* Mostrar "Salvar e Continuar" para novos proprietários que ainda não foram salvos */}
            {isProprietario && !effectiveIsEdit && (
              <Button 
                type="button" 
                variant="secondary"
                disabled={loading}
                onClick={(e) => handleSubmit(e as any, true)}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar e Vincular Imóveis
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {effectiveIsEdit ? 'Salvar' : 'Criar Contato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
