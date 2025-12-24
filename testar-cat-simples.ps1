$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$url = "$SUPABASE_URL/functions/v1/rendizy-server/make-server-67caf26a/financeiro/categorias"
$headers = @{"Authorization"="Bearer $ANON_KEY";"Content-Type"="application/json"}
Write-Host "Listando categorias..."
$r = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
$r | ConvertTo-Json -Depth 10

