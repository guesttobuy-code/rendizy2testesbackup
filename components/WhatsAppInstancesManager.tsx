/**
 * ============================================================================
 * RENDIZY - WhatsApp Instances Manager
 * ============================================================================
 * 
 * Modal simplificado para gerenciar múltiplas instâncias WhatsApp.
 * O cliente NÃO vê API Key, URL, ou configurações técnicas.
 * Apenas:
 * - Lista de números conectados (com descrição e cor)
 * - Botão para adicionar novo número (mostra QR Code)
 * - Opção de editar descrição/cor de cada número
 * 
 * A API Key Global fica no backend - nunca exposta ao cliente.
 * 
 * @version v2.0.0
 * @date 2026-01-22
 * @author Rendizy Team
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
import {
  Smartphone,
  Plus,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Edit2,
  RefreshCw,
  MessageCircle,
  Unplug,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../src/contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  description: string;
  color: string;
  status: 'connected' | 'disconnected' | 'qr_pending' | 'connecting' | 'error';
  phoneNumber?: string;
  profileName?: string;
  profilePictureUrl?: string;
  createdAt: string;
  lastConnectedAt?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const API_BASE = `https://${projectId}.supabase.co/functions/v1/rendizy-server/channel-instances`;

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchInstances(organizationId: string): Promise<WhatsAppInstance[]> {
  const response = await fetch(`${API_BASE}?channel=whatsapp`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
      'x-organization-id': organizationId,
    },
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar instâncias');
  }
  
  const result = await response.json();
  return result.data || [];
}

async function createInstance(organizationId: string, description: string, color: string): Promise<WhatsAppInstance> {
  const response = await fetch(`${API_BASE}/whatsapp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
      'x-organization-id': organizationId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, color }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar instância');
  }
  
  const result = await response.json();
  return result.data;
}

async function fetchQrCode(organizationId: string, instanceId: string): Promise<{ qrCode?: string; alreadyConnected?: boolean; phoneNumber?: string }> {
  const response = await fetch(`${API_BASE}/${instanceId}/qr-code`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
      'x-organization-id': organizationId,
    },
  });
  
  if (!response.ok) {
    throw new Error('Erro ao obter QR Code');
  }
  
  const result = await response.json();
  return result.data;
}

async function updateInstance(organizationId: string, instanceId: string, updates: { description?: string; color?: string }): Promise<void> {
  const response = await fetch(`${API_BASE}/${instanceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
      'x-organization-id': organizationId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao atualizar instância');
  }
}

async function deleteInstance(organizationId: string, instanceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${instanceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
      'x-organization-id': organizationId,
    },
  });
  
  if (!response.ok) {
    throw new Error('Erro ao remover instância');
  }
}

async function disconnectInstance(organizationId: string, instanceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${instanceId}/disconnect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
      'x-organization-id': organizationId,
    },
  });
  
  if (!response.ok) {
    throw new Error('Erro ao desconectar instância');
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: WhatsAppInstance['status'] }) {
  const configs = {
    connected: { label: 'Conectado', variant: 'default', className: 'bg-green-500 text-white' },
    disconnected: { label: 'Desconectado', variant: 'secondary', className: 'bg-gray-400 text-white' },
    qr_pending: { label: 'Aguardando QR', variant: 'warning', className: 'bg-yellow-500 text-black' },
    connecting: { label: 'Conectando...', variant: 'outline', className: 'border-blue-500 text-blue-500' },
    error: { label: 'Erro', variant: 'destructive', className: 'bg-red-500 text-white' },
  };
  
  const config = configs[status] || configs.disconnected;
  
  return (
    <Badge className={config.className}>
      {status === 'connected' && <CheckCircle2 className="w-3 h-3 mr-1" />}
      {status === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
      {status === 'qr_pending' && <QrCode className="w-3 h-3 mr-1" />}
      {status === 'connecting' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {config.label}
    </Badge>
  );
}

function InstanceCard({ 
  instance, 
  onEdit, 
  onDelete, 
  onDisconnect,
  onShowQr 
}: { 
  instance: WhatsAppInstance;
  onEdit: () => void;
  onDelete: () => void;
  onDisconnect: () => void;
  onShowQr: () => void;
}) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: instance.color }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {instance.profilePictureUrl ? (
              <img 
                src={instance.profilePictureUrl} 
                alt={instance.description}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: instance.color + '20' }}
              >
                <Smartphone className="w-6 h-6" style={{ color: instance.color }} />
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-900">{instance.description}</h4>
              {instance.phoneNumber ? (
                <p className="text-sm text-gray-600">{instance.phoneNumber}</p>
              ) : (
                <p className="text-sm text-gray-400">Número não conectado</p>
              )}
              {instance.profileName && (
                <p className="text-xs text-gray-500">{instance.profileName}</p>
              )}
            </div>
          </div>
          
          <StatusBadge status={instance.status} />
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-gray-600 hover:text-gray-900"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Editar
          </Button>
          
          {instance.status === 'connected' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-orange-600 hover:text-orange-700"
            >
              <Unplug className="w-4 h-4 mr-1" />
              Desconectar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowQr}
              className="text-blue-600 hover:text-blue-700"
            >
              <QrCode className="w-4 h-4 mr-1" />
              Conectar
            </Button>
          )}
          
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

export default function WhatsAppInstancesManager({ open, onOpenChange }: Props) {
  const { organization } = useAuth();
  const organizationId = organization?.id || '';
  
  // State
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Sub-modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Dados temporários
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#25D366');
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrExpiresIn, setQrExpiresIn] = useState(45);
  const [showPairingOption, setShowPairingOption] = useState(false);
  const [phoneForPairing, setPhoneForPairing] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pollingConnection, setPollingConnection] = useState(false);
  
  // ========== POLLING PARA DETECTAR CONEXÃO ==========
  
  // Polling que verifica se o WhatsApp conectou a cada 3 segundos
  useEffect(() => {
    if (!showQrModal || !selectedInstance || pollingConnection) return;
    
    let isCancelled = false;
    let pollCount = 0;
    const maxPolls = 30; // 30 * 3s = 90 segundos máximo de polling
    
    const checkConnection = async () => {
      if (isCancelled || pollCount >= maxPolls) return;
      
      try {
        pollCount++;
        const result = await fetchQrCode(organizationId, selectedInstance.id);
        
        if (isCancelled) return;
        
        if (result.alreadyConnected) {
          // 🎉 CONECTOU!
          setPollingConnection(true);
          toast.success('✅ WhatsApp conectado com sucesso!', {
            duration: 5000,
            icon: '🎉',
          });
          setShowQrModal(false);
          setQrCode(null);
          loadInstances(); // Atualizar lista
          return;
        }
      } catch (error) {
        console.log('Polling check error (ignorando):', error);
      }
      
      // Continuar polling
      if (!isCancelled && pollCount < maxPolls) {
        setTimeout(checkConnection, 3000);
      }
    };
    
    // Iniciar polling após 3 segundos (dar tempo pro QR carregar)
    const startTimer = setTimeout(() => {
      checkConnection();
    }, 3000);
    
    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
    };
  }, [showQrModal, selectedInstance, organizationId, pollingConnection]);
  
  // Reset polling quando modal fecha
  useEffect(() => {
    if (!showQrModal) {
      setPollingConnection(false);
    }
  }, [showQrModal]);
  
  // ========== DATA LOADING ==========
  
  const loadInstances = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const data = await fetchInstances(organizationId);
      setInstances(data);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar números WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);
  
  useEffect(() => {
    if (open && organizationId) {
      loadInstances();
    }
  }, [open, organizationId, loadInstances]);
  
  // Polling para atualizar status quando modal está aberto
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      loadInstances();
    }, 10000); // A cada 10 segundos
    
    return () => clearInterval(interval);
  }, [open, loadInstances]);
  
  // ✅ Polling rápido quando QR Code está visível (detectar conexão)
  useEffect(() => {
    if (!showQrModal || !selectedInstance || !qrCode) return;
    
    console.log('🔄 [QR Polling] Iniciando polling de conexão...');
    
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE}/${selectedInstance.id}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
            'x-organization-id': organizationId,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔍 [QR Polling] Status:', result.data?.status);
          
          if (result.data?.status === 'connected') {
            console.log('✅ [QR Polling] Conectado! Phone:', result.data?.phoneNumber);
            toast.success(`✅ WhatsApp conectado: ${result.data?.phoneNumber || 'sucesso!'}`);
            setShowQrModal(false);
            setQrCode(null);
            loadInstances();
          }
        }
      } catch (error) {
        console.error('❌ [QR Polling] Erro:', error);
      }
    };
    
    // Verificar a cada 3 segundos
    const interval = setInterval(checkConnection, 3000);
    
    // Verificar imediatamente também
    checkConnection();
    
    return () => clearInterval(interval);
  }, [showQrModal, selectedInstance, qrCode, organizationId, loadInstances]);
  
  // ========== HANDLERS ==========
  
  const handleAddNew = async () => {
    if (!newDescription.trim()) {
      toast.error('Digite uma descrição para o número');
      return;
    }
    
    setCreating(true);
    try {
      const newInstance = await createInstance(organizationId, newDescription, newColor);
      setInstances(prev => [newInstance, ...prev]);
      setShowAddModal(false);
      setNewDescription('');
      setNewColor('#25D366');
      
      // Mostrar QR Code automaticamente
      setSelectedInstance(newInstance);
      setShowQrModal(true);
      loadQrCode(newInstance.id);
      
      toast.success('Número adicionado! Escaneie o QR Code');
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar número');
    } finally {
      setCreating(false);
    }
  };
  
  const loadQrCode = async (instanceId: string) => {
    setQrLoading(true);
    setQrCode(null);
    setPairingCode(null);
    setShowPairingOption(false);
    setQrExpiresIn(45);
    
    try {
      const result = await fetchQrCode(organizationId, instanceId);
      
      if (result.alreadyConnected) {
        toast.success(`WhatsApp já conectado: ${result.phoneNumber || 'número conectado'}`);
        setShowQrModal(false);
        loadInstances();
        return;
      }
      
      setQrCode(result.qrCode || null);
      
      // Iniciar countdown do QR
      if (result.qrCode) {
        let timeLeft = 45;
        const timer = setInterval(() => {
          timeLeft--;
          setQrExpiresIn(timeLeft);
          if (timeLeft <= 0) {
            clearInterval(timer);
            setQrCode(null); // QR expirou
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      toast.error('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setQrLoading(false);
    }
  };
  
  const loadPairingCode = async (instanceId: string, phoneNumber: string) => {
    setPairingLoading(true);
    setPairingCode(null);
    
    try {
      const response = await fetch(`${API_BASE}/${instanceId}/pairing-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
          'x-organization-id': organizationId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao gerar código');
      }
      
      const result = await response.json();
      
      if (result.data?.alreadyConnected) {
        toast.success(`WhatsApp já conectado!`);
        setShowQrModal(false);
        loadInstances();
        return;
      }
      
      setPairingCode(result.data?.pairingCode || null);
      toast.success('Código gerado! Digite no seu WhatsApp.');
    } catch (error) {
      console.error('Erro ao obter Pairing Code:', error);
      toast.error('Erro ao gerar código. Verifique o número.');
    } finally {
      setPairingLoading(false);
    }
  };
  
  const handleShowQr = (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setShowQrModal(true);
    setShowPairingOption(false);
    setPairingCode(null);
    setPhoneForPairing('');
    loadQrCode(instance.id);
  };
  
  const handleEdit = (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setNewDescription(instance.description);
    setNewColor(instance.color);
    setShowEditModal(true);
  };
  
  const handleSaveEdit = async () => {
    if (!selectedInstance) return;
    
    try {
      await updateInstance(organizationId, selectedInstance.id, {
        description: newDescription,
        color: newColor,
      });
      
      setInstances(prev => 
        prev.map(i => 
          i.id === selectedInstance.id 
            ? { ...i, description: newDescription, color: newColor }
            : i
        )
      );
      
      setShowEditModal(false);
      toast.success('Número atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };
  
  const handleDelete = async (instance: WhatsAppInstance) => {
    if (!confirm(`Tem certeza que deseja remover "${instance.description}"?\n\nIsso irá desconectar o WhatsApp permanentemente.`)) {
      return;
    }
    
    try {
      await deleteInstance(organizationId, instance.id);
      setInstances(prev => prev.filter(i => i.id !== instance.id));
      toast.success('Número removido!');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };
  
  const handleDisconnect = async (instance: WhatsAppInstance) => {
    if (!confirm(`Desconectar "${instance.description}"?\n\nVocê precisará escanear o QR Code novamente.`)) {
      return;
    }
    
    try {
      await disconnectInstance(organizationId, instance.id);
      loadInstances();
      toast.success('WhatsApp desconectado!');
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };
  
  // ========== RENDER ==========
  
  return (
    <>
      {/* Modal Principal - Lista de Instâncias */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Números WhatsApp
            </DialogTitle>
            <DialogDescription>
              Gerencie os números WhatsApp conectados à sua organização.
              Cada número pode receber e enviar mensagens.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum número conectado
                </h3>
                <p className="text-gray-500 mb-6">
                  Adicione um número WhatsApp para começar a receber mensagens.
                </p>
                <Button onClick={() => setShowAddModal(true)} className="bg-green-500 hover:bg-green-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Número
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {instances.map(instance => (
                  <InstanceCard
                    key={instance.id}
                    instance={instance}
                    onEdit={() => handleEdit(instance)}
                    onDelete={() => handleDelete(instance)}
                    onDisconnect={() => handleDisconnect(instance)}
                    onShowQr={() => handleShowQr(instance)}
                  />
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => loadInstances()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            {instances.length > 0 && (
              <Button onClick={() => setShowAddModal(true)} className="bg-green-500 hover:bg-green-600">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Número
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Adicionar Novo */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Número WhatsApp</DialogTitle>
            <DialogDescription>
              Digite uma descrição para identificar este número.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: WhatsApp Comercial, Suporte, Reservas..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1"
              />
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
              onClick={handleAddNew} 
              disabled={creating || !newDescription.trim()}
              className="bg-green-500 hover:bg-green-600"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de QR Code */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              {selectedInstance?.description}
            </DialogDescription>
          </DialogHeader>
          
          {/* ⚠️ AVISO IMPORTANTE */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div className="text-sm">
                <p className="font-semibold text-amber-800 mb-1">Antes de conectar:</p>
                <p className="text-amber-700">
                  Se você tem o <strong>WhatsApp Web</strong> aberto no navegador ou em outro computador/notebook, 
                  <strong className="text-amber-900"> desconecte primeiro</strong> antes de escanear o QR Code aqui.
                </p>
                <p className="text-amber-600 text-xs mt-1">
                  📱 No celular: Configurações → Aparelhos Conectados → Desconectar dispositivos antigos
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center py-4">
            {/* Tabs: QR Code / Código numérico */}
            <div className="flex gap-2 mb-4 w-full">
              <Button 
                variant={!showPairingOption ? "default" : "outline"} 
                size="sm" 
                className="flex-1"
                onClick={() => { setShowPairingOption(false); setPairingCode(null); }}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button 
                variant={showPairingOption ? "default" : "outline"} 
                size="sm" 
                className="flex-1"
                onClick={() => { setShowPairingOption(true); setQrCode(null); }}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Código de 8 Dígitos
              </Button>
            </div>

            {!showPairingOption ? (
              // === QR CODE ===
              <>
                {qrLoading ? (
                  <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                    <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
                  </div>
                ) : qrCode ? (
                  <div className="relative">
                    <div className="p-4 bg-white rounded-lg shadow-md">
                      <img 
                        src={`data:image/png;base64,${qrCode}`} 
                        alt="QR Code WhatsApp"
                        className="w-56 h-56"
                      />
                    </div>
                    {/* Timer */}
                    <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold ${
                      qrExpiresIn > 15 ? 'bg-green-100 text-green-700' : 
                      qrExpiresIn > 5 ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {qrExpiresIn}s
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                    <XCircle className="w-12 h-12 text-red-400 mb-2" />
                    <p className="text-sm text-gray-500">QR Code expirou</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => selectedInstance && loadQrCode(selectedInstance.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Gerar Novo
                    </Button>
                  </div>
                )}
                
                {/* Indicador de monitoramento */}
                {qrCode && (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-blue-50 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs text-blue-700">Aguardando conexão...</span>
                  </div>
                )}
                
                <p className="text-sm text-gray-500 mt-3 text-center">
                  No WhatsApp, vá em<br />
                  <strong>Configurações → Aparelhos Conectados → Conectar</strong><br />
                  e escaneie este QR Code.
                </p>
                
                {/* Info sobre suporte */}
                <p className="text-xs text-green-600 mt-2 text-center">
                  ✅ WhatsApp e WhatsApp Business são suportados!
                </p>
              </>
            ) : (
              // === PAIRING CODE (Código de 8 dígitos) ===
              <div className="w-full space-y-4">
                {!pairingCode ? (
                  <>
                    <p className="text-sm text-gray-600 text-center mb-2">
                      Alternativa ao QR Code: receba um código de 8 dígitos para digitar no WhatsApp.
                    </p>
                    <div>
                      <Label htmlFor="phone-pairing">Seu número de WhatsApp (com DDD)</Label>
                      <Input
                        id="phone-pairing"
                        placeholder="+55 21 99999-9999"
                        value={phoneForPairing}
                        onChange={(e) => setPhoneForPairing(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Digite o número com DDD (ex: 5521995885999)
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full"
                      disabled={pairingLoading || !phoneForPairing || phoneForPairing.length < 10}
                      onClick={() => selectedInstance && loadPairingCode(selectedInstance.id, phoneForPairing)}
                    >
                      {pairingLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando código...
                        </>
                      ) : (
                        <>
                          Gerar Código de 8 Dígitos
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Digite este código no seu WhatsApp:</p>
                    <div className="text-4xl font-mono font-bold tracking-widest bg-gray-100 py-4 px-6 rounded-lg">
                      {pairingCode}
                    </div>
                    
                    {/* Indicador de monitoramento */}
                    <div className="flex items-center justify-center gap-2 mt-3 px-3 py-2 bg-blue-50 rounded-full">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs text-blue-700">Aguardando conexão...</span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                      No WhatsApp, vá em:<br />
                      <strong>Configurações → Aparelhos Conectados → Conectar Aparelho → Conectar com número de telefone</strong>
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setPairingCode(null)}
                    >
                      Gerar Novo Código
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrModal(false)}>
              Fechar
            </Button>
            {!showPairingOption && qrCode && (
              <Button onClick={() => selectedInstance && loadQrCode(selectedInstance.id)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Novo QR Code
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Número</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1"
              />
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
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
