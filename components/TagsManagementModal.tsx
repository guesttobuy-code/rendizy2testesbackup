import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Folder,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface TagsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  propertiesCount: number;
}

const TAG_COLORS = [
  { name: 'Azul', value: 'bg-blue-100 text-blue-700 border-blue-300' },
  { name: 'Verde', value: 'bg-green-100 text-green-700 border-green-300' },
  { name: 'Roxo', value: 'bg-purple-100 text-purple-700 border-purple-300' },
  { name: 'Rosa', value: 'bg-pink-100 text-pink-700 border-pink-300' },
  { name: 'Laranja', value: 'bg-orange-100 text-orange-700 border-orange-300' },
  { name: 'Amarelo', value: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { name: 'Vermelho', value: 'bg-red-100 text-red-700 border-red-300' },
  { name: 'Cinza', value: 'bg-gray-100 text-gray-700 border-gray-300' }
];

export function TagsManagementModal({ isOpen, onClose }: TagsManagementModalProps) {
  const [tags, setTags] = useState<TagItem[]>([
    { id: '1', name: 'Praia', color: TAG_COLORS[0].value, propertiesCount: 8 },
    { id: '2', name: 'Montanha', color: TAG_COLORS[1].value, propertiesCount: 5 },
    { id: '3', name: 'Cidade', color: TAG_COLORS[2].value, propertiesCount: 12 },
    { id: '4', name: 'Luxo', color: TAG_COLORS[3].value, propertiesCount: 3 }
  ]);

  const [folders, setFolders] = useState([
    { id: '1', name: 'Rio de Janeiro', propertiesCount: 15 },
    { id: '2', name: 'São Paulo', propertiesCount: 8 },
    { id: '3', name: 'Minas Gerais', propertiesCount: 6 }
  ]);

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].value);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;

    const newTag: TagItem = {
      id: Date.now().toString(),
      name: newTagName,
      color: newTagColor,
      propertiesCount: 0
    };

    setTags([...tags, newTag]);
    setNewTagName('');
    toast.success('Tag criada com sucesso!');
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
    toast.success('Tag removida');
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      propertiesCount: 0
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
    toast.success('Pasta criada com sucesso!');
  };

  const handleDeleteFolder = (id: string) => {
    setFolders(folders.filter(f => f.id !== id));
    toast.success('Pasta removida');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-500" />
            Gerenciar Tags e Pastas
          </DialogTitle>
          <DialogDescription>
            Organize suas propriedades criando tags e pastas personalizadas
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* TAGS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Tag className="w-4 h-4 text-gray-600" />
              <h3 className="text-gray-900">Tags</h3>
              <span className="text-sm text-gray-500">({tags.length})</span>
            </div>

            {/* Create Tag */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <Label className="text-sm">Nova Tag</Label>
              <Input
                placeholder="Nome da tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              
              <div>
                <Label className="text-sm mb-2 block">Cor</Label>
                <div className="grid grid-cols-4 gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewTagColor(color.value)}
                      className={`
                        h-10 rounded border-2 transition-all
                        ${color.value}
                        ${newTagColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                      `}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleCreateTag} 
                disabled={!newTagName.trim()}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Tag
              </Button>
            </div>

            {/* Tags List */}
            <div className="space-y-2">
              {tags.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhuma tag criada
                </div>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className={tag.color}>
                        <Tag className="w-3 h-3 mr-1" />
                        {tag.name}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {tag.propertiesCount} {tag.propertiesCount === 1 ? 'propriedade' : 'propriedades'}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.info('Função de edição em desenvolvimento')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FOLDERS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Folder className="w-4 h-4 text-gray-600" />
              <h3 className="text-gray-900">Pastas</h3>
              <span className="text-sm text-gray-500">({folders.length})</span>
            </div>

            {/* Create Folder */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <Label className="text-sm">Nova Pasta</Label>
              <Input
                placeholder="Nome da pasta..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              
              <Button 
                onClick={handleCreateFolder} 
                disabled={!newFolderName.trim()}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Pasta
              </Button>
            </div>

            {/* Folders List */}
            <div className="space-y-2">
              {folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhuma pasta criada
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Folder className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">{folder.name}</div>
                        <div className="text-xs text-gray-500">
                          {folder.propertiesCount} {folder.propertiesCount === 1 ? 'propriedade' : 'propriedades'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.info('Função de edição em desenvolvimento')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex gap-3">
            <Tag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">Como usar Tags e Pastas?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li><strong>Tags:</strong> Categorize propriedades por características (praia, luxo, etc)</li>
                <li><strong>Pastas:</strong> Organize propriedades por localização ou grupo</li>
                <li>Uma propriedade pode ter múltiplas tags mas apenas uma pasta</li>
                <li>Use os filtros na sidebar para visualizar apenas propriedades de uma tag/pasta</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
