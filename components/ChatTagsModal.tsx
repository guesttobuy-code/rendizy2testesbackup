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
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Palette,
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
import { Separator } from './ui/separator';

export interface ChatTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: Date;
  conversations_count: number;
}

interface ChatTagsModalProps {
  open: boolean;
  onClose: () => void;
  tags: ChatTag[];
  onSaveTag: (tag: ChatTag) => void;
  onDeleteTag: (id: string) => void;
}

const TAG_COLORS = [
  { name: 'Azul', value: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', hex: '#3B82F6' },
  { name: 'Verde', value: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', hex: '#10B981' },
  { name: 'Roxo', value: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', hex: '#8B5CF6' },
  { name: 'Rosa', value: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300', hex: '#EC4899' },
  { name: 'Laranja', value: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', hex: '#F97316' },
  { name: 'Amarelo', value: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300', hex: '#EAB308' },
  { name: 'Vermelho', value: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', hex: '#EF4444' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', hex: '#6366F1' },
  { name: 'Teal', value: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300', hex: '#14B8A6' },
  { name: 'Cinza', value: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', hex: '#6B7280' },
];

export function ChatTagsModal({
  open,
  onClose,
  tags,
  onSaveTag,
  onDeleteTag,
}: ChatTagsModalProps) {
  const [editingTag, setEditingTag] = useState<ChatTag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState(TAG_COLORS[0].value);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTag(null);
    resetForm();
  };

  const handleStartEdit = (tag: ChatTag) => {
    setEditingTag(tag);
    setIsCreating(false);
    setFormName(tag.name);
    setFormDescription(tag.description || '');
    setFormColor(tag.color);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor(TAG_COLORS[0].value);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Nome obrigatório', {
        description: 'Digite um nome para a tag',
      });
      return;
    }

    const tag: ChatTag = {
      id: editingTag?.id || `tag-${Date.now()}`,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      color: formColor,
      created_at: editingTag?.created_at || new Date(),
      conversations_count: editingTag?.conversations_count || 0,
    };

    onSaveTag(tag);
    toast.success(editingTag ? 'Tag atualizada!' : 'Tag criada!', {
      description: editingTag
        ? 'As alterações foram salvas'
        : 'A tag está disponível para uso',
    });
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const tag = tags.find(t => t.id === id);
    if (tag && tag.conversations_count > 0) {
      toast.warning('Tag em uso', {
        description: `Esta tag está associada a ${tag.conversations_count} conversa(s). Tem certeza que deseja excluí-la?`,
      });
    }
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTag(deleteConfirmId);
      toast.success('Tag excluída!', {
        description: 'A tag foi removida com sucesso',
      });
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Gerenciar Tags de Conversas
            </DialogTitle>
            <DialogDescription>
              Crie e organize tags para categorizar suas conversas no chat
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isCreating || editingTag ? (
              // FORM: Criar/Editar Tag
              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-gray-900 dark:text-white">
                    {editingTag ? 'Editar Tag' : 'Nova Tag'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <Label htmlFor="tag-name">Nome da Tag *</Label>
                    <Input
                      id="tag-name"
                      placeholder="Ex: VIP, Urgente, Follow-up..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      maxLength={20}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formName.length}/20 caracteres
                    </p>
                  </div>

                  {/* Descrição */}
                  <div>
                    <Label htmlFor="tag-description">Descrição (opcional)</Label>
                    <Input
                      id="tag-description"
                      placeholder="Ex: Clientes VIP que merecem atenção especial"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formDescription.length}/50 caracteres
                    </p>
                  </div>

                  <Separator />

                  {/* Cor */}
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Palette className="h-4 w-4" />
                      Cor da Tag
                    </Label>
                    <div className="grid grid-cols-5 gap-2">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormColor(color.value)}
                          className={`
                            p-3 rounded-lg border-2 transition-all
                            ${color.value}
                            ${
                              formColor === color.value
                                ? 'ring-2 ring-offset-2 ring-blue-500 scale-105'
                                : 'hover:scale-105'
                            }
                          `}
                          title={color.name}
                        >
                          <div className="h-6 flex items-center justify-center">
                            {formColor === color.value && (
                              <Tag className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <Label className="mb-2 block">Preview</Label>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <Badge className={formColor}>
                        <Tag className="h-3 w-3 mr-1" />
                        {formName || 'Nome da Tag'}
                      </Badge>
                      {formDescription && (
                        <p className="text-xs text-gray-500 mt-2">{formDescription}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="mt-6 flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTag ? 'Salvar Alterações' : 'Criar Tag'}
                  </Button>
                </div>
              </div>
            ) : (
              // LIST: Listagem de Tags
              <>
                {/* Header */}
                <div className="p-6 pb-4">
                  <Button onClick={handleStartCreate} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tag
                  </Button>
                </div>

                {/* Lista de Tags */}
                <ScrollArea className="flex-1 px-6">
                  {tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                      <Tag className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-center">Nenhuma tag criada ainda</p>
                      <Button variant="link" onClick={handleStartCreate} className="mt-2">
                        Criar primeira tag
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-6">
                      {tags.map((tag) => (
                        <div
                          key={tag.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={tag.color}>
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag.name}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {tag.conversations_count}{' '}
                                  {tag.conversations_count === 1 ? 'conversa' : 'conversas'}
                                </span>
                              </div>
                              {tag.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {tag.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Criada em {tag.created_at.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(tag)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(tag.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{tags.length} {tags.length === 1 ? 'tag criada' : 'tags criadas'}</span>
                    <span>
                      {tags.reduce((sum, tag) => sum + tag.conversations_count, 0)} conversas tagueadas
                    </span>
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
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tag será removida de todas as conversas.
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
