# Verificação rápida de duplicatas
$r = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/anuncios_drafts?select=id,title" -Headers @{ "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ" }

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
