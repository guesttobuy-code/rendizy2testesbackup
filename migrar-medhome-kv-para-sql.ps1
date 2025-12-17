# Script para migrar Medhome do KV Store para SQL

$apiUrl = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/migrate-kv-to-sql"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"

Write-Host "🚀 Migrando Medhome do KV Store para SQL..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    organizationId = "e78c7bb9-7823-44b8-9aee-95c9b073e7b7"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json" -Headers @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    }
    
    Write-Host "✅ Migração concluída!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultado:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Erro na migração:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

