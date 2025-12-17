# 🧹 LIMPAR CONFLITOS USANDO BACKUP
# Usa backup limpo de 24/11 para limpar conflitos, preservando progresso de hoje

param(
    [switch]$DryRun = $false  # Se true, apenas mostra o que faria sem fazer
)

$backupPath = "C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
$currentPath = "C:\dev\RENDIZY PASTA OFICIAL"

Write-Host "`n=== LIMPEZA DE CONFLITOS USANDO BACKUP ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $backupPath)) {
    Write-Host "❌ ERRO: Backup não encontrado em: $backupPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $currentPath)) {
    Write-Host "❌ ERRO: Pasta atual não encontrada: $currentPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Backup: $backupPath" -ForegroundColor Gray
Write-Host "📁 Atual:  $currentPath" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 MODO DRY-RUN: Apenas mostrando o que faria (não vai modificar arquivos)" -ForegroundColor Yellow
    Write-Host ""
}

# Encontrar todos os arquivos com conflitos no atual
Write-Host "🔍 Buscando arquivos com conflitos..." -ForegroundColor Cyan
$filesWithConflicts = @()

Get-ChildItem -Path $currentPath -Recurse -Include '*.ts','*.tsx','*.md','*.ps1','*.py' -File | 
    Where-Object { 
        $_.FullName -notlike '*node_modules*' -and 
        $_.FullName -notlike '*\.git*' -and
        $_.FullName -notlike '*dist*' -and
        $_.FullName -notlike '*build*'
    } | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and ($content -match '^<<<<<<< HEAD')) {
            $relativePath = $_.FullName.Replace($currentPath + '\', '').Replace($currentPath + '/', '')
            $filesWithConflicts += @{
                FullPath = $_.FullName
                RelativePath = $relativePath
            }
        }
    }

Write-Host "✅ Encontrados $($filesWithConflicts.Count) arquivos com conflitos" -ForegroundColor Green
Write-Host ""

if ($filesWithConflicts.Count -eq 0) {
    Write-Host "✅ Nenhum conflito encontrado! Tudo limpo." -ForegroundColor Green
    exit 0
}

# Analisar cada arquivo
$canCopyFromBackup = @()
$needManualResolution = @()
$notInBackup = @()

Write-Host "📊 Analisando arquivos..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $filesWithConflicts) {
    $backupFile = Join-Path $backupPath $file.RelativePath
    $currentFile = $file.FullPath
    
    if (-not (Test-Path $backupFile)) {
        $notInBackup += $file
        Write-Host "  ⚠️  $($file.RelativePath) - Não existe no backup" -ForegroundColor Yellow
        continue
    }
    
    # Ler conteúdo
    $backupContent = Get-Content $backupFile -Raw -ErrorAction SilentlyContinue
    $currentContent = Get-Content $currentFile -Raw -ErrorAction SilentlyContinue
    
    # Verificar se backup tem conflitos
    if ($backupContent -match '^<<<<<<< HEAD') {
        $needManualResolution += $file
        Write-Host "  ⚠️  $($file.RelativePath) - Backup também tem conflito" -ForegroundColor Yellow
        continue
    }
    
    # Limpar conflitos do atual para comparar
    $currentClean = $currentContent -replace '(?s)<<<<<<< HEAD.*?>>>>>>> [^\n]+\n', '' -replace '=======\n', ''
    
    # Comparar conteúdo limpo
    $backupTrim = $backupContent.Trim()
    $currentTrim = $currentClean.Trim()
    
    if ($backupTrim -eq $currentTrim) {
        $canCopyFromBackup += $file
        Write-Host "  ✅ $($file.RelativePath) - Idêntico, pode copiar do backup" -ForegroundColor Green
    } else {
        $needManualResolution += $file
        Write-Host "  ⚠️  $($file.RelativePath) - Diferente, precisa análise manual" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "  ✅ Pode copiar do backup: $($canCopyFromBackup.Count)" -ForegroundColor Green
Write-Host "  ⚠️  Precisa resolução manual: $($needManualResolution.Count)" -ForegroundColor Yellow
Write-Host "  ❌ Não existe no backup: $($notInBackup.Count)" -ForegroundColor Red
Write-Host ""

if ($canCopyFromBackup.Count -eq 0) {
    Write-Host "⚠️  Nenhum arquivo pode ser copiado automaticamente do backup." -ForegroundColor Yellow
    Write-Host "   Todos precisam de resolução manual." -ForegroundColor Yellow
    exit 0
}

# Copiar arquivos do backup
if (-not $DryRun) {
    Write-Host "📋 Copiando arquivos do backup..." -ForegroundColor Cyan
    Write-Host ""
    
    $copied = 0
    $errors = 0
    
    foreach ($file in $canCopyFromBackup) {
        $backupFile = Join-Path $backupPath $file.RelativePath
        $currentFile = $file.FullPath
        
        try {
            # Criar diretório se não existir
            $dir = Split-Path $currentFile -Parent
            if (-not (Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
            }
            
            # Copiar arquivo
            Copy-Item -Path $backupFile -Destination $currentFile -Force
            Write-Host "  ✅ Copiado: $($file.RelativePath)" -ForegroundColor Green
            $copied++
        } catch {
            Write-Host "  ❌ Erro ao copiar $($file.RelativePath): $_" -ForegroundColor Red
            $errors++
        }
    }
    
    Write-Host ""
    Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
    Write-Host "  ✅ Copiados: $copied" -ForegroundColor Green
    if ($errors -gt 0) {
        Write-Host "  ❌ Erros: $errors" -ForegroundColor Red
    }
    Write-Host ""
    
    if ($needManualResolution.Count -gt 0) {
        Write-Host "⚠️  Ainda há $($needManualResolution.Count) arquivos que precisam resolução manual:" -ForegroundColor Yellow
        foreach ($file in $needManualResolution) {
            Write-Host "    - $($file.RelativePath)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo passo: Verificar se está tudo limpo:" -ForegroundColor Cyan
    Write-Host "  .\verificar-antes-deploy.ps1" -ForegroundColor White
} else {
    Write-Host "🔍 DRY-RUN: Seriam copiados $($canCopyFromBackup.Count) arquivos:" -ForegroundColor Yellow
    foreach ($file in $canCopyFromBackup) {
        Write-Host "    - $($file.RelativePath)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Para executar de verdade, rode sem -DryRun:" -ForegroundColor Cyan
    Write-Host "  .\limpar-conflitos-usando-backup.ps1" -ForegroundColor White
}
