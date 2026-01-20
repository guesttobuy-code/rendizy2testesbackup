# ============================================================================
# TESTE PRIMITIVO DE RASCUNHO VIA API (CURL)
# ============================================================================
# Este script testa criar um rascunho da forma mais simples possível
# diretamente via API usando curl
# ============================================================================

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/rendizy-server/properties"

# Token de autenticação (precisa ser um token válido)
# Para obter: localStorage.getItem("rendizy-token") no console do navegador
$AUTH_TOKEN = $env:AUTH_TOKEN

if (-not $AUTH_TOKEN) {
    Write-Host "❌ ERRO: AUTH_TOKEN não configurado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obter o token:" -ForegroundColor Yellow
    Write-Host "  1. Faça login na aplicação (http://localhost:5173)" -ForegroundColor Yellow
    Write-Host "  2. Abra o console do navegador (F12)" -ForegroundColor Yellow
    Write-Host "  3. Execute: localStorage.getItem('rendizy-token')" -ForegroundColor Yellow
    Write-Host "  4. Configure: `$env:AUTH_TOKEN='seu_token_aqui'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "🚀 TESTE PRIMITIVO DE RASCUNHO VIA API" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# TESTE 1: Rascunho MÍNIMO (apenas status draft)
# ============================================================================
Write-Host "🧪 TESTE 1: Rascunho MÍNIMO (apenas status draft)" -ForegroundColor Yellow
Write-Host "-" * 60 -ForegroundColor Gray

$payload1 = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload: $payload1" -ForegroundColor Cyan

$response1 = curl.exe -X POST "$FUNCTION_URL" `
    -H "Content-Type: application/json" `
    -H "X-Auth-Token: $AUTH_TOKEN" `
    -d $payload1 `
    -s

Write-Host "📥 Resposta:" -ForegroundColor Cyan
$response1 | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

# ============================================================================
# TESTE 2: Rascunho com wizard_data vazio
# ============================================================================
Write-Host "🧪 TESTE 2: Rascunho com wizard_data vazio" -ForegroundColor Yellow
Write-Host "-" * 60 -ForegroundColor Gray

$payload2 = @{
    status = "draft"
    wizardData = @{}
} | ConvertTo-Json -Compress

Write-Host "📤 Payload: $payload2" -ForegroundColor Cyan

$response2 = curl.exe -X POST "$FUNCTION_URL" `
    -H "Content-Type: application/json" `
    -H "X-Auth-Token: $AUTH_TOKEN" `
    -d $payload2 `
    -s

Write-Host "📥 Resposta:" -ForegroundColor Cyan
$response2 | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

# ============================================================================
# TESTE 3: Rascunho com apenas um campo (name)
# ============================================================================
Write-Host "🧪 TESTE 3: Rascunho com apenas um campo (name)" -ForegroundColor Yellow
Write-Host "-" * 60 -ForegroundColor Gray

$payload3 = @{
    status = "draft"
    name = "Teste Rascunho Primitivo"
    wizardData = @{
        contentDescription = @{
            title = "Teste Rascunho Primitivo"
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "📤 Payload: $payload3" -ForegroundColor Cyan

$response3 = curl.exe -X POST "$FUNCTION_URL" `
    -H "Content-Type: application/json" `
    -H "X-Auth-Token: $AUTH_TOKEN" `
    -d $payload3 `
    -s

Write-Host "📥 Resposta:" -ForegroundColor Cyan
$response3 | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "✅ TESTES CONCLUÍDOS" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
