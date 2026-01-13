import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface GuestUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
}

interface GuestAuthContextType {
  user: GuestUser | null;
  token: string | null;
  loading: boolean;
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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { subdomain, apiBase } = window.GUEST_AREA_CONFIG || {};

  // Verificar token existente ao carregar
  useEffect(() => {
    const savedToken = localStorage.getItem('rendizy_guest_token');
    if (savedToken && subdomain) {
      fetch(`${apiBase}/${subdomain}/auth/guest/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setUser(data.user);
            setToken(savedToken);
          } else {
            localStorage.removeItem('rendizy_guest_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('rendizy_guest_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [subdomain, apiBase]);

  const login = useCallback(
    async (credential: string) => {
      if (!subdomain) throw new Error('Subdomain não configurado');

      const response = await fetch(`${apiBase}/${subdomain}/auth/guest/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      setUser(data.guest);
      setToken(data.token);
      localStorage.setItem('rendizy_guest_token', data.token);
      localStorage.setItem('rendizy_guest', JSON.stringify(data.guest));
    },
    [subdomain, apiBase]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rendizy_guest_token');
    localStorage.removeItem('rendizy_guest');
    
    // Desabilitar auto-select do Google
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    
    // Redirecionar para login
    window.location.hash = '#/login';
  }, []);

  return (
    <GuestAuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  );
}

// Hook para iniciar Google One Tap
export function useGoogleOneTap(onSuccess: (credential: string) => void) {
  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        // Tentar novamente em 500ms
        setTimeout(initGoogle, 500);
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          if (response.credential) {
            onSuccess(response.credential);
          }
        },
        auto_select: true,
        cancel_on_tap_outside: false,
      });

      google.accounts.id.prompt();
    };

    initGoogle();
  }, [onSuccess]);
}
