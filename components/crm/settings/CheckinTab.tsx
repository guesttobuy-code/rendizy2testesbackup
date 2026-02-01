/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║          TAB: CHECK-IN - Configuração Completa                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Módulo de Check-in com dinâmica própria - baseado no mock aprovado.
 * 
 * CATEGORIAS DE CHECK-IN:
 * 1. NORMAL - Check-in simples, sem comunicação prévia
 * 2. GRUPO_WHATSAPP - Enviar dados no grupo WhatsApp do imóvel
 * 3. PORTARIA_DIRETA - Comunicar portaria via WhatsApp/telefone
 * 4. EMAIL_PORTARIA - Enviar email para portaria/condomínio
 * 5. PESSOA_ESPECIFICA - Comunicar zelador/caseiro específico
 * 6. APLICATIVO - Usar app (Prolarme, CONDFY, Vida de Síndico)
 * 7. FORMULARIO - Preencher formulário do condomínio
 * 
 * @version 2.0.0
 * @date 2026-02-01
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  LogIn,
  Building2,
  MessageSquare,
  Mail,
  User,
  Smartphone,
  FileText,
  Key,
  Users,
  Car,
  IdCard,
  Camera,
  Phone,
  Search,
  ChevronRight,
  AlertTriangle,
  Save,
  CheckCircle,
  Check,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckinImportModal } from './CheckinImportModal';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const CHECKIN_CATEGORIES = [
  { id: 'normal', name: 'Normal', description: 'Check-in simples, sem comunicação prévia necessária', icon: LogIn, color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 'grupo_whatsapp', name: 'Grupo WhatsApp', description: 'Enviar resumo da reserva + docs no grupo WPP do imóvel', icon: MessageSquare, color: 'bg-green-100 text-green-600 border-green-200' },
  { id: 'portaria_direta', name: 'Portaria Direta', description: 'Comunicar portaria via WhatsApp ou telefone', icon: Phone, color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { id: 'email_portaria', name: 'Email Portaria', description: 'Enviar dados para email do condomínio/portaria', icon: Mail, color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { id: 'pessoa_especifica', name: 'Pessoa Específica', description: 'Comunicar zelador, caseiro ou responsável específico', icon: User, color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { id: 'aplicativo', name: 'Aplicativo', description: 'Cadastrar em app específico (Prolarme, CONDFY, etc)', icon: Smartphone, color: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
  { id: 'formulario', name: 'Formulário', description: 'Preencher formulário específico do condomínio', icon: FileText, color: 'bg-amber-100 text-amber-600 border-amber-200' },
];

const REQUIRED_DOCUMENTS = [
  { id: 'guest_name', label: 'Nome completo do hóspede', icon: User },
  { id: 'document_number', label: 'Número do documento (RG/CPF)', icon: IdCard },
  { id: 'document_photo', label: 'Foto do documento', icon: Camera },
  { id: 'vehicle_plate', label: 'Placa do veículo', icon: Car },
  { id: 'vehicle_model', label: 'Modelo do veículo', icon: Car },
  { id: 'all_guests', label: 'Dados de TODOS os hóspedes', icon: Users },
];

const ACCESS_METHODS = [
  { id: 'chave_em_maos', label: 'Chave entregue em mãos', description: 'Alguém entrega a chave pessoalmente ao hóspede', icon: Key },
  { id: 'cofre_frente_casa', label: 'Cofre de chaves na frente da casa', description: 'Cofre com senha na entrada do imóvel', icon: Key },
  { id: 'cofre_fora_predio', label: 'Cofre de chaves fora do prédio', description: 'Cofre externo com chaves da portaria e do apartamento', icon: Key },
  { id: 'portaria_recepcao', label: 'Portaria 24h → Pega chave na recepção', description: 'Entra pela portaria e retira a chave com o porteiro/recepção', icon: Building2 },
  { id: 'portaria_cofre_porta', label: 'Portaria 24h → Cofre na porta do apto', description: 'Entra pela portaria e pega chave no cofre da porta do apartamento', icon: Building2 },
  { id: 'portaria_fechadura_senha', label: 'Portaria 24h → Fechadura com senha', description: 'Entra pela portaria e usa código numérico na fechadura do apto', icon: Building2 },
  { id: 'fechadura_qrcode', label: 'Fechadura eletrônica via QR Code', description: 'Hóspede recebe QR Code para abrir a fechadura', icon: Smartphone },
  { id: 'fechadura_chave_digital', label: 'Fechadura eletrônica via chave digital', description: 'Hóspede recebe chave digital no app para abrir a fechadura', icon: Smartphone },
  { id: 'fechadura_bluetooth', label: 'Fechadura via Bluetooth/App', description: 'Hóspede usa app no celular para destrancar via Bluetooth', icon: Smartphone },
  { id: 'cartao_magnetico', label: 'Cartão magnético/Cartão de acesso', description: 'Hóspede recebe cartão para acessar o imóvel', icon: IdCard },
  { id: 'cadastro_facial', label: 'Cadastro facial / Biometria facial', description: 'Hóspede precisa fazer cadastro com foto para liberação por reconhecimento facial', icon: Camera },
  { id: 'cadastro_biometria_adm', label: 'Cadastro de biometria na administração', description: 'Hóspede precisa ir até a administração para cadastrar biometria digital', icon: User },
  { id: 'checkin_hotel', label: 'Check-in no saguão do hotel', description: 'Hóspede faz check-in presencial na recepção do hotel', icon: Building2 },
  { id: 'checkin_pousada', label: 'Check-in na recepção da pousada', description: 'Hóspede faz check-in presencial na recepção da pousada', icon: Building2 },
  { id: 'totem_autoatendimento', label: 'Totem de autoatendimento (self check-in)', description: 'Hóspede faz check-in em totem eletrônico e retira chave/cartão', icon: Smartphone },
  { id: 'liberacao_remota', label: 'Liberação remota via interfone/vídeo', description: 'Anfitrião libera acesso remotamente após confirmar identidade por vídeo', icon: Phone },
  { id: 'chave_escondida', label: 'Chave em local secreto', description: 'Chave escondida em local combinado (ex: caixa de luz, vaso, etc)', icon: Key },
  { id: 'outro', label: 'Outro (especificar nas observações)', description: 'Forma de acesso diferente das listadas', icon: FileText },
];

const EXTERNAL_APPS = [
  { id: 'prolarme', name: 'Prolarme', description: 'Sistema de segurança com cadastro facial' },
  { id: 'condfy', name: 'CONDFY', description: 'App de gestão de condomínio' },
  { id: 'vida_sindico', name: 'Vida de Síndico', description: 'Sistema de administração condominial' },
  { id: 'organize_condominio', name: 'Organize meu Condomínio', description: 'Plataforma de gestão' },
  { id: 'outro', name: 'Outro', description: 'Aplicativo customizado' },
];

interface PropertyWithCheckin {
  id: string;
  name: string;
  city: string;
  category: string | null;
  checkin_config?: Record<string, any>;
}

interface CheckinTabProps {
  organizationId: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CategoryCard: React.FC<{
  category: typeof CHECKIN_CATEGORIES[0];
  isSelected?: boolean;
  onClick?: () => void;
  count?: number;
}> = ({ category, onClick, count = 0 }) => {
  const Icon = category.icon;
  
  return (
    <Card className="cursor-pointer transition-all hover:shadow-md" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg border', category.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{category.name}</h3>
              <Badge variant="secondary">{count}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CategoryConfigModal: React.FC<{
  category: typeof CHECKIN_CATEGORIES[0];
  properties: PropertyWithCheckin[];
  onClose: () => void;
  onSave: (selectedPropertyIds: string[]) => void;
}> = ({ category, properties, onClose, onSave }) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    properties.filter(p => p.category === category.id).map(p => p.id)
  );
  const [saving, setSaving] = useState(false);

  const { available, conflicts } = useMemo(() => {
    const available: PropertyWithCheckin[] = [];
    const conflicts: Map<string, { propertyId: string; categoryName: string }> = new Map();

    properties.forEach(prop => {
      if (prop.category === null || prop.category === category.id) {
        available.push(prop);
      } else {
        const conflictCat = CHECKIN_CATEGORIES.find(c => c.id === prop.category);
        conflicts.set(prop.id, { propertyId: prop.id, categoryName: conflictCat?.name || 'Outra categoria' });
      }
    });

    return { available, conflicts };
  }, [properties, category.id]);

  const filteredProperties = useMemo(() => {
    const searchLower = search.toLowerCase();
    return properties.filter(p => p.name.toLowerCase().includes(searchLower) || p.city.toLowerCase().includes(searchLower));
  }, [properties, search]);

  const toggleProperty = (id: string) => {
    if (conflicts.has(id)) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const Icon = category.icon;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', category.color)}><Icon className="h-5 w-5" /></div>
            <span>Configurar: {category.name}</span>
          </DialogTitle>
          <DialogDescription>{category.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Para quais imóveis?</Label>
              <p className="text-sm text-muted-foreground">
                {selectedIds.length === 0 ? 'Nenhum selecionado' : `${selectedIds.length} imóvel(is) selecionado(s)`}
                {conflicts.size > 0 && <span className="text-amber-600 ml-1">• {conflicts.size} já vinculado(s) a outra categoria</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(available.map(p => p.id))} disabled={available.length === 0}>Selecionar disponíveis</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>Limpar seleção</Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar imóvel..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <ScrollArea className="flex-1 border rounded-lg min-h-[300px]">
            <div className="divide-y">
              {filteredProperties.map(property => {
                const conflict = conflicts.get(property.id);
                const isSelected = selectedIds.includes(property.id);
                const isDisabled = !!conflict;
                const propCat = CHECKIN_CATEGORIES.find(c => c.id === property.category);

                return (
                  <div
                    key={property.id}
                    className={cn(
                      "flex items-center gap-3 p-3 transition-colors",
                      isDisabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "cursor-pointer hover:bg-muted/50",
                      isSelected && !isDisabled && "bg-primary/5"
                    )}
                    onClick={() => toggleProperty(property.id)}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      isDisabled ? "bg-muted border-muted-foreground/20" : isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {isSelected && !isDisabled && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("font-medium text-sm truncate", isDisabled && "text-muted-foreground")}>{property.name}</p>
                        {isDisabled && propCat && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800">{propCat.name}</Badge>}
                        {!property.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">Disponível</Badge>}
                      </div>
                      {property.city && <p className="text-xs text-muted-foreground truncate">{property.city}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedIds.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">💡 Selecione pelo menos um imóvel para esta categoria</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={selectedIds.length === 0 || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar ({selectedIds.length} imóveis)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PropertyCheckinList: React.FC<{
  properties: PropertyWithCheckin[];
  onSelectProperty: (id: string) => void;
  selectedCategory?: string;
}> = ({ properties, onSelectProperty, selectedCategory }) => {
  const [search, setSearch] = useState('');
  
  const filtered = properties.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar imóvel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map((property) => {
          const category = CHECKIN_CATEGORIES.find(c => c.id === property.category);
          const Icon = category?.icon || LogIn;
          
          return (
            <Card key={property.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelectProperty(property.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg border', category?.color || 'bg-gray-100')}><Icon className="h-4 w-4" /></div>
                  <div>
                    <h4 className="font-medium">{property.name}</h4>
                    <p className="text-sm text-muted-foreground">{property.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={category ? "outline" : "secondary"}>{category?.name || 'Não configurado'}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">Nenhum imóvel encontrado</div>}
      </div>
    </div>
  );
};

const PropertyCheckinForm: React.FC<{
  property: PropertyWithCheckin;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<void>;
}> = ({ property, onClose, onSave }) => {
  const categoryId = property.category || 'normal';
  const categoryInfo = CHECKIN_CATEGORIES.find(c => c.id === categoryId);
  const CategoryIcon = categoryInfo?.icon || LogIn;
  const config = property.checkin_config || {};
  
  const [requiredDocs, setRequiredDocs] = useState<string[]>(config.required_docs || ['guest_name', 'document_number']);
  const [checkinTime, setCheckinTime] = useState(config.checkin_time || '15:00');
  const [checkoutTime, setCheckoutTime] = useState(config.checkout_time || '11:00');
  const [allowEarlyCheckin, setAllowEarlyCheckin] = useState(config.allow_early_checkin || false);
  const [allowLateCheckout, setAllowLateCheckout] = useState(config.allow_late_checkout || false);
  const [whatsappLink, setWhatsappLink] = useState(config.whatsapp_link || '');
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsapp_number || '');
  const [portariaPhone, setPortariaPhone] = useState(config.portaria_phone || '');
  const [portariaWhatsapp, setPortariaWhatsapp] = useState(config.portaria_whatsapp || '');
  const [portariaHoraInicio, setPortariaHoraInicio] = useState(config.portaria_hora_inicio || '08:00');
  const [portariaHoraFim, setPortariaHoraFim] = useState(config.portaria_hora_fim || '22:00');
  const [emailPortaria, setEmailPortaria] = useState(config.email_portaria || '');
  const [emailSindico, setEmailSindico] = useState(config.email_sindico || '');
  const [responsavelNome, setResponsavelNome] = useState(config.responsavel_nome || '');
  const [responsavelPhone, setResponsavelPhone] = useState(config.responsavel_phone || '');
  const [responsavelFuncao, setResponsavelFuncao] = useState(config.responsavel_funcao || 'zelador');
  const [appSelected, setAppSelected] = useState(config.app_selected || 'prolarme');
  const [appLogin, setAppLogin] = useState(config.app_login || '');
  const [appSenha, setAppSenha] = useState(config.app_senha || '');
  const [appInstrucoes, setAppInstrucoes] = useState(config.app_instrucoes || '');
  const [formLink, setFormLink] = useState(config.form_link || '');
  const [formEmail, setFormEmail] = useState(config.form_email || '');
  const [formInstrucoes, setFormInstrucoes] = useState(config.form_instrucoes || '');
  const [accessMethod, setAccessMethod] = useState<string>(config.access_method || '');
  const [accessDetails, setAccessDetails] = useState(config.access_details || '');
  const [noticeType, setNoticeType] = useState<'no_ato' | 'dias_antes' | 'livre'>(config.notice_type || 'dias_antes');
  const [noticeDays, setNoticeDays] = useState(config.notice_days || 3);
  // Suporta tanto 'notes' (importado da planilha) quanto 'observacoes' (salvo pela interface)
  const [observacoes, setObservacoes] = useState(config.notes || config.observacoes || '');
  const [showObsPreview, setShowObsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium" onClick={(e) => e.stopPropagation()}>{part}</a>;
      }
      return <span key={index}>{part}</span>;
    });
  };
  
  const handleSaveSection = async (sectionName: string) => {
    setSaving(true);
    try {
      let sectionData: Record<string, any> = {};
      switch (sectionName) {
        case 'grupo_whatsapp': sectionData = { whatsapp_link: whatsappLink, whatsapp_number: whatsappNumber }; break;
        case 'portaria_direta': sectionData = { portaria_phone: portariaPhone, portaria_whatsapp: portariaWhatsapp, portaria_hora_inicio: portariaHoraInicio, portaria_hora_fim: portariaHoraFim }; break;
        case 'email_portaria': sectionData = { email_portaria: emailPortaria, email_sindico: emailSindico }; break;
        case 'pessoa_especifica': sectionData = { responsavel_nome: responsavelNome, responsavel_phone: responsavelPhone, responsavel_funcao: responsavelFuncao }; break;
        case 'aplicativo': sectionData = { app_selected: appSelected, app_login: appLogin, app_senha: appSenha, app_instrucoes: appInstrucoes }; break;
        case 'formulario': sectionData = { form_link: formLink, form_email: formEmail, form_instrucoes: formInstrucoes }; break;
        case 'acesso': sectionData = { access_method: accessMethod, access_details: accessDetails }; break;
        case 'documentos': sectionData = { required_docs: requiredDocs }; break;
        case 'horarios': sectionData = { checkin_time: checkinTime, checkout_time: checkoutTime }; break;
        case 'flexibilidade': sectionData = { allow_early_checkin: allowEarlyCheckin, allow_late_checkout: allowLateCheckout }; break;
        case 'antecedencia': sectionData = { notice_type: noticeType, notice_days: noticeDays }; break;
        case 'observacoes': sectionData = { notes: observacoes, observacoes }; break; // Salva em ambos campos para compatibilidade
      }
      await onSave(sectionData);
      toast.success(`Seção salva com sucesso!`);
    } catch (error) {
      toast.error('Erro ao salvar seção');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave({
        required_docs: requiredDocs, checkin_time: checkinTime, checkout_time: checkoutTime,
        allow_early_checkin: allowEarlyCheckin, allow_late_checkout: allowLateCheckout,
        access_method: accessMethod, access_details: accessDetails,
        notice_type: noticeType, notice_days: noticeDays, notes: observacoes, observacoes,
        whatsapp_link: whatsappLink, whatsapp_number: whatsappNumber,
        portaria_phone: portariaPhone, portaria_whatsapp: portariaWhatsapp,
        portaria_hora_inicio: portariaHoraInicio, portaria_hora_fim: portariaHoraFim,
        email_portaria: emailPortaria, email_sindico: emailSindico,
        responsavel_nome: responsavelNome, responsavel_phone: responsavelPhone, responsavel_funcao: responsavelFuncao,
        app_selected: appSelected, app_login: appLogin, app_senha: appSenha, app_instrucoes: appInstrucoes,
        form_link: formLink, form_email: formEmail, form_instrucoes: formInstrucoes,
      });
      toast.success('Configuração salva com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
      <div className="space-y-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className={cn('p-3 rounded-lg', categoryInfo?.color)}><CategoryIcon className="h-6 w-6" /></div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{property.name}</h3>
            <p className="text-sm text-muted-foreground">{property.city}</p>
          </div>
          <Badge className={cn(categoryInfo?.color)}>{categoryInfo?.name}</Badge>
        </div>

        {/* Seção específica da categoria */}
        {categoryId === 'grupo_whatsapp' && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <Label className="text-sm font-medium text-green-800">DADOS DO GRUPO WHATSAPP</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Link do Grupo *</Label>
                <Input placeholder="https://chat.whatsapp.com/..." value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Número do administrador</Label>
                <Input placeholder="21 99999-9999" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('grupo_whatsapp')} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Dados do Grupo
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'portaria_direta' && (
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Label className="text-sm font-medium text-purple-800">DADOS DA PORTARIA</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Telefone da Portaria *</Label>
                <Input placeholder="21 3333-3333" value={portariaPhone} onChange={(e) => setPortariaPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">WhatsApp da Portaria</Label>
                <Input placeholder="21 99999-9999" value={portariaWhatsapp} onChange={(e) => setPortariaWhatsapp(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Horário início</Label>
                  <Input type="time" value={portariaHoraInicio} onChange={(e) => setPortariaHoraInicio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Horário fim</Label>
                  <Input type="time" value={portariaHoraFim} onChange={(e) => setPortariaHoraFim(e.target.value)} />
                </div>
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('portaria_direta')} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Dados da Portaria
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'email_portaria' && (
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <Label className="text-sm font-medium text-orange-800">EMAILS PARA COMUNICAÇÃO</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Email da Portaria/Condomínio *</Label>
                <Input type="email" placeholder="portaria@condominio.com.br" value={emailPortaria} onChange={(e) => setEmailPortaria(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Email do Síndico (opcional)</Label>
                <Input type="email" placeholder="sindico@email.com" value={emailSindico} onChange={(e) => setEmailSindico(e.target.value)} />
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('email_portaria')} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Emails
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'pessoa_especifica' && (
          <div className="space-y-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
            <Label className="text-sm font-medium text-pink-800">DADOS DO RESPONSÁVEL</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Nome *</Label>
                <Input placeholder="Nome do responsável" value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Telefone/WhatsApp *</Label>
                <Input placeholder="21 99999-9999" value={responsavelPhone} onChange={(e) => setResponsavelPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Função</Label>
                <Select value={responsavelFuncao} onValueChange={setResponsavelFuncao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zelador">Zelador</SelectItem>
                    <SelectItem value="caseiro">Caseiro</SelectItem>
                    <SelectItem value="porteiro">Porteiro</SelectItem>
                    <SelectItem value="sindico">Síndico</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('pessoa_especifica')} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Dados do Responsável
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'aplicativo' && (
          <div className="space-y-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <Label className="text-sm font-medium text-cyan-800">DADOS DO APLICATIVO</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Aplicativo *</Label>
                <Select value={appSelected} onValueChange={setAppSelected}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXTERNAL_APPS.map((app) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Login</Label>
                <Input placeholder="usuario@email.com" value={appLogin} onChange={(e) => setAppLogin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Senha</Label>
                <Input type="password" placeholder="••••••••" value={appSenha} onChange={(e) => setAppSenha(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Instruções Adicionais</Label>
                <Textarea placeholder="Ex: Cadastrar 1 hóspede por vez..." value={appInstrucoes} onChange={(e) => setAppInstrucoes(e.target.value)} rows={3} />
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('aplicativo')} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Dados do Aplicativo
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'formulario' && (
          <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Label className="text-sm font-medium text-amber-800">DADOS DO FORMULÁRIO</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Link do Formulário *</Label>
                <Input placeholder="https://forms.google.com/..." value={formLink} onChange={(e) => setFormLink(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Email para enviar preenchido</Label>
                <Input type="email" placeholder="condominio@email.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Instruções</Label>
                <Textarea placeholder="Ex: Preencher, imprimir e enviar para..." value={formInstrucoes} onChange={(e) => setFormInstrucoes(e.target.value)} rows={3} />
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('formulario')} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Dados do Formulário
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'normal' && (
          <div className="p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">Check-in Normal</p>
            <p className="text-sm text-muted-foreground mt-1">Não é necessário comunicação prévia com portaria ou responsáveis.</p>
          </div>
        )}

        {/* Forma de Acesso */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">FORMA DE ACESSO AO IMÓVEL *</Label>
          <p className="text-xs text-muted-foreground">Como o hóspede terá acesso ao imóvel?</p>
          <div className="grid gap-2">
            {ACCESS_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = accessMethod === method.id;
              return (
                <div
                  key={method.id}
                  className={cn('flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all', isSelected ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50')}
                  onClick={() => setAccessMethod(method.id)}
                >
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <Icon className={cn("h-4 w-4 mt-0.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", isSelected && "text-primary")}>{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {accessMethod && accessMethod !== 'outro' && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
              <Label className="text-sm">Detalhes adicionais:</Label>
              <Input placeholder="Digite os detalhes..." value={accessDetails} onChange={(e) => setAccessDetails(e.target.value)} />
            </div>
          )}
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('acesso')} disabled={saving} variant="outline">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Forma de Acesso
            </Button>
          </div>
        </div>

        {/* Documentos */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">DOCUMENTOS NECESSÁRIOS</Label>
          <div className="grid gap-2">
            {REQUIRED_DOCUMENTS.map((doc) => {
              const Icon = doc.icon;
              const isChecked = requiredDocs.includes(doc.id);
              return (
                <div key={doc.id} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer', isChecked ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50')} onClick={() => setRequiredDocs(prev => isChecked ? prev.filter(id => id !== doc.id) : [...prev, doc.id])}>
                  <Checkbox checked={isChecked} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{doc.label}</span>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('documentos')} disabled={saving} variant="outline">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Documentos
            </Button>
          </div>
        </div>

        {/* Horários */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">HORÁRIOS</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-sm">Horário de Check-in</Label>
              <Input type="time" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Horário de Check-out</Label>
              <Input type="time" value={checkoutTime} onChange={(e) => setCheckoutTime(e.target.value)} />
            </div>
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('horarios')} disabled={saving} variant="outline">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Horários
            </Button>
          </div>
        </div>

        {/* Flexibilidade */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">FLEXIBILIDADE</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Switch checked={allowEarlyCheckin} onCheckedChange={setAllowEarlyCheckin} />
              <span className="text-sm">Permitir early check-in (mediante disponibilidade)</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Switch checked={allowLateCheckout} onCheckedChange={setAllowLateCheckout} />
              <span className="text-sm">Permitir late check-out (mediante disponibilidade)</span>
            </div>
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('flexibilidade')} disabled={saving} variant="outline">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Flexibilidade
            </Button>
          </div>
        </div>

        {/* Antecedência */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">ANTECEDÊNCIA DO AVISO DE CHECK-IN</Label>
          <div className="space-y-2">
            <div className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all', noticeType === 'no_ato' ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'hover:bg-muted/50')} onClick={() => setNoticeType('no_ato')}>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", noticeType === 'no_ato' ? "bg-red-500 border-red-500" : "border-muted-foreground/30")}>
                {noticeType === 'no_ato' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">No ato da reserva</span>
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">URGÊNCIA</span>
                </div>
                <p className="text-xs text-muted-foreground">Enviar imediatamente após a confirmação da reserva</p>
              </div>
            </div>
            
            <div className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all', noticeType === 'dias_antes' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-muted/50')} onClick={() => setNoticeType('dias_antes')}>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", noticeType === 'dias_antes' ? "bg-blue-500 border-blue-500" : "border-muted-foreground/30")}>
                {noticeType === 'dias_antes' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">No máximo até</span>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" min={1} max={30} value={noticeDays} onChange={(e) => setNoticeDays(parseInt(e.target.value) || 3)} className="w-16 h-8 text-center" onClick={(e) => e.stopPropagation()} />
                  <span className="text-sm text-muted-foreground">dias antes do check-in</span>
                </div>
              </div>
            </div>
            
            <div className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all', noticeType === 'livre' ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'hover:bg-muted/50')} onClick={() => setNoticeType('livre')}>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", noticeType === 'livre' ? "bg-green-500 border-green-500" : "border-muted-foreground/30")}>
                {noticeType === 'livre' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">Livre, sem obrigação de data</span>
                <p className="text-xs text-muted-foreground">Aviso pode ser enviado a qualquer momento</p>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('antecedencia')} disabled={saving} variant="outline">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Antecedência
            </Button>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-muted-foreground">OBSERVAÇÕES / INSTRUÇÕES ESPECIAIS</Label>
            {observacoes && <Button variant="ghost" size="sm" onClick={() => setShowObsPreview(!showObsPreview)} className="text-xs h-7">{showObsPreview ? 'Editar' : 'Ver Preview'}</Button>}
          </div>
          {showObsPreview ? (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 min-h-[100px]">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Preview das Instruções</span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{renderTextWithLinks(observacoes)}</div>
            </div>
          ) : (
            <Textarea placeholder="Ex: Enviar documentos no site www.condominio.com.br/cadastro..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} className="font-mono text-sm" />
          )}
          {!showObsPreview && observacoes && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Preview:</p>
              <div className="text-sm">{renderTextWithLinks(observacoes)}</div>
            </div>
          )}
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('observacoes')} disabled={saving} variant="outline">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Salvar Observações
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salvar Tudo
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

const CheckinDashboard: React.FC<{ properties: PropertyWithCheckin[]; loading: boolean }> = ({ properties, loading }) => {
  const total = properties.length;
  const configured = properties.filter(p => p.category !== null).length;
  const pending = properties.filter(p => p.category === null).length;
  
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CHECKIN_CATEGORIES.forEach(cat => { counts[cat.id] = properties.filter(p => p.category === cat.id).length; });
    return counts;
  }, [properties]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Building2 className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{total}</p><p className="text-sm text-muted-foreground">Total de Imóveis</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{configured}</p><p className="text-sm text-muted-foreground">Configurados</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{pending}</p><p className="text-sm text-muted-foreground">Pendentes</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><MessageSquare className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{categoryCounts['grupo_whatsapp'] || 0}</p><p className="text-sm text-muted-foreground">Grupo WhatsApp</p></div></div></CardContent></Card>
      </div>
      <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Progresso de Configuração</span><span className="text-sm text-muted-foreground">{configured}/{total} ({total > 0 ? Math.round((configured / total) * 100) : 0}%)</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: total > 0 ? `${(configured / total) * 100}%` : '0%' }} /></div></CardContent></Card>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CheckinTab({ organizationId }: CheckinTabProps) {
  const [properties, setProperties] = useState<PropertyWithCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<typeof CHECKIN_CATEGORIES[0] | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!organizationId) { setLoading(false); return; }
      setLoading(true);
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/lista`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const props = (result.anuncios || []).map((p: any) => {
            const data = p.data || {};
            const internalName = data.internalId || data.internal_id || p.internalId || '';
            const addressData = data.address || data.endereco || {};
            const city = addressData.city || addressData.cidade || '';
            
            return {
              id: p.id,
              name: internalName || `Imóvel ${p.id.slice(0, 8)}`,
              city: city,
              category: p.checkin_category || null,
              checkin_config: p.checkin_config || {},
            };
          });
          setProperties(props);
        } else {
          throw new Error('Erro ao carregar imóveis');
        }
      } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        toast.error('Erro ao carregar imóveis');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [organizationId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CHECKIN_CATEGORIES.forEach(cat => { counts[cat.id] = properties.filter(p => p.category === cat.id).length; });
    return counts;
  }, [properties]);

  const handleSaveCategory = async (categoryId: string, propertyIds: string[]) => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const token = localStorage.getItem('rendizy-token') || '';
      
      const currentlyAssigned = properties.filter(p => p.category === categoryId).map(p => p.id);
      const toRemove = currentlyAssigned.filter(id => !propertyIds.includes(id));
      
      const updates: { property_id: string; checkin_category: string | null }[] = [];
      
      // Remover dos que não estão mais selecionados
      toRemove.forEach(id => updates.push({ property_id: id, checkin_category: null }));
      // Adicionar aos novos selecionados
      propertyIds.forEach(id => updates.push({ property_id: id, checkin_category: categoryId }));
      
      if (updates.length === 0) return;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/batch-update-responsibility`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao salvar categoria');
      }
      
      setProperties(prev => prev.map(p => ({ ...p, category: propertyIds.includes(p.id) ? categoryId : (toRemove.includes(p.id) ? null : p.category) })));
      toast.success(`Categoria "${CHECKIN_CATEGORIES.find(c => c.id === categoryId)?.name}" atualizada!`);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar categoria');
      throw error;
    }
  };

  const handleSavePropertyConfig = async (propertyId: string, config: Record<string, any>) => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const token = localStorage.getItem('rendizy-token') || '';
      
      const property = properties.find(p => p.id === propertyId);
      const mergedConfig = { ...property?.checkin_config, ...config };
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/batch-update-responsibility`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          updates: [{ property_id: propertyId, checkin_config: mergedConfig }]
        }),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao salvar configuração');
      }
      
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, checkin_config: mergedConfig } : p));
      toast.success('Configuração salva!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
      throw error;
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Handle import
  const handleImport = async (updates: { propertyId: string; category: string; config: Record<string, any> }[]) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const token = localStorage.getItem('rendizy-token') || '';
    
    const batchUpdates = updates.map(u => ({
      property_id: u.propertyId,
      checkin_category: u.category,
      checkin_config: u.config,
    }));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/batch-update-responsibility`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'X-Auth-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ updates: batchUpdates }),
    });
    
    if (!response.ok) throw new Error('Erro ao importar');
    
    // Atualizar estado local
    setProperties(prev => prev.map(p => {
      const update = updates.find(u => u.propertyId === p.id);
      if (!update) return p;
      return { ...p, category: update.category, checkin_config: { ...p.checkin_config, ...update.config } };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <div className="p-3 bg-green-100 rounded-full"><LogIn className="h-8 w-8 text-green-600" /></div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-green-800">Gestão de Check-in</h2>
          <p className="text-sm text-green-600">Configure como os check-ins serão gerenciados por imóvel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />Importar Planilha
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Atualizar
          </Button>
        </div>
      </div>

      <CheckinDashboard properties={properties} loading={loading} />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Categorias de Check-in</h3>
          <p className="text-sm text-muted-foreground">Clique em uma categoria para atribuir imóveis</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CHECKIN_CATEGORIES.map((category) => <CategoryCard key={category.id} category={category} count={categoryCounts[category.id] || 0} onClick={() => setSelectedCategory(category)} />)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Imóveis</h3>
            <p className="text-sm text-muted-foreground">Clique em um imóvel para configurar os detalhes do check-in</p>
          </div>
          <Select value={filterCategory || 'all'} onValueChange={(v) => setFilterCategory(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CHECKIN_CATEGORIES.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name} ({categoryCounts[cat.id] || 0})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <PropertyCheckinList properties={properties} onSelectProperty={setSelectedPropertyId} selectedCategory={filterCategory || undefined} />
      </div>

      {selectedCategory && <CategoryConfigModal category={selectedCategory} properties={properties} onClose={() => setSelectedCategory(null)} onSave={(ids) => handleSaveCategory(selectedCategory.id, ids)} />}

      {selectedProperty && (
        <Dialog open onOpenChange={() => setSelectedPropertyId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Configuração de Check-in</DialogTitle>
              <DialogDescription>Configure os detalhes de check-in para este imóvel</DialogDescription>
            </DialogHeader>
            <PropertyCheckinForm property={selectedProperty} onClose={() => setSelectedPropertyId(null)} onSave={(data) => handleSavePropertyConfig(selectedProperty.id, data)} />
          </DialogContent>
        </Dialog>
      )}

      <CheckinImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        properties={properties.map(p => ({ id: p.id, name: p.name, city: p.city }))}
        onImport={handleImport}
      />
    </div>
  );
}

export default CheckinTab;
