# Script COMPLETO para fazer Push no GitHub
# SEMPRE salva configuracoes e faz push automatico

Write-Host "Configurando Git e fazendo Push para GitHub..." -ForegroundColor Cyan
Write-Host ""

# URL do repositorio GitHub
$githubUrl = "https://github.com/guesttobuy-code/Rendizyoficial.git"

# 1. Verificar se Git esta instalado
try {
    $gitVersion = git --version 2>&1
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Git nao esta instalado!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Configurar usuario Git (se nao estiver configurado)
$userName = git config user.name 2>$null
$userEmail = git config user.email 2>$null

if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($userEmail)) {
    Write-Host "Configurando usuario Git..." -ForegroundColor Yellow
    
    # Tentar obter do sistema ou usar padrao
    $systemUser = $env:USERNAME
    git config user.name "$systemUser"
    git config user.email "$systemUser@users.noreply.github.com"
    
    Write-Host "   Usuario: $(git config user.name)" -ForegroundColor Gray
    Write-Host "   Email: $(git config user.email)" -ForegroundColor Gray
    Write-Host "   (Voce pode alterar depois com: git config user.name 'Seu Nome')" -ForegroundColor Yellow
} else {
    Write-Host "Usuario Git ja configurado:" -ForegroundColor Green
    Write-Host "   Usuario: $userName" -ForegroundColor Gray
    Write-Host "   Email: $userEmail" -ForegroundColor Gray
}

Write-Host ""

# 3. Inicializar Git se nao existir
if (Test-Path .git) {
    Write-Host "Repositorio Git ja inicializado" -ForegroundColor Green
} else {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    Write-Host "Repositorio inicializado" -ForegroundColor Green
}

Write-Host ""

# 4. Configurar remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    if ($existingRemote -eq $githubUrl) {
        Write-Host "Remote ja configurado: $githubUrl" -ForegroundColor Green
    } else {
        Write-Host "Atualizando remote..." -ForegroundColor Yellow
        git remote set-url origin $githubUrl
        Write-Host "Remote atualizado!" -ForegroundColor Green
    }
} else {
    Write-Host "Adicionando remote..." -ForegroundColor Yellow
    git remote add origin $githubUrl
    Write-Host "Remote configurado!" -ForegroundColor Green
}

Write-Host ""

# 5. Adicionar arquivos
Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

$stagedCount = (git diff --cached --name-only 2>$null | Measure-Object).Count
Write-Host "   $stagedCount arquivo(s) no stage" -ForegroundColor Green

Write-Host ""

# 6. Fazer commit
$commitMessage = "feat: Atualizacao WhatsApp Integration - Correcoes organizationId e status em tempo real"
Write-Host "Fazendo commit..." -ForegroundColor Cyan

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit realizado!" -ForegroundColor Green
} else {
    Write-Host "Nenhuma alteracao nova para commitar" -ForegroundColor Yellow
}

Write-Host ""

# 7. Verificar branch
$currentBranch = git branch --show-current 2>$null
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    git branch -M main
    $currentBranch = "main"
}

Write-Host "Branch atual: $currentBranch" -ForegroundColor Green
Write-Host ""

# 8. Fazer push
Write-Host "Tentando fazer push..." -ForegroundColor Cyan
Write-Host "   (Se pedir autenticacao, use Personal Access Token)" -ForegroundColor Yellow
Write-Host ""

# Primeira vez
git push -u origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCESSO! Push realizado com sucesso!" -ForegroundColor Green
    Write-Host "   Repositorio: $githubUrl" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERRO ao fazer push" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possiveis causas:" -ForegroundColor Yellow
    Write-Host "   1. Precisa de autenticacao (token do GitHub)" -ForegroundColor White
    Write-Host "   2. Repositorio nao existe ou sem permissao" -ForegroundColor White
    Write-Host ""
    Write-Host "Para fazer push manualmente:" -ForegroundColor Cyan
    Write-Host "   git push -u origin $currentBranch" -ForegroundColor White
    Write-Host ""
    Write-Host "Criar token: https://github.com/settings/tokens" -ForegroundColor Cyan
}

