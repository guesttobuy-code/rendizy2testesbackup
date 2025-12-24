# Script para detectar anúncios duplicados em anuncios_drafts
$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$h = @{ "apikey" = $ANON_KEY }

Write-Host "`n🔍 VERIFICANDO DUPLICATAS EM anuncios_drafts`n" -ForegroundColor Cyan

# IDs dos 2 anúncios de teste
$testIds = @("3cabf06d-51c6-4e2b-b73e-520e018f1fce", "9f6cad48-42e9-4ed5-b766-82127a62dce2")

Write-Host "📋 Anúncios de TESTE esperados (com reservas/bloqueios):" -ForegroundColor Yellow
foreach ($id in $testIds) {
    $anuncio = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_drafts?id=eq.$id&select=id,title,created_at" -Headers $h
    if ($anuncio) {
        Write-Host "  ✅ $($anuncio[0].id) - $($anuncio[0].title)" -ForegroundColor Green
    }
}

Write-Host "`n📊 Buscando TODOS os anúncios..." -ForegroundColor Cyan
$todos = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_drafts?select=id,title,created_at,data" -Headers $h

Write-Host "✅ Total de registros: $($todos.Count)" -ForegroundColor White

# Detectar duplicatas por título
$grupos = $todos | Group-Object -Property title | Where-Object { $_.Count -gt 1 }

if ($grupos.Count -gt 0) {
    Write-Host "`n⚠️  DUPLICATAS ENCONTRADAS: $($grupos.Count) títulos duplicados`n" -ForegroundColor Red
    
    foreach ($grupo in $grupos) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "📌 Título: $($grupo.Name)" -ForegroundColor Yellow
        Write-Host "   Quantidade: $($grupo.Count) registros" -ForegroundColor Red
        
        foreach ($item in $grupo.Group) {
            $isTest = $testIds -contains $item.id
            $migrated = if ($item.data -and $item.data.migrated_from) { "MIGRADO" } else { "ORIGINAL" }
            $marker = if ($isTest) { "🎯 TESTE" } else { "📦 $migrated" }
            
            Write-Host "   - ID: $($item.id)" -ForegroundColor White
            Write-Host "     Tipo: $marker" -ForegroundColor $(if ($isTest) { "Cyan" } else { "Gray" })
            Write-Host "     Criado: $($item.created_at)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "`n💡 Solução: Remover os registros MIGRADOS duplicados (manter ORIGINAIS)" -ForegroundColor Yellow
    
} else {
    Write-Host "`n✅ Nenhuma duplicata encontrada!" -ForegroundColor Green
}

# Verificar anúncios com migrated_from
$migrados = $todos | Where-Object { $_.data -and $_.data.migrated_from -eq "properties" }
Write-Host "`n📈 Estatísticas:" -ForegroundColor Cyan
Write-Host "  - Total de anúncios: $($todos.Count)" -ForegroundColor White
Write-Host "  - Migrados de properties: $($migrados.Count)" -ForegroundColor Yellow
Write-Host "  - Originais: $($todos.Count - $migrados.Count)" -ForegroundColor Green
Write-Host "  - Esperado: 159 (157 migrados + 2 originais)" -ForegroundColor White
Write-Host "  - Diferença: $(($todos.Count - 159))" -ForegroundColor $(if ($todos.Count -eq 159) { "Green" } else { "Red" })
Write-Host ""
