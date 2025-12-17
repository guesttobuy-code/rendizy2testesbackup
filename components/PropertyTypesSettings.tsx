/**
 * RENDIZY - Property Types Settings
 * 
 * Configuração de tipos de propriedades customizáveis
 * Permite adicionar, editar e remover tipos de imóveis
 * 
 * @version 1.0.103
 * @date 2025-10-28
 */

import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
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
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface PropertyType {
  id: string;
  value: string;
  label: string;
  category: 'multi-unit' | 'individual';
  isDefault?: boolean;
}

export const PropertyTypesSettings = () => {
  // TODO: Buscar do backend
  const [multiUnitTypes, setMultiUnitTypes] = useState<PropertyType[]>([
    { id: '1', value: 'hotel', label: 'Hotel', category: 'multi-unit', isDefault: true },
    { id: '2', value: 'pousada', label: 'Pousada', category: 'multi-unit', isDefault: true },
    { id: '3', value: 'hostel', label: 'Hostel', category: 'multi-unit', isDefault: true },
    { id: '4', value: 'resort', label: 'Resort', category: 'multi-unit' },
    { id: '5', value: 'flat', label: 'Flat', category: 'multi-unit' },
  ]);

  const [individualTypes, setIndividualTypes] = useState<PropertyType[]>([
    { id: '6', value: 'casa', label: 'Casa', category: 'individual', isDefault: true },
    { id: '7', value: 'apartamento', label: 'Apartamento', category: 'individual', isDefault: true },
    { id: '8', value: 'quarto', label: 'Quarto', category: 'individual', isDefault: true },
    { id: '9', value: 'loft', label: 'Loft', category: 'individual' },
    { id: '10', value: 'studio', label: 'Studio', category: 'individual' },
  ]);

  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [addingCategory, setAddingCategory] = useState<'multi-unit' | 'individual' | null>(null);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [deletingType, setDeletingType] = useState<PropertyType | null>(null);

  const handleAddType = () => {
    if (!newTypeLabel.trim() || !addingCategory) return;

    const newType: PropertyType = {
      id: Date.now().toString(),
      value: newTypeLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
      label: newTypeLabel.trim(),
      category: addingCategory,
    };

    if (addingCategory === 'multi-unit') {
      setMultiUnitTypes([...multiUnitTypes, newType]);
    } else {
      setIndividualTypes([...individualTypes, newType]);
    }

    setNewTypeLabel('');
    setAddingCategory(null);
    toast.success(`Tipo "${newType.label}" adicionado com sucesso!`);
  };

  const handleDeleteType = () => {
    if (!deletingType) return;

    if (deletingType.category === 'multi-unit') {
      setMultiUnitTypes(multiUnitTypes.filter(t => t.id !== deletingType.id));
    } else {
      setIndividualTypes(individualTypes.filter(t => t.id !== deletingType.id));
    }

    toast.success(`Tipo "${deletingType.label}" removido com sucesso!`);
    setDeletingType(null);
  };

  const TypeCard = ({ type, category }: { type: PropertyType; category: 'multi-unit' | 'individual' }) => (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div 
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${category === 'multi-unit' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}
          `}
        >
          {category === 'multi-unit' ? <Building2 className="w-5 h-5" /> : <Home className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-gray-900">{type.label}</span>
            {type.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Padrão
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">{type.value}</span>
        </div>
      </div>

      {!type.isDefault && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-600"
            onClick={() => setDeletingType(type)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-gray-900 mb-2">
          Tipos de Imóveis
        </h2>
        <p className="text-gray-600">
          Configure os tipos de imóveis disponíveis para criar anúncios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Unit Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Locais Multi-Unidades</CardTitle>
                <CardDescription>
                  Tipos de locais com múltiplas acomodações
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de tipos */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {multiUnitTypes.map((type) => (
                <TypeCard key={type.id} type={type} category="multi-unit" />
              ))}
            </div>

            {/* Adicionar novo tipo */}
            {addingCategory === 'multi-unit' ? (
              <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label htmlFor="new-multi-type">Novo tipo</Label>
                <Input
                  id="new-multi-type"
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  placeholder="Ex: Apart-Hotel, Motel..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddType();
                    if (e.key === 'Escape') {
                      setAddingCategory(null);
                      setNewTypeLabel('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddType}
                    disabled={!newTypeLabel.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingCategory(null);
                      setNewTypeLabel('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingCategory('multi-unit')}
                className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar tipo
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Individual Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Home className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Anúncios Individuais</CardTitle>
                <CardDescription>
                  Tipos de imóveis únicos para locação/venda
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de tipos */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {individualTypes.map((type) => (
                <TypeCard key={type.id} type={type} category="individual" />
              ))}
            </div>

            {/* Adicionar novo tipo */}
            {addingCategory === 'individual' ? (
              <div className="space-y-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Label htmlFor="new-individual-type">Novo tipo</Label>
                <Input
                  id="new-individual-type"
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  placeholder="Ex: Sítio, Fazenda, Chalé..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddType();
                    if (e.key === 'Escape') {
                      setAddingCategory(null);
                      setNewTypeLabel('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddType}
                    disabled={!newTypeLabel.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingCategory(null);
                      setNewTypeLabel('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingCategory('individual')}
                className="w-full border-emerald-300 text-emerald-600 hover:bg-emerald-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar tipo
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <div className="text-blue-600">ℹ️</div>
          <div className="flex-1">
            <h4 className="text-blue-900 mb-1">
              Sobre os tipos de imóveis
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Tipos padrão</strong> não podem ser removidos (Hotel, Casa, Apartamento, etc.)</li>
              <li>• <strong>Tipos customizados</strong> podem ser adicionados e removidos conforme necessário</li>
              <li>• Os tipos aparecem no modal de criação de anúncios</li>
              <li>• Remover um tipo não afeta imóveis já cadastrados</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tipo de imóvel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o tipo "{deletingType?.label}"?
              <br />
              <br />
              Esta ação não afetará imóveis já cadastrados com este tipo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteType}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
