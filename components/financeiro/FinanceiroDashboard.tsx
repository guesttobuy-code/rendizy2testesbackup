import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

export default function FinanceiroDashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
          <div className="flex gap-2">
            <Badge variant="outline">Outubro 2025</Badge>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Alterar Período
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Visão geral da saúde financeira do seu negócio
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receita Total */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              R$ 145.850,00
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">+12.5%</span>
              <span className="text-sm text-muted-foreground">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              R$ 68.420,00
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowDownRight className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600 font-medium">-8.2%</span>
              <span className="text-sm text-muted-foreground">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              R$ 77.430,00
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">53.1% margem</span>
            </div>
          </CardContent>
        </Card>

        {/* Inadimplência */}
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
              R$ 12.350,00
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-orange-600 font-medium">8.5% do total</span>
              <Badge variant="destructive" className="ml-auto">12 títulos</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <CardTitle>Ações Necessárias</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div>
              <p className="font-medium">8 contas a pagar vencendo hoje</p>
              <p className="text-sm text-muted-foreground">Total: R$ 15.420,00</p>
            </div>
            <Button size="sm">Ver Contas</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <p className="font-medium">12 títulos em atraso</p>
              <p className="text-sm text-muted-foreground">Total: R$ 12.350,00</p>
            </div>
            <Button size="sm" variant="destructive">Cobrar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Módulo em Beta */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600">BETA</Badge>
            <CardTitle>Módulo Financeiro em Desenvolvimento</CardTitle>
          </div>
          <CardDescription>
            Estamos construindo uma solução completa de gestão financeira. As telas a seguir são placeholders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">✅ Dashboard com KPIs principais</p>
            <p className="text-sm">🚧 Plano de Contas (em breve)</p>
            <p className="text-sm">🚧 Lançamentos (em breve)</p>
            <p className="text-sm">🚧 Contas a Receber/Pagar (em breve)</p>
            <p className="text-sm">🚧 Conciliação Bancária (em breve)</p>
            <p className="text-sm">🚧 Relatórios DRE e Fluxo de Caixa (em breve)</p>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas (12 meses)</CardTitle>
            <CardDescription>Evolução mensal comparativa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição dos gastos</CardDescription>
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
