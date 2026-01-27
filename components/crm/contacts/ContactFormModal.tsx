/**
 * Modal de criação/edição de Contato
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { toast } from 'sonner';
import { Loader2, User, Building2, MapPin, Globe, Info } from 'lucide-react';
import { crmContactsApi, CrmContact, ContactType } from '../../../src/utils/api-crm-contacts';
import { crmCompaniesApi, CrmCompany } from '../../../src/utils/api-crm-companies';

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: CrmContact | null;
  onSuccess: () => void;
  defaultType?: ContactType;
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'ex-cliente', label: 'Ex-Cliente' },
  { value: 'proprietario', label: 'Proprietário' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'outro', label: 'Outro' },
  // 'guest' não aparece aqui pois é criado automaticamente via reserva
];

const SOURCES = [
  { value: 'MANUAL', label: 'Cadastro Manual' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WEBSITE', label: 'Site' },
  { value: 'INDICACAO', label: 'Indicação' },
  { value: 'IMPORT', label: 'Importação' },
  { value: 'OUTRO', label: 'Outro' },
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
  });

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
        address_city: contact.address_city || '',
        address_state: contact.address_state || '',
        address_country: contact.address_country || 'Brasil',
        address_zip: contact.address_zip || '',
        linkedin_url: contact.linkedin_url || '',
        instagram_url: contact.instagram_url || '',
        birth_date: contact.birth_date || '',
        notes: contact.notes || '',
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
        address_city: '',
        address_state: '',
        address_country: 'Brasil',
        address_zip: '',
        linkedin_url: '',
        instagram_url: '',
        birth_date: '',
        notes: '',
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

  const handleChange = (field: string, value: string) => {
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
      const payload = {
        ...formData,
        company_id: formData.company_id || null,
        birth_date: formData.birth_date || null,
      };

      if (isEdit && contact) {
        // Se tipo bloqueado, não enviar contact_type
        if (isTypeLocked) {
          delete (payload as any).contact_type;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">
                <User className="h-4 w-4 mr-2" />
                Básico
              </TabsTrigger>
              <TabsTrigger value="company">
                <Building2 className="h-4 w-4 mr-2" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="address">
                <MapPin className="h-4 w-4 mr-2" />
                Endereço
              </TabsTrigger>
              <TabsTrigger value="other">
                <Info className="h-4 w-4 mr-2" />
                Outros
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

            {/* Tab: Empresa */}
            <TabsContent value="company" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="company_id">Empresa</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => handleChange('company_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {companies.map(company => (
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
              <div className="space-y-2">
                <Label htmlFor="address_street">Endereço</Label>
                <Input
                  id="address_street"
                  value={formData.address_street}
                  onChange={(e) => handleChange('address_street', e.target.value)}
                  placeholder="Rua, número, complemento"
                />
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
