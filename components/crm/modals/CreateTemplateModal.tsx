/**
 * CreateTemplateModal
 * 
 * Modal para criar um template a partir de uma tarefa ou projeto existente.
 * Permite definir nome, descrição, visibilidade (público/privado) e categoria.
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FolderKanban,
  Globe,
  Lock,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { useCreateTemplateFromTask, useCreateTemplateFromProject } from '@/hooks/crm/useCRMTemplates';

// ============================================================================
// TIPOS
// ============================================================================

export type TemplateSourceType = 'task' | 'project';

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: TemplateSourceType;
  sourceId: string;
  sourceName: string;
  onSuccess?: () => void;
}

// ============================================================================
// CATEGORIAS PRÉ-DEFINIDAS
// ============================================================================

const TEMPLATE_CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'operacoes', label: 'Operações' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'desenvolvimento', label: 'Desenvolvimento' },
  { value: 'suporte', label: 'Suporte ao Cliente' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'outros', label: 'Outros' },
];

// ============================================================================
// COMPONENTE
// ============================================================================

export function CreateTemplateModal({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  sourceName,
  onSuccess,
}: CreateTemplateModalProps) {
  // Estado do formulário
  const [name, setName] = useState(`Modelo: ${sourceName}`);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [category, setCategory] = useState<string>('geral');
  const [includeTasks, setIncludeTasks] = useState(true); // Só para projetos

  // Mutations
  const createFromTask = useCreateTemplateFromTask();
  const createFromProject = useCreateTemplateFromProject();

  const isPending = createFromTask.isPending || createFromProject.isPending;

  // Handler de submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      if (sourceType === 'task') {
        await createFromTask.mutateAsync({
          taskId: sourceId,
          name: name.trim(),
          isPublic,
          options: {
            description: description.trim() || undefined,
            category,
          },
        });
      } else {
        await createFromProject.mutateAsync({
          projectId: sourceId,
          name: name.trim(),
          isPublic,
          options: {
            description: description.trim() || undefined,
            category,
            includeTasks,
          },
        });
      }

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setName('');
      setDescription('');
      setIsPublic(false);
      setCategory('geral');
      setIncludeTasks(true);
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Criar Modelo
          </DialogTitle>
          <DialogDescription>
            Salve {sourceType === 'task' ? 'esta tarefa' : 'este projeto'} como um modelo reutilizável.
            {sourceType === 'task' 
              ? ' Subtarefas serão incluídas automaticamente.'
              : ' Você pode incluir ou não as tarefas do projeto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Fonte do template */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            {sourceType === 'task' ? (
              <CheckSquare className="h-5 w-5 text-blue-500" />
            ) : (
              <FolderKanban className="h-5 w-5 text-purple-500" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{sourceName}</p>
              <p className="text-xs text-muted-foreground">
                {sourceType === 'task' ? 'Tarefa' : 'Projeto'} de origem
              </p>
            </div>
          </div>

          {/* Nome do modelo */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do modelo *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Checklist de Lançamento de Produto"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Descrição (opcional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando usar este modelo..."
              rows={2}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Incluir tarefas (só para projetos) */}
          {sourceType === 'project' && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Incluir tarefas</p>
                  <p className="text-xs text-muted-foreground">
                    Copiar todas as tarefas do projeto para o modelo
                  </p>
                </div>
              </div>
              <Switch
                checked={includeTasks}
                onCheckedChange={setIncludeTasks}
              />
            </div>
          )}

          {/* Visibilidade */}
          <div className="space-y-3">
            <Label>Visibilidade</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Privado */}
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                  !isPublic 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Lock className={cn(
                  "h-6 w-6",
                  !isPublic ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <p className="text-sm font-medium">Privado</p>
                  <p className="text-xs text-muted-foreground">Só você pode usar</p>
                </div>
                {!isPublic && (
                  <Badge variant="outline" className="text-[10px]">Selecionado</Badge>
                )}
              </button>

              {/* Público */}
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all",
                  isPublic 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Globe className={cn(
                  "h-6 w-6",
                  isPublic ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <p className="text-sm font-medium">Público</p>
                  <p className="text-xs text-muted-foreground">Toda a equipe pode usar</p>
                </div>
                {isPublic && (
                  <Badge variant="outline" className="text-[10px]">Selecionado</Badge>
                )}
              </button>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Criando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Modelo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateTemplateModal;
