# Script DEFINITIVO v2 - Resolve TODOS os conflitos mantendo HEAD
# Processa linha por linha para garantir resolução completa

Write-Host "=== RESOLVENDO CONFLITOS DEFINITIVAMENTE v2 ===" -ForegroundColor Cyan
Write-Host ""

$filePath = "C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-organizations.ts"

if (-not (Test-Path $filePath)) {
    Write-Host "❌ Arquivo não encontrado: $filePath" -ForegroundColor Red
    exit 1
}

Write-Host "Lendo arquivo..." -ForegroundColor Yellow
$lines = Get-Content $filePath

$output = @()
$inConflict = $false
$keepLines = $true
$conflictCount = 0

foreach ($line in $lines) {
    if ($line -match '^<<<<<<< HEAD') {
        $inConflict = $true
        $keepLines = $true
        $conflictCount++
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
            $output += $line
        }
    } else {
        $output += $line
    }
}

Write-Host "Encontrados $conflictCount conflitos" -ForegroundColor Yellow
Write-Host "Salvando arquivo resolvido..." -ForegroundColor Yellow

$output | Set-Content -Path $filePath

Write-Host ""
Write-Host "✅ Conflitos resolvidos!" -ForegroundColor Green

# Verificar se ainda há conflitos
$finalContent = Get-Content $filePath -Raw
$remaining = ([regex]::Matches($finalContent, '<<<<<<< HEAD|=======|>>>>>>>')).Count

if ($remaining -gt 0) {
    Write-Host "⚠️  Ainda há $remaining conflitos. Executando limpeza final..." -ForegroundColor Yellow
    
    # Limpeza final agressiva
    $finalContent = $finalContent -replace '(?s)<<<<<<< HEAD\r?\n', ''
    $finalContent = $finalContent -replace '(?s)=======\r?\n', ''
    $finalContent = $finalContent -replace '(?s)>>>>>>> [^\r\n]+\r?\n', ''
    $finalContent = $finalContent -replace '(\r?\n){3,}', "`r`n`r`n"
    
    Set-Content -Path $filePath -Value $finalContent -NoNewline
    
    Write-Host "✅ Limpeza final concluída!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verificando resultado final..." -ForegroundColor Cyan
$verify = Get-Content $filePath -Raw
$finalRemaining = ([regex]::Matches($verify, '<<<<<<< HEAD|=======|>>>>>>>')).Count

if ($finalRemaining -eq 0) {
    Write-Host "✅ NENHUM CONFLITO RESTANTE!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Ainda há $finalRemaining conflitos. Resolva manualmente." -ForegroundColor Red
}
