/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           TAB CONFIGURAÇÕES GERAIS - CRM SETTINGS                         ║
 * ║                                                                           ║
 * ║  Configurações gerais do módulo CRM: funis, campos customizados,         ║
 * ║  integrações, notificações e preferências.                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

import { useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  GitBranch,
  Bell,
  MessageCircle,
  Link2,
  Database,
  Shield,
  Save,
  RotateCcw,
  Info,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
  entity: 'deal' | 'contact' | 'task';
  required: boolean;
  options?: string[];
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

// ============================================================================
// DADOS MOCK
// ============================================================================

const DEFAULT_CUSTOM_FIELDS: CustomField[] = [
  { id: 'cf1', name: 'Origem do Lead', type: 'select', entity: 'contact', required: false, options: ['Site', 'Indicação', 'OTA', 'Redes Sociais', 'Outro'] },
  { id: 'cf2', name: 'Valor Estimado', type: 'number', entity: 'deal', required: false },
  { id: 'cf3', name: 'Data de Follow-up', type: 'date', entity: 'deal', required: false },
  { id: 'cf4', name: 'VIP', type: 'boolean', entity: 'contact', required: false },
];

const INTEGRATIONS: Integration[] = [
  { id: 'whatsapp', name: 'WhatsApp Business', description: 'Integração com Evolution API', icon: '💬', status: 'connected', lastSync: '2026-01-25T10:30:00Z' },
  { id: 'email', name: 'Email (SMTP)', description: 'Envio de emails transacionais', icon: '📧', status: 'connected', lastSync: '2026-01-25T14:00:00Z' },
  { id: 'calendar', name: 'Google Calendar', description: 'Sincronização de tarefas e eventos', icon: '📅', status: 'disconnected' },
  { id: 'stays', name: 'Stays.net', description: 'Sincronização de reservas e hóspedes', icon: '🏠', status: 'connected', lastSync: '2026-01-25T15:45:00Z' },
];

// ============================================================================
// COMPONENTES
// ============================================================================

function CustomFieldCard({
  field,
  onDelete,
}: {
  field: CustomField;
  onDelete: () => void;
}) {
  const typeLabels: Record<string, string> = {
    text: 'Texto',
    number: 'Número',
    date: 'Data',
    select: 'Seleção',
    multiselect: 'Múltipla Seleção',
    boolean: 'Sim/Não',
  };

  const entityLabels: Record<string, string> = {
    deal: 'Deals',
    contact: 'Contatos',
    task: 'Tarefas',
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">{field.name}</span>
          {field.required && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
              Obrigatório
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{typeLabels[field.type]}</Badge>
          <span>•</span>
          <span>Aplicado em: {entityLabels[field.entity]}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusConfig = {
    connected: { label: 'Conectado', color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
    disconnected: { label: 'Desconectado', color: 'text-gray-500 dark:text-gray-400', icon: XCircle },
    error: { label: 'Erro', color: 'text-red-600 dark:text-red-400', icon: XCircle },
  };

  const { label, color, icon: StatusIcon } = statusConfig[integration.status];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">{integration.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">{integration.name}</span>
              <span className={`flex items-center gap-1 text-sm ${color}`}>
                <StatusIcon className="h-4 w-4" />
                {label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{integration.description}</p>
            {integration.lastSync && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Última sync: {new Date(integration.lastSync).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm">
            {integration.status === 'connected' ? 'Configurar' : 'Conectar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function GeneralSettingsTab() {
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_CUSTOM_FIELDS);

  // Configurações gerais
  const [settings, setSettings] = useState({
    // Funis e Pipeline
    defaultFunnel: 'vendas',
    autoCreateDeal: true,
    dealRotting: true,
    dealRottingDays: 14,

    // Notificações
    emailNotifications: true,
    pushNotifications: true,
    notifyOnNewLead: true,
    notifyOnDealWon: true,
    notifyOnDealLost: true,
    dailyDigest: true,
    digestTime: '08:00',

    // Comunicação
    defaultEmailTemplate: '',
    emailSignature: '',
    whatsappDefaultMessage: 'Olá {{nome}}, tudo bem?',

    // Segurança e Acesso
    requireApprovalAbove: 10000,
    allowPublicForms: true,
    dataRetentionDays: 365,

    // Aparência
    accentColor: '#3b82f6',
    compactMode: false,
  });

  return (
    <div className="space-y-8">
      {/* Configurações de Funil */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Funis e Pipeline</CardTitle>
              <CardDescription>
                Configure o comportamento padrão dos funis de vendas e deals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funil padrão */}
            <div className="space-y-2">
              <Label>Funil Padrão</Label>
              <Select
                value={settings.defaultFunnel}
                onValueChange={(v) => setSettings({ ...settings, defaultFunnel: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="servicos">Serviços</SelectItem>
                  <SelectItem value="locacao">Locação</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Funil usado por padrão ao criar novos deals.
              </p>
            </div>

            {/* Deal Rotting */}
            <div className="space-y-2">
              <Label>Dias para Deal "Parado"</Label>
              <Input
                type="number"
                value={settings.dealRottingDays}
                onChange={(e) => setSettings({ ...settings, dealRottingDays: parseInt(e.target.value) })}
                disabled={!settings.dealRotting}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Destacar deals sem movimento há X dias.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-gray-700">
            {/* Auto criar deal */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Criar Deal Automaticamente</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Criar deal ao cadastrar novo contato
                </p>
              </div>
              <Switch
                checked={settings.autoCreateDeal}
                onCheckedChange={(checked) => setSettings({ ...settings, autoCreateDeal: checked })}
              />
            </div>

            {/* Deal rotting */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Destacar Deals Parados</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Indicador visual para deals sem atividade
                </p>
              </div>
              <Switch
                checked={settings.dealRotting}
                onCheckedChange={(checked) => setSettings({ ...settings, dealRotting: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campos Customizados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Campos Customizados</CardTitle>
                <CardDescription>
                  Adicione campos personalizados para capturar informações específicas do seu negócio.
                </CardDescription>
              </div>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Campo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customFields.map((field) => (
              <CustomFieldCard
                key={field.id}
                field={field}
                onDelete={() => setCustomFields(customFields.filter((f) => f.id !== field.id))}
              />
            ))}
            {customFields.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhum campo customizado configurado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>
                Configure quando e como você deseja ser notificado.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por Email</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receber alertas importantes por email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>

            {/* Push */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações Push</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Alertas no navegador/app
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
              />
            </div>

            {/* Novo lead */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Novo Lead</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notificar quando um lead é criado
                </p>
              </div>
              <Switch
                checked={settings.notifyOnNewLead}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnNewLead: checked })}
              />
            </div>

            {/* Deal ganho */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Deal Ganho</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notificar quando um deal é fechado
                </p>
              </div>
              <Switch
                checked={settings.notifyOnDealWon}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnDealWon: checked })}
              />
            </div>
          </div>

          {/* Resumo diário */}
          <div className="pt-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Resumo Diário</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receber resumo das atividades do dia anterior
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={settings.digestTime}
                  onChange={(e) => setSettings({ ...settings, digestTime: e.target.value })}
                  className="w-28"
                  disabled={!settings.dailyDigest}
                />
                <Switch
                  checked={settings.dailyDigest}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyDigest: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte o CRM com outros sistemas e serviços.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {INTEGRATIONS.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comunicação Padrão */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Mensagens Padrão</CardTitle>
              <CardDescription>
                Configure templates padrão para comunicação com clientes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Mensagem Padrão WhatsApp</Label>
            <Textarea
              value={settings.whatsappDefaultMessage}
              onChange={(e) => setSettings({ ...settings, whatsappDefaultMessage: e.target.value })}
              placeholder="Use {{nome}}, {{email}} para variáveis"
              rows={3}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Variáveis disponíveis: {`{{nome}}, {{email}}, {{telefone}}, {{imovel}}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Assinatura de Email</Label>
            <Textarea
              value={settings.emailSignature}
              onChange={(e) => setSettings({ ...settings, emailSignature: e.target.value })}
              placeholder="Sua assinatura padrão para emails"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Segurança e Dados</CardTitle>
              <CardDescription>
                Configurações de segurança e retenção de dados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aprovação para valores altos */}
            <div className="space-y-2">
              <Label>Requer Aprovação Acima de (R$)</Label>
              <Input
                type="number"
                value={settings.requireApprovalAbove}
                onChange={(e) => setSettings({ ...settings, requireApprovalAbove: parseInt(e.target.value) })}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Deals acima deste valor precisam de aprovação de gestor.
              </p>
            </div>

            {/* Retenção de dados */}
            <div className="space-y-2">
              <Label>Retenção de Dados (dias)</Label>
              <Select
                value={String(settings.dataRetentionDays)}
                onValueChange={(v) => setSettings({ ...settings, dataRetentionDays: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="180">180 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="730">2 anos</SelectItem>
                  <SelectItem value="1825">5 anos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Período de retenção de dados históricos.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir Formulários Públicos</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aceitar leads de formulários públicos (site, landing pages)
                </p>
              </div>
              <Switch
                checked={settings.allowPublicForms}
                onCheckedChange={(checked) => setSettings({ ...settings, allowPublicForms: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Sobre estas configurações</div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Estas configurações afetam todo o módulo CRM da sua organização. 
                Alterações serão aplicadas para todos os usuários com acesso ao CRM.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrões
        </Button>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
