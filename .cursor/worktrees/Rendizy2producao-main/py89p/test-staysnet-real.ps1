# Script PowerShell para testar API Stays.net com dados reais

$apiKey = "a5146970"
$apiSecret = "bfcf4daf"
$baseUrl = "https://bvm.stays.net/external/v1"

# Criar Basic Auth
$credentials = "$apiKey`:$apiSecret"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($credentials)
$base64 = [System.Convert]::ToBase64String($bytes)
$authHeader = "Basic $base64"

Write-Host "🚀 TESTANDO CONEXÃO COM API STAYS.NET" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "API Key: $($apiKey.Substring(0,4))****" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Endpoint,
        [string]$Method = "GET"
    )
    
    $url = "$baseUrl$Endpoint"
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host "🔍 TESTANDO: $Method $Endpoint" -ForegroundColor Yellow
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host "URL: $url" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $headers = @{
            "Authorization" = $authHeader
            "Content-Type" = "application/json"
            "Accept" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -ErrorAction Stop
        
        Write-Host "✅ SUCESSO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 ESTRUTURA DA RESPOSTA:" -ForegroundColor Cyan
        Write-Host "Tipo: $($response.GetType().Name)"
        
        if ($response -is [Array]) {
            Write-Host "É array: SIM" -ForegroundColor Green
            Write-Host "Total de itens: $($response.Length)" -ForegroundColor Green
            if ($response.Length -gt 0) {
                Write-Host ""
                Write-Host "📋 PRIMEIRO ITEM:" -ForegroundColor Cyan
                $response[0] | ConvertTo-Json -Depth 10 | Write-Host
            }
        } elseif ($response -is [PSCustomObject]) {
            Write-Host "É objeto: SIM" -ForegroundColor Green
            Write-Host "Chaves: $($response.PSObject.Properties.Name -join ', ')" -ForegroundColor Cyan
            
            # Verificar arrays dentro do objeto
            foreach ($prop in $response.PSObject.Properties) {
                if ($prop.Value -is [Array]) {
                    Write-Host "  • $($prop.Name): array com $($prop.Value.Length) itens" -ForegroundColor Yellow
                    if ($prop.Value.Length -gt 0) {
                        Write-Host "    Primeiro item de $($prop.Name):" -ForegroundColor Cyan
                        $prop.Value[0] | ConvertTo-Json -Depth 5 | Write-Host
                    }
                }
            }
            
            Write-Host ""
            Write-Host "📋 ESTRUTURA COMPLETA (primeiros 2000 chars):" -ForegroundColor Cyan
            $json = $response | ConvertTo-Json -Depth 10
            Write-Host $json.Substring(0, [Math]::Min(2000, $json.Length))
        }
        
        return @{
            Success = $true
            Data = $response
        }
    }
    catch {
        Write-Host "❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Testar endpoints
$results = @{}

Write-Host "`n🔍 TESTE 1: CLIENTES (HÓSPEDES)" -ForegroundColor Magenta
$results.clients = Test-Endpoint -Endpoint "/booking/clients"

Write-Host "`n🔍 TESTE 2: PROPRIEDADES" -ForegroundColor Magenta
$results.properties = Test-Endpoint -Endpoint "/content/properties"

Write-Host "`n🔍 TESTE 3: ANÚNCIOS (LISTINGS)" -ForegroundColor Magenta
$results.listings = Test-Endpoint -Endpoint "/content/listings"

Write-Host "`n🔍 TESTE 4: RESERVAS" -ForegroundColor Magenta
$today = Get-Date
$startDate = $today.AddDays(-30).ToString("yyyy-MM-dd")
$endDate = $today.AddDays(365).ToString("yyyy-MM-dd")
$reservationsEndpoint = "/booking/reservations?from=$startDate&to=$endDate&dateType=arrival"
$results.reservations = Test-Endpoint -Endpoint $reservationsEndpoint

# Resumo
Write-Host "`n" + ("=" * 80) -ForegroundColor Yellow
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Yellow
Write-Host "=" * 80 -ForegroundColor Yellow
foreach ($key in $results.Keys) {
    $result = $results[$key]
    if ($result.Success) {
        Write-Host "$key`: ✅ SUCESSO" -ForegroundColor Green
        if ($result.Data -is [Array]) {
            Write-Host "  → $($result.Data.Length) itens encontrados" -ForegroundColor Cyan
        }
    } else {
        Write-Host "$key`: ❌ FALHOU - $($result.Error)" -ForegroundColor Red
    }
}

# Salvar resultados
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "staysnet-test-results.json" -Encoding UTF8
Write-Host "`n💾 Resultados salvos em: staysnet-test-results.json" -ForegroundColor Green

