# Script para analisar os 161 anúncios e identificar os 2 extras
$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$h = @{ "apikey" = $ANON_KEY }

Write-Host "`n🔍 ANALISANDO 161 ANÚNCIOS`n" -ForegroundColor Cyan

# IDs dos 2 anúncios de teste
$testIds = @("3cabf06d-51c6-4e2b-b73e-520e018f1fce", "9f6cad48-42e9-4ed5-b766-82127a62dce2")

Write-Host "📊 Buscando todos os anúncios..." -ForegroundColor Cyan
$todos = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/properties?select=id,title,created_at,data" -Headers $h

Write-Host "✅ Total: $($todos.Count) anúncios`n" -ForegroundColor White

# Separar categorias
$testes = $todos | Where-Object { $testIds -contains $_.id }
$migrados = $todos | Where-Object { $_.data -and $_.data.migrated_from -eq 'properties' }
$outros = $todos | Where-Object { 
    -not ($testIds -contains $_.id) -and 
    -not ($_.data -and $_.data.migrated_from -eq 'properties')
}

Write-Host "📈 CATEGORIAS:" -ForegroundColor Yellow
Write-Host "  🎯 Anúncios de TESTE (esperados): $($testes.Count)" -ForegroundColor Cyan
Write-Host "  📦 Anúncios MIGRADOS: $($migrados.Count)" -ForegroundColor Green
Write-Host "  ❓ Anúncios OUTROS (suspeitos): $($outros.Count)" -ForegroundColor Magenta

if ($outros.Count -gt 0) {
    Write-Host "`n⚠️  ANÚNCIOS SUSPEITOS (sem flag de migração):`n" -ForegroundColor Red
    foreach ($item in $outros) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "ID: $($item.id)" -ForegroundColor White
        Write-Host "Título: $($item.title)" -ForegroundColor Yellow
        Write-Host "Criado: $($item.created_at)" -ForegroundColor Gray
        Write-Host "Migrated_from: $(if ($item.data.migrated_from) { $item.data.migrated_from } else { 'NULL' })" -ForegroundColor Gray
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "`n📋 RESUMO:" -ForegroundColor Cyan
Write-Host "  Total: $($todos.Count)" -ForegroundColor White
Write-Host "  Esperado: 159 (2 testes + 157 migrados)" -ForegroundColor White
Write-Host "  Diferença: $(161 - 159)" -ForegroundColor Red

if ($migrados.Count -eq 157) {
    Write-Host "`n✅ Migração completa (157 registros de properties)" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Migração incompleta! Esperado: 157, Encontrado: $($migrados.Count)" -ForegroundColor Red
}

Write-Host ""
