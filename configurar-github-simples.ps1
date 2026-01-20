# ============================================================================
# Script Simplificado: Configurar GitHub Localmente
# Repositório: guesttobuy-code/Rendizyoficial
# ============================================================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   CONFIGURAR GITHUB LOCALMENTE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# URL do repositório
$githubUrl = "https://github.com/guesttobuy-code/Rendizyoficial.git"

# ============================================================================
# PASSO 1: Verificar Git
# ============================================================================
Write-Host "📋 PASSO 1: Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "   ✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Git não está instalado!" -ForegroundColor Red
    Write-Host "   📥 Baixe em: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# ============================================================================
# PASSO 2: Inicializar Git (se necessário)
# ============================================================================
Write-Host "📋 PASSO 2: Verificando repositório Git..." -ForegroundColor Yellow
if (Test-Path .git) {
    Write-Host "   ✅ Repositório Git já existe" -ForegroundColor Green
} else {
    Write-Host "   📦 Inicializando repositório Git..." -ForegroundColor Yellow
    git init | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Repositório inicializado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao inicializar repositório" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# ============================================================================
# PASSO 3: Configurar Remote
# ============================================================================
Write-Host "📋 PASSO 3: Configurando conexão com GitHub..." -ForegroundColor Yellow

# Verificar se remote já existe
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    if ($existingRemote -eq $githubUrl) {
        Write-Host "   ✅ Remote já está configurado corretamente!" -ForegroundColor Green
        Write-Host "      URL: $existingRemote" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Remote existe mas com URL diferente:" -ForegroundColor Yellow
        Write-Host "      Atual: $existingRemote" -ForegroundColor Gray
        Write-Host "   🔄 Atualizando para nova URL..." -ForegroundColor Yellow
        git remote set-url origin $githubUrl
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Remote atualizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erro ao atualizar remote" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "   🔗 Adicionando remote..." -ForegroundColor Yellow
    git remote add origin $githubUrl
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Remote configurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao configurar remote" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# ============================================================================
# PASSO 4: Mostrar Configuração
# ============================================================================
Write-Host "📋 PASSO 4: Verificando configuração..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   📍 Configuração atual:" -ForegroundColor Cyan
git remote -v
Write-Host ""

# Mostrar onde está salvo
$configPath = Join-Path (Get-Location).Path ".git\config"
Write-Host "   📁 Arquivo de configuração:" -ForegroundColor Cyan
Write-Host "      $configPath" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# RESUMO
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos para fazer push:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Adicionar arquivos:" -ForegroundColor White
Write-Host "      git add ." -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Fazer commit:" -ForegroundColor White
Write-Host "      git commit -m 'Sua mensagem aqui'" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Renomear branch (se necessário):" -ForegroundColor White
Write-Host "      git branch -M main" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Fazer push:" -ForegroundColor White
Write-Host "      git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

















