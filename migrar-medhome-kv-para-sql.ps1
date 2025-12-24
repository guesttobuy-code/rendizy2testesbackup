# Script para migrar Medhome do KV Store para SQL

$SUPABASE_URL = $env:SUPABASE_URL
$anonKey = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $anonKey) { throw "Missing env var SUPABASE_ANON_KEY" }

$apiUrl = "$SUPABASE_URL/functions/v1/rendizy-server/make-server-67caf26a/client-sites/migrate-kv-to-sql"

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

