# 🖥️ Como Ver Sites de Clientes em Localhost

**Data:** 01/12/2025  
**Status:** 📋 **GUIA COMPLETO - LOCALHOST + PRODUÇÃO**

---

## 🎯 **RESPOSTA RÁPIDA**

### **Atualmente:**
- ❌ **NÃO** é possível ver sites de clientes diretamente em localhost
- ✅ Sites são servidos apenas via **Supabase Edge Functions** (produção)
- ✅ É possível **gerenciar** sites em localhost (`/sites-clientes`)

### **Como funciona hoje:**
1. **Localhost:** Apenas gerenciamento (`http://localhost:5173/sites-clientes`)
2. **Visualização:** Apenas via Supabase (URL complexa)

---

## 📍 **SITUAÇÃO ATUAL**

### **1. Localhost (Desenvolvimento)**

**URL do RENDIZY:**
```
http://localhost:5173
```

**O que funciona:**
- ✅ Gerenciar sites: `http://localhost:5173/sites-clientes`
- ✅ Criar/editar sites
- ✅ Ver lista de sites
- ❌ **NÃO** visualizar site do cliente diretamente

**URL de preview atual (via Supabase):**
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/serve/medhome.rendizy.app
```

**Problema:**
- URL complexa e não otimizada
- Requer Supabase (não funciona offline)
- Não é ideal para desenvolvimento

---

### **2. Produção (Netlify)**

**URL do RENDIZY:**
```
https://adorable-biscochitos-59023a.netlify.app
```

**O que funciona:**
- ✅ Gerenciar sites: `https://adorable-biscochitos-59023a.netlify.app/sites-clientes`
- ✅ Criar/editar sites
- ✅ Ver lista de sites
- ❌ **NÃO** visualizar site do cliente diretamente (mesmo problema)

**URL de preview atual (via Supabase):**
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/serve/medhome.rendizy.app
```

---

## ✅ **SOLUÇÃO: HABILITAR VISUALIZAÇÃO EM LOCALHOST**

### **Opção 1: Rota no RENDIZY (Recomendado)**

Criar rota `/sites/:subdomain` no RENDIZY para servir sites localmente.

**URLs resultantes:**
- **Localhost:** `http://localhost:5173/sites/medhome`
- **Produção:** `https://adorable-biscochitos-59023a.netlify.app/sites/medhome`

**Vantagens:**
- ✅ Funciona em localhost e produção
- ✅ URLs limpas e amigáveis
- ✅ Mesmo domínio (sem problemas de CORS)
- ✅ Fácil de implementar

---

## 🔧 **IMPLEMENTAÇÃO**

### **PASSO 1: Criar Componente de Visualização**

**Arquivo:** `RendizyPrincipal/components/ClientSiteViewer.tsx` (NOVO)

```tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSupabaseConfig } from './utils/supabaseConfig';

export function ClientSiteViewer() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { projectId, publicAnonKey } = getSupabaseConfig();

  useEffect(() => {
    const fetchSite = async () => {
      if (!subdomain) {
        setError('Subdomínio não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar site por subdomain
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/by-subdomain/${subdomain}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (data.success && data.data) {
          setSiteConfig(data.data);
        } else {
          setError(data.error || 'Site não encontrado');
        }
      } catch (err: any) {
        console.error('Erro ao buscar site:', err);
        setError(err.message || 'Erro ao carregar site');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [subdomain, projectId, publicAnonKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando site...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Subdomínio: {subdomain}</p>
        </div>
      </div>
    );
  }

  if (!siteConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Site não encontrado</h1>
          <p className="text-gray-600">O site para o subdomínio "{subdomain}" não foi encontrado.</p>
        </div>
      </div>
    );
  }

  // Renderizar site do cliente
  if (siteConfig.siteCode) {
    return (
      <div className="w-full h-full">
        <div dangerouslySetInnerHTML={{ __html: siteConfig.siteCode }} />
      </div>
    );
  }

  // Se não tiver código, mostrar página padrão
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{siteConfig.siteName}</h1>
        <p className="text-gray-600 mb-4">Site em construção</p>
        <p className="text-sm text-gray-500">
          O código do site ainda não foi importado. Faça o upload do código na tela de gerenciamento.
        </p>
      </div>
    </div>
  );
}
```

---

### **PASSO 2: Adicionar Rota no App.tsx**

**Arquivo:** `RendizyPrincipal/App.tsx`

**Adicionar import:**
```tsx
import { ClientSiteViewer } from './components/ClientSiteViewer';
```

**Adicionar rota (ANTES das rotas protegidas):**
```tsx
<Routes>
  {/* Rota pública para visualizar sites de clientes */}
  <Route path="/sites/:subdomain" element={<ClientSiteViewer />} />
  <Route path="/sites/:subdomain/*" element={<ClientSiteViewer />} />
  
  {/* ... resto das rotas ... */}
</Routes>
```

**Importante:** Esta rota deve ser **pública** (não protegida), pois sites de clientes são públicos.

---

### **PASSO 3: Criar Rota Backend para Buscar por Subdomain**

**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts`

**Adicionar rota:**
```typescript
// GET /make-server-67caf26a/client-sites/by-subdomain/:subdomain
// Busca site por subdomain (para visualização pública)
app.get('/by-subdomain/:subdomain', async (c) => {
  try {
    const subdomain = c.req.param('subdomain');
    
    if (!subdomain) {
      return c.json({ 
        success: false, 
        error: 'Subdomain é obrigatório' 
      }, 400);
    }

    // Buscar no KV Store (atualmente)
    // TODO: Migrar para SQL após implementar tabela client_sites
    const sites = await kv.getByPrefix<ClientSiteConfig>('client_site:');
    
    const site = sites.find(s => 
      s.subdomain === subdomain || 
      s.domain === subdomain ||
      s.domain === `${subdomain}.rendizy.app`
    );

    if (!site) {
      return c.json({ 
        success: false, 
        error: 'Site não encontrado' 
      }, 404);
    }

    // Não retornar dados sensíveis em rota pública
    const publicSite = {
      ...site,
      // Remover campos sensíveis se necessário
    };

    return c.json({ 
      success: true, 
      data: publicSite 
    });
    
  } catch (error) {
    console.error('[CLIENT-SITES] Erro ao buscar site por subdomain:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});
```

---

### **PASSO 4: Atualizar Botão "Ver Site"**

**Arquivo:** `RendizyPrincipal/components/ClientSitesManager.tsx`

**Atualizar função `getPreviewUrl`:**
```tsx
const getPreviewUrl = (site: ClientSite) => {
  // Em desenvolvimento (localhost) ou produção (Netlify)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // Usar rota local
    return `http://localhost:5173/sites/${site.subdomain}`;
  } else {
    // Usar rota de produção
    return `https://adorable-biscochitos-59023a.netlify.app/sites/${site.subdomain}`;
  }
};
```

---

## 🎯 **RESULTADO FINAL**

### **Localhost:**
```
http://localhost:5173/sites/medhome
```

### **Produção:**
```
https://adorable-biscochitos-59023a.netlify.app/sites/medhome
```

### **Vantagens:**
- ✅ Funciona em localhost e produção
- ✅ URLs limpas e amigáveis
- ✅ Mesmo domínio (sem CORS)
- ✅ Fácil de testar localmente
- ✅ Preparado para migração para SQL

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

- [ ] Criar `ClientSiteViewer.tsx`
- [ ] Adicionar rota `/sites/:subdomain` no `App.tsx`
- [ ] Criar rota backend `/by-subdomain/:subdomain`
- [ ] Atualizar `getPreviewUrl` no `ClientSitesManager.tsx`
- [ ] Testar em localhost: `http://localhost:5173/sites/medhome`
- [ ] Testar em produção: `https://adorable-biscochitos-59023a.netlify.app/sites/medhome`

---

## 🚨 **IMPORTANTE**

### **Segurança:**
- Rota `/sites/:subdomain` deve ser **pública** (não protegida)
- Sites de clientes são públicos por natureza
- Backend deve validar que site existe e está ativo

### **Performance:**
- Considerar cache para sites servidos
- Otimizar busca de configuração do site
- Preparar para migração para SQL (melhor performance)

---

## 🔄 **PRÓXIMOS PASSOS**

1. ✅ Implementar rota `/sites/:subdomain` (este guia)
2. ⏳ Migrar sites de KV Store para SQL (ver `SOLUCAO_SITES_CLIENTES_MIGRACAO_SQL_NETLIFY.md`)
3. ⏳ Otimizar performance (cache, etc.)
4. ⏳ Adicionar suporte a assets estáticos (CSS, JS, imagens)

---

**STATUS:** 📋 **GUIA COMPLETO - PRONTO PARA IMPLEMENTAÇÃO**

