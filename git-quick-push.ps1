# ============================================================================
# SCRIPT: Git Quick Push (Tudo em Um)
# Descrição: Adiciona, commita e faz push rapidamente
# ============================================================================

Write-Host "⚡ Git Quick Push - Tudo em um comando!" -ForegroundColor Cyan
Write-Host ""

# Verificar se é um repositório Git
if (-not (Test-Path .git)) {
    Write-Host "❌ Não é um repositório Git!" -ForegroundColor Red
    Write-Host "   Execute primeiro: .\git-setup.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar se há mudanças
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "ℹ️ Não há mudanças para commitar" -ForegroundColor Yellow
    exit 0
}

# Mostrar mudanças
Write-Host "📊 Mudanças detectadas:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Mensagem padrão
$defaultMessage = "feat: Atualização - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Solicitar mensagem
$commitMessage = Read-Host "Mensagem do commit (Enter para usar padrão: '$defaultMessage')"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = $defaultMessage
}

# Executar tudo
Write-Host ""
Write-Host "🚀 Executando: git add ." -ForegroundColor Yellow
git add .

Write-Host "💾 Executando: git commit -m '$commitMessage'" -ForegroundColor Yellow
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no commit" -ForegroundColor Red
    exit 1
}

# Verificar branch
$currentBranch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    $currentBranch = "main"
    git branch -M main
}

Write-Host "📤 Executando: git push origin $currentBranch" -ForegroundColor Yellow
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
    Write-Host "🎉 Código no GitHub!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro no push. Verifique autenticação." -ForegroundColor Red
    Write-Host "   Veja: GUIA_GIT_PUSH.md" -ForegroundColor Yellow
}

