import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  Globe,
  Calendar,
  Home,
  DollarSign,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';

export interface MessageTemplate {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  content: string;
  content_en?: string;
  content_es?: string;
  category: TemplateCategory;
  created_at: Date;
  updated_at: Date;
}

export type TemplateCategory =
  | 'pre_checkin'
  | 'post_checkout'
  | 'during_stay'
  | 'payment'
  | 'general'
  | 'urgent';

interface TemplateManagerModalProps {
  open: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  onSaveTemplate: (template: MessageTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

const TEMPLATE_CATEGORIES: {
  value: TemplateCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    value: 'pre_checkin',
    label: 'Pré Check-in',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    value: 'post_checkout',
    label: 'Pós Check-out',
    icon: Home,
    color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  {
    value: 'during_stay',
    label: 'Durante a Estadia',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    value: 'payment',
    label: 'Pagamento',
    icon: DollarSign,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
  {
    value: 'urgent',
    label: 'Urgente',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  {
    value: 'general',
    label: 'Geral',
    icon: FileText,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
];

export function TemplateManagerModal({
  open,
  onClose,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
}: TemplateManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameEs, setFormNameEs] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formContentEn, setFormContentEn] = useState('');
  const [formContentEs, setFormContentEs] = useState('');
  const [formCategory, setFormCategory] = useState<TemplateCategory>('general');
  const [currentLanguageTab, setCurrentLanguageTab] = useState<'pt' | 'en' | 'es'>('pt');

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    resetForm();
  };

  const handleStartEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormName(template.name);
    setFormNameEn(template.name_en || '');
    setFormNameEs(template.name_es || '');
    setFormContent(template.content);
    setFormContentEn(template.content_en || '');
    setFormContentEs(template.content_es || '');
    setFormCategory(template.category);
  };

  const resetForm = () => {
    setFormName('');
    setFormNameEn('');
    setFormNameEs('');
    setFormContent('');
    setFormContentEn('');
    setFormContentEs('');
    setFormCategory('general');
    setCurrentLanguageTab('pt');
  };

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) {
      toast.error('Preencha os campos obrigatórios', {
        description: 'Nome e conteúdo em português são obrigatórios',
      });
      return;
    }

    const template: MessageTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: formName,
      name_en: formNameEn || undefined,
      name_es: formNameEs || undefined,
      content: formContent,
      content_en: formContentEn || undefined,
      content_es: formContentEs || undefined,
      category: formCategory,
      created_at: editingTemplate?.created_at || new Date(),
      updated_at: new Date(),
    };

    onSaveTemplate(template);
    toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!', {
      description: editingTemplate
        ? 'As alterações foram salvas com sucesso'
        : 'O template está disponível para uso',
    });
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTemplate(deleteConfirmId);
      toast.success('Template excluído!', {
        description: 'O template foi removido com sucesso',
      });
      setDeleteConfirmId(null);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (category: TemplateCategory) => {
    return TEMPLATE_CATEGORIES.find((c) => c.value === category);
  };

  const templatesByCategory = TEMPLATE_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.value] = filteredTemplates.filter((t) => t.category === category.value);
      return acc;
    },
    {} as Record<TemplateCategory, MessageTemplate[]>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerenciar Templates de Mensagens
            </DialogTitle>
            <DialogDescription>
              Crie, edite e organize templates reutilizáveis para agilizar o atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isCreating || editingTemplate ? (
              // FORM: Criar/Editar Template
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-gray-900 dark:text-white">
                    {editingTemplate ? 'Editar Template' : 'Novo Template'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Categoria */}
                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formCategory} onValueChange={(v) => setFormCategory(v as TemplateCategory)}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((category) => {
                          const Icon = category.icon;
                          return (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {category.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Tabs de Idioma */}
                  <Tabs value={currentLanguageTab} onValueChange={(v) => setCurrentLanguageTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pt" className="flex items-center gap-2">
                        🇧🇷 Português *
                      </TabsTrigger>
                      <TabsTrigger value="en" className="flex items-center gap-2">
                        🇺🇸 English
                      </TabsTrigger>
                      <TabsTrigger value="es" className="flex items-center gap-2">
                        🇪🇸 Español
                      </TabsTrigger>
                    </TabsList>

                    {/* Português */}
                    <TabsContent value="pt" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name-pt">Nome do Template *</Label>
                        <Input
                          id="name-pt"
                          placeholder="Ex: Confirmação de Reserva"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="content-pt">Conteúdo da Mensagem *</Label>
                        <Textarea
                          id="content-pt"
                          placeholder="Digite o conteúdo do template..."
                          value={formContent}
                          onChange={(e) => setFormContent(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use variáveis: {'{guest_name}'}, {'{property_name}'}, {'{checkin_date}'}, {'{checkout_date}'}
                        </p>
                      </div>
                    </TabsContent>

                    {/* English */}
                    <TabsContent value="en" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name-en">Template Name</Label>
                        <Input
                          id="name-en"
                          placeholder="Ex: Booking Confirmation"
                          value={formNameEn}
                          onChange={(e) => setFormNameEn(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="content-en">Message Content</Label>
                        <Textarea
                          id="content-en"
                          placeholder="Enter template content..."
                          value={formContentEn}
                          onChange={(e) => setFormContentEn(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use variables: {'{guest_name}'}, {'{property_name}'}, {'{checkin_date}'}, {'{checkout_date}'}
                        </p>
                      </div>
                    </TabsContent>

                    {/* Español */}
                    <TabsContent value="es" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name-es">Nombre de la Plantilla</Label>
                        <Input
                          id="name-es"
                          placeholder="Ej: Confirmación de Reserva"
                          value={formNameEs}
                          onChange={(e) => setFormNameEs(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="content-es">Contenido del Mensaje</Label>
                        <Textarea
                          id="content-es"
                          placeholder="Ingrese el contenido de la plantilla..."
                          value={formContentEs}
                          onChange={(e) => setFormContentEs(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use variables: {'{guest_name}'}, {'{property_name}'}, {'{checkin_date}'}, {'{checkout_date}'}
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Ações */}
                <div className="mt-6 flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
                  </Button>
                </div>
              </div>
            ) : (
              // LIST: Listagem de Templates
              <>
                {/* Header com busca */}
                <div className="p-6 pb-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={handleStartCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Template
                    </Button>
                  </div>

                  {/* Filtros de Categoria */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory('all')}
                    >
                      Todos ({templates.length})
                    </Badge>
                    {TEMPLATE_CATEGORIES.map((category) => {
                      const count = templates.filter((t) => t.category === category.value).length;
                      const Icon = category.icon;
                      return (
                        <Badge
                          key={category.value}
                          variant={selectedCategory === category.value ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setSelectedCategory(category.value)}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {category.label} ({count})
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Templates */}
                <ScrollArea className="flex-1 px-6">
                  {filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-center">
                        {searchQuery
                          ? 'Nenhum template encontrado'
                          : 'Nenhum template criado ainda'}
                      </p>
                      <Button variant="link" onClick={handleStartCreate} className="mt-2">
                        Criar primeiro template
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-6">
                      {TEMPLATE_CATEGORIES.map((category) => {
                        const categoryTemplates = templatesByCategory[category.value];
                        if (categoryTemplates.length === 0) return null;

                        const Icon = category.icon;

                        return (
                          <div key={category.value}>
                            <div className="flex items-center gap-2 mb-3">
                              <Icon className="h-4 w-4 text-gray-500" />
                              <h4 className="text-sm text-gray-700 dark:text-gray-300">
                                {category.label}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {categoryTemplates.length}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {categoryTemplates.map((template) => {
                                const categoryInfo = getCategoryInfo(template.category);
                                return (
                                  <div
                                    key={template.id}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-gray-900 dark:text-white">
                                            {template.name}
                                          </span>
                                          {(template.name_en || template.name_es) && (
                                            <Globe className="h-3 w-3 text-gray-400" />
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                          {template.content}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {categoryInfo?.label}
                                          </Badge>
                                          <span className="text-xs text-gray-400">
                                            Atualizado em {template.updated_at.toLocaleDateString('pt-BR')}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleStartEdit(template)}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(template.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Footer com stats */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{filteredTemplates.length} templates encontrados</span>
                    <span>Total: {templates.length} templates</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
