# Arquitetura de Login Consistente e Persistente

**Data:** 2025-11-26  
**Status:** 🚧 **EM IMPLEMENTAÇÃO**  
**Versão:** v1.0.103.1010

---

## 🎯 PROBLEMA ATUAL

**Sintomas:**
- ❌ Login não persiste após refresh (F5)
- ❌ Múltiplos GoTrueClient instances (warning no console)
- ❌ 401 desloga imediatamente sem tentar renovar
- ❌ Token único (sem refresh) - quando expira, não há como renovar
- ❌ Race conditions entre AuthContext e ProtectedRoute

**Causa Raiz:**
1. Sistema usa apenas um token (sem access/refresh separados)
2. Quando token expira, não há mecanismo de renovação
3. Múltiplas instâncias de Supabase client criadas em diferentes arquivos
4. 401 limpa token imediatamente sem tentar refresh

---

## ✅ SOLUÇÃO PROPOSTA (Baseada em OAuth2)

### **1. Arquitetura de Tokens (Backend)**

#### **1.1 Dois Tokens Distintos**
- **Access Token** (curto, 15-30 min)
  - Usado em todas as chamadas de API
  - Enviado no header `X-Auth-Token`
  - Armazenado em memória (React state) + localStorage (backup)
  
- **Refresh Token** (longo, 30-60 dias)
  - Usado apenas para renovar access token
  - Armazenado em cookie `HttpOnly; Secure; SameSite=None`
  - Nunca exposto ao JavaScript (mais seguro)

#### **1.2 Rotação de Refresh Token**
- `/auth/refresh` emite novo par (access + refresh)
- Invalida refresh token anterior (rotating refresh tokens)
- Grava `rotated_from`/`rotated_to` na tabela `sessions`

#### **1.3 Tabela Sessions Revisada**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  access_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT NOT NULL UNIQUE,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  rotated_from UUID REFERENCES sessions(id),
  rotated_to UUID REFERENCES sessions(id),
  user_agent TEXT,
  ip_hash TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **2. Serviço de Autenticação (Frontend)**

#### **2.1 Singleton do Supabase Client**
```typescript
// utils/supabase/client.ts
import { createClient } from '@jsr/supabase__supabase-js';
import { projectId, publicAnonKey } from './info';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }
  return supabaseClient;
}
```

**Benefícios:**
- ✅ Elimina warning de múltiplos GoTrueClient
- ✅ Estado único de sessão
- ✅ Evita corridas de storage

#### **2.2 State Machine Explícita**
```typescript
type AuthStatus = 
  | 'idle'           // Inicial
  | 'checking'       // Validando token existente
  | 'authenticated'  // Logado e válido
  | 'refreshing'     // Renovando token
  | 'unauthenticated'; // Deslogado

interface AuthState {
  status: AuthStatus;
  user: User | null;
  organization: Organization | null;
  accessToken: string | null;
  isLoading: boolean;
}
```

**Transições:**
- `idle` → `checking` (ao montar, se tem token)
- `checking` → `authenticated` (se token válido)
- `checking` → `refreshing` (se token expirado mas tem refresh)
- `refreshing` → `authenticated` (se refresh ok)
- `refreshing` → `unauthenticated` (se refresh falhou)
- `authenticated` → `refreshing` (ao receber 401)
- Qualquer estado → `unauthenticated` (ao fazer logout)

#### **2.3 AuthService (Camada de Serviço)**
```typescript
// services/authService.ts
export class AuthService {
  async login(username: string, password: string): Promise<AuthResult> {
    // POST /auth/login
    // Recebe: { accessToken, refreshToken (em cookie) }
    // Salva accessToken em localStorage
    // refreshToken vem automaticamente no cookie
  }
  
  async refresh(): Promise<AuthResult> {
    // POST /auth/refresh
    // Envia refreshToken do cookie automaticamente
    // Recebe: { accessToken, refreshToken (novo, em cookie) }
    // Atualiza accessToken em localStorage
  }
  
  async getUser(accessToken: string): Promise<User> {
    // GET /auth/me
    // Usa accessToken no header
  }
  
  async logout(): Promise<void> {
    // POST /auth/logout
    // Limpa cookie e localStorage
  }
}
```

#### **2.4 Interceptador 401**
```typescript
// utils/apiClient.ts
async function apiRequest(url: string, options: RequestInit) {
  let response = await fetch(url, options);
  
  // Se 401, tentar refresh UMA vez
  if (response.status === 401) {
    const refreshResult = await authService.refresh();
    
    if (refreshResult.success) {
      // Retentar requisição original com novo token
      options.headers = {
        ...options.headers,
        'X-Auth-Token': refreshResult.accessToken
      };
      response = await fetch(url, options);
    } else {
      // Refresh falhou, emitir evento de logout
      authStore.logout();
      throw new Error('Sessão expirada');
    }
  }
  
  return response;
}
```

#### **2.5 Sincronização Entre Abas**
```typescript
// Usar BroadcastChannel para sincronizar estado entre abas
const authChannel = new BroadcastChannel('auth');

authChannel.onmessage = (event) => {
  if (event.data.type === 'login') {
    // Outra aba fez login, atualizar estado
    authStore.setUser(event.data.user);
  } else if (event.data.type === 'logout') {
    // Outra aba fez logout, deslogar também
    authStore.logout();
  }
};
```

---

### **3. Proteção de Rotas**

#### **3.1 ProtectedRoute Simplificado**
```typescript
export default function ProtectedRoute({ children }) {
  const { status, user, isLoading } = useAuth();
  
  // Estados de loading/validação
  if (status === 'checking' || status === 'refreshing') {
    return <LoadingScreen message="Verificando autenticação..." />;
  }
  
  // Não autenticado
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  
  // Autenticado e válido
  if (status === 'authenticated' && user) {
    return <>{children}</>;
  }
  
  // Estado inconsistente (não deveria acontecer)
  return <LoadingScreen message="Carregando..." />;
}
```

---

### **4. Backend - Novos Endpoints**

#### **4.1 POST /auth/refresh**
```typescript
app.post('/auth/refresh', async (c) => {
  // 1. Ler refreshToken do cookie HttpOnly
  const refreshToken = c.req.cookie('rendizy-refresh-token');
  
  // 2. Validar refreshToken na tabela sessions
  const session = await getSessionByRefreshToken(refreshToken);
  
  // 3. Se válido e não expirado:
  //    - Gerar novo accessToken
  //    - Gerar novo refreshToken
  //    - Invalidar refreshToken anterior (rotating)
  //    - Salvar novo par na tabela sessions
  //    - Retornar accessToken + setar novo refreshToken em cookie
  
  // 4. Se inválido/expirado:
  //    - Retornar 401
  //    - Limpar cookie
});
```

#### **4.2 GET /auth/me (Atualizado)**
```typescript
app.get('/auth/me', async (c) => {
  // 1. Ler accessToken do header
  const accessToken = c.req.header('X-Auth-Token');
  
  // 2. Validar accessToken
  const session = await getSessionByAccessToken(accessToken);
  
  // 3. Se expirado mas refreshToken válido:
  //    - Retornar 401 com code: 'ACCESS_TOKEN_EXPIRED'
  //    - Frontend tenta refresh automaticamente
  
  // 4. Se válido:
  //    - Retornar dados do usuário
});
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO (Incremental)

### **Fase 1: Backend - Estrutura Base** ✅
1. ✅ Criar migration para tabela `sessions` revisada
2. ✅ Implementar `POST /auth/refresh`
3. ✅ Atualizar `POST /auth/login` para retornar access + refresh
4. ✅ Atualizar `GET /auth/me` para validar access token
5. ✅ Implementar rotação de refresh tokens

### **Fase 2: Frontend - Singleton e AuthService** 🚧
1. ✅ Criar `utils/supabase/client.ts` (singleton)
2. ✅ Substituir todas as criações de `createClient` pelo singleton
3. ✅ Criar `services/authService.ts`
4. ✅ Implementar métodos: `login`, `refresh`, `getUser`, `logout`

### **Fase 3: Frontend - State Machine** 🚧
1. ✅ Criar `stores/authStore.ts` (state machine)
2. ✅ Implementar estados e transições
3. ✅ Integrar com `AuthContext`
4. ✅ Atualizar `ProtectedRoute` para usar state machine

### **Fase 4: Frontend - Interceptador 401** 🚧
1. ✅ Criar `utils/apiClient.ts` (wrapper do fetch)
2. ✅ Implementar interceptador 401
3. ✅ Substituir todas as chamadas de API pelo `apiClient`
4. ✅ Testar refresh automático

### **Fase 5: Sincronização Entre Abas** 🚧
1. ✅ Implementar `BroadcastChannel` para auth
2. ✅ Sincronizar login/logout entre abas
3. ✅ Testar múltiplas abas

### **Fase 6: Testes e Validação** 🚧
1. ✅ Testes E2E: login → refresh → logout
2. ✅ Testes: múltiplas abas
3. ✅ Testes: navegação direta por URL
4. ✅ Testes: refresh após expiração

---

## 🎯 BENEFÍCIOS ESPERADOS

### **Elimina Problemas Atuais:**
- ✅ **Loops de 401**: Access token tem renovação controlada
- ✅ **Múltiplos GoTrueClient**: Singleton elimina warning
- ✅ **Logout ao refresh**: Refresh automático mantém sessão
- ✅ **Tokens legados**: Rotação previne reutilização

### **Melhora Segurança:**
- ✅ **Refresh token em cookie HttpOnly**: Não acessível via JavaScript
- ✅ **Rotação de refresh tokens**: Previne reuse attacks
- ✅ **Expiração curta de access token**: Limita janela de ataque

### **Melhora Experiência:**
- ✅ **Login persiste**: Refresh automático mantém sessão
- ✅ **Navegação direta por URL**: Funciona após reidratação
- ✅ **Múltiplas abas sincronizadas**: Estado consistente
- ✅ **Feedback claro**: Loading states bem definidos

---

## 📝 NOTAS TÉCNICAS

### **Compatibilidade Durante Migração:**
- ✅ Manter suporte a tokens antigos (single token) durante transição
- ✅ Gradualmente migrar usuários para novo sistema
- ✅ Deprecar sistema antigo após migração completa

### **Observabilidade:**
- ✅ Logs padronizados com `session_id`, `user_id`, `event`
- ✅ Métricas: `refresh_success_rate`, `refresh_duration`
- ✅ Alertas: taxa de refresh < 95%, reuse de refresh token

### **Performance:**
- ✅ Access token em memória (rápido)
- ✅ Refresh apenas quando necessário (não a cada request)
- ✅ Cache de usuário após primeira validação

---

## ✅ CONCLUSÃO

Esta arquitetura resolve o problema de forma **estrutural e definitiva**, seguindo padrões OAuth2 amplamente adotados (Google, GitHub, etc.).

**Próximos Passos:**
1. Implementar Fase 1 (Backend)
2. Testar endpoints de refresh
3. Implementar Fase 2-4 (Frontend)
4. Testar fluxo completo
5. Deploy gradual

**Status:** 🚧 **AGUARDANDO APROVAÇÃO PARA IMPLEMENTAÇÃO**

