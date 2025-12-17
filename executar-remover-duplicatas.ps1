# Script para executar SQL de remoção de duplicatas via Supabase Management API
$PROJECT_ID = "odcgnzfremrqnvtitpcc"
$SQL_FILE = "remover-duplicatas-categorias.sql"

Write-Host "📋 Lendo arquivo SQL..." -ForegroundColor Cyan
$sqlContent = Get-Content $SQL_FILE -Raw

# Dividir em comandos individuais (separados por ;)
$commands = $sqlContent -split ';' | Where-Object { $_.Trim() -ne '' -and $_ -notmatch '^\s*--' }

Write-Host "`n🔍 Encontrados $($commands.Count) comandos SQL" -ForegroundColor Yellow
Write-Host "`n⚠️  Para executar SQL diretamente, você precisa:" -ForegroundColor Yellow
Write-Host "   1. Acessar: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new" -ForegroundColor Cyan
Write-Host "   2. Colar o conteúdo do arquivo: $SQL_FILE" -ForegroundColor Cyan
Write-Host "   3. Executar o script" -ForegroundColor Cyan
Write-Host "`n📄 Conteúdo do arquivo SQL:" -ForegroundColor Green
Write-Host "---" -ForegroundColor Gray
Get-Content $SQL_FILE
Write-Host "---" -ForegroundColor Gray

