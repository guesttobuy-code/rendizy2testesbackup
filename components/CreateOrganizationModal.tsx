import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Building2, AlertCircle, Loader2, WifiOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fetchWithRetry, testBackendHealth, diagnoseFetchError } from '../utils/fetchWithRetry';
import { isOffline } from '../utils/offlineMode';
import { saveOfflineOrganization, generateOfflineId } from '../utils/offlineOrganizations';
import { generateClientSlug } from '../types/tenancy';

interface CreateOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrganizationModal({ open, onClose, onSuccess }: CreateOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'free'
  });

  // Testar conexão quando o modal abre
  React.useEffect(() => {
    if (open) {
      testConnection();
    }
  }, [open]);

  const testConnection = async () => {
    setTestingConnection(true);
    
    try {
      // Se já está em modo offline global
      if (isOffline()) {
        setBackendOffline(true);
        setError(null); // Limpar erro, offline não é erro!
        setTestingConnection(false);
        return;
      }
      
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server`;
      
      // Teste rápido com timeout curto
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(`${baseUrl}/health`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          console.log('✅ Backend está online e saudável');
          setBackendOffline(false);
          setError(null);
        } else {
          console.warn('⚠️ Backend respondeu mas com erro:', response.status);
          setBackendOffline(true);
        }
      } catch (fetchError) {
        clearTimeout(timeout);
        throw fetchError;
      }
    } catch (err) {
      console.error('❌ Backend offline ou inacessível:', err);
      setBackendOffline(true);
      setError(null); // Não mostrar como erro, apenas informar
    } finally {
      setTestingConnection(false);
    }
  };

  const createOfflineOrganization = () => {
    try {
      setLoading(true);
      
      const offlineId = generateOfflineId();
      const slug = generateClientSlug(formData.name);
      
      const newOrg = {
        id: offlineId,
        name: formData.name,
        slug: slug,
        status: 'active' as const,
        plan: formData.plan,
        email: formData.email,
        phone: formData.phone || '',
        legalName: formData.name,
        taxId: '',
        settings: {
          language: 'pt' as const,
          timezone: 'America/Sao_Paulo',
          currency: 'BRL',
          dateFormat: 'DD/MM/YYYY',
          maxUsers: formData.plan === 'enterprise' ? 999 : formData.plan === 'professional' ? 15 : formData.plan === 'basic' ? 5 : 2,
          maxProperties: formData.plan === 'enterprise' ? 999 : formData.plan === 'professional' ? 100 : formData.plan === 'basic' ? 20 : 5
        },
        limits: {
          users: formData.plan === 'enterprise' ? 999 : formData.plan === 'professional' ? 15 : formData.plan === 'basic' ? 5 : 2,
          properties: formData.plan === 'enterprise' ? 999 : formData.plan === 'professional' ? 100 : formData.plan === 'basic' ? 20 : 5,
          reservations: formData.plan === 'enterprise' ? 999999 : formData.plan === 'professional' ? 5000 : formData.plan === 'basic' ? 500 : 50,
          storage: 999999
        },
        usage: {
          users: 0,
          properties: 0,
          reservations: 0,
          storage: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      saveOfflineOrganization(newOrg);
      
      console.log('✅ Organização criada OFFLINE:', newOrg);
      
      toast.success('✅ Organização criada localmente!', {
        description: `${newOrg.name} (${newOrg.slug})`,
        duration: 5000
      });
      
      toast.info('💾 Salva no navegador', {
        description: 'Será sincronizada quando backend voltar',
        duration: 5000
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: 'free'
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('❌ Erro ao criar organização offline:', err);
      toast.error('Erro ao criar offline');
      setError('Erro ao salvar organização localmente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // SEMPRE tentar criar no backend (Supabase)
    // NÃO criar automaticamente em modo offline
    setLoading(true);

    const payload = {
      ...formData,
      createdBy: 'user_master_rendizy' // ID do usuário master
    };

    console.log('🚀 Enviando requisição para criar organização:', payload);
    console.log('📍 URL:', `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations`);

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations`;
      
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(payload),
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 15000,
        onRetry: (attempt) => {
          toast.info(`Tentando novamente... (${attempt})`, { duration: 2000 });
        }
      });

      console.log('📥 Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar imobiliária');
      }

      toast.success('Imobiliária criada com sucesso!', {
        description: `${result.data.name} (${result.data.slug})`
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: 'free'
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('❌ Error creating organization:', err);
      
      const diagnosis = diagnoseFetchError(err as Error);
      
      toast.error('❌ Erro ao criar imobiliária', {
        description: 'Verifique o backend e tente novamente',
        duration: 8000
      });
      
      setError(
        `❌ Falha ao criar no Supabase\n\n` +
        `${diagnosis.message}\n\n` +
        `💡 Verifique:\n` +
        `1. Backend está rodando?\n` +
        `2. Credenciais do Supabase corretas?\n` +
        `3. Conexão com internet OK?`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        plan: 'free'
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle>Nova Imobiliária</DialogTitle>
              <DialogDescription>
                Criar uma nova organização cliente no sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Status de Conexão */}
            {testingConnection && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Verificando conexão com Supabase...</AlertDescription>
              </Alert>
            )}
            
            {!testingConnection && backendOffline && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>⚠️ Backend Offline</strong>
                  <br />
                  Não será possível criar a imobiliária até o backend estar online.
                  <br />
                  <span className="text-xs mt-2 block">
                    Verifique se o backend do Supabase está rodando.
                  </span>
                </AlertDescription>
              </Alert>
            )}
            
            {!testingConnection && !backendOffline && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>✅ Conectado ao Supabase</strong>
                  <br />
                  Pronto para criar a imobiliária no banco de dados.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Nome da Imobiliária <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Imobiliária Costa do Sol"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                O slug será gerado automaticamente: rendizy_[nome]
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@imobiliaria.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">
                Plano <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData({ ...formData, plan: value })}
                disabled={loading}
              >
                <SelectTrigger id="plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Free</span>
                      <span className="text-xs text-gray-500">
                        2 usuários, 5 imóveis, 50 reservas
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="basic">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Basic</span>
                      <span className="text-xs text-gray-500">
                        5 usuários, 20 imóveis, 500 reservas
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Professional</span>
                      <span className="text-xs text-gray-500">
                        15 usuários, 100 imóveis, 5000 reservas
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Enterprise</span>
                      <span className="text-xs text-gray-500">
                        Ilimitado
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || backendOffline || testingConnection}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testingConnection ? (
                'Verificando...'
              ) : backendOffline ? (
                <>
                  <WifiOff className="mr-2 h-4 w-4" />
                  Backend Offline
                </>
              ) : (
                'Criar no Supabase'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
