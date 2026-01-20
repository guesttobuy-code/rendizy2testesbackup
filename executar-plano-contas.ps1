# Script para executar SQL do plano de contas via Supabase Management API
# Requer: Supabase Access Token e Project ID

$projectId = "odcgnzfremrqnvtitpcc"
$sqlFile = "supabase\migrations\20241124_plano_contas_imobiliaria_temporada.sql"

# Ler o arquivo SQL
$sqlContent = Get-Content $sqlFile -Raw

# Obter token do Supabase (do arquivo de tokens ou variável de ambiente)
$accessToken = $env:SUPABASE_ACCESS_TOKEN
if (-not $accessToken) {
    Write-Host "⚠️ Token não encontrado. Tente fazer login: npx supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Executando SQL do plano de contas..." -ForegroundColor Green

# Executar via Supabase Management API
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectId/database/query" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ SQL executado com sucesso!" -ForegroundColor Green
    Write-Host $response | ConvertTo-Json
} catch {
    Write-Host "❌ Erro ao executar SQL:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "Tentando método alternativo..." -ForegroundColor Yellow
    
    # Método alternativo: usar Supabase CLI db push apenas para essa migration
    Write-Host "Executando via Supabase CLI..." -ForegroundColor Yellow
    npx supabase db push --include-all
}

