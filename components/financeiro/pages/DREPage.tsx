/**
 * RENDIZY - DRE Page
 * Demonstração do Resultado do Exercício Gerencial
 */

import React, { useState, useEffect } from 'react';
import { KpiCard } from '../components/KpiCard';
import { Money } from '../components/Money';
import { PeriodPicker } from '../components/PeriodPicker';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Download, ChevronRight, ChevronDown, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { ItemDRE } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function DREPage() {
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dreData, setDreData] = useState<ItemDRE[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDRE();
  }, [startDate, endDate]);

  const loadDRE = async () => {
    try {
      setLoading(true);
      
      const dataInicio = format(startDate, 'yyyy-MM-dd');
      const dataFim = format(endDate, 'yyyy-MM-dd');
      
      // Buscar lançamentos e categorias
      const [lancamentosRes, categoriasRes] = await Promise.all([
        financeiroApi.lancamentos.list({
          dataInicio,
          dataFim,
          page: 1,
          limit: 1000,
        }),
        financeiroApi.categorias.list(),
      ]);

      if (!lancamentosRes.success || !categoriasRes.success) {
        toast.error('Erro ao carregar dados para DRE');
        return;
      }

      const lancamentos = lancamentosRes.data?.data || [];
      const categorias = categoriasRes.data || [];

      // Agrupar lançamentos por categoria
      const lancamentosPorCategoria = new Map<string, number>();
      
      lancamentos.forEach((lanc: any) => {
        if (lanc.categoriaId) {
          const atual = lancamentosPorCategoria.get(lanc.categoriaId) || 0;
          const valor = lanc.tipo === 'entrada' ? lanc.valor : -lanc.valor;
          lancamentosPorCategoria.set(lanc.categoriaId, atual + valor);
        }
      });

      // Construir estrutura hierárquica do DRE
      const receitas = categorias
        .filter(c => c.tipo === 'receita')
        .map(c => ({
          id: c.id,
          codigo: c.codigo,
          nome: c.nome,
          nivel: 1,
          tipo: 'conta' as const,
          valor: lancamentosPorCategoria.get(c.id) || 0,
          percentual: 0, // Será calculado depois
        }));

      const despesas = categorias
        .filter(c => c.tipo === 'despesa')
        .map(c => ({
          id: c.id,
          codigo: c.codigo,
          nome: c.nome,
          nivel: 1,
          tipo: 'conta' as const,
          valor: Math.abs(lancamentosPorCategoria.get(c.id) || 0),
          percentual: 0, // Será calculado depois
        }));

      const receitaBruta = receitas.reduce((sum, r) => sum + r.valor, 0);
      const custosOperacionais = despesas
        .filter(d => d.codigo?.startsWith('5'))
        .reduce((sum, d) => sum + d.valor, 0);
      const despesasOperacionais = despesas
        .filter(d => d.codigo?.startsWith('6'))
        .reduce((sum, d) => sum + d.valor, 0);

      const receitaLiquida = receitaBruta;
      const lucroBruto = receitaLiquida - custosOperacionais;
      const ebitda = lucroBruto - despesasOperacionais;
      const lucroLiquido = ebitda;

      // Calcular percentuais
      receitas.forEach(r => {
        r.percentual = receitaBruta > 0 ? (r.valor / receitaBruta) * 100 : 0;
      });
      despesas.forEach(d => {
        d.percentual = receitaBruta > 0 ? (d.valor / receitaBruta) * 100 : 0;
      });

      const dre: ItemDRE[] = [
        {
          id: '1',
          codigo: '3',
          nome: 'RECEITA OPERACIONAL BRUTA',
          nivel: 0,
          tipo: 'grupo',
          valor: receitaBruta,
          percentual: 100,
          children: receitas.filter(r => r.valor > 0),
        },
        {
          id: '2',
          codigo: '',
          nome: '= RECEITA OPERACIONAL LÍQUIDA',
          nivel: 0,
          tipo: 'grupo',
          valor: receitaLiquida,
          percentual: receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0,
        },
        {
          id: '3',
          codigo: '5',
          nome: '(-) CUSTOS OPERACIONAIS',
          nivel: 0,
          tipo: 'grupo',
          valor: -custosOperacionais,
          percentual: receitaBruta > 0 ? (-custosOperacionais / receitaBruta) * 100 : 0,
          children: despesas.filter(d => d.codigo?.startsWith('5') && d.valor > 0),
        },
        {
          id: '4',
          codigo: '',
          nome: '= LUCRO BRUTO',
          nivel: 0,
          tipo: 'grupo',
          valor: lucroBruto,
          percentual: receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0,
        },
        {
          id: '5',
          codigo: '6',
          nome: '(-) DESPESAS OPERACIONAIS',
          nivel: 0,
          tipo: 'grupo',
          valor: -despesasOperacionais,
          percentual: receitaBruta > 0 ? (-despesasOperacionais / receitaBruta) * 100 : 0,
          children: despesas.filter(d => d.codigo?.startsWith('6') && d.valor > 0),
        },
        {
          id: '6',
          codigo: '',
          nome: '= EBITDA',
          nivel: 0,
          tipo: 'grupo',
          valor: ebitda,
          percentual: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
        },
        {
          id: '7',
          codigo: '',
          nome: '= RESULTADO LÍQUIDO',
          nivel: 0,
          tipo: 'grupo',
          valor: lucroLiquido,
          percentual: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
        },
      ];

      setDreData(dre);
    } catch (err: any) {
      console.error('Erro ao carregar DRE:', err);
      toast.error('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  // Mock data DRE (fallback)
  const dreMock: ItemDRE[] = [
    {
      id: '1',
      codigo: '3',
      nome: 'RECEITA OPERACIONAL BRUTA',
      nivel: 0,
      tipo: 'grupo',
      valor: 145850,
      percentual: 100,
      children: [
        {
          id: '1.1',
          codigo: '3.1',
          nome: 'Receita de Aluguéis',
          nivel: 1,
          tipo: 'conta',
          valor: 135000,
          percentual: 92.6
        },
        {
          id: '1.2',
          codigo: '3.2',
          nome: 'Receita de Serviços',
          nivel: 1,
          tipo: 'conta',
          valor: 10850,
          percentual: 7.4
        }
      ]
    },
    {
      id: '2',
      codigo: '4',
      nome: '(-) DEDUÇÕES DA RECEITA',
      nivel: 0,
      tipo: 'grupo',
      valor: -7292.5,
      percentual: -5,
      children: [
        {
          id: '2.1',
          codigo: '4.1',
          nome: 'Impostos sobre Receita',
          nivel: 1,
          tipo: 'conta',
          valor: -7292.5,
          percentual: -5
        }
      ]
    },
    {
      id: '3',
      codigo: '',
      nome: '= RECEITA OPERACIONAL LÍQUIDA',
      nivel: 0,
      tipo: 'grupo',
      valor: 138557.5,
      percentual: 95
    },
    {
      id: '4',
      codigo: '5',
      nome: '(-) CUSTOS OPERACIONAIS',
      nivel: 0,
      tipo: 'grupo',
      valor: -29170,
      percentual: -20,
      children: [
        {
          id: '4.1',
          codigo: '5.1',
          nome: 'Manutenção e Reparos',
          nivel: 1,
          tipo: 'conta',
          valor: -12500,
          percentual: -8.6
        },
        {
          id: '4.2',
          codigo: '5.2',
          nome: 'Limpeza e Conservação',
          nivel: 1,
          tipo: 'conta',
          valor: -8420,
          percentual: -5.8
        },
        {
          id: '4.3',
          codigo: '5.3',
          nome: 'Condomínio',
          nivel: 1,
          tipo: 'conta',
          valor: -8250,
          percentual: -5.6
        }
      ]
    },
    {
      id: '5',
      codigo: '',
      nome: '= LUCRO BRUTO',
      nivel: 0,
      tipo: 'grupo',
      valor: 109387.5,
      percentual: 75
    },
    {
      id: '6',
      codigo: '6',
      nome: '(-) DESPESAS OPERACIONAIS',
      nivel: 0,
      tipo: 'grupo',
      valor: -31957.5,
      percentual: -21.9,
      children: [
        {
          id: '6.1',
          codigo: '6.1',
          nome: 'Despesas Administrativas',
          nivel: 1,
          tipo: 'conta',
          valor: -18500,
          percentual: -12.7
        },
        {
          id: '6.2',
          codigo: '6.2',
          nome: 'Despesas Comerciais',
          nivel: 1,
          tipo: 'conta',
          valor: -13457.5,
          percentual: -9.2
        }
      ]
    },
    {
      id: '7',
      codigo: '',
      nome: '= EBITDA',
      nivel: 0,
      tipo: 'grupo',
      valor: 77430,
      percentual: 53.1
    },
    {
      id: '8',
      codigo: '',
      nome: '= RESULTADO LÍQUIDO',
      nivel: 0,
      tipo: 'grupo',
      valor: 77430,
      percentual: 53.1
    }
  ];

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderDREItem = (item: ItemDRE, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isTotal = item.nome.startsWith('=');
    const isNegative = item.valor < 0;

    return (
      <div key={item.id}>
        <div
          className={`
            flex items-center gap-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg
            ${isTotal ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''}
            ${depth > 0 ? 'ml-8' : ''}
          `}
        >
          {/* Expand/Collapse */}
          <div className="w-6">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(item.id)}
                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Código */}
          <div className="w-16 text-sm text-gray-500">{item.codigo}</div>

          {/* Nome */}
          <div className="flex-1">
            <span className={isTotal ? 'text-blue-700 dark:text-blue-400' : ''}>
              {item.nome}
            </span>
          </div>

          {/* Valor */}
          <div className="w-40 text-right">
            <Money
              amount={item.valor}
              colorize={!isTotal}
              className={isTotal ? 'text-blue-700 dark:text-blue-400' : ''}
            />
          </div>

          {/* Percentual */}
          <div className="w-24 text-right">
            <span className={`text-sm ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {item.percentual?.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {item.children?.map((child) => renderDREItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const kpis = dreData.length > 0 ? {
    receitaBruta: dreData.find(d => d.codigo === '3')?.valor || 0,
    receitaLiquida: dreData.find(d => d.nome.includes('RECEITA OPERACIONAL LÍQUIDA'))?.valor || 0,
    ebitda: dreData.find(d => d.nome.includes('EBITDA'))?.valor || 0,
    lucroLiquido: dreData.find(d => d.nome.includes('RESULTADO LÍQUIDO'))?.valor || 0,
    margemBruta: dreData.find(d => d.nome.includes('LUCRO BRUTO'))?.percentual || 0,
    margemLiquida: dreData.find(d => d.nome.includes('RESULTADO LÍQUIDO'))?.percentual || 0,
  } : {
    receitaBruta: 0,
    receitaLiquida: 0,
    ebitda: 0,
    lucroLiquido: 0,
    margemBruta: 0,
    margemLiquida: 0,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">DRE Gerencial</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Demonstração do Resultado do Exercício
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard
            title="Receita Bruta"
            value={<Money amount={kpis.receitaBruta} />}
            icon={<DollarSign className="h-5 w-5" />}
            tone="info"
          />
          <KpiCard
            title="EBITDA"
            value={<Money amount={kpis.ebitda} />}
            hint={`${kpis.margemBruta}% margem`}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="success"
          />
          <KpiCard
            title="Lucro Líquido"
            value={<Money amount={kpis.lucroLiquido} />}
            hint={`${kpis.margemLiquida}% margem`}
            icon={<DollarSign className="h-5 w-5" />}
            tone="success"
          />
          <KpiCard
            title="Margem Líquida"
            value={`${kpis.margemLiquida.toFixed(1)}%`}
            trend={{ direction: 'up', pct: 3.2 }}
            tone="success"
          />
        </div>

        <PeriodPicker
          startDate={startDate}
          endDate={endDate}
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="consolidado">
          <TabsList>
            <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
            <TabsTrigger value="centro-custo">Por Centro de Custo</TabsTrigger>
            <TabsTrigger value="imovel">Por Imóvel</TabsTrigger>
          </TabsList>

          <TabsContent value="consolidado" className="mt-4">
            <Card className="p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Carregando DRE...</span>
                </div>
              ) : dreData.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <span className="text-gray-500">Nenhum dado encontrado para o período selecionado</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {dreData.map((item) => renderDREItem(item))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="centro-custo">
            <Card className="p-4">
              <p className="text-center text-gray-500 py-8">
                Visualização por centro de custo em desenvolvimento
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="imovel">
            <Card className="p-4">
              <p className="text-center text-gray-500 py-8">
                Visualização por imóvel em desenvolvimento
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default DREPage;
