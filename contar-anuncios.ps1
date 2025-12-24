# Script rápido para contar anúncios nas duas tabelas
$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$h = @{ "apikey" = $ANON_KEY }

Write-Host "`n📊 CONTAGEM DE ANÚNCIOS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    $drafts = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_drafts?select=id" -Headers $h
    Write-Host "`n✅ anuncios_drafts: $($drafts.Count) registros" -ForegroundColor Green
    
    if ($drafts.Count -gt 0) {
        Write-Host "   Primeiros IDs:" -ForegroundColor Gray
        $drafts[0..([Math]::Min(2, $drafts.Count-1))] | ForEach-Object { Write-Host "   - $($_.id)" -ForegroundColor Gray }
    }
} catch {
    Write-Host "❌ Erro ao contar anuncios_drafts" -ForegroundColor Red
}

try {
    $props = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/properties?select=id,name" -Headers $h
    Write-Host "`n✅ properties: $($props.Count) registros" -ForegroundColor Yellow
    
    if ($props.Count -gt 0) {
        Write-Host "   Primeiros IDs:" -ForegroundColor Gray
        $props[0..([Math]::Min(2, $props.Count-1))] | ForEach-Object { Write-Host "   - $($_.id) - $($_.name)" -ForegroundColor Gray }
    }
} catch {
    Write-Host "❌ Erro ao contar properties" -ForegroundColor Red
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "💡 Total de anúncios no sistema: $($drafts.Count + $props.Count)" -ForegroundColor White
Write-Host "`n"
