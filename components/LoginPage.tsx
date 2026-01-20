import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { useAuth } from '../src/contexts/AuthContext';
import { Logo } from './Logo';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { confirmPasswordRecovery, requestPasswordRecovery } from '../services/authService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Se já está autenticado, redirecionar
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ [LoginPage] Usuário já autenticado - redirecionando para dashboard');
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Tentando login:', { username });
      
      const result = await login(username, password);
      
      console.log('🔐 [LoginPage] Resultado do login recebido:', result);
      console.log('🔐 [LoginPage] Tipo do resultado:', typeof result);
      console.log('🔐 [LoginPage] Result.success:', result?.success);
      console.log('🔐 [LoginPage] Result.user:', result?.user);
      
      // ✅ CORREÇÃO: Verificar se result existe e tem success
      if (!result || typeof result !== 'object') {
        console.error('❌ Login retornou resposta inválida:', result);
        console.error('❌ Tipo recebido:', typeof result);
        throw new Error('Resposta inválida do servidor');
      }
      
      if (result.success && result.user) {
        console.log('✅ Login bem-sucedido:', result.user);
        toast.success('✅ Login realizado com sucesso!', {
          description: `Bem-vindo, ${result.user.name || username}!`
        });
        
        // ✅ CORREÇÃO: Aguardar mais tempo para garantir que:
        // 1. Token foi salvo no localStorage
        // 2. AuthContext atualizou o estado (user e isAuthenticated)
        // 3. Sessão foi validada no backend
        // 4. ProtectedRoute reconhece o usuário como autenticado
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // ✅ Verificar se isAuthenticated foi atualizado antes de redirecionar
        // Se ainda não estiver autenticado, aguardar mais um pouco
        let attempts = 0;
        while (!isAuthenticated && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Redirecionar para dashboard inicial (todos os usuários)
        console.log('🚀 [LoginPage] Redirecionando para /dashboard...');
        navigate('/dashboard');
      } else {
        // ✅ CORREÇÃO: Mostrar erro específico se houver
        const errorMsg = result.error || 'Erro ao fazer login';
        console.error('❌ Login falhou:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Erro no login:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao fazer login';
      setError(errorMessage);
      
      toast.error('❌ Erro ao fazer login', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  const resetRecoveryState = () => {
    setRecoveryStep('request');
    setRecoveryEmail('');
    setRecoveryToken('');
    setRecoveryCode('');
    setRecoveryNewPassword('');
    setRecoveryLoading(false);
    setRecoveryError('');
  };

  const handleOpenRecovery = () => {
    resetRecoveryState();
    setRecoveryOpen(true);
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    try {
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      const res = await requestPasswordRecovery(recoveryEmail, isLocalhost);
      if (!res.success) {
        setRecoveryError(res.error || res.message || 'Não foi possível solicitar a recuperação');
        return;
      }

      const token = res.data?.recoveryToken || '';
      const code = res.data?.recoveryCode || '';

      if (token) setRecoveryToken(token);
      if (code) setRecoveryCode(code);

      toast.success('✅ Solicitação criada', {
        description: token ? 'Use o código/token para confirmar.' : 'Verifique seu e-mail para o código de recuperação.'
      });

      setRecoveryStep('confirm');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar recuperação';
      setRecoveryError(msg);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);

    try {
      const res = await confirmPasswordRecovery({
        token: recoveryToken,
        code: recoveryCode,
        newPassword: recoveryNewPassword,
      });

      if (!res.success) {
        setRecoveryError(res.error || res.message || 'Não foi possível redefinir a senha');
        return;
      }

      toast.success('✅ Senha atualizada', {
        description: 'Você já pode fazer login com a nova senha.'
      });

      setRecoveryOpen(false);
      setPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao confirmar recuperação';
      setRecoveryError(msg);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo e Título */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo size="md" orientation="horizontal" className="justify-center" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Sistema de Gestão de Imóveis de Temporada
          </p>
        </div>

        {/* Card de Login */}
        <Card className="shadow-xl border bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">Entrar no Sistema</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Usuário */}
              <div className="space-y-2">
                <Label htmlFor="username">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botão de Login */}
              <Button
                type="submit"
                className="w-full text-white transition-all h-11 text-base"
                style={{ 
                  backgroundColor: '#363E46',
                  borderColor: '#363E46'
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#2d3438';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#363E46';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm"
                  onClick={handleOpenRecovery}
                  disabled={loading}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-0">
            {/* Credenciais de Teste */}
            <div className="w-full space-y-2">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Credenciais de teste (SuperAdmin):
              </p>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('rppt', 'root')}
                  disabled={loading}
                  className="text-xs"
                >
                  <User className="mr-2 h-3 w-3" />
                  rppt / root
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('admin', 'root')}
                  disabled={loading}
                  className="text-xs"
                >
                  <User className="mr-2 h-3 w-3" />
                  admin / root
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Versão */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          RENDIZY v1.0.103.260 - Multi-Tenant SaaS
        </div>
      </div>

      <Dialog
        open={recoveryOpen}
        onOpenChange={(open) => {
          setRecoveryOpen(open);
          if (!open) resetRecoveryState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperação de senha</DialogTitle>
            <DialogDescription>
              {recoveryStep === 'request'
                ? 'Informe o e-mail do usuário para receber um código de recuperação.'
                : 'Informe o token/código e defina a nova senha.'}
            </DialogDescription>
          </DialogHeader>

          {recoveryError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{recoveryError}</AlertDescription>
            </Alert>
          )}

          {recoveryStep === 'request' ? (
            <form onSubmit={handleRequestRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recoveryEmail">E-mail</Label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  placeholder="ex: usuario@empresa.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  disabled={recoveryLoading}
                  required
                  autoComplete="email"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRecoveryOpen(false)} disabled={recoveryLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={recoveryLoading}>
                  {recoveryLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar código'
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleConfirmRecovery} className="space-y-4">
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="recoveryToken">Token</Label>
                  <Input
                    id="recoveryToken"
                    type="text"
                    placeholder="Cole o token"
                    value={recoveryToken}
                    onChange={(e) => setRecoveryToken(e.target.value)}
                    disabled={recoveryLoading}
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recoveryCode">Código (6 dígitos)</Label>
                  <Input
                    id="recoveryCode"
                    type="text"
                    placeholder="000000"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    disabled={recoveryLoading}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recoveryNewPassword">Nova senha</Label>
                  <Input
                    id="recoveryNewPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    disabled={recoveryLoading}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRecoveryStep('request');
                    setRecoveryError('');
                  }}
                  disabled={recoveryLoading}
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={recoveryLoading}>
                  {recoveryLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Redefinir senha'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
