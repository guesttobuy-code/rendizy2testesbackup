# ============================================================================
# SCRIPT: Deploy Automatico do Backend
# ============================================================================
# Faz deploy da Edge Function rendizy-server no Supabase
# ============================================================================

Write-Host "Iniciando deploy do backend..." -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretorio correto
$backendPath = "supabase\functions\rendizy-server"
if (-not (Test-Path $backendPath)) {
    Write-Host "ERRO: Pasta $backendPath nao encontrada!" -ForegroundColor Red
    Write-Host "   Execute este script na raiz do projeto" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Pasta do backend encontrada: $backendPath" -ForegroundColor Green
Write-Host ""

# Verificar se Supabase CLI esta instalado
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command npx -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "ERRO: npx nao encontrado!" -ForegroundColor Red
    Write-Host "   Instale Node.js primeiro: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: npx encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se esta logado no Supabase
Write-Host "Verificando login no Supabase..." -ForegroundColor Yellow
$loginCheck = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0 -or $loginCheck -match "not logged in" -or $loginCheck -match "authentication") {
    Write-Host "AVISO: Nao esta logado no Supabase" -ForegroundColor Yellow
    Write-Host "   Fazendo login..." -ForegroundColor Yellow
    Write-Host ""
    
    npx supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao fazer login no Supabase" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK: Login verificado" -ForegroundColor Green
Write-Host ""

# Linkar projeto (se necessario)
Write-Host "Linkando projeto..." -ForegroundColor Yellow
$projectRef = "odcgnzfremrqnvtitpcc"
npx supabase link --project-ref $projectRef 2>&1 | Out-Null
# Ignorar erro se ja estiver linkado

Write-Host "OK: Projeto linkado" -ForegroundColor Green
Write-Host ""

# Fazer deploy
Write-Host "Fazendo deploy da funcao rendizy-server..." -ForegroundColor Yellow
Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Gray
Write-Host ""

$deployOutput = npx supabase functions deploy rendizy-server 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Testar login: https://rendizy2producao-am7c.vercel.app/login" -ForegroundColor White
    Write-Host "   2. Usuario: rppt / Senha: root" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host ""
    Write-Host "Saida do erro:" -ForegroundColor Yellow
    Write-Host $deployOutput -ForegroundColor Gray
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Cyan
    Write-Host "   - Verifique se esta logado: npx supabase login" -ForegroundColor White
    Write-Host "   - Verifique se o projeto esta linkado: npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor White
    Write-Host "   - Tente fazer deploy manual pelo dashboard: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions" -ForegroundColor White
    Write-Host ""
    exit 1
}
