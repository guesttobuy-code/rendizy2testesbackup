/**
 * RENDIZY - Fechamento de Caixa Diário Page
 * Fechamento de caixa diário com validação
 * 
 * @version v1.0.103.600
 */

import React, { useState, useEffect } from 'react';
import { Money } from '../components/Money';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { CheckCircle, XCircle, Loader2, Calendar, Calculator } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { format } from 'date-fns';
import type { ContaBancaria } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

interface FechamentoCaixa {
  data: string;
  conta: {
    id: string;
    nome: string;
  };
  saldoInicial: number;
  receitas: {
    total: number;
    quantidade: number;
  };
  despesas: {
    total: number;
    quantidade: number;
  };
  saldoFinalEsperado: number;
  saldoBancarioReal: number;
  diferenca: number;
  estaBateu: boolean;
  status: 'ok' | 'divergente';
}

export function FechamentoCaixaPage() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [contaId, setContaId] = useState<string>('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [fechamento, setFechamento] = useState<FechamentoCaixa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    try {
      const response = await financeiroApi.contasBancarias.list();
      if (response.success && response.data) {
        setContas(response.data || []);
        if (response.data.length > 0 && !contaId) {
          setContaId(response.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar contas:', err);
    }
  };

  const calcularFechamento = async () => {
    if (!contaId) {
      toast.error('Selecione uma conta bancária');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.conciliacao.fechamento(data, contaId);
      
      if (response.success && response.data) {
        setFechamento(response.data);
        
        if (response.data.estaBateu) {
          toast.success('Fechamento OK! Saldo bateu com o extrato bancário.');
        } else {
          toast.warning(`Atenção! Diferença de ${Math.abs(response.data.diferenca).toFixed(2)} detectada.`);
        }
      } else {
        setError(response.error || 'Erro ao calcular fechamento');
        toast.error(response.error || 'Erro ao calcular fechamento');
      }
    } catch (err: any) {
      console.error('Erro ao calcular fechamento:', err);
      setError(err.message || 'Erro ao calcular fechamento');
      toast.error(err.message || 'Erro ao calcular fechamento');
    } finally {
      setLoading(false);
    }
  };

  const contaSelecionada = contas.find(c => c.id === contaId);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Fechamento de Caixa Diário</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Valide o fechamento diário comparando com o extrato bancário
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-64">
            <Label>Conta Bancária *</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome} - {conta.banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <Button onClick={calcularFechamento} disabled={loading || !contaId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Fechamento
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-red-800 dark:text-red-200">{error}</div>
          </div>
        )}

        {fechamento ? (
          <div className="space-y-6">
            {/* Status */}
            <Card className={fechamento.estaBateu ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {fechamento.estaBateu ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600">Fechamento OK</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600">Divergência Detectada</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Data: {format(new Date(fechamento.data), 'dd/MM/yyyy')} | 
                  Conta: {fechamento.conta.nome}
                </div>
              </CardContent>
            </Card>

            {/* Cálculo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Saldo Inicial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <Money amount={fechamento.saldoInicial} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Último saldo do dia anterior
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                    Receitas do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    <Money amount={fechamento.receitas.total} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {fechamento.receitas.quantidade} lançamento(s)
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                    Despesas do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    <Money amount={fechamento.despesas.total} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {fechamento.despesas.quantidade} lançamento(s)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Saldo Final Esperado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <Money amount={fechamento.saldoFinalEsperado} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Inicial + Receitas - Despesas
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparação */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação com Extrato Bancário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Saldo Final Esperado</div>
                      <div className="text-xl font-bold mt-1">
                        <Money amount={fechamento.saldoFinalEsperado} />
                      </div>
                    </div>
                    <div className="text-2xl">=</div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Saldo Bancário Real</div>
                      <div className="text-xl font-bold mt-1">
                        <Money amount={fechamento.saldoBancarioReal} />
                      </div>
                    </div>
                  </div>

                  {!fechamento.estaBateu && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-red-800 dark:text-red-200">
                            Diferença Detectada
                          </div>
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                            <Money amount={Math.abs(fechamento.diferenca)} />
                          </div>
                        </div>
                        <Badge variant="destructive">Divergente</Badge>
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Verifique lançamentos não conciliados ou erros de digitação
                      </div>
                    </div>
                  )}

                  {fechamento.estaBateu && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-green-800 dark:text-green-200">
                            Fechamento Validado
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Saldo calculado corresponde ao saldo bancário
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fórmula */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fórmula de Cálculo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm space-y-1">
                  <div>Saldo Final Esperado = Saldo Inicial + Receitas - Despesas</div>
                  <div className="text-gray-500">
                    {fechamento.saldoInicial.toFixed(2)} + {fechamento.receitas.total.toFixed(2)} - {fechamento.despesas.total.toFixed(2)} = {fechamento.saldoFinalEsperado.toFixed(2)}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div>Saldo Bancário Real = {fechamento.saldoBancarioReal.toFixed(2)}</div>
                    <div className={fechamento.estaBateu ? 'text-green-600' : 'text-red-600'}>
                      Diferença = {fechamento.diferenca.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500">
                Selecione uma conta e uma data, depois clique em &quot;Calcular Fechamento&quot;
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FechamentoCaixaPage;

