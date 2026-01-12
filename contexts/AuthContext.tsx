// ⚠️ IMPORTANTE
// Este projeto historicamente teve uma duplicação de AuthContext em:
// - `contexts/AuthContext.tsx`
// - `src/contexts/AuthContext.tsx`
// Isso causava bugs críticos (logout não limpava sessão; UI mostrava deslogado).
//
// A fonte canônica é `src/contexts/AuthContext.tsx` (usada pelo Provider em `src/main.tsx`).
// Mantemos este arquivo apenas como re-export para compatibilidade de imports antigos.

export * from '../src/contexts/AuthContext';

/*
 * =============================================================
 * LEGADO (NÃO USAR)
 * -------------------------------------------------------------
 * O restante deste arquivo continha uma implementação duplicada
 * do AuthContext, que causava estados divergentes (logout/UI).
 * Mantido apenas para referência histórica enquanto removemos
 * imports antigos; está intencionalmente comentado.
 * =============================================================
 */

/*
            // Isso dá tempo para o ProtectedRoute aguardar a validação
            setTimeout(() => {
              if (isMounted) {
                setIsLoading(false);
                // ✅ CORREÇÃO v1.0.103.1003: Se não tem token e não tem user, limpar user
                // Mas apenas se realmente não for uma navegação em andamento
                if (!user) {
                  setUser(null);
                }
              }
            }, 100);
          }
          return;
        }
        
        // ✅ CORREÇÃO MANUS.IM: Verificar token curto/legado antes de fazer requisição
        if (token && token.length < 80) {
          console.warn(`⚠️ [AuthContext] Token muito curto (${token.length} chars). Limpando e solicitando novo login.`);
          localStorage.removeItem('rendizy-token');
          setHasTokenState(false);
          if (isMounted && !isPeriodicCheck) {
            setUser(null);
            setOrganization(null);
            setIsLoading(false);
          }
          return;
        }
        
        // ✅ CORREÇÃO CRÍTICA: Aguardar um pouco após login para garantir que sessão foi commitada no banco
        // Mas apenas na primeira chamada (não em validações periódicas)
        // ✅ CORREÇÃO v1.0.103.1006: Reduzir delay para 200ms (mais rápido, mas ainda dá tempo)
        if (!skipDelay) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Delay reduzido para validação mais rápida
        }
        
        // ✅ CORREÇÃO CRÍTICA: URL correta sem make-server-67caf26a
        // Usar a rota padrão /auth/me que está funcionando no backend
        const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/auth/me`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey, // ✅ Obrigatório para Supabase Edge Functions
            'Authorization': `Bearer ${publicAnonKey}`, // ✅ Obrigatório para Supabase Edge Functions
            'X-Auth-Token': token // ✅ Token do usuário no header customizado
          },
          credentials: 'omit' // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        });

        // Ler resposta como texto primeiro
        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ [AuthContext] Erro ao parsear resposta:', parseError);
          console.error('❌ [AuthContext] Resposta:', responseText.substring(0, 200));
          
          // ✅ CORREÇÃO MANUS.IM: Para erros de parse, apenas logar e retornar (sem retry infinito)
          // Erros de parse geralmente indicam problema no backend, não vale retentar
          console.error('❌ [AuthContext] Erro ao parsear resposta - problema no backend');
          
          // ✅ CORREÇÃO CRÍTICA: Em validações periódicas, NUNCA limpar token por erro de parse/rede
          // Pode ser erro transitório de rede - manter sessão ativa
          if (isMounted && !isPeriodicCheck) {
            setIsLoading(false);
          }
          return;
        }

        // ✅ Verificar se sessão é válida
        if (!response.ok || !data || !data.success) {
          // ✅ CORREÇÃO MANUS.IM: 401 = token inválido definitivo - limpar imediatamente SEM retry
          // ✅ CORREÇÃO v1.0.103.1005: Mas apenas se NÃO for validação periódica (evita limpar token durante digitação)
          if (response.status === 401) {
            // ✅ CRÍTICO: Em validações periódicas, NÃO limpar token imediatamente por 401
            // Pode ser erro temporário de rede ou sessão ainda não commitada
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
            // Não redirecionar automaticamente - deixar ProtectedRoute fazer isso
            return;
          }
          
          // ✅ CORREÇÃO MANUS.IM: Para outros erros (rede, etc), tentar retry apenas UMA vez
          if (retries > 0 && !isPeriodicCheck) {
            console.warn(`⚠️ [AuthContext] Erro de rede, tentando novamente... (${retries} tentativa restante)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return loadUser(retries - 1, true, isPeriodicCheck);
          }
          
          // Se chegou aqui, todas as tentativas falharam
          if (isMounted && !isPeriodicCheck) {
            setIsLoading(false);
          }
          return;
        }

        // ✅ Carregar dados do usuário do backend SQL (fonte da verdade)
        console.log('✅ [AuthContext] Sessão válida - carregando dados do backend SQL');
        
        const backendUser = data.user;
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
          organizationId: backendUser.organizationId || backendUser.organization?.id || undefined
        };

        if (isMounted) {
          setUser(loggedUser);
        }

        // ✅ Carregar organização do backend SQL se existir
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
          // Buscar organização se tiver apenas o ID
          try {
            const orgResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${backendUser.organizationId}`,
              {
                headers: {
                  'X-Auth-Token': token,
                  'apikey': publicAnonKey
                },
                credentials: 'omit' // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
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

        // ✅ BOAS PRÁTICAS: Verificar se sessão está próxima de expirar e renovar automaticamente
        if (data.session && data.session.expiresAt) {
          const expiresAt = new Date(data.session.expiresAt);
          const timeUntilExpiry = expiresAt.getTime() - Date.now();
          const ONE_HOUR = 60 * 60 * 1000;
          
          // Se falta menos de 1 hora, sessão será renovada automaticamente pelo backend
          // (getSessionFromToken já faz isso com sliding expiration)
          if (timeUntilExpiry < ONE_HOUR) {
            console.log('✅ [AuthContext] Sessão próxima de expirar - renovada automaticamente pelo backend');
          }
        }

        if (!isPeriodicCheck) {
          console.log('✅ [AuthContext] Usuário carregado do backend SQL:', loggedUser);
        }
        
        // ✅ CRÍTICO: Sempre marcar como não carregando após sucesso
        if (isMounted && !isPeriodicCheck) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ [AuthContext] Erro ao carregar usuário:', error);
        // ✅ CORREÇÃO CRÍTICA: Em validações periódicas, NUNCA limpar token por erro de rede
        // Pode ser erro transitório - manter sessão ativa
        if (isMounted && !isPeriodicCheck) {
          setIsLoading(false);
        }
        // ✅ Em validação periódica, apenas logar o erro mas NÃO fazer nada
        // Isso evita deslogar o usuário durante digitação por erros de rede
      } finally {
        // ✅ CRÍTICO: Garantir que isLoading seja false após tentativa (mesmo em erro)
        // Isso evita que ProtectedRoute fique esperando indefinidamente
        if (isMounted && !isPeriodicCheck) {
          // Já foi setado acima, mas garantir aqui também
        }
      }
    };

    // ✅ CORREÇÃO MANUS.IM: Validar imediatamente ao montar (1 retry apenas)
    // ✅ CORREÇÃO v1.0.103.1008: Executar loadUser após atualizar hasTokenState
    // ✅ CORREÇÃO: Aumentar delay para evitar validação muito rápida após login
    setTimeout(() => {
      if (isMounted) {
        loadUser(1, false, false); // 1 retry, com delay, não é periódica
      }
    }, 500); // ✅ Aumentado para 500ms para dar tempo da sessão ser commitada após login

    // ✅ BOAS PRÁTICAS MUNDIAIS: Validação periódica (a cada 5 minutos)
    const periodicInterval = setInterval(() => {
      if (isMounted) {
        const token = localStorage.getItem('rendizy-token');
        if (token) {
          console.log('🔄 [AuthContext] Validação periódica da sessão...');
          loadUser(1, true, true); // 1 retry apenas, sem delay, é periódica
        }
      }
    }, 5 * 60 * 1000); // 5 minutos

    // ✅ BOAS PRÁTICAS MUNDIAIS: Visibility API - Revalidar quando aba volta ao foco
    const handleVisibilityChange = () => {
      if (isMounted && !document.hidden) {
        const token = localStorage.getItem('rendizy-token');
        if (token) {
          console.log('👁️ [AuthContext] Aba voltou ao foco - revalidando sessão...');
          loadUser(1, true, true); // Revalidar sessão
        }
      }
    };

    // ✅ BOAS PRÁTICAS MUNDIAIS: Window Focus - Revalidar quando janela ganha foco
    const handleWindowFocus = () => {
      if (isMounted) {
        const token = localStorage.getItem('rendizy-token');
        if (token) {
          console.log('🪟 [AuthContext] Janela ganhou foco - revalidando sessão...');
          loadUser(1, true, true); // Revalidar sessão
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    
    // ✅ ARQUITETURA OAuth2 v1.0.103.1010: BroadcastChannel - Sincronização entre abas
    const broadcast = getAuthBroadcast();
    
    // ✅ Listener para LOGIN de outras abas
    const unsubscribeLogin = broadcast.onMessage('LOGIN', (message) => {
      if (message.type === 'LOGIN') {
        console.log('🔄 [AuthContext] Login detectado em outra aba - sincronizando...');
        const token = localStorage.getItem('rendizy-token');
        if (token && token === message.token) {
          // Token já está sincronizado, apenas atualizar user se necessário
          if (message.user && !user) {
            // Converter user do broadcast para formato User
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
          // Token diferente - atualizar
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
    
    // ✅ Listener para LOGOUT de outras abas
    const unsubscribeLogout = broadcast.onMessage('LOGOUT', () => {
      console.log('🔄 [AuthContext] Logout detectado em outra aba - sincronizando...');
      localStorage.removeItem('rendizy-token');
      setHasTokenState(false);
      setUser(null);
      setOrganization(null);
    });
    
    // ✅ Listener para TOKEN_REFRESHED de outras abas
    const unsubscribeTokenRefreshed = broadcast.onMessage('TOKEN_REFRESHED', (message) => {
      if (message.type === 'TOKEN_REFRESHED') {
        console.log('🔄 [AuthContext] Token renovado em outra aba - sincronizando...');
        if (message.token) {
          localStorage.setItem('rendizy-token', message.token);
          setHasTokenState(true);
        }
      }
    });
    
    // ✅ Listener para SESSION_EXPIRED de outras abas
    const unsubscribeSessionExpired = broadcast.onMessage('SESSION_EXPIRED', () => {
      console.log('🔄 [AuthContext] Sessão expirada em outra aba - sincronizando...');
      localStorage.removeItem('rendizy-token');
      setHasTokenState(false);
      setUser(null);
      setOrganization(null);
    });
    
    // Cleanup ao desmontar
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
      
      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Usar authService
      const result = await authServiceLogin(username, password);
      
      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || 'Erro ao fazer login'
        };
      }
      
      // ✅ Carregar dados do usuário
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
      
      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Notificar outras abas
      const token = localStorage.getItem('rendizy-token');
      if (token) {
        authBroadcast.notifyLogin(token, loggedUser);
      }
      
      // ✅ CORREÇÃO: Aguardar um pouco antes de buscar organização
      // Isso garante que a sessão foi commitada no banco
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ Buscar organização se houver (após delay para garantir sessão commitada)
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
          // Não falhar o login se não conseguir buscar organização
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
    console.log('🔴 [AuthContext] LOGOUT INICIADO');
    
    try {
      console.log('🔴 [AuthContext] Chamando authServiceLogout...');
      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Usar authService
      await authServiceLogout();
      console.log('🔴 [AuthContext] authServiceLogout concluído');
      
      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Notificar outras abas
      console.log('🔴 [AuthContext] Notificando outras abas...');
      authBroadcast.notifyLogout();
      console.log('🔴 [AuthContext] Outras abas notificadas');
    } catch (error) {
      console.error('❌ [AuthContext] Erro ao fazer logout:', error);
      console.error('❌ [AuthContext] Stack trace:', error);
    } finally {
      // ✅ Limpar estado local
      console.log('🔴 [AuthContext] Limpando localStorage...');
      const beforeRemove = localStorage.getItem('rendizy-token');
      console.log('🔴 [AuthContext] Token antes de remover:', beforeRemove ? 'EXISTE' : 'JÁ REMOVIDO');
      
      localStorage.removeItem('rendizy-token');
      
      const afterRemove = localStorage.getItem('rendizy-token');
      console.log('🔴 [AuthContext] Token após remover:', afterRemove ? 'AINDA EXISTE!' : 'REMOVIDO');
      
      setHasTokenState(false);
      setUser(null);
      setOrganization(null);
      
      console.log('✅ [AuthContext] Logout completo - estado e token limpos');
    }
  };

  const switchOrganization = async (organizationId: string) => {
    // TODO: Implementar troca de organização para super_admin
    console.log('Switching to organization:', organizationId);
  };

  const getUserPermissions = (): Permission[] => {
    if (!user) return [];
    
    // Custom permissions override default role permissions
    if (user.customPermissions && user.customPermissions.length > 0) {
      return user.customPermissions;
    }
    
    // Return default permissions for role
    return DEFAULT_PERMISSIONS[user.role] || [];
  };

  const hasPermission = ({ resource, action, resourceId }: PermissionCheck): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    const permissions = getUserPermissions();
    
    const permission = permissions.find(p => p.resource === resource);
    if (!permission) return false;
    
    // Check if action is allowed
    if (!permission.actions.includes(action)) return false;
    
    // Check conditions if present
    if (permission.conditions) {
      if (permission.conditions.own_only && resourceId) {
        // TODO: Implement ownership check
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
    // ✅ CORREÇÃO v1.0.103.1002: isAuthenticated deve considerar token também (evita deslogar durante validação)
    // ✅ RESTAURADO: Usar localStorage.getItem diretamente como estava funcionando antes
    // Isso garante que o token seja verificado mesmo se hasTokenState não estiver sincronizado
    isAuthenticated: !!user || (typeof window !== 'undefined' ? !!localStorage.getItem('rendizy-token') : false),
    isLoading,
    hasToken: hasTokenState, // ✅ CORREÇÃO v1.0.103.1007: Expor hasTokenState
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
    // Retorna valores padrão ao invés de lançar erro
    // Isso permite que componentes usem useAuth mesmo se não estiverem
    // dentro de um AuthProvider (útil para desenvolvimento e testes)
    // console.warn('useAuth usado fora do AuthProvider - retornando valores padrão'); // SILENCIADO v1.0.103.299
      return {
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      hasToken: false, // ✅ CORREÇÃO v1.0.103.1007: Expor hasToken no fallback
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

*/
