import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { DateRangePicker } from './DateRangePicker';
import { Calendar as CalendarIcon, Clock, AlertCircle, Trash2, Edit2, Lock, Target, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { calendarApi } from '../utils/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Block {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  nights: number;
  type: 'block';
  subtype?: 'simple' | 'predictive' | 'maintenance';
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface BlockDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: Block | null;
  propertyName: string;
  onDelete?: (blockId: string) => void;
  onUpdate?: () => void;
}

type BlockSubtype = 'simple' | 'predictive' | 'maintenance';

export function BlockDetailsModal({
  isOpen,
  onClose,
  block,
  propertyName,
  onDelete,
  onUpdate
}: BlockDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [blockSubtype, setBlockSubtype] = useState<BlockSubtype | null>(block?.subtype || null);
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [acoes, setAcoes] = useState(false);
  const [espera, setEspera] = useState(false);
  const [comment, setComment] = useState(block?.notes || '');
  
  // Date editing states
  const [newDateRange, setNewDateRange] = useState<{ from: Date; to: Date } | null>(null);

  // Reset form when block changes
  React.useEffect(() => {
    if (block) {
      setBlockSubtype(block.subtype || null);
      setComment(block.notes || '');
      setNewDateRange(null);
      
      // Parse notes for maintenance fields
      if (block.subtype === 'maintenance' && block.notes) {
        const checkInMatch = block.notes.match(/Check-in: (\d{2}:\d{2})/);
        const checkOutMatch = block.notes.match(/Check-out: (\d{2}:\d{2})/);
        const acoesMatch = block.notes.includes('Limitação: Ações');
        const esperaMatch = block.notes.includes('Limitação: Espera');
        
        if (checkInMatch) setCheckInTime(checkInMatch[1]);
        if (checkOutMatch) setCheckOutTime(checkOutMatch[1]);
        setAcoes(acoesMatch);
        setEspera(esperaMatch);
      }
    }
  }, [block]);

  if (!block) return null;

  const startDate = new Date(block.startDate + 'T00:00:00');
  const endDate = new Date(block.endDate + 'T00:00:00');

  const getSubtypeInfo = () => {
    if (!blockSubtype) return null;
    
    const info = {
      simple: {
        icon: <Lock className="w-4 h-4" />,
        label: 'Simples',
        color: 'bg-gray-100 text-gray-700 border-gray-300'
      },
      predictive: {
        icon: <Target className="w-4 h-4" />,
        label: 'Preditivo',
        color: 'bg-purple-100 text-purple-700 border-purple-300'
      },
      maintenance: {
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Manutenção',
        color: 'bg-orange-100 text-orange-700 border-orange-300'
      }
    };
    
    return info[blockSubtype];
  };

  const subtypeInfo = getSubtypeInfo();

  const handleSave = async () => {
    if (!block) return;
    
    setSaving(true);
    
    try {
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

      // Preparar dados de atualização
      const updateData: any = {
        subtype: blockSubtype || undefined,
        reason,
        notes: fullNotes
      };

      // Se as datas foram editadas, incluir no update
      if (newDateRange) {
        updateData.startDate = format(newDateRange.from, 'yyyy-MM-dd');
        updateData.endDate = format(newDateRange.to, 'yyyy-MM-dd');
      }

      const response = await calendarApi.updateBlock(block.id, updateData);

      if (response.success) {
        toast.success('Bloqueio atualizado com sucesso!');
        setIsEditing(false);
        setNewDateRange(null);
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(response.error || 'Erro ao atualizar bloqueio');
      }
    } catch (error) {
      console.error('Erro ao atualizar bloqueio:', error);
      toast.error('Erro ao atualizar bloqueio', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!block) return;
    
    setDeleting(true);
    
    try {
      const response = await calendarApi.deleteBlock(block.id);

      if (response.success) {
        toast.success('Bloqueio excluído com sucesso!');
        setShowDeleteDialog(false);
        if (onDelete) {
          onDelete(block.id);
        }
        onClose();
      } else {
        throw new Error(response.error || 'Erro ao excluir bloqueio');
      }
    } catch (error) {
      console.error('Erro ao excluir bloqueio:', error);
      toast.error('Erro ao excluir bloqueio', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    setBlockSubtype(block.subtype || null);
    setNewDateRange(null);
    setComment(block.notes || '');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-600" />
              Detalhes do Bloqueio
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Editando informações do bloqueio. Modifique as datas, tipo ou observações conforme necessário.' 
                : 'Visualizando detalhes completos do bloqueio. Clique em "Editar" para fazer alterações.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">Propriedade:</div>
                <div className="text-gray-900">{propertyName}</div>
              </div>

              <div className="border-t pt-3">
                {/* Date Display/Editor */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Período do bloqueio:</div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {newDateRange ? (
                            <>
                              {format(newDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} → {format(newDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                              <span className="text-green-600 ml-2 text-sm">(novas datas)</span>
                            </>
                          ) : (
                            <>
                              {startDate.toLocaleDateString('pt-BR')} → {endDate.toLocaleDateString('pt-BR')}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {newDateRange 
                          ? Math.ceil((newDateRange.to.getTime() - newDateRange.from.getTime()) / (1000 * 60 * 60 * 24))
                          : block.nights} {(newDateRange 
                            ? Math.ceil((newDateRange.to.getTime() - newDateRange.from.getTime()) / (1000 * 60 * 60 * 24))
                            : block.nights) === 1 ? 'noite' : 'noites'}
                      </div>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="space-y-2 pt-2 border-t">
                      <DateRangePicker
                        dateRange={newDateRange || { from: startDate, to: endDate }}
                        onDateRangeChange={setNewDateRange}
                      />
                      {newDateRange && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewDateRange(null)}
                          className="w-full text-sm"
                        >
                          Resetar para datas originais
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 text-sm mt-3 pt-3 border-t">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Criado em: {new Date(block.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-6" />

            {/* Block Subtype */}
            <div>
              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                <span>🏷️ Tipo de Bloqueio</span>
                {!isEditing && !blockSubtype && <span className="text-xs text-gray-500">(não especificado)</span>}
              </h3>
              
              {!isEditing && subtypeInfo && (
                <Badge className={`${subtypeInfo.color} border`}>
                  <div className="flex items-center gap-1.5">
                    {subtypeInfo.icon}
                    <span>{subtypeInfo.label}</span>
                  </div>
                </Badge>
              )}

              {isEditing && (
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
                      <Lock className="w-4 h-4" />
                      <span className="font-medium">Simples</span>
                    </div>
                    <p className="text-xs text-gray-600">Bloqueio básico sem detalhes adicionais</p>
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
                      <Target className="w-4 h-4" />
                      <span className="font-medium">Preditivo</span>
                    </div>
                    <p className="text-xs text-gray-600">Bloqueio preventivo baseado em previsões</p>
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
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Manutenção</span>
                    </div>
                    <p className="text-xs text-gray-600">Para limpeza, reparos ou manutenção</p>
                  </button>
                </div>
              )}
            </div>

            {/* Maintenance specific fields */}
            {isEditing && blockSubtype === 'maintenance' && (
              <div className="space-y-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900">Configurações de Manutenção</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="check-in-time">Check-in</Label>
                    <Input
                      id="check-in-time"
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="check-out-time">Check-out</Label>
                    <Input
                      id="check-out-time"
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Limitações</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="acoes"
                        checked={acoes}
                        onCheckedChange={(checked) => setAcoes(checked as boolean)}
                      />
                      <Label htmlFor="acoes" className="cursor-pointer">Com horários</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="espera"
                        checked={espera}
                        onCheckedChange={(checked) => setEspera(checked as boolean)}
                      />
                      <Label htmlFor="espera" className="cursor-pointer">Com espera</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Observações</Label>
              {isEditing ? (
                <Textarea
                  id="notes"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicione observações sobre este bloqueio..."
                  className="mt-2 min-h-[100px]"
                />
              ) : (
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-gray-700 text-sm min-h-[60px]">
                  {block.notes || <span className="text-gray-400">Nenhuma observação</span>}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-6 border-t">
            <div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Fechar
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloqueio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O bloqueio será permanentemente removido do calendário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
