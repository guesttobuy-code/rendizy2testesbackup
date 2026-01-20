/**
 * GoogleOneTap.tsx
 * 
 * Componente para exibir o popup "One Tap" do Google Sign-In.
 * Aparece automaticamente se o usuário tiver sessão Google ativa.
 * 
 * @version 1.0.104.001
 * @date 2026-01-13
 * 
 * Documentação: https://developers.google.com/identity/gsi/web/guides/display-google-one-tap
 */

import { useEffect, useCallback } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

interface GoogleOneTapProps {
  /** ID do cliente Google OAuth */
  clientId?: string;
  /** Callback quando o usuário faz login com sucesso */
  onSuccess: (credential: string, userData: GoogleUserData) => void;
  /** Callback quando o login falha ou é cancelado */
  onError?: (error: string) => void;
  /** Se deve mostrar o One Tap automaticamente */
  autoShow?: boolean;
  /** Contexto do One Tap (signin, signup, use) */
  context?: 'signin' | 'signup' | 'use';
  /** Se deve cancelar ao clicar fora */
  cancelOnTapOutside?: boolean;
}

interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  sub: string; // Google user ID
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Decodifica o JWT do Google (credential) para extrair dados do usuário
 */
function decodeGoogleCredential(credential: string): GoogleUserData | null {
  try {
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub,
    };
  } catch (error) {
    console.error('❌ [GoogleOneTap] Erro ao decodificar credential:', error);
    return null;
  }
}

/**
 * Carrega o script do Google Identity Services
 */
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Se já carregou, resolve imediatamente
    if (typeof window !== 'undefined' && (window as any).google?.accounts) {
      resolve();
      return;
    }

    // Verifica se o script já está sendo carregado
    const existingScript = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }

    // Cria e adiciona o script
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function GoogleOneTap({
  clientId = GOOGLE_CLIENT_ID,
  onSuccess,
  onError,
  autoShow = true,
  context = 'signin',
  cancelOnTapOutside = true,
}: GoogleOneTapProps) {
  
  const handleCredentialResponse = useCallback(
    (response: GoogleCredentialResponse) => {
      console.log('✅ [GoogleOneTap] Credential recebida:', response.select_by);
      
      const userData = decodeGoogleCredential(response.credential);
      if (userData) {
        console.log('✅ [GoogleOneTap] Usuário:', userData.email);
        onSuccess(response.credential, userData);
      } else {
        onError?.('Erro ao decodificar credencial do Google');
      }
    },
    [onSuccess, onError]
  );

  useEffect(() => {
    if (!clientId) {
      console.warn('⚠️ [GoogleOneTap] VITE_GOOGLE_CLIENT_ID não configurado');
      return;
    }

    let isMounted = true;

    const initOneTap = async () => {
      try {
        await loadGoogleScript();

        if (!isMounted) return;

        const google = (window as any).google;
        if (!google?.accounts?.id) {
          console.error('❌ [GoogleOneTap] Google Identity Services não carregou');
          return;
        }

        // Inicializa o Google Identity Services
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false, // Não selecionar conta automaticamente
          cancel_on_tap_outside: cancelOnTapOutside,
          context: context,
          ux_mode: 'popup',
          itp_support: true, // Suporte para Safari ITP
        });

        // Mostra o One Tap se autoShow estiver habilitado
        if (autoShow) {
          console.log('🔔 [GoogleOneTap] Exibindo One Tap...');
          google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed()) {
              console.log('⚠️ [GoogleOneTap] One Tap não exibido:', notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
              console.log('⚠️ [GoogleOneTap] One Tap pulado:', notification.getSkippedReason());
            } else if (notification.isDismissedMoment()) {
              console.log('ℹ️ [GoogleOneTap] One Tap dispensado:', notification.getDismissedReason());
            }
          });
        }
      } catch (error) {
        console.error('❌ [GoogleOneTap] Erro ao inicializar:', error);
        onError?.('Erro ao carregar Google Sign-In');
      }
    };

    initOneTap();

    return () => {
      isMounted = false;
      // Cancela o One Tap ao desmontar
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.cancel();
      }
    };
  }, [clientId, autoShow, context, cancelOnTapOutside, handleCredentialResponse, onError]);

  // Este componente não renderiza nada visível
  // O popup é renderizado pelo próprio Google
  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { GoogleOneTapProps, GoogleUserData, GoogleCredentialResponse };
export { decodeGoogleCredential, loadGoogleScript };
