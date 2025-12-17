# Script DEFINITIVO para resolver TODOS os conflitos restantes
# Remove TODOS os marcadores de conflito mantendo versão HEAD

Write-Host "=== RESOLVENDO TODOS OS CONFLITOS DEFINITIVAMENTE ===" -ForegroundColor Red
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$conflictCount = 0
$fixedCount = 0

# Buscar TODOS os arquivos de código
$files = Get-ChildItem -Path $projectPath -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*"
}

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        
        if ($content -match '^<<<<<<< HEAD' -or $content -match '^=======' -or $content -match '^>>>>>>>') {
            $conflictCount++
            Write-Host "  [$conflictCount] Resolvendo: $($file.Name)" -ForegroundColor Yellow
            
            # Estratégia: Processar linha por linha
            $lines = $content -split "`r?`n"
            $cleanLines = @()
            $inConflict = $false
            $keepLines = $true
            
            foreach ($line in $lines) {
                if ($line -match '^<<<<<<< HEAD') {
                    $inConflict = $true
                    $keepLines = $true
                    continue
                }
                if ($line -match '^=======') {
                    $keepLines = $false
                    continue
                }
                if ($line -match '^>>>>>>>') {
                    $inConflict = $false
                    $keepLines = $true
                    continue
                }
                
                if ($inConflict) {
                    if ($keepLines) {
                        $cleanLines += $line
                    }
                } else {
                    $cleanLines += $line
                }
            }
            
            $newContent = $cleanLines -join "`n"
            
            # Remover qualquer marcador que tenha sobrado
            $newContent = $newContent -replace '(?m)^<<<<<<< HEAD.*?\r?\n', ''
            $newContent = $newContent -replace '(?m)^=======.*?\r?\n', ''
            $newContent = $newContent -replace '(?m)^>>>>>>>.*?\r?\n', ''
            
            [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
            $fixedCount++
            Write-Host "    ✅ OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "    ❌ Erro: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Conflitos encontrados: $conflictCount" -ForegroundColor White
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Green
Write-Host ""

if ($fixedCount -gt 0) {
    Write-Host "✅ TODOS OS CONFLITOS RESOLVIDOS!" -ForegroundColor Green
} else {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
}
