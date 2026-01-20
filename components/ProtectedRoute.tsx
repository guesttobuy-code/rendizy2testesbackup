import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOrganization?: boolean;
  redirectTo?: string;
}

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password', '/guest-area'];

/**
 * ProtectedRoute - Componente SIMPLIFICADO de proteção de rotas
 * 
 * @version 1.0.103.500 - SIMPLIFICADO para evitar loops infinitos
 * @date 2026-01-17
 */
export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireOrganization = false, // Desabilitado por padrão para evitar loops
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  // 1. Rotas públicas → liberado imediatamente
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return <>{children}</>;
  }

  // 2. Ainda carregando → mostrar loading por no máximo 2 segundos
  // Usar timeout local para evitar loading infinito
  const [forceShow, setForceShow] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // 3. Sem autenticação → redireciona para login
  if (requireAuth && !isAuthenticated && !user) {
    console.log('🔒 [ProtectedRoute] Sem sessão - redirecionando para login');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 4. Autenticado → renderiza conteúdo
  return <>{children}</>;
}
