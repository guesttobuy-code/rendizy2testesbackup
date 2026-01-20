# ============================================================================
# 🔄 Configurar Novo Token do GitHub
# ============================================================================
# Substitui o token antigo pelo novo token oficial
#
# Uso: .\configurar-github-novo-token.ps1
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   CONFIGURAR NOVO TOKEN GITHUB" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASSO 1: Verificar Git
# ============================================================================
Write-Host "📋 PASSO 1: Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "   ✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Git não está instalado!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================================================
# PASSO 2: Verificar Remote Atual
# ============================================================================
Write-Host "📋 PASSO 2: Verificando remote atual..." -ForegroundColor Yellow
$currentRemote = git remote get-url origin 2>$null

if ($currentRemote) {
    Write-Host "   📍 Remote atual encontrado:" -ForegroundColor Cyan
    Write-Host "      $currentRemote" -ForegroundColor Gray
    
    # Extrair token antigo (se houver)
    if ($currentRemote -match "ghp_[a-zA-Z0-9]+") {
        $tokenAntigo = $matches[0]
        Write-Host "   🔍 Token antigo detectado: $($tokenAntigo.Substring(0, 20))..." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Nenhum remote 'origin' encontrado" -ForegroundColor Yellow
    Write-Host "   🔗 Adicionando remote..." -ForegroundColor Cyan
    git remote add origin "https://$Token@github.com/guesttobuy-code/Rendizyoficial.git"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Remote adicionado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao adicionar remote" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    exit 0
}
Write-Host ""

# ============================================================================
# PASSO 3: Atualizar Remote com Novo Token
# ============================================================================
Write-Host "📋 PASSO 3: Atualizando remote com novo token..." -ForegroundColor Yellow

$novoRemote = "https://$Token@github.com/guesttobuy-code/Rendizyoficial.git"

Write-Host "   🔄 Configurando novo remote..." -ForegroundColor Cyan
git remote set-url origin $novoRemote

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Remote atualizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao atualizar remote" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================================================
# PASSO 4: Verificar Nova Configuração
# ============================================================================
Write-Host "📋 PASSO 4: Verificando nova configuração..." -ForegroundColor Yellow
$novoRemoteVerificado = git remote get-url origin 2>$null

if ($novoRemoteVerificado) {
    Write-Host "   ✅ Remote configurado:" -ForegroundColor Green
    # Ocultar token na exibição (mostrar apenas primeiros caracteres)
    $remoteSeguro = $novoRemoteVerificado -replace "ghp_[a-zA-Z0-9]+", "ghp_***"
    Write-Host "      $remoteSeguro" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Erro ao verificar remote" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================================================
# PASSO 5: Testar Conexão
# ============================================================================
Write-Host "📋 PASSO 5: Testando conexão com GitHub..." -ForegroundColor Yellow

Write-Host "   🔍 Testando fetch..." -ForegroundColor Cyan
git fetch origin --dry-run 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Conexão com GitHub funcionando!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Aviso: Teste de conexão pode ter falhado (normal se repositório estiver vazio)" -ForegroundColor Yellow
    Write-Host "   💡 Tente fazer um push para validar completamente" -ForegroundColor Cyan
}
Write-Host ""

# ============================================================================
# RESUMO
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Token configurado:" -ForegroundColor Yellow
Write-Host "   $($Token.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Testar push: git push origin main" -ForegroundColor White
Write-Host "   2. Verificar status: git remote -v" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

