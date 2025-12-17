# 🌐 HANDOFF - SITES DE CLIENTES (GAPS) RENDIZY

**Destinatário:** Codex AI / Equipe de Desenvolvimento  
**Data:** 03 NOV 2025  
**Versão RENDIZY:** v1.0.103.260-MULTI-TENANT-AUTH  
**Status:** 🟡 FRONTEND 60% | 🟡 BACKEND 50%  

---

## 🎯 VISÃO GERAL

O módulo de **Sites de Clientes** permite que imobiliárias criem sites personalizados para seus clientes exibirem suas propriedades. Está **parcialmente implementado**, faltando recursos avançados.

---

## ✅ O QUE JÁ ESTÁ COMPLETO

### **Frontend (60%):**
- ✅ ClientSiteWrapper.tsx - Wrapper do site
- ✅ ClientSitesManager.tsx - Gerenciador de sites
- ✅ 3 Templates prontos (Moderno, Clássico, Luxo)
  - `/templates/site-moderno.tsx`
  - `/templates/site-classico.tsx`
  - `/templates/site-luxo.tsx`
- ✅ Seleção de template
- ✅ Preview do site

### **Backend (50%):**
- ✅ routes-client-sites.ts (parcial)
- ✅ CRUD básico de sites
- ✅ Armazenamento de configuração
- ✅ Busca de propriedades

---

## 🔴 GAPS IDENTIFICADOS

### **GAP 1: Publicação e Deploy Automático**

**Status:** Frontend 50% | Backend 0%

**O que falta:**
Atualmente os sites são apenas visualizados no sistema. Falta publicar em URL acessível.

**Solução proposta:**

#### **Opção A: Subdomínio Rendizy**
```
{slug}.rendizy.com.br

Exemplos:
joao-silva-imoveis.rendizy.com.br
praia-temporada.rendizy.com.br
```

**Endpoint a criar:**
```http
POST /client-sites/:id/publicar
```

**Request:**
```json
{
  "slug": "joao-silva-imoveis",
  "dominio": null  // null = usar subdomínio rendizy
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "siteId": "site_001",
    "url": "https://joao-silva-imoveis.rendizy.com.br",
    "status": "publicado",
    "publicadoEm": "2025-11-03T10:00:00.000Z"
  }
}
```

**Implementação backend:**
```typescript
app.post('/client-sites/:id/publicar', async (c) => {
  const { id } = c.req.param();
  const { slug, dominio } = await c.req.json();
  const organizationId = c.get('organizationId');
  
  const site = await kv.get(`client_site:${id}`);
  if (!site) {
    return c.json({ success: false, error: 'Site não encontrado' }, 404);
  }
  
  // Verificar se slug já existe
  const existente = await kv.get(`client_site_slug:${slug}`);
  if (existente && existente !== id) {
    return c.json({ success: false, error: 'Slug já está em uso' }, 400);
  }
  
  // Gerar HTML estático do site
  const html = await gerarHTMLEstatico(site);
  
  // Upload para Supabase Storage
  const fileName = `sites/${organizationId}/${slug}/index.html`;
  const { data, error } = await supabase.storage
    .from('public-sites')
    .upload(fileName, html, {
      contentType: 'text/html',
      upsert: true
    });
  
  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
  
  // Obter URL pública
  const { data: urlData } = supabase.storage
    .from('public-sites')
    .getPublicUrl(fileName);
  
  // Atualizar site
  site.status = 'publicado';
  site.slug = slug;
  site.url = dominio || `https://${slug}.rendizy.com.br`;
  site.publicadoEm = new Date().toISOString();
  
  await kv.set(`client_site:${id}`, site);
  await kv.set(`client_site_slug:${slug}`, id);
  
  return c.json({
    success: true,
    data: {
      siteId: id,
      url: site.url,
      status: 'publicado',
      publicadoEm: site.publicadoEm
    }
  });
});

async function gerarHTMLEstatico(site: ClientSite): Promise<string> {
  // Renderizar React para HTML estático
  const template = await import(`../../../templates/${site.template}.tsx`);
  const Component = template.default;
  
  // Usar ReactDOMServer.renderToString()
  const html = ReactDOMServer.renderToString(
    <Component config={site.config} propriedades={site.propriedades} />
  );
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.config.titulo || 'Imóveis para Temporada'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css">
</head>
<body>
  ${html}
</body>
</html>
  `;
}
```

---

#### **Opção B: Domínio Personalizado**

**Funcionalidade:**
Cliente pode usar domínio próprio (ex: `imoveis.joaosilva.com.br`)

**Endpoint:**
```http
POST /client-sites/:id/configurar-dominio
```

**Request:**
```json
{
  "dominio": "imoveis.joaosilva.com.br"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dominio": "imoveis.joaosilva.com.br",
    "status": "aguardando_dns",
    "instrucoes": {
      "tipo": "CNAME",
      "nome": "imoveis",
      "valor": "sites.rendizy.com.br",
      "ttl": 3600
    }
  }
}
```

**Validação de DNS:**
```typescript
app.post('/client-sites/:id/validar-dns', async (c) => {
  const { id } = c.req.param();
  const site = await kv.get(`client_site:${id}`);
  
  // Verificar se CNAME aponta para sites.rendizy.com.br
  const dns = await resolveDNS(site.dominio);
  
  if (dns.cname === 'sites.rendizy.com.br') {
    site.status = 'publicado';
    site.dominioValidado = true;
    await kv.set(`client_site:${id}`, site);
    
    return c.json({
      success: true,
      message: 'Domínio validado com sucesso'
    });
  }
  
  return c.json({
    success: false,
    error: 'CNAME ainda não configurado corretamente'
  }, 400);
});
```

---

### **GAP 2: Editor Visual de Customização**

**Status:** Frontend 10% | Backend 0%

**O que falta:**
Permitir customizar cores, fontes, layout sem editar código.

**Interface planejada:**
```
┌─────────────────────────────────────────────────────────────┐
│  Editor de Site - João Silva Imóveis                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Painel Lateral]              [Preview do Site]           │
│  ┌────────────────┐            ┌──────────────────┐        │
│  │ Aparência      │            │                  │        │
│  │ ─────────────  │            │  [LOGO]          │        │
│  │                │            │                  │        │
│  │ Cor Primária:  │            │  Imóveis para    │        │
│  │ [#3B82F6]  🎨  │            │  Temporada       │        │
│  │                │            │                  │        │
│  │ Cor Secundária:│            │  [Propriedade 1] │        │
│  │ [#10B981]  🎨  │            │  [Propriedade 2] │        │
│  │                │            │                  │        │
│  │ Fonte:         │            │  Contato:        │        │
│  │ [Inter    ▼]   │            │  (21) 99999-0001 │        │
│  │                │            │                  │        │
│  │ Logo:          │            └──────────────────┘        │
│  │ [Upload]       │                                        │
│  │                │                                        │
│  │ Favicon:       │                                        │
│  │ [Upload]       │                                        │
│  │                │                                        │
│  └────────────────┘                                        │
│                                                             │
│  [Conteúdo]                                                 │
│  ┌────────────────┐                                        │
│  │ Título:        │                                        │
│  │ [João Silva Imóveis]                                    │
│  │                │                                        │
│  │ Descrição:     │                                        │
│  │ [Textarea...]  │                                        │
│  │                │                                        │
│  │ Email:         │                                        │
│  │ [contato@...]  │                                        │
│  │                │                                        │
│  │ Telefone:      │                                        │
│  │ [(21) 99999... │                                        │
│  └────────────────┘                                        │
│                                                             │
│  [SEO]                                                      │
│  ┌────────────────┐                                        │
│  │ Meta Title:    │                                        │
│  │ [...]          │                                        │
│  │                │                                        │
│  │ Meta Desc:     │                                        │
│  │ [...]          │                                        │
│  │                │                                        │
│  │ Keywords:      │                                        │
│  │ [...]          │                                        │
│  └────────────────┘                                        │
│                                                             │
│                    [Salvar] [Publicar]                     │
└─────────────────────────────────────────────────────────────┘
```

**Endpoint a criar:**
```http
PUT /client-sites/:id/customizar
```

**Request:**
```json
{
  "aparencia": {
    "corPrimaria": "#3B82F6",
    "corSecundaria": "#10B981",
    "fonte": "Inter",
    "logoUrl": "https://storage.supabase.co/.../logo.png",
    "faviconUrl": "https://storage.supabase.co/.../favicon.ico"
  },
  "conteudo": {
    "titulo": "João Silva Imóveis",
    "descricao": "Aluguel de casas e apartamentos...",
    "email": "contato@joaosilva.com.br",
    "telefone": "(21) 99999-0001",
    "whatsapp": "(21) 99999-0001"
  },
  "seo": {
    "metaTitle": "João Silva Imóveis - Aluguel Temporada",
    "metaDescription": "Encontre sua casa...",
    "keywords": ["aluguel", "temporada", "rio de janeiro"]
  },
  "analytics": {
    "googleAnalyticsId": "UA-XXXXXXXX-X",
    "facebookPixelId": "XXXXXXXXXXXX"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "siteId": "site_001",
    "customizacao": { /* ... */ },
    "updatedAt": "2025-11-03T15:00:00.000Z"
  }
}
```

---

### **GAP 3: Integração com Analytics**

**Status:** Frontend 50% | Backend 0%

**Funcionalidade:**
Adicionar Google Analytics e Facebook Pixel automaticamente.

**Implementação:**

Ao gerar HTML estático, incluir scripts:

```typescript
function gerarHTMLComAnalytics(site: ClientSite): string {
  let scriptsAnalytics = '';
  
  // Google Analytics
  if (site.analytics?.googleAnalyticsId) {
    scriptsAnalytics += `
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.analytics.googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${site.analytics.googleAnalyticsId}');
</script>
    `;
  }
  
  // Facebook Pixel
  if (site.analytics?.facebookPixelId) {
    scriptsAnalytics += `
<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${site.analytics.facebookPixelId}');
  fbq('track', 'PageView');
</script>
    `;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <!-- ... outros meta tags ... -->
  ${scriptsAnalytics}
</head>
<body>
  <!-- ... conteúdo ... -->
</body>
</html>
  `;
}
```

---

### **GAP 4: Formulário de Contato Funcional**

**Status:** Frontend 80% | Backend 0%

**O que falta:**
Os templates têm formulário de contato, mas não enviam emails.

**Endpoint a criar:**
```http
POST /client-sites/:slug/contato
```

**Request:**
```json
{
  "nome": "Maria Santos",
  "email": "maria@email.com",
  "telefone": "(21) 98888-0002",
  "mensagem": "Gostaria de informações sobre o Apt 501",
  "propriedadeId": "prop_001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso. Entraremos em contato em breve."
}
```

**Implementação:**
```typescript
app.post('/client-sites/:slug/contato', async (c) => {
  const { slug } = c.req.param();
  const { nome, email, telefone, mensagem, propriedadeId } = await c.req.json();
  
  // Buscar site pelo slug
  const siteId = await kv.get(`client_site_slug:${slug}`);
  const site = await kv.get(`client_site:${siteId}`);
  
  if (!site) {
    return c.json({ success: false, error: 'Site não encontrado' }, 404);
  }
  
  // Salvar lead
  const lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    siteId: site.id,
    organizationId: site.organizationId,
    nome,
    email,
    telefone,
    mensagem,
    propriedadeId,
    origem: 'site_cliente',
    status: 'novo',
    createdAt: new Date().toISOString()
  };
  
  await kv.set(`lead:${lead.id}`, lead);
  
  // Enviar email para o dono do site
  await enviarEmailNotificacao(site.config.email, {
    assunto: `Novo Contato via Site: ${nome}`,
    corpo: `
      Nome: ${nome}
      Email: ${email}
      Telefone: ${telefone}
      
      Mensagem:
      ${mensagem}
      
      ${propriedadeId ? `Propriedade de interesse: ${propriedadeId}` : ''}
    `
  });
  
  // Criar oportunidade no CRM (se habilitado)
  if (site.config.criarOportunidadeAutomatica) {
    const oportunidade = {
      id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId: site.organizationId,
      titulo: `${nome} - Contato via Site`,
      clienteNome: nome,
      clienteEmail: email,
      clienteTelefone: telefone,
      etapa: 'novo_lead',
      valor: 0,
      origem: 'site_cliente',
      propriedadesInteresse: propriedadeId ? [propriedadeId] : [],
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`crm_oportunidade:${oportunidade.id}`, oportunidade);
  }
  
  return c.json({
    success: true,
    message: 'Mensagem enviada com sucesso. Entraremos em contato em breve.'
  });
});
```

---

### **GAP 5: Sincronização de Propriedades**

**Status:** Frontend 70% | Backend 60%

**Problema:**
Quando uma propriedade é atualizada no sistema, o site do cliente não reflete automaticamente.

**Solução:**

Criar job que regenera sites quando propriedades mudam:

```typescript
// Trigger quando propriedade é atualizada
app.put('/properties/:id', async (c) => {
  // ... lógica de atualização ...
  
  // Buscar sites que usam essa propriedade
  const allSites = await kv.getByPrefix('client_site:');
  const sitesAfetar = allSites.filter(site =>
    site.propriedadeIds && site.propriedadeIds.includes(id)
  );
  
  // Agendar republicação
  for (const site of sitesAfetar) {
    await agendarRepublicacao(site.id);
  }
});

async function agendarRepublicacao(siteId: string) {
  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tipo: 'republicar_site',
    siteId,
    status: 'pendente',
    agendadoPara: new Date().toISOString()
  };
  
  await kv.set(`job:${job.id}`, job);
  
  // Worker processa jobs periodicamente
  console.log(`✅ Republicação agendada para site ${siteId}`);
}
```

---

## 📅 PLANO DE IMPLEMENTAÇÃO

### **SPRINT 1 (2 semanas) - Publicação Básica**

**Tasks:**
1. [ ] Implementar POST /client-sites/:id/publicar
2. [ ] Gerar HTML estático
3. [ ] Upload para Supabase Storage
4. [ ] Criar subdomínios (Opção A)
5. [ ] Testes de publicação

---

### **SPRINT 2 (2 semanas) - Editor Visual**

**Tasks:**
1. [ ] Implementar PUT /client-sites/:id/customizar
2. [ ] Frontend: Editor visual
3. [ ] Preview em tempo real
4. [ ] Upload de logo e favicon

---

### **SPRINT 3 (1 semana) - Analytics e Contato**

**Tasks:**
1. [ ] Adicionar scripts de Analytics
2. [ ] Implementar POST /client-sites/:slug/contato
3. [ ] Envio de emails
4. [ ] Criar leads/oportunidades automaticamente

---

### **SPRINT 4 (1 semana) - Domínio Personalizado**

**Tasks:**
1. [ ] Implementar configuração de domínio
2. [ ] Validação de DNS
3. [ ] Instruções passo-a-passo para cliente

---

### **SPRINT 5 (1 semana) - Sincronização**

**Tasks:**
1. [ ] Job de republicação automática
2. [ ] Worker para processar jobs
3. [ ] Testes de sincronização

---

## 🧪 CENÁRIOS DE TESTE

### **Cenário 1: Publicar Site**

```bash
POST /client-sites/site_001/publicar
{
  "slug": "joao-silva-imoveis"
}

Espera-se:
- HTML estático gerado
- Upload bem-sucedido
- URL: https://joao-silva-imoveis.rendizy.com.br
- Site acessível publicamente
```

---

### **Cenário 2: Customizar Aparência**

```bash
PUT /client-sites/site_001/customizar
{
  "aparencia": {
    "corPrimaria": "#3B82F6",
    "corSecundaria": "#10B981"
  }
}

Espera-se:
- Configuração salva
- Republicação automática agendada
- Site reflete novas cores em 5 minutos
```

---

### **Cenário 3: Formulário de Contato**

```bash
POST /client-sites/joao-silva-imoveis/contato
{
  "nome": "Maria Santos",
  "email": "maria@email.com",
  "mensagem": "Quero alugar!"
}

Espera-se:
- Lead criado no sistema
- Email enviado para dono do site
- Oportunidade criada no CRM (se habilitado)
```

---

**FIM DO DOCUMENTO** 🚀

**Status:** Módulo avançado, mas implementável em 7 semanas
