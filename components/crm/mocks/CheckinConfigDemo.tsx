/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║          MOCK: CHECK-IN CONFIGURATION DEMO                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Telas mock para demonstração e aprovação do design do módulo de Check-in.
 * Baseado na análise da planilha "OPERACIONAL CHECKIN E CHECKOUT.xlsx"
 * 
 * CATEGORIAS IDENTIFICADAS (163 imóveis):
 * 1. NORMAL (41) - Check-in simples, sem comunicação prévia
 * 2. GRUPO_WHATSAPP (79) - Enviar dados no grupo WhatsApp do imóvel
 * 3. PORTARIA_DIRETA (11) - Comunicar portaria via WhatsApp/telefone
 * 4. EMAIL_PORTARIA (8) - Enviar email para portaria/condomínio
 * 5. PESSOA_ESPECIFICA (8) - Comunicar zelador/caseiro específico
 * 6. APLICATIVO (8) - Usar app (Prolarme, CONDFY, Vida de Síndico)
 * 7. FORMULARIO (3) - Preencher formulário do condomínio
 * 
 * @version 1.1.0
 * @date 2026-02-01
 */

import React, { useState, useMemo } from 'react';
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
  Settings,
  Search,
  ChevronRight,
  X,
  AlertTriangle,
  Save,
  CheckCircle,
  Send,
  Check,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * Categorias de Check-in baseadas na análise da planilha
 */
const CHECKIN_CATEGORIES = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Check-in simples, sem comunicação prévia necessária',
    icon: LogIn,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    count: 41,
  },
  {
    id: 'grupo_whatsapp',
    name: 'Grupo WhatsApp',
    description: 'Enviar resumo da reserva + docs no grupo WPP do imóvel',
    icon: MessageSquare,
    color: 'bg-green-100 text-green-600 border-green-200',
    count: 79,
  },
  {
    id: 'portaria_direta',
    name: 'Portaria Direta',
    description: 'Comunicar portaria via WhatsApp ou telefone',
    icon: Phone,
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    count: 11,
  },
  {
    id: 'email_portaria',
    name: 'Email Portaria',
    description: 'Enviar dados para email do condomínio/portaria',
    icon: Mail,
    color: 'bg-purple-100 text-purple-600 border-purple-200',
    count: 8,
  },
  {
    id: 'pessoa_especifica',
    name: 'Pessoa Específica',
    description: 'Comunicar zelador, caseiro ou responsável específico',
    icon: User,
    color: 'bg-orange-100 text-orange-600 border-orange-200',
    count: 8,
  },
  {
    id: 'aplicativo',
    name: 'Aplicativo',
    description: 'Cadastrar em app específico (Prolarme, CONDFY, etc)',
    icon: Smartphone,
    color: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    count: 8,
  },
  {
    id: 'formulario',
    name: 'Formulário',
    description: 'Preencher formulário específico do condomínio',
    icon: FileText,
    color: 'bg-amber-100 text-amber-600 border-amber-200',
    count: 3,
  },
];

/**
 * Documentos que podem ser exigidos no check-in
 */
const REQUIRED_DOCUMENTS = [
  { id: 'guest_name', label: 'Nome completo do hóspede', icon: User },
  { id: 'document_number', label: 'Número do documento (RG/CPF)', icon: IdCard },
  { id: 'document_photo', label: 'Foto do documento', icon: Camera },
  { id: 'vehicle_plate', label: 'Placa do veículo', icon: Car },
  { id: 'vehicle_model', label: 'Modelo do veículo', icon: Car },
  { id: 'all_guests', label: 'Dados de TODOS os hóspedes', icon: Users },
];

/**
 * Formas de acesso ao imóvel
 */
const ACCESS_METHODS = [
  { 
    id: 'chave_em_maos', 
    label: 'Chave entregue em mãos', 
    description: 'Alguém entrega a chave pessoalmente ao hóspede',
    icon: Key,
  },
  { 
    id: 'cofre_frente_casa', 
    label: 'Cofre de chaves na frente da casa', 
    description: 'Cofre com senha na entrada do imóvel',
    icon: Key,
  },
  { 
    id: 'cofre_fora_predio', 
    label: 'Cofre de chaves fora do prédio', 
    description: 'Cofre externo com chaves da portaria e do apartamento',
    icon: Key,
  },
  { 
    id: 'portaria_recepcao', 
    label: 'Portaria 24h → Pega chave na recepção', 
    description: 'Entra pela portaria e retira a chave com o porteiro/recepção',
    icon: Building2,
  },
  { 
    id: 'portaria_cofre_porta', 
    label: 'Portaria 24h → Cofre na porta do apto', 
    description: 'Entra pela portaria e pega chave no cofre da porta do apartamento',
    icon: Building2,
  },
  { 
    id: 'portaria_fechadura_senha', 
    label: 'Portaria 24h → Fechadura com senha', 
    description: 'Entra pela portaria e usa código numérico na fechadura do apto',
    icon: Building2,
  },
  { 
    id: 'fechadura_qrcode', 
    label: 'Fechadura eletrônica via QR Code', 
    description: 'Hóspede recebe QR Code para abrir a fechadura',
    icon: Smartphone,
  },
  { 
    id: 'fechadura_chave_digital', 
    label: 'Fechadura eletrônica via chave digital', 
    description: 'Hóspede recebe chave digital no app para abrir a fechadura',
    icon: Smartphone,
  },
  { 
    id: 'fechadura_bluetooth', 
    label: 'Fechadura via Bluetooth/App', 
    description: 'Hóspede usa app no celular para destrancar via Bluetooth',
    icon: Smartphone,
  },
  { 
    id: 'cartao_magnetico', 
    label: 'Cartão magnético/Cartão de acesso', 
    description: 'Hóspede recebe cartão para acessar o imóvel',
    icon: IdCard,
  },
  { 
    id: 'cadastro_facial', 
    label: 'Cadastro facial / Biometria facial', 
    description: 'Hóspede precisa fazer cadastro com foto para liberação por reconhecimento facial',
    icon: Camera,
  },
  { 
    id: 'cadastro_biometria_adm', 
    label: 'Cadastro de biometria na administração', 
    description: 'Hóspede precisa ir até a administração para cadastrar biometria digital',
    icon: User,
  },
  { 
    id: 'checkin_hotel', 
    label: 'Check-in no saguão do hotel', 
    description: 'Hóspede faz check-in presencial na recepção do hotel',
    icon: Building2,
  },
  { 
    id: 'checkin_pousada', 
    label: 'Check-in na recepção da pousada', 
    description: 'Hóspede faz check-in presencial na recepção da pousada',
    icon: Building2,
  },
  { 
    id: 'totem_autoatendimento', 
    label: 'Totem de autoatendimento (self check-in)', 
    description: 'Hóspede faz check-in em totem eletrônico e retira chave/cartão',
    icon: Smartphone,
  },
  { 
    id: 'liberacao_remota', 
    label: 'Liberação remota via interfone/vídeo', 
    description: 'Anfitrião libera acesso remotamente após confirmar identidade por vídeo',
    icon: Phone,
  },
  { 
    id: 'chave_escondida', 
    label: 'Chave em local secreto', 
    description: 'Chave escondida em local combinado (ex: caixa de luz, vaso, etc)',
    icon: Key,
  },
  { 
    id: 'outro', 
    label: 'Outro (especificar nas observações)', 
    description: 'Forma de acesso diferente das listadas',
    icon: FileText,
  },
];

/**
 * Tipos de aplicativos externos identificados
 */
const EXTERNAL_APPS = [
  { id: 'prolarme', name: 'Prolarme', description: 'Sistema de segurança com cadastro facial' },
  { id: 'condfy', name: 'CONDFY', description: 'App de gestão de condomínio' },
  { id: 'vida_sindico', name: 'Vida de Síndico', description: 'Sistema de administração condominial' },
  { id: 'organize_condominio', name: 'Organize meu Condomínio', description: 'Plataforma de gestão' },
  { id: 'outro', name: 'Outro', description: 'Aplicativo customizado' },
];

// Mock de imóveis para demonstração - estado inicial com algumas categorias já atribuídas
const INITIAL_PROPERTIES = [
  { id: '1', name: 'Casa Joá - Barra da Tijuca', city: 'Rio de Janeiro', category: 'grupo_whatsapp' },
  { id: '2', name: 'Apto Centro Cabo Frio', city: 'Cabo Frio', category: 'normal' },
  { id: '3', name: 'Flat Caravelas Búzios', city: 'Armação dos Búzios', category: 'portaria_direta' },
  { id: '4', name: 'Casa Mauro Peró', city: 'Cabo Frio', category: 'email_portaria' },
  { id: '5', name: 'Celso BH Cittá', city: 'Belo Horizonte', category: 'email_portaria' },
  { id: '6', name: 'Mauricio Rio das Ostras', city: 'Rio das Ostras', category: 'aplicativo' },
  { id: '7', name: 'Casa Angra - Carlos', city: 'Angra dos Reis', category: 'grupo_whatsapp' },
  { id: '8', name: 'Bruno Volta Redonda', city: 'Volta Redonda', category: 'normal' },
  // Imóveis sem categoria atribuída (disponíveis)
  { id: '9', name: 'Vera Prainha Paraty', city: 'Paraty', category: null },
  { id: '10', name: 'Marcus Vidigal', city: 'Rio de Janeiro', category: null },
  { id: '11', name: 'Quarto 02 - Barra Itaúna', city: 'Rio de Janeiro', category: null },
  { id: '12', name: 'Thiago - Ilha do Governador', city: 'Rio de Janeiro', category: null },
  { id: '13', name: 'Rua Laura Muller', city: 'Rio de Janeiro', category: null },
  { id: '14', name: 'Casa Praia Grande', city: 'Arraial do Cabo', category: null },
  { id: '15', name: 'Apto Copacabana Beach', city: 'Rio de Janeiro', category: null },
  { id: '16', name: 'Chalé Serra Imperial', city: 'Petrópolis', category: null },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Card de categoria de check-in
 */
const CategoryCard: React.FC<{
  category: typeof CHECKIN_CATEGORIES[0];
  isSelected?: boolean;
  onClick?: () => void;
  showCount?: boolean;
  actualCount?: number;
}> = ({ category, isSelected, onClick, showCount = true, actualCount }) => {
  const Icon = category.icon;
  const displayCount = actualCount ?? category.count;
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg border', category.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{category.name}</h3>
              {showCount && (
                <Badge variant="secondary">{displayCount}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {category.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Modal de configuração de categoria com seleção em lote de imóveis
 * Similar ao modal de templates de limpeza
 */
const CategoryConfigModal: React.FC<{
  category: typeof CHECKIN_CATEGORIES[0];
  properties: typeof INITIAL_PROPERTIES;
  onClose: () => void;
  onSave: (selectedPropertyIds: string[]) => void;
}> = ({ category, properties, onClose, onSave }) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    properties.filter(p => p.category === category.id).map(p => p.id)
  );

  // Separar imóveis: disponíveis vs já vinculados a outra categoria
  const { available, conflicts } = useMemo(() => {
    const available: typeof INITIAL_PROPERTIES = [];
    const conflicts: Map<string, { propertyId: string; categoryName: string }> = new Map();

    properties.forEach(prop => {
      if (prop.category === null || prop.category === category.id) {
        available.push(prop);
      } else {
        const conflictCat = CHECKIN_CATEGORIES.find(c => c.id === prop.category);
        conflicts.set(prop.id, {
          propertyId: prop.id,
          categoryName: conflictCat?.name || 'Outra categoria',
        });
      }
    });

    return { available, conflicts };
  }, [properties, category.id]);

  // Filtrar por busca
  const filteredProperties = useMemo(() => {
    const searchLower = search.toLowerCase();
    return properties.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.city.toLowerCase().includes(searchLower)
    );
  }, [properties, search]);

  const toggleProperty = (id: string) => {
    if (conflicts.has(id)) return;
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const selectAllAvailable = () => {
    const availableIds = available.map(p => p.id);
    setSelectedIds(availableIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleSave = () => {
    onSave(selectedIds);
    onClose();
  };

  const Icon = category.icon;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', category.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <span>Configurar: {category.name}</span>
          </DialogTitle>
          <DialogDescription>
            {category.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Seleção de Imóveis */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Para quais imóveis?</Label>
              <p className="text-sm text-muted-foreground">
                {selectedIds.length === 0 
                  ? 'Nenhum selecionado'
                  : `${selectedIds.length} imóvel(is) selecionado(s)`
                }
                {conflicts.size > 0 && (
                  <span className="text-amber-600 ml-1">
                    • {conflicts.size} já vinculado(s) a outra categoria
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllAvailable}
                disabled={available.length === 0}
              >
                Selecionar disponíveis
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpar seleção
              </Button>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar imóvel..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lista de Imóveis */}
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
                      isDisabled 
                        ? "opacity-50 cursor-not-allowed bg-muted/30" 
                        : "cursor-pointer hover:bg-muted/50",
                      isSelected && !isDisabled && "bg-primary/5"
                    )}
                    onClick={() => toggleProperty(property.id)}
                    title={isDisabled ? `Vinculado a "${conflict?.categoryName}"` : undefined}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      isDisabled
                        ? "bg-muted border-muted-foreground/20"
                        : isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                    )}>
                      {isSelected && !isDisabled && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium text-sm truncate",
                          isDisabled && "text-muted-foreground"
                        )}>
                          {property.name}
                        </p>
                        {isDisabled && propCat && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 border-amber-200">
                            {propCat.name}
                          </Badge>
                        )}
                        {!property.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                            Disponível
                          </Badge>
                        )}
                      </div>
                      {property.city && (
                        <p className="text-xs text-muted-foreground truncate">{property.city}</p>
                      )}
                      {isDisabled && (
                        <p className="text-[10px] text-amber-600 truncate">
                          → Já em "{conflict?.categoryName}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedIds.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              💡 Selecione pelo menos um imóvel para esta categoria
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={selectedIds.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Salvar ({selectedIds.length} imóveis)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Lista de imóveis com configuração de check-in
 */
const PropertyCheckinList: React.FC<{
  properties: typeof INITIAL_PROPERTIES;
  onSelectProperty: (id: string) => void;
  selectedCategory?: string;
}> = ({ properties, onSelectProperty, selectedCategory }) => {
  const [search, setSearch] = useState('');
  
  const filtered = properties.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                       p.city.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar imóvel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((property) => {
          const category = CHECKIN_CATEGORIES.find(c => c.id === property.category);
          const Icon = category?.icon || LogIn;
          
          return (
            <Card 
              key={property.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelectProperty(property.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg border', category?.color || 'bg-gray-100')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium">{property.name}</h4>
                    <p className="text-sm text-muted-foreground">{property.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={category ? "outline" : "secondary"}>
                    {category?.name || 'Não configurado'}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum imóvel encontrado
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Formulário de configuração de check-in para um imóvel
 * Layout VERTICAL - sem abas, preenchimento de cima para baixo
 * A categoria já vem definida da seleção em lote anterior
 */
const PropertyCheckinForm: React.FC<{
  property: typeof INITIAL_PROPERTIES[0];
  onClose: () => void;
  onSave: (categoryId: string) => void;
}> = ({ property, onClose, onSave }) => {
  // Categoria já definida - não pode mudar aqui
  const categoryId = property.category || 'normal';
  const categoryInfo = CHECKIN_CATEGORIES.find(c => c.id === categoryId);
  const CategoryIcon = categoryInfo?.icon || LogIn;
  
  // Estados dos campos
  const [requiredDocs, setRequiredDocs] = useState(['guest_name', 'document_number']);
  const [checkinTime, setCheckinTime] = useState('15:00');
  const [checkoutTime, setCheckoutTime] = useState('11:00');
  const [allowEarlyCheckin, setAllowEarlyCheckin] = useState(false);
  const [allowLateCheckout, setAllowLateCheckout] = useState(false);
  
  // Campos específicos por categoria
  const [whatsappLink, setWhatsappLink] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [portariaPhone, setPortariaPhone] = useState('');
  const [portariaWhatsapp, setPortariaWhatsapp] = useState('');
  const [portariaHoraInicio, setPortariaHoraInicio] = useState('08:00');
  const [portariaHoraFim, setPortariaHoraFim] = useState('22:00');
  const [emailPortaria, setEmailPortaria] = useState('');
  const [emailSindico, setEmailSindico] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelPhone, setResponsavelPhone] = useState('');
  const [responsavelFuncao, setResponsavelFuncao] = useState('zelador');
  const [appSelected, setAppSelected] = useState('prolarme');
  const [appLogin, setAppLogin] = useState('');
  const [appSenha, setAppSenha] = useState('');
  const [appInstrucoes, setAppInstrucoes] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formInstrucoes, setFormInstrucoes] = useState('');
  
  // Forma de acesso ao imóvel
  const [accessMethod, setAccessMethod] = useState<string>('');
  const [accessDetails, setAccessDetails] = useState(''); // detalhes extras como senha do cofre, local da chave, etc
  
  // Antecedência do aviso de check-in
  const [noticeType, setNoticeType] = useState<'no_ato' | 'dias_antes' | 'livre'>('dias_antes');
  const [noticeDays, setNoticeDays] = useState(3);
  
  // Campo de observações gerais
  const [observacoes, setObservacoes] = useState('');
  const [showObsPreview, setShowObsPreview] = useState(false);
  
  // Função para renderizar texto com links clicáveis
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    
    // Regex para detectar URLs (http, https, www)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };
  
  // Função de salvar seção individual (mock - mostra feedback)
  const handleSaveSection = (sectionName: string) => {
    // Em produção, salvaria apenas essa seção
    console.log(`Salvando seção: ${sectionName}`);
    // Poderia mostrar um toast de sucesso
  };
  
  const handleSave = () => {
    onSave(categoryId);
    onClose();
  };
  
  return (
    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
      <div className="space-y-6 pb-4">
        {/* Header com nome do imóvel e categoria fixa */}
        <div className="flex items-center justify-between sticky top-0 bg-background pb-4 border-b z-10">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', categoryInfo?.color || 'bg-gray-100')}>
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{property.name}</h3>
              <p className="text-sm text-muted-foreground">{property.city}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Seção 1: Categoria (apenas exibição) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">CATEGORIA DE CHECK-IN</Label>
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-lg border-2',
            categoryInfo?.color || 'bg-gray-100'
          )}>
            <CategoryIcon className="h-5 w-5" />
            <div>
              <p className="font-medium">{categoryInfo?.name || 'Normal'}</p>
              <p className="text-sm opacity-80">{categoryInfo?.description}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Para alterar a categoria, volte para a aba "Categorias" e reatribua o imóvel.
          </p>
        </div>

        {/* Seção 2: Campos específicos da categoria */}
        {categoryId === 'grupo_whatsapp' && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-green-800">DADOS DO GRUPO WHATSAPP</Label>
              <Button size="sm" variant="outline" onClick={() => handleSaveSection('whatsapp')} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="whatsapp-link" className="text-sm">Link do Grupo</Label>
                <Input 
                  id="whatsapp-link"
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  tabIndex={1}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="whatsapp-number" className="text-sm">Número do Grupo (alternativo)</Label>
                <Input 
                  id="whatsapp-number"
                  placeholder="+55 21 99999-9999"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  tabIndex={2}
                />
              </div>
            </div>
          </div>
        )}

        {categoryId === 'portaria_direta' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-blue-800">DADOS DA PORTARIA</Label>
              <Button size="sm" variant="outline" onClick={() => handleSaveSection('portaria')} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="portaria-phone" className="text-sm">Telefone da Portaria</Label>
                <Input 
                  id="portaria-phone"
                  placeholder="+55 21 99999-9999"
                  value={portariaPhone}
                  onChange={(e) => setPortariaPhone(e.target.value)}
                  tabIndex={1}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="portaria-whatsapp" className="text-sm">WhatsApp da Portaria</Label>
                <Input 
                  id="portaria-whatsapp"
                  placeholder="+55 21 99999-9999"
                  value={portariaWhatsapp}
                  onChange={(e) => setPortariaWhatsapp(e.target.value)}
                  tabIndex={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Horário de atendimento</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="time"
                    value={portariaHoraInicio}
                    onChange={(e) => setPortariaHoraInicio(e.target.value)}
                    className="w-28"
                    tabIndex={3}
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input 
                    type="time"
                    value={portariaHoraFim}
                    onChange={(e) => setPortariaHoraFim(e.target.value)}
                    className="w-28"
                    tabIndex={4}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'email_portaria' && (
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-purple-800">EMAILS PARA CONTATO</Label>
              <Button size="sm" variant="outline" onClick={() => handleSaveSection('email')} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email-portaria" className="text-sm">Email da Portaria/Condomínio *</Label>
                <Input 
                  id="email-portaria"
                  type="email"
                  placeholder="portaria@condominio.com"
                  value={emailPortaria}
                  onChange={(e) => setEmailPortaria(e.target.value)}
                  tabIndex={1}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-sindico" className="text-sm">Email do Síndico (CC)</Label>
                <Input 
                  id="email-sindico"
                  type="email"
                  placeholder="sindico@condominio.com"
                  value={emailSindico}
                  onChange={(e) => setEmailSindico(e.target.value)}
                  tabIndex={2}
                />
              </div>
            </div>
          </div>
        )}

        {categoryId === 'pessoa_especifica' && (
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-orange-800">DADOS DO RESPONSÁVEL</Label>
              <Button size="sm" variant="outline" onClick={() => handleSaveSection('responsavel')} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="responsavel-nome" className="text-sm">Nome do Responsável *</Label>
                <Input 
                  id="responsavel-nome"
                  placeholder="Ex: Paulinho (Zelador)"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  tabIndex={1}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="responsavel-phone" className="text-sm">Telefone/WhatsApp *</Label>
                <Input 
                  id="responsavel-phone"
                  placeholder="+55 21 99999-9999"
                  value={responsavelPhone}
                  onChange={(e) => setResponsavelPhone(e.target.value)}
                  tabIndex={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="responsavel-funcao" className="text-sm">Função</Label>
                <Select value={responsavelFuncao} onValueChange={setResponsavelFuncao}>
                  <SelectTrigger tabIndex={3}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zelador">Zelador</SelectItem>
                    <SelectItem value="caseiro">Caseiro</SelectItem>
                    <SelectItem value="sindico">Síndico</SelectItem>
                    <SelectItem value="vizinho">Vizinho</SelectItem>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'aplicativo' && (
          <div className="space-y-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <Label className="text-sm font-medium text-cyan-800">DADOS DO APLICATIVO</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="app-select" className="text-sm">Aplicativo *</Label>
                <Select value={appSelected} onValueChange={setAppSelected}>
                  <SelectTrigger tabIndex={1}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXTERNAL_APPS.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="app-login" className="text-sm">Login</Label>
                <Input 
                  id="app-login"
                  placeholder="usuario@email.com"
                  value={appLogin}
                  onChange={(e) => setAppLogin(e.target.value)}
                  tabIndex={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="app-senha" className="text-sm">Senha</Label>
                <Input 
                  id="app-senha"
                  type="password"
                  placeholder="••••••••"
                  value={appSenha}
                  onChange={(e) => setAppSenha(e.target.value)}
                  tabIndex={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="app-instrucoes" className="text-sm">Instruções Adicionais</Label>
                <Textarea 
                  id="app-instrucoes"
                  placeholder="Ex: Cadastrar 1 hóspede por vez, usar código do apartamento..."
                  value={appInstrucoes}
                  onChange={(e) => setAppInstrucoes(e.target.value)}
                  rows={3}
                  tabIndex={4}
                />
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('aplicativo')} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="h-3 w-3 mr-1" />
                  Salvar Dados do Aplicativo
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
                <Label htmlFor="form-link" className="text-sm">Link do Formulário *</Label>
                <Input 
                  id="form-link"
                  placeholder="https://forms.google.com/..."
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  tabIndex={1}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="form-email" className="text-sm">Email para enviar preenchido</Label>
                <Input 
                  id="form-email"
                  type="email"
                  placeholder="condominio@email.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  tabIndex={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="form-instrucoes" className="text-sm">Instruções</Label>
                <Textarea 
                  id="form-instrucoes"
                  placeholder="Ex: Preencher, imprimir e enviar para..."
                  value={formInstrucoes}
                  onChange={(e) => setFormInstrucoes(e.target.value)}
                  rows={3}
                  tabIndex={3}
                />
              </div>
              <div className="pt-2 border-t mt-4">
                <Button size="sm" onClick={() => handleSaveSection('formulario')} className="bg-amber-600 hover:bg-amber-700">
                  <Save className="h-3 w-3 mr-1" />
                  Salvar Dados do Formulário
                </Button>
              </div>
            </div>
          </div>
        )}

        {categoryId === 'normal' && (
          <div className="p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">Check-in Normal</p>
            <p className="text-sm text-muted-foreground mt-1">
              Não é necessário comunicação prévia com portaria ou responsáveis.
            </p>
          </div>
        )}

        {/* Seção 3: Forma de Acesso ao Imóvel */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">FORMA DE ACESSO AO IMÓVEL *</Label>
          <p className="text-xs text-muted-foreground">
            Como o hóspede terá acesso ao imóvel? Selecione apenas uma opção.
          </p>
          <div className="grid gap-2">
            {ACCESS_METHODS.map((method, index) => {
              const Icon = method.icon;
              const isSelected = accessMethod === method.id;
              
              return (
                <div
                  key={method.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    isSelected 
                      ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                      : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                  )}
                  onClick={() => setAccessMethod(method.id)}
                  tabIndex={5 + index}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setAccessMethod(method.id);
                    }
                  }}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <Icon className={cn(
                    "h-4 w-4 mt-0.5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isSelected && "text-primary"
                    )}>
                      {method.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Campo para detalhes adicionais de acesso */}
          {accessMethod && accessMethod !== 'outro' && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
              <Label htmlFor="access-details" className="text-sm">
                {accessMethod === 'chave_em_maos' && 'Nome/telefone de quem entrega a chave:'}
                {accessMethod === 'cofre_frente_casa' && 'Senha do cofre e localização exata:'}
                {accessMethod === 'cofre_fora_predio' && 'Senha do cofre e localização exata:'}
                {accessMethod === 'portaria_recepcao' && 'Informações adicionais para a portaria:'}
                {accessMethod === 'portaria_cofre_porta' && 'Senha do cofre na porta do apartamento:'}
                {accessMethod === 'portaria_fechadura_senha' && 'Código/senha da fechadura:'}
                {accessMethod === 'fechadura_qrcode' && 'Instruções para gerar/enviar o QR Code:'}
                {accessMethod === 'fechadura_chave_digital' && 'Nome do app e instruções para enviar a chave:'}
                {accessMethod === 'fechadura_bluetooth' && 'Nome do app e instruções de configuração:'}
                {accessMethod === 'cartao_magnetico' && 'Onde retirar o cartão e instruções:'}
                {accessMethod === 'cadastro_facial' && 'Instruções para cadastro facial:'}
                {accessMethod === 'cadastro_biometria_adm' && 'Endereço/horário da administração:'}
                {accessMethod === 'checkin_hotel' && 'Nome do hotel e horário da recepção:'}
                {accessMethod === 'checkin_pousada' && 'Nome da pousada e horário da recepção:'}
                {accessMethod === 'totem_autoatendimento' && 'Localização do totem e instruções:'}
                {accessMethod === 'liberacao_remota' && 'Número/app para contato e instruções:'}
                {accessMethod === 'chave_escondida' && 'Local exato onde a chave está escondida:'}
              </Label>
              <Input 
                id="access-details"
                placeholder="Digite os detalhes..."
                value={accessDetails}
                onChange={(e) => setAccessDetails(e.target.value)}
                tabIndex={15}
              />
            </div>
          )}
          
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('acesso')} variant="outline">
              <Save className="h-3 w-3 mr-1" />
              Salvar Forma de Acesso
            </Button>
          </div>
        </div>

        {/* Seção 4: Documentos necessários */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">DOCUMENTOS NECESSÁRIOS</Label>
          <p className="text-xs text-muted-foreground">
            Selecione quais informações devem ser coletadas do hóspede
          </p>
          <div className="grid gap-2">
            {REQUIRED_DOCUMENTS.map((doc, index) => {
              const Icon = doc.icon;
              const isChecked = requiredDocs.includes(doc.id);
              
              return (
                <div
                  key={doc.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isChecked ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                  )}
                  onClick={() => {
                    setRequiredDocs(prev => 
                      isChecked 
                        ? prev.filter(id => id !== doc.id)
                        : [...prev, doc.id]
                    );
                  }}
                  tabIndex={10 + index}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setRequiredDocs(prev => 
                        isChecked 
                          ? prev.filter(id => id !== doc.id)
                          : [...prev, doc.id]
                      );
                    }
                  }}
                >
                  <Checkbox checked={isChecked} tabIndex={-1} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{doc.label}</span>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('documentos')} variant="outline">
              <Save className="h-3 w-3 mr-1" />
              Salvar Documentos
            </Button>
          </div>
        </div>

        {/* Seção 4: Horários */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">HORÁRIOS</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="checkin-time" className="text-sm">Horário de Check-in</Label>
              <Input 
                id="checkin-time"
                type="time" 
                value={checkinTime}
                onChange={(e) => setCheckinTime(e.target.value)}
                tabIndex={20}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="checkout-time" className="text-sm">Horário de Check-out</Label>
              <Input 
                id="checkout-time"
                type="time" 
                value={checkoutTime}
                onChange={(e) => setCheckoutTime(e.target.value)}
                tabIndex={21}
              />
            </div>
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('horarios')} variant="outline">
              <Save className="h-3 w-3 mr-1" />
              Salvar Horários
            </Button>
          </div>
        </div>

        {/* Seção 5: Flexibilidade */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">FLEXIBILIDADE</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Switch 
                checked={allowEarlyCheckin}
                onCheckedChange={setAllowEarlyCheckin}
                tabIndex={22}
              />
              <span className="text-sm">Permitir early check-in (mediante disponibilidade)</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Switch 
                checked={allowLateCheckout}
                onCheckedChange={setAllowLateCheckout}
                tabIndex={23}
              />
              <span className="text-sm">Permitir late check-out (mediante disponibilidade)</span>
            </div>
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('flexibilidade')} variant="outline">
              <Save className="h-3 w-3 mr-1" />
              Salvar Flexibilidade
            </Button>
          </div>
        </div>

        {/* Seção 6: Antecedência do aviso de check-in */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">ANTECEDÊNCIA DO AVISO DE CHECK-IN</Label>
          <p className="text-xs text-muted-foreground">
            Quando o aviso de check-in deve ser enviado ao hóspede?
          </p>
          <div className="space-y-2">
            {/* Opção: No ato da reserva */}
            <div
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                noticeType === 'no_ato' 
                  ? 'bg-red-50 border-red-300 ring-1 ring-red-300' 
                  : 'hover:bg-muted/50'
              )}
              onClick={() => setNoticeType('no_ato')}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                noticeType === 'no_ato'
                  ? "bg-red-500 border-red-500"
                  : "border-muted-foreground/30"
              )}>
                {noticeType === 'no_ato' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">No ato da reserva</span>
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
                    URGÊNCIA
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enviar imediatamente após a confirmação da reserva
                </p>
              </div>
            </div>
            
            {/* Opção: X dias antes */}
            <div
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                noticeType === 'dias_antes' 
                  ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                  : 'hover:bg-muted/50'
              )}
              onClick={() => setNoticeType('dias_antes')}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                noticeType === 'dias_antes'
                  ? "bg-blue-500 border-blue-500"
                  : "border-muted-foreground/30"
              )}>
                {noticeType === 'dias_antes' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">No máximo até</span>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    type="number"
                    min={1}
                    max={30}
                    value={noticeDays}
                    onChange={(e) => setNoticeDays(parseInt(e.target.value) || 3)}
                    className="w-16 h-8 text-center"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm text-muted-foreground">dias antes do check-in</span>
                </div>
              </div>
            </div>
            
            {/* Opção: Livre */}
            <div
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                noticeType === 'livre' 
                  ? 'bg-green-50 border-green-300 ring-1 ring-green-300' 
                  : 'hover:bg-muted/50'
              )}
              onClick={() => setNoticeType('livre')}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                noticeType === 'livre'
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground/30"
              )}>
                {noticeType === 'livre' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">Livre, sem obrigação de data</span>
                <p className="text-xs text-muted-foreground">
                  Aviso pode ser enviado a qualquer momento (sem urgência)
                </p>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('antecedencia')} variant="outline">
              <Save className="h-3 w-3 mr-1" />
              Salvar Antecedência
            </Button>
          </div>
        </div>

        {/* Seção 7: Observações com suporte a links */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-muted-foreground">OBSERVAÇÕES / INSTRUÇÕES ESPECIAIS</Label>
            {observacoes && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowObsPreview(!showObsPreview)}
                className="text-xs h-7"
              >
                {showObsPreview ? 'Editar' : 'Ver Preview'}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Adicione observações importantes. Links digitados (ex: www.site.com.br) serão clicáveis automaticamente.
          </p>
          
          {showObsPreview ? (
            // Preview com links clicáveis
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 min-h-[100px]">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Preview das Instruções</span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {renderTextWithLinks(observacoes)}
              </div>
            </div>
          ) : (
            // Campo de edição
            <Textarea
              id="observacoes"
              placeholder="Ex: Enviar documentos no site www.condominio.com.br/cadastro&#10;Senha do WiFi: casa123&#10;Chave com o porteiro José"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              tabIndex={24}
              className="font-mono text-sm"
            />
          )}
          
          {/* Exemplo de como fica */}
          {!showObsPreview && observacoes && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Preview:</p>
              <div className="text-sm">
                {renderTextWithLinks(observacoes)}
              </div>
            </div>
          )}
          <div className="pt-2 border-t mt-4">
            <Button size="sm" onClick={() => handleSaveSection('observacoes')} variant="outline">
              <Save className="h-3 w-3 mr-1" />
              Salvar Observações
            </Button>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose} tabIndex={25}>
            Cancelar
          </Button>
          <Button onClick={handleSave} tabIndex={26}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

/**
 * Dashboard de resumo das configurações de check-in
 */
const CheckinDashboard: React.FC<{
  properties: typeof INITIAL_PROPERTIES;
}> = ({ properties }) => {
  const total = properties.length;
  const configured = properties.filter(p => p.category !== null).length;
  const pending = properties.filter(p => p.category === null).length;
  
  // Calcular contagem por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CHECKIN_CATEGORIES.forEach(cat => {
      counts[cat.id] = properties.filter(p => p.category === cat.id).length;
    });
    return counts;
  }, [properties]);

  const grupoWhatsappCount = categoryCounts['grupo_whatsapp'] || 0;
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total de Imóveis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{configured}</p>
                <p className="text-sm text-muted-foreground">Configurados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{grupoWhatsappCount}</p>
                <p className="text-sm text-muted-foreground">Grupos WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Categoria</CardTitle>
          <CardDescription>
            Como os imóveis estão configurados para check-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {CHECKIN_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.id] || 0;
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={cn('p-2 rounded-lg', cat.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cat.name}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full', cat.color.replace('text-', 'bg-').replace('-600', '-500'))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Preview da mensagem de check-in
 */
const MessagePreview: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Preview da Mensagem
        </CardTitle>
        <CardDescription>
          Como a mensagem será enviada para o grupo/portaria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-[#e5ddd5] p-4 rounded-lg">
          <div className="bg-white p-3 rounded-lg shadow-sm max-w-md">
            <p className="font-medium text-green-600 text-sm">Rendizy Reservas</p>
            <div className="mt-2 text-sm space-y-2">
              <p>📋 *NOVO CHECK-IN*</p>
              <p>🏠 Casa Joá - Barra da Tijuca</p>
              <p>📅 Check-in: 01/02/2026 às 15:00</p>
              <p>📅 Check-out: 05/02/2026 às 11:00</p>
              <p>👤 Hóspede: João Silva</p>
              <p>📱 Telefone: (21) 99999-9999</p>
              <p>🚗 Veículo: ABC-1234 (Honda Civic Prata)</p>
              <p className="text-xs text-gray-500 mt-2">Enviado via Rendizy PMS</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN DEMO COMPONENT
// ============================================================================

export function CheckinConfigDemo() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'categories' | 'properties' | 'preview'>('categories');
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<typeof CHECKIN_CATEGORIES[0] | null>(null);
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Calcular contagem por categoria para exibir nos cards
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CHECKIN_CATEGORIES.forEach(cat => {
      counts[cat.id] = properties.filter(p => p.category === cat.id).length;
    });
    return counts;
  }, [properties]);

  // Salvar atribuição em lote de imóveis a uma categoria
  const handleSaveBulkCategory = (categoryId: string, propertyIds: string[]) => {
    setProperties(prev => prev.map(p => {
      // Se estava nesta categoria mas não está mais na seleção, remove
      if (p.category === categoryId && !propertyIds.includes(p.id)) {
        return { ...p, category: null };
      }
      // Se está na seleção, atribui a categoria
      if (propertyIds.includes(p.id)) {
        return { ...p, category: categoryId };
      }
      return p;
    }));
  };

  // Salvar categoria de um imóvel individual
  const handleSavePropertyCategory = (propertyId: string, categoryId: string) => {
    setProperties(prev => prev.map(p => 
      p.id === propertyId ? { ...p, category: categoryId } : p
    ));
  };

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <LogIn className="h-6 w-6" />
              Módulo Check-in - MOCK / DESIGN
            </h1>
            <p className="text-green-100 text-sm">
              Telas de demonstração baseadas na planilha de {properties.length} imóveis
            </p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            MOCK
          </Badge>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="border-b bg-muted/50">
        <div className="px-6 py-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-2">
                <Building2 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Settings className="h-4 w-4" />
                Categorias
              </TabsTrigger>
              <TabsTrigger value="properties" className="gap-2">
                <Key className="h-4 w-4" />
                Configurar Imóveis
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Send className="h-4 w-4" />
                Preview Mensagem
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'dashboard' && <CheckinDashboard properties={properties} />}
        
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Categorias de Check-in</h2>
                <p className="text-sm text-muted-foreground">
                  Clique em uma categoria para atribuir imóveis em lote
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {properties.filter(p => p.category !== null).length} configurados
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  {properties.filter(p => p.category === null).length} pendentes
                </Badge>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CHECKIN_CATEGORIES.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  actualCount={categoryCounts[cat.id]}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCategoryModal(true);
                  }}
                />
              ))}
            </div>

            {/* Imóveis pendentes (sem categoria) */}
            {properties.filter(p => p.category === null).length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Imóveis sem categoria
                  </CardTitle>
                  <CardDescription>
                    Estes imóveis ainda não foram configurados com um tipo de check-in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {properties.filter(p => p.category === null).map(p => (
                      <Badge 
                        key={p.id} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-amber-100"
                        onClick={() => {
                          setSelectedProperty(p.id);
                          setActiveTab('properties');
                        }}
                      >
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {activeTab === 'properties' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold mb-4">Imóveis</h2>
              <PropertyCheckinList 
                properties={properties}
                onSelectProperty={setSelectedProperty}
              />
            </div>
            {selectedPropertyData ? (
              <Card>
                <CardContent className="p-6">
                  <PropertyCheckinForm
                    property={selectedPropertyData}
                    onClose={() => setSelectedProperty(null)}
                    onSave={(categoryId) => {
                      handleSavePropertyCategory(selectedPropertyData.id, categoryId);
                      setSelectedProperty(null);
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um imóvel para configurar</p>
                </div>
              </Card>
            )}
          </div>
        )}
        
        {activeTab === 'preview' && <MessagePreview />}
      </div>

      {/* Modal de configuração em lote */}
      {showCategoryModal && selectedCategory && (
        <CategoryConfigModal
          category={selectedCategory}
          properties={properties}
          onClose={() => {
            setShowCategoryModal(false);
            setSelectedCategory(null);
          }}
          onSave={(propertyIds) => {
            handleSaveBulkCategory(selectedCategory.id, propertyIds);
          }}
        />
      )}
    </div>
  );
}

export default CheckinConfigDemo;
