# ============================================================================
# LOGIN SUPABASE CLI - Versão Rápida
# ============================================================================
# Uso: .\login-supabase.ps1
#   Ou: .\login-supabase.ps1 -Token "seu_token_aqui"
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

Write-Host "`n🔐 LOGIN SUPABASE CLI" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Cyan
Write-Host ""

if ($Token) {
    Write-Host "🔐 Fazendo login com token fornecido..." -ForegroundColor Yellow
    npx supabase login --token $Token
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
        
        Write-Host "`n📋 Verificando projetos..." -ForegroundColor Yellow
        npx supabase projects list
    } else {
        Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Escolha uma opção:" -ForegroundColor White
    Write-Host "  1. Login com token (recomendado)" -ForegroundColor Yellow
    Write-Host "  2. Login via navegador (interativo)" -ForegroundColor Yellow
    Write-Host ""
    
    $opcao = Read-Host "Opção (1 ou 2)"
    
    if ($opcao -eq "1") {
        $tokenInput = Read-Host "Digite seu token do Supabase"
        if ($tokenInput) {
            npx supabase login --token $tokenInput
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
                npx supabase projects list
            } else {
                Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "🔐 Abrindo navegador para login..." -ForegroundColor Yellow
        npx supabase login
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
            npx supabase projects list
        }
    }
}

Write-Host ""

