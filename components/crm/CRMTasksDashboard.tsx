import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Users,
  UserPlus,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Mail,
  Phone,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function CRMTasksDashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Dashboard CRM & Tasks</h1>
          <div className="flex gap-2">
            <Badge variant="outline">Outubro 2025</Badge>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Alterar Período
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Visão unificada de clientes, leads, vendas e tarefas
        </p>
      </div>

      {/* KPIs CRM */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          CRM - Clientes e Vendas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Contatos */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contatos</CardTitle>
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                156
              </div>
              <p className="text-sm text-purple-600 font-medium mt-2">
                +12 novos este mês
              </p>
            </CardContent>
          </Card>

          {/* Leads Ativos */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                32
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                15 com alta probabilidade
              </p>
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                R$ 285k
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                18 negócios em andamento
              </p>
            </CardContent>
          </Card>

          {/* Taxa de Conversão */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                23.5%
              </div>
              <p className="text-sm text-green-600 font-medium mt-2">
                +3.2% vs. mês anterior
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPIs Tasks */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          Tasks - Gestão de Tarefas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tarefas Ativas */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Ativas</CardTitle>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                24
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                8 atribuídas a você
              </p>
            </CardContent>
          </Card>

          {/* Atrasadas */}
          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                5
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Necessitam atenção urgente
              </p>
            </CardContent>
          </Card>

          {/* Concluídas */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas (Mês)</CardTitle>
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                142
              </div>
              <p className="text-sm text-green-600 font-medium mt-2">
                +18% vs. mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Vencendo Hoje */}
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencendo Hoje</CardTitle>
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                7
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                3 de alta prioridade
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ações Pendentes CRM */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <CardTitle>Ações Pendentes (CRM)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">5 e-mails para enviar</p>
                <p className="text-sm text-muted-foreground">Follow-up de propostas</p>
              </div>
            </div>
            <Button size="sm">Enviar</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium">3 ligações agendadas</p>
                <p className="text-sm text-muted-foreground">Contatos com alta prioridade</p>
              </div>
            </div>
            <Button size="sm">Ver Agenda</Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas Tasks */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <CardTitle>Tarefas Urgentes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <p className="font-medium">5 tarefas atrasadas</p>
              <p className="text-sm text-muted-foreground">Requerem atenção imediata</p>
            </div>
            <Button size="sm" variant="destructive">Ver Tarefas</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div>
              <p className="font-medium">7 tarefas vencendo hoje</p>
              <p className="text-sm text-muted-foreground">3 de alta prioridade</p>
            </div>
            <Button size="sm">Ver Tarefas</Button>
          </div>
        </CardContent>
      </Card>

      {/* Módulo em Beta */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600">BETA</Badge>
            <CardTitle>Módulo CRM & Tasks em Desenvolvimento</CardTitle>
          </div>
          <CardDescription>
            Sistema unificado de gestão de clientes e tarefas. As telas a seguir são placeholders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <p className="text-sm font-semibold mb-2 text-purple-700 dark:text-purple-400">CRM:</p>
              <p className="text-sm">✅ Dashboard com KPIs</p>
              <p className="text-sm">🚧 Gestão de Contatos (em breve)</p>
              <p className="text-sm">🚧 Pipeline de Vendas (em breve)</p>
              <p className="text-sm">🚧 Gestão de Leads (em breve)</p>
              <p className="text-sm">🚧 Propostas e Negócios (em breve)</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-400">Tasks:</p>
              <p className="text-sm">✅ Dashboard com KPIs</p>
              <p className="text-sm">🚧 Minhas Tarefas (em breve)</p>
              <p className="text-sm">🚧 Calendário de Tarefas (em breve)</p>
              <p className="text-sm">🚧 Gestão de Equipes (em breve)</p>
              <p className="text-sm">🚧 Relatórios (em breve)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Vendas</CardTitle>
            <CardDescription>Distribuição por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtividade por Equipe</CardTitle>
            <CardDescription>Tarefas concluídas nos últimos 30 dias</CardDescription>
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
