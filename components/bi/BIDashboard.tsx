import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react';

export default function BIDashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Dashboard BI & Relatórios</h1>
          <div className="flex gap-2">
            <Badge variant="outline">Outubro 2025</Badge>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Alterar Período
            </Button>
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Novo Relatório
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Business Intelligence e relatórios dinâmicos para tomada de decisão
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receita Total */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Mês)</CardTitle>
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              R$ 145.8k
            </div>
            <p className="text-sm text-green-600 font-medium mt-2">
              +12.5% vs. período anterior
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Ocupação */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Ocupação</CardTitle>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              78.5%
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              +5.2% vs. mês anterior
            </p>
          </CardContent>
        </Card>

        {/* ADR (Diária Média) */}
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ADR (Diária Média)</CardTitle>
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
              R$ 485
            </div>
            <p className="text-sm text-indigo-600 font-medium mt-2">
              +R$ 32 vs. média anual
            </p>
          </CardContent>
        </Card>

        {/* RevPAR */}
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RevPAR</CardTitle>
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
              R$ 381
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              78.5% × R$ 485
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button variant="outline" className="h-24 flex-col gap-2">
          <BarChart3 className="w-6 h-6" />
          <span>Relatório de Ocupação</span>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2">
          <DollarSign className="w-6 h-6" />
          <span>Relatório Financeiro</span>
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2">
          <LineChart className="w-6 h-6" />
          <span>Análise de Tendências</span>
        </Button>
      </div>

      {/* Construtor de Relatórios Dinâmicos */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <CardTitle>Construtor de Relatórios Dinâmicos</CardTitle>
            <Badge className="ml-auto">NOVO</Badge>
          </div>
          <CardDescription>
            Crie relatórios personalizados com drag-and-drop de métricas, filtros e visualizações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <div>
                <p className="font-medium">Iniciar Novo Relatório</p>
                <p className="text-sm text-muted-foreground">Interface drag-and-drop intuitiva</p>
              </div>
              <Button>Criar Agora</Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Métricas Disponíveis</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-2xl font-bold">8</p>
                <p className="text-xs text-muted-foreground">Tipos de Gráficos</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground">Combinações</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Módulo em Beta */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600">BETA</Badge>
            <CardTitle>Módulo BI em Desenvolvimento</CardTitle>
          </div>
          <CardDescription>
            Estamos construindo uma solução completa de Business Intelligence com relatórios dinâmicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">✅ Dashboard com KPIs principais</p>
            <p className="text-sm">🚧 Construtor de Relatórios Dinâmicos (em breve)</p>
            <p className="text-sm">🚧 Análise de Tendências (em breve)</p>
            <p className="text-sm">🚧 Relatórios Comparativos (em breve)</p>
            <p className="text-sm">🚧 Previsões com IA (em breve)</p>
            <p className="text-sm">🚧 Agendamento de Relatórios (em breve)</p>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita por Canal</CardTitle>
            <CardDescription>Distribuição últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Ocupação (12 meses)</CardTitle>
            <CardDescription>Evolução mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
