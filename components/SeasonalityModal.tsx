import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Sparkles,
  Sun,
  Waves,
  PartyPopper,
  Snowflake,
  TrendingUp,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface SeasonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyName?: string;
}

interface SeasonPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'high' | 'peak' | 'low';
  priceMultiplier: number;
  minNights?: number;
  icon: 'sun' | 'waves' | 'party' | 'snowflake' | 'sparkles';
  color: string;
}

const iconMap = {
  sun: Sun,
  waves: Waves,
  party: PartyPopper,
  snowflake: Snowflake,
  sparkles: Sparkles
};

const typeColors: Record<string, string> = {
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  peak: 'bg-purple-100 text-purple-700 border-purple-200',
  low: 'bg-green-100 text-green-700 border-green-200'
};

const typeLabels: Record<string, string> = {
  high: 'Alta Temporada',
  peak: 'Pico',
  low: 'Baixa Temporada'
};

export function SeasonalityModal({
  isOpen,
  onClose,
  propertyId,
  propertyName
}: SeasonalityModalProps) {
  const [periods, setPeriods] = useState<SeasonPeriod[]>([
    {
      id: '1',
      name: 'Verão 2025',
      startDate: '2025-12-21',
      endDate: '2026-03-20',
      type: 'high',
      priceMultiplier: 1.3,
      minNights: 2,
      icon: 'sun',
      color: 'orange'
    },
    {
      id: '2',
      name: 'Reveillon 2025/2026',
      startDate: '2025-12-28',
      endDate: '2026-01-05',
      type: 'peak',
      priceMultiplier: 2.0,
      minNights: 5,
      icon: 'party',
      color: 'purple'
    },
    {
      id: '3',
      name: 'Carnaval 2026',
      startDate: '2026-02-14',
      endDate: '2026-02-18',
      type: 'peak',
      priceMultiplier: 1.8,
      minNights: 4,
      icon: 'party',
      color: 'purple'
    }
  ]);

  const [newPeriod, setNewPeriod] = useState<Partial<SeasonPeriod>>({
    name: '',
    startDate: '',
    endDate: '',
    type: 'high',
    priceMultiplier: 1.3,
    minNights: 2,
    icon: 'sparkles',
    color: 'orange'
  });

  const [showNewForm, setShowNewForm] = useState(false);

  const handleAddPeriod = () => {
    if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const period: SeasonPeriod = {
      id: Date.now().toString(),
      name: newPeriod.name!,
      startDate: newPeriod.startDate!,
      endDate: newPeriod.endDate!,
      type: newPeriod.type as any,
      priceMultiplier: newPeriod.priceMultiplier || 1.3,
      minNights: newPeriod.minNights,
      icon: newPeriod.icon as any,
      color: newPeriod.color || 'orange'
    };

    setPeriods([...periods, period]);
    setNewPeriod({
      name: '',
      startDate: '',
      endDate: '',
      type: 'high',
      priceMultiplier: 1.3,
      minNights: 2,
      icon: 'sparkles',
      color: 'orange'
    });
    setShowNewForm(false);
    
    toast.success('Período sazonal adicionado!');
  };

  const handleDeletePeriod = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
    toast.success('Período removido');
  };

  const handleSave = () => {
    console.log('Sazonalidade configurada:', {
      propertyId,
      periods
    });

    toast.success('Sazonalidade configurada!', {
      description: `${periods.length} período(s) sazonal(is) ativo(s)`
    });

    onClose();
  };

  // Templates pré-definidos
  const templates = [
    {
      name: 'Brasil - Verão',
      period: {
        name: 'Verão',
        startDate: '2025-12-21',
        endDate: '2026-03-20',
        type: 'high' as const,
        priceMultiplier: 1.3,
        minNights: 2,
        icon: 'sun' as const,
        color: 'orange'
      }
    },
    {
      name: 'Reveillon',
      period: {
        name: 'Reveillon',
        startDate: '2025-12-28',
        endDate: '2026-01-05',
        type: 'peak' as const,
        priceMultiplier: 2.0,
        minNights: 5,
        icon: 'party' as const,
        color: 'purple'
      }
    },
    {
      name: 'Carnaval',
      period: {
        name: 'Carnaval',
        startDate: '2026-02-14',
        endDate: '2026-02-18',
        type: 'peak' as const,
        priceMultiplier: 1.8,
        minNights: 4,
        icon: 'party' as const,
        color: 'purple'
      }
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Configurar Sazonalidade
          </DialogTitle>
          <DialogDescription>
            {propertyName || 'Defina períodos especiais com regras de preço e permanência mínima'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-purple-900">
                <p className="font-medium">Períodos Sazonais Configuráveis</p>
                <p className="text-purple-800">
                  Defina períodos especiais com regras de preço e permanência mínima (Reveillon, Carnaval, Verão, etc).
                  Os períodos sazonais sobrescrevem as configurações normais de preço.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Templates */}
          <div>
            <Label className="mb-3 block">Templates Rápidos</Label>
            <div className="grid grid-cols-3 gap-3">
              {templates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewPeriod({ ...template.period })}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="font-medium text-sm text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    +{((template.period.priceMultiplier - 1) * 100).toFixed(0)}% • {template.period.minNights || 0} noites
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Current Periods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Períodos Configurados ({periods.length})</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewForm(!showNewForm)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Período
              </Button>
            </div>

            <div className="space-y-3">
              {periods.map((period) => {
                const Icon = iconMap[period.icon];
                const startDate = new Date(period.startDate);
                const endDate = new Date(period.endDate);
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                return (
                  <div key={period.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[period.type]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{period.name}</span>
                          <Badge className={typeColors[period.type]}>
                            {typeLabels[period.type]}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <CalendarIcon className="w-3 h-3 inline mr-1" />
                            {startDate.toLocaleDateString('pt-BR')} → {endDate.toLocaleDateString('pt-BR')}
                            <span className="text-gray-500 ml-1">({days} dias)</span>
                          </div>
                          <div>
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            +{((period.priceMultiplier - 1) * 100).toFixed(0)}%
                            {period.minNights && ` • Mín ${period.minNights} noites`}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePeriod(period.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {periods.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhum período sazonal configurado</p>
                  <p className="text-sm mt-1">Clique em "Novo Período" para adicionar</p>
                </div>
              )}
            </div>
          </div>

          {/* New Period Form */}
          {showNewForm && (
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-blue-900 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo Período Sazonal
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome do Período *</Label>
                  <Input
                    id="name"
                    value={newPeriod.name || ''}
                    onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                    placeholder="Ex: Carnaval 2026"
                  />
                </div>

                <div>
                  <Label htmlFor="startDate">Data Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newPeriod.startDate || ''}
                    onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Data Fim *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newPeriod.endDate || ''}
                    onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Período</Label>
                  <Select
                    value={newPeriod.type}
                    onValueChange={(v) => setNewPeriod({ ...newPeriod, type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa Temporada</SelectItem>
                      <SelectItem value="high">Alta Temporada</SelectItem>
                      <SelectItem value="peak">Pico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="icon">Ícone</Label>
                  <Select
                    value={newPeriod.icon}
                    onValueChange={(v) => setNewPeriod({ ...newPeriod, icon: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sun">☀️ Sol (Verão)</SelectItem>
                      <SelectItem value="waves">🌊 Ondas (Praia)</SelectItem>
                      <SelectItem value="party">🎉 Festa (Eventos)</SelectItem>
                      <SelectItem value="snowflake">❄️ Neve (Inverno)</SelectItem>
                      <SelectItem value="sparkles">✨ Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="multiplier">Multiplicador de Preço</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="multiplier"
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="5"
                      value={newPeriod.priceMultiplier || 1.3}
                      onChange={(e) => setNewPeriod({ ...newPeriod, priceMultiplier: parseFloat(e.target.value) })}
                    />
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      +{(((newPeriod.priceMultiplier || 1.3) - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="minNights">Mínimo de Noites (opcional)</Label>
                  <Input
                    id="minNights"
                    type="number"
                    min="1"
                    max="30"
                    value={newPeriod.minNights || ''}
                    onChange={(e) => setNewPeriod({ ...newPeriod, minNights: parseInt(e.target.value) || undefined })}
                    placeholder="Ex: 3"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleAddPeriod}>
                  Adicionar Período
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
