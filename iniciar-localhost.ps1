# ============================================================================
# Script: Iniciar Servidor Local Rendizy
# ============================================================================
# Este script inicia o servidor de desenvolvimento local do Rendizy
# ============================================================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   INICIANDO SERVIDOR LOCAL RENDIZY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Caminho do projeto: usar a pasta atual
$projetoPath = Get-Location
Write-Host "📁 Pasta do projeto: $projetoPath" -ForegroundColor Yellow
Write-Host ""

# Verificar se Node.js está instalado
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "   ✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js não encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar se node_modules existe
Write-Host "🔍 Verificando dependências..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "   ⚠️  Dependências não instaladas. Instalando..." -ForegroundColor Yellow
    Write-Host "   📦 Isso pode levar alguns minutos..." -ForegroundColor Gray
    Write-Host ""
    
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "   ❌ Erro ao instalar dependências!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "   ✅ Dependências instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ✅ Dependências já instaladas" -ForegroundColor Green
}
Write-Host ""

# Verificar se package.json existe
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json não encontrado!" -ForegroundColor Red
    exit 1
}

# Iniciar servidor
Write-Host "🚀 Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   SERVIDOR INICIANDO..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URL: http://localhost:5173" -ForegroundColor Yellow
Write-Host "📝 Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Executar npm run dev
npm run dev
