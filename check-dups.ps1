# Verificação rápida de duplicatas
$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$r = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_drafts?select=id,title" -Headers @{ "apikey" = $ANON_KEY }

Write-Host "`nTotal: $($r.Count)"

$testIds = @("3cabf06d-51c6-4e2b-b73e-520e018f1fce", "9f6cad48-42e9-4ed5-b766-82127a62dce2")
$dups = $r | Group-Object title | Where-Object { $_.Count -gt 1 }

Write-Host "Duplicados: $($dups.Count)`n"

foreach ($d in $dups) {
    Write-Host "$($d.Name) - $($d.Count) copias:" -ForegroundColor Yellow
    foreach ($i in $d.Group) {
        $isTeste = $testIds -contains $i.id
        if ($isTeste) {
            Write-Host "  $($i.id) [TESTE - MANTER]" -ForegroundColor Cyan
        } else {
            Write-Host "  $($i.id) [REMOVER]" -ForegroundColor Red
        }
    }
    Write-Host ""
}
