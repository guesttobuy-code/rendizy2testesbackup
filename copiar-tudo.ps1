# Script para Copiar Todos os Arquivos do Rendizy
$origem = "C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
$destino = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COPIA COMPLETA - PROJETO RENDIZY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar origem
if (-not (Test-Path $origem)) {
    Write-Host "❌ Pasta origem não encontrada: $origem" -ForegroundColor Red
    exit 1
}

# Criar destino se não existir
if (-not (Test-Path $destino)) {
    New-Item -ItemType Directory -Path $destino -Force | Out-Null
    Write-Host "✅ Pasta destino criada: $destino" -ForegroundColor Green
}

Write-Host "📁 Origem:  $origem" -ForegroundColor Yellow
Write-Host "📁 Destino: $destino" -ForegroundColor Yellow
Write-Host ""

# Contar arquivos na origem
Write-Host "📊 Contando arquivos na origem..." -ForegroundColor Cyan
$origemFiles = Get-ChildItem -Path $origem -Recurse -File -ErrorAction SilentlyContinue
$origemCount = ($origemFiles | Measure-Object).Count
Write-Host "   Total de arquivos: $origemCount" -ForegroundColor White
Write-Host ""

# Copiar usando robocopy
Write-Host "🚀 Iniciando cópia com robocopy..." -ForegroundColor Cyan
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Gray
Write-Host ""

$robocopyArgs = @(
    "`"$origem`""
    "`"$destino`""
    "/E"           # Incluir subdiretórios vazios
    "/COPYALL"     # Copiar todos os atributos
    "/R:3"         # 3 tentativas em caso de erro
    "/W:5"         # Esperar 5 segundos entre tentativas
    "/MT:8"        # 8 threads para velocidade
    "/V"           # Modo verbose
    "/NP"          # Não mostrar progresso percentual
    "/NFL"         # Não listar arquivos
    "/NDL"         # Não listar diretórios
)

$result = & robocopy @robocopyArgs

Write-Host ""
Write-Host "✅ Cópia concluída!" -ForegroundColor Green
Write-Host ""

# Verificar resultado
Write-Host "📊 Verificando resultado..." -ForegroundColor Cyan
$destinoFiles = Get-ChildItem -Path $destino -Recurse -File -ErrorAction SilentlyContinue
$destinoCount = ($destinoFiles | Measure-Object).Count
Write-Host "   Arquivos copiados: $destinoCount" -ForegroundColor White
Write-Host ""

# Verificar arquivos importantes
Write-Host "🔍 Verificando arquivos importantes..." -ForegroundColor Cyan
$arquivosImportantes = @(
    "Ligando os motores.md",
    "RendizyPrincipal",
    "supabase",
    "rendizy.code-workspace"
)

$todosEncontrados = $true
foreach ($arquivo in $arquivosImportantes) {
    $caminho = Join-Path $destino $arquivo
    if (Test-Path $caminho) {
        Write-Host "   ✅ $arquivo" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $arquivo (NÃO ENCONTRADO)" -ForegroundColor Red
        $todosEncontrados = $false
    }
}

Write-Host ""
if ($todosEncontrados) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ COPIA COMPLETA E VERIFICADA!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  ⚠️  COPIA CONCLUÍDA COM AVISOS" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Verificar se todos os arquivos foram copiados" -ForegroundColor White
Write-Host "   2. Configurar Git e Supabase na nova localização" -ForegroundColor White
Write-Host "   3. Abrir workspace no Cursor" -ForegroundColor White
Write-Host ""
