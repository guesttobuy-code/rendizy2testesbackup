$Token = "bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9"
$URL = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties"

$body = '{"status":"draft"}'

Write-Host "Testando..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $URL -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Auth-Token" = $Token
        } `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "SUCESSO!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
