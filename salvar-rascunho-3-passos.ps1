# ============================================================================
# SALVAR RASCUNHO - 3 PASSOS AUTOMATIZADOS
# ============================================================================
# Este script executa os 3 passos: obter token, configurar e salvar
# ============================================================================

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/rendizy-server/properties"

Write-Host ""
Write-Host "🚀 SALVANDO RASCUNHO FORÇADO VIA API" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASSO 1: Obter token
# ============================================================================
Write-Host "📋 PASSO 1: Obter token" -ForegroundColor Yellow
Write-Host ""
Write-Host "Execute no console do navegador (F12):" -ForegroundColor White
Write-Host "   localStorage.getItem('rendizy-token')" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cole o token aqui:" -ForegroundColor White
$AUTH_TOKEN = Read-Host "Token"

if (-not $AUTH_TOKEN -or $AUTH_TOKEN.Trim() -eq "") {
    Write-Host "❌ ERRO: Token não fornecido!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Token obtido: $($AUTH_TOKEN.Substring(0, [Math]::Min(20, $AUTH_TOKEN.Length)))..." -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASSO 2: Configurar token
# ============================================================================
Write-Host "📋 PASSO 2: Configurar token" -ForegroundColor Yellow
$env:AUTH_TOKEN = $AUTH_TOKEN
Write-Host "✅ Token configurado: `$env:AUTH_TOKEN = '...'" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASSO 3: Executar script
# ============================================================================
Write-Host "📋 PASSO 3: Executar script de salvar rascunho" -ForegroundColor Yellow
Write-Host ""

# Payload MÍNIMO - apenas status draft
$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload: $payload" -ForegroundColor Cyan
Write-Host "⚡ Enviando POST para: $FUNCTION_URL" -ForegroundColor Cyan
Write-Host ""

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
    Write-Host "📥 Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success -and $response.data -and $response.data.id) {
        $rascunhoId = $response.data.id
        Write-Host "✅ ID do rascunho: $rascunhoId" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Query SQL para encontrar:" -ForegroundColor Yellow
        Write-Host "SELECT id, status, name, code, type, created_at" -ForegroundColor White
        Write-Host "FROM properties" -ForegroundColor White
        Write-Host "WHERE id = '$rascunhoId';" -ForegroundColor White
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ ERRO ao salvar!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Red
        try {
            $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
        } catch {
            Write-Host $_.ErrorDetails.Message
        }
    }
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
