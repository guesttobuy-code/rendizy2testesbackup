/**
 * RENDIZY - Relatórios Gerenciais Page
 * Relatórios gerenciais do módulo financeiro
 * 
 * @version v1.0.103.600
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Money } from '../components/Money';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function RelatoriosGerenciaisPage() {
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dados do relatório
  const [resumo, setResumo] = useState({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    receitasPeriodoAnterior: 0,
    despesasPeriodoAnterior: 0,
  });

  useEffect(() => {
    loadRelatorio();
  }, [dataInicio, dataFim]);

  const loadRelatorio = async () => {
    try {
      setLoading(true);
      
      // Buscar lançamentos do período
      const [receitasRes, despesasRes] = await Promise.all([
        financeiroApi.lancamentos.list({ 
          tipo: 'entrada',
          dataInicio,
          dataFim,
        }),
        financeiroApi.lancamentos.list({ 
          tipo: 'saida',
          dataInicio,
          dataFim,
        }),
      ]);

      let receitas = 0;
      let despesas = 0;

      if (receitasRes.success && receitasRes.data?.data) {
        receitas = receitasRes.data.data.reduce((sum: number, l: any) => sum + (l.valor || 0), 0);
      }

      if (despesasRes.success && despesasRes.data?.data) {
        despesas = despesasRes.data.data.reduce((sum: number, l: any) => sum + (l.valor || 0), 0);
      }

      // Calcular período anterior para comparação
      const inicioAnterior = format(subMonths(new Date(dataInicio), 1), 'yyyy-MM-dd');
      const fimAnterior = format(subMonths(new Date(dataFim), 1), 'yyyy-MM-dd');

      const [receitasAnteriorRes, despesasAnteriorRes] = await Promise.all([
        financeiroApi.lancamentos.list({ 
          tipo: 'entrada',
          dataInicio: inicioAnterior,
          dataFim: fimAnterior,
        }),
        financeiroApi.lancamentos.list({ 
          tipo: 'saida',
          dataInicio: inicioAnterior,
          dataFim: fimAnterior,
        }),
      ]);

      let receitasAnterior = 0;
      let despesasAnterior = 0;

      if (receitasAnteriorRes.success && receitasAnteriorRes.data?.data) {
        receitasAnterior = receitasAnteriorRes.data.data.reduce((sum: number, l: any) => sum + (l.valor || 0), 0);
      }

      if (despesasAnteriorRes.success && despesasAnteriorRes.data?.data) {
        despesasAnterior = despesasAnteriorRes.data.data.reduce((sum: number, l: any) => sum + (l.valor || 0), 0);
      }

      setResumo({
        receitas,
        despesas,
        saldo: receitas - despesas,
        receitasPeriodoAnterior: receitasAnterior,
        despesasPeriodoAnterior: despesasAnterior,
      });
    } catch (err: any) {
      console.error('Erro ao carregar relatório:', err);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const variacaoReceitas = resumo.receitasPeriodoAnterior > 0
    ? ((resumo.receitas - resumo.receitasPeriodoAnterior) / resumo.receitasPeriodoAnterior) * 100
    : 0;

  const variacaoDespesas = resumo.despesasPeriodoAnterior > 0
    ? ((resumo.despesas - resumo.despesasPeriodoAnterior) / resumo.despesasPeriodoAnterior) * 100
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Relatórios Gerenciais
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Análise financeira e indicadores gerenciais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadRelatorio} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros de Período */}
        <div className="flex items-center gap-3">
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="pt-6">
            <Button onClick={loadRelatorio} disabled={loading} size="sm">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Atualizar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando relatório...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Receitas */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Receitas</h3>
                </div>
                {variacaoReceitas !== 0 && (
                  <Badge variant={variacaoReceitas > 0 ? 'default' : 'destructive'}>
                    {variacaoReceitas > 0 ? '+' : ''}{variacaoReceitas.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                <Money amount={resumo.receitas} />
              </div>
              <div className="text-sm text-gray-500">
                Período: {format(new Date(dataInicio), 'dd/MM/yyyy')} até {format(new Date(dataFim), 'dd/MM/yyyy')}
              </div>
            </Card>

            {/* Despesas */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold">Despesas</h3>
                </div>
                {variacaoDespesas !== 0 && (
                  <Badge variant={variacaoDespesas < 0 ? 'default' : 'destructive'}>
                    {variacaoDespesas > 0 ? '+' : ''}{variacaoDespesas.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                <Money amount={resumo.despesas} />
              </div>
              <div className="text-sm text-gray-500">
                Período: {format(new Date(dataInicio), 'dd/MM/yyyy')} até {format(new Date(dataFim), 'dd/MM/yyyy')}
              </div>
            </Card>

            {/* Saldo */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Saldo</h3>
                </div>
              </div>
              <div className={`text-3xl font-bold mb-2 ${resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <Money amount={resumo.saldo} />
              </div>
              <div className="text-sm text-gray-500">
                Receitas - Despesas
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default RelatoriosGerenciaisPage;

