# ============================================================================
# DEPLOY SUPABASE - COM VERIFICAÇÃO DE CLI
# ============================================================================
# Script para fazer deploy no Supabase com fallback automático
# ============================================================================

Write-Host "DEPLOY SUPABASE - EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host ""

# Verificar métodos disponíveis
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
$npxInstalled = Get-Command npx -ErrorAction SilentlyContinue
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

Write-Host "Verificando ferramentas disponiveis..." -ForegroundColor Yellow

if ($supabaseInstalled) {
    Write-Host "  [OK] Supabase CLI instalado" -ForegroundColor Green
    $method = "cli"
} elseif ($npxInstalled) {
    Write-Host "  [OK] npx disponivel (usara npx)" -ForegroundColor Green
    $method = "npx"
} else {
    Write-Host "  [ERRO] Supabase CLI nao encontrado" -ForegroundColor Red
    Write-Host "  [ERRO] npx nao encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "OPCOES:" -ForegroundColor Yellow
    Write-Host "  1. Instalar Supabase CLI:" -ForegroundColor White
    Write-Host "     npm install -g supabase" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Fazer deploy via Dashboard (sem CLI):" -ForegroundColor White
    Write-Host "     https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Instalar Node.js para usar npx:" -ForegroundColor White
    Write-Host "     https://nodejs.org/" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Fazendo deploy de rendizy-server..." -ForegroundColor Yellow
Write-Host ""

try {
    if ($method -eq "cli") {
        supabase functions deploy rendizy-server
    } elseif ($method -eq "npx") {
        npx supabase functions deploy rendizy-server
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCESSO! Deploy concluido!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verificar logs:" -ForegroundColor Cyan
        if ($method -eq "cli") {
            Write-Host "  supabase functions logs rendizy-server" -ForegroundColor White
        } else {
            Write-Host "  npx supabase functions logs rendizy-server" -ForegroundColor White
        }
    } else {
        Write-Host ""
        Write-Host "ERRO no deploy. Verifique os erros acima." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERRO ao executar deploy: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
