import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Clock, Edit2, Check, X } from 'lucide-react';
import { ServiceTask } from '../../types/funnels';

interface TimeEstimateProps {
  task: ServiceTask;
  onUpdate: (estimatedHours?: number, actualHours?: number) => void;
  readOnly?: boolean;
}

export function TimeEstimate({ task, onUpdate, readOnly = false }: TimeEstimateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState<string>(
    task.estimatedHours?.toString() || ''
  );
  const [actualHours, setActualHours] = useState<string>(
    task.actualHours?.toString() || ''
  );

  const handleSave = () => {
    const estimated = estimatedHours ? parseFloat(estimatedHours) : undefined;
    const actual = actualHours ? parseFloat(actualHours) : undefined;
    onUpdate(estimated, actual);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEstimatedHours(task.estimatedHours?.toString() || '');
    setActualHours(task.actualHours?.toString() || '');
    setIsEditing(false);
  };

  const getProgress = () => {
    if (!task.estimatedHours || !task.actualHours) return null;
    return (task.actualHours / task.estimatedHours) * 100;
  };

  const progress = getProgress();
  const isOverEstimate = progress !== null && progress > 100;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <Label className="text-sm font-medium">Estimativa de Tempo</Label>
          </div>
          {!readOnly && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Estimativa (horas)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="Ex: 2.5"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Tempo Real (horas)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                placeholder="Ex: 3.0"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="w-3 h-3 mr-1" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-3 h-3 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {task.estimatedHours ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Estimativa: <strong>{task.estimatedHours}h</strong>
                </p>
                {task.actualHours !== undefined && (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Real: <strong>{task.actualHours}h</strong>
                    </p>
                    {progress !== null && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progresso</span>
                          <span className={isOverEstimate ? 'text-red-600' : 'text-green-600'}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isOverEstimate ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        {isOverEstimate && (
                          <p className="text-xs text-red-600 mt-1">
                            {((task.actualHours - task.estimatedHours) / task.estimatedHours * 100).toFixed(0)}% acima da estimativa
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma estimativa definida</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

