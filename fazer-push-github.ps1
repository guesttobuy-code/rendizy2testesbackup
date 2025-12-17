# Script para fazer Push no GitHub
# SEMPRE salva configuracoes e prepara para push

Write-Host "Configurando Git e preparando Push para GitHub..." -ForegroundColor Cyan
Write-Host ""

# URL do repositorio GitHub
$githubUrl = "https://github.com/guesttobuy-code/Rendizyoficial.git"

# 1. Verificar se Git esta instalado
try {
    $gitVersion = git --version 2>&1
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Git nao esta instalado!" -ForegroundColor Red
    Write-Host "   Instale em: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Inicializar Git se nao existir
if (Test-Path .git) {
    Write-Host "Repositorio Git ja inicializado" -ForegroundColor Green
} else {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO ao inicializar repositorio" -ForegroundColor Red
        exit 1
    }
    Write-Host "Repositorio inicializado" -ForegroundColor Green
}

Write-Host ""

# 3. Configurar remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    if ($existingRemote -eq $githubUrl) {
        Write-Host "Remote ja configurado: $githubUrl" -ForegroundColor Green
    } else {
        Write-Host "Atualizando remote de '$existingRemote' para '$githubUrl'..." -ForegroundColor Yellow
        git remote set-url origin $githubUrl
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Remote atualizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "ERRO ao atualizar remote" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Adicionando remote..." -ForegroundColor Yellow
    git remote add origin $githubUrl
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Remote configurado: $githubUrl" -ForegroundColor Green
    } else {
        Write-Host "ERRO ao configurar remote" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 4. Verificar status
Write-Host "Verificando arquivos modificados..." -ForegroundColor Cyan
git status --short

Write-Host ""

# 5. Adicionar todos os arquivos (exceto os do .gitignore)
Write-Host "Adicionando arquivos ao stage..." -ForegroundColor Cyan
git add .

$stagedCount = (git diff --cached --name-only 2>$null | Measure-Object).Count
if ($stagedCount -gt 0) {
    Write-Host "   $stagedCount arquivo(s) adicionado(s)" -ForegroundColor Green
} else {
    Write-Host "   Nenhum arquivo novo para adicionar" -ForegroundColor Yellow
}

Write-Host ""

# 6. Fazer commit
$commitMessage = "feat: Atualizacao WhatsApp Integration - Correcoes organizationId e status em tempo real"
Write-Host "Fazendo commit..." -ForegroundColor Cyan
Write-Host "   Mensagem: $commitMessage" -ForegroundColor Gray

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Nenhuma alteracao para commitar (ou commit ja existe)" -ForegroundColor Yellow
}

Write-Host ""

# 7. Verificar branch
$currentBranch = git branch --show-current 2>$null
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    Write-Host "Criando branch 'main'..." -ForegroundColor Yellow
    git branch -M main
    $currentBranch = "main"
} else {
    Write-Host "Branch atual: $currentBranch" -ForegroundColor Green
}

Write-Host ""

# 8. Instrucoes para Push
Write-Host "=" -ForegroundColor Cyan
Write-Host "PREPARADO PARA PUSH!" -ForegroundColor Green
Write-Host "=" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para fazer o push, execute um dos comandos abaixo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Primeira vez (configurar upstream):" -ForegroundColor White
Write-Host "   git push -u origin $currentBranch" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Proximas vezes:" -ForegroundColor White
Write-Host "   git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "   Se pedir autenticacao, use:" -ForegroundColor Yellow
Write-Host "   - Usuario: seu usuario do GitHub" -ForegroundColor White
Write-Host "   - Senha: Personal Access Token (NAO use sua senha normal!)" -ForegroundColor White
Write-Host ""
Write-Host "   Criar Token: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "   Permissoes necessarias: repo (acesso completo ao repositorio)" -ForegroundColor Gray
Write-Host ""
Write-Host "Deseja que eu tente fazer o push agora? (S/N)" -ForegroundColor Yellow

