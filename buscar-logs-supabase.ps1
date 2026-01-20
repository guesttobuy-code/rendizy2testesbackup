# ============================================================================
# Script para Buscar Logs do Supabase via API
# ============================================================================

param(
    [string]$ProjectId = "odcgnzfremrqnvtitpcc",
    [string]$FunctionName = "rendizy-server",
    [int]$Limit = 50
)

Write-Host "🔍 Buscando logs do Supabase..." -ForegroundColor Cyan
Write-Host ""

# Carregar token do .env.local se existir
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local"
    $accessToken = ($envContent | Where-Object { $_ -match "SUPABASE_ACCESS_TOKEN" } | ForEach-Object { ($_ -split "=")[1].Trim() }) -replace '"', ''
    
    if ($accessToken) {
        $env:SUPABASE_ACCESS_TOKEN = $accessToken
        Write-Host "✅ Token carregado do .env.local" -ForegroundColor Green
    }
}

# Se não tiver token, tentar login interativo
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "⚠️ Token não encontrado. Tente fazer login:" -ForegroundColor Yellow
    Write-Host "   npx supabase login" -ForegroundColor Gray
    exit 1
}

Write-Host "📦 Projeto: $ProjectId" -ForegroundColor Yellow
Write-Host "🔧 Função: $FunctionName" -ForegroundColor Yellow
Write-Host ""

# Tentar diferentes endpoints da API
$baseUrl = "https://api.supabase.com/v1/projects/$ProjectId"

Write-Host "🔍 Tentando endpoint 1: $baseUrl/functions/$FunctionName/logs" -ForegroundColor Gray
try {
    $headers = @{
        "Authorization" = "Bearer $env:SUPABASE_ACCESS_TOKEN"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/functions/$FunctionName/logs?limit=$Limit" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "✅ Logs obtidos via API!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Endpoint 1 falhou: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    # Tentar endpoint alternativo
    Write-Host "🔍 Tentando endpoint 2: $baseUrl/logs" -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/logs?limit=$Limit" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "✅ Logs obtidos via API!" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "❌ Endpoint 2 falhou: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Use o Dashboard do Supabase:" -ForegroundColor Cyan
        Write-Host "   https://supabase.com/dashboard/project/$ProjectId/logs" -ForegroundColor Yellow
    }
}

