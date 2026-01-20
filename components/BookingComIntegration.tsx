/**
 * RENDIZY - Booking.com Integration Component
 * 
 * Interface para configurar e gerenciar integração com Booking.com
 * Channel Manager completo com sincronização bidirecional
 * 
 * @version 1.0.76
 * @date 2025-10-28
 */

import React, { useState, useEffect } from 'react';
import {
  Link,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Download,
  Calendar,
  DollarSign,
  Home,
  Users,
  Activity,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';
import {
  BookingComConfig,
  BookingComAPIClient,
  BookingComSyncManager,
  BookingComCredentials
} from '../utils/bookingcom/api';

interface PropertyMapping {
  rendlzyPropertyId: string;
  rendizzyPropertyName: string;
  bookingComHotelId: string;
  bookingComHotelName: string;
  enabled: boolean;
  lastSync?: string;
  syncStatus?: 'success' | 'error' | 'pending';
}

interface SyncLog {
  timestamp: string;
  type: 'reservation' | 'price' | 'availability';
  direction: 'push' | 'pull';
  status: 'success' | 'error';
  message: string;
  details?: any;
}

export function BookingComIntegration() {
  // Estado de configuração
  const [config, setConfig] = useState<BookingComConfig>({
    enabled: false,
    credentials: {
      hotelId: '',
      username: '',
      password: '',
    },
    syncInterval: 30, // 30 minutos
    autoAcceptReservations: true,
    pushPrices: true,
    pushAvailability: true,
    pullReservations: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Mapeamento de propriedades
  const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>([]);
  
  // Logs de sincronização
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Estatísticas
  const [stats, setStats] = useState({
    totalReservations: 0,
    lastSync: null as string | null,
    syncStatus: 'idle' as 'idle' | 'syncing' | 'error',
    reservationsToday: 0,
    avgSyncTime: 0,
  });

  // Gerenciador de sincronização
  const [syncManager, setSyncManager] = useState<BookingComSyncManager | null>(null);

  // Carregar configuração salva
  useEffect(() => {
    loadConfig();
    loadPropertyMappings();
    loadSyncLogs();
  }, []);

  // Inicializar sync manager quando config mudar
  useEffect(() => {
    if (config.enabled && config.credentials.hotelId) {
      const manager = new BookingComSyncManager(config);
      setSyncManager(manager);
      manager.startAutoSync();

      return () => {
        manager.stopAutoSync();
      };
    }
  }, [config]);

  const loadConfig = () => {
    const saved = localStorage.getItem('rendizy-bookingcom-config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  };

  const loadPropertyMappings = () => {
    const saved = localStorage.getItem('rendizy-bookingcom-mappings');
    if (saved) {
      setPropertyMappings(JSON.parse(saved));
    }
  };

  const loadSyncLogs = () => {
    const saved = localStorage.getItem('rendizy-bookingcom-logs');
    if (saved) {
      setSyncLogs(JSON.parse(saved));
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('rendizy-bookingcom-config', JSON.stringify(config));
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configuração');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.credentials.hotelId || !config.credentials.username || !config.credentials.password) {
      toast.error('Preencha todas as credenciais antes de testar');
      return;
    }

    setIsTesting(true);
    setConnectionStatus('untested');

    try {
      const client = new BookingComAPIClient(config.credentials);
      const success = await client.testConnection();

      if (success) {
        setConnectionStatus('success');
        toast.success('✅ Conexão com Booking.com estabelecida!');
      } else {
        setConnectionStatus('error');
        toast.error('❌ Falha ao conectar com Booking.com');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error(`Erro: ${error.message}`);
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  const manualSync = async () => {
    if (!syncManager) {
      toast.error('Configuração não habilitada');
      return;
    }

    setIsSyncing(true);
    try {
      await syncManager.sync();
      toast.success('✅ Sincronização manual concluída!');
      
      // Atualizar logs
      const newLog: SyncLog = {
        timestamp: new Date().toISOString(),
        type: 'reservation',
        direction: 'pull',
        status: 'success',
        message: 'Sincronização manual executada com sucesso',
      };
      const updatedLogs = [newLog, ...syncLogs].slice(0, 50); // Mantém últimos 50
      setSyncLogs(updatedLogs);
      localStorage.setItem('rendizy-bookingcom-logs', JSON.stringify(updatedLogs));
    } catch (error: any) {
      toast.error(`Erro na sincronização: ${error.message}`);
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Integração Booking.com</h1>
          <p className="text-neutral-400 mt-1">
            Channel Manager completo com sincronização bidirecional
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={config.enabled ? 'default' : 'secondary'} className="gap-1">
            {config.enabled ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Ativa
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inativa
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Alert de status */}
      {config.enabled && connectionStatus === 'success' && (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Conectado ao Booking.com. Sincronização automática ativa a cada {config.syncInterval} minutos.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert sobre Status da API */}
      <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
        <Activity className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Monitore o status da API do Booking.com em tempo real</span>
            <a
              href="https://status.booking.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 underline flex items-center gap-1 ml-4"
            >
              status.booking.com
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </AlertDescription>
      </Alert>

      {/* Tabs principais */}
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-[#2a2d3a]">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="mappings">
            <Link className="h-4 w-4 mr-2" />
            Mapeamentos
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Activity className="h-4 w-4 mr-2" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-6">
          <Card className="bg-[#1e2029] border-[#2a2d3a]">
            <CardHeader>
              <CardTitle className="text-white">Credenciais Booking.com</CardTitle>
              <CardDescription>
                Conecte sua conta do Booking.com Connectivity API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hotelId" className="text-neutral-300">Hotel ID</Label>
                <Input
                  id="hotelId"
                  placeholder="Ex: 1234567"
                  value={config.credentials.hotelId}
                  onChange={(e) => setConfig({
                    ...config,
                    credentials: { ...config.credentials, hotelId: e.target.value }
                  })}
                  className="bg-[#2a2d3a] border-[#363945] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-neutral-300">Username</Label>
                <Input
                  id="username"
                  placeholder="Seu username da API"
                  value={config.credentials.username}
                  onChange={(e) => setConfig({
                    ...config,
                    credentials: { ...config.credentials, username: e.target.value }
                  })}
                  className="bg-[#2a2d3a] border-[#363945] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha da API"
                    value={config.credentials.password}
                    onChange={(e) => setConfig({
                      ...config,
                      credentials: { ...config.credentials, password: e.target.value }
                    })}
                    className="bg-[#2a2d3a] border-[#363945] text-white pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator className="bg-[#363945]" />

              <div className="flex items-center justify-between">
                <Button
                  onClick={testConnection}
                  disabled={isTesting}
                  variant="outline"
                  className="gap-2"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                {connectionStatus !== 'untested' && (
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'success' ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-green-400">Conexão OK</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-400" />
                        <span className="text-red-400">Falha na conexão</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e2029] border-[#2a2d3a]">
            <CardHeader>
              <CardTitle className="text-white">Opções de Sincronização</CardTitle>
              <CardDescription>
                Configure como e quando sincronizar dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled" className="text-neutral-300">Habilitar Integração</Label>
                  <p className="text-sm text-neutral-500">Ativa sincronização automática</p>
                </div>
                <Switch
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                />
              </div>

              <Separator className="bg-[#363945]" />

              <div className="space-y-2">
                <Label htmlFor="syncInterval" className="text-neutral-300">
                  Intervalo de Sincronização (minutos)
                </Label>
                <Select
                  value={config.syncInterval.toString()}
                  onValueChange={(value) => setConfig({ ...config, syncInterval: parseInt(value) })}
                >
                  <SelectTrigger className="bg-[#2a2d3a] border-[#363945] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-[#363945]" />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-neutral-300">Importar Reservas</Label>
                  <p className="text-sm text-neutral-500">Pull de reservas do Booking.com</p>
                </div>
                <Switch
                  checked={config.pullReservations}
                  onCheckedChange={(pullReservations) => setConfig({ ...config, pullReservations })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-neutral-300">Exportar Preços</Label>
                  <p className="text-sm text-neutral-500">Push de preços para Booking.com</p>
                </div>
                <Switch
                  checked={config.pushPrices}
                  onCheckedChange={(pushPrices) => setConfig({ ...config, pushPrices })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-neutral-300">Exportar Disponibilidade</Label>
                  <p className="text-sm text-neutral-500">Push de disponibilidade para Booking.com</p>
                </div>
                <Switch
                  checked={config.pushAvailability}
                  onCheckedChange={(pushAvailability) => setConfig({ ...config, pushAvailability })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-neutral-300">Auto-confirmar Reservas</Label>
                  <p className="text-sm text-neutral-500">Aceita automaticamente novas reservas</p>
                </div>
                <Switch
                  checked={config.autoAcceptReservations}
                  onCheckedChange={(autoAcceptReservations) => setConfig({ ...config, autoAcceptReservations })}
                />
              </div>

              <Separator className="bg-[#363945]" />

              <Button onClick={saveConfig} disabled={isSaving} className="w-full gap-2">
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mapeamentos */}
        <TabsContent value="mappings" className="space-y-6">
          <Card className="bg-[#1e2029] border-[#2a2d3a]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Mapeamento de Propriedades</CardTitle>
                  <CardDescription>
                    Vincule seus imóveis RENDIZY com hotels do Booking.com
                  </CardDescription>
                </div>
                <Button variant="outline" className="gap-2">
                  <Link className="h-4 w-4" />
                  Novo Mapeamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {propertyMappings.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400">Nenhum mapeamento configurado</p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Crie mapeamentos para sincronizar suas propriedades
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#363945]">
                      <TableHead className="text-neutral-400">Propriedade RENDIZY</TableHead>
                      <TableHead className="text-neutral-400">Hotel Booking.com</TableHead>
                      <TableHead className="text-neutral-400">Status</TableHead>
                      <TableHead className="text-neutral-400">Última Sync</TableHead>
                      <TableHead className="text-neutral-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertyMappings.map((mapping, index) => (
                      <TableRow key={index} className="border-[#363945]">
                        <TableCell className="text-white">{mapping.rendizzyPropertyName}</TableCell>
                        <TableCell className="text-neutral-300">{mapping.bookingComHotelName}</TableCell>
                        <TableCell>
                          <Badge variant={mapping.enabled ? 'default' : 'secondary'}>
                            {mapping.enabled ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-neutral-400">
                          {mapping.lastSync || 'Nunca'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Sincronização */}
        <TabsContent value="sync" className="space-y-6">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#1e2029] border-[#2a2d3a]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-400">Total Reservas</p>
                    <h3 className="text-2xl text-white mt-1">{stats.totalReservations}</h3>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1e2029] border-[#2a2d3a]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-400">Hoje</p>
                    <h3 className="text-2xl text-white mt-1">{stats.reservationsToday}</h3>
                  </div>
                  <Calendar className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1e2029] border-[#2a2d3a]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-400">Última Sync</p>
                    <h3 className="text-sm text-white mt-1">
                      {stats.lastSync ? new Date(stats.lastSync).toLocaleString('pt-BR') : 'Nunca'}
                    </h3>
                  </div>
                  <Clock className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1e2029] border-[#2a2d3a]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-400">Status</p>
                    <h3 className="text-sm text-white mt-1 capitalize">{stats.syncStatus}</h3>
                  </div>
                  <Activity className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botão de sincronização manual */}
          <Card className="bg-[#1e2029] border-[#2a2d3a]">
            <CardHeader>
              <CardTitle className="text-white">Sincronização Manual</CardTitle>
              <CardDescription>
                Forçar sincronização imediata com Booking.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={manualSync}
                disabled={isSyncing || !config.enabled}
                className="w-full gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Sincronizar Agora
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="bg-[#1e2029] border-[#2a2d3a]">
            <CardHeader>
              <CardTitle className="text-white">Histórico de Sincronizações</CardTitle>
              <CardDescription>
                Últimas 50 operações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {syncLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400">Nenhum log disponível</p>
                    <p className="text-sm text-neutral-500 mt-1">
                      Execute uma sincronização para visualizar logs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syncLogs.map((log, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-[#2a2d3a] border border-[#363945]"
                      >
                        {log.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {log.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {log.direction === 'push' ? (
                                <><Upload className="h-3 w-3 mr-1" /> Push</>
                              ) : (
                                <><Download className="h-3 w-3 mr-1" /> Pull</>
                              )}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-300 mt-1">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
