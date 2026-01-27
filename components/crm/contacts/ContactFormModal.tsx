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
import { Loader2, User, Building2, MapPin, Globe, Info, Crown, CreditCard, Home, FileText, Plus, X, Trash2 } from 'lucide-react';
import { crmContactsApi, CrmContact, ContactType, ContractType, BankData } from '../../../src/utils/api-crm-contacts';
import { crmCompaniesApi, CrmCompany } from '../../../src/utils/api-crm-companies';
import { propertiesApi } from '../../../utils/api';
import { Badge } from '../../ui/badge';

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: CrmContact | null;
  onSuccess: () => void;
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
  const [selectedPropertyToAdd, setSelectedPropertyToAdd] = useState('');
  
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

  // Carregar propriedades (todas e vinculadas ao proprietário)
  useEffect(() => {
    if (open && formData.contact_type === 'proprietario') {
      setLoadingProperties(true);
      propertiesApi.list().then(res => {
        const props = res.data || [];
        setAllProperties(props);
        
        // Se é edição, filtrar propriedades vinculadas a este contato
        if (contact?.id) {
          const linked = props.filter((p: any) => 
            p.owner_contact_id === contact.id || 
            p.data?.owner_contact_id === contact.id
          );
          setLinkedProperties(linked);
        } else {
          setLinkedProperties([]);
        }
      }).catch(err => {
        console.error('Erro ao carregar propriedades:', err);
      }).finally(() => {
        setLoadingProperties(false);
      });
    }
  }, [open, formData.contact_type, contact?.id]);

  // Adicionar imóvel ao proprietário
  const handleAddProperty = async (propertyId: string) => {
    if (!propertyId || !contact?.id) return;
    
    try {
      await propertiesApi.update(propertyId, { owner_contact_id: contact.id } as any);
      toast.success('Imóvel vinculado com sucesso!');
      
      // Atualizar lista local
      const property = allProperties.find(p => p.id === propertyId);
      if (property) {
        setLinkedProperties(prev => [...prev, property]);
      }
      setSelectedPropertyToAdd('');
    } catch (err) {
      console.error('Erro ao vincular imóvel:', err);
      toast.error('Erro ao vincular imóvel');
    }
  };

  // Remover vínculo de imóvel
  const handleRemoveProperty = async (propertyId: string) => {
    if (!propertyId) return;
    
    try {
      await propertiesApi.update(propertyId, { owner_contact_id: null } as any);
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

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (isEdit && contact) {
        // Se tipo bloqueado, não enviar contact_type
        if (isTypeLocked) {
          delete payload.contact_type;
        }
        await crmContactsApi.update(contact.id, payload);
        toast.success('Contato atualizado com sucesso');
      } else {
        await crmContactsApi.create(payload);
        toast.success('Contato criado com sucesso');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar contato:', error);
      toast.error(error.message || 'Erro ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl min-h-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
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
              {isProprietario && isEdit && (
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
            {isProprietario && isEdit && (
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

                  {/* Adicionar imóvel */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Adicionar Imóvel</Label>
                      <Select
                        value={selectedPropertyToAdd}
                        onValueChange={setSelectedPropertyToAdd}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um imóvel para vincular..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allProperties
                            .filter(p => !linkedProperties.some(lp => lp.id === p.id))
                            .map(property => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.data?.basicInfo?.name || property.name || property.internal_id || property.id.slice(0, 8)}
                              </SelectItem>
                            ))
                          }
                          {allProperties.filter(p => !linkedProperties.some(lp => lp.id === p.id)).length === 0 && (
                            <SelectItem value="_none_" disabled>
                              Todos os imóveis já estão vinculados
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddProperty(selectedPropertyToAdd)}
                      disabled={!selectedPropertyToAdd || loadingProperties}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Vincular
                    </Button>
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
                      <p className="text-sm">Use o seletor acima para vincular imóveis</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkedProperties.map(property => (
                        <div
                          key={property.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Home className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {property.data?.basicInfo?.name || property.name || 'Sem nome'}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                {property.internal_id && (
                                  <span>#{property.internal_id}</span>
                                )}
                                {property.data?.location?.city && (
                                  <span>• {property.data.location.city}</span>
                                )}
                                {property.status && (
                                  <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                                    {property.status === 'active' ? 'Ativo' : property.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveProperty(property.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar Contato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
