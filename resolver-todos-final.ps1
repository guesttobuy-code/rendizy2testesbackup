# Script FINAL para resolver TODOS os conflitos restantes
# Processa cada arquivo individualmente de forma mais robusta

Write-Host "=== RESOLVENDO TODOS OS CONFLITOS FINAIS ===" -ForegroundColor Red
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$files = Get-ChildItem -Path $projectPath -Recurse -Include "*.tsx","*.ts" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*"
}

$conflictCount = 0
$fixedCount = 0

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        
        if ($content -match '^<<<<<<< HEAD' -or $content -match '^=======' -or $content -match '^>>>>>>>') {
            $conflictCount++
            Write-Host "  [$conflictCount] Resolvendo: $($file.Name)" -ForegroundColor Yellow
            
            # Processar linha por linha de forma mais cuidadosa
            $lines = $content -split "`r?`n"
            $cleanLines = @()
            $inConflict = $false
            $keepLines = $true
            
            foreach ($line in $lines) {
                # Detectar início de conflito
                if ($line -match '^<<<<<<< HEAD') {
                    $inConflict = $true
                    $keepLines = $true
                    # Não adiciona esta linha
                    continue
                }
                
                # Detectar separador
                if ($line -match '^=======') {
                    $keepLines = $false
                    # Não adiciona esta linha
                    continue
                }
                
                # Detectar fim de conflito
                if ($line -match '^>>>>>>>') {
                    $inConflict = $false
                    $keepLines = $true
                    # Não adiciona esta linha
                    continue
                }
                
                # Se está dentro de conflito
                if ($inConflict) {
                    # Mantém apenas linhas do HEAD (antes do =======)
                    if ($keepLines) {
                        $cleanLines += $line
                    }
                    # Ignora linhas após ======= (versão incoming)
                } else {
                    # Linha normal, mantém
                    $cleanLines += $line
                }
            }
            
            $newContent = $cleanLines -join "`n"
            
            # Limpeza final: remover qualquer marcador que tenha sobrado
            $newContent = $newContent -replace '(?m)^<<<<<<< HEAD.*?\r?\n', ''
            $newContent = $newContent -replace '(?m)^=======.*?\r?\n', ''
            $newContent = $newContent -replace '(?m)^>>>>>>>.*?\r?\n', ''
            
            # Salvar arquivo limpo
            [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
            $fixedCount++
            Write-Host "    ✅ OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "    ❌ Erro em $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Conflitos encontrados: $conflictCount" -ForegroundColor White
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Green
Write-Host ""

if ($fixedCount -gt 0) {
    Write-Host "✅ TODOS OS CONFLITOS RESOLVIDOS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo passo: Execute .\prevenir-conflitos.ps1 para verificar" -ForegroundColor Cyan
} else {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
}
