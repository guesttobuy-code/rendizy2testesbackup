import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Calendar, Clock, AlertCircle, Info, Target, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { calendarApi } from '../utils/api';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  startDate: Date;
  endDate: Date;
  onSave?: () => void;
}

type BlockSubtype = 'simple' | 'predictive' | 'maintenance';

export function BlockModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  startDate,
  endDate,
  onSave
}: BlockModalProps) {
  const [blockSubtype, setBlockSubtype] = useState<BlockSubtype | null>(null);
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [acoes, setAcoes] = useState(false);
  const [espera, setEspera] = useState(false);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Formatar datas para ISO string
      const checkInISO = startDate.toISOString().split('T')[0];
      const checkOutISO = endDate.toISOString().split('T')[0];
      
      // Determinar razão baseada no subtipo
      let reason = 'Bloqueio';
      if (blockSubtype === 'maintenance') {
        reason = 'Manutenção programada';
      } else if (blockSubtype === 'predictive') {
        reason = 'Bloqueio preditivo';
      } else if (blockSubtype === 'simple') {
        reason = 'Bloqueio simples';
      }
      
      // Montar notas com todos os detalhes
      const notes = [];
      if (comment) notes.push(comment);
      if (blockSubtype === 'maintenance') {
        notes.push(`Check-in: ${checkInTime}`);
        notes.push(`Check-out: ${checkOutTime}`);
        if (acoes) notes.push('Limitação: Ações');
        if (espera) notes.push('Limitação: Espera');
      }
      
      const fullNotes = notes.filter(Boolean).join(' | ');

      const response = await calendarApi.createBlock({
        propertyId,
        startDate: checkInISO,
        endDate: checkOutISO,
        type: 'block', // Tipo único
        subtype: blockSubtype || undefined, // Subtipo opcional
        reason,
        notes: fullNotes
      });

      if (response.success) {
        toast.success('Bloqueio criado com sucesso!', {
          description: `${nights} ${nights === 1 ? 'noite' : 'noites'} bloqueada(s) em ${propertyName}`
        });
        
        if (onSave) {
          onSave();
        }
        
        onClose();
      } else {
        throw new Error(response.error || 'Erro ao criar bloqueio');
      }
    } catch (error) {
      console.error('Erro ao criar bloqueio:', error);
      toast.error('Erro ao criar bloqueio', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setSaving(false);
    }
  };

  const getSubtypeInfo = () => {
    if (!blockSubtype) return null;
    
    const info = {
      simple: {
        icon: <Lock className="w-5 h-5 text-gray-600" />,
        title: 'Bloqueio Simples',
        color: 'gray',
        description: 'Bloqueia datas no calendário sem especificar um motivo detalhado'
      },
      predictive: {
        icon: <Target className="w-5 h-5 text-purple-600" />,
        title: 'Bloqueio Preditivo',
        color: 'purple',
        description: 'Impede que a estimativa de receita reserve múltiplas noites para o período selecionado'
      },
      maintenance: {
        icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
        title: 'Bloqueio de Manutenção',
        color: 'orange',
        description: 'Bloqueio para realizar manutenção no imóvel'
      }
    };
    
    return info[blockSubtype];
  };

  const subtypeInfo = getSubtypeInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Criar Bloqueio
          </DialogTitle>
          <DialogDescription>
            Bloqueie datas no calendário para impedir novas reservas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Propriedade:</span>
                <span>{propertyName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4" />
                <span>
                  {startDate.toLocaleDateString('pt-BR')} → {endDate.toLocaleDateString('pt-BR')}
                </span>
                <span className="text-gray-500">({nights} {nights === 1 ? 'noite' : 'noites'})</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Block Subtype Selection (Optional) */}
          <div>
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <span>🏷️ Tipo de Bloqueio</span>
              <span className="text-xs text-gray-500">(opcional)</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setBlockSubtype(blockSubtype === 'simple' ? null : 'simple')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  blockSubtype === 'simple'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">Simples</span>
                </div>
                <p className="text-xs text-gray-600">Bloqueio básico sem detalhes</p>
              </button>

              <button
                type="button"
                onClick={() => setBlockSubtype(blockSubtype === 'predictive' ? null : 'predictive')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  blockSubtype === 'predictive'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-sm">Preditivo</span>
                </div>
                <p className="text-xs text-gray-600">Para estratégia de precificação</p>
              </button>

              <button
                type="button"
                onClick={() => setBlockSubtype(blockSubtype === 'maintenance' ? null : 'maintenance')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  blockSubtype === 'maintenance'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-sm">Manutenção</span>
                </div>
                <p className="text-xs text-gray-600">Com horários e limitações</p>
              </button>
            </div>
          </div>

          {/* Subtype Info Box */}
          {subtypeInfo && (
            <>
              <div className="border-t pt-6" />
              <div className={`bg-${subtypeInfo.color}-50 border border-${subtypeInfo.color}-200 rounded-lg p-4`}>
                <div className="flex gap-3">
                  <Info className={`w-5 h-5 text-${subtypeInfo.color}-600 flex-shrink-0 mt-0.5`} />
                  <div className={`space-y-2 text-sm text-${subtypeInfo.color}-900`}>
                    <p className="font-medium">{subtypeInfo.title}</p>
                    <p className={`text-${subtypeInfo.color}-800`}>{subtypeInfo.description}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Maintenance-specific fields */}
          {blockSubtype === 'maintenance' && (
            <>
              <div className="border-t pt-6" />

              {/* Check-in/Check-out Times */}
              <div>
                <h3 className="flex items-center gap-2 text-gray-900 mb-4">
                  <Clock className="w-4 h-4" />
                  Horários
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkin">Check-in após</Label>
                    <Input
                      id="checkin"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout">Check-out até</Label>
                    <Input
                      id="checkout"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6" />

              {/* Limitations */}
              <div>
                <h3 className="text-gray-900 mb-4">🏷️ Limitações</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="acoes"
                      checked={acoes}
                      onCheckedChange={(checked) => setAcoes(checked as boolean)}
                    />
                    <label
                      htmlFor="acoes"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Ações
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="espera"
                      checked={espera}
                      onCheckedChange={(checked) => setEspera(checked as boolean)}
                    />
                    <label
                      htmlFor="espera"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Espera
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Predictive-specific info */}
          {blockSubtype === 'predictive' && (
            <>
              <div className="border-t pt-6" />
              <div className="space-y-3">
                <h3 className="text-gray-900">📋 Características:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Aparece em ROXO no calendário</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Não aceita reservas automáticas das plataformas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Você ainda pode criar reservas manuais se desejar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>Ideal para estratégias de precificação dinâmica</span>
                  </li>
                </ul>
              </div>
            </>
          )}

          <div className="border-t pt-6" />

          {/* Comment */}
          <div>
            <h3 className="text-gray-900 mb-4">💬 Comentário {!blockSubtype && <span className="text-xs text-gray-500">(opcional)</span>}</h3>
            <Textarea
              placeholder={
                blockSubtype === 'maintenance'
                  ? 'Exemplo: Manutenção programada do ar-condicionado'
                  : blockSubtype === 'predictive'
                  ? 'Exemplo: Aguardando evento especial na região para ajustar preços'
                  : 'Adicione um comentário sobre este bloqueio'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <div className="border-t pt-6" />

          {/* Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">ℹ️ Informações importantes:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Bloqueios aparecem em LARANJA no calendário</li>
                  <li>Ninguém poderá reservar essas datas</li>
                  <li>Você pode remover o bloqueio a qualquer momento</li>
                  <li>O tipo é opcional - pode criar um bloqueio sem especificar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Bloqueio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
