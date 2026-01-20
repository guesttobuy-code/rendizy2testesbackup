import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Plus, Trash2, Calendar, Zap, FileText, Hand } from 'lucide-react';
import { ProcessTrigger } from '../../types/funnels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ProcessTriggerConfigProps {
  triggers: ProcessTrigger[];
  onChange: (triggers: ProcessTrigger[]) => void;
}

export function ProcessTriggerConfig({ triggers, onChange }: ProcessTriggerConfigProps) {
  const [newTriggerType, setNewTriggerType] = useState<ProcessTrigger['type']>('manual');

  const handleAddTrigger = () => {
    const newTrigger: ProcessTrigger = {
      type: newTriggerType,
      config: {},
    };
    onChange([...triggers, newTrigger]);
    setNewTriggerType('manual');
  };

  const handleRemoveTrigger = (index: number) => {
    onChange(triggers.filter((_, i) => i !== index));
  };

  const handleUpdateTrigger = (index: number, updated: ProcessTrigger) => {
    const newTriggers = [...triggers];
    newTriggers[index] = updated;
    onChange(newTriggers);
  };

  const getTriggerIcon = (type: ProcessTrigger['type']) => {
    switch (type) {
      case 'manual':
        return <Hand className="w-4 h-4" />;
      case 'contract_signed':
        return <FileText className="w-4 h-4" />;
      case 'reservation_confirmed':
        return <Calendar className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
      case 'automation':
        return <Zap className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getTriggerLabel = (type: ProcessTrigger['type']) => {
    switch (type) {
      case 'manual':
        return 'Manual';
      case 'contract_signed':
        return 'Quando contrato é assinado';
      case 'reservation_confirmed':
        return 'Quando reserva é confirmada';
      case 'date':
        return 'Em data específica';
      case 'automation':
        return 'Quando automação é acionada';
      default:
        return type;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Gatilhos Automáticos</h3>
        <div className="flex items-center gap-2">
          <Select value={newTriggerType} onValueChange={(value: any) => setNewTriggerType(value)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  <span>Manual</span>
                </div>
              </SelectItem>
              <SelectItem value="contract_signed">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Quando contrato é assinado</span>
                </div>
              </SelectItem>
              <SelectItem value="reservation_confirmed">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Quando reserva é confirmada</span>
                </div>
              </SelectItem>
              <SelectItem value="date">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Em data específica</span>
                </div>
              </SelectItem>
              <SelectItem value="automation">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Quando automação é acionada</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddTrigger}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {triggers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum gatilho configurado. O processo será iniciado manualmente.
        </p>
      ) : (
        <div className="space-y-2">
          {triggers.map((trigger, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                {getTriggerIcon(trigger.type)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTriggerLabel(trigger.type)}</span>
                    {trigger.type === 'date' && trigger.config.date && (
                      <Badge variant="outline">
                        {new Date(trigger.config.date).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                  {trigger.type === 'date' && (
                    <div className="mt-2">
                      <Input
                        type="date"
                        value={trigger.config.date || ''}
                        onChange={(e) =>
                          handleUpdateTrigger(index, {
                            ...trigger,
                            config: { ...trigger.config, date: e.target.value },
                          })
                        }
                        className="w-48"
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveTrigger(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
