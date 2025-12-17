# Script Manual para Copiar Todos os Arquivos
$ErrorActionPreference = "Continue"

$origem = "C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
$destino = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COPIA MANUAL - PROJETO RENDIZY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar origem
if (-not (Test-Path $origem)) {
    Write-Host "❌ Pasta origem não encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Origem:  $origem" -ForegroundColor Yellow
Write-Host "📁 Destino: $destino" -ForegroundColor Yellow
Write-Host ""

# Criar destino
if (-not (Test-Path $destino)) {
    New-Item -ItemType Directory -Path $destino -Force | Out-Null
    Write-Host "✅ Pasta destino criada" -ForegroundColor Green
}

# Obter todos os itens da origem
Write-Host "📊 Listando arquivos e pastas..." -ForegroundColor Cyan
$itens = Get-ChildItem -Path $origem -Force -ErrorAction SilentlyContinue

Write-Host "   Encontrados $($itens.Count) itens" -ForegroundColor White
Write-Host ""

# Copiar cada item
$copiados = 0
$erros = 0

foreach ($item in $itens) {
    $nome = $item.Name
    $destinoItem = Join-Path $destino $nome
    
    try {
        Write-Host "📋 Copiando: $nome..." -ForegroundColor Gray -NoNewline
        
        if ($item.PSIsContainer) {
            # É uma pasta
            Copy-Item -Path $item.FullName -Destination $destinoItem -Recurse -Force -ErrorAction Stop
        } else {
            # É um arquivo
            Copy-Item -Path $item.FullName -Destination $destinoItem -Force -ErrorAction Stop
        }
        
        Write-Host " ✅" -ForegroundColor Green
        $copiados++
    } catch {
        Write-Host " ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        $erros++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Copiados: $copiados" -ForegroundColor Green
Write-Host "❌ Erros: $erros" -ForegroundColor $(if ($erros -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Verificar arquivos importantes
Write-Host "🔍 Verificando arquivos importantes..." -ForegroundColor Cyan
$arquivosImportantes = @(
    "Ligando os motores.md",
    "RendizyPrincipal",
    "supabase",
    "rendizy.code-workspace"
)

foreach ($arquivo in $arquivosImportantes) {
    $caminho = Join-Path $destino $arquivo
    if (Test-Path $caminho) {
        Write-Host "   ✅ $arquivo" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $arquivo" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Processo concluído!" -ForegroundColor Green
