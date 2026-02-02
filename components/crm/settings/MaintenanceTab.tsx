/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║          TAB: MANUTENÇÃO - Configuração Completa                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Gerencia manutenção em um fluxo intuitivo:
 * 1️⃣ Definir responsabilidades por imóvel
 * 2️⃣ Configurar modelos de tarefas de manutenção
 * 3️⃣ Configurar notificações
 * 
 * @version 1.0.0
 * @date 2026-01-31
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  User,
  Users,
  Wrench,
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  MessageSquare,
  Mail,
  Smartphone,
  Zap,
  Calendar,
  Clock,
  Play,
  MoreHorizontal,
  Copy,
  Pause,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface PropertyWithResponsibility {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    neighborhood: string;
    full: string;
  };
  cleaning_responsibility: 'company' | 'owner';
  maintenance_responsibility: 'company' | 'owner';
}

interface MaintenanceTemplate {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'event' | 'scheduled' | 'manual';
  event_config?: {
    event_type: string;
    offset_hours: number;
    condition: 'before' | 'after';
  };
  schedule_config?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days_of_week?: string[];
    day_of_month?: number;
    time_of_day: string;
  };
  sla_hours?: number;
  subtasks: string[];
  is_active: boolean;
  responsibility_filter: 'all' | 'company' | 'owner';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationConfig {
  whatsapp: boolean;
  email: boolean;
  app: boolean;
  message_template: string;
}

interface MaintenanceTabProps {
  organizationId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAINTENANCE_SUBTASKS = [
  'Verificar vazamentos',
  'Testar todas as luzes',
  'Verificar fechaduras',
  'Checar extintores',
  'Inspecionar ar-condicionado',
  'Verificar aquecedor de água',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MaintenanceTab({ organizationId }: MaintenanceTabProps) {
  // ========== STATE ==========
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PropertyWithResponsibility[]>([]);
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<PropertyWithResponsibility>>>(new Map());
  
  // Filtros
  const [activeFilter, setActiveFilter] = useState<'all' | 'company' | 'owner'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sections expanded state
  const [expandedSections, setExpandedSections] = useState({
    responsibilities: true,
    templates: false,
    notifications: false,
  });
  
  // Notification config
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    whatsapp: true,
    email: false,
    app: true,
    message_template: 'Olá! Uma nova tarefa de manutenção foi atribuída para o imóvel {imovel}. Prioridade: {prioridade}. Prazo: {prazo}.',
  });

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadData();
  }, [organizationId]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadProperties(), loadTemplates()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProperties() {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/lista`, {
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
          const street = addressData.street || addressData.rua || '';
          const neighborhood = addressData.neighborhood || addressData.bairro || '';
          const city = addressData.city || addressData.cidade || '';
          
          return {
            id: p.id,
            name: internalName || `Imóvel ${p.id.slice(0, 8)}`,
            address: {
              street,
              city,
              neighborhood,
              full: [street, neighborhood, city].filter(Boolean).join(', '),
            },
            cleaning_responsibility: p.cleaning_responsibility || 'company',
            maintenance_responsibility: p.maintenance_responsibility || 'company',
          };
        });
        setProperties(props);
      }
    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
      toast.error('Erro ao carregar imóveis');
    }
  }

  async function loadTemplates() {
    // TODO: Carregar templates reais do banco
    setTemplates([
      {
        id: '1',
        name: 'Manutenção Preventiva Semanal',
        description: 'Verificação geral de manutenção do imóvel',
        trigger_type: 'scheduled',
        schedule_config: {
          frequency: 'weekly',
          days_of_week: ['monday'],
          time_of_day: '09:00',
        },
        sla_hours: 24,
        subtasks: DEFAULT_MAINTENANCE_SUBTASKS,
        is_active: true,
        responsibility_filter: 'company',
        priority: 'medium',
      },
      {
        id: '2',
        name: 'Inspeção Mensal',
        description: 'Inspeção completa para garantir padrões de qualidade',
        trigger_type: 'scheduled',
        schedule_config: {
          frequency: 'monthly',
          day_of_month: 1,
          time_of_day: '10:00',
        },
        sla_hours: 48,
        subtasks: ['Fotodocumentação', 'Avaliação de desgaste', 'Relatório de melhorias'],
        is_active: true,
        responsibility_filter: 'all',
        priority: 'low',
      },
    ]);
  }

  // ========== COMPUTED ==========
  const stats = useMemo(() => {
    const propsWithChanges = properties.map(p => {
      const changes = pendingChanges.get(p.id);
      return changes ? { ...p, ...changes } : p;
    });
    
    return {
      total: propsWithChanges.length,
      company: propsWithChanges.filter(p => p.maintenance_responsibility === 'company').length,
      owner: propsWithChanges.filter(p => p.maintenance_responsibility === 'owner').length,
    };
  }, [properties, pendingChanges]);

  const filteredProperties = useMemo(() => {
    let filtered = properties.map(p => {
      const changes = pendingChanges.get(p.id);
      return changes ? { ...p, ...changes } : p;
    });
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.maintenance_responsibility === activeFilter);
    }
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.address.full.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [properties, pendingChanges, activeFilter, searchTerm]);

  const hasPendingChanges = pendingChanges.size > 0;

  // ========== HANDLERS ==========
  function toggleSection(section: keyof typeof expandedSections) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function updatePropertyResponsibility(propertyId: string, responsibility: 'company' | 'owner') {
    setPendingChanges(prev => {
      const next = new Map(prev);
      const current = next.get(propertyId) || {};
      next.set(propertyId, { ...current, maintenance_responsibility: responsibility });
      return next;
    });
  }

  function setAllResponsibility(responsibility: 'company' | 'owner') {
    const updates = new Map<string, Partial<PropertyWithResponsibility>>();
    filteredProperties.forEach(p => {
      updates.set(p.id, { maintenance_responsibility: responsibility });
    });
    setPendingChanges(updates);
  }

  async function saveResponsibilityChanges() {
    if (!hasPendingChanges) return;
    
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const updates = Array.from(pendingChanges.entries()).map(([propertyId, changes]) => ({
        propertyId,
        field: 'maintenance_responsibility',
        value: changes.maintenance_responsibility,
      }));
      
      for (const update of updates) {
        await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/save-field`, {
          method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(update),
        });
      }
      
      setProperties(prev => prev.map(p => {
        const changes = pendingChanges.get(p.id);
        return changes ? { ...p, ...changes } : p;
      }));
      setPendingChanges(new Map());
      toast.success(`${updates.length} imóveis atualizados!`);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar alterações');
    }
  }

  // ========== RENDER ==========
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== INDICADORES ========== */}
      <div className="grid gap-4 md:grid-cols-3">
        <IndicatorCard
          value={stats.total}
          label="Total de Imóveis"
          icon={Building2}
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
          color="gray"
        />
        <IndicatorCard
          value={stats.company}
          label="Manutenção Empresa"
          icon={Building2}
          active={activeFilter === 'company'}
          onClick={() => setActiveFilter('company')}
          color="purple"
          description="Responsabilidade da empresa"
        />
        <IndicatorCard
          value={stats.owner}
          label="Manutenção Proprietário"
          icon={User}
          active={activeFilter === 'owner'}
          onClick={() => setActiveFilter('owner')}
          color="orange"
          description="Responsabilidade do dono"
        />
      </div>

      {/* ========== SEÇÃO 1: RESPONSABILIDADES ========== */}
      <CollapsibleSection
        number={1}
        title="Defina quem é responsável pela manutenção"
        description="Configure se a empresa ou o proprietário é responsável pela manutenção de cada imóvel"
        icon={Users}
        expanded={expandedSections.responsibilities}
        onToggle={() => toggleSection('responsibilities')}
        badge={hasPendingChanges ? `${pendingChanges.size} alterações` : undefined}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imóvel..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Marcar selecionados:</span>
              <Button variant="outline" size="sm" onClick={() => setAllResponsibility('company')}>
                <Building2 className="h-4 w-4 mr-1" />
                Empresa
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAllResponsibility('owner')}>
                <User className="h-4 w-4 mr-1" />
                Proprietário
              </Button>
            </div>
          </div>

          <Card>
            <ScrollArea className="h-[300px]">
              <div className="divide-y">
                {filteredProperties.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum imóvel encontrado
                  </div>
                ) : (
                  filteredProperties.map(property => (
                    <PropertyRow
                      key={property.id}
                      property={property}
                      hasChanges={pendingChanges.has(property.id)}
                      onChangeResponsibility={(r) => updatePropertyResponsibility(property.id, r)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          {hasPendingChanges && (
            <div className="flex justify-end">
              <Button onClick={saveResponsibilityChanges}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar {pendingChanges.size} Alterações
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ========== SEÇÃO 2: MODELOS DE TAREFAS ========== */}
      <CollapsibleSection
        number={2}
        title="Configure os modelos de tarefas de manutenção"
        description="Defina como as tarefas de manutenção serão criadas"
        icon={Wrench}
        expanded={expandedSections.templates}
        onToggle={() => toggleSection('templates')}
        badge={`${templates.filter(t => t.is_active).length} ativos`}
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo de Manutenção
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="p-8 text-center">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum modelo criado ainda</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.map(template => (
                <MaintenanceTemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ========== SEÇÃO 3: NOTIFICAÇÕES ========== */}
      <CollapsibleSection
        number={3}
        title="Configure as notificações"
        description="Defina como os responsáveis serão avisados sobre as tarefas"
        icon={Bell}
        expanded={expandedSections.notifications}
        onToggle={() => toggleSection('notifications')}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card 
              className={cn("cursor-pointer transition-all", notificationConfig.whatsapp ? "ring-2 ring-green-500" : "opacity-60")}
              onClick={() => setNotificationConfig(prev => ({ ...prev, whatsapp: !prev.whatsapp }))}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", notificationConfig.whatsapp ? "bg-green-100 text-green-600" : "bg-muted")}>
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">{notificationConfig.whatsapp ? 'Ativo' : 'Inativo'}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn("cursor-pointer transition-all", notificationConfig.email ? "ring-2 ring-blue-500" : "opacity-60")}
              onClick={() => setNotificationConfig(prev => ({ ...prev, email: !prev.email }))}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", notificationConfig.email ? "bg-blue-100 text-blue-600" : "bg-muted")}>
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">{notificationConfig.email ? 'Ativo' : 'Inativo'}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn("cursor-pointer transition-all", notificationConfig.app ? "ring-2 ring-purple-500" : "opacity-60")}
              onClick={() => setNotificationConfig(prev => ({ ...prev, app: !prev.app }))}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", notificationConfig.app ? "bg-purple-100 text-purple-600" : "bg-muted")}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">App/Sistema</p>
                  <p className="text-xs text-muted-foreground">{notificationConfig.app ? 'Ativo' : 'Inativo'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {(notificationConfig.whatsapp || notificationConfig.email) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Modelo de Mensagem</CardTitle>
                <CardDescription>
                  Variáveis: {'{imovel}'}, {'{prazo}'}, {'{prioridade}'}, {'{responsavel}'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                  value={notificationConfig.message_template}
                  onChange={e => setNotificationConfig(prev => ({ ...prev, message_template: e.target.value }))}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function IndicatorCard({ value, label, icon: Icon, active, onClick, color, description }: {
  value: number;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  color: 'gray' | 'blue' | 'orange' | 'green' | 'purple';
  description?: string;
}) {
  const colorClasses = {
    gray: 'border-gray-300 bg-gray-50 text-gray-700',
    blue: 'border-blue-300 bg-blue-50 text-blue-700',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    green: 'border-green-300 bg-green-50 text-green-700',
    purple: 'border-purple-300 bg-purple-50 text-purple-700',
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        active && "ring-2 ring-primary ring-offset-2",
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm font-medium">{label}</p>
            {description && <p className="text-xs opacity-75 mt-1">{description}</p>}
          </div>
          <Icon className="h-8 w-8 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

function CollapsibleSection({ number, title, description, icon: Icon, expanded, onToggle, badge, children }: {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <Card className={cn(expanded && "ring-1 ring-primary/20")}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {number}
              </div>
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {title}
                  {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
                </CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
              </div>
              {expanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function PropertyRow({ property, hasChanges, onChangeResponsibility }: {
  property: PropertyWithResponsibility;
  hasChanges: boolean;
  onChangeResponsibility: (r: 'company' | 'owner') => void;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 hover:bg-muted/50 transition-colors",
      hasChanges && "bg-amber-50"
    )}>
      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{property.name}</p>
          {property.address.full && <p className="text-xs text-muted-foreground">{property.address.full}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={property.maintenance_responsibility === 'company' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChangeResponsibility('company')}
        >
          <Building2 className="h-3 w-3 mr-1" />
          Empresa
        </Button>
        <Button
          variant={property.maintenance_responsibility === 'owner' ? 'default' : 'outline'}
          size="sm"
          className={cn("h-7 text-xs", property.maintenance_responsibility === 'owner' && "bg-orange-600 hover:bg-orange-700")}
          onClick={() => onChangeResponsibility('owner')}
        >
          <User className="h-3 w-3 mr-1" />
          Proprietário
        </Button>
      </div>
    </div>
  );
}

function MaintenanceTemplateCard({ template }: { template: MaintenanceTemplate }) {
  const triggerInfo = {
    event: { icon: Zap, label: 'Por Evento', color: 'text-purple-600 bg-purple-100' },
    scheduled: { icon: Calendar, label: 'Agendado', color: 'text-blue-600 bg-blue-100' },
    manual: { icon: Play, label: 'Manual', color: 'text-gray-600 bg-gray-100' },
  };

  const priorityInfo = {
    low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
    medium: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
    high: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-600' },
  };

  const info = triggerInfo[template.trigger_type];

  return (
    <Card className={cn(!template.is_active && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", info.color)}>
              <info.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{template.name}</h4>
                {!template.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                <Badge className={cn("text-xs", priorityInfo[template.priority].color)}>
                  {priorityInfo[template.priority].label}
                </Badge>
              </div>
              {template.description && <p className="text-sm text-muted-foreground mt-1">{template.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  SLA: {template.sla_hours}h
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {template.subtasks.length} subtarefas
                </span>
                <span className="flex items-center gap-1">
                  {template.responsibility_filter === 'company' && <><Building2 className="h-3 w-3" /> Só Empresa</>}
                  {template.responsibility_filter === 'owner' && <><User className="h-3 w-3" /> Só Proprietário</>}
                  {template.responsibility_filter === 'all' && <><Users className="h-3 w-3" /> Todos</>}
                </span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Edit2 className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
              <DropdownMenuItem><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
              <DropdownMenuItem>
                {template.is_active ? <><Pause className="h-4 w-4 mr-2" /> Desativar</> : <><Play className="h-4 w-4 mr-2" /> Ativar</>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default MaintenanceTab;
