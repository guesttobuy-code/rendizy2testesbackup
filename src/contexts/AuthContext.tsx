import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, Permission, PermissionCheck, DEFAULT_PERMISSIONS } from '../../types/tenancy';
// ✅ ARQUITETURA OAuth2 v1.0.103.1010: Integração com authService e BroadcastChannel
import { login as authServiceLogin, logout as authServiceLogout, getCurrentUser } from '../../services/authService';
import { getAuthBroadcast, authBroadcast } from '../../utils/authBroadcast_clean';
// ✅ ARQUITETURA OAuth2 v1.0.103.1010: Usar singleton do Supabase client
import { getSupabaseClient } from '../../utils/supabase/client';

// ✅ MELHORIA v1.0.103.400 - Usa user_metadata do Supabase como fallback
// ✅ ARQUITETURA OAuth2 v1.0.103.1010: Usar singleton
const supabase = getSupabaseClient();

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasToken: boolean; // ✅ CORREÇÃO v1.0.103.1007: Expor hasTokenState para ProtectedRoute
  
  // Auth actions
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  
  // Permission checks
  hasPermission: (check: PermissionCheck) => boolean;
  canCreate: (resource: string) => boolean;
  canRead: (resource: string) => boolean;
  canUpdate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canExport: (resource: string) => boolean;
  
  // Role checks
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ✅ CORREÇÃO v1.0.103.1005: Estado reativo para token (evita problemas com F5)
  const [hasTokenState, setHasTokenState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('rendizy-token');
    }
    return false;
  });

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('rendizy-token');
      const hasToken = !!token;

      console.log('🔍 [AuthContext] Token no localStorage ao montar:', hasToken ? `SIM (${token!.substring(0, 20)}...)` : 'NÃO');
      setHasTokenState(hasToken);

      if (!hasToken && isMounted) {
        setIsLoading(false);
      }
    }
    
    const loadUser = async (retries = 1, skipDelay = false, isPeriodicCheck = false) => {
      try {
        if (!isPeriodicCheck) {
          console.log('🔐 [AuthContext] Verificando sessão via token no header...');
        }

        const { projectId, publicAnonKey } = await import('../../utils/supabase/info');
        const token = localStorage.getItem('rendizy-token');
        
        if (token) {
          setHasTokenState(true);
        } else {
          setHasTokenState(false);
          if (!isPeriodicCheck) {
            console.log('⚠️ [AuthContext] Token não encontrado no localStorage');
          }
          if (isMounted && !isPeriodicCheck) {
            setTimeout(() => {
              if (isMounted) {
                setIsLoading(false);
                if (!user) {
                  setUser(null);
                }
              }
            }, 100);
          }
          return;
        }

        if (!skipDelay) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/auth/me`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': token
          },
          credentials: 'omit'
        });

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ [AuthContext] Erro ao parsear resposta:', parseError);
          console.error('❌ [AuthContext] Resposta:', responseText.substring(0, 200));
          if (isMounted && !isPeriodicCheck) {
            setIsLoading(false);
          }
          return;
        }

        if (!response.ok || !data || !data.success) {
          if (response.status === 401) {
            if (isPeriodicCheck) {
              console.warn('⚠️ [AuthContext] 401 em validação periódica - mantendo token (pode ser erro temporário)');
              if (isMounted) {
                setIsLoading(false);
              }
              return;
            }
            console.log('❌ [AuthContext] Sessão inválida/expirada (401) - limpando token e resetando estado');
            localStorage.removeItem('rendizy-token');
            setHasTokenState(false);
            if (isMounted) {
              setUser(null);
              setOrganization(null);
              setIsLoading(false);
            }
            return;
          }

          if (retries > 0 && !isPeriodicCheck) {
            console.warn(`⚠️ [AuthContext] Erro de rede, tentando novamente... (${retries} tentativa restante)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return loadUser(retries - 1, true, isPeriodicCheck);
          }

          if (isMounted && !isPeriodicCheck) {
            setIsLoading(false);
          }
          return;
        }

        const backendUser = data.user || data.data?.user;

        // Fallback: backend mínimo pode responder success sem user; usamos cache local
        const cachedUserRaw = localStorage.getItem('rendizy-user');
        const cachedUser = cachedUserRaw ? (() => { try { return JSON.parse(cachedUserRaw); } catch { return null; } })() : null;

        if (!backendUser || !backendUser.id) {
          if (cachedUser && cachedUser.id) {
            console.warn('⚠️ [AuthContext] Resposta sem usuário válido - usando cache local');
          } else {
            console.warn('⚠️ [AuthContext] Resposta sem usuário válido e sem cache', data);
          }

          if (cachedUser && cachedUser.id) {
            setUser(cachedUser);
            setHasTokenState(true);
            if (isMounted && !isPeriodicCheck) {
              setIsLoading(false);
            }
            return;
          }

          // Sem user nem cache: não derruba o token para evitar loop; apenas marca loading false
          if (isMounted && !isPeriodicCheck) {
            setIsLoading(false);
          }
          return;
        }

        console.log('✅ [AuthContext] Sessão válida - carregando dados do backend SQL');
        const loggedUser: User = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          username: backendUser.username,
          role: backendUser.type === 'superadmin' ? 'super_admin' : (backendUser.role || 'staff'),
          status: backendUser.status || 'active',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          organizationId: backendUser.organizationId || backendUser.organization?.id || undefined
        };

        if (isMounted) {
          setUser(loggedUser);
        }

        // Cacheia usuário para modo mínimo/offline
        try {
          localStorage.setItem('rendizy-user', JSON.stringify(loggedUser));
        } catch {}

        if (backendUser.organization) {
          const org: Organization = {
            id: backendUser.organization.id,
            name: backendUser.organization.name,
            slug: backendUser.organization.slug,
            plan: 'professional',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          if (isMounted) {
            setOrganization(org);
          }
          console.log('✅ [AuthContext] Organização carregada do backend SQL:', org);
        } else if (backendUser.organizationId) {
          try {
            const orgResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${backendUser.organizationId}`,
              {
                headers: {
                  'X-Auth-Token': token,
                  'apikey': publicAnonKey
                },
                credentials: 'omit'
              }
            );
            
            if (orgResponse.ok) {
              const orgResult = await orgResponse.json();
              if (orgResult.success && orgResult.data) {
                const org: Organization = {
                  id: orgResult.data.id,
                  name: orgResult.data.name,
                  slug: orgResult.data.slug,
                  plan: orgResult.data.plan || 'professional',
                  status: orgResult.data.status || 'active',
                  createdAt: new Date(orgResult.data.created_at || Date.now()),
                  updatedAt: new Date(orgResult.data.updated_at || Date.now())
                };
                if (isMounted) {
                  setOrganization(org);
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ [AuthContext] Erro ao buscar organização:', error);
          }
        }

        if (data.session && data.session.expiresAt) {
          const expiresAt = new Date(data.session.expiresAt);
          const timeUntilExpiry = expiresAt.getTime() - Date.now();
          const ONE_HOUR = 60 * 60 * 1000;
          
          if (timeUntilExpiry < ONE_HOUR) {
            console.log('✅ [AuthContext] Sessão próxima de expirar - renovada automaticamente pelo backend');
          }
        }

        if (!isPeriodicCheck) {
          console.log('✅ [AuthContext] Usuário carregado do backend SQL:', loggedUser);
        }
        
        if (isMounted && !isPeriodicCheck) {
          setIsLoading(false);
        }

        // Cacheia usuário para modo mínimo/offline
        try {
          localStorage.setItem('rendizy-user', JSON.stringify(loggedUser));
        } catch {}
      } catch (error) {
        console.error('❌ [AuthContext] Erro ao carregar usuário:', error);
        if (isMounted && !isPeriodicCheck) {
          setIsLoading(false);
        }
      } finally {
        if (isMounted && !isPeriodicCheck) {
        }
      }
    };

    setTimeout(() => {
      if (isMounted) {
        loadUser(1, false, false);
      }
    }, 500);

    const periodicInterval = setInterval(() => {
      if (isMounted) {
        const token = localStorage.getItem('rendizy-token');
        if (token) {
          console.log('🔄 [AuthContext] Validação periódica da sessão...');
          loadUser(1, true, true);
        }
      }
    }, 5 * 60 * 1000);

    // ✅ FIX v1.0.103.358: Throttle para evitar loop infinito de verificação de foco
    let lastFocusCheck = 0;
    const FOCUS_CHECK_THROTTLE = 30000; // 30 segundos entre verificações

    const handleVisibilityChange = () => {
      if (isMounted && !document.hidden) {
        const token = localStorage.getItem('rendizy-token');
        if (token) {
          const now = Date.now();
          if (now - lastFocusCheck > FOCUS_CHECK_THROTTLE) {
            lastFocusCheck = now;
            console.log('👁️ [AuthContext] Aba voltou ao foco - revalidando sessão...');
            loadUser(1, true, true);
          }
        }
      }
    };

    const handleWindowFocus = () => {
      if (isMounted) {
        const token = localStorage.getItem('rendizy-token');
        if (token) {
          const now = Date.now();
          if (now - lastFocusCheck > FOCUS_CHECK_THROTTLE) {
            lastFocusCheck = now;
            console.log('🪟 [AuthContext] Janela ganhou foco - revalidando sessão...');
            loadUser(1, true, true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    
    const broadcast = getAuthBroadcast();
    
    const unsubscribeLogin = broadcast.onMessage('LOGIN', (message) => {
      if (message.type === 'LOGIN') {
        console.log('🔄 [AuthContext] Login detectado em outra aba - sincronizando...');
        const token = localStorage.getItem('rendizy-token');
        if (token && token === message.token) {
          if (message.user && !user) {
            const broadcastUser = message.user;
            const loggedUser: User = {
              id: broadcastUser.id,
              email: broadcastUser.email,
              name: broadcastUser.name,
              username: broadcastUser.username,
              role: broadcastUser.role || 'staff',
              status: broadcastUser.status || 'active',
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: new Date(),
              organizationId: broadcastUser.organizationId
            };
            setUser(loggedUser);
            setHasTokenState(true);
          }
        } else if (message.token) {
          localStorage.setItem('rendizy-token', message.token);
          setHasTokenState(true);
          if (message.user) {
            const broadcastUser = message.user;
            const loggedUser: User = {
              id: broadcastUser.id,
              email: broadcastUser.email,
              name: broadcastUser.name,
              username: broadcastUser.username,
              role: broadcastUser.role || 'staff',
              status: broadcastUser.status || 'active',
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: new Date(),
              organizationId: broadcastUser.organizationId
            };
            setUser(loggedUser);
          }
        }
      }
    });
    
    const unsubscribeLogout = broadcast.onMessage('LOGOUT', () => {
      console.log('🔄 [AuthContext] Logout detectado em outra aba - sincronizando...');
      localStorage.removeItem('rendizy-token');
      setHasTokenState(false);
      setUser(null);
      setOrganization(null);
    });
    
    const unsubscribeTokenRefreshed = broadcast.onMessage('TOKEN_REFRESHED', (message) => {
      if (message.type === 'TOKEN_REFRESHED') {
        console.log('🔄 [AuthContext] Token renovado em outra aba - sincronizando...');
        if (message.token) {
          localStorage.setItem('rendizy-token', message.token);
          setHasTokenState(true);
        }
      }
    });
    
    const unsubscribeSessionExpired = broadcast.onMessage('SESSION_EXPIRED', () => {
      console.log('🔄 [AuthContext] Sessão expirada em outra aba - sincronizando...');
      localStorage.removeItem('rendizy-token');
      setHasTokenState(false);
      setUser(null);
      setOrganization(null);
    });
    
    return () => {
      isMounted = false;
      clearInterval(periodicInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      unsubscribeLogin();
      unsubscribeLogout();
      unsubscribeTokenRefreshed();
      unsubscribeSessionExpired();
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔐 [AuthContext] Fazendo login via authService...', { username });
      console.log('🔍 [AuthContext] authServiceLogin function:', typeof authServiceLogin);
      
      const result = await authServiceLogin(username, password);
      console.log('🔍 [AuthContext] authServiceLogin result:', result);
      
      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || 'Erro ao fazer login'
        };
      }
      
      const backendUser = result.user;
      const loggedUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        username: backendUser.username,
        role: backendUser.type === 'superadmin' ? 'super_admin' : (backendUser.type === 'imobiliaria' ? 'admin' : 'staff'),
        status: backendUser.status || 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        organizationId: backendUser.organizationId
      };

      setUser(loggedUser);
      setHasTokenState(true);

      // Cache local para modo mínimo/offline
      try {
        localStorage.setItem('rendizy-user', JSON.stringify(loggedUser));
      } catch {}
      
      const token = localStorage.getItem('rendizy-token');
      if (token) {
        authBroadcast.notifyLogin(token, loggedUser);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (backendUser.organizationId) {
        try {
          const userResult = await getCurrentUser();
          if (userResult.success && userResult.organization) {
            const org: Organization = {
              id: userResult.organization.id,
              name: userResult.organization.name,
              slug: userResult.organization.slug,
              plan: 'professional',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setOrganization(org);
          }
        } catch (error) {
          console.warn('⚠️ [AuthContext] Erro ao buscar organização:', error);
        }
      }

      console.log('✅ [AuthContext] Login bem-sucedido');
      return { 
        success: true, 
        user: {
          ...loggedUser,
          type: backendUser.type,
          username: backendUser.username
        }
      };
    } catch (error) {
      console.error('❌ [AuthContext] Erro no login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao fazer login'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authServiceLogout();
      authBroadcast.notifyLogout();
    } catch (error) {
      console.error('❌ [AuthContext] Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('rendizy-token');
      setHasTokenState(false);
      setUser(null);
      setOrganization(null);
      
      console.log('✅ [AuthContext] Logout completo - estado e token limpos');
    }
  };

  const switchOrganization = async (organizationId: string) => {
    console.log('Switching to organization:', organizationId);
  };

  const getUserPermissions = (): Permission[] => {
    if (!user) return [];
    if (user.customPermissions && user.customPermissions.length > 0) {
      return user.customPermissions;
    }
    return DEFAULT_PERMISSIONS[user.role] || [];
  };

  const hasPermission = ({ resource, action, resourceId }: PermissionCheck): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const permissions = getUserPermissions();
    const permission = permissions.find(p => p.resource === resource);
    if (!permission) return false;
    if (!permission.actions.includes(action)) return false;
    if (permission.conditions) {
      if (permission.conditions.own_only && resourceId) {
        return true;
      }
      if (permission.conditions.properties && resourceId) {
        return permission.conditions.properties.includes(resourceId);
      }
    }
    return true;
  };

  const canCreate = (resource: string) => 
    hasPermission({ resource: resource as any, action: 'create' });
  
  const canRead = (resource: string) => 
    hasPermission({ resource: resource as any, action: 'read' });
  
  const canUpdate = (resource: string) => 
    hasPermission({ resource: resource as any, action: 'update' });
  
  const canDelete = (resource: string) => 
    hasPermission({ resource: resource as any, action: 'delete' });
  
  const canExport = (resource: string) => 
    hasPermission({ resource: resource as any, action: 'export' });

  const value: AuthContextType = {
    user,
    organization,
    isAuthenticated: !!user || (typeof window !== 'undefined' ? !!localStorage.getItem('rendizy-token') : false),
    isLoading,
    hasToken: hasTokenState,
    login,
    logout,
    switchOrganization,
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExport,
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
      return {
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      hasToken: false,
      login: async () => {},
      logout: async () => {},
      switchOrganization: async () => {},
      hasPermission: () => false,
      canCreate: () => false,
      canRead: () => false,
      canUpdate: () => false,
      canDelete: () => false,
      canExport: () => false,
      isSuperAdmin: false,
      isAdmin: false,
      isManager: false,
    };
  }
  return context;
}
