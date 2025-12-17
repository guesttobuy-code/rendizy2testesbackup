# Script AGRESSIVO para resolver TODOS os conflitos de merge
# Remove TODOS os marcadores de conflito Git de forma definitiva

Write-Host "=== RESOLVENDO TODOS OS CONFLITOS AGRESSIVAMENTE ===" -ForegroundColor Red
Write-Host "⚠️  Este script vai remover TODOS os marcadores de conflito" -ForegroundColor Yellow
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$conflictCount = 0
$fixedCount = 0
$errorCount = 0

# Buscar TODOS os arquivos
Write-Host "Buscando arquivos com conflitos..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $projectPath -Recurse -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*" -and
    ($_.Extension -in @('.tsx', '.ts', '.jsx', '.js', '.json', '.md', '.txt', '.sql', '.ps1', '.sh', '.bat'))
}

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop -Encoding UTF8
        if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '=======' -or $content -match '>>>>>>>')) {
            $conflictCount++
            Write-Host "  ⚠️  [$conflictCount] Conflito em: $($file.Name)" -ForegroundColor Yellow
            
            # Estratégia AGRESSIVA: Remover TODOS os marcadores linha por linha
            $lines = $content -split "`r?`n"
            $cleanLines = @()
            $inConflict = $false
            $keepLines = $true
            
            foreach ($line in $lines) {
                # Detectar início de conflito
                if ($line -match '^<<<<<<< HEAD') {
                    $inConflict = $true
                    $keepLines = $true
                    continue  # Pula a linha do marcador
                }
                
                # Detectar separador
                if ($line -match '^=======') {
                    $keepLines = $false
                    continue  # Pula a linha do marcador
                }
                
                # Detectar fim de conflito
                if ($line -match '^>>>>>>>') {
                    $inConflict = $false
                    $keepLines = $true
                    continue  # Pula a linha do marcador
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
            
            # Verificação final: remover qualquer marcador que tenha sobrado
            $newContent = $newContent -replace '(?m)^<<<<<<< HEAD.*?\n', ''
            $newContent = $newContent -replace '(?m)^=======.*?\n', ''
            $newContent = $newContent -replace '(?m)^>>>>>>>.*?\n', ''
            
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
Write-Host "Arquivos com conflitos encontrados: $conflictCount" -ForegroundColor White
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Green
Write-Host "Erros: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fixedCount -gt 0) {
    Write-Host "✅ Conflitos resolvidos!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Verifique os arquivos antes de commitar!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "  1. Execute: .\prevenir-conflitos.ps1 (para verificar)" -ForegroundColor White
    Write-Host "  2. Teste o servidor: npm run dev" -ForegroundColor White
    Write-Host "  3. Se tudo OK: git add . && git commit -m 'fix: resolve all merge conflicts'" -ForegroundColor White
} else {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
}
