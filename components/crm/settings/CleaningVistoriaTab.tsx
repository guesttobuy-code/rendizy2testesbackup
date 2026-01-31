/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║          TAB: LIMPEZA & VISTORIA - Configuração Completa                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Gerencia limpeza e vistoria de checkout em um fluxo intuitivo:
 * 1️⃣ Definir responsabilidades por imóvel
 * 2️⃣ Configurar modelos de tarefas de limpeza
 * 3️⃣ Configurar vistoria de checkout
 * 4️⃣ Configurar notificações
 * 
 * @version 1.0.0
 * @date 2026-01-31
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  User,
  Users,
  Sparkles,
  ClipboardCheck,
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
  Clock,
  Play,
  MoreHorizontal,
  Copy,
  Pause,
  LogIn,
  LogOut,
  RefreshCw,
  Check,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface CleaningTemplate {
  id: string;
  name: string;
  description?: string;
  // Trigger sempre é "reservation_confirmed" - tarefa criada quando reserva é confirmada
  trigger_type: 'reservation_confirmed' | 'scheduled' | 'manual';
  // A que evento a limpeza está VINCULADA (quando deve ser executada)
  linked_to: 'checkout' | 'checkin' | 'both';
  // IDs dos imóveis onde este modelo se aplica
  property_ids: string[];
  // Configuração para limpeza agendada (futuro)
  schedule_config?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days_of_week?: string[];
    day_of_month?: number;
    time_of_day: string;
  };
  sla_hours: number;
  subtasks: string[];
  is_active: boolean;
  include_vistoria: boolean;
}

interface VistoriaConfig {
  enabled: boolean;
  checklist: string[];
  auto_link_to_cleaning: boolean;
  notify_owner: boolean;
  require_photos: boolean;
}

interface NotificationConfig {
  whatsapp: boolean;
  email: boolean;
  app: boolean;
  message_template: string;
}

interface CleaningVistoriaTabProps {
  organizationId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_VISTORIA_CHECKLIST = [
  'Verificar itens do inventário',
  'Conferir estado dos móveis',
  'Registrar danos encontrados',
  'Verificar limpeza geral',
  'Conferir funcionamento dos equipamentos',
  'Tirar fotos de evidência',
];

const DEFAULT_CLEANING_SUBTASKS = [
  'Trocar roupas de cama',
  'Trocar toalhas',
  'Limpar banheiros',
  'Aspirar/varrer todos os cômodos',
  'Limpar cozinha',
  'Verificar itens perdidos',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CleaningVistoriaTab({ organizationId }: CleaningVistoriaTabProps) {
  // ========== STATE ==========
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PropertyWithResponsibility[]>([]);
  const [templates, setTemplates] = useState<CleaningTemplate[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<PropertyWithResponsibility>>>(new Map());
  
  // Filtros
  const [activeFilter, setActiveFilter] = useState<'all' | 'company' | 'owner'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sections expanded state
  const [expandedSections, setExpandedSections] = useState({
    responsibilities: true,
    templates: false,
    vistoria: false,
    notifications: false,
  });
  
  // Vistoria config
  const [vistoriaConfig, setVistoriaConfig] = useState<VistoriaConfig>({
    enabled: true,
    checklist: DEFAULT_VISTORIA_CHECKLIST,
    auto_link_to_cleaning: true,
    notify_owner: false,
    require_photos: true,
  });
  
  // Notification config
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    whatsapp: true,
    email: false,
    app: true,
    message_template: 'Olá! Uma nova tarefa de limpeza foi atribuída para o imóvel {imovel}. Prazo: {prazo}.',
  });
  
  // Modal de template
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CleaningTemplate | null>(null);
  
  // Seleção de imóveis (checkboxes)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

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
    // Por enquanto, templates mock
    setTemplates([
      {
        id: '1',
        name: 'Limpeza Pós-Checkout',
        description: 'Limpeza completa após saída do hóspede',
        trigger_type: 'reservation_confirmed',
        linked_to: 'checkout',
        property_ids: [], // Todos os imóveis por padrão
        sla_hours: 4,
        subtasks: DEFAULT_CLEANING_SUBTASKS,
        is_active: true,
        include_vistoria: true,
      },
      {
        id: '2',
        name: 'Limpeza Completa (Check-in + Checkout)',
        description: 'Limpeza antes do check-in e depois do checkout',
        trigger_type: 'reservation_confirmed',
        linked_to: 'both',
        property_ids: [],
        sla_hours: 4,
        subtasks: DEFAULT_CLEANING_SUBTASKS,
        is_active: false,
        include_vistoria: true,
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
      company: propsWithChanges.filter(p => p.cleaning_responsibility === 'company').length,
      owner: propsWithChanges.filter(p => p.cleaning_responsibility === 'owner').length,
    };
  }, [properties, pendingChanges]);

  const filteredProperties = useMemo(() => {
    let filtered = properties.map(p => {
      const changes = pendingChanges.get(p.id);
      return changes ? { ...p, ...changes } : p;
    });
    
    // Filtro por responsabilidade
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.cleaning_responsibility === activeFilter);
    }
    
    // Filtro por busca
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

  function setAllResponsibility(responsibility: 'company' | 'owner') {
    if (selectedPropertyIds.size === 0) {
      toast.error('Selecione pelo menos um imóvel');
      return;
    }
    
    setPendingChanges(prev => {
      const next = new Map(prev);
      selectedPropertyIds.forEach(id => {
        const current = next.get(id) || {};
        next.set(id, { ...current, cleaning_responsibility: responsibility });
      });
      return next;
    });
    
    toast.success(`${selectedPropertyIds.size} imóveis marcados como "${responsibility === 'company' ? 'Empresa' : 'Proprietário'}"`);
  }
  
  function selectAllProperties() {
    setSelectedPropertyIds(new Set(filteredProperties.map(p => p.id)));
  }
  
  function clearSelection() {
    setSelectedPropertyIds(new Set());
  }
  
  function togglePropertySelection(propertyId: string) {
    setSelectedPropertyIds(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  }

  async function saveResponsibilityChanges() {
    if (!hasPendingChanges) return;
    
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const token = localStorage.getItem('rendizy-token') || '';
      
      const updates = Array.from(pendingChanges.entries()).map(([propertyId, changes]) => ({
        anuncio_id: propertyId,
        field: 'cleaning_responsibility',
        value: changes.cleaning_responsibility,
      }));
      
      let successCount = 0;
      let failCount = 0;
      
      for (const update of updates) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/save-field`, {
            method: 'POST',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'X-Auth-Token': token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(update),
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error('Erro ao salvar imóvel:', update.anuncio_id, errData);
            failCount++;
          }
        } catch (err) {
          console.error('Erro de rede ao salvar imóvel:', update.anuncio_id, err);
          failCount++;
        }
      }
      
      // Atualiza estado local para os que salvaram
      setProperties(prev => prev.map(p => {
        const changes = pendingChanges.get(p.id);
        return changes ? { ...p, ...changes } : p;
      }));
      setPendingChanges(new Map());
      setSelectedPropertyIds(new Set());
      
      if (failCount === 0) {
        toast.success(`${successCount} imóveis atualizados com sucesso!`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} salvos, ${failCount} falharam`);
      } else {
        toast.error('Erro ao salvar alterações');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar alterações');
    }
  }

  // ========== TEMPLATE HANDLERS ==========
  function handleOpenTemplateModal(template?: CleaningTemplate) {
    setEditingTemplate(template || null);
    setTemplateModalOpen(true);
  }

  function handleSaveTemplate(templateData: CleaningTemplate) {
    if (editingTemplate) {
      // Editando existente
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? templateData : t
      ));
      toast.success('Modelo atualizado com sucesso!');
    } else {
      // Criando novo - o modal já cria o objeto completo
      setTemplates(prev => [...prev, templateData]);
      toast.success('Modelo criado com sucesso!');
    }
    setTemplateModalOpen(false);
  }

  function handleDuplicateTemplate(template: CleaningTemplate) {
    const duplicate: CleaningTemplate = {
      ...template,
      id: `temp-${Date.now()}`,
      name: `${template.name} (Cópia)`,
    };
    setTemplates(prev => [...prev, duplicate]);
    toast.success('Modelo duplicado!');
  }

  function handleToggleTemplateActive(templateId: string) {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, is_active: !t.is_active } : t
    ));
  }

  function handleDeleteTemplate(templateId: string) {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast.success('Modelo excluído!');
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
      {/* ========== INDICADORES (FILTROS CLICÁVEIS) ========== */}
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
          label="Limpeza Empresa"
          icon={Building2}
          active={activeFilter === 'company'}
          onClick={() => setActiveFilter('company')}
          color="blue"
          description="Responsabilidade da empresa"
        />
        <IndicatorCard
          value={stats.owner}
          label="Limpeza Proprietário"
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
        title="Defina quem é responsável pela limpeza"
        description="Configure se a empresa ou o proprietário é responsável pela limpeza de cada imóvel"
        icon={Users}
        expanded={expandedSections.responsibilities}
        onToggle={() => toggleSection('responsibilities')}
        badge={hasPendingChanges ? `${pendingChanges.size} alterações` : undefined}
      >
        <div className="space-y-4">
          {/* Barra de ações: busca + seleção + atribuição */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Busca */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imóvel..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            {/* Botões de seleção e atribuição */}
            <div className="flex items-center gap-3">
              {/* Seleção em lote */}
              <div className="flex items-center gap-1 border-r pr-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllProperties}
                  className="text-xs"
                >
                  Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs"
                >
                  Nenhum
                </Button>
                {selectedPropertyIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedPropertyIds.size} selecionados
                  </Badge>
                )}
              </div>
              
              {/* Atribuição */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Atribuir:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllResponsibility('company')}
                  disabled={selectedPropertyIds.size === 0}
                >
                  <Building2 className="h-4 w-4 mr-1" />
                  Empresa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllResponsibility('owner')}
                  disabled={selectedPropertyIds.size === 0}
                >
                  <User className="h-4 w-4 mr-1" />
                  Proprietário
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de imóveis com checkboxes */}
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
                      isSelected={selectedPropertyIds.has(property.id)}
                      onToggleSelect={() => togglePropertySelection(property.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Botão salvar */}
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
        title="Configure os modelos de tarefas de limpeza"
        description="Defina como as tarefas serão criadas automaticamente"
        icon={Sparkles}
        expanded={expandedSections.templates}
        onToggle={() => toggleSection('templates')}
        badge={`${templates.filter(t => t.is_active).length} ativos`}
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenTemplateModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo de Limpeza
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum modelo criado ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie modelos para automatizar a criação de tarefas de limpeza
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.map(template => (
                <TemplateCard 
                  key={template.id} 
                  template={template}
                  onEdit={() => handleOpenTemplateModal(template)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onToggleActive={() => handleToggleTemplateActive(template.id)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ========== SEÇÃO 3: VISTORIA DE CHECKOUT ========== */}
      <CollapsibleSection
        number={3}
        title="Configure a vistoria de checkout"
        description="Defina como será a conferência/vistoria ao final da estadia"
        icon={ClipboardCheck}
        expanded={expandedSections.vistoria}
        onToggle={() => toggleSection('vistoria')}
        badge={vistoriaConfig.enabled ? 'Ativo' : 'Inativo'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base">Habilitar Vistoria de Checkout</Label>
              <p className="text-sm text-muted-foreground">
                Criar tarefa de vistoria automaticamente junto com a limpeza
              </p>
            </div>
            <Switch
              checked={vistoriaConfig.enabled}
              onCheckedChange={(enabled) => setVistoriaConfig(prev => ({ ...prev, enabled }))}
            />
          </div>

          {vistoriaConfig.enabled && (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Vincular à tarefa de limpeza</Label>
                  <p className="text-sm text-muted-foreground">
                    A vistoria só será concluída quando a limpeza também estiver
                  </p>
                </div>
                <Switch
                  checked={vistoriaConfig.auto_link_to_cleaning}
                  onCheckedChange={(v) => setVistoriaConfig(prev => ({ ...prev, auto_link_to_cleaning: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Exigir fotos de evidência</Label>
                  <p className="text-sm text-muted-foreground">
                    Responsável deve enviar fotos ao concluir a vistoria
                  </p>
                </div>
                <Switch
                  checked={vistoriaConfig.require_photos}
                  onCheckedChange={(v) => setVistoriaConfig(prev => ({ ...prev, require_photos: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Notificar proprietário sobre vistoria</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar relatório de vistoria para o dono do imóvel
                  </p>
                </div>
                <Switch
                  checked={vistoriaConfig.notify_owner}
                  onCheckedChange={(v) => setVistoriaConfig(prev => ({ ...prev, notify_owner: v }))}
                />
              </div>

              {/* Checklist de vistoria */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Checklist de Vistoria</CardTitle>
                  <CardDescription>Itens que serão verificados na vistoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {vistoriaConfig.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm flex-1">{item}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar item
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* ========== SEÇÃO 4: NOTIFICAÇÕES ========== */}
      <CollapsibleSection
        number={4}
        title="Configure as notificações"
        description="Defina como os responsáveis serão avisados sobre as tarefas"
        icon={Bell}
        expanded={expandedSections.notifications}
        onToggle={() => toggleSection('notifications')}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className={cn(
              "cursor-pointer transition-all",
              notificationConfig.whatsapp ? "ring-2 ring-green-500" : "opacity-60"
            )}
              onClick={() => setNotificationConfig(prev => ({ ...prev, whatsapp: !prev.whatsapp }))}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  notificationConfig.whatsapp ? "bg-green-100 text-green-600" : "bg-muted"
                )}>
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    {notificationConfig.whatsapp ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "cursor-pointer transition-all",
              notificationConfig.email ? "ring-2 ring-blue-500" : "opacity-60"
            )}
              onClick={() => setNotificationConfig(prev => ({ ...prev, email: !prev.email }))}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  notificationConfig.email ? "bg-blue-100 text-blue-600" : "bg-muted"
                )}>
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">
                    {notificationConfig.email ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "cursor-pointer transition-all",
              notificationConfig.app ? "ring-2 ring-purple-500" : "opacity-60"
            )}
              onClick={() => setNotificationConfig(prev => ({ ...prev, app: !prev.app }))}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  notificationConfig.app ? "bg-purple-100 text-purple-600" : "bg-muted"
                )}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">App/Sistema</p>
                  <p className="text-xs text-muted-foreground">
                    {notificationConfig.app ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {(notificationConfig.whatsapp || notificationConfig.email) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Modelo de Mensagem</CardTitle>
                <CardDescription>
                  Variáveis disponíveis: {'{imovel}'}, {'{prazo}'}, {'{responsavel}'}, {'{endereco}'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                  value={notificationConfig.message_template}
                  onChange={e => setNotificationConfig(prev => ({ ...prev, message_template: e.target.value }))}
                  placeholder="Digite o modelo de mensagem..."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </CollapsibleSection>

      {/* ================================================================== */}
      {/* MODAL: Criar/Editar Modelo de Limpeza                              */}
      {/* ================================================================== */}
      <CleaningTemplateModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}

// ============================================================================
// CLEANING TEMPLATE MODAL
// ============================================================================

interface CleaningTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CleaningTemplate | null;
  onSave: (template: CleaningTemplate) => void;
}

interface PropertyOption {
  id: string;
  name: string;
  address: string;
}

function CleaningTemplateModal({ open, onOpenChange, template, onSave }: CleaningTemplateModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkedTo, setLinkedTo] = useState<'checkout' | 'checkin' | 'both'>('checkout');
  const [slaHours, setSlaHours] = useState(4);
  const [includeVistoria, setIncludeVistoria] = useState(true);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>([
    'Trocar roupas de cama',
    'Trocar toalhas',
    'Limpar banheiros',
    'Aspirar/varrer todos os cômodos',
    'Limpar cozinha',
    'Verificar itens perdidos',
  ]);
  const [newSubtask, setNewSubtask] = useState('');
  
  // Properties loading
  const [availableProperties, setAvailableProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');

  // Load properties when modal opens
  useEffect(() => {
    if (open) {
      loadAvailableProperties();
    }
  }, [open]);

  // Reset form when modal opens with a template
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setLinkedTo(template.linked_to);
        setSlaHours(template.sla_hours);
        setIncludeVistoria(template.include_vistoria);
        setSelectedPropertyIds(template.property_ids);
        setSubtasks(template.subtasks);
      } else {
        // Reset to defaults for new template
        setName('');
        setDescription('');
        setLinkedTo('checkout');
        setSlaHours(4);
        setIncludeVistoria(true);
        setSelectedPropertyIds([]);
        setSubtasks([
          'Trocar roupas de cama',
          'Trocar toalhas',
          'Limpar banheiros',
          'Aspirar/varrer todos os cômodos',
          'Limpar cozinha',
          'Verificar itens perdidos',
        ]);
      }
      setPropertySearch('');
    }
  }, [open, template]);

  async function loadAvailableProperties() {
    setLoadingProperties(true);
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
          const street = addressData.street || addressData.rua || '';
          const city = addressData.city || addressData.cidade || '';
          
          return {
            id: p.id,
            name: internalName || `Imóvel ${p.id.slice(0, 8)}`,
            address: [street, city].filter(Boolean).join(', '),
          };
        });
        setAvailableProperties(props);
      }
    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
    } finally {
      setLoadingProperties(false);
    }
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks(prev => [...prev, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedPropertyIds(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAllProperties = () => {
    setSelectedPropertyIds(availableProperties.map(p => p.id));
  };

  const clearAllProperties = () => {
    setSelectedPropertyIds([]);
  };

  const filteredProperties = useMemo(() => {
    if (!propertySearch.trim()) return availableProperties;
    const search = propertySearch.toLowerCase();
    return availableProperties.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.address.toLowerCase().includes(search)
    );
  }, [availableProperties, propertySearch]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Digite um nome para o modelo');
      return;
    }

    const newTemplate: CleaningTemplate = {
      id: template?.id || `template_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: 'reservation_confirmed',
      linked_to: linkedTo,
      property_ids: selectedPropertyIds,
      sla_hours: slaHours,
      subtasks,
      is_active: template?.is_active ?? true,
      include_vistoria: includeVistoria,
    };

    onSave(newTemplate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {template ? 'Editar Modelo de Limpeza' : 'Novo Modelo de Limpeza'}
          </DialogTitle>
          <DialogDescription>
            A tarefa será criada automaticamente quando uma reserva for confirmada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome e Descrição */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do modelo *</Label>
              <Input
                id="template-name"
                placeholder="Ex: Limpeza pós-checkout padrão"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Descrição (opcional)</Label>
              <Input
                id="template-desc"
                placeholder="Ex: Limpeza completa após cada checkout"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Vinculado a qual evento? */}
          <div className="space-y-4">
            <div>
              <Label className="text-base">A que evento a limpeza está vinculada?</Label>
              <p className="text-sm text-muted-foreground">
                Define quando a limpeza deve ser executada
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  linkedTo === 'checkout' && "ring-2 ring-orange-500 border-orange-500"
                )}
                onClick={() => setLinkedTo('checkout')}
              >
                <CardContent className="p-4 text-center">
                  <LogOut className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="font-medium text-sm">Checkout</p>
                  <p className="text-xs text-muted-foreground">Após saída do hóspede</p>
                </CardContent>
              </Card>
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  linkedTo === 'checkin' && "ring-2 ring-green-500 border-green-500"
                )}
                onClick={() => setLinkedTo('checkin')}
              >
                <CardContent className="p-4 text-center">
                  <LogIn className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium text-sm">Check-in</p>
                  <p className="text-xs text-muted-foreground">Antes chegada do hóspede</p>
                </CardContent>
              </Card>
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  linkedTo === 'both' && "ring-2 ring-purple-500 border-purple-500"
                )}
                onClick={() => setLinkedTo('both')}
              >
                <CardContent className="p-4 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium text-sm">Ambos</p>
                  <p className="text-xs text-muted-foreground">2 limpezas por reserva</p>
                </CardContent>
              </Card>
            </div>
            
            {linkedTo === 'both' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                <strong>Atenção:</strong> Serão criadas DUAS tarefas de limpeza para cada reserva confirmada: 
                uma vinculada ao check-in (antes da chegada) e outra ao checkout (após saída).
              </div>
            )}
          </div>

          <Separator />

          {/* SLA e Vistoria */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Prazo para conclusão (SLA)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={slaHours}
                  onChange={e => setSlaHours(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">horas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo máximo após o evento para concluir a limpeza
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg h-fit">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Incluir Vistoria</p>
                  <p className="text-xs text-muted-foreground">Criar vistoria junto</p>
                </div>
              </div>
              <Switch
                checked={includeVistoria}
                onCheckedChange={setIncludeVistoria}
              />
            </div>
          </div>

          <Separator />

          {/* Seleção de Imóveis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Para quais imóveis?</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedPropertyIds.length === 0 
                    ? 'Nenhum selecionado (aplicará a todos)'
                    : `${selectedPropertyIds.length} imóvel(is) selecionado(s)`
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllProperties}>
                  Selecionar todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllProperties}>
                  Limpar seleção
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imóvel..."
                value={propertySearch}
                onChange={e => setPropertySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="h-48 border rounded-lg">
              {loadingProperties ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando imóveis...
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum imóvel encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProperties.map(property => (
                    <div
                      key={property.id}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedPropertyIds.includes(property.id) && "bg-primary/5"
                      )}
                      onClick={() => toggleProperty(property.id)}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        selectedPropertyIds.includes(property.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}>
                        {selectedPropertyIds.includes(property.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{property.name}</p>
                        {property.address && (
                          <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {selectedPropertyIds.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                💡 Sem seleção, o modelo será aplicado a <strong>todos os imóveis</strong>
              </p>
            )}
          </div>

          <Separator />

          {/* Subtarefas / Checklist */}
          <div className="space-y-4">
            <Label className="text-base">Checklist de Subtarefas</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {subtasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{task}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                    onClick={() => handleRemoveSubtask(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova subtarefa..."
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
              />
              <Button variant="outline" onClick={handleAddSubtask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {template ? 'Salvar Alterações' : 'Criar Modelo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface IndicatorCardProps {
  value: number;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  color: 'gray' | 'blue' | 'orange' | 'green' | 'purple';
  description?: string;
}

function IndicatorCard({ value, label, icon: Icon, active, onClick, color, description }: IndicatorCardProps) {
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
            {description && (
              <p className="text-xs opacity-75 mt-1">{description}</p>
            )}
          </div>
          <Icon className="h-8 w-8 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

interface CollapsibleSectionProps {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({ 
  number, 
  title, 
  description, 
  icon: Icon, 
  expanded, 
  onToggle, 
  badge,
  children 
}: CollapsibleSectionProps) {
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
                  {badge && (
                    <Badge variant="secondary" className="text-xs">{badge}</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
              </div>
              {expanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
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

interface PropertyRowProps {
  property: PropertyWithResponsibility;
  hasChanges: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function PropertyRow({ property, hasChanges, isSelected, onToggleSelect }: PropertyRowProps) {
  const isCompany = property.cleaning_responsibility === 'company';
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer",
        hasChanges && "bg-amber-50",
        isSelected && "bg-primary/5"
      )}
      onClick={onToggleSelect}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox de seleção */}
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
          isSelected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30 hover:border-primary/50"
        )}>
          {isSelected && <Check className="h-3 w-3" />}
        </div>
        
        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{property.name}</p>
          {property.address.full && (
            <p className="text-xs text-muted-foreground truncate">{property.address.full}</p>
          )}
        </div>
      </div>
      
      {/* Badge indicador (não clicável) */}
      <div onClick={e => e.stopPropagation()}>
        <Badge 
          variant={isCompany ? "default" : "outline"}
          className={cn(
            "text-xs pointer-events-none",
            isCompany 
              ? "bg-blue-600" 
              : "bg-orange-100 text-orange-700 border-orange-300"
          )}
        >
          {isCompany ? (
            <>
              <Building2 className="h-3 w-3 mr-1" />
              Empresa
            </>
          ) : (
            <>
              <User className="h-3 w-3 mr-1" />
              Proprietário
            </>
          )}
        </Badge>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: CleaningTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onEdit, onDuplicate, onToggleActive, onDelete }: TemplateCardProps) {
  // Info baseado no vínculo (checkout, checkin, ambos)
  const linkedInfo = {
    checkout: { icon: LogOut, label: 'Checkout', color: 'text-orange-600 bg-orange-100' },
    checkin: { icon: LogIn, label: 'Check-in', color: 'text-green-600 bg-green-100' },
    both: { icon: RefreshCw, label: 'Ambos', color: 'text-purple-600 bg-purple-100' },
  };

  const info = linkedInfo[template.linked_to] || linkedInfo.checkout;

  return (
    <Card className={cn(!template.is_active && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", info.color)}>
              <info.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{template.name}</h4>
                {!template.is_active && (
                  <Badge variant="secondary" className="text-xs">Inativo</Badge>
                )}
                {template.include_vistoria && (
                  <Badge variant="outline" className="text-xs">
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    + Vistoria
                  </Badge>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {template.linked_to === 'checkout' && 'Vinculado ao Checkout'}
                  {template.linked_to === 'checkin' && 'Vinculado ao Check-in'}
                  {template.linked_to === 'both' && 'Check-in + Checkout'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  SLA: {template.sla_hours}h
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {template.subtasks.length} subtarefas
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {template.property_ids.length === 0 ? 'Todos os imóveis' : `${template.property_ids.length} imóveis`}
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
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {template.is_active ? (
                  <><Pause className="h-4 w-4 mr-2" /> Desativar</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Ativar</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default CleaningVistoriaTab;
