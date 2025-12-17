# Script de Teste Real - API Stays.net via Backend
# Testa conexão real e captura dados reais

$baseUrl = "https://bvm.stays.net/external/v1"
$apiKey = "a5146970"
$apiSecret = "bfcf4daf"

# Criar Basic Auth
$credentials = "${apiKey}:${apiSecret}"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($credentials)
$base64 = [System.Convert]::ToBase64String($bytes)
$authHeader = "Basic $base64"

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 TESTE REAL - API STAYS.NET" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl"
Write-Host "API Key: $($apiKey.Substring(0,4))****"
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan

$endpoints = @(
    @{ Name = "Properties"; Path = "/content/properties" },
    @{ Name = "Listings"; Path = "/content/listings" },
    @{ Name = "Clients (Guests)"; Path = "/booking/clients" },
    @{ Name = "Reservations"; Path = "/booking/reservations?from=2024-01-01&to=2025-12-31&dateType=arrival" }
)

$results = @{}

foreach ($endpoint in $endpoints) {
    Write-Host "`n📡 Testando: $($endpoint.Name)" -ForegroundColor Yellow
    Write-Host "   Endpoint: $($endpoint.Path)"
    
    try {
        $url = "$baseUrl$($endpoint.Path)"
        Write-Host "   URL: $url"
        
        $headers = @{
            "Authorization" = $authHeader
            "Content-Type" = "application/json"
            "Accept" = "application/json"
        }
        
        $response = Invoke-WebRequest -Uri $url -Method GET -Headers $headers -ErrorAction Stop
        
        Write-Host "   Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
        
        $contentType = $response.Headers["Content-Type"]
        Write-Host "   Content-Type: $contentType"
        
        if ($contentType -like "*json*") {
            $data = $response.Content | ConvertFrom-Json
            
            $isArray = $data -is [Array]
            $keys = if (-not $isArray -and $data -is [PSCustomObject]) { $data.PSObject.Properties.Name } else { @() }
            
            Write-Host "   ✅ Resposta JSON recebida" -ForegroundColor Green
            Write-Host "   Tipo: $(if ($isArray) { 'Array' } else { $data.GetType().Name })"
            Write-Host "   Tamanho: $(if ($isArray) { $data.Count } else { $keys.Count }) $(if ($isArray) { 'itens' } else { 'chaves' })"
            
            if ($isArray -and $data.Count -gt 0) {
                $firstItem = $data[0]
                $itemKeys = $firstItem.PSObject.Properties.Name
                
                Write-Host "`n   📋 PRIMEIRO ITEM - $($itemKeys.Count) campos:" -ForegroundColor Cyan
                Write-Host "   Campos:"
                
                foreach ($key in $itemKeys) {
                    $value = $firstItem.$key
                    $type = if ($value -is [Array]) { "array" } else { $value.GetType().Name }
                    $preview = if ($value -is [PSCustomObject] -or $value -is [Array]) {
                        ($value | ConvertTo-Json -Compress).Substring(0, [Math]::Min(80, ($value | ConvertTo-Json -Compress).Length))
                    } else {
                        $value.ToString().Substring(0, [Math]::Min(50, $value.ToString().Length))
                    }
                    Write-Host "     • $key : $type = $preview$(if ($preview.Length -ge 50) { '...' } else { '' })"
                }
                
                # Salvar resultado
                $results[$endpoint.Name] = @{
                    Success = $true
                    Structure = "array"
                    Count = $data.Count
                    Sample = $firstItem
                    AllFields = $itemKeys
                    FullResponse = $data[0..2]  # Primeiros 3 itens
                }
                
                # Salvar JSON completo
                $jsonFile = "staysnet-$($endpoint.Name.ToLower())-real.json"
                $data | ConvertTo-Json -Depth 10 | Out-File $jsonFile -Encoding UTF8
                Write-Host "`n   💾 Dados salvos em: $jsonFile" -ForegroundColor Green
                
            } elseif (-not $isArray -and $keys.Count -gt 0) {
                Write-Host "`n   📋 ESTRUTURA DO OBJETO:" -ForegroundColor Cyan
                Write-Host "   Chaves: $($keys -join ', ')"
                
                foreach ($key in $keys) {
                    if ($data.$key -is [Array]) {
                        Write-Host "   ✅ Array encontrado em: $key ($($data.$key.Count) itens)" -ForegroundColor Green
                        if ($data.$key.Count -gt 0) {
                            $firstItem = $data.$key[0]
                            $itemKeys = $firstItem.PSObject.Properties.Name
                            Write-Host "   Campos do primeiro item:"
                            foreach ($field in $itemKeys) {
                                $value = $firstItem.$field
                                $type = if ($value -is [Array]) { "array" } else { $value.GetType().Name }
                                $preview = if ($value -is [PSCustomObject] -or $value -is [Array]) {
                                    ($value | ConvertTo-Json -Compress).Substring(0, [Math]::Min(80, ($value | ConvertTo-Json -Compress).Length))
                                } else {
                                    $value.ToString().Substring(0, [Math]::Min(50, $value.ToString().Length))
                                }
                                Write-Host "     • $field : $type = $preview$(if ($preview.Length -ge 50) { '...' } else { '' })"
                            }
                            
                            $results[$endpoint.Name] = @{
                                Success = $true
                                Structure = "object"
                                ArrayKey = $key
                                Count = $data.$key.Count
                                Sample = $firstItem
                                AllFields = $itemKeys
                                FullResponse = @{ $key = $data.$key[0..2] }
                            }
                            
                            # Salvar JSON completo
                            $jsonFile = "staysnet-$($endpoint.Name.ToLower())-real.json"
                            $data | ConvertTo-Json -Depth 10 | Out-File $jsonFile -Encoding UTF8
                            Write-Host "`n   💾 Dados salvos em: $jsonFile" -ForegroundColor Green
                        }
                        break
                    }
                }
            }
        } else {
            Write-Host "   ❌ Resposta não é JSON" -ForegroundColor Red
            Write-Host "   Preview: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))"
            $results[$endpoint.Name] = @{
                Success = $false
                Status = $response.StatusCode
                Error = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
            }
        }
    } catch {
        Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        $results[$endpoint.Name] = @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Resumo final
Write-Host "`n`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

foreach ($name in $results.Keys) {
    $result = $results[$name]
    if ($result.Success) {
        Write-Host "`n✅ $name:" -ForegroundColor Green
        Write-Host "   Estrutura: $($result.Structure)"
        Write-Host "   Total de itens: $($result.Count)"
        Write-Host "   Campos encontrados: $($result.AllFields.Count)"
        if ($result.AllFields) {
            Write-Host "   Campos: $($result.AllFields -join ', ')"
        }
    } else {
        Write-Host "`n❌ $name : $($result.Error)" -ForegroundColor Red
    }
}

# Salvar resumo
$results | ConvertTo-Json -Depth 10 | Out-File "staysnet-test-results.json" -Encoding UTF8
Write-Host "`n💾 Resumo salvo em: staysnet-test-results.json" -ForegroundColor Green

