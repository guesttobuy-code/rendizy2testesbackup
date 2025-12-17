import React, { useState } from 'react';
import { 
  Crown, 
  Building2, 
  Users, 
  Settings,
  Database,
  BarChart3,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
  Activity,
  Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { TenantManagement } from './TenantManagement';
import { Separator } from './ui/separator';
import { FigmaTestPropertyCreator } from './FigmaTestPropertyCreator';

interface AdminMasterProps {
  onNavigate?: (module: string) => void;
}

export function AdminMaster({ onNavigate }: AdminMasterProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Stats globais do sistema
  const globalStats = {
    totalOrganizations: 143,
    activeOrganizations: 98,
    trialOrganizations: 28,
    totalUsers: 1247,
    totalProperties: 3456,
    totalReservations: 12389,
    mrr: 89700, // Monthly Recurring Revenue
    growth: 23.5, // % crescimento
    systemHealth: 99.8,
    apiCalls: 234567
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Crown className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Master</h1>
                <p className="text-purple-100 mt-1">
                  Painel de Controle RENDIZY
                </p>
              </div>
            </div>
          </div>
          
          <Badge className="bg-white text-purple-700 text-sm px-4 py-2">
            Usuário Master
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-6">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="organizations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Imobiliárias
              </TabsTrigger>
              <TabsTrigger 
                value="system"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Database className="h-4 w-4 mr-2" />
                Sistema
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 p-8">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total de Imobiliárias</CardDescription>
                    <CardTitle className="text-3xl">{globalStats.totalOrganizations}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +{globalStats.growth}% este mês
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Imobiliárias Ativas</CardDescription>
                    <CardTitle className="text-3xl">{globalStats.activeOrganizations}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-600">
                      <Activity className="h-4 w-4 mr-1" />
                      {((globalStats.activeOrganizations / globalStats.totalOrganizations) * 100).toFixed(1)}% do total
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>MRR (Receita Mensal)</CardDescription>
                    <CardTitle className="text-3xl">
                      R$ {(globalStats.mrr / 1000).toFixed(0)}k
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-green-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      +R$ 15k vs mês anterior
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Trial (30 dias)</CardDescription>
                    <CardTitle className="text-3xl">{globalStats.trialOrganizations}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-blue-600">
                      <Zap className="h-4 w-4 mr-1" />
                      Conversão ~68%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Total de Usuários
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{globalStats.totalUsers.toLocaleString()}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Total de Imóveis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{globalStats.totalProperties.toLocaleString()}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Total de Reservas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{globalStats.totalReservations.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Status do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Uptime</span>
                        <span className="text-sm font-semibold text-green-600">
                          {globalStats.systemHealth}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${globalStats.systemHealth}%` }}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">API Calls (24h)</p>
                        <p className="text-lg font-semibold">{globalStats.apiCalls.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Avg Response</p>
                        <p className="text-lg font-semibold">125ms</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Erros (24h)</p>
                        <p className="text-lg font-semibold text-green-600">0.02%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>
                    Acesso rápido às funções administrativas principais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => setActiveTab('organizations')}
                    >
                      <Building2 className="h-6 w-6" />
                      <span>Gerenciar Imobiliárias</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => onNavigate?.('backend-tester')}
                    >
                      <Database className="h-6 w-6" />
                      <span>Backend Tester</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => setActiveTab('system')}
                    >
                      <Activity className="h-6 w-6" />
                      <span>Monitoramento</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="m-0">
            <TenantManagement />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="m-0 p-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🧪 Teste Automatizado: Criar Imóvel "@figma@"</CardTitle>
                  <CardDescription>
                    Teste completo do wizard de criação de imóveis com dados fictícios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FigmaTestPropertyCreator />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monitoramento do Sistema</CardTitle>
                  <CardDescription>
                    Logs, métricas e performance em tempo real
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Painel de monitoramento em desenvolvimento</p>
                    <p className="text-sm mt-2">
                      Em breve: Logs de sistema, métricas de performance, alertas
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="m-0 p-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Globais</CardTitle>
                  <CardDescription>
                    Configurações que afetam todo o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Configurações globais em desenvolvimento</p>
                    <p className="text-sm mt-2">
                      Em breve: Configurações de email, billing, integrações
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
