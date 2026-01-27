/**
 * RENDIZY - Notification Templates Page
 * 
 * Página de gerenciamento de templates de notificação
 * Permite criar, editar, duplicar e deletar templates multi-canal
 * 
 * @version 1.0.0
 * @date 2026-01-27
 * @author GitHub Copilot
 * 
 * ============================================================================
 * REFERÊNCIA RÁPIDA
 * ============================================================================
 * 
 * ROTA: /notificacoes/templates
 * MENU: Notificações > Templates (MainSidebar.tsx)
 * API: utils/api-notification-templates.ts
 * BACKEND: routes-notification-templates.ts
 * EDITOR: NotificationTemplateEditor.tsx
 * 
 * DEPENDÊNCIAS:
 * - Tabela: notification_templates (migration 2026012705)
 * - Tabela: notification_trigger_types (triggers pré-configurados)
 * 
 * DOCS:
 * - docs/ARQUITETURA_NOTIFICACOES.md
 * - docs/REFERENCIA_NOTIFICACOES.md
 * - docs/CHANGELOG_2026-01-27.md
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Power,
  PowerOff,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Loader2,
  FileText,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  listTemplates,
  deleteTemplate,
  toggleTemplateStatus,
  duplicateTemplate,
  listTriggerTypes,
  NotificationTemplate,
  TriggerType,
  NotificationChannel,
  TRIGGER_CATEGORIES,
} from '../utils/api-notification-templates';
import NotificationTemplateEditor from './NotificationTemplateEditor';

// ============================================================================
// TIPOS
// ============================================================================

interface TemplateCardProps {
  template: NotificationTemplate;
  triggers: TriggerType[];
  onEdit: (template: NotificationTemplate) => void;
  onDuplicate: (template: NotificationTemplate) => void;
  onDelete: (template: NotificationTemplate) => void;
  onToggleStatus: (template: NotificationTemplate) => void;
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const ChannelBadge = ({ channel }: { channel: NotificationChannel }) => {
  const config: Record<NotificationChannel, { icon: React.ReactNode; label: string; className: string }> = {
    email: { 
      icon: <Mail className="w-3 h-3" />, 
      label: 'Email',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
    sms: { 
      icon: <Smartphone className="w-3 h-3" />, 
      label: 'SMS',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    whatsapp: { 
      icon: <MessageSquare className="w-3 h-3" />, 
      label: 'WhatsApp',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    in_app: { 
      icon: <Bell className="w-3 h-3" />, 
      label: 'In-App',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    },
  };

  const { icon, label, className } = config[channel];

  return (
    <Badge variant="secondary" className={`gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  );
};

const TemplateCard = ({ 
  template, 
  triggers,
  onEdit, 
  onDuplicate, 
  onDelete, 
  onToggleStatus 
}: TemplateCardProps) => {
  const trigger = triggers.find(t => t.id === template.trigger_event);
  const categoryLabel = trigger ? TRIGGER_CATEGORIES[trigger.category] : '⚙️ Outro';

  return (
    <Card className={`transition-all hover:shadow-md ${!template.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base font-semibold">
                {template.name}
              </CardTitle>
              {template.is_system && (
                <Badge variant="outline" className="text-xs">Sistema</Badge>
              )}
            </div>
            <CardDescription className="text-sm">
              {template.description || 'Sem descrição'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={template.is_active ? 'default' : 'secondary'}
              className={template.is_active ? 'bg-green-600' : ''}
            >
              {template.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(template)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleStatus(template)}>
                  {template.is_active ? (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Ativar
                    </>
                  )}
                </DropdownMenuItem>
                {!template.is_system && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(template)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="gap-1">
            <Zap className="w-3 h-3" />
            {trigger?.name || template.trigger_event}
          </Badge>
          <span className="text-xs text-muted-foreground">{categoryLabel}</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {template.channels.map(channel => (
            <ChannelBadge key={channel} channel={channel} />
          ))}
        </div>
        
        {template.internal_code && (
          <p className="text-xs text-muted-foreground mt-2">
            Código: <code className="bg-muted px-1 rounded">{template.internal_code}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function NotificationTemplatesPage() {
  // Estados
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [triggers, setTriggers] = useState<TriggerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Estados do editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  
  // Estados de diálogos
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<NotificationTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [templatesRes, triggersRes] = await Promise.all([
        listTemplates(),
        listTriggerTypes(),
      ]);
      setTemplates(templatesRes.templates);
      setTriggers(triggersRes);
    } catch (err: any) {
      console.error('Erro ao carregar templates:', err);
      toast.error('Erro ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    // Busca por texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = template.name.toLowerCase().includes(query);
      const matchesDescription = template.description?.toLowerCase().includes(query);
      const matchesCode = template.internal_code?.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription && !matchesCode) return false;
    }
    
    // Filtro por trigger
    if (filterTrigger !== 'all' && template.trigger_event !== filterTrigger) return false;
    
    // Filtro por canal
    if (filterChannel !== 'all' && !template.channels.includes(filterChannel as NotificationChannel)) return false;
    
    // Filtro por status
    if (filterStatus === 'active' && !template.is_active) return false;
    if (filterStatus === 'inactive' && template.is_active) return false;
    
    return true;
  });

  // Handlers
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDuplicate = (template: NotificationTemplate) => {
    setTemplateToDuplicate(template);
    setDuplicateName(`${template.name} (Cópia)`);
    setDuplicateDialogOpen(true);
  };

  const confirmDuplicate = async () => {
    if (!templateToDuplicate || !duplicateName.trim()) return;
    
    setIsDuplicating(true);
    try {
      await duplicateTemplate(templateToDuplicate.id, duplicateName.trim());
      toast.success('Template duplicado com sucesso!');
      setDuplicateDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao duplicar template');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = (template: NotificationTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteTemplate(templateToDelete.id);
      toast.success('Template excluído com sucesso!');
      setDeleteDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir template');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (template: NotificationTemplate) => {
    try {
      await toggleTemplateStatus(template.id, !template.is_active);
      toast.success(template.is_active ? 'Template desativado' : 'Template ativado');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status');
    }
  };

  const handleEditorClose = (saved: boolean) => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
    if (saved) {
      loadData();
    }
  };

  // Agrupar triggers por categoria
  const triggersByCategory = triggers.reduce((acc, trigger) => {
    if (!acc[trigger.category]) {
      acc[trigger.category] = [];
    }
    acc[trigger.category].push(trigger);
    return acc;
  }, {} as Record<string, TriggerType[]>);

  // Render
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Templates de Notificação
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie templates para email, SMS e WhatsApp
          </p>
        </div>
        
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filterTrigger} onValueChange={setFilterTrigger}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os triggers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os triggers</SelectItem>
                {Object.entries(triggersByCategory).map(([category, categoryTriggers]) => (
                  <React.Fragment key={category}>
                    <SelectItem value={`__header_${category}`} disabled className="font-semibold">
                      {TRIGGER_CATEGORIES[category]}
                    </SelectItem>
                    {categoryTriggers.map(trigger => (
                      <SelectItem key={trigger.id} value={trigger.id} className="pl-6">
                        {trigger.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Todos os canais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="sms">📱 SMS</SelectItem>
                <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                <SelectItem value="in_app">🔔 In-App</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {templates.length === 0 ? 'Nenhum template criado' : 'Nenhum template encontrado'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {templates.length === 0 
                ? 'Crie seu primeiro template de notificação para começar'
                : 'Tente ajustar os filtros ou buscar por outro termo'
              }
            </p>
            {templates.length === 0 && (
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeiro Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              triggers={triggers}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <NotificationTemplateEditor
        open={isEditorOpen}
        template={editingTemplate}
        triggers={triggers}
        onClose={handleEditorClose}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Template</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Template</DialogTitle>
            <DialogDescription>
              Digite um nome para a cópia do template.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicate-name">Nome do novo template</Label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Nome do template"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDuplicate} disabled={isDuplicating || !duplicateName.trim()}>
              {isDuplicating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export default para imports
export default NotificationTemplatesPage;
