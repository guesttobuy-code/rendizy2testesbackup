# ============================================================================
# Script: Iniciar Servidor Local Rendizy (Versão Simplificada)
# ============================================================================
# Execute este script para iniciar o servidor de desenvolvimento
# ============================================================================

$projetoPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"

Write-Host ""
Write-Host "🚀 Iniciando Rendizy Local..." -ForegroundColor Cyan
Write-Host ""

# Navegar para a pasta
Set-Location $projetoPath

# Verificar dependências
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Iniciar servidor
Write-Host ""
Write-Host "✅ Servidor iniciando em: http://localhost:5173" -ForegroundColor Green
Write-Host ""

npm run dev
