$body = @{
    name = "Sua Casa Mobiliada"
    email = "suacasamobiliada@gmail.com"
    phone = ""
    plan = "enterprise"
    createdBy = "user_master_rendizy"
} | ConvertTo-Json

$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ'
}

try {
    $response = Invoke-RestMethod -Uri 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/organizations' -Method Post -Headers $headers -Body $body
    
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
