import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestAuth, useGoogleOneTap } from '../contexts/GuestAuthContext';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useGuestAuth();
  const navigate = useNavigate();
  
  // Inicializa Google One Tap
  useGoogleOneTap();

  // Redireciona se já logado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/reservas');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const siteSlug = window.GUEST_AREA_CONFIG?.siteSlug || 'Site';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl text-white font-bold">
              {siteSlug.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Área do Cliente</h1>
          <p className="text-gray-500 mt-1">Acesse suas reservas e informações</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border">
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">
                Entrar com Google
              </h2>

              <p className="text-gray-500 text-sm text-center mb-6">
                Use sua conta Google para acessar de forma rápida e segura
              </p>

              {/* Container para Google One Tap / Button */}
              <div id="g_id_onload"
                data-client_id={window.GUEST_AREA_CONFIG?.googleClientId}
                data-context="signin"
                data-ux_mode="popup"
                data-callback="handleGoogleCredential"
                data-auto_prompt="true"
              />

              {/* Botão de fallback manual */}
              <div className="flex justify-center">
                <div
                  id="g_id_signin"
                  className="g_id_signin"
                  data-type="standard"
                  data-shape="rectangular"
                  data-theme="outline"
                  data-text="signin_with"
                  data-size="large"
                  data-logo_alignment="left"
                  data-width="300"
                />
              </div>

              {/* Divisor */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Link para voltar ao site */}
              <a
                href="/"
                className="flex items-center justify-center gap-2 w-full py-3 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Voltar ao site</span>
              </a>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Área exclusiva para hóspedes.
          <br />
          Suas informações estão seguras.
        </p>
      </div>
    </div>
  );
}
