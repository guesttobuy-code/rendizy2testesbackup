# 🔍 Script para Buscar Logs do Supabase - Organizações
# Busca logs relacionados a requisições de organizações

$projectId = "odcgnzfremrqnvtitpcc"
$functionName = "rendizy-server"

Write-Host "`n=== BUSCANDO LOGS: Organizações ===" -ForegroundColor Green
Write-Host "📁 Project ID: $projectId" -ForegroundColor Cyan
Write-Host "🔧 Function: $functionName" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 Para ver logs do Supabase:" -ForegroundColor Yellow
Write-Host "   1. Acesse: https://supabase.com/dashboard/project/$projectId/logs/edge-functions" -ForegroundColor White
Write-Host "   2. Filtre por: 'organizations' ou 'listOrganizations'" -ForegroundColor White
Write-Host "   3. Verifique requisições GET /organizations" -ForegroundColor White
Write-Host ""

Write-Host "📋 O que procurar nos logs:" -ForegroundColor Yellow
Write-Host "   ✅ Status 200 - Requisição bem-sucedida" -ForegroundColor Green
Write-Host "   ✅ 'Total de organizações: 4' - Dados retornados" -ForegroundColor Green
Write-Host "   ❌ Status 500 - Erro no backend" -ForegroundColor Red
Write-Host "   ❌ 'Error fetching organizations' - Erro na query" -ForegroundColor Red
Write-Host "   ❌ 'RLS policy violation' - Problema de permissão" -ForegroundColor Red
Write-Host ""

Write-Host "🔍 Comandos úteis (se tiver Supabase CLI):" -ForegroundColor Yellow
Write-Host "   npx supabase functions logs $functionName --project-ref $projectId" -ForegroundColor White
Write-Host ""

Write-Host "📝 Ou via API do Supabase:" -ForegroundColor Yellow
Write-Host "   https://api.supabase.com/v1/projects/$projectId/logs/edge-functions" -ForegroundColor White
Write-Host ""

