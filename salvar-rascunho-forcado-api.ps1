# ============================================================================
# SALVAR RASCUNHO FORÇADO VIA API - FORMA MAIS SIMPLES POSSÍVEL
# ============================================================================
# Este script salva um rascunho via API usando apenas o mínimo necessário
# ============================================================================

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/rendizy-server/properties"

# Token de autenticação
$AUTH_TOKEN = $env:AUTH_TOKEN

if (-not $AUTH_TOKEN) {
    Write-Host "❌ ERRO: AUTH_TOKEN não configurado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obter o token:" -ForegroundColor Yellow
    Write-Host "  1. Faça login em http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  2. Abra console (F12)" -ForegroundColor Yellow
    Write-Host "  3. Execute: localStorage.getItem('rendizy-token')" -ForegroundColor Yellow
    Write-Host "  4. Configure: `$env:AUTH_TOKEN='seu_token'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "🚀 SALVANDO RASCUNHO FORÇADO VIA API" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Payload MÍNIMO - apenas status draft
$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload enviado: $payload" -ForegroundColor Yellow
Write-Host ""

# Fazer requisição
Write-Host "⚡ Enviando requisição..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Auth-Token" = $AUTH_TOKEN
        } `
        -Body $payload `
        -ErrorAction Stop

    Write-Host "✅ SUCESSO! Rascunho criado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 Resposta completa:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success -and $response.data -and $response.data.id) {
        $rascunhoId = $response.data.id
        Write-Host "✅ ID do rascunho: $rascunhoId" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Query para encontrar:" -ForegroundColor Yellow
        Write-Host "SELECT id, status, name, code, type, created_at" -ForegroundColor White
        Write-Host "FROM properties" -ForegroundColor White
        Write-Host "WHERE id = '$rascunhoId';" -ForegroundColor White
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ ERRO ao salvar rascunho!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erro:" -ForegroundColor Red
    $_.Exception.Message
    Write-Host ""
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalhes:" -ForegroundColor Red
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
