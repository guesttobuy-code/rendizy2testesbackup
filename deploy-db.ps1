# Script para fazer deploy do banco de dados no Supabase
# Uso: .\deploy-db.ps1
# Opcional:
#   -DbPassword <senha>  (ou defina SUPABASE_DB_PASSWORD no ambiente)
# Executa no VS Code: Terminal > Run Task > deploy-db

param(
    [string]$DbPassword
)

$ErrorActionPreference = "Stop"

# Define o diretório do projeto (este repositório)
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $projectPath 'supabase'))) {
    throw "Nao encontrei a pasta 'supabase' em: $projectPath"
}
Set-Location -LiteralPath $projectPath

if ($DbPassword) {
    $env:SUPABASE_DB_PASSWORD = $DbPassword
}

Write-Host "`n🗄️  Deploy do Banco de Dados (Supabase)" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Verifica se está autenticado
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$authCheck = npx -y supabase@latest projects list 2>&1
if ($LASTEXITCODE -ne 0 -or $authCheck -match "not logged in") {
    Write-Host "⚠️  Não autenticado. Execute: npx supabase login" -ForegroundColor Yellow
    Write-Host "   (Abra o link no navegador e autorize)" -ForegroundColor Gray
    exit 1
}

# Linka o projeto (não falha se já estiver linkado)
Write-Host "🔗 Linkando projeto..." -ForegroundColor Yellow
npx -y supabase@latest link --project-ref odcgnzfremrqnvtitpcc 2>&1 | Out-Null
# Ignora erro se já estiver linkado

# Faz o push das migrations (com resposta automática Y)
Write-Host "📤 Fazendo push das migrations..." -ForegroundColor Yellow
Write-Host "   (Respondendo 'Y' automaticamente se solicitado)`n" -ForegroundColor Gray

# Usa echo Y | para responder automaticamente
echo Y | npx -y supabase@latest db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy do banco de dados concluído com sucesso!`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Erro ao fazer deploy do banco de dados.`n" -ForegroundColor Red
    if (-not $env:SUPABASE_DB_PASSWORD) {
        Write-Host "Dica: para 'db push' pode ser necessário definir SUPABASE_DB_PASSWORD." -ForegroundColor Yellow
        Write-Host "Ex.: `$env:SUPABASE_DB_PASSWORD='***'; .\deploy-db.ps1" -ForegroundColor Gray
        Write-Host "Ou: .\deploy-db.ps1 -DbPassword '***'" -ForegroundColor Gray
    }
    exit 1
}
