# ============================================================================
# 📦 Script de Exportação Completa do Banco Supabase
# ============================================================================
# Exporta schema, dados, migrations e Edge Functions
#
# Uso: .\exportar-banco-completo.ps1
# ============================================================================

param(
    [string]$ProjectId = "odcgnzfremrqnvtitpcc"
)

Write-Host "📦 RENDIZY - Exportação Completa do Banco" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$BackupDir = "backup_export_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

Write-Host "📁 Diretório de backup: $BackupDir" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 🔗 Conectar no Projeto
# ============================================================================

Write-Host "🔗 Conectando no projeto $ProjectId..." -ForegroundColor Yellow
npx supabase link --project-ref $ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao conectar no projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Conectado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 📥 Exportar Schema
# ============================================================================

Write-Host "📥 Exportando schema completo..." -ForegroundColor Yellow
npx supabase db dump --schema public --schema auth --schema storage -f "$BackupDir\schema_completo.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema exportado: $BackupDir\schema_completo.sql" -ForegroundColor Green
} else {
    Write-Host "⚠️ Erro ao exportar schema" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 📥 Exportar Dados
# ============================================================================

Write-Host "📥 Exportando dados..." -ForegroundColor Yellow
npx supabase db dump --schema public --data-only -f "$BackupDir\dados_completos.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dados exportados: $BackupDir\dados_completos.sql" -ForegroundColor Green
} else {
    Write-Host "⚠️ Erro ao exportar dados" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 📥 Exportar Schema Apenas (sem dados)
# ============================================================================

Write-Host "📥 Exportando estrutura (sem dados)..." -ForegroundColor Yellow
npx supabase db dump --schema public --schema-only -f "$BackupDir\schema_estrutura.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Estrutura exportada: $BackupDir\schema_estrutura.sql" -ForegroundColor Green
} else {
    Write-Host "⚠️ Erro ao exportar estrutura" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 📥 Copiar Migrations
# ============================================================================

Write-Host "📥 Copiando migrations..." -ForegroundColor Yellow
if (Test-Path "supabase\migrations") {
    Copy-Item -Path "supabase\migrations" -Destination "$BackupDir\migrations" -Recurse -Force
    Write-Host "✅ Migrations copiadas: $BackupDir\migrations" -ForegroundColor Green
} else {
    Write-Host "⚠️ Pasta migrations não encontrada" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 📥 Copiar Edge Functions
# ============================================================================

Write-Host "📥 Copiando Edge Functions..." -ForegroundColor Yellow
if (Test-Path "supabase\functions") {
    Copy-Item -Path "supabase\functions" -Destination "$BackupDir\functions" -Recurse -Force
    Write-Host "✅ Edge Functions copiadas: $BackupDir\functions" -ForegroundColor Green
} else {
    Write-Host "⚠️ Pasta functions não encontrada" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 📊 Resumo
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ EXPORTAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Arquivos exportados em: $BackupDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Arquivos criados:" -ForegroundColor Yellow
Get-ChildItem -Path $BackupDir -Recurse | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  - $($_.FullName.Replace((Get-Location).Path + '\', '')) ($size KB)" -ForegroundColor White
}
Write-Host ""

