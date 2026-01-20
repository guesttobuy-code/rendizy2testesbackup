# ============================================================================
# SCRIPT: Instalar Supabase CLI no Windows 11
# ============================================================================

Write-Host "🚀 Instalando Supabase CLI..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Instalar Supabase CLI globalmente
Write-Host "📦 Instalando Supabase CLI via npm..." -ForegroundColor Cyan
c

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Supabase CLI instalado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao instalar Supabase CLI" -ForegroundColor Red
    exit 1
}

# Verificar instalação
Write-Host ""
Write-Host "🔍 Verificando instalação..." -ForegroundColor Cyan
$cliVersion = supabase --version
Write-Host "✅ Versão instalada: $cliVersion" -ForegroundColor Green

Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1️⃣  Autenticar no Supabase:" -ForegroundColor Cyan
Write-Host "      supabase login" -ForegroundColor White
Write-Host ""
Write-Host "   2️⃣  Ver projetos:" -ForegroundColor Cyan
Write-Host "      supabase projects list" -ForegroundColor White
Write-Host ""
Write-Host "   3️⃣  Linkar projeto:" -ForegroundColor Cyan
Write-Host "      supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor White
Write-Host ""
Write-Host "   4️⃣  Ver logs:" -ForegroundColor Cyan
Write-Host "      supabase logs" -ForegroundColor White
Write-Host ""

