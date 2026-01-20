# 🚀 Script para Iniciar Servidor Vite - RENDIZY
# Localização: C:\dev\RENDIZY PASTA OFICIAL

Write-Host "`n=== INICIANDO SERVIDOR RENDIZY ===" -ForegroundColor Green
Write-Host "📁 Diretório: RendizyPrincipal" -ForegroundColor Cyan
Write-Host "🌐 Porta: 5173 (ou próxima disponível)" -ForegroundColor Cyan
Write-Host "🔗 URL: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do projeto principal
Set-Location "RendizyPrincipal"

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules não encontrado. Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Iniciar servidor
Write-Host "🚀 Iniciando servidor Vite..." -ForegroundColor Green
Write-Host ""

npm run dev
