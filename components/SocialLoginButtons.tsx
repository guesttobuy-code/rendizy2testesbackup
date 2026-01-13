/**
 * SocialLoginButtons.tsx
 * 
 * Botões de login social (Google + Apple) reutilizáveis.
 * Pode ser usado tanto no painel Rendizy quanto nos sites dos clientes.
 * 
 * @version 1.0.104.001
 * @date 2026-01-13
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { loadGoogleScript } from './GoogleOneTap';

// ============================================================================
// TIPOS
// ============================================================================

interface SocialLoginButtonsProps {
  /** Callback quando login Google é bem-sucedido */
  onGoogleSuccess: (credential: string) => Promise<void>;
  /** Callback quando login Apple é bem-sucedido (futuro) */
  onAppleSuccess?: (token: string) => Promise<void>;
  /** Callback de erro */
  onError?: (provider: 'google' | 'apple', error: string) => void;
  /** Se o Apple deve ser exibido (requer configuração) */
  showApple?: boolean;
  /** Texto customizado para o botão Google */
  googleText?: string;
  /** Texto customizado para o botão Apple */
  appleText?: string;
  /** Se está carregando (desabilita botões) */
  disabled?: boolean;
  /** Orientação dos botões */
  orientation?: 'horizontal' | 'vertical';
  /** Tamanho dos botões */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// CONSTANTES
// ============================================================================

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || '';

// ============================================================================
// ÍCONES SVG
// ============================================================================

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill="currentColor"
    />
  </svg>
);

// ============================================================================
// COMPONENTE
// ============================================================================

export function SocialLoginButtons({
  onGoogleSuccess,
  onAppleSuccess,
  onError,
  showApple = false, // Desabilitado por padrão (requer Apple Developer)
  googleText = 'Continuar com Google',
  appleText = 'Continuar com Apple',
  disabled = false,
  orientation = 'vertical',
  size = 'md',
}: SocialLoginButtonsProps) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  // Carrega o script do Google ao montar
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('⚠️ [SocialLoginButtons] VITE_GOOGLE_CLIENT_ID não configurado');
      return;
    }

    loadGoogleScript()
      .then(() => {
        setGoogleReady(true);
        console.log('✅ [SocialLoginButtons] Google script carregado');
      })
      .catch((error) => {
        console.error('❌ [SocialLoginButtons] Erro ao carregar Google script:', error);
      });
  }, []);

  // Handler para clique no botão Google
  const handleGoogleClick = async () => {
    if (!googleReady || loadingGoogle || disabled) return;

    setLoadingGoogle(true);

    try {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        throw new Error('Google Identity Services não disponível');
      }

      // Inicializa se ainda não foi
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            await onGoogleSuccess(response.credential);
          } catch (error) {
            onError?.('google', error instanceof Error ? error.message : 'Erro desconhecido');
          } finally {
            setLoadingGoogle(false);
          }
        },
        ux_mode: 'popup',
      });

      // Abre o popup de seleção de conta
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Se One Tap não funcionar, tenta o fluxo tradicional
          console.log('⚠️ [SocialLoginButtons] Tentando fluxo OAuth tradicional...');
          
          // Fallback: usa o botão renderizado do Google
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                // Com access_token, precisamos buscar o ID token
                // Por simplicidade, vamos usar o access_token mesmo
                try {
                  await onGoogleSuccess(tokenResponse.access_token);
                } catch (error) {
                  onError?.('google', error instanceof Error ? error.message : 'Erro desconhecido');
                }
              }
              setLoadingGoogle(false);
            },
          });
          tokenClient.requestAccessToken();
        }
      });
    } catch (error) {
      console.error('❌ [SocialLoginButtons] Erro no login Google:', error);
      onError?.('google', error instanceof Error ? error.message : 'Erro desconhecido');
      setLoadingGoogle(false);
    }
  };

  // Handler para clique no botão Apple
  const handleAppleClick = async () => {
    if (loadingApple || disabled || !onAppleSuccess) return;

    setLoadingApple(true);

    try {
      // TODO: Implementar Apple Sign In quando tiver Apple Developer Account
      console.log('⚠️ [SocialLoginButtons] Apple Sign In não implementado ainda');
      onError?.('apple', 'Apple Sign In não configurado');
    } catch (error) {
      console.error('❌ [SocialLoginButtons] Erro no login Apple:', error);
      onError?.('apple', error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoadingApple(false);
    }
  };

  // Classes baseadas no tamanho
  const sizeClasses = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
    lg: 'h-12 text-lg',
  };

  const containerClasses = orientation === 'horizontal' 
    ? 'flex flex-row gap-3' 
    : 'flex flex-col gap-3';

  const buttonClasses = `${sizeClasses[size]} w-full font-medium transition-all`;

  return (
    <div className={containerClasses}>
      {/* Botão Google */}
      <Button
        type="button"
        variant="outline"
        className={`${buttonClasses} bg-white hover:bg-gray-50 border-gray-300 text-gray-700`}
        onClick={handleGoogleClick}
        disabled={disabled || loadingGoogle || !GOOGLE_CLIENT_ID}
      >
        {loadingGoogle ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <span className="mr-2">
            <GoogleIcon />
          </span>
        )}
        {loadingGoogle ? 'Entrando...' : googleText}
      </Button>

      {/* Botão Apple (opcional) */}
      {showApple && APPLE_CLIENT_ID && (
        <Button
          type="button"
          variant="outline"
          className={`${buttonClasses} bg-black hover:bg-gray-900 border-black text-white`}
          onClick={handleAppleClick}
          disabled={disabled || loadingApple}
        >
          {loadingApple ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <span className="mr-2">
              <AppleIcon />
            </span>
          )}
          {loadingApple ? 'Entrando...' : appleText}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { SocialLoginButtonsProps };
