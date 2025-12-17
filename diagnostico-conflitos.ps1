# Diagnóstico completo da causa raiz dos conflitos
Write-Host "=== DIAGNÓSTICO: CAUSA RAIZ DOS CONFLITOS ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"

# 1. Verificar se o arquivo no disco tem conflitos
Write-Host "1. Verificando main.tsx no disco:" -ForegroundColor Yellow
$mainTsxPath = Join-Path $projectPath "main.tsx"
if (Test-Path $mainTsxPath) {
    $content = Get-Content $mainTsxPath -Raw
    if ($content -match "<<<<<<< HEAD") {
        Write-Host "   ❌ TEM conflitos no disco" -ForegroundColor Red
    } else {
        Write-Host "   ✅ SEM conflitos no disco" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Arquivo não encontrado" -ForegroundColor Yellow
}

# 2. Verificar OneDrive
Write-Host ""
Write-Host "2. Verificando OneDrive:" -ForegroundColor Yellow
$onedrive = Get-Process -Name "OneDrive*" -ErrorAction SilentlyContinue
if ($onedrive) {
    Write-Host "   ⚠️  OneDrive está rodando" -ForegroundColor Yellow
    Write-Host "   ⚠️  CAUSA PROVÁVEL: OneDrive pode estar sincronizando versões antigas" -ForegroundColor Red
    Write-Host "   💡 SOLUÇÃO: Pausar sincronização do OneDrive para esta pasta" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ OneDrive não está rodando" -ForegroundColor Green
}

# 3. Verificar múltiplos workspaces
Write-Host ""
Write-Host "3. Verificando workspaces:" -ForegroundColor Yellow
$backupPath = "C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
if (Test-Path $backupPath) {
    Write-Host "   ⚠️  Existe um diretório BACKUP" -ForegroundColor Yellow
    Write-Host "   ⚠️  CAUSA PROVÁVEL: Cursor pode estar mostrando arquivos do BACKUP" -ForegroundColor Red
    Write-Host "   💡 SOLUÇÃO: Fechar workspace do BACKUP no Cursor" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ Nenhum diretório BACKUP encontrado" -ForegroundColor Green
}

# 4. Verificar cache do Vite
Write-Host ""
Write-Host "4. Verificando cache do Vite:" -ForegroundColor Yellow
$viteCache = Join-Path $projectPath "node_modules\.vite"
if (Test-Path $viteCache) {
    Write-Host "   ⚠️  Cache do Vite existe" -ForegroundColor Yellow
    Write-Host "   💡 SOLUÇÃO: Limpar cache com 'rm -rf node_modules/.vite'" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ Cache do Vite não encontrado" -ForegroundColor Green
}

# 5. Verificar se há múltiplas versões do arquivo
Write-Host ""
Write-Host "5. Procurando múltiplas versões de main.tsx:" -ForegroundColor Yellow
$allMainTsx = Get-ChildItem -Path "C:\Users\rafae" -Recurse -Filter "main.tsx" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -like "*RENDIZY*" -or $_.FullName -like "*rendizy*" }
if ($allMainTsx.Count -gt 1) {
    Write-Host "   ⚠️  Encontrados $($allMainTsx.Count) arquivos main.tsx:" -ForegroundColor Yellow
    $allMainTsx | ForEach-Object {
        Write-Host "      - $($_.FullName)" -ForegroundColor White
    }
    Write-Host "   ⚠️  CAUSA PROVÁVEL: Múltiplas cópias do projeto" -ForegroundColor Red
} else {
    Write-Host "   ✅ Apenas uma versão encontrada" -ForegroundColor Green
}

# 6. Resumo e recomendações
Write-Host ""
Write-Host "=== RESUMO E RECOMENDAÇÕES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "CAUSA RAIZ MAIS PROVÁVEL:" -ForegroundColor Yellow
Write-Host "  O OneDrive está sincronizando e pode estar restaurando versões antigas" -ForegroundColor White
Write-Host "  dos arquivos que tinham conflitos de merge do Git." -ForegroundColor White
Write-Host ""
Write-Host "SOLUÇÕES:" -ForegroundColor Yellow
Write-Host "  1. Pausar sincronização do OneDrive para esta pasta" -ForegroundColor Cyan
Write-Host "  2. Mover o projeto para fora do OneDrive (ex: C:\dev\RENDIZY)" -ForegroundColor Cyan
Write-Host "  3. Adicionar .git ao ignore do OneDrive" -ForegroundColor Cyan
Write-Host "  4. Limpar cache do Vite: rm -rf node_modules/.vite" -ForegroundColor Cyan
Write-Host "  5. Fechar todos os workspaces do Cursor exceto o principal" -ForegroundColor Cyan
