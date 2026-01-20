import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, TrendingDown, TrendingUp, Zap, Crown, Info } from 'lucide-react';
import { toast } from 'sonner';

interface PriceTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyName?: string;
  startDate: Date;
  endDate: Date;
}

export type PriceTier = 'low' | 'medium' | 'high' | 'peak';

interface TierConfig {
  basePrice: number;
  percentage: number; // Percentual sobre o preço base
}

const tierColors: Record<PriceTier, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  peak: 'bg-purple-100 text-purple-700 border-purple-300'
};

const tierIcons: Record<PriceTier, any> = {
  low: TrendingDown,
  medium: TrendingUp,
  high: Zap,
  peak: Crown
};

const tierLabels: Record<PriceTier, string> = {
  low: 'Baixa Temporada',
  medium: 'Média Temporada',
  high: 'Alta Temporada',
  peak: 'Pico / Eventos'
};

export function PriceTiersModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  startDate,
  endDate
}: PriceTiersModalProps) {
  const [selectedTier, setSelectedTier] = useState<PriceTier>('medium');
  const [mode, setMode] = useState<'percentage' | 'fixed'>('percentage');
  
  // Preços base por tier (percentual sobre preço padrão)
  const [tiers, setTiers] = useState<Record<PriceTier, TierConfig>>({
    low: { basePrice: 250, percentage: -20 },
    medium: { basePrice: 350, percentage: 0 },
    high: { basePrice: 450, percentage: 30 },
    peak: { basePrice: 600, percentage: 70 }
  });

  const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const handleSave = () => {
    console.log('Tier de preço aplicado:', {
      propertyId,
      tier: selectedTier,
      mode,
      config: tiers[selectedTier],
      startDate,
      endDate,
      nights
    });

    toast.success('Tier de preço aplicado!', {
      description: `${tierLabels[selectedTier]} configurado para ${nights} dia(s)`
    });

    onClose();
  };

  const updateTierPrice = (tier: PriceTier, price: number) => {
    setTiers(prev => ({
      ...prev,
      [tier]: { ...prev[tier], basePrice: price }
    }));
  };

  const updateTierPercentage = (tier: PriceTier, percentage: number) => {
    setTiers(prev => ({
      ...prev,
      [tier]: { ...prev[tier], percentage }
    }));
  };

  const TierIcon = tierIcons[selectedTier];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Configurar Tiers de Preço
          </DialogTitle>
          <DialogDescription>
            {propertyName && (
              <>
                {propertyName} • {startDate.toLocaleDateString('pt-BR')} → {endDate.toLocaleDateString('pt-BR')}
                <span className="text-gray-500 ml-2">({nights} {nights === 1 ? 'dia' : 'dias'})</span>
              </>
            )}
            {!propertyName && 'Configure a precificação dinâmica em 4 tiers para o período selecionado'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-blue-900">
                <p className="font-medium">Sistema de 4 Tiers de Precificação Dinâmica</p>
                <p className="text-blue-800">
                  Configure diferentes níveis de preço para otimizar sua receita conforme a demanda e sazonalidade.
                </p>
              </div>
            </div>
          </div>

          {/* Tier Selection */}
          <div>
            <Label className="mb-3 block">Selecione o Tier para este período</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['low', 'medium', 'high', 'peak'] as PriceTier[]).map((tier) => {
                const Icon = tierIcons[tier];
                const isSelected = selectedTier === tier;
                
                return (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${tierColors[tier]}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{tierLabels[tier]}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {tier === 'low' && 'Baixa demanda, preços reduzidos'}
                          {tier === 'medium' && 'Demanda normal, preço padrão'}
                          {tier === 'high' && 'Alta demanda, preços elevados'}
                          {tier === 'peak' && 'Picos e eventos, preços premium'}
                        </div>
                        <div className="text-xs font-medium text-gray-700 mt-2">
                          {tiers[tier].percentage > 0 ? '+' : ''}{tiers[tier].percentage}% 
                          <span className="text-gray-500"> • R$ {tiers[tier].basePrice.toFixed(2)}/noite</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Configuration Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="percentage">Por Percentual</TabsTrigger>
              <TabsTrigger value="fixed">Preço Fixo</TabsTrigger>
            </TabsList>

            <TabsContent value="percentage" className="space-y-6 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-sm text-gray-700 mb-4">
                  Configure o ajuste percentual sobre o preço base de cada tier.
                </p>
                
                <div className="space-y-4">
                  {(['low', 'medium', 'high', 'peak'] as PriceTier[]).map((tier) => {
                    const Icon = tierIcons[tier];
                    return (
                      <div key={tier} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${tierColors[tier]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">{tierLabels[tier]}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={tiers[tier].percentage}
                            onChange={(e) => updateTierPercentage(tier, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                            step="5"
                          />
                          <span className="text-gray-600 w-4">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>💡 <strong>Dica:</strong> Use percentuais negativos para reduzir preços (ex: -20% na baixa temporada)</p>
                <p>📊 <strong>Exemplo:</strong> Preço base de R$ 300 com +30% = R$ 390 por noite</p>
              </div>
            </TabsContent>

            <TabsContent value="fixed" className="space-y-6 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-sm text-gray-700 mb-4">
                  Defina preços fixos por noite para cada tier.
                </p>
                
                <div className="space-y-4">
                  {(['low', 'medium', 'high', 'peak'] as PriceTier[]).map((tier) => {
                    const Icon = tierIcons[tier];
                    return (
                      <div key={tier} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${tierColors[tier]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">{tierLabels[tier]}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">R$</span>
                          <Input
                            type="number"
                            value={tiers[tier].basePrice}
                            onChange={(e) => updateTierPrice(tier, parseFloat(e.target.value) || 0)}
                            className="w-28 text-right"
                            step="10"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>💡 <strong>Recomendação de preços:</strong></p>
                <p>• Baixa: R$ 200 - R$ 300 (período de menor demanda)</p>
                <p>• Média: R$ 300 - R$ 400 (preço padrão)</p>
                <p>• Alta: R$ 400 - R$ 550 (finais de semana, feriados)</p>
                <p>• Pico: R$ 550+ (Reveillon, Carnaval, eventos especiais)</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-6" />

          {/* Preview */}
          <div className={`rounded-lg p-4 border-2 ${tierColors[selectedTier]}`}>
            <div className="flex items-center gap-3 mb-3">
              <TierIcon className="w-6 h-6" />
              <h3 className="font-medium">Preview: {tierLabels[selectedTier]}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Período:</span>
                <span className="font-medium">{nights} {nights === 1 ? 'dia' : 'dias'}</span>
              </div>
              <div className="flex justify-between">
                <span>Preço por noite:</span>
                <span className="font-medium">R$ {tiers[selectedTier].basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ajuste:</span>
                <span className="font-medium">
                  {tiers[selectedTier].percentage > 0 ? '+' : ''}{tiers[selectedTier].percentage}%
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total estimado:</span>
                  <span className="text-lg font-medium">
                    R$ {(tiers[selectedTier].basePrice * nights).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Aplicar Tier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
