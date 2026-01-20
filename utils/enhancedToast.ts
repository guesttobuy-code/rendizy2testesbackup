/**
 * RENDIZY - Enhanced Toast
 * 
 * Sistema de notificações visuais aprimorado com duração customizada
 * e feedback mais claro para o usuário
 * 
 * @version 1.0.103.282
 * @date 2025-11-04
 */

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  /**
   * Duração em milissegundos
   * @default 5000 (5 segundos)
   */
  duration?: number;
  
  /**
   * Descrição adicional
   */
  description?: string;
  
  /**
   * Ação customizada
   */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast de Sucesso - Verde, mais visível e duradouro
 */
export const success = (message: string, options?: ToastOptions) => {
  return sonnerToast.success(message, {
    duration: options?.duration || 5000, // 5 segundos
    description: options?.description,
    action: options?.action,
    className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    style: {
      border: '2px solid rgb(34 197 94)',
    }
  });
};

/**
 * Toast de Erro - Vermelho, mais visível e duradouro
 */
export const error = (message: string, options?: ToastOptions) => {
  return sonnerToast.error(message, {
    duration: options?.duration || 6000, // 6 segundos (mais tempo para ler erro)
    description: options?.description,
    action: options?.action,
    className: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    style: {
      border: '2px solid rgb(239 68 68)',
    }
  });
};

/**
 * Toast de Informação - Azul, mais visível
 */
export const info = (message: string, options?: ToastOptions) => {
  return sonnerToast.info(message, {
    duration: options?.duration || 4000, // 4 segundos
    description: options?.description,
    action: options?.action,
    className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    style: {
      border: '2px solid rgb(59 130 246)',
    }
  });
};

/**
 * Toast de Aviso - Amarelo, mais visível
 */
export const warning = (message: string, options?: ToastOptions) => {
  return sonnerToast.warning(message, {
    duration: options?.duration || 5000, // 5 segundos
    description: options?.description,
    action: options?.action,
    className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    style: {
      border: '2px solid rgb(234 179 8)',
    }
  });
};

/**
 * Toast de Loading - Para operações em andamento
 */
export const loading = (message: string, options?: { description?: string }) => {
  return sonnerToast.loading(message, {
    description: options?.description,
  });
};

/**
 * Toast Customizado
 */
export const custom = (message: string, options?: ToastOptions & { type?: 'success' | 'error' | 'info' | 'warning' }) => {
  const type = options?.type || 'info';
  
  switch (type) {
    case 'success':
      return success(message, options);
    case 'error':
      return error(message, options);
    case 'warning':
      return warning(message, options);
    default:
      return info(message, options);
  }
};

/**
 * Promessa com Toast - Mostra loading, sucesso e erro automaticamente
 */
export const promise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    duration: 5000,
  });
};

// Exportar como objeto também para compatibilidade
export const enhancedToast = {
  success,
  error,
  info,
  warning,
  loading,
  custom,
  promise,
};

export default enhancedToast;
