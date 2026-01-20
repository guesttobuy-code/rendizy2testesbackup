# 🛡️ SCRIPT DEFINITIVO - RESOLVE TODOS OS CONFLITOS DE MERGE
# Processa TODOS os arquivos do projeto e remove TODOS os marcadores de conflito
# Mantém sempre a versão HEAD (mais recente)

Write-Host "=== RESOLVENDO TODOS OS CONFLITOS DEFINITIVAMENTE ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL"
$totalConflicts = 0
$filesProcessed = 0
$filesWithConflicts = @()

# Buscar TODOS os arquivos com conflitos
Write-Host "Buscando arquivos com conflitos..." -ForegroundColor Yellow

$files = Get-ChildItem -Path $projectPath -Recurse -Include "*.ts","*.tsx","*.js","*.jsx","*.json","*.md","*.sql" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '^<<<<<<< ')) {
        $filesWithConflicts += $file.FullName
        Write-Host "  📄 Encontrado: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Total de arquivos com conflitos: $($filesWithConflicts.Count)" -ForegroundColor Cyan
Write-Host ""

if ($filesWithConflicts.Count -eq 0) {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
    exit 0
}

# Processar cada arquivo
foreach ($filePath in $filesWithConflicts) {
    Write-Host "Processando: $(Split-Path $filePath -Leaf)..." -ForegroundColor Yellow
    
    $lines = Get-Content $filePath
    $output = @()
    $inConflict = $false
    $keepLines = $true
    $conflictCount = 0
    
    foreach ($line in $lines) {
        # Detectar início de conflito
        if ($line -match '^<<<<<<< HEAD' -or $line -match '^<<<<<<< ') {
            $inConflict = $true
            $keepLines = $true
            $conflictCount++
            continue
        }
        
        # Detectar separador (descartar tudo até aqui se não for HEAD)
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
        
        # Se está em conflito, manter apenas se for HEAD
        if ($inConflict) {
            if ($keepLines) {
                $output += $line
            }
        } else {
            $output += $line
        }
    }
    
    $totalConflicts += $conflictCount
    
    # Salvar arquivo resolvido
    $output | Set-Content -Path $filePath -Encoding UTF8
    
    Write-Host "  ✅ Resolvidos $conflictCount conflitos" -ForegroundColor Green
    $filesProcessed++
}

Write-Host ""
Write-Host "=== LIMPEZA FINAL ===" -ForegroundColor Cyan

# Limpeza final agressiva em todos os arquivos
foreach ($filePath in $filesWithConflicts) {
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    if ($content) {
        # Remover TODOS os marcadores de conflito
        $content = $content -replace '(?s)<<<<<<< HEAD\r?\n', ''
        $content = $content -replace '(?s)<<<<<<< [^\r\n]+\r?\n', ''
        $content = $content -replace '(?s)=======\r?\n', ''
        $content = $content -replace '(?s)>>>>>>> [^\r\n]+\r?\n', ''
        # Remover linhas vazias múltiplas
        $content = $content -replace '(\r?\n){3,}', "`r`n`r`n"
        
        Set-Content -Path $filePath -Value $content -NoNewline -Encoding UTF8
    }
}

Write-Host ""
Write-Host "=== VERIFICAÇÃO FINAL ===" -ForegroundColor Cyan

# Verificar se ainda há conflitos
$remainingConflicts = 0
$remainingFiles = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '^<<<<<<< ' -or $content -match '=======' -or $content -match '>>>>>>>')) {
        $remainingConflicts++
        $remainingFiles += $file.FullName
    }
}

Write-Host ""
if ($remainingConflicts -eq 0) {
    Write-Host "✅ SUCESSO! TODOS OS CONFLITOS FORAM RESOLVIDOS!" -ForegroundColor Green
    Write-Host "   Arquivos processados: $filesProcessed" -ForegroundColor Green
    Write-Host "   Conflitos resolvidos: $totalConflicts" -ForegroundColor Green
} else {
    Write-Host "⚠️  Ainda há $remainingConflicts conflitos em:" -ForegroundColor Yellow
    foreach ($file in $remainingFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Execute novamente este script ou resolva manualmente." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Processo concluído com sucesso!" -ForegroundColor Green
