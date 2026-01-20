# ============================================================================
# CRIAR ZIP COMPLETO PARA GITHUB
# ============================================================================
# Cria um ZIP completo do projeto para push no GitHub
# Exclui node_modules, .git, dist, build, etc.
# ============================================================================

Write-Host "CRIANDO ZIP COMPLETO PARA GITHUB" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location
$outputFolder = "$env:USERPROFILE\Downloads"
$zipName = "Rendizy2producao-COMPLETO-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
$zipPath = Join-Path $outputFolder $zipName

Write-Host "Pasta do projeto: $projectRoot" -ForegroundColor Yellow
Write-Host "Destino: $zipPath" -ForegroundColor Yellow
Write-Host ""

# Padrões a excluir
$excludePatterns = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".vscode",
    ".idea",
    "*.log",
    ".env.local",
    ".env.production",
    ".DS_Store",
    "Thumbs.db"
)

Write-Host "Coletando arquivos (excluindo node_modules, .git, etc.)..." -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path $projectRoot -Recurse -File | Where-Object {
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.FullName -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    return -not $shouldExclude
}

$fileCount = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "   Total de arquivos: $fileCount" -ForegroundColor Cyan
Write-Host "   Tamanho total: $totalSizeMB MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "Criando ZIP..." -ForegroundColor Yellow
Write-Host "   Aguarde, isso pode levar alguns segundos..." -ForegroundColor DarkGray
Write-Host ""

try {
    # Remove ZIP antigo se existir
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    # Cria ZIP
    $files | Compress-Archive -DestinationPath $zipPath -Force -CompressionLevel Optimal

    Write-Host "OK: ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host ""

    # Informações do ZIP
    $zipInfo = Get-Item $zipPath
    $zipSizeMB = [math]::Round($zipInfo.Length / 1MB, 2)
    $currentDate = Get-Date -Format "dd/MM/yyyy HH:mm:ss"

    Write-Host "================================================" -ForegroundColor Green
    Write-Host "ZIP COMPLETO CRIADO!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Nome: $zipName" -ForegroundColor Cyan
    Write-Host "   Caminho: $zipPath" -ForegroundColor Cyan
    Write-Host "   Tamanho: $zipSizeMB MB" -ForegroundColor Cyan
    Write-Host "   Arquivos: $fileCount" -ForegroundColor Cyan
    Write-Host "   Data: $currentDate" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Extrair o ZIP" -ForegroundColor White
    Write-Host "2. Fazer push para GitHub:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m 'fix: corrigir prefixo /rendizy-server em todas as rotas'" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Deploy no Vercel (frontend)" -ForegroundColor White
    Write-Host "4. Deploy no Supabase (backend já feito)" -ForegroundColor White
    Write-Host ""

    # Perguntar se quer abrir a pasta
    $openFolder = Read-Host "Deseja abrir a pasta Downloads? (s/n)"
    if ($openFolder -eq "s" -or $openFolder -eq "S") {
        Start-Process "explorer.exe" -ArgumentList $outputFolder
    }

} catch {
    Write-Host ""
    Write-Host "ERRO: Erro ao criar ZIP!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pronto para push no GitHub!" -ForegroundColor Green
Write-Host ""

