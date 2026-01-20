/**
 * RENDIZY - Create Property Type Modal
 * 
 * Modal simplificado para escolher o tipo de propriedade
 * Os tipos são configuráveis em Configurações
 * 
 * @version 1.0.103
 * @date 2025-10-28
 */

import { useState, useEffect } from 'react';
import { Building2, Home, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { CreateIndividualPropertyModal } from './CreateIndividualPropertyModal';

interface CreatePropertyTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type PropertyCategory = 'multi-unit' | 'individual';

// TODO: Buscar do backend/configurações
const MULTI_UNIT_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'pousada', label: 'Pousada' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'resort', label: 'Resort' },
  { value: 'flat', label: 'Flat' },
  { value: 'apart-hotel', label: 'Apart-Hotel' },
];

const INDIVIDUAL_TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'quarto', label: 'Quarto' },
  { value: 'loft', label: 'Loft' },
  { value: 'studio', label: 'Studio' },
  { value: 'chale', label: 'Chalé' },
  { value: 'sitio', label: 'Sítio' },
  { value: 'fazenda', label: 'Fazenda' },
];

export const CreatePropertyTypeModal = ({
  open,
  onClose,
  onSuccess,
}: CreatePropertyTypeModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory>('individual');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showIndividualModal, setShowIndividualModal] = useState(false);

  const handleClose = () => {
    setSelectedCategory('individual');
    setSelectedType('');
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedType) return;

    if (selectedCategory === 'individual') {
      // Abrir modal de criação individual
      setShowIndividualModal(true);
    } else {
      // TODO: Abrir modal de criação de Location (Multi-unit)
      console.log('Criar Location:', {
        category: selectedCategory,
        type: selectedType,
      });
      handleClose();
    }
  };

  // Reset selectedType when category changes
  useEffect(() => {
    setSelectedType('');
  }, [selectedCategory]);

  const availableTypes = selectedCategory === 'multi-unit' 
    ? MULTI_UNIT_TYPES 
    : INDIVIDUAL_TYPES;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            Criar Anúncio de Imóvel
          </DialogTitle>
          <DialogDescription>
            Escolha a categoria e o tipo de imóvel que deseja cadastrar
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="space-y-6 py-4">
          {/* Categoria: Multi-Unit vs Individual */}
          <div className="space-y-3">
            <Label className="text-gray-700">
              Categoria do Imóvel
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Multi-Unit */}
              <button
                onClick={() => setSelectedCategory('multi-unit')}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    selectedCategory === 'multi-unit'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                      ${
                        selectedCategory === 'multi-unit'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 text-blue-600'
                      }
                    `}
                  >
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-1">
                      Local Multi-Unidades
                    </h3>
                    <p className="text-xs text-gray-500">
                      Para criar quartos, suítes ou chalés dentro de um local
                    </p>
                  </div>
                </div>
              </button>

              {/* Individual */}
              <button
                onClick={() => setSelectedCategory('individual')}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    selectedCategory === 'individual'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                      ${
                        selectedCategory === 'individual'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-600'
                      }
                    `}
                  >
                    <Home className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-1">
                      Anúncio Individual
                    </h3>
                    <p className="text-xs text-gray-500">
                      Para imóveis únicos como casas, apartamentos, etc.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Tipo do Imóvel */}
          <div className="space-y-3">
            <Label htmlFor="property-type" className="text-gray-700">
              Tipo do Imóvel
            </Label>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger 
                id="property-type"
                className={`
                  ${selectedCategory === 'multi-unit' 
                    ? 'border-blue-300 focus:ring-blue-500' 
                    : 'border-emerald-300 focus:ring-emerald-500'
                  }
                `}
              >
                <SelectValue placeholder="Selecione o tipo do imóvel" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-gray-500">
              💡 Você pode gerenciar os tipos disponíveis em{' '}
              <span className="text-blue-600 font-medium">Configurações → Tipos de Imóveis</span>
            </p>
          </div>

          {/* Preview da Seleção */}
          {selectedType && (
            <div 
              className={`
                p-4 rounded-lg border-2
                ${selectedCategory === 'multi-unit' 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-emerald-200 bg-emerald-50'
                }
              `}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Você está criando:</span>
                <span 
                  className={`
                    font-medium
                    ${selectedCategory === 'multi-unit' ? 'text-blue-700' : 'text-emerald-700'}
                  `}
                >
                  {selectedCategory === 'multi-unit' ? 'Local Multi-Unidades' : 'Anúncio Individual'}
                </span>
                <span className="text-gray-600">→</span>
                <span 
                  className={`
                    font-medium
                    ${selectedCategory === 'multi-unit' ? 'text-blue-700' : 'text-emerald-700'}
                  `}
                >
                  {availableTypes.find(t => t.value === selectedType)?.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!selectedType}
            className={`
              ${
                selectedCategory === 'multi-unit'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }
              text-white
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Continuar
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Criação Individual */}
    <CreateIndividualPropertyModal
      open={showIndividualModal}
      onClose={() => {
        setShowIndividualModal(false);
        handleClose();
      }}
      onSuccess={() => {
        setShowIndividualModal(false);
        handleClose();
        onSuccess?.();
      }}
    />
    </>
  );
};
