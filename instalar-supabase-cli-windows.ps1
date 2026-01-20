# ============================================================================
# SCRIPT: Instalar Supabase CLI no Windows 11 (Versão Correta)
# ============================================================================

Write-Host "🚀 Instalando Supabase CLI no Windows 11..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Scoop está instalado
$scoopInstalled = Get-Command scoop -ErrorAction SilentlyContinue

if (-not $scoopInstalled) {
    Write-Host "📦 Scoop não encontrado. Instalando Scoop primeiro..." -ForegroundColor Yellow
    Write-Host ""
    
    # Instalar Scoop
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Scoop instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar Scoop" -ForegroundColor Red
        exit 1
    }
    
    # Adicionar bucket do Supabase
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
}

Write-Host ""
Write-Host "📦 Instalando Supabase CLI via Scoop..." -ForegroundColor Cyan
scoop install supabase

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Supabase CLI instalado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao instalar Supabase CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 SOLUÇÃO ALTERNATIVA: Download manual" -ForegroundColor Yellow
    Write-Host "   1. Acesse: https://github.com/supabase/cli/releases/latest" -ForegroundColor White
    Write-Host "   2. Baixe: supabase_windows_amd64.exe" -ForegroundColor White
    Write-Host "   3. Renomeie para: supabase.exe" -ForegroundColor White
    Write-Host "   4. Mova para: $env:USERPROFILE\bin" -ForegroundColor White
    Write-Host "   5. Adicione ao PATH: $env:USERPROFILE\bin" -ForegroundColor White
    exit 1
}

# Verificar instalação
Write-Host ""
Write-Host "🔍 Verificando instalação..." -ForegroundColor Cyan
$version = supabase --version
Write-Host "✅ Versão instalada: $version" -ForegroundColor Green

Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1️⃣  Autenticar no Supabase:" -ForegroundColor Cyan
Write-Host "      supabase login" -ForegroundColor White
Write-Host ""
Write-Host "   2️⃣  Linkar projeto:" -ForegroundColor Cyan
Write-Host "      supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor White
Write-Host ""
Write-Host "   3️⃣  Ver logs:" -ForegroundColor Cyan
Write-Host "      supabase logs" -ForegroundColor White
Write-Host "      ou" -ForegroundColor Gray
Write-Host "      .\ver-logs.ps1 -Filter 'login'" -ForegroundColor White
Write-Host ""

