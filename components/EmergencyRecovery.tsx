/**
 * RENDIZY - Emergency Recovery Page
 * 
 * Página de emergência para recuperar acesso ao sistema
 * quando ocorre erro de navegação
 * 
 * @version v1.0.103.263
 * @date 2025-11-03
 */

import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle, Calendar, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function EmergencyRecovery() {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Dashboard',
      description: 'Voltar para o painel principal',
      icon: Home,
      path: '/',
      color: 'text-blue-500'
    },
    {
      title: 'Calendário',
      description: 'Ver agenda de reservas',
      icon: Calendar,
      path: '/calendario',
      color: 'text-green-500'
    },
    {
      title: 'Reservas',
      description: 'Gerenciar reservas',
      icon: Building2,
      path: '/reservations',
      color: 'text-purple-500'
    },
    {
      title: 'Locais e Anúncios',
      description: 'Gerenciar imóveis',
      icon: Building2,
      path: '/locations',
      color: 'text-orange-500'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Ops! Página não encontrada
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Não se preocupe, vamos te ajudar a voltar ao sistema
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2"
                onClick={() => navigate(action.path)}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${action.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{action.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alternative Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Outras opções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para página anterior
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.location.reload()}
            >
              <AlertTriangle className="w-4 h-4" />
              Recarregar a página
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Se o problema persistir, entre em contato com o suporte
          </p>
          <p className="mt-1 font-mono text-xs">
            Erro: Rota não encontrada | v1.0.103.263
          </p>
        </div>
      </div>
    </div>
  );
}
