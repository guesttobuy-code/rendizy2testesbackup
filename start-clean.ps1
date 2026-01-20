#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Inicia o Rendizy com limpeza total de cache
.DESCRIPTION
    Este script garante que o sistema sempre inicie com a versão mais recente,
    limpando todos os caches (Vite, Node, navegador instruções).
#>

Write-Host "🧹 RENDIZY - Iniciando com limpeza de cache..." -ForegroundColor Cyan
Write-Host ""

# 1. Navegar para o diretório correto
$projectPath = "C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
Set-Location $projectPath
Write-Host "📂 Diretório: $projectPath" -ForegroundColor Green

# 2. Matar processos Node antigos
Write-Host "🔪 Matando processos Node antigos..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>&1 | Out-Null
Start-Sleep -Seconds 1

# 3. Limpar cache do Vite
Write-Host "🗑️  Limpando cache do Vite..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cache do Vite removido" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Sem cache do Vite para limpar" -ForegroundColor Gray
}

# 4. Limpar dist
Write-Host "🗑️  Limpando pasta dist..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Pasta dist removida" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Sem pasta dist para limpar" -ForegroundColor Gray
}

# 5. Aumentar memória do Node
$env:NODE_OPTIONS = "--max-old-space-size=4096"
Write-Host "⚡ Memória Node aumentada: 4GB" -ForegroundColor Green

# 6. Iniciar servidor
Write-Host ""
Write-Host "🚀 Iniciando servidor Vite..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "📋 Após iniciar, faça no navegador:" -ForegroundColor Yellow
Write-Host "   1. Abra http://localhost:3000/" -ForegroundColor White
Write-Host "   2. Pressione Ctrl + Shift + R (hard refresh)" -ForegroundColor White
Write-Host "   3. Ou F12 → Application → Clear Storage → Clear site data" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

npm run dev
