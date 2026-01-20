# ⚡ Script para aplicar migration via Supabase Dashboard

Write-Host "🔧 APLICANDO MIGRATION DA TABELA GUESTS..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 INSTRUÇÕES:" -ForegroundColor Yellow
Write-Host "1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new"
Write-Host "2. Copie o conteúdo abaixo"
Write-Host "3. Cole no SQL Editor do Supabase"
Write-Host "4. Clique em RUN"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Ler o arquivo da migration
$migrationPath = Join-Path $PSScriptRoot "supabase\migrations\20241214_add_guests_columns.sql"

if (Test-Path $migrationPath) {
    $migrationContent = Get-Content $migrationPath -Raw
    Write-Host $migrationContent
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Migration copiada! Cole no Supabase Dashboard e execute." -ForegroundColor Green
    
    # Copiar para clipboard se possível
    try {
        Set-Clipboard -Value $migrationContent
        Write-Host "📋 Migration copiada para clipboard!" -ForegroundColor Cyan
    } catch {
        Write-Host "⚠️ Não foi possível copiar para clipboard automaticamente." -ForegroundColor Yellow
        Write-Host "   Copie manualmente do texto acima." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Arquivo de migration não encontrado!" -ForegroundColor Red
    Write-Host "   Procurado em: $migrationPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔗 Link direto: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new" -ForegroundColor Cyan
Write-Host ""
