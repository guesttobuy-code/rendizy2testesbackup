$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ'
}

# Primeiro, criar a organização
$body = @{
    name = "Sua Casa Mobiliada"
    email = "suacasamobiliada@gmail.com"
    phone = ""
    plan = "enterprise"
    createdBy = "user_master_rendizy"
} | ConvertTo-Json

Write-Host "Criando imobiliária..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/organizations' -Method Post -Headers $headers -Body $body -ContentType 'application/json'
    
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "`n✅ Imobiliária criada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "ID: $($result.data.id)" -ForegroundColor Cyan
        Write-Host "Slug: $($result.data.slug)" -ForegroundColor Cyan
        Write-Host "Nome: $($result.data.name)" -ForegroundColor Cyan
        Write-Host "Email: $($result.data.email)" -ForegroundColor Cyan
        Write-Host "Plano: $($result.data.plan)" -ForegroundColor Cyan
        Write-Host "Status: $($result.data.status)" -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Erro: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n❌ Erro ao criar imobiliária:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorObj) {
            Write-Host "Erro: $($errorObj.error)" -ForegroundColor Red
        } else {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    }
}
