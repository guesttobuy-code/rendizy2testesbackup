# ============================================================================
# SCRIPT: Git Setup Inicial
# Descrição: Inicializa Git e configura remote do GitHub
# ============================================================================

Write-Host "🚀 Configurando Git para Push no GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Git está instalado
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não está instalado!" -ForegroundColor Red
    Write-Host "   Instale em: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verificar se já é um repositório Git
if (Test-Path .git) {
    Write-Host "✅ Repositório Git já inicializado" -ForegroundColor Green
} else {
    Write-Host "📦 Inicializando repositório Git..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Repositório inicializado" -ForegroundColor Green
}

Write-Host ""

# Verificar se remote já existe
$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "✅ Remote já configurado: $remoteUrl" -ForegroundColor Green
    Write-Host ""
    $change = Read-Host "Deseja alterar o remote? (s/n)"
    if ($change -eq "s" -or $change -eq "S") {
        git remote remove origin
    } else {
        Write-Host "✅ Usando remote existente" -ForegroundColor Green
        exit 0
    }
}

# Solicitar URL do GitHub
Write-Host ""
Write-Host "📝 Configure a URL do seu repositório GitHub:" -ForegroundColor Cyan
Write-Host "   Exemplo: https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git" -ForegroundColor Gray
Write-Host "   Ou: git@github.com:SEU_USUARIO/SEU_REPOSITORIO.git (SSH)" -ForegroundColor Gray
Write-Host ""

$githubUrl = Read-Host "Cole a URL do repositório GitHub"

if ([string]::IsNullOrWhiteSpace($githubUrl)) {
    Write-Host "❌ URL não pode ser vazia!" -ForegroundColor Red
    exit 1
}

# Adicionar remote
Write-Host ""
Write-Host "🔗 Adicionando remote..." -ForegroundColor Yellow
git remote add origin $githubUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote configurado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao configurar remote" -ForegroundColor Red
    exit 1
}

# Verificar status
Write-Host ""
Write-Host "📊 Status do repositório:" -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "✅ Setup concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo passo: Execute .\git-commit-push.ps1" -ForegroundColor Yellow

