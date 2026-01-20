$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$body = @{
    name = "Sua Casa Mobiliada"
    email = "suacasamobiliada@gmail.com"
    phone = ""
    plan = "enterprise"
    createdBy = "user_master_rendizy"
} | ConvertTo-Json

$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = "Bearer $ANON_KEY"
}

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/rendizy-server/organizations" -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ Imobiliária criada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "ID: $($response.data.id)" -ForegroundColor Cyan
    Write-Host "Slug: $($response.data.slug)" -ForegroundColor Cyan
    Write-Host "Nome: $($response.data.name)" -ForegroundColor Cyan
    Write-Host "Email: $($response.data.email)" -ForegroundColor Cyan
    Write-Host "Plano: $($response.data.plan)" -ForegroundColor Cyan
    Write-Host "Status: $($response.data.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro ao criar imobiliária:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
