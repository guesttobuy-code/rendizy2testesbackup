# ============================================================================
# SCRIPT: Git Commit e Push
# Descrição: Adiciona arquivos, faz commit e push para GitHub
# ============================================================================

Write-Host "🚀 Preparando Commit e Push para GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar se é um repositório Git
if (-not (Test-Path .git)) {
    Write-Host "❌ Não é um repositório Git!" -ForegroundColor Red
    Write-Host "   Execute primeiro: .\git-setup.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar se há remote configurado
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "❌ Remote não configurado!" -ForegroundColor Red
    Write-Host "   Execute primeiro: .\git-setup.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Remote configurado: $remoteUrl" -ForegroundColor Green
Write-Host ""

# Verificar status
Write-Host "📊 Verificando mudanças..." -ForegroundColor Cyan
git status --short

Write-Host ""

# Perguntar se deseja continuar
$confirm = Read-Host "Deseja adicionar TODOS os arquivos e fazer commit? (s/n)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Operação cancelada" -ForegroundColor Yellow
    exit 0
}

# Adicionar arquivos
Write-Host ""
Write-Host "📦 Adicionando arquivos..." -ForegroundColor Yellow
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar arquivos" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivos adicionados" -ForegroundColor Green

# Solicitar mensagem de commit
Write-Host ""
Write-Host "📝 Mensagem do commit:" -ForegroundColor Cyan
Write-Host "   (Deixe vazio para usar mensagem padrão)" -ForegroundColor Gray
Write-Host ""

$commitMessage = Read-Host "Digite a mensagem do commit"

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "feat: Atualização do projeto Rendizy - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Write-Host "   Usando mensagem padrão: $commitMessage" -ForegroundColor Gray
}

# Fazer commit
Write-Host ""
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit" -ForegroundColor Red
    Write-Host "   (Pode ser que não há mudanças para commitar)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Commit realizado com sucesso!" -ForegroundColor Green

# Verificar branch atual
$currentBranch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    $currentBranch = "main"
    Write-Host ""
    Write-Host "🌿 Criando branch 'main'..." -ForegroundColor Yellow
    git branch -M main
}

Write-Host ""
Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Yellow
Write-Host "   Branch: $currentBranch" -ForegroundColor Gray
Write-Host ""

# Tentar push
git push -u origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Código enviado para GitHub!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "   1. Problema de autenticação (token/SSH)" -ForegroundColor Gray
    Write-Host "   2. Branch não existe no GitHub" -ForegroundColor Gray
    Write-Host "   3. Conflitos com código remoto" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Soluções:" -ForegroundColor Yellow
    Write-Host "   - Configure autenticação (token ou SSH)" -ForegroundColor Gray
    Write-Host "   - Execute: git pull origin $currentBranch --rebase" -ForegroundColor Gray
    Write-Host "   - Veja: GUIA_GIT_PUSH.md (seção Autenticação)" -ForegroundColor Gray
}

