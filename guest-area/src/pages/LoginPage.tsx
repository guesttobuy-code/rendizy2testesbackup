import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestAuth, useGoogleOneTap } from '../contexts/GuestAuthContext';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useGuestAuth();
  const navigate = useNavigate();
  
  const { googleReady, googleError, startGoogleLogin } = useGoogleOneTap();
  const [customDomain, setCustomDomain] = useState<string | null>(null);

  // Redireciona se já logado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/reservas');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const siteSlug = window.GUEST_AREA_CONFIG?.siteSlug || '';

  // Busca domínio customizado via API
  useEffect(() => {
    if (!siteSlug) return;
    const apiBase = window.GUEST_AREA_CONFIG?.supabaseUrl;
    if (!apiBase) return;
    fetch(`${apiBase}/functions/v1/rendizy-public/client-sites/api/${siteSlug}/site-config`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.domain) {
          setCustomDomain(json.data.domain);
        }
      })
      .catch(() => {});
  }, [siteSlug]);

  if (!siteSlug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Área do Cliente</h1>
          <p className="text-gray-600">
            Acesse esta área pelo site da imobiliária para identificar o cliente correto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl text-white font-bold">
              {siteSlug.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Área do Cliente</h1>
          <p className="text-gray-500 text-sm">Acesse suas reservas e informações</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-4">
                Entrar com Google
              </h2>
              <p className="text-gray-500 text-sm text-center mb-4">
                Use sua conta Google para acessar de forma rápida e segura
              </p>

              <button
                type="button"
                onClick={() => startGoogleLogin()}
                disabled={!googleReady}
                className="w-full py-3 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleReady ? 'Continuar com Google' : 'Carregando Google…'}
              </button>

              {googleError && (
                <p className="text-sm text-red-600 mt-3 text-center">
                  {googleError}
                </p>
              )}

              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch {}
                  try {
                    localStorage.removeItem('rendizy_guest_token');
                    localStorage.removeItem('rendizy_guest');
                  } catch {}
                  window.location.hash = '#/login';
                  window.location.reload();
                }}
                className="w-full py-2 mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Limpar sessão
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <a
                href={
                  customDomain
                    ? (customDomain.startsWith('http') ? customDomain : `https://${customDomain}/`)
                    : (window.GUEST_AREA_CONFIG?.siteUrl || `/site/${siteSlug}/`)
                }
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

        <p className="text-center text-xs text-gray-400 mt-6">
          Área exclusiva para hóspedes. Suas informações estão seguras.
        </p>
      </div>
    </div>
  );
}
