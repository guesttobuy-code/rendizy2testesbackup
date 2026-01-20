# Script para iniciar o servidor de desenvolvimento
Write-Host "=== Iniciando Servidor Rendizy ===" -ForegroundColor Green

# Navegar para o diretório
Set-Location "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP\RendizyPrincipal"

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar se as dependências do @dnd-kit estão instaladas
Write-Host "Verificando dependencias @dnd-kit..." -ForegroundColor Cyan
$dndKitInstalled = npm list @dnd-kit/core 2>&1 | Select-String -Pattern "@dnd-kit/core"
if (-not $dndKitInstalled) {
    Write-Host "Instalando @dnd-kit..." -ForegroundColor Yellow
    npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
}

# Parar processos Node existentes
Write-Host "Parando processos Node existentes..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Iniciar servidor
Write-Host "Iniciando servidor na porta 5173..." -ForegroundColor Green
Write-Host "Acesse: http://localhost:5173" -ForegroundColor Yellow
npm run dev
