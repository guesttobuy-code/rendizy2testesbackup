# Script para fazer deploy do backend (Supabase Edge Functions)
# Uso: .\deploy-backend.ps1
# Executa no VS Code: Terminal > Run Task > deploy-backend

$ErrorActionPreference = "Stop"

# Define o diretório do projeto (detecta automaticamente se estiver em worktree)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = if (Test-Path "$scriptPath\RendizyPrincipal") { $scriptPath } else { "C:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main" }
Set-Location $projectPath

Write-Host "`n🚀 Deploy do Backend (Supabase Edge Functions)" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# Verifica se está autenticado
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$authCheck = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0 -or $authCheck -match "not logged in") {
    Write-Host "⚠️  Não autenticado. Execute: npx supabase login" -ForegroundColor Yellow
    Write-Host "   (Abra o link no navegador e autorize)" -ForegroundColor Gray
    exit 1
}

# Linka o projeto (não falha se já estiver linkado)
Write-Host "🔗 Linkando projeto..." -ForegroundColor Yellow
npx supabase link --project-ref odcgnzfremrqnvtitpcc 2>&1 | Out-Null
# Ignora erro se já estiver linkado

# Deploy da função
Write-Host "📤 Fazendo deploy da função rendizy-server..." -ForegroundColor Yellow
npx supabase functions deploy rendizy-server

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy do backend concluído com sucesso!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Erro ao fazer deploy do backend.`n" -ForegroundColor Red
    exit 1
}

