# Arquitetura de Sites de Clientes - RENDIZY

## Objetivo
Cada imobiliária (cliente) terá seu próprio site conectado ao backend RENDIZY, funcionando como uma extensão do domínio principal.

## Estrutura Multi-Tenant

### 1. Armazenamento
- **KV Store**: Configuração do site (`ClientSiteConfig`) armazenada em `kv_store_67caf26a`
- **Supabase Storage**: Arquivos ZIP/TAR do site armazenados no bucket `client-sites`
- **Chave**: `client_site:{organizationId}`

### 2. Domínios
- **Subdomínio padrão**: `{subdomain}.rendizy.app` (ex: `medhome.rendizy.app`)
- **Domínio customizado**: Opcional, configurável por cliente (ex: `www.imobiliaria.com.br`)

### 3. Roteamento

#### A. Preview/Teste (Atual - Funciona sem DNS)
- **Rota**: `/rendizy-server/make-server-67caf26a/client-sites/serve/{domain}`
- **Uso**: Botão "Ver Site" na UI
- **Vantagem**: Funciona imediatamente, sem configurar DNS
- **Exemplo**: `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/serve/medhome.rendizy.app`

#### B. Produção (Futuro - Requer DNS)
- **Middleware**: Intercepta requisições baseado no Host header
- **Configuração**: DNS apontando `*.rendizy.app` para o Supabase
- **Uso**: Acesso direto pelo domínio (ex: `https://medhome.rendizy.app`)
- **Vantagem**: URLs limpas, SEO melhor

## Fluxo de Upload

1. **Cliente faz upload** do site (ZIP/TAR ou código HTML)
2. **Backend armazena**:
   - Se for código HTML → `siteCode` no KV Store
   - Se for arquivo → `archivePath` no Storage + referência no KV Store
3. **Site fica disponível** para preview e produção

## Fluxo de Servir Site

1. **Requisição chega** (via `/serve/*` ou Host header)
2. **Backend identifica** o domínio/subdomínio
3. **Busca site** no KV Store pelo domínio
4. **Serve conteúdo**:
   - Se tiver `siteCode` → serve HTML diretamente
   - Se tiver `archivePath` → extrai e serve (TODO: implementar extração)
   - Se não tiver → serve página padrão com tema

## Próximos Passos

1. ✅ Middleware de roteamento criado (aguardando DNS)
2. ✅ Rota `/serve/*` para preview funcionando
3. ⏳ Implementar extração de HTML de arquivos ZIP/TAR
4. ⏳ Configurar DNS para `*.rendizy.app` apontar para Supabase
5. ⏳ Implementar cache de sites servidos
6. ⏳ Adicionar suporte a assets estáticos (CSS, JS, imagens)

## Teste Atual

Para testar o site da Medhome:
1. Acesse a tela "Edição de Site"
2. Selecione a imobiliária "Medhome teste"
3. Clique em "Ver Site"
4. O site será aberto via rota `/serve/*`
