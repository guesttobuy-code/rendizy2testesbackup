/**
 * RENDIZY - Inadimplência Page
 * Gestão de títulos em atraso (contas a receber e a pagar)
 * 
 * @version v1.0.103.600
 */

import React, { useState, useEffect } from 'react';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { Money } from '../components/Money';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { AlertTriangle, Calendar, DollarSign, Loader2, Search, Filter } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { format, differenceInDays } from 'date-fns';
import type { Titulo } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function InadimplenciaPage() {
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [tipo, setTipo] = useState<'receber' | 'pagar' | 'todos'>('todos');
  const [diasAtraso, setDiasAtraso] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTitulos();
  }, [tipo, diasAtraso]);

  const loadTitulos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar títulos a receber e a pagar
      const [receberRes, pagarRes] = await Promise.all([
        financeiroApi.titulos.list({ tipo: 'receber', vencido: true }),
        financeiroApi.titulos.list({ tipo: 'pagar', vencido: true }),
      ]);

      let allTitulos: Titulo[] = [];
      
      if (receberRes.success && receberRes.data?.data) {
        allTitulos.push(...receberRes.data.data.map(t => ({ ...t, tipoTitulo: 'receber' as const })));
      }
      
      if (pagarRes.success && pagarRes.data?.data) {
        allTitulos.push(...pagarRes.data.data.map(t => ({ ...t, tipoTitulo: 'pagar' as const })));
      }

      // Filtrar por tipo
      if (tipo !== 'todos') {
        allTitulos = allTitulos.filter(t => t.tipoTitulo === tipo);
      }

      // Filtrar por dias de atraso
      if (diasAtraso !== 'todos') {
        const dias = parseInt(diasAtraso);
        const hoje = new Date();
        allTitulos = allTitulos.filter(t => {
          const vencimento = new Date(t.vencimento);
          const atraso = differenceInDays(hoje, vencimento);
          return atraso >= dias;
        });
      }

      // Ordenar por data de vencimento (mais antigos primeiro)
      allTitulos.sort((a, b) => {
        const dataA = new Date(a.vencimento).getTime();
        const dataB = new Date(b.vencimento).getTime();
        return dataA - dataB;
      });

      setTitulos(allTitulos);
    } catch (err: any) {
      console.error('Erro ao carregar títulos:', err);
      setError(err.message || 'Erro ao carregar títulos');
      setTitulos([]);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiasAtraso = (vencimento: string): number => {
    const hoje = new Date();
    const venc = new Date(vencimento);
    return differenceInDays(hoje, venc);
  };

  const getAtrasoBadge = (dias: number) => {
    if (dias <= 0) return <Badge variant="default">Em dia</Badge>;
    if (dias <= 30) return <Badge variant="secondary">{dias} dias</Badge>;
    if (dias <= 60) return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{dias} dias</Badge>;
    if (dias <= 90) return <Badge variant="outline" className="bg-orange-100 text-orange-800">{dias} dias</Badge>;
    return <Badge variant="destructive">{dias} dias</Badge>;
  };

  const titulosFiltrados = titulos.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.descricao?.toLowerCase().includes(query) ||
      t.numeroDocumento?.toLowerCase().includes(query) ||
      t.observacoes?.toLowerCase().includes(query)
    );
  });

  const totalAtrasado = titulosFiltrados.reduce((sum, t) => {
    const dias = calcularDiasAtraso(t.vencimento);
    return dias > 0 ? sum + (t.valor - (t.valorPago || 0)) : sum;
  }, 0);

  const columns: DataTableColumn<Titulo & { tipoTitulo: 'receber' | 'pagar' }>[] = [
    {
      key: 'tipoTitulo',
      label: 'Tipo',
      render: (value) => (
        <Badge variant={value === 'receber' ? 'default' : 'destructive'}>
          {value === 'receber' ? 'A Receber' : 'A Pagar'}
        </Badge>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
    },
    {
      key: 'numeroDocumento',
      label: 'Nº Documento',
      render: (value) => value || '-'
    },
    {
      key: 'vencimento',
      label: 'Vencimento',
      sortable: true,
      render: (value, row) => {
        const dias = calcularDiasAtraso(value);
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{format(new Date(value), 'dd/MM/yyyy')}</span>
            {dias > 0 && getAtrasoBadge(dias)}
          </div>
        );
      }
    },
    {
      key: 'valor',
      label: 'Valor',
      className: 'text-right',
      render: (value, row) => (
        <Money amount={value} currency={row.moeda} />
      )
    },
    {
      key: 'valorPago',
      label: 'Pago',
      className: 'text-right',
      render: (value, row) => (
        <Money amount={value || 0} currency={row.moeda} />
      )
    },
    {
      key: 'saldo',
      label: 'Saldo',
      className: 'text-right font-semibold',
      render: (_, row) => {
        const saldo = row.valor - (row.valorPago || 0);
        return (
          <Money 
            amount={saldo} 
            currency={row.moeda}
            colorize={saldo > 0}
          />
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'pago' ? 'default' : 'secondary'}>
          {value === 'pago' ? 'Pago' : 'Pendente'}
        </Badge>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Inadimplência
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Títulos em atraso - Contas a Receber e a Pagar
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <Label>Buscar</Label>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Descrição, documento..."
              className="w-64"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: 'receber' | 'pagar' | 'todos') => setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="receber">A Receber</SelectItem>
                <SelectItem value="pagar">A Pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dias de Atraso</Label>
            <Select value={diasAtraso} onValueChange={setDiasAtraso}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1+ dias</SelectItem>
                <SelectItem value="30">30+ dias</SelectItem>
                <SelectItem value="60">60+ dias</SelectItem>
                <SelectItem value="90">90+ dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo */}
        {totalAtrasado > 0 && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-900 dark:text-red-100">
                  Total em Atraso:
                </span>
              </div>
              <Money amount={totalAtrasado} className="text-lg font-bold text-red-600" />
            </div>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {titulosFiltrados.length} título(s) em atraso
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && titulos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando títulos...</span>
          </div>
        ) : titulosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">Nenhum título em atraso encontrado</span>
          </div>
        ) : (
          <DataTable
            data={titulosFiltrados}
            columns={columns}
            pageSize={25}
          />
        )}
      </div>
    </div>
  );
}

export default InadimplenciaPage;

