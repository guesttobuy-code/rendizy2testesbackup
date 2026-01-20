# ============================================================================
# EXECUTAR SALVAR RASCUNHO - SCRIPT SIMPLES
# ============================================================================

$Token = "bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9"
$FUNCTION_URL = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties"

Write-Host "🚀 SALVANDO RASCUNHO VIA API" -ForegroundColor Cyan
Write-Host ""

$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload: $payload" -ForegroundColor Yellow
Write-Host "⚡ Enviando..." -ForegroundColor Cyan
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
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success -and $response.data -and $response.data.id) {
        $id = $response.data.id
        Write-Host "✅ ID do rascunho: $id" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Query SQL:" -ForegroundColor Yellow
        Write-Host "SELECT id, status, name, code, type, created_at FROM properties WHERE id = '$id';" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ ERRO!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
