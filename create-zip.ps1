# Script para criar ZIP do projeto excluindo arquivos do .gitignore
$zipName = "Rendizy2producao-main_2025-11-19.zip"
$source = Get-Location

# Remover ZIP anterior se existir
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}

Write-Host "📦 Criando ZIP excluindo arquivos desnecessários..." -ForegroundColor Cyan

# Lista de padrões a excluir (baseado no .gitignore)
$excludePatterns = @(
    "node_modules",
    ".pnp",
    ".pnp.js",
    "coverage",
    "*.log",
    "build",
    "dist",
    ".vite",
    ".env*",
    ".vscode",
    ".idea",
    "*.swp",
    "*.swo",
    "*~",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".supabase",
    "supabase\.temp",
    "logs",
    ".cache",
    ".parcel-cache",
    ".eslintcache",
    ".stylelintcache",
    "*.tmp",
    "*.temp",
    ".tmp",
    ".temp",
    "*.tsbuildinfo",
    ".next",
    "out",
    ".local",
    ".localhost",
    ".git"
)

# Obter todos os arquivos e pastas
$files = Get-ChildItem -Path $source -Recurse -Force | Where-Object {
    $item = $_
    $shouldInclude = $true
    
    foreach ($pattern in $excludePatterns) {
        # Verificar se o caminho completo corresponde ao padrão
        if ($item.FullName -match $pattern -or $item.Name -like $pattern) {
            $shouldInclude = $false
            break
        }
    }
    
    $shouldInclude
}

# Criar ZIP
$files | Compress-Archive -DestinationPath $zipName -Force

$size = (Get-Item $zipName).Length / 1MB
Write-Host "✅ ZIP criado: $zipName" -ForegroundColor Green
Write-Host "   Tamanho: $([math]::Round($size, 2)) MB" -ForegroundColor Green
Write-Host "   Arquivos incluídos: $($files.Count)" -ForegroundColor Green

