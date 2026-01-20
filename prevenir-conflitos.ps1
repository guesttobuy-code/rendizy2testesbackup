# Script de PREVENÇÃO de conflitos de merge
# Verifica e bloqueia commits com conflitos

Write-Host "=== VERIFICAÇÃO DE CONFLITOS ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$hasConflicts = $false
$conflictFiles = @()

# Buscar todos os arquivos com conflitos
$files = Get-ChildItem -Path $projectPath -Recurse -Include "*.tsx","*.ts","*.jsx","*.js","*.json","*.md" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '=======' -or $content -match '>>>>>>>')) {
        $hasConflicts = $true
        $conflictFiles += $file.FullName
        Write-Host "  ❌ CONFLITO ENCONTRADO: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host ""

if ($hasConflicts) {
    Write-Host "🚨 ERRO: CONFLITOS DE MERGE DETECTADOS!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Arquivos com conflitos:" -ForegroundColor Yellow
    foreach ($file in $conflictFiles) {
        Write-Host "  - $file" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "⚠️  NÃO É POSSÍVEL FAZER COMMIT COM CONFLITOS!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute para corrigir:" -ForegroundColor Cyan
    Write-Host "  .\resolver-conflitos-definitivo.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ Nenhum conflito encontrado. Pode fazer commit!" -ForegroundColor Green
    exit 0
}
