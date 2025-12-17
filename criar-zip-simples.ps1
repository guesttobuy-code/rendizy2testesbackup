# Script SIMPLES para criar ZIP do código para GitHub
# Versão simplificada e mais robusta

Write-Host "Criando ZIP do codigo para GitHub..." -ForegroundColor Cyan

# Diretório atual
$rootDir = Get-Location
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "rendizy-codigo-github-$timestamp.zip"
$zipPath = Join-Path $rootDir $zipName

Write-Host "Arquivo: $zipName" -ForegroundColor Yellow

# Criar diretório temporário para arquivos selecionados
$tempDir = Join-Path $env:TEMP "zip-temp-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Copiar arquivos importantes, excluindo o que não precisa
    Write-Host "Copiando arquivos..." -ForegroundColor Yellow
    
    # Copiar tudo exceto as pastas/arquivos que não queremos
    Get-ChildItem -Path $rootDir -File | Where-Object {
        $name = $_.Name
        # Excluir arquivos específicos
        $name -notlike "*.zip" -and
        $name -notlike "*.log" -and
        $name -notlike "*.tmp" -and
        $name -notlike "*.backup" -and
        $name -ne "package-lock.json" -and
        $name -ne "rendizy-token.txt" -and
        $name -notlike "criar-zip*.ps1" -and
        $name -notlike "deploy-*.ps1" -and
        $name -notlike "configurar-*.ps1"
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $tempDir -Force
    }
    
    # Copiar pastas importantes
    $foldersToInclude = @("src", "public", "supabase", "scripts", "components", "pages", "hooks", "utils", "types", "styles")
    
    foreach ($folder in $foldersToInclude) {
        $folderPath = Join-Path $rootDir $folder
        if (Test-Path $folderPath) {
            $destPath = Join-Path $tempDir $folder
            Copy-Item -Path $folderPath -Destination $destPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Copiar arquivos de configuração importantes
    $configFiles = @("package.json", "vite.config.ts", "vite.config.js", "tsconfig.json", "tailwind.config.js", "tsconfig.json", ".gitignore", "README.md", "index.html")
    
    foreach ($configFile in $configFiles) {
        $configPath = Join-Path $rootDir $configFile
        if (Test-Path $configPath) {
            Copy-Item -Path $configPath -Destination $tempDir -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Copiar todas as pastas que não são node_modules, build, dist, .git, etc
    Get-ChildItem -Path $rootDir -Directory | Where-Object {
        $name = $_.Name
        $name -ne "node_modules" -and
        $name -ne "build" -and
        $name -ne "dist" -and
        $name -ne ".git" -and
        $name -ne ".vite" -and
        $name -ne ".supabase" -and
        $name -ne "Rendizy2producao" -and
        $name -ne "RendizyPrincipal" -and
        $name -notlike "rendizy-*.zip" -and
        $name -notlike "frontend_*.zip"
    } | ForEach-Object {
        $destPath = Join-Path $tempDir $_.Name
        if (-not (Test-Path $destPath)) {
            Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "Criando ZIP..." -ForegroundColor Yellow
    
    # Criar ZIP usando Compress-Archive (método mais simples e confiável)
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    
    # Limpar diretório temporário
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    
    $sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Arquivo: $zipName" -ForegroundColor Cyan
    Write-Host "Tamanho: $sizeMB MB" -ForegroundColor Cyan
    Write-Host "Local: $zipPath" -ForegroundColor Yellow
    Write-Host "`nPronto para push no GitHub!" -ForegroundColor Green
    
} catch {
    Write-Host "`nERRO: $_" -ForegroundColor Red
    Write-Host "Detalhes: $($_.Exception.Message)" -ForegroundColor Red
    
    # Limpar em caso de erro
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    exit 1
}










