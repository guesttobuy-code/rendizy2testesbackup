# ============================================================================
# Script para verificar e aplicar migrations no Supabase
# Data: 2024-11-21
# ============================================================================

Write-Host "🔍 VERIFICANDO E APLICANDO MIGRATIONS..." -ForegroundColor Cyan
Write-Host ""

# Projeto Supabase
$projectId = "odcgnzfremrqnvtitpcc"
$supabaseUrl = "https://$projectId.supabase.co"

Write-Host "📋 Migrations a verificar/aplicar:" -ForegroundColor Yellow
Write-Host "   1. organizations (default organization)" -ForegroundColor Gray
Write-Host "   2. users (tabela de usuários)" -ForegroundColor Gray
Write-Host "   3. sessions (tabela de sessões)" -ForegroundColor Gray
Write-Host ""

# Verificar se Supabase CLI está disponível
Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Cyan
try {
    $supabaseVersion = npx supabase --version 2>&1
    Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Supabase CLI não encontrado. Usando npx..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 PRÓXIMOS PASSOS MANUAIS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse o Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/$projectId/sql" -ForegroundColor White
Write-Host ""
Write-Host "2. Execute este SQL para verificar tabelas existentes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   SELECT table_name FROM information_schema.tables" -ForegroundColor White
Write-Host "   WHERE table_schema = 'public'" -ForegroundColor White
Write-Host "   AND table_name IN ('organizations', 'users', 'sessions')" -ForegroundColor White
Write-Host "   ORDER BY table_name;" -ForegroundColor White
Write-Host ""
Write-Host "3. Se tabelas NÃO existirem, aplique as migrations:" -ForegroundColor Cyan
Write-Host "   - supabase/migrations/20241119_create_default_organization.sql" -ForegroundColor Gray
Write-Host "   - supabase/migrations/20241120_create_users_table.sql" -ForegroundColor Gray
Write-Host "   - supabase/migrations/20241121_create_sessions_table.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Após aplicar, verifique se usuários foram criados:" -ForegroundColor Cyan
Write-Host "   SELECT username, email, type, status FROM users;" -ForegroundColor White
Write-Host ""

# Listar arquivos de migration
Write-Host "📁 Arquivos de migration encontrados:" -ForegroundColor Cyan
Get-ChildItem -Path "supabase/migrations" -Filter "*.sql" | ForEach-Object {
    $name = $_.Name
    $date = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    Write-Host "   • $name ($date)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Script concluído. Siga os passos acima para aplicar as migrations." -ForegroundColor Green

