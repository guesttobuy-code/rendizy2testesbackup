# ============================================================================
# TESTAR SALVAR RASCUNHO - COM DEBUG COMPLETO
# ============================================================================

$Token = "bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9"
$FUNCTION_URL = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties"

Write-Host "TESTE: SALVANDO RASCUNHO VIA API" -ForegroundColor Cyan
Write-Host ""

$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "Payload: $payload" -ForegroundColor Yellow
Write-Host "URL: $FUNCTION_URL" -ForegroundColor Yellow
Write-Host "Token (primeiros 20 chars): $($Token.Substring(0, 20))..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Auth-Token" = $Token
        } `
        -Body $payload `
        -ErrorAction Stop

    Write-Host "SUCESSO! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "ERRO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status HTTP: $statusCode" -ForegroundColor Red
        Write-Host ""
        
        # Ler o corpo da resposta de erro
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            $errorStream.Close()
            
            Write-Host "Corpo da resposta de erro:" -ForegroundColor Yellow
            Write-Host $responseBody -ForegroundColor White
            Write-Host ""
            
            # Tentar parsear como JSON
            try {
                $errorJson = $responseBody | ConvertFrom-Json
                Write-Host "Erro parseado (JSON):" -ForegroundColor Yellow
                $errorJson | ConvertTo-Json -Depth 10
            } catch {
                Write-Host "Nao e JSON valido" -ForegroundColor Gray
            }
        } catch {
            Write-Host "Nao foi possivel ler o corpo da resposta" -ForegroundColor Gray
        }
    }
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "ErrorDetails.Message:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor White
    }
}
