/**
 * RENDIZY - Database Reset Tool
 * 
 * Ferramenta para resetar o banco de dados e remover dados de teste
 * 
 * ⚠️ ATENÇÃO: Esta ferramenta DELETA DADOS permanentemente!
 * 
 * @version 1.0.103.267
 * @date 2025-11-03
 */

import { useState } from 'react';
import { Trash2, AlertTriangle, Database, CheckCircle2, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useAuth } from '../src/contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ResetStats {
  total_records: number;
  breakdown: Record<string, number>;
}

export function DatabaseResetTool() {
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [stats, setStats] = useState<ResetStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  // Verificar status do banco
  const checkDatabaseStatus = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/reset/status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao verificar status do banco');
      }

      const data = await response.json();
      setStats(data);
      
      toast.success(`${data.total_records} registros encontrados no banco`);
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      toast.error(error.message || 'Erro ao verificar status do banco');
    } finally {
      setLoadingStats(false);
    }
  };

  // Realizar reset completo
  const performReset = async () => {
    if (confirmText !== 'DELETE_ALL_DATA') {
      toast.error('Digite "DELETE_ALL_DATA" para confirmar');
      return;
    }

    if (!currentOrganization?.id) {
      toast.error('Organização não identificada');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/reset/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            confirmation: 'DELETE_ALL_DATA',
            organizationId: currentOrganization.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao resetar banco de dados');
      }

      const data = await response.json();
      
      setResetComplete(true);
      setConfirmText('');
      setStats(null);
      
      toast.success(data.message, {
        description: `${data.total_deleted} registros deletados`,
        duration: 5000,
      });

      // Recarregar página após 3 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error: any) {
      console.error('❌ Erro ao resetar banco:', error);
      toast.error(error.message || 'Erro ao resetar banco de dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl">
          <Database className="h-6 w-6" />
          Reset do Banco de Dados
        </h1>
        <p className="text-sm text-muted-foreground">
          Ferramenta para limpar todos os dados de teste e começar do zero
        </p>
      </div>

      <Separator />

      {/* Alert de Aviso */}
      <Alert className="border-destructive bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm">
          <strong>⚠️ ATENÇÃO:</strong> Esta ação é <strong>IRREVERSÍVEL</strong> e deletará{' '}
          <strong>TODOS os dados</strong> do seu banco de dados, incluindo:
          <ul className="mt-2 ml-4 space-y-1">
            <li>• Todas as propriedades e anúncios</li>
            <li>• Todas as reservas e bloqueios</li>
            <li>• Todos os clientes e hóspedes</li>
            <li>• Todas as conversas do chat</li>
            <li>• Todos os preços e configurações</li>
          </ul>
          <br />
          <strong>Serão mantidos apenas:</strong>
          <ul className="mt-2 ml-4 space-y-1">
            <li>• Sua organização/imobiliária</li>
            <li>• Seus usuários e permissões</li>
            <li>• Suas sessões ativas</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Status do Banco */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status Atual do Banco</CardTitle>
              <CardDescription>
                Verifique quantos registros existem antes de resetar
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkDatabaseStatus}
              disabled={loadingStats}
            >
              {loadingStats ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Verificar Status
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {stats && (
          <CardContent>
            <div className="space-y-4">
              {/* Total */}
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Registros</span>
                  <Badge variant="secondary" className="text-base">
                    {stats.total_records.toLocaleString('pt-BR')}
                  </Badge>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(stats.breakdown)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10) // Mostrar apenas os 10 primeiros
                  .map(([prefix, count]) => (
                    <div
                      key={prefix}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="text-xs text-muted-foreground truncate">
                        {prefix}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>

              {Object.keys(stats.breakdown).filter(
                (k) => stats.breakdown[k] > 0
              ).length > 10 && (
                <p className="text-xs text-center text-muted-foreground">
                  + {Object.keys(stats.breakdown).filter((k) => stats.breakdown[k] > 0).length - 10}{' '}
                  outros tipos de dados...
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Confirmação de Reset */}
      {!resetComplete && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Reset do Banco
            </CardTitle>
            <CardDescription>
              Digite <strong>"DELETE_ALL_DATA"</strong> para confirmar a exclusão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="DELETE_ALL_DATA"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-mono"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Copie e cole: <code className="px-2 py-1 bg-muted rounded">DELETE_ALL_DATA</code>
              </p>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={performReset}
              disabled={loading || confirmText !== 'DELETE_ALL_DATA'}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando todos os dados...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  DELETAR TODOS OS DADOS
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sucesso */}
      {resetComplete && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  ✅ Banco de Dados Resetado com Sucesso!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Todos os dados de teste foram removidos.
                  <br />
                  Você será redirecionado para a página inicial em instantes...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>💡 Dica:</strong> Após o reset, você pode:
          <ul className="mt-2 ml-4 space-y-1">
            <li>• Cadastrar suas propriedades reais do zero</li>
            <li>• Importar dados de planilhas CSV</li>
            <li>• Conectar integrações (Booking.com, Airbnb, etc)</li>
            <li>• Configurar seu site customizado para clientes</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default DatabaseResetTool;
