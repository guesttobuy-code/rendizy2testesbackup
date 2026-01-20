/**
 * Error Boundary Component
 * 
 * Captura erros JavaScript em componentes React e mostra
 * uma mensagem amigável em vez de tela em branco.
 * 
 * @version 1.0.103.322
 * @date 2025-11-16
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Wrapper component para usar hooks dentro do ErrorBoundary
function ErrorBoundaryWrapper({ children, fallback, onError }: Props) {
  const navigate = useNavigate();
  
  return (
    <ErrorBoundary 
      navigate={navigate}
      fallback={fallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}

// Internal ErrorBoundary class (sem hooks)
interface ErrorBoundaryInternalProps extends Props {
  navigate: (path: string) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryInternalProps, State> {
  constructor(props: ErrorBoundaryInternalProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Atualiza o state para mostrar a UI de erro
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro no console
    console.error('❌ ERRO CAPTURADO PELO ERROR BOUNDARY');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('📋 Mensagem do erro:', error.message);
    console.error('📋 Tipo do erro:', error.constructor.name);
    console.error('📋 Stack trace:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('📍 Informações do componente:', errorInfo.componentStack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Atualiza state com informações do erro
    this.setState({
      errorInfo
    });
    
    // 🔥 REDIRECIONA AUTOMATICAMENTE PARA O DASHBOARD
    // Em vez de mostrar tela em branco, volta para uma página funcional
    // Usa timeout para garantir que o estado foi atualizado
    setTimeout(() => {
      try {
        this.props.navigate('/dashboard', { replace: true });
      } catch (navError) {
        // Fallback: recarrega a página se navigate falhar
        console.error('Erro ao redirecionar:', navError);
        window.location.href = '/dashboard';
      }
    }, 50);
    
    // Mostra toast de erro amigável
    toast.error('Ops! Algo deu errado', {
      description: 'Ocorreu um erro inesperado. Você foi redirecionado para o dashboard.',
      duration: 5000,
    });
    
    // Chama callback se fornecido (útil para enviar para serviços de monitoramento)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // TODO: Aqui você pode integrar com serviços de monitoramento:
    // - Sentry.captureException(error, { contexts: { react: errorInfo } });
    // - LogRocket.captureException(error);
    // - Analytics.track('error', { error: error.message });
  }

  handleReload = () => {
    // Recarrega a página
    window.location.reload();
  };

  handleReset = () => {
    // Reseta o estado do ErrorBoundary e redireciona para dashboard
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.navigate('/dashboard');
  };

  handleGoToDashboard = () => {
    // Redireciona para dashboard
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.navigate('/dashboard');
  };

  render() {
    if (this.state.hasError) {
      // Se foi fornecido um fallback customizado, usa ele
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // 🔥 NOVA ESTRATÉGIA: Renderiza Dashboard com Banner de Erro
      // Em vez de tela em branco, mostra dashboard funcional com aviso
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Banner de Erro no Topo */}
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
            <div className="max-w-7xl mx-auto flex items-start gap-4">
              <div className="flex-shrink-0 text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
                  Ops! Algo deu errado
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Ocorreu um erro inesperado. Você foi redirecionado para o dashboard.
                </p>
                
                {/* Detalhes do erro (colapsável) */}
                {this.state.error && (
                  <details className="mb-2">
                    <summary className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
                      📋 Ver detalhes técnicos do erro
                    </summary>
                    <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded text-xs">
                      <div className="mb-2">
                        <span className="font-semibold">Erro:</span>
                        <pre className="text-red-800 dark:text-red-200 mt-1 overflow-auto max-h-40">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.error.stack && (
                        <div className="mt-2">
                          <span className="font-semibold">Stack:</span>
                          <pre className="text-red-700 dark:text-red-300 mt-1 overflow-auto max-h-40">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                {/* Ações rápidas */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={this.handleGoToDashboard}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    ✅ Ir para Dashboard
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 rounded-lg hover:bg-red-300 dark:hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🔄 Recarregar Página
                  </button>
                  <button
                    onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    ✖️ Fechar Aviso
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Renderiza Dashboard Normal (através do navigate) */}
          {/* O redirecionamento já foi feito no componentDidCatch */}
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecionando para o dashboard...
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Exporta o wrapper como default
export default ErrorBoundaryWrapper;

// Exporta a classe para uso direto se necessário
export { ErrorBoundary as ErrorBoundaryClass };

