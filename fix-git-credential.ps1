# ============================================================================
# 🔧 Fix Git Credential Manager - Usar Token Diretamente
# ============================================================================
# Desabilita o Git Credential Manager para usar token da URL diretamente
# ============================================================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   FIX GIT CREDENTIAL MANAGER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no repositório correto
$currentDir = Get-Location
Write-Host "📁 Diretório atual: $currentDir" -ForegroundColor Yellow
Write-Host ""

# Verificar remote atual
Write-Host "📋 Verificando remote atual..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>$null

if (-not $remoteUrl) {
    Write-Host "   ❌ Nenhum remote 'origin' encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Remote encontrado: $($remoteUrl -replace 'ghp_[a-zA-Z0-9]+', 'ghp_***')" -ForegroundColor Green
Write-Host ""

# Verificar se token está na URL
if ($remoteUrl -match "ghp_[a-zA-Z0-9]+") {
    Write-Host "   ✅ Token detectado na URL" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Token não encontrado na URL" -ForegroundColor Yellow
    Write-Host "   💡 Configure o token na URL do remote primeiro" -ForegroundColor Cyan
}
Write-Host ""

# Desabilitar GCM para este repositório
Write-Host "🔧 Desabilitando Git Credential Manager para este repositório..." -ForegroundColor Yellow

# Remover qualquer credential helper configurado
git config --local --unset credential.helper 2>$null
git config --local --unset-all credential.helper 2>$null

# Configurar para usar store (salva credenciais localmente)
git config --local credential.helper store

Write-Host "   ✅ Credential helper configurado como 'store'" -ForegroundColor Green
Write-Host ""

# Verificar configuração
Write-Host "📋 Verificando configuração..." -ForegroundColor Yellow
$credHelper = git config --local --get credential.helper
Write-Host "   Credential Helper: $credHelper" -ForegroundColor Cyan
Write-Host ""

# Testar conexão
Write-Host "🧪 Testando conexão com GitHub..." -ForegroundColor Yellow
$testResult = git ls-remote origin HEAD 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Conexão funcionando! Token válido." -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro na conexão:" -ForegroundColor Red
    Write-Host "   $testResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "   💡 Possíveis causas:" -ForegroundColor Yellow
    Write-Host "      - Token expirado" -ForegroundColor White
    Write-Host "      - Token sem permissões adequadas" -ForegroundColor White
    Write-Host "      - Repositório não existe ou sem acesso" -ForegroundColor White
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Tente fazer push: git push origin main" -ForegroundColor White
Write-Host "   2. Se ainda pedir autenticação, o token pode ter expirado" -ForegroundColor White
Write-Host "   3. Atualize o token na URL: git remote set-url origin https://TOKEN@github.com/..." -ForegroundColor White
Write-Host ""

