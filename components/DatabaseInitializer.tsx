import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Database, CheckCircle2, AlertCircle, Loader2, RefreshCw, Building2, Home } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { devApi } from '../utils/api';
import { toast } from 'sonner';

export function DatabaseInitializer() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'old'>('new');

  const seedDatabaseOld = async () => {
    setStatus('loading');
    setMessage('Populando banco de dados com estrutura ANTIGA...');

    try {
      const response = await devApi.seedDatabase();

      if (!response.success) {
        throw new Error(response.error || 'Erro ao popular banco de dados');
      }

      setStatus('success');
      setMessage('Banco de dados populado com ESTRUTURA ANTIGA!');
      setStats(response.data);
      toast.success('Banco de dados inicializado (estrutura antiga)!', {
        description: `${response.data?.propertiesCount} propriedades criadas.`,
      });

      // Recarregar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao inicializar banco de dados', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const seedDatabaseNew = async () => {
    setStatus('loading');
    setMessage('Populando banco de dados com NOVA ESTRUTURA (Location → Accommodation)...');

    try {
      const response = await devApi.seedDatabaseNew();

      if (!response.success) {
        throw new Error(response.error || 'Erro ao popular banco de dados');
      }

      setStatus('success');
      setMessage('Banco de dados populado com NOVA ESTRUTURA!');
      setStats(response.data);
      toast.success('Banco de dados inicializado (nova estrutura)!', {
        description: `${response.data?.locationsCount} locations, ${response.data?.accommodationsCount} accommodations criadas.`,
      });

      // Recarregar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao inicializar banco de dados', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>Inicialização do Banco de Dados</CardTitle>
        </div>
        <CardDescription>
          Escolha a estrutura de dados e popule o banco com dados de exemplo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        {status !== 'idle' && (
          <Alert variant={status === 'error' ? 'destructive' : 'default'}>
            {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {status === 'error' && <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Stats - NOVA ESTRUTURA */}
        {stats && stats.locationsCount !== undefined && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="text-center col-span-2">
              <div className="text-xs uppercase tracking-wide text-blue-600 mb-2">
                ✨ Nova Estrutura: Location → Accommodation
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.locationsCount}</div>
              <div className="text-sm text-muted-foreground">Locations (Prédios)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.accommodationsCount}</div>
              <div className="text-sm text-muted-foreground">Accommodations</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-blue-600">{stats.linkedAccommodations}</div>
              <div className="text-xs text-muted-foreground">Vinculadas</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-orange-600">{stats.standaloneAccommodations}</div>
              <div className="text-xs text-muted-foreground">Standalone</div>
            </div>
          </div>
        )}

        {/* Stats - ESTRUTURA ANTIGA */}
        {stats && stats.propertiesCount !== undefined && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.propertiesCount}</div>
              <div className="text-sm text-muted-foreground">Propriedades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.guestsCount}</div>
              <div className="text-sm text-muted-foreground">Hóspedes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.reservationsCount}</div>
              <div className="text-sm text-muted-foreground">Reservas</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'old')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <Building2 className="h-4 w-4" />
              Nova Estrutura
            </TabsTrigger>
            <TabsTrigger value="old" className="gap-2">
              <Home className="h-4 w-4" />
              Antiga (Compatibilidade)
            </TabsTrigger>
          </TabsList>

          {/* NOVA ESTRUTURA */}
          <TabsContent value="new" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-blue-900">Arquitetura: Location → Accommodation</h4>
                  <p className="text-sm text-blue-700">
                    Esta é a <strong>estrutura recomendada</strong> que implementa a hierarquia de 2 níveis conforme especificação da manus.im
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm space-y-3">
              <p><strong>📍 3 Locations (Prédios/Condomínios):</strong></p>
              <ul className="list-disc list-inside space-y-1.5 ml-2 text-muted-foreground">
                <li><strong>Edifício Copacabana Palace</strong> (COP) - Av. Atlântica, Copacabana
                  <ul className="list-circle list-inside ml-6 mt-1 space-y-0.5">
                    <li>Apartamento 201 (2 quartos, R$ 350/noite)</li>
                    <li>Apartamento 305 (1 quarto, R$ 250/noite)</li>
                  </ul>
                </li>
                <li><strong>Condomínio Ipanema Residence</strong> (IPA) - Ipanema
                  <ul className="list-circle list-inside ml-6 mt-1 space-y-0.5">
                    <li>Casa 5 (4 quartos, R$ 800/noite)</li>
                  </ul>
                </li>
                <li><strong>Residencial Barra Beach</strong> (BAR) - Barra da Tijuca
                  <ul className="list-circle list-inside ml-6 mt-1 space-y-0.5">
                    <li>Cobertura Duplex (5 quartos, R$ 1.200/noite)</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground">
                <strong>➕ 1 Accommodation standalone:</strong> Loft Botafogo (sem Location)
              </p>
              <p className="mt-2 text-muted-foreground">
                <strong>Também incluídos:</strong> Hóspedes e reservas de teste
              </p>
            </div>

            <Button
              onClick={seedDatabaseNew}
              disabled={status === 'loading'}
              className="w-full"
              size="lg"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populando...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Popular com Nova Estrutura
                </>
              )}
            </Button>
          </TabsContent>

          {/* ESTRUTURA ANTIGA */}
          <TabsContent value="old" className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-orange-900">Estrutura Simples (Apenas Properties)</h4>
                  <p className="text-sm text-orange-700">
                    Estrutura anterior sem hierarquia de Locations. Use apenas para compatibilidade ou testes.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>🏠 5 Propriedades independentes:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Apartamento Copacabana 201 (COP201) - 2 quartos, R$ 350/noite</li>
                <li>Casa Ipanema Premium (IPA001) - 4 quartos, R$ 800/noite</li>
                <li>Studio Leblon Compacto (LEB100) - 1 quarto, R$ 250/noite</li>
                <li>Cobertura Barra da Tijuca (BAR300) - 5 quartos, R$ 1.200/noite</li>
                <li>Loft Botafogo Moderno (BOT050) - 1 quarto, R$ 280/noite</li>
              </ul>
              <p className="mt-3">
                <strong>Também serão criados:</strong> 4 hóspedes de exemplo e 3 reservas de teste
              </p>
            </div>

            <Button
              onClick={seedDatabaseOld}
              disabled={status === 'loading'}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populando...
                </>
              ) : (
                <>
                  <Home className="mr-2 h-4 w-4" />
                  Popular com Estrutura Antiga
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Warning */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Nota:</strong> Esta é uma ferramenta de desenvolvimento. Os dados criados são
            apenas para testes e demonstração do sistema.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
