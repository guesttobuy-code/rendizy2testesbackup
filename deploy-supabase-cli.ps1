# ============================================================================
# 🚀 Deploy Automático Supabase via CLI - Rendizy
# ============================================================================
# Este script automatiza o deploy usando Supabase CLI
# 
# Uso: .\deploy-supabase-cli.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 RENDIZY - Deploy Supabase via CLI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "odcgnzfremrqnvtitpcc"
$FUNCTION_NAME = "rendizy-server"
$FUNCTION_PATH = "supabase\functions\rendizy-server"

# ============================================================================
# 📋 Passo 1: Verificar Pré-requisitos
# ============================================================================

Write-Host "📋 Passo 1: Verificando pré-requisitos..." -ForegroundColor Yellow
Write-Host ""

# Verificar se Supabase CLI está disponível via npx
Write-Host "📦 Verificando Supabase CLI (via npx)..." -ForegroundColor Cyan
try {
    $cliVersion = npx supabase --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "CLI não encontrado"
    }
    Write-Host "✅ Supabase CLI disponível via npx: $cliVersion" -ForegroundColor Green
    Write-Host "   (Usando npx - não precisa instalação global)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro ao verificar Supabase CLI" -ForegroundColor Red
    Write-Host "   Verifique se Node.js está instalado: node --version" -ForegroundColor Yellow
    exit 1
}

# Verificar se a função existe
if (!(Test-Path $FUNCTION_PATH)) {
    Write-Host "❌ Função não encontrada: $FUNCTION_PATH" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "$FUNCTION_PATH\index.ts")) {
    Write-Host "❌ Arquivo index.ts não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Função encontrada: $FUNCTION_PATH" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 🔐 Passo 2: Verificar Login
# ============================================================================

Write-Host "🔐 Passo 2: Verificando autenticação..." -ForegroundColor Yellow
Write-Host ""

try {
    npx supabase projects list 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Não autenticado"
    }
    Write-Host "✅ Autenticado no Supabase" -ForegroundColor Green
} catch {
    Write-Host "Nao autenticado. Fazendo login..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Isso abrira seu navegador para login" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Pressione Enter para continuar..."
    
    npx supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# 🔗 Passo 3: Verificar Link do Projeto
# ============================================================================

Write-Host "🔗 Passo 3: Verificando link do projeto..." -ForegroundColor Yellow
Write-Host ""

# Verificar se já está linkado
$isLinked = $false
try {
    $status = npx supabase status 2>&1
    if ($LASTEXITCODE -eq 0 -and $status -match "linked") {
        $isLinked = $true
    }
} catch {
    $isLinked = $false
}

if (!$isLinked) {
    Write-Host "⚠️  Projeto não está linkado" -ForegroundColor Yellow
    Write-Host "🔗 Linkando com projeto: $PROJECT_ID" -ForegroundColor Cyan
    Write-Host ""
    
    npx supabase link --project-ref $PROJECT_ID
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao linkar projeto" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "✅ Projeto já está linkado" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# 🚀 Passo 4: Deploy da Função
# ============================================================================

Write-Host "🚀 Passo 4: Fazendo deploy da função..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📦 Função: $FUNCTION_NAME" -ForegroundColor Cyan
Write-Host "📁 Caminho: $FUNCTION_PATH" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Aguarde (pode levar 30-60 segundos)..." -ForegroundColor Yellow
Write-Host ""

try {
    npx supabase functions deploy $FUNCTION_NAME
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Erro no deploy!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possíveis causas:" -ForegroundColor Yellow
        Write-Host "- Erro de sintaxe no código" -ForegroundColor Yellow
        Write-Host "- Arquivo faltando (Module not found)" -ForegroundColor Yellow
        Write-Host "- Credenciais inválidas" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Erro inesperado: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# 🧪 Passo 5: Testar Backend
# ============================================================================

Write-Host "🧪 Passo 5: Testando backend..." -ForegroundColor Yellow
Write-Host ""

$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"

$headers = @{
    "Authorization" = "Bearer $ANON_KEY"
}

try {
    Write-Host "📡 Testando health check..." -ForegroundColor Cyan
    $response = Invoke-RestMethod `
        -Uri "https://$PROJECT_ID.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/health" `
        -Headers $headers `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "✅ Backend ONLINE!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Service: $($response.service)" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "⚠️  Backend pode estar iniciando (aguarde 30 segundos e teste novamente)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Teste manualmente:" -ForegroundColor Cyan
    Write-Host "https://$PROJECT_ID.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/health" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# ✅ Sucesso!
# ============================================================================

Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Próximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Teste a aplicação: http://localhost:3000" -ForegroundColor White
Write-Host "2. Verifique os logs: npx supabase functions logs $FUNCTION_NAME" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Código sincronizado com Supabase!" -ForegroundColor Green
Write-Host ""

