# Script para verificar e listar arquivos com conflitos de merge
$projectPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"

Write-Host "🔍 Verificando conflitos de merge em: $projectPath" -ForegroundColor Cyan
Write-Host ""

$conflictFiles = Get-ChildItem -Path $projectPath -Recurse -File -Include "*.tsx","*.ts","*.jsx","*.js","*.json" | 
    Where-Object { 
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -match "<<<<<<< HEAD"
    }

if ($conflictFiles) {
    Write-Host "❌ Arquivos com conflitos encontrados:" -ForegroundColor Red
    $conflictFiles | ForEach-Object {
        Write-Host "  - $($_.FullName)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Total: $($conflictFiles.Count) arquivos" -ForegroundColor Red
} else {
    Write-Host "✅ Nenhum conflito encontrado no diretório do projeto!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verificando arquivos críticos:" -ForegroundColor Cyan
$criticalFiles = @("main.tsx", "vite.config.ts", "package.json")

foreach ($file in $criticalFiles) {
    $filePath = Join-Path $projectPath $file
    if (Test-Path $filePath) {
        $hasConflict = Select-String -Path $filePath -Pattern "<<<<<<< HEAD" -Quiet
        if ($hasConflict) {
            Write-Host "  ❌ $file - TEM conflitos" -ForegroundColor Red
        } else {
            Write-Host "  ✅ $file - SEM conflitos" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  $file - Não encontrado" -ForegroundColor Yellow
    }
}
