/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                  LEAD SOURCES SETTINGS TAB - ORIGENS DE LEAD             ║
 * ║                                                                           ║
 * ║  Gerencia a configuração de fontes de entrada de leads:                  ║
 * ║  - Números de WhatsApp vinculados a funis                                ║
 * ║  - Formulários do site/landing pages                                     ║
 * ║  - Chatbots e seus fluxos                                                ║
 * ║  - Caixas de email                                                       ║
 * ║  - Integrações externas (APIs)                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-26
 */

import { useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Switch } from '../../ui/switch';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  MessageCircle,
  Bot,
  FileInput,
  Mail,
  Link2,
  Plus,
  Edit,
  Trash2,
  Target,
  ArrowRight,
  CheckCircle,
  XCircle,
  Phone,
  Globe,
  Copy,
  AlertCircle,
  Info,
  Users,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type LeadSourceType = 'whatsapp' | 'chatbot' | 'form' | 'email' | 'api';

interface LeadSource {
  id: string;
  name: string;
  type: LeadSourceType;
  status: 'active' | 'inactive' | 'error';
  targetFunnelId: string;
  targetFunnelName: string;
  targetStageId: string;
  targetStageName: string;
  autoAssign: boolean;
  assignmentType?: 'specific' | 'round_robin' | 'least_busy';
  assignedUserId?: string;
  assignedTeamId?: string;
  createdAt: string;
  leadsCount: number;
  lastLeadAt?: string;
  // Type-specific config
  config: WhatsAppConfig | ChatbotConfig | FormConfig | EmailConfig | APIConfig;
}

interface WhatsAppConfig {
  instanceId: string;
  instanceName: string;
  phoneNumber: string;
  provider: 'evolution' | 'waha' | 'cloud_api';
  welcomeMessage?: string;
  autoReply?: boolean;
}

interface ChatbotConfig {
  botId: string;
  botName: string;
  flowId: string;
  collectFields: string[];
  minScoreToQualify?: number;
}

interface FormConfig {
  formId: string;
  formName: string;
  embedUrl: string;
  webhookUrl: string;
  fieldMappings: { formField: string; leadField: string }[];
}

interface EmailConfig {
  inboxAddress: string;
  imapServer?: string;
  forwardingEnabled: boolean;
  parseSubject?: boolean;
}

interface APIConfig {
  apiKey: string;
  webhookUrl: string;
  secretToken?: string;
  allowedIPs?: string[];
}

// ============================================================================
// MOCK DATA - Em produção virá do Supabase
// ============================================================================

const MOCK_FUNNELS = [
  { id: 'funnel_vendas', name: 'Funil de Vendas Principal', stages: [
    { id: 'stage_novos', name: 'Novos Leads' },
    { id: 'stage_qualificados', name: 'Qualificados' },
    { id: 'stage_proposta', name: 'Proposta Enviada' },
    { id: 'stage_negociacao', name: 'Negociação' },
  ]},
  { id: 'funnel_locacao', name: 'Funil de Locação', stages: [
    { id: 'stage_interesse', name: 'Interesse' },
    { id: 'stage_visita', name: 'Visita Agendada' },
    { id: 'stage_proposta_loc', name: 'Proposta' },
    { id: 'stage_contrato', name: 'Contrato' },
  ]},
  { id: 'funnel_reativacao', name: 'Funil de Reativação', stages: [
    { id: 'stage_inativos', name: 'Leads Inativos' },
    { id: 'stage_retomada', name: 'Retomada de Contato' },
    { id: 'stage_requalificado', name: 'Requalificado' },
  ]},
];

const MOCK_INSTANCES = [
  { id: 'inst_1', name: 'Vendas Principal', phone: '+55 11 99999-0001', provider: 'evolution' },
  { id: 'inst_2', name: 'Atendimento Geral', phone: '+55 11 99999-0002', provider: 'waha' },
  { id: 'inst_3', name: 'WhatsApp Business API', phone: '+55 11 3000-1000', provider: 'cloud_api' },
];

const MOCK_LEAD_SOURCES: LeadSource[] = [
  {
    id: 'src_1',
    name: 'WhatsApp Vendas',
    type: 'whatsapp',
    status: 'active',
    targetFunnelId: 'funnel_vendas',
    targetFunnelName: 'Funil de Vendas Principal',
    targetStageId: 'stage_novos',
    targetStageName: 'Novos Leads',
    autoAssign: true,
    assignmentType: 'round_robin',
    createdAt: '2026-01-10',
    leadsCount: 156,
    lastLeadAt: '2026-01-26T10:30:00Z',
    config: {
      instanceId: 'inst_1',
      instanceName: 'Vendas Principal',
      phoneNumber: '+55 11 99999-0001',
      provider: 'evolution',
      welcomeMessage: 'Olá! Obrigado por entrar em contato. Em breve um de nossos consultores irá atendê-lo.',
      autoReply: true,
    } as WhatsAppConfig,
  },
  {
    id: 'src_2',
    name: 'Bot Qualificação Site',
    type: 'chatbot',
    status: 'active',
    targetFunnelId: 'funnel_vendas',
    targetFunnelName: 'Funil de Vendas Principal',
    targetStageId: 'stage_qualificados',
    targetStageName: 'Qualificados',
    autoAssign: true,
    assignmentType: 'least_busy',
    createdAt: '2026-01-15',
    leadsCount: 89,
    lastLeadAt: '2026-01-25T18:20:00Z',
    config: {
      botId: 'bot_1',
      botName: 'Qualificação Inicial',
      flowId: 'flow_qualificacao',
      collectFields: ['nome', 'email', 'telefone', 'interesse', 'orcamento'],
      minScoreToQualify: 60,
    } as ChatbotConfig,
  },
  {
    id: 'src_3',
    name: 'Formulário Site Principal',
    type: 'form',
    status: 'active',
    targetFunnelId: 'funnel_vendas',
    targetFunnelName: 'Funil de Vendas Principal',
    targetStageId: 'stage_novos',
    targetStageName: 'Novos Leads',
    autoAssign: false,
    createdAt: '2026-01-05',
    leadsCount: 234,
    lastLeadAt: '2026-01-26T09:15:00Z',
    config: {
      formId: 'form_site',
      formName: 'Contato Site',
      embedUrl: 'https://forms.rendizy.com/embed/form_site',
      webhookUrl: 'https://api.rendizy.com/webhooks/forms/form_site',
      fieldMappings: [
        { formField: 'name', leadField: 'name' },
        { formField: 'email', leadField: 'email' },
        { formField: 'phone', leadField: 'phone' },
        { formField: 'message', leadField: 'notes' },
      ],
    } as FormConfig,
  },
  {
    id: 'src_4',
    name: 'Email Comercial',
    type: 'email',
    status: 'active',
    targetFunnelId: 'funnel_vendas',
    targetFunnelName: 'Funil de Vendas Principal',
    targetStageId: 'stage_novos',
    targetStageName: 'Novos Leads',
    autoAssign: true,
    assignmentType: 'specific',
    assignedUserId: 'user_gerente',
    createdAt: '2026-01-08',
    leadsCount: 45,
    lastLeadAt: '2026-01-24T14:00:00Z',
    config: {
      inboxAddress: 'vendas@empresa.com.br',
      forwardingEnabled: true,
      parseSubject: true,
    } as EmailConfig,
  },
  {
    id: 'src_5',
    name: 'API Parceiro Booking',
    type: 'api',
    status: 'inactive',
    targetFunnelId: 'funnel_locacao',
    targetFunnelName: 'Funil de Locação',
    targetStageId: 'stage_interesse',
    targetStageName: 'Interesse',
    autoAssign: true,
    assignmentType: 'round_robin',
    createdAt: '2026-01-20',
    leadsCount: 12,
    config: {
      apiKey: 'pk_live_***************',
      webhookUrl: 'https://api.rendizy.com/webhooks/api/booking',
      secretToken: 'sk_***************',
    } as APIConfig,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadSourcesSettingsTab() {
  const [sources, setSources] = useState<LeadSource[]>(MOCK_LEAD_SOURCES);
  const [selectedType, setSelectedType] = useState<LeadSourceType | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [createType, setCreateType] = useState<LeadSourceType>('whatsapp');

  // TODO: Implementar dialog de edição usando editingSource
  const isEditDialogOpen = editingSource !== null;

  const filteredSources = selectedType === 'all' 
    ? sources 
    : sources.filter(s => s.type === selectedType);

  const getTypeIcon = (type: LeadSourceType) => {
    switch (type) {
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'chatbot': return <Bot className="h-4 w-4" />;
      case 'form': return <FileInput className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'api': return <Link2 className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: LeadSourceType) => {
    switch (type) {
      case 'whatsapp': return 'WhatsApp';
      case 'chatbot': return 'Chatbot';
      case 'form': return 'Formulário';
      case 'email': return 'Email';
      case 'api': return 'API';
    }
  };

  const getTypeColor = (type: LeadSourceType) => {
    switch (type) {
      case 'whatsapp': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'chatbot': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'form': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'email': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'api': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusBadge = (status: LeadSource['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
            <XCircle className="h-3 w-3 mr-1" />
            Inativo
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta origem de lead?')) {
      setSources(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleToggleStatus = (id: string) => {
    setSources(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'active' ? 'inactive' : 'active' };
      }
      return s;
    }));
  };

  // Stats
  const stats = {
    total: sources.length,
    active: sources.filter(s => s.status === 'active').length,
    totalLeads: sources.reduce((sum, s) => sum + s.leadsCount, 0),
    byType: {
      whatsapp: sources.filter(s => s.type === 'whatsapp').length,
      chatbot: sources.filter(s => s.type === 'chatbot').length,
      form: sources.filter(s => s.type === 'form').length,
      email: sources.filter(s => s.type === 'email').length,
      api: sources.filter(s => s.type === 'api').length,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total de Origens</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Origens Ativas</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.active}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Leads Capturados</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalLeads}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Por WhatsApp</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.byType.whatsapp}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <MessageCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Origens de Lead - Pontos de Entrada Automáticos
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Configure aqui de onde seus leads chegam e para qual funil/etapa serão direcionados automaticamente.
                Cada origem pode ter regras de atribuição automática de responsável e mensagens de boas-vindas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter & Actions */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as LeadSourceType | 'all')} className="w-auto">
          <TabsList className="bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="all" className="text-xs">
              Todos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              WhatsApp ({stats.byType.whatsapp})
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="text-xs flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Chatbot ({stats.byType.chatbot})
            </TabsTrigger>
            <TabsTrigger value="form" className="text-xs flex items-center gap-1">
              <FileInput className="h-3 w-3" />
              Formulário ({stats.byType.form})
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email ({stats.byType.email})
            </TabsTrigger>
            <TabsTrigger value="api" className="text-xs flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              API ({stats.byType.api})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Origem
        </Button>
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        {filteredSources.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhuma origem configurada
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Crie sua primeira origem de lead para começar a capturar leads automaticamente.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Origem
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredSources.map((source) => (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left side - Info */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Type Icon */}
                    <div className={`p-3 rounded-lg ${getTypeColor(source.type)}`}>
                      {getTypeIcon(source.type)}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {source.name}
                        </h3>
                        {getStatusBadge(source.status)}
                        <Badge variant="outline" className={getTypeColor(source.type)}>
                          {getTypeLabel(source.type)}
                        </Badge>
                      </div>

                      {/* Type-specific info */}
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {source.type === 'whatsapp' && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {(source.config as WhatsAppConfig).phoneNumber} • {(source.config as WhatsAppConfig).instanceName}
                          </span>
                        )}
                        {source.type === 'chatbot' && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {(source.config as ChatbotConfig).botName}
                          </span>
                        )}
                        {source.type === 'form' && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {(source.config as FormConfig).formName}
                          </span>
                        )}
                        {source.type === 'email' && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {(source.config as EmailConfig).inboxAddress}
                          </span>
                        )}
                        {source.type === 'api' && (
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            API Key: {(source.config as APIConfig).apiKey.slice(0, 15)}...
                          </span>
                        )}
                      </div>

                      {/* Funnel mapping */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Destino:</span>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700">
                          <Target className="h-3 w-3 mr-1" />
                          {source.targetFunnelName}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <Badge variant="outline">
                          {source.targetStageName}
                        </Badge>
                      </div>

                      {/* Auto-assign info */}
                      {source.autoAssign && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                          <Users className="h-3 w-3" />
                          Atribuição: {source.assignmentType === 'round_robin' ? 'Rodízio' : source.assignmentType === 'least_busy' ? 'Menos ocupado' : 'Específico'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Stats & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Stats */}
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {source.leadsCount}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">leads capturados</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={source.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(source.id)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSource(source)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Last lead */}
                    {source.lastLeadAt && (
                      <p className="text-xs text-gray-400">
                        Último: {new Date(source.lastLeadAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Nova Origem de Lead
            </DialogTitle>
            <DialogDescription>
              Configure uma nova fonte de entrada de leads para seu funil de vendas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de Origem</Label>
              <div className="grid grid-cols-5 gap-2">
                {(['whatsapp', 'chatbot', 'form', 'email', 'api'] as LeadSourceType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCreateType(type)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      createType === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${getTypeColor(type)}`}>
                      {getTypeIcon(type)}
                    </div>
                    <span className="text-xs font-medium">{getTypeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Origem</Label>
                <Input placeholder="Ex: WhatsApp Vendas" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="active">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Funnel & Stage */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                Destino dos Leads
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Funil de Destino</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funil" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_FUNNELS.map((funnel) => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          {funnel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etapa Inicial</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_FUNNELS[0].stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Type-specific config */}
            {createType === 'whatsapp' && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-4">
                <h4 className="font-medium flex items-center gap-2 text-green-800 dark:text-green-300">
                  <MessageCircle className="h-4 w-4" />
                  Configuração WhatsApp
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Instância WhatsApp</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a instância" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_INSTANCES.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name} ({inst.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem de Boas-vindas (opcional)</Label>
                    <Input placeholder="Olá! Obrigado por entrar em contato..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="auto-reply" />
                    <Label htmlFor="auto-reply">Enviar resposta automática</Label>
                  </div>
                </div>
              </div>
            )}

            {createType === 'form' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-4">
                <h4 className="font-medium flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <FileInput className="h-4 w-4" />
                  Configuração Formulário
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Formulário</Label>
                    <Input placeholder="Ex: Contato Site Principal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL (para integração)</Label>
                    <div className="flex gap-2">
                      <Input value="https://api.rendizy.com/webhooks/forms/..." readOnly className="bg-gray-100 dark:bg-gray-800" />
                      <Button variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-assignment */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2 text-purple-800 dark:text-purple-300">
                  <Users className="h-4 w-4" />
                  Atribuição Automática
                </h4>
                <Switch id="auto-assign" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Distribuição</Label>
                <Select defaultValue="round_robin">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Rodízio entre equipe</SelectItem>
                    <SelectItem value="least_busy">Menos ocupado</SelectItem>
                    <SelectItem value="specific">Usuário específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(false)}>
              Criar Origem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && setEditingSource(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Editar Origem de Lead
            </DialogTitle>
            <DialogDescription>
              Atualize as configurações desta fonte de entrada de leads.
            </DialogDescription>
          </DialogHeader>

          {editingSource && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Origem</Label>
                  <Input defaultValue={editingSource.name} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue={editingSource.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Funil de Destino</Label>
                  <Select defaultValue={editingSource.targetFunnelId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_FUNNELS.map((funnel) => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          {funnel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etapa Inicial</Label>
                  <Select defaultValue={editingSource.targetStageId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_FUNNELS[0].stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSource(null)}>
              Cancelar
            </Button>
            <Button onClick={() => setEditingSource(null)}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
