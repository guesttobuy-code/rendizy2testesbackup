/**
 * RENDIZY - Split Editor Component
 * Editor de divisão de pagamentos/recebimentos
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Card } from '../../ui/card';
import { Label } from '../../ui/label';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Money } from './Money';
import type { SplitDestino } from '../../../types/financeiro';

export interface SplitEditorProps {
  valorTotal: number;
  splits: SplitDestino[];
  onChange: (splits: SplitDestino[]) => void;
  contas?: { id: string; nome: string }[];
  centrosCusto?: { id: string; nome: string }[];
}

export function SplitEditor({
  valorTotal,
  splits,
  onChange,
  contas = [],
  centrosCusto = []
}: SplitEditorProps) {
  const [localSplits, setLocalSplits] = useState<SplitDestino[]>(splits);
  const [tipoSplit, setTipoSplit] = useState<'percentual' | 'valor'>('percentual');

  useEffect(() => {
    setLocalSplits(splits);
  }, [splits]);

  const calcularTotal = () => {
    return localSplits.reduce((sum, split) => {
      if (tipoSplit === 'percentual') {
        return sum + (split.percentual || 0);
      }
      return sum + (split.valor || 0);
    }, 0);
  };

  const total = calcularTotal();
  const isValid = tipoSplit === 'percentual' 
    ? Math.abs(total - 100) < 0.01
    : Math.abs(total - valorTotal) < 0.01;

  const adicionarSplit = () => {
    const novoSplit: SplitDestino = {
      id: `split_${Date.now()}`,
      nome: '',
      tipo: tipoSplit,
      percentual: tipoSplit === 'percentual' ? 0 : undefined,
      valor: tipoSplit === 'valor' ? 0 : undefined
    };
    
    const novaSplits = [...localSplits, novoSplit];
    setLocalSplits(novaSplits);
    onChange(novaSplits);
  };

  const removerSplit = (index: number) => {
    const novaSplits = localSplits.filter((_, i) => i !== index);
    setLocalSplits(novaSplits);
    onChange(novaSplits);
  };

  const atualizarSplit = (index: number, campo: keyof SplitDestino, valor: any) => {
    const novaSplits = localSplits.map((split, i) => {
      if (i === index) {
        return { ...split, [campo]: valor };
      }
      return split;
    });
    setLocalSplits(novaSplits);
    onChange(novaSplits);
  };

  const distribuirAutomaticamente = () => {
    if (localSplits.length === 0) return;

    const novaSplits = localSplits.map((split, index) => {
      if (tipoSplit === 'percentual') {
        return {
          ...split,
          percentual: 100 / localSplits.length
        };
      } else {
        return {
          ...split,
          valor: valorTotal / localSplits.length
        };
      }
    });

    setLocalSplits(novaSplits);
    onChange(novaSplits);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg">Divisão de Pagamento</h3>
          <p className="text-sm text-gray-500">
            Valor total: <Money amount={valorTotal} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tipoSplit} onValueChange={(v) => setTipoSplit(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentual">Percentual</SelectItem>
              <SelectItem value="valor">Valor</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={distribuirAutomaticamente}>
            Distribuir Igual
          </Button>
        </div>
      </div>

      {/* Lista de splits */}
      <div className="space-y-3">
        {localSplits.map((split, index) => (
          <Card key={split.id} className="p-4">
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Nome/Beneficiário */}
              <div className="col-span-3">
                <Label className="text-xs mb-1">Beneficiário</Label>
                <Input
                  placeholder="Nome"
                  value={split.nome}
                  onChange={(e) => atualizarSplit(index, 'nome', e.target.value)}
                />
              </div>

              {/* Valor/Percentual */}
              <div className="col-span-2">
                <Label className="text-xs mb-1">
                  {tipoSplit === 'percentual' ? 'Percentual' : 'Valor'}
                </Label>
                <Input
                  type="number"
                  step={tipoSplit === 'percentual' ? '0.01' : '0.01'}
                  value={tipoSplit === 'percentual' ? split.percentual || '' : split.valor || ''}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value) || 0;
                    atualizarSplit(
                      index,
                      tipoSplit === 'percentual' ? 'percentual' : 'valor',
                      valor
                    );
                  }}
                  placeholder={tipoSplit === 'percentual' ? '0.00' : '0,00'}
                />
              </div>

              {/* Valor calculado (se for percentual) */}
              {tipoSplit === 'percentual' && (
                <div className="col-span-2">
                  <Label className="text-xs mb-1">Valor</Label>
                  <div className="h-10 flex items-center px-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
                    <Money amount={valorTotal * ((split.percentual || 0) / 100)} />
                  </div>
                </div>
              )}

              {/* Conta destino */}
              <div className="col-span-3">
                <Label className="text-xs mb-1">Conta Destino</Label>
                <Select
                  value={split.contaDestinoId || ''}
                  onValueChange={(v) => atualizarSplit(index, 'contaDestinoId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão remover */}
              <div className="col-span-1 flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removerSplit(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Botão adicionar */}
      <Button variant="outline" onClick={adicionarSplit} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Beneficiário
      </Button>

      {/* Validação */}
      <div className={`p-3 rounded-lg ${isValid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className={`h-4 w-4 ${isValid ? 'text-green-600' : 'text-red-600'}`} />
          <div className="flex-1">
            <p className={`text-sm ${isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {tipoSplit === 'percentual' ? (
                <>
                  Total: {total.toFixed(2)}% {isValid ? '✓' : `(Deve ser 100%)`}
                </>
              ) : (
                <>
                  Total: <Money amount={total} /> {isValid ? '✓' : `(Deve ser ${valorTotal.toFixed(2)})`}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitEditor;
