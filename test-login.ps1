$body = @{
    username = "admin@admin.com"
    password = "admin"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkxODk0MzYsImV4cCI6MjA0NDc2NTQzNn0.lITMZAqMSLk8oy6VcbDoxb-e3qlbZFABrX2xh3Q52cs"
}

Write-Host "Fazendo login..."
try {
    $resp = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/auth/login" -Method POST -Headers $headers -Body $body -TimeoutSec 30
    Write-Host "SUCCESS!"
    Write-Host "Token: $($resp.data.session.access_token.Substring(0, 30))..."
    Write-Host "User: $($resp.data.user.email)"
    
    # Salvar token para uso
    $resp.data.session.access_token | Set-Content "new-token.txt"
    Write-Host "Token salvo em new-token.txt"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Details: $($_.ErrorDetails.Message)"
}
