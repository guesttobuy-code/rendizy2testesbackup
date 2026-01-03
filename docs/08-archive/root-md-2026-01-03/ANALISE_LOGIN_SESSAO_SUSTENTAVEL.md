# 🔍 Análise: Sistema de Login e Sessão - Solução Sustentável

## 📊 Situação Atual

### ✅ O que está funcionando:
1. **Token salvo no BANCO SQL** (tabela `sessions`) - ✅ Correto
2. **Token salvo no `localStorage`** do navegador - ⚠️ Funcional, mas vulnerável
3. **Expiração de 24 horas** - ✅ Configurado

### ❌ Problemas Identificados:

1. **`last_activity` NÃO é atualizado automaticamente**
   - A sessão não "renova" quando o usuário está ativo
   - Após 24h fixas, expira mesmo com usuário ativo

2. **Múltiplas sessões do mesmo usuário**
   - Cada login cria uma nova sessão sem limpar as antigas
   - Pode causar confusão e problemas de validação

3. **Sem renovação automática de sessão**
   - Não há refresh token
   - Usuário precisa fazer login novamente após 24h

4. **Tratamento de erros agressivo**
   - Quando `/auth/me` falha (mesmo temporariamente), usuário é deslogado
   - Não há retry ou tratamento de erros transitórios

5. **Token no `localStorage` é vulnerável a XSS**
   - Qualquer script malicioso pode roubar o token
   - HttpOnly cookies seriam mais seguros

---

## 🎯 Solução Sustentável Proposta

### 1. **Sliding Expiration (Renovação Automática de Sessão)**

**Implementar:** Atualizar `last_activity` e estender `expires_at` a cada requisição válida.

**Benefícios:**
- Usuário ativo nunca é deslogado
- Sessão expira apenas após inatividade (ex: 7 dias)
- Melhor experiência do usuário

**Implementação:**
```typescript
// Em getSessionFromToken() - atualizar last_activity e estender expires_at
const now = new Date();
const timeSinceLastActivity = now.getTime() - new Date(sessionRow.last_activity).getTime();
const INACTIVITY_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 dias

if (timeSinceLastActivity < INACTIVITY_THRESHOLD) {
  // Usuário ativo - estender sessão
  const newExpiresAt = new Date(now.getTime() + INACTIVITY_THRESHOLD);
  await client
    .from('sessions')
    .update({
      last_activity: now.toISOString(),
      expires_at: newExpiresAt.toISOString()
    })
    .eq('token', token);
}
```

### 2. **Limpeza de Sessões Antigas no Login**

**Implementar:** Ao fazer login, limpar sessões antigas do mesmo usuário.

**Benefícios:**
- Evita múltiplas sessões simultâneas
- Reduz confusão e problemas de validação
- Mantém banco limpo

**Implementação:**
```typescript
// Em routes-auth.ts - após criar nova sessão
// Limpar sessões antigas do mesmo usuário (manter apenas a mais recente)
await supabase
  .from('sessions')
  .delete()
  .eq('user_id', user.id)
  .neq('token', token); // Não deletar a sessão que acabamos de criar
```

### 3. **Renovação Automática no Frontend**

**Implementar:** Verificar e renovar sessão automaticamente antes de expirar.

**Benefícios:**
- Usuário não percebe quando sessão é renovada
- Transparente e automático

**Implementação:**
```typescript
// Em AuthContext.tsx - verificar expiração e renovar
useEffect(() => {
  const checkAndRenewSession = async () => {
    const token = localStorage.getItem('rendizy-token');
    if (!token) return;

    // Verificar se sessão está próxima de expirar (menos de 1 hora)
    const response = await fetch('/auth/me', {
      headers: { 'X-Auth-Token': token, 'apikey': publicAnonKey }
    });
    
    if (response.ok) {
      const data = await response.json();
      const expiresAt = new Date(data.session.expiresAt);
      const timeUntilExpiry = expiresAt.getTime() - Date.now();
      
      // Se falta menos de 1 hora, renovar automaticamente
      if (timeUntilExpiry < 60 * 60 * 1000) {
        // A renovação acontece automaticamente no backend ao chamar /auth/me
        console.log('✅ Sessão renovada automaticamente');
      }
    }
  };

  // Verificar a cada 30 minutos
  const interval = setInterval(checkAndRenewSession, 30 * 60 * 1000);
  checkAndRenewSession(); // Verificar imediatamente

  return () => clearInterval(interval);
}, []);
```

### 4. **Tratamento de Erros Melhorado**

**Implementar:** Retry e tratamento de erros transitórios no `/auth/me`.

**Benefícios:**
- Não desloga usuário por erros temporários
- Melhor resiliência a falhas de rede

**Implementação:**
```typescript
// Em AuthContext.tsx - loadUser com retry
const loadUser = async (retries = 3) => {
  try {
    const token = localStorage.getItem('rendizy-token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': publicAnonKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Sucesso - carregar usuário
        setUser(data.user);
        setIsLoading(false);
        return;
      }
    }

    // Se erro 401 e ainda há retries, tentar novamente após delay
    if (response.status === 401 && retries > 0) {
      console.warn(`⚠️ [AuthContext] Erro 401, tentando novamente... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return loadUser(retries - 1);
    }

    // Se erro persistir ou não houver retries, deslogar
    console.error('❌ [AuthContext] Sessão inválida após retries');
    localStorage.removeItem('rendizy-token');
    setUser(null);
    setIsLoading(false);
  } catch (error) {
    // Erro de rede - tentar novamente se houver retries
    if (retries > 0) {
      console.warn(`⚠️ [AuthContext] Erro de rede, tentando novamente... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return loadUser(retries - 1);
    }
    
    console.error('❌ [AuthContext] Erro ao verificar sessão:', error);
    setIsLoading(false);
  }
};
```

### 5. **Limpeza Automática de Sessões Expiradas**

**Implementar:** Job periódico para limpar sessões expiradas do banco.

**Benefícios:**
- Mantém banco limpo
- Melhora performance

**Implementação:**
```sql
-- Criar função SQL para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Executar a cada hora (via cron job ou edge function)
```

---

## 📋 Plano de Implementação

### Fase 1: Correções Críticas (Imediato)
1. ✅ Atualizar `last_activity` e estender `expires_at` em `getSessionFromToken()`
2. ✅ Limpar sessões antigas no login
3. ✅ Melhorar tratamento de erros no `/auth/me` com retry

### Fase 2: Melhorias de UX (Curto Prazo)
4. ✅ Renovação automática no frontend
5. ✅ Limpeza automática de sessões expiradas

### Fase 3: Segurança (Médio Prazo)
6. ⚠️ Migrar para HttpOnly cookies (requer mudanças no CORS)
7. ⚠️ Implementar refresh tokens (opcional, mas mais seguro)

---

## 🎯 Resultado Esperado

Após implementação:
- ✅ Usuário ativo **nunca é deslogado** (sessão renova automaticamente)
- ✅ Sessão expira apenas após **7 dias de inatividade**
- ✅ **Sem múltiplas sessões** do mesmo usuário
- ✅ **Resiliência a erros** transitórios (retry automático)
- ✅ **Banco limpo** (sessões expiradas removidas automaticamente)

---

## ⚠️ Nota sobre HttpOnly Cookies

**Atual:** Token no `localStorage` (vulnerável a XSS)
**Ideal:** HttpOnly cookies (mais seguro)

**Por que não implementar agora:**
- Requer mudanças no CORS (`credentials: true`, `origin` específico)
- Pode quebrar funcionalidades existentes
- Requer testes extensivos

**Recomendação:** Implementar na Fase 3, após estabilizar o sistema atual.

