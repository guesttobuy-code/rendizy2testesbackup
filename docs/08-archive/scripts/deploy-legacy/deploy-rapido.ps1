# ============================================================================
# DEPLOY RÁPIDO - GITHUB + SUPABASE
# ============================================================================
# Script rápido para commit, push e deploy
# ============================================================================

Write-Host "DEPLOY RAPIDO - GITHUB + SUPABASE" -ForegroundColor Cyan
Write-Host ""

# Adicionar tudo
git add -A

# Commit com timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "feat: atualizacao automatica - $timestamp"

Write-Host "Fazendo commit..." -ForegroundColor Yellow
git commit -m $commitMsg

# Push
Write-Host "Fazendo push..." -ForegroundColor Yellow
$branch = git branch --show-current
git push origin $branch

Write-Host ""
Write-Host "SUCESSO! Codigo atualizado no GitHub." -ForegroundColor Green
Write-Host ""

# Deploy Supabase (opcional)
Write-Host "Fazer deploy no Supabase? (y/n): " -ForegroundColor Yellow -NoNewline
$deploy = Read-Host

if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "Fazendo deploy..." -ForegroundColor Yellow
    Write-Host ""
    
    # Verificar se Supabase CLI está instalado
    $supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
    $npxInstalled = Get-Command npx -ErrorAction SilentlyContinue
    
    if ($supabaseInstalled) {
        # CLI instalado - usar diretamente
        Write-Host "Usando Supabase CLI instalado..." -ForegroundColor Cyan
        supabase functions deploy rendizy-server
    } elseif ($npxInstalled) {
        # Usar npx (não precisa instalar CLI)
        Write-Host "Usando npx (nao precisa instalar CLI)..." -ForegroundColor Cyan
        npx supabase functions deploy rendizy-server
    } else {
        # Nenhum método disponível
        Write-Host "ERRO: Supabase CLI nao encontrado!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Opcoes:" -ForegroundColor Yellow
        Write-Host "  1. Instalar CLI: npm install -g supabase" -ForegroundColor White
        Write-Host "  2. Fazer deploy via Dashboard:" -ForegroundColor White
        Write-Host "     https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions" -ForegroundColor Cyan
        Write-Host "  3. Instalar Node.js para usar npx" -ForegroundColor White
        Write-Host ""
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deploy concluido!" -ForegroundColor Green
    } else {
        Write-Host "Deploy falhou. Verifique os erros acima." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "PRONTO!" -ForegroundColor Green
