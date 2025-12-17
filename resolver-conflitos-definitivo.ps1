# Script para resolver TODOS os conflitos de merge de forma definitiva
# Remove todos os marcadores de conflito Git

Write-Host "=== RESOLVENDO CONFLITOS DE MERGE DEFINITIVAMENTE ===" -ForegroundColor Red
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$conflictCount = 0
$fixedCount = 0

# Buscar todos os arquivos com conflitos
Write-Host "Buscando arquivos com conflitos..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $projectPath -Recurse -Include "*.tsx","*.ts","*.jsx","*.js","*.json" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '=======' -or $content -match '>>>>>>>')) {
        $conflictCount++
        Write-Host "  ⚠️  Conflito encontrado: $($file.Name)" -ForegroundColor Yellow
        
        # Remover marcadores de conflito
        $newContent = $content
        
        # Estratégia: Manter a versão HEAD (mais recente) e remover marcadores
        # Remove blocos de conflito mantendo apenas o conteúdo HEAD
        $newContent = $newContent -replace '(?s)<<<<<<< HEAD\r?\n', ''
        $newContent = $newContent -replace '(?s)=======\r?\n.*?>>>>>>> [a-f0-9]+\r?\n', ''
        $newContent = $newContent -replace '(?s)>>>>>>> [a-f0-9]+\r?\n', ''
        $newContent = $newContent -replace '(?s)=======\r?\n', ''
        
        # Se ainda houver marcadores, remove linhas individuais
        $lines = $newContent -split "`r?`n"
        $cleanLines = @()
        $skipUntil = $null
        
        foreach ($line in $lines) {
            if ($line -match '^<<<<<<< HEAD') {
                $skipUntil = '======='
                continue
            }
            if ($line -match '^=======') {
                $skipUntil = '>>>>>>>'
                continue
            }
            if ($line -match '^>>>>>>>') {
                $skipUntil = $null
                continue
            }
            if ($skipUntil) {
                continue
            }
            $cleanLines += $line
        }
        
        $newContent = $cleanLines -join "`n"
        
        # Salvar arquivo limpo
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $fixedCount++
        Write-Host "    ✅ Corrigido!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Arquivos com conflitos encontrados: $conflictCount" -ForegroundColor White
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Green
Write-Host ""

if ($fixedCount -gt 0) {
    Write-Host "✅ Conflitos resolvidos! Agora execute:" -ForegroundColor Green
    Write-Host "   git add ." -ForegroundColor Yellow
    Write-Host "   git commit -m 'fix: resolve merge conflicts'" -ForegroundColor Yellow
} else {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
}
