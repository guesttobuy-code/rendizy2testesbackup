import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../../components/Logo';
import { SocialLoginButtons } from '../../components/SocialLoginButtons';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
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

  // Handler para login com Google
  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    
    try {
      console.log('🔐 [LoginPage] Iniciando login com Google...');
      
      // Se loginWithGoogle não existir ainda, mostrar mensagem
      if (!loginWithGoogle) {
        toast.info('🚧 Login com Google em desenvolvimento', {
          description: 'Use email/senha por enquanto'
        });
        setShowEmailForm(true);
        return;
      }
      
      const result = await loginWithGoogle(credential);
      
      if (result?.success && result?.user) {
        toast.success('✅ Login realizado com sucesso!', {
          description: `Bem-vindo, ${result.user.name}!`
        });
        navigate('/dashboard');
      } else {
        throw new Error(result?.error || 'Erro ao fazer login com Google');
      }
    } catch (err) {
      console.error('❌ Erro no login Google:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error('❌ Erro ao fazer login', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialError = (provider: 'google' | 'apple', error: string) => {
    console.error(`❌ Erro no login ${provider}:`, error);
    setError(`Erro ao fazer login com ${provider}: ${error}`);
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
          
          <CardContent className="pt-0 space-y-6">
            {/* Login Social */}
            <div className="space-y-4">
              <SocialLoginButtons
                onGoogleSuccess={handleGoogleSuccess}
                onError={handleSocialError}
                disabled={loading}
                googleText="Continuar com Google"
                size="md"
              />
              
              {/* Divisor */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                    ou continue com email
                  </span>
                </div>
              </div>
            </div>

            {/* Formulário de Email/Senha */}
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
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-0">
            {/* Link para cadastro */}
            <div className="w-full text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ainda não tem conta?{' '}
                <a 
                  href="/signup" 
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Cadastre-se grátis
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                14 dias de teste gratuito • Sem cartão de crédito
              </p>
            </div>

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
          RENDIZY v1.0.104.001 - Multi-Tenant SaaS + OAuth
        </div>
      </div>
    </div>
  );
}
