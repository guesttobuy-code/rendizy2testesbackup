# Script para fazer deploy do banco de dados no Supabase
# Uso: .\deploy-db.ps1
# Executa no VS Code: Terminal > Run Task > deploy-db

$ErrorActionPreference = "Stop"

# Define o diretório do projeto (detecta automaticamente se estiver em worktree)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = if (Test-Path "$scriptPath\RendizyPrincipal") { $scriptPath } else { "C:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main" }
Set-Location $projectPath

Write-Host "`n🗄️  Deploy do Banco de Dados (Supabase)" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

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

# Faz o push das migrations (com resposta automática Y)
Write-Host "📤 Fazendo push das migrations..." -ForegroundColor Yellow
Write-Host "   (Respondendo 'Y' automaticamente se solicitado)`n" -ForegroundColor Gray

# Usa echo Y | para responder automaticamente
echo Y | npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy do banco de dados concluído com sucesso!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Erro ao fazer deploy do banco de dados.`n" -ForegroundColor Red
    exit 1
}
