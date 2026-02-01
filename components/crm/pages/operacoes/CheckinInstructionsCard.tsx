/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║          CHECKIN INSTRUCTIONS CARD                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Card que exibe as instruções de check-in baseadas na configuração do imóvel.
 * Mostra:
 * - Forma de acesso ao imóvel
 * - Como liberar o check-in (categoria)
 * - Documentos necessários
 * - Instruções específicas
 * 
 * @version 1.0.0
 * @date 2026-02-01
 */

import React, { useState } from 'react';
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
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const CHECKIN_CATEGORIES = {
  normal: { 
    name: 'Normal', 
    description: 'Check-in simples, sem comunicação prévia', 
    icon: LogIn, 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    bgColor: 'bg-gray-50',
  },
  grupo_whatsapp: { 
    name: 'Grupo WhatsApp', 
    description: 'Enviar dados no grupo WPP do imóvel', 
    icon: MessageSquare, 
    color: 'bg-green-100 text-green-700 border-green-200',
    bgColor: 'bg-green-50',
  },
  portaria_direta: { 
    name: 'Portaria Direta', 
    description: 'Comunicar portaria via WhatsApp/telefone', 
    icon: Phone, 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50',
  },
  email_portaria: { 
    name: 'Email Portaria', 
    description: 'Enviar email para portaria/condomínio', 
    icon: Mail, 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-50',
  },
  pessoa_especifica: { 
    name: 'Pessoa Específica', 
    description: 'Comunicar zelador/caseiro', 
    icon: User, 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-50',
  },
  aplicativo: { 
    name: 'Aplicativo', 
    description: 'Cadastrar em app específico', 
    icon: Smartphone, 
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    bgColor: 'bg-cyan-50',
  },
  formulario: { 
    name: 'Formulário', 
    description: 'Preencher formulário do condomínio', 
    icon: FileText, 
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50',
  },
};

const ACCESS_METHODS: Record<string, { label: string; icon: typeof Key }> = {
  chave_em_maos: { label: 'Chave entregue em mãos', icon: Key },
  cofre_frente_casa: { label: 'Cofre de chaves na frente da casa', icon: Key },
  cofre_fora_predio: { label: 'Cofre de chaves fora do prédio', icon: Key },
  portaria_recepcao: { label: 'Portaria 24h → Pega chave na recepção', icon: Building2 },
  portaria_cofre_porta: { label: 'Portaria 24h → Cofre na porta do apto', icon: Building2 },
  portaria_fechadura_senha: { label: 'Portaria 24h → Fechadura com senha', icon: Building2 },
  fechadura_qrcode: { label: 'Fechadura eletrônica via QR Code', icon: Smartphone },
  fechadura_chave_digital: { label: 'Fechadura eletrônica via chave digital', icon: Smartphone },
  fechadura_bluetooth: { label: 'Fechadura via Bluetooth/App', icon: Smartphone },
  cartao_magnetico: { label: 'Cartão magnético/Cartão de acesso', icon: IdCard },
  cadastro_facial: { label: 'Cadastro facial / Biometria facial', icon: Camera },
  cadastro_biometria_adm: { label: 'Cadastro de biometria na administração', icon: User },
  checkin_hotel: { label: 'Check-in no saguão do hotel', icon: Building2 },
  checkin_pousada: { label: 'Check-in na recepção da pousada', icon: Building2 },
  totem_autoatendimento: { label: 'Totem de autoatendimento', icon: Smartphone },
  liberacao_remota: { label: 'Liberação remota via interfone/vídeo', icon: Phone },
  chave_escondida: { label: 'Chave em local secreto', icon: Key },
  outro: { label: 'Outro', icon: FileText },
};

const REQUIRED_DOCS: Record<string, { label: string; icon: typeof User }> = {
  guest_name: { label: 'Nome completo', icon: User },
  document_number: { label: 'RG/CPF', icon: IdCard },
  document_photo: { label: 'Foto do documento', icon: Camera },
  vehicle_plate: { label: 'Placa do veículo', icon: Car },
  vehicle_model: { label: 'Modelo do veículo', icon: Car },
  all_guests: { label: 'Dados de TODOS os hóspedes', icon: Users },
};

const EXTERNAL_APPS: Record<string, string> = {
  prolarme: 'Prolarme',
  condfy: 'CONDFY',
  vida_sindico: 'Vida de Síndico',
  organize_condominio: 'Organize meu Condomínio',
  outro: 'Outro',
};

interface CheckinInstructionsCardProps {
  checkin_category: string | null;
  checkin_config: Record<string, any> | null;
  guestName?: string;
  guestPhone?: string;
  guestCount?: number;
  propertyName?: string;
  compact?: boolean;
  onCopyData?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const renderTextWithLinks = (text: string) => {
  if (!text || text === 'nan') return null;
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
          className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {part.length > 40 ? part.substring(0, 40) + '...' : part}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CheckinInstructionsCard: React.FC<CheckinInstructionsCardProps> = ({
  checkin_category,
  checkin_config,
  guestName,
  guestPhone,
  guestCount,
  propertyName,
  compact = false,
  onCopyData,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  
  // Se não tem categoria configurada, mostrar aviso
  if (!checkin_category) {
    return (
      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-sm">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <span className="text-amber-700">Check-in não configurado para este imóvel</span>
      </div>
    );
  }

  const category = CHECKIN_CATEGORIES[checkin_category as keyof typeof CHECKIN_CATEGORIES] 
    || CHECKIN_CATEGORIES.normal;
  const config = checkin_config || {};
  const CategoryIcon = category.icon;
  
  // Extrair dados do config
  const accessMethod = config.access_method;
  const accessDetails = config.access_details;
  const notes = config.notes && config.notes !== 'nan' ? config.notes : config.observacoes;
  const requiredDocs = config.required_docs || [];
  
  // Dados específicos por categoria
  const whatsappLink = config.whatsapp_link;
  const whatsappNumber = config.whatsapp_number;
  const portariaPhone = config.portaria_phone;
  const portariaWhatsapp = config.portaria_whatsapp;
  const emailPortaria = config.email_portaria;
  const responsavelNome = config.responsavel_nome;
  const responsavelPhone = config.responsavel_phone;
  const responsavelFuncao = config.responsavel_funcao;
  const appSelected = config.app_selected;
  const appInstrucoes = config.app_instrucoes;
  const formLink = config.form_link;
  const formInstrucoes = config.form_instrucoes;

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    toast.success('Telefone copiado!');
  };

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleOpenLink = (link: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = link.startsWith('http') ? link : `https://${link}`;
    window.open(url, '_blank');
  };

  const handleCopyReservationData = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = [
      `🏠 Imóvel: ${propertyName || 'N/A'}`,
      `👤 Hóspede: ${guestName || 'N/A'}`,
      `📞 Telefone: ${guestPhone || 'N/A'}`,
      `👥 Quantidade: ${guestCount || 1} pessoa(s)`,
    ].join('\n');
    navigator.clipboard.writeText(data);
    toast.success('Dados copiados!');
    onCopyData?.();
  };

  // Versão compacta (badge inline)
  if (compact && !expanded) {
    return (
      <div 
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
          category.color,
          'hover:shadow-sm'
        )}
        onClick={() => setExpanded(true)}
      >
        <CategoryIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{category.name}</span>
        {accessMethod && ACCESS_METHODS[accessMethod] && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{ACCESS_METHODS[accessMethod].label}</span>
          </>
        )}
        <ChevronDown className="h-4 w-4 ml-auto" />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        category.bgColor,
        category.color.replace('bg-', 'border-').replace('-100', '-300')
      )}
      onClick={(e) => compact && e.stopPropagation()}
    >
      {/* Header */}
      <div 
        className={cn(
          'flex items-center justify-between p-3 cursor-pointer',
          compact && 'hover:bg-white/30'
        )}
        onClick={() => compact && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', category.color)}>
            <CategoryIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{category.name}</p>
            <p className="text-xs opacity-75">{category.description}</p>
          </div>
        </div>
        {compact && (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Forma de Acesso */}
          {accessMethod && ACCESS_METHODS[accessMethod] && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Key className="h-3 w-3" /> COMO O HÓSPEDE ENTRA
              </p>
              <p className="text-sm font-medium flex items-center gap-2">
                {React.createElement(ACCESS_METHODS[accessMethod].icon, { className: 'h-4 w-4' })}
                {ACCESS_METHODS[accessMethod].label}
              </p>
              {accessDetails && (
                <p className="text-xs text-muted-foreground mt-1">{accessDetails}</p>
              )}
            </div>
          )}

          {/* Instruções específicas da categoria */}
          {checkin_category === 'grupo_whatsapp' && (whatsappLink || whatsappNumber) && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> AÇÃO NECESSÁRIA
              </p>
              <div className="flex flex-wrap gap-2">
                {whatsappLink && (
                  <Button size="sm" variant="outline" className="bg-green-500 text-white border-green-600 hover:bg-green-600" onClick={(e) => handleOpenLink(whatsappLink, e)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Abrir Grupo WPP
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleCopyReservationData}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Dados
                </Button>
              </div>
            </div>
          )}

          {checkin_category === 'portaria_direta' && (portariaPhone || portariaWhatsapp) && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Phone className="h-3 w-3" /> CONTATO DA PORTARIA
              </p>
              <div className="flex flex-wrap gap-2">
                {portariaPhone && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); window.open(`tel:${portariaPhone}`, '_blank'); }}>
                    <Phone className="h-4 w-4 mr-2" />
                    {portariaPhone}
                  </Button>
                )}
                {portariaWhatsapp && (
                  <Button size="sm" variant="outline" className="bg-green-500 text-white border-green-600 hover:bg-green-600" onClick={(e) => handleWhatsApp(portariaWhatsapp, e)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          {checkin_category === 'email_portaria' && emailPortaria && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Mail className="h-3 w-3" /> EMAIL DA PORTARIA
              </p>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); window.open(`mailto:${emailPortaria}`, '_blank'); }}>
                <Mail className="h-4 w-4 mr-2" />
                {emailPortaria}
              </Button>
            </div>
          )}

          {checkin_category === 'pessoa_especifica' && (responsavelNome || responsavelPhone) && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <User className="h-3 w-3" /> RESPONSÁVEL
              </p>
              <div className="space-y-2">
                {responsavelNome && (
                  <p className="text-sm font-medium">
                    {responsavelNome} {responsavelFuncao && <span className="text-muted-foreground">({responsavelFuncao})</span>}
                  </p>
                )}
                {responsavelPhone && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => handleCopyPhone(responsavelPhone, e)}>
                      <Copy className="h-4 w-4 mr-2" />
                      {responsavelPhone}
                    </Button>
                    <Button size="sm" variant="outline" className="bg-green-500 text-white border-green-600 hover:bg-green-600" onClick={(e) => handleWhatsApp(responsavelPhone, e)}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {checkin_category === 'aplicativo' && appSelected && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Smartphone className="h-3 w-3" /> APLICATIVO
              </p>
              <Badge variant="secondary" className="mb-2">{EXTERNAL_APPS[appSelected] || appSelected}</Badge>
              {appInstrucoes && <p className="text-xs text-muted-foreground">{appInstrucoes}</p>}
            </div>
          )}

          {checkin_category === 'formulario' && (formLink || formInstrucoes) && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> FORMULÁRIO
              </p>
              {formLink && (
                <Button size="sm" variant="outline" className="mb-2" onClick={(e) => handleOpenLink(formLink, e)}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Abrir Formulário
                </Button>
              )}
              {formInstrucoes && <p className="text-xs text-muted-foreground">{formInstrucoes}</p>}
            </div>
          )}

          {/* Documentos necessários */}
          {requiredDocs.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <IdCard className="h-3 w-3" /> DOCUMENTOS NECESSÁRIOS
              </p>
              <div className="flex flex-wrap gap-1">
                {requiredDocs.map((docId: string) => {
                  const doc = REQUIRED_DOCS[docId];
                  if (!doc) return null;
                  return (
                    <Badge key={docId} variant="outline" className="text-xs">
                      {doc.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observações / Instruções Especiais */}
          {notes && (
            <div className="bg-white/60 rounded-lg p-3 border border-white/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> INSTRUÇÕES ESPECIAIS
              </p>
              <div className="text-sm whitespace-pre-wrap">
                {renderTextWithLinks(notes)}
              </div>
            </div>
          )}

          {/* Ação rápida: Copiar dados */}
          <div className="pt-2 border-t border-white/50">
            <Button size="sm" variant="outline" className="w-full" onClick={handleCopyReservationData}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Dados para Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinInstructionsCard;
