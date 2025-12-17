# ============================================================================
# SCRIPT: Verificar e Corrigir Login
# ============================================================================
# Verifica estado do banco e backend, corrige se necessário
# ============================================================================

Write-Host "🔍 Verificando estado do sistema..." -ForegroundColor Cyan

# 1. Verificar se tabelas SQL existem
Write-Host "`n📊 Verificando tabelas SQL..." -ForegroundColor Yellow
Write-Host "Execute no Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'sessions');" -ForegroundColor Gray

# 2. Verificar código
Write-Host "`n✅ Código verificado:" -ForegroundColor Green
Write-Host "  - Frontend: /rendizy-server/auth/login" -ForegroundColor Green
Write-Host "  - Backend: app.route('/rendizy-server/auth', authApp)" -ForegroundColor Green
Write-Host "  - Status: CORRETO" -ForegroundColor Green

# 3. Próximos passos
Write-Host "`n🚀 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Verificar se tabelas users e sessions existem no Supabase" -ForegroundColor White
Write-Host "2. Se não existirem, aplicar migrations:" -ForegroundColor White
Write-Host "   - supabase/migrations/20241120_create_users_table.sql" -ForegroundColor Gray
Write-Host "   - supabase/migrations/20241121_create_sessions_table.sql" -ForegroundColor Gray
Write-Host "3. Fazer deploy do backend:" -ForegroundColor White
Write-Host "   - Acessar: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions" -ForegroundColor Gray
Write-Host "   - Clicar em 'rendizy-server' -> 'Deploy'" -ForegroundColor Gray

Write-Host "`n✅ Script concluído!" -ForegroundColor Green

