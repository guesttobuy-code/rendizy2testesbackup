# Script para fazer deploy do frontend (GitHub)
# Uso: .\deploy-frontend.ps1 [mensagem-do-commit]
# Executa no VS Code: Terminal > Run Task > deploy-frontend

$ErrorActionPreference = "Stop"

# Define o diretório do projeto (detecta automaticamente se estiver em worktree)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = if (Test-Path "$scriptPath\RendizyPrincipal") { $scriptPath } else { "C:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main" }
Set-Location $projectPath

Write-Host "`n🌐 Deploy do Frontend (GitHub → Vercel)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verifica se há mudanças
Write-Host "📋 Verificando mudanças..." -ForegroundColor Yellow
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "⚠️  Nenhuma mudança para commitar." -ForegroundColor Yellow
    Write-Host "   Verificando se precisa fazer push...`n" -ForegroundColor Gray
    
    # Verifica se há commits locais não enviados
    git fetch origin 2>&1 | Out-Null
    $localCommits = git log origin/main..HEAD --oneline 2>&1
    if ([string]::IsNullOrWhiteSpace($localCommits)) {
        Write-Host "✅ Repositório já está sincronizado.`n" -ForegroundColor Green
        exit 0
    }
} else {
    # Adiciona todas as mudanças
    Write-Host "📦 Adicionando mudanças..." -ForegroundColor Yellow
    git add -A
    
    # Mensagem do commit (do parâmetro ou padrão)
    $commitMessage = if ($args.Count -gt 0) { $args[0] } else { "chore: Atualização automática do frontend" }
    
    Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao fazer commit.`n" -ForegroundColor Red
        exit 1
    }
}

# Faz push
Write-Host "📤 Enviando para GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy do frontend concluído com sucesso!" -ForegroundColor Green
    Write-Host "   Vercel fará deploy automático em alguns segundos.`n" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Erro ao fazer push para GitHub.`n" -ForegroundColor Red
    exit 1
}

