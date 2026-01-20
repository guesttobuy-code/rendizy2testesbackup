# ============================================================================
# SALVAR RASCUNHO AGORA - EXECUTA TUDO DE UMA VEZ
# ============================================================================
# Uso: .\salvar-rascunho-agora.ps1 [TOKEN]
# Se não passar token, pede interativamente
# ============================================================================

param(
    [string]$Token = ""
)

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/rendizy-server/properties"

Write-Host ""
Write-Host "🚀 SALVANDO RASCUNHO FORÇADO VIA API" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# PASSO 1: Obter token
if (-not $Token -or $Token.Trim() -eq "") {
    Write-Host "📋 PASSO 1: Obter token" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute no console do navegador (F12):" -ForegroundColor White
    Write-Host "   localStorage.getItem('rendizy-token')" -ForegroundColor Cyan
    Write-Host ""
    $Token = Read-Host "Cole o token aqui"
}

if (-not $Token -or $Token.Trim() -eq "") {
    Write-Host "❌ ERRO: Token não fornecido!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Token obtido: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor Green
Write-Host ""

# PASSO 2: Configurar token
Write-Host "📋 PASSO 2: Configurar token" -ForegroundColor Yellow
$env:AUTH_TOKEN = $Token
Write-Host "✅ Token configurado" -ForegroundColor Green
Write-Host ""

# PASSO 3: Salvar rascunho
Write-Host "📋 PASSO 3: Salvar rascunho via API" -ForegroundColor Yellow
Write-Host ""

$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload: $payload" -ForegroundColor Cyan
Write-Host "⚡ POST: $FUNCTION_URL" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Auth-Token" = $Token
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
    
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "Status HTTP: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
