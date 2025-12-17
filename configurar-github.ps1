# Script para configurar conexão com GitHub
# Repositório: suacasarendemais-png/Rendizy2producao

Write-Host "🚀 Configurando Git para GitHub..." -ForegroundColor Cyan
Write-Host ""

# URL do repositório
$githubUrl = "https://github.com/suacasarendemais-png/Rendizy2producao.git"

# 1. Verificar se Git está instalado
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não está instalado!" -ForegroundColor Red
    Write-Host "   Instale em: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Inicializar Git se não existir
if (Test-Path .git) {
    Write-Host "✅ Repositório Git já inicializado" -ForegroundColor Green
} else {
    Write-Host "📦 Inicializando repositório Git..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Repositório inicializado" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao inicializar repositório" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 3. Configurar remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "⚠️  Remote já existe: $existingRemote" -ForegroundColor Yellow
    Write-Host "   Atualizando para: $githubUrl" -ForegroundColor Yellow
    git remote set-url origin $githubUrl
} else {
    Write-Host "🔗 Adicionando remote..." -ForegroundColor Yellow
    git remote add origin $githubUrl
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote configurado: $githubUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao configurar remote" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4. Verificar configuração
Write-Host "📊 Configuração atual:" -ForegroundColor Cyan
git remote -v

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Onde a configuração fica salva:" -ForegroundColor Cyan
Write-Host "   Arquivo: .git/config" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. git add ." -ForegroundColor White
Write-Host "   2. git commit -m 'Seu comentário'" -ForegroundColor White
Write-Host "   3. git push -u origin main" -ForegroundColor White
Write-Host ""

















