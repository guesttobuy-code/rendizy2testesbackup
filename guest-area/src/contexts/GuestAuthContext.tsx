import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface GuestUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  dial?: string;
  avatar_url?: string;
}

interface GuestAuthContextType {
  user: GuestUser | null;
  loading: boolean;
  isLoading: boolean; // alias para loading
  login: (credential: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const GuestAuthContext = createContext<GuestAuthContextType | null>(null);

export function useGuestAuth() {
  const context = useContext(GuestAuthContext);
  if (!context) {
    throw new Error('useGuestAuth must be used within GuestAuthProvider');
  }
  return context;
}

const GOOGLE_CLIENT_ID = '1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com';

export function GuestAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);

  const config = window.GUEST_AREA_CONFIG;
  const siteSlug = config?.siteSlug || '';

  const mergeLocalProfile = useCallback((u: GuestUser | null): GuestUser | null => {
    if (!u) return null;
    try {
      const raw = localStorage.getItem('rendizy_guest_profile');
      if (!raw || raw === 'undefined' || raw === 'null') return u;
      const prof = JSON.parse(raw) as { phone?: string; dial?: string };
      const merged: GuestUser = { ...u };
      if (!merged.phone && prof?.phone) merged.phone = prof.phone;
      if (!merged.dial && prof?.dial) merged.dial = prof.dial;
      return merged;
    } catch {
      return u;
    }
  }, []);

  // Sessão profissional do hóspede: cookie httpOnly (BFF).
  // Nunca usar token do painel admin aqui. Dados são sempre filtrados por siteSlug.
  // Front consulta /api/auth/me para validar sessão.
  useEffect(() => {
    if (!siteSlug) {
      setLoading(false);
      return;
    }

    fetch(`/api/auth/me?siteSlug=${encodeURIComponent(siteSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          const merged = mergeLocalProfile(data.user);
          setUser(merged);
          try {
            localStorage.setItem('rendizy_guest', JSON.stringify(merged));
          } catch {}
        } else {
          setUser(null);
          localStorage.removeItem('rendizy_guest');
          localStorage.removeItem('rendizy_guest_token');
        }
      })
      .catch(() => {
        // mantém UX simples: não derruba a página, só considera deslogado
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [siteSlug]);

  const login = useCallback(
    async (credential: string) => {
      if (!siteSlug) throw new Error('Site slug não configurado');

      const response = await fetch(`/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, siteSlug }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      const merged = mergeLocalProfile(data.guest || null);
      setUser(merged);
      if (merged) {
        localStorage.setItem('rendizy_guest', JSON.stringify(merged));
      }
    },
    [siteSlug, mergeLocalProfile]
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('rendizy_guest_token');
    localStorage.removeItem('rendizy_guest');

    // best-effort: limpar sessão no servidor
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    
    // Desabilitar auto-select do Google
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    
    // Redirecionar para o site principal (não para login)
    const config = (window as any).GUEST_AREA_CONFIG;
    if (config?.siteUrl) {
      // Redirecionar para o site do cliente
      window.location.href = config.siteUrl;
    } else {
      // Fallback: voltar para a raiz do site
      const slug = new URLSearchParams(window.location.search).get('slug') || '';
      if (slug) {
        window.location.href = `/site/${slug}/`;
      } else {
        window.location.href = '/';
      }
    }
  }, []);

  return (
    <GuestAuthContext.Provider
      value={{
        user,
        loading,
        isLoading: loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  );
}

// Hook para iniciar Google One Tap (agora usa login do contexto)
export function useGoogleOneTap() {
  const { login } = useGuestAuth();
  const initializedRef = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  
  useEffect(() => {
    const waitGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        // Tentar novamente em 500ms
        setTimeout(waitGoogle, 500);
        return;
      }

      setGoogleReady(true);
    };

    waitGoogle();
  }, [login]);

  const startGoogleLogin = useCallback(() => {
    setGoogleError(null);

    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setGoogleError('Google não carregou. Verifique bloqueadores/extensões e tente novamente.');
      return;
    }

    const clientId = (window as any).GUEST_AREA_CONFIG?.googleClientId || GOOGLE_CLIENT_ID;
    const siteSlug = (window as any).GUEST_AREA_CONFIG?.siteSlug || '';

    if (!initializedRef.current) {
      initializedRef.current = true;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          if (response.credential) {
            try {
              await login(response.credential);
              // Pós-login: valida sessão via cookie; se a UI não refletir, faz refresh.
              window.location.hash = '#/reservas';
              if (siteSlug) {
                try {
                  const res = await fetch(
                    `/api/auth/me?siteSlug=${encodeURIComponent(siteSlug)}`,
                    { credentials: 'include' }
                  );
                  const data = await res.json().catch(() => null);
                  if (!data?.authenticated) {
                    setTimeout(() => window.location.reload(), 120);
                  }
                } catch {
                  setTimeout(() => window.location.reload(), 120);
                }
              } else {
                setTimeout(() => window.location.reload(), 120);
              }
            } catch (err) {
              console.error('Erro no login:', err);
              setGoogleError('Falha ao entrar. Tente novamente.');
            }
          } else {
            setGoogleError('Não foi possível obter credencial do Google.');
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
        // FedCM será obrigatório — já habilitado para evitar bloqueio do login
        use_fedcm_for_prompt: true,
      });
    }

    // Só abre quando o usuário clicar (evita cooldown de auto re-authn)
    google.accounts.id.prompt((notification: any) => {
      try {
        if (notification?.isNotDisplayed?.()) {
          setGoogleError(
            'Login do Google não foi exibido. Verifique se o Chrome permite “login de terceiros/FedCM” para este site e se pop-ups não estão bloqueados.'
          );
          return;
        }
        if (notification?.isSkippedMoment?.()) {
          setGoogleError(
            'O login do Google foi bloqueado/ignorado pelo navegador. Verifique permissões de login de terceiros/FedCM e tente novamente.'
          );
          return;
        }
        if (notification?.isDismissedMoment?.()) {
          // usuário fechou o popup — não é erro; só não faz nada
          return;
        }
      } catch {
        // ignore
      }
    });
  }, [login]);

  return {
    googleReady,
    googleError,
    startGoogleLogin,
  };
}
