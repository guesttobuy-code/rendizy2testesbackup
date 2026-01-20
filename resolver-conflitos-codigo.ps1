# Script para resolver conflitos APENAS em arquivos de código (TS/TSX/JS/JSX)
# Ignora arquivos de texto/documentação

Write-Host "=== RESOLVENDO CONFLITOS EM ARQUIVOS DE CÓDIGO ===" -ForegroundColor Red
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$conflictCount = 0
$fixedCount = 0
$errorCount = 0

# Buscar APENAS arquivos de código
Write-Host "Buscando arquivos de código com conflitos..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $projectPath -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*"
}

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop -Encoding UTF8
        if ($content -and ($content -match '^<<<<<<< HEAD' -or $content -match '^=======' -or $content -match '^>>>>>>>')) {
            $conflictCount++
            Write-Host "  ⚠️  [$conflictCount] Conflito em: $($file.Name)" -ForegroundColor Yellow
            
            # Estratégia: Remover marcadores linha por linha
            $lines = $content -split "`r?`n"
            $cleanLines = @()
            $inConflict = $false
            $keepLines = $true
            
            foreach ($line in $lines) {
                # Detectar início de conflito
                if ($line -match '^<<<<<<< HEAD') {
                    $inConflict = $true
                    $keepLines = $true
                    continue
                }
                
                # Detectar separador
                if ($line -match '^=======') {
                    $keepLines = $false
                    continue
                }
                
                # Detectar fim de conflito
                if ($line -match '^>>>>>>>') {
                    $inConflict = $false
                    $keepLines = $true
                    continue
                }
                
                # Se está dentro de conflito
                if ($inConflict) {
                    # Mantém apenas linhas do HEAD
                    if ($keepLines) {
                        $cleanLines += $line
                    }
                } else {
                    # Linha normal, mantém
                    $cleanLines += $line
                }
            }
            
            $newContent = $cleanLines -join "`n"
            
            # Verificação final: remover qualquer marcador que tenha sobrado
            $newContent = $newContent -replace '(?m)^<<<<<<< HEAD.*?\r?\n', ''
            $newContent = $newContent -replace '(?m)^=======.*?\r?\n', ''
            $newContent = $newContent -replace '(?m)^>>>>>>>.*?\r?\n', ''
            
            # Salvar arquivo limpo
            [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
            $fixedCount++
            Write-Host "    ✅ Corrigido!" -ForegroundColor Green
        }
    } catch {
        $errorCount++
        Write-Host "    ❌ Erro ao processar: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Arquivos de código com conflitos: $conflictCount" -ForegroundColor White
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Green
Write-Host "Erros: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fixedCount -gt 0) {
    Write-Host "✅ Conflitos em código resolvidos!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "  1. Execute: .\prevenir-conflitos.ps1 (para verificar)" -ForegroundColor White
    Write-Host "  2. Teste o servidor: npm run dev" -ForegroundColor White
} else {
    Write-Host "✅ Nenhum conflito em código encontrado!" -ForegroundColor Green
}
