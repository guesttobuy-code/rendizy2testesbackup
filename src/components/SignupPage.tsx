import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  CheckCircle,
  Gift,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../../components/Logo';

// API para signup
const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function signup(data: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  phone?: string;
  referralCode?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/functions/v1/rendizy-server/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/functions/v1/rendizy-server/auth/check-email?email=${encodeURIComponent(email)}`,
      {
        headers: { 'apikey': API_KEY }
      }
    );
    const result = await response.json();
    return result.available ?? true;
  } catch {
    return true; // Em caso de erro, permite continuar
  }
}

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    phone: '',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [step, setStep] = useState(1); // 1: dados pessoais, 2: dados da empresa
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Se já está autenticado, redirecionar
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Verificar email quando usuário parar de digitar
  useEffect(() => {
    if (!formData.email || !formData.email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      const available = await checkEmailAvailable(formData.email);
      setEmailAvailable(available);
      setCheckingEmail(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Email válido é obrigatório');
      return false;
    }
    if (emailAvailable === false) {
      setError('Este email já está cadastrado');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Senhas não conferem');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.organizationName.trim()) {
      setError('Nome da imobiliária é obrigatório');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setError('');
    setLoading(true);

    try {
      const result = await signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        organizationName: formData.organizationName.trim(),
        phone: formData.phone.trim() || undefined,
        referralCode: formData.referralCode.trim() || undefined
      });

      if (result.success) {
        // Salvar token e dados do usuário
        if (result.data?.token) {
          localStorage.setItem('rendizy-token', result.data.token);
          localStorage.setItem('rendizy-user', JSON.stringify(result.data.user));
        }

        toast.success('🎉 Conta criada com sucesso!', {
          description: 'Você tem 14 dias de teste gratuito. Aproveite!'
        });

        // Aguardar um pouco antes de redirecionar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Forçar reload para AuthContext pegar o novo token
        window.location.href = '/dashboard';
      } else {
        throw new Error(result.error || 'Erro ao criar conta');
      }
    } catch (err) {
      console.error('❌ Erro no signup:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error('❌ Erro ao criar conta', { description: errorMessage });
    } finally {
      setLoading(false);
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

        {/* Benefícios do Trial */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">14 dias grátis!</p>
              <p className="text-sm text-white/90">
                Acesso completo a todas as funcionalidades. Sem cartão de crédito.
              </p>
            </div>
          </div>
        </div>

        {/* Card de Signup */}
        <Card className="shadow-xl border bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">
              {step === 1 ? 'Criar sua conta' : 'Dados da Imobiliária'}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'Preencha seus dados pessoais'
                : 'Informe os dados da sua empresa'}
            </CardDescription>
            
            {/* Indicador de passos */}
            <div className="flex gap-2 pt-2">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
            </div>
          </CardHeader>
          
          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {step === 1 ? (
                // PASSO 1: Dados pessoais
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Seu nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="João da Silva"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        className={`pl-10 pr-10 ${
                          emailAvailable === false ? 'border-red-500' : 
                          emailAvailable === true ? 'border-green-500' : ''
                        }`}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingEmail && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                        {!checkingEmail && emailAvailable === true && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {!checkingEmail && emailAvailable === false && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {emailAvailable === false && (
                      <p className="text-sm text-red-500">Este email já está cadastrado</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10 pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Digite a senha novamente"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-sm text-red-500">Senhas não conferem</p>
                    )}
                  </div>
                </>
              ) : (
                // PASSO 2: Dados da empresa
                <>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Nome da Imobiliária</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="organizationName"
                        name="organizationName"
                        type="text"
                        placeholder="Imobiliária Exemplo Ltda"
                        value={formData.organizationName}
                        onChange={handleChange}
                        className="pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referralCode">Código de indicação (opcional)</Label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="referralCode"
                        name="referralCode"
                        type="text"
                        placeholder="CODIGO123"
                        value={formData.referralCode}
                        onChange={handleChange}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Se você foi indicado por alguém, insira o código aqui
                    </p>
                  </div>

                  {/* Resumo */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-sm text-gray-700 dark:text-gray-300">Resumo:</p>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="font-medium">Nome:</span> {formData.name}</p>
                      <p><span className="font-medium">Email:</span> {formData.email}</p>
                      <p><span className="font-medium">Empresa:</span> {formData.organizationName || '(não informado)'}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              {step === 1 ? (
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading || emailAvailable === false}
                >
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="w-full space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Criar conta e começar trial
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                </div>
              )}

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Já tem uma conta?{' '}
                <Link 
                  to="/login" 
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Fazer login
                </Link>
              </div>

              <p className="text-xs text-center text-gray-500">
                Ao criar sua conta, você concorda com nossos{' '}
                <a href="/termos" className="underline hover:text-gray-700">Termos de Uso</a>
                {' '}e{' '}
                <a href="/privacidade" className="underline hover:text-gray-700">Política de Privacidade</a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
