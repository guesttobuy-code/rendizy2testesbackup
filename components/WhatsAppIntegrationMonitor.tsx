/**
 * RENDIZY - WhatsApp Integration Monitor
 * 
 * Monitor em tempo real da integração WhatsApp Evolution API
 * Verifica se dados estão sendo salvos corretamente no Supabase
 * 
 * @version v1.0.103.318
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Activity, 
  Database, 
  MessageCircle, 
  Users, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Zap,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface MonitorStats {
  contacts: number;
  chats: number;
  messages: number;
  instance: 'connected' | 'disconnected' | 'unknown';
  config: 'saved' | 'empty';
  lastSync: string | null;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatsAppIntegrationMonitor() {
  const organizationId = 'org_default';
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server`;

  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [stats, setStats] = useState<MonitorStats>({
    contacts: 0,
    chats: 0,
    messages: 0,
    instance: 'unknown',
    config: 'empty',
    lastSync: null,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAllData();
      }, 5000); // Atualiza a cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const log: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };
    setLogs(prev => [log, ...prev].slice(0, 100)); // Manter apenas últimos 100
    console.log(`[WhatsApp Monitor] ${type.toUpperCase()}:`, message, data);
  };

  const fetchAPI = async (endpoint: string, options = {}) => {
    try {
      addLog('info', `📡 Requisição: ${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          ...options.headers,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog('success', `✅ Sucesso: ${endpoint}`, data);
      } else {
        addLog('error', `❌ Erro ${response.status}: ${endpoint}`, data);
      }

      return { success: response.ok, data, status: response.status };
    } catch (error: any) {
      addLog('error', `❌ Falha na requisição: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    addLog('info', '🔄 Iniciando carregamento de dados...');

    const newStats: MonitorStats = {
      contacts: 0,
      chats: 0,
      messages: 0,
      instance: 'unknown',
      config: 'empty',
      lastSync: null,
    };

    const allData: any = {
      localStorage: {},
      supabase: {},
    };

    try {
      // 1. Verificar localStorage
      addLog('info', '💾 Verificando localStorage...');
      const localKey = `whatsapp_config_${organizationId}`;
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try {
          allData.localStorage = JSON.parse(localData);
          newStats.config = 'saved';
          addLog('success', '✅ Configuração encontrada no localStorage');
        } catch (e) {
          addLog('error', '❌ Erro ao ler localStorage');
        }
      } else {
        addLog('warning', '⚠️  Nenhuma configuração no localStorage');
      }

      // 2. Buscar configuração do Supabase
      const configResult = await fetchAPI(`/whatsapp/data/config?organization_id=${organizationId}`);
      if (configResult.success && configResult.data?.data) {
        allData.supabase.config = configResult.data.data;
        newStats.config = 'saved';
        newStats.lastSync = configResult.data.data.updatedAt;
      }

      // 3. Buscar contatos
      const contactsResult = await fetchAPI(`/whatsapp/data/contacts?organization_id=${organizationId}`);
      if (contactsResult.success && contactsResult.data?.data) {
        allData.supabase.contacts = contactsResult.data.data;
        newStats.contacts = contactsResult.data.data.length;
        addLog('success', `✅ ${newStats.contacts} contato(s) encontrado(s)`);
      }

      // 4. Buscar conversas
      const chatsResult = await fetchAPI(`/whatsapp/data/chats?organization_id=${organizationId}`);
      if (chatsResult.success && chatsResult.data?.data) {
        allData.supabase.chats = chatsResult.data.data;
        newStats.chats = chatsResult.data.data.length;
        addLog('success', `✅ ${newStats.chats} conversa(s) encontrada(s)`);
      }

      // 5. Buscar mensagens
      const messagesResult = await fetchAPI(`/whatsapp/data/messages?organization_id=${organizationId}&limit=10`);
      if (messagesResult.success && messagesResult.data?.data) {
        allData.supabase.messages = messagesResult.data.data;
        newStats.messages = messagesResult.data.total || 0;
        addLog('success', `✅ ${newStats.messages} mensagem(ns) encontrada(s)`);
      }

      // 6. Buscar instância
      const instanceResult = await fetchAPI(`/whatsapp/data/instance?organization_id=${organizationId}`);
      if (instanceResult.success && instanceResult.data?.data) {
        allData.supabase.instance = instanceResult.data.data;
        newStats.instance = instanceResult.data.data.status || 'unknown';
        addLog('success', `✅ Instância: ${newStats.instance}`);
      } else {
        addLog('warning', '⚠️  Instância não configurada');
      }

      // 7. Buscar logs de sincronização
      const logsResult = await fetchAPI(`/whatsapp/data/sync-logs?organization_id=${organizationId}&limit=5`);
      if (logsResult.success && logsResult.data?.data) {
        allData.supabase.syncLogs = logsResult.data.data;
        addLog('success', `✅ ${logsResult.data.data.length} log(s) de sincronização`);
      }

      setStats(newStats);
      setRawData(allData);
      addLog('success', '✅ Carregamento completo!');

    } catch (error: any) {
      addLog('error', `❌ Erro geral: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSaveConfig = async () => {
    addLog('info', '🧪 Testando salvamento de configuração...');
    
    const testConfig = {
      organization_id: organizationId,
      autoSync: {
        enabled: true,
        interval: 5,
      },
      importFilters: {
        onlyMyContacts: false,
        excludeGroups: true,
        onlyBusinessContacts: false,
      },
      autoLink: {
        enabled: true,
        linkByPhone: true,
        createGuestIfNotFound: false,
      },
      notifications: {
        newMessage: true,
        newContact: false,
        connectionStatus: true,
      },
    };

    const result = await fetchAPI(`/whatsapp/data/config`, {
      method: 'PUT',
      body: JSON.stringify(testConfig),
    });

    if (result.success) {
      toast.success('✅ Configuração salva com sucesso!');
      loadAllData();
    } else {
      toast.error('❌ Erro ao salvar configuração');
    }
  };

  const testSaveContact = async () => {
    addLog('info', '🧪 Testando salvamento de contato...');
    
    const testContact = {
      organization_id: organizationId,
      name: `Contato Teste ${Date.now()}`,
      phone_number: `5511${Math.floor(Math.random() * 100000000)}`,
      whatsapp_id: `test_${Date.now()}@s.whatsapp.net`,
      profile_picture_url: null,
      source: 'manual',
    };

    const result = await fetchAPI(`/whatsapp/data/contacts`, {
      method: 'POST',
      body: JSON.stringify(testContact),
    });

    if (result.success) {
      toast.success('✅ Contato salvo com sucesso!');
      loadAllData();
    } else {
      toast.error('❌ Erro ao salvar contato');
    }
  };

  const clearLocalStorage = () => {
    const localKey = `whatsapp_config_${organizationId}`;
    localStorage.removeItem(localKey);
    addLog('success', '✅ localStorage limpo');
    toast.success('localStorage limpo!');
    loadAllData();
  };

  const exportLogs = () => {
    const logsText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-monitor-logs-${Date.now()}.txt`;
    a.click();
    
    toast.success('✅ Logs exportados!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" />
            Monitor WhatsApp Integration
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitoramento em tempo real • v1.0.103.318
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          
          <Button onClick={loadAllData} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.contacts}</div>
            <p className="text-xs text-gray-500 mt-1">Salvos no Supabase</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Conversas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.chats}</div>
            <p className="text-xs text-gray-500 mt-1">Ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.messages}</div>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Instância
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={stats.instance === 'connected' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {stats.instance === 'connected' && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {stats.instance === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
              {stats.instance === 'unknown' && <AlertCircle className="w-3 h-3 mr-1" />}
              {stats.instance}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={stats.config === 'saved' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {stats.config === 'saved' ? '✅ Salva' : '❌ Vazia'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">📋 Logs em Tempo Real</TabsTrigger>
          <TabsTrigger value="actions">🎬 Ações de Teste</TabsTrigger>
          <TabsTrigger value="raw">🔍 Dados Brutos</TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Logs de Monitoramento</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={exportLogs} size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                  <Button onClick={() => setLogs([])} size="sm" variant="outline">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Nenhum log ainda. Clique em "Atualizar" para começar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        log.type === 'success' ? 'bg-green-50 border-green-500' :
                        log.type === 'error' ? 'bg-red-50 border-red-500' :
                        log.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                        'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                        {log.data && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              console.log(log.data);
                              toast.info('Dados exibidos no console');
                            }}
                          >
                            Ver dados
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ações de Teste</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={testSaveConfig} variant="outline" className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  Testar Salvar Configuração
                </Button>
                
                <Button onClick={testSaveContact} variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Testar Salvar Contato
                </Button>
                
                <Button onClick={clearLocalStorage} variant="outline" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar localStorage
                </Button>
                
                <Button 
                  onClick={() => window.open('/🔍_DIAGNOSTICO_INTEGRACAO_WHATSAPP_v1.0.103.318.html', '_blank')}
                  variant="outline" 
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Abrir Diagnóstico HTML
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Essas ações criam dados de teste no Supabase.
                  Use apenas para validar que o salvamento está funcionando.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Data Tab */}
        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Dados Brutos</CardTitle>
                <Button
                  onClick={() => setShowRawData(!showRawData)}
                  size="sm"
                  variant="outline"
                >
                  {showRawData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showRawData ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showRawData ? (
                <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto max-h-96 text-xs">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              ) : (
                <Alert>
                  <AlertDescription>
                    Clique em "Mostrar" para ver os dados brutos do localStorage e Supabase.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
