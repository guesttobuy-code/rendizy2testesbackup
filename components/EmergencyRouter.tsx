/**
 * RENDIZY - Emergency Router
 * 
 * Componente de emergência para capturar 404 e redirecionar
 * SEMPRE para o Dashboard Inicial
 * 
 * @version 1.0.103.207
 * @date 2025-10-31
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function EmergencyRouter() {
  const location = useLocation();

  useEffect(() => {
    // Se está em qualquer rota que não seja uma das válidas, redirecionar
    const validRoutes = [
      '/',
      '/properties',
      '/properties/new',
      '/reservations',
      '/admin',
      '/financeiro',
      '/crm',
      '/bi'
    ];

    const currentPath = location.pathname;
    
    // Verificar se a rota atual é válida (ou é uma subrota de uma rota válida)
    const isValidRoute = validRoutes.some(route => 
      currentPath === route || currentPath.startsWith(route + '/')
    );

    if (!isValidRoute) {
      console.log('🚨 EMERGENCY ROUTER: Rota inválida detectada:', currentPath);
      console.log('🔄 Redirecionando para Dashboard...');
      
      // Usar window.location para garantir navegação completa
      window.location.href = '/';
    }
  }, [location]);

  return null; // Não renderiza nada
}
