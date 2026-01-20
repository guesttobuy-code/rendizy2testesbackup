# Script DEFINITIVO para resolver TODOS os conflitos de merge
# Remove TODOS os marcadores de conflito Git mantendo a versão HEAD

Write-Host "=== RESOLVENDO TODOS OS CONFLITOS DEFINITIVAMENTE ===" -ForegroundColor Red
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
    $_.FullName -notlike "*build*"
}

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '=======' -or $content -match '>>>>>>>')) {
            $conflictCount++
            Write-Host "  ⚠️  [$conflictCount] Conflito em: $($file.Name)" -ForegroundColor Yellow
            
            # Estratégia: Remover TODOS os marcadores de conflito
            # Mantém apenas o conteúdo HEAD (antes de =======)
            
            # Remove blocos completos de conflito
            $newContent = $content
            
            # Padrão 1: <<<<<<< HEAD ... ======= ... >>>>>>>
            $newContent = $newContent -replace '(?s)<<<<<<< HEAD\r?\n(.*?)\r?\n=======\r?\n.*?\r?\n>>>>>>> [a-f0-9]+\r?\n', '$1'
            
            # Padrão 2: Linhas individuais de marcadores
            $lines = $newContent -split "`r?`n"
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
            
            # Verificar se ainda há marcadores
            if ($newContent -match '<<<<<<< HEAD' -or $newContent -match '=======' -or $newContent -match '>>>>>>>') {
                # Tentativa mais agressiva: remover linhas com marcadores
                $lines = $newContent -split "`r?`n"
                $finalLines = @()
                foreach ($line in $lines) {
                    if ($line -notmatch '^<<<<<<< HEAD' -and 
                        $line -notmatch '^=======' -and 
                        $line -notmatch '^>>>>>>>') {
                        $finalLines += $line
                    }
                }
                $newContent = $finalLines -join "`n"
            }
            
            # Salvar arquivo limpo
            Set-Content -Path $file.FullName -Value $newContent -NoNewline -ErrorAction Stop
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
