/**
 * ============================================================================
 * RENDIZY - WhatsApp Instances Manager (WAHA)
 * ============================================================================
 * 
 * Modal para gerenciar múltiplas sessões WAHA (múltiplos números WhatsApp).
 * Similar ao WhatsAppInstancesManager do Evolution, mas para o provider WAHA.
 * 
 * Funcionalidades:
 * - Lista de sessões/números conectados
 * - Criar nova sessão (novo número)
 * - QR Code para conexão
 * - Status em tempo real
 * - Deletar/Desconectar sessão
 * 
 * @version v1.0.0
 * @date 2026-01-23
 * @author Rendizy Team
 * @ADR docs/ADR/ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import {
  Smartphone,
  Plus,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  Unplug,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { channelsApi } from '../utils/chatApi';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

type WAHAStatus = 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'NOT_FOUND';

interface WAHASession {
  name: string;
  status: WAHAStatus;
  me?: {
    id: string;
    pushName: string;
  };
  config?: unknown;
  // Metadados do banco (channel_instances)
  description?: string;
  color?: string;
  dbId?: string; // ID no channel_instances
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wahaConfig: {
    api_url: string;
    api_key: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESET_COLORS = [
  '#25D366', // WhatsApp Green
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: WAHAStatus }) {
  const configs: Record<WAHAStatus, { label: string; className: string; icon: React.ReactNode }> = {
    WORKING: { 
      label: 'Conectado', 
      className: 'bg-green-500 text-white',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />
    },
    STOPPED: { 
      label: 'Parado', 
      className: 'bg-gray-400 text-white',
      icon: <Power className="w-3 h-3 mr-1" />
    },
    STARTING: { 
      label: 'Iniciando...', 
      className: 'border-blue-500 text-blue-500 bg-transparent',
      icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />
    },
    SCAN_QR_CODE: { 
      label: 'Aguardando QR', 
      className: 'bg-yellow-500 text-black',
      icon: <QrCode className="w-3 h-3 mr-1" />
    },
    FAILED: { 
      label: 'Erro', 
      className: 'bg-red-500 text-white',
      icon: <XCircle className="w-3 h-3 mr-1" />
    },
    NOT_FOUND: { 
      label: 'Não existe', 
      className: 'bg-gray-300 text-gray-700',
      icon: <AlertCircle className="w-3 h-3 mr-1" />
    },
  };
  
  const config = configs[status] || configs.STOPPED;
  
  return (
    <Badge className={config.className}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function SessionCard({ 
  session, 
  onRefresh,
  onDelete, 
  onDisconnect,
  onShowQr,
  onStart,
}: { 
  session: WAHASession;
  onRefresh: () => void;
  onDelete: () => void;
  onDisconnect: () => void;
  onShowQr: () => void;
  onStart: () => void;
}) {
  const phoneNumber = session.me?.id?.replace('@c.us', '') || null;
  const profileName = session.me?.pushName || null;
  
  // Usar cor salva ou gerar baseada no nome (determinístico)
  const color = session.color || PRESET_COLORS[session.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PRESET_COLORS.length];
  
  // Display name: descrição salva ou nome técnico
  const displayName = session.description || session.name;
  
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color + '20' }}
            >
              <Smartphone className="w-6 h-6" style={{ color }} />
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">{displayName}</h4>
              {phoneNumber ? (
                <p className="text-sm text-gray-600">+{phoneNumber}</p>
              ) : (
                <p className="text-sm text-gray-400">Número não conectado</p>
              )}
              {profileName && (
                <p className="text-xs text-gray-500">{profileName}</p>
              )}
              {session.description && (
                <p className="text-xs text-gray-400">ID: {session.name}</p>
              )}
            </div>
          </div>
          
          <StatusBadge status={session.status} />
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-3 border-t flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
          
          {session.status === 'WORKING' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-orange-600 hover:text-orange-700"
            >
              <Unplug className="w-4 h-4 mr-1" />
              Desconectar
            </Button>
          ) : session.status === 'SCAN_QR_CODE' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowQr}
              className="text-blue-600 hover:text-blue-700"
            >
              <QrCode className="w-4 h-4 mr-1" />
              Ver QR Code
            </Button>
          ) : session.status === 'STOPPED' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStart}
              className="text-green-600 hover:text-green-700"
            >
              <Power className="w-4 h-4 mr-1" />
              Iniciar
            </Button>
          ) : null}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatsAppInstancesManagerWaha({ open, onOpenChange, wahaConfig }: Props) {
  // Context
  const { organization } = useAuth();
  const organizationId = organization?.id;
  
  // State
  const [sessions, setSessions] = useState<WAHASession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [wahaTier, setWahaTier] = useState<'CORE' | 'PLUS' | null>(null); // Detectar tier
  
  // Sub-modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Dados temporários
  const [newSessionName, setNewSessionName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#25D366');
  const [selectedSession, setSelectedSession] = useState<WAHASession | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  
  // Webhook URL
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/waha/webhook`;
  
  // WAHA Core só suporta 1 sessão "default"
  const isWahaCore = wahaTier === 'CORE';
  const canAddMoreSessions = !isWahaCore || sessions.length === 0;

  // ============================================================================
  // FETCH QR CODE (definido antes dos useEffects que precisam dele)
  // ============================================================================
  const fetchQrCode = useCallback(async (sessionName: string) => {
    setQrLoading(true);
    try {
      const result = await channelsApi.waha.getQRCode({
        api_url: wahaConfig.api_url,
        api_key: wahaConfig.api_key,
        session_name: sessionName,
      });
      
      if (result.success && result.data) {
        const qrData = result.data.data || result.data.value || '';
        if (qrData && typeof qrData === 'string') {
          const finalQr = qrData.startsWith('data:image') ? qrData : `data:image/png;base64,${qrData}`;
          setQrCode(finalQr);
        } else {
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
    } finally {
      setQrLoading(false);
    }
  }, [wahaConfig]);

  // ============================================================================
  // DETECT WAHA TIER (Core vs Plus)
  // ============================================================================
  const detectWahaTier = useCallback(async () => {
    if (!wahaConfig.api_url || !wahaConfig.api_key) return;
    
    try {
      const response = await fetch(`${wahaConfig.api_url}/api/version`, {
        headers: { 'X-Api-Key': wahaConfig.api_key }
      });
      if (response.ok) {
        const data = await response.json();
        const tier = data.tier?.toUpperCase() || 'CORE';
        setWahaTier(tier === 'PLUS' ? 'PLUS' : 'CORE');
        console.log('[WAHA Manager] Tier detectado:', tier);
      }
    } catch (error) {
      console.error('Erro ao detectar tier WAHA:', error);
      setWahaTier('CORE'); // Assume Core se não conseguir detectar
    }
  }, [wahaConfig]);

  // ============================================================================
  // LOAD SESSIONS
  // ============================================================================

  const loadSessions = useCallback(async () => {
    if (!wahaConfig.api_url || !wahaConfig.api_key) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // 0. Detectar tier (Core vs Plus)
      await detectWahaTier();
      
      // 1. Buscar sessões do servidor WAHA
      const result = await channelsApi.waha.listSessions({
        api_url: wahaConfig.api_url,
        api_key: wahaConfig.api_key,
      });
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Erro ao carregar sessões');
        setLoading(false);
        return;
      }
      
      const wahaSessions = result.data as WAHASession[];
      
      // 2. Buscar metadados do banco (description, color)
      if (organizationId) {
        const supabase = getSupabaseClient();
        const { data: dbInstances } = await supabase
          .from('channel_instances')
          .select('id, instance_name, description, color')
          .eq('organization_id', organizationId)
          .eq('provider', 'waha')
          .is('deleted_at', null) as { data: { id: string; instance_name: string; description: string | null; color: string | null }[] | null };
        
        // 3. Mesclar: WAHA sessions + metadados do banco
        const mergedSessions = wahaSessions.map((session: WAHASession) => {
          const dbInstance = dbInstances?.find((db) => db.instance_name === session.name);
          return {
            ...session,
            description: dbInstance?.description || undefined,
            color: dbInstance?.color || undefined,
            dbId: dbInstance?.id || undefined,
          };
        });
        
        setSessions(mergedSessions);
      } else {
        setSessions(wahaSessions);
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast.error('Erro ao conectar com servidor WAHA');
    } finally {
      setLoading(false);
    }
  }, [wahaConfig, organizationId, detectWahaTier]);

  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open, loadSessions]);

  // ============================================================================
  // AUTO-SHOW QR CODE
  // Se o modal abre e há uma sessão aguardando QR, mostrar automaticamente
  // ============================================================================
  useEffect(() => {
    if (open && sessions.length > 0 && !showQrModal && !showAddModal) {
      // Procurar sessão que precisa de QR Code
      const sessionNeedingQr = sessions.find(s => s.status === 'SCAN_QR_CODE');
      if (sessionNeedingQr) {
        console.log('[WAHA Manager] Auto-abrindo QR para sessão:', sessionNeedingQr.name);
        setSelectedSession(sessionNeedingQr);
        setShowQrModal(true);
        fetchQrCode(sessionNeedingQr.name);
      }
    }
  }, [open, sessions, showQrModal, showAddModal, fetchQrCode]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateSession = async () => {
    if (!newDescription.trim()) {
      toast.error('Digite uma descrição para identificar o número');
      return;
    }
    
    if (!organizationId) {
      toast.error('Organização não encontrada');
      return;
    }
    
    // Gerar nome único baseado na descrição (slug) + timestamp
    const slug = newDescription.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    const sessionName = sessions.length === 0 ? 'default' : `${slug}-${Date.now().toString(36)}`;
    
    setCreating(true);
    try {
      const supabase = getSupabaseClient();
      
      // 2. Criar sessão no servidor WAHA
      const result = await channelsApi.waha.createSession({
        api_url: wahaConfig.api_url,
        api_key: wahaConfig.api_key,
        session_name: sessionName,
        webhook_url: webhookUrl,
      });
      
      if (!result.success) {
        // Se já existe no WAHA, pode ser que só precisa iniciar
        if (result.error?.includes('already exists')) {
          toast.info('Sessão já existe no WAHA. Salvando no banco...');
        } else {
          toast.error(result.error || 'Erro ao criar sessão no WAHA');
          setCreating(false);
          return;
        }
      }
      
      // 3. Salvar metadados no banco (channel_instances)
      const isFirstSession = sessions.length === 0;
      const { error: dbError } = await supabase
        .from('channel_instances')
        .insert({
          organization_id: organizationId,
          channel: 'whatsapp',
          provider: 'waha',
          instance_name: sessionName,
          api_url: wahaConfig.api_url,
          api_key: wahaConfig.api_key,
          description: newDescription.trim(),
          color: newColor,
          webhook_url: webhookUrl,
          status: 'connecting',
          is_enabled: true,
          is_default: isFirstSession, // Só a primeira é default
        });
      
      if (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        // Sessão criada no WAHA, mas erro no banco - não é crítico
        toast.warning('Sessão criada, mas erro ao salvar descrição');
      } else {
        console.log('✅ Sessão salva no banco channel_instances');
      }
      
      toast.success('✅ Sessão criada! Escaneie o QR Code');
      setShowAddModal(false);
      setNewSessionName('');
      setNewDescription('');
      setNewColor('#25D366');
      
      // Carregar sessões e mostrar QR
      await loadSessions();
      
      // Abrir modal de QR automaticamente
      const newSession = { name: sessionName, status: 'SCAN_QR_CODE' as WAHAStatus, description: newDescription.trim(), color: newColor };
      setSelectedSession(newSession);
      setShowQrModal(true);
      fetchQrCode(sessionName);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  };

  const handleStartSession = async (session: WAHASession) => {
    try {
      const result = await channelsApi.waha.startSession({
        api_url: wahaConfig.api_url,
        api_key: wahaConfig.api_key,
        session_name: session.name,
      });
      
      if (result.success) {
        toast.success('Sessão iniciada! Aguarde o QR Code...');
        await loadSessions();
        
        // Aguardar um pouco e verificar se está em SCAN_QR_CODE
        setTimeout(async () => {
          const statusResult = await channelsApi.waha.getSessionStatus({
            api_url: wahaConfig.api_url,
            api_key: wahaConfig.api_key,
            session_name: session.name,
          });
          
          if (statusResult.success && statusResult.data?.status === 'SCAN_QR_CODE') {
            setSelectedSession({ ...session, status: 'SCAN_QR_CODE' });
            setShowQrModal(true);
            fetchQrCode(session.name);
          }
          await loadSessions();
        }, 2000);
      } else {
        toast.error(result.error || 'Erro ao iniciar sessão');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar sessão');
    }
  };

  const handleDisconnect = async (session: WAHASession) => {
    try {
      const result = await channelsApi.waha.logoutSession({
        api_url: wahaConfig.api_url,
        api_key: wahaConfig.api_key,
        session_name: session.name,
      });
      
      if (result.success) {
        toast.success('WhatsApp desconectado');
        await loadSessions();
      } else {
        toast.error(result.error || 'Erro ao desconectar');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao desconectar');
    }
  };

  const handleDelete = async (session: WAHASession) => {
    const displayName = session.description || session.name;
    if (!confirm(`Deseja realmente deletar a sessão "${displayName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      // 1. Deletar do servidor WAHA
      const result = await channelsApi.waha.deleteSession({
        api_url: wahaConfig.api_url,
        api_key: wahaConfig.api_key,
        session_name: session.name,
      });
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao deletar sessão do WAHA');
        return;
      }
      
      // 2. Soft delete no banco (se existir)
      const supabase = getSupabaseClient();
      if (session.dbId) {
        // @ts-ignore - Supabase types not updated for this table
        await supabase
          .from('channel_instances')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', session.dbId);
      } else if (organizationId) {
        // Tentar encontrar pelo instance_name
        // @ts-ignore - Supabase types not updated for this table
        await supabase
          .from('channel_instances')
          .update({ deleted_at: new Date().toISOString() })
          .eq('organization_id', organizationId)
          .eq('instance_name', session.name)
          .eq('provider', 'waha');
      }
      
      toast.success('Sessão deletada');
      await loadSessions();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar sessão');
    }
  };

  const handleShowQr = (session: WAHASession) => {
    setSelectedSession(session);
    setShowQrModal(true);
    fetchQrCode(session.name);
  };

  // ============================================================================
  // POLLING - Verificar conexão enquanto QR está aberto
  // ============================================================================

  useEffect(() => {
    if (!showQrModal || !selectedSession) return;
    
    let isCancelled = false;
    let pollCount = 0;
    const maxPolls = 30; // 90 segundos
    
    const checkConnection = async () => {
      if (isCancelled || pollCount >= maxPolls) return;
      
      try {
        pollCount++;
        const result = await channelsApi.waha.getSessionStatus({
          api_url: wahaConfig.api_url,
          api_key: wahaConfig.api_key,
          session_name: selectedSession.name,
        });
        
        if (isCancelled) return;
        
        if (result.success && result.data?.status === 'WORKING') {
          // Conectou!
          toast.success('✅ WhatsApp conectado com sucesso!', {
            duration: 5000,
            icon: '🎉',
          });
          setShowQrModal(false);
          setQrCode(null);
          loadSessions();
          return;
        }
        
        // Se ainda está em SCAN_QR_CODE, atualizar QR
        if (result.data?.status === 'SCAN_QR_CODE') {
          fetchQrCode(selectedSession.name);
        }
      } catch (error) {
        console.log('Polling error:', error);
      }
      
      if (!isCancelled && pollCount < maxPolls) {
        setTimeout(checkConnection, 3000);
      }
    };
    
    const timer = setTimeout(checkConnection, 3000);
    
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [showQrModal, selectedSession, wahaConfig]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Modal Principal - Lista de Sessões */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-600" />
              Gerenciar Sessões WAHA
            </DialogTitle>
            <DialogDescription>
              Gerencie seu número de WhatsApp via WAHA
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!wahaConfig.api_url || !wahaConfig.api_key ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Configure a URL e API Key do WAHA na aba "Configuração" primeiro.
                </AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma sessão criada</p>
                <p className="text-sm text-gray-400 mt-1">
                  Clique em "Conectar WhatsApp" para adicionar seu número
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.name}
                    session={session}
                    onRefresh={loadSessions}
                    onDelete={() => handleDelete(session)}
                    onDisconnect={() => handleDisconnect(session)}
                    onShowQr={() => handleShowQr(session)}
                    onStart={() => handleStartSession(session)}
                  />
                ))}
                
                {/* Aviso sobre limitação do WAHA Core */}
                {isWahaCore && sessions.length > 0 && (
                  <Alert className="bg-amber-50 border-amber-200 mt-4">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
                      <strong>WAHA Core</strong> suporta apenas 1 número. 
                      Upgrade para <a href="https://waha.devlike.pro/" target="_blank" rel="noopener" className="underline font-medium">WAHA Plus</a> para múltiplos números.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={loadSessions}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              disabled={!wahaConfig.api_url || !wahaConfig.api_key}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Sessão */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp (WAHA)</DialogTitle>
            <DialogDescription>
              Configure a conexão do seu WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Nome/Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: WhatsApp Principal, Atendimento..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome amigável para identificar esta conexão
              </p>
            </div>

            <div>
              <Label>Cor de identificação</Label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSession} 
              disabled={creating || !newDescription.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Sessão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-green-600" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Sessão: <strong>{selectedSession?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {qrLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                <p className="text-sm text-gray-500">Carregando QR Code...</p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <img 
                    src={qrCode} 
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Abra o WhatsApp no celular e escaneie o código
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedSession && fetchQrCode(selectedSession.name)}
                  className="mt-3"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar QR
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <p className="text-gray-600">QR Code não disponível</p>
                <p className="text-sm text-gray-400 mt-1">
                  A sessão pode já estar conectada ou ainda iniciando
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedSession && fetchQrCode(selectedSession.name)}
                  className="mt-3"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
