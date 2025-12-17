# ============================================================================
# Script: Mover Pasta Rendizy para Local Organizado
# ============================================================================
# Este script move a pasta do Rendizy do Downloads para um local organizado
# e atualiza as referências necessárias (Git, Supabase, etc.)
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Destino = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   MOVER PASTA RENDIZY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Caminho atual
$origem = "C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
$nomePasta = ""  # Usar o destino diretamente, sem subpasta

# Verificar se pasta de origem existe
if (-not (Test-Path $origem)) {
    Write-Host "❌ Pasta de origem não encontrada: $origem" -ForegroundColor Red
    exit 1
}

# Criar pasta de destino se não existir
if (-not (Test-Path $Destino)) {
    Write-Host "📁 Criando pasta de destino: $Destino" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

# Se nomePasta estiver vazio, usar destino diretamente
if ([string]::IsNullOrEmpty($nomePasta)) {
    $destinoCompleto = $Destino
} else {
    $destinoCompleto = Join-Path $Destino $nomePasta
}

# Verificar se pasta de destino já existe
if (Test-Path $destinoCompleto) {
    Write-Host "⚠️  Pasta de destino já existe: $destinoCompleto" -ForegroundColor Yellow
    $resposta = Read-Host "Deseja sobrescrever? (S/N)"
    if ($resposta -ne "S" -and $resposta -ne "s") {
        Write-Host "❌ Operação cancelada" -ForegroundColor Red
        exit 0
    }
    Write-Host "🗑️  Removendo pasta existente..." -ForegroundColor Yellow
    Remove-Item -Path $destinoCompleto -Recurse -Force
}

Write-Host ""
Write-Host "📋 RESUMO DA OPERAÇÃO:" -ForegroundColor Cyan
Write-Host "   Origem:  $origem" -ForegroundColor White
Write-Host "   Destino: $destinoCompleto" -ForegroundColor White
Write-Host ""

$confirmar = Read-Host "Confirma a movimentação? (S/N)"
if ($confirmar -ne "S" -and $confirmar -ne "s") {
    Write-Host "❌ Operação cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Iniciando movimentação..." -ForegroundColor Yellow
Write-Host "   Isso pode levar alguns minutos dependendo do tamanho..." -ForegroundColor Gray

# Mover pasta
try {
    Move-Item -Path $origem -Destination $destinoCompleto -Force
    Write-Host "✅ Pasta movida com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao mover pasta: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Verificando configurações..." -ForegroundColor Yellow

# Verificar Git
$gitConfig = Join-Path $destinoCompleto ".git\config"
if (Test-Path $gitConfig) {
    Write-Host "   ✅ Git config encontrado" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Git config não encontrado" -ForegroundColor Yellow
}

# Verificar Supabase
$supabaseConfig = Join-Path $destinoCompleto ".supabase\config.toml"
if (Test-Path $supabaseConfig) {
    Write-Host "   ✅ Supabase config encontrado" -ForegroundColor Green
    Write-Host "   ⚠️  Você precisará relinkar o Supabase:" -ForegroundColor Yellow
    Write-Host "      cd `"$destinoCompleto`"" -ForegroundColor Gray
    Write-Host "      npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Supabase config não encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ MOVIMENTAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Nova localização:" -ForegroundColor Cyan
Write-Host "   $destinoCompleto" -ForegroundColor White
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Abrir a pasta no Cursor:" -ForegroundColor White
Write-Host "      cd `"$destinoCompleto`"" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Verificar Git (se necessário):" -ForegroundColor White
Write-Host "      git remote -v" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Relinkar Supabase (se necessário):" -ForegroundColor White
Write-Host "      npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
