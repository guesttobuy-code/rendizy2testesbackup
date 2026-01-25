# ============================================================================
# CONFIGURAR CREDENCIAIS WAHA NO BANCO
# ============================================================================
# Este script insere/atualiza as credenciais WAHA na tabela channel_instances
# para que o chat funcione com dados persistentes.
#
# COMO USAR:
# 1. Edite as variáveis abaixo com suas credenciais reais
# 2. Execute: .\scripts\configurar-waha-db.ps1
# ============================================================================

param(
    [string]$OrganizationId = "",  # Deixe vazio para usar o ID padrão
    [string]$WahaUrl = "http://76.13.82.60:3001",
    [string]$WahaApiKey = "",  # OBRIGATÓRIO - sua API key do WAHA
    [string]$InstanceName = "default"
)

# Carregar credenciais locais
$credsFile = Join-Path (Split-Path $PSScriptRoot -Parent) "_rendizy-creds.local.ps1"
if (Test-Path $credsFile) {
    . $credsFile
    Write-Host "✅ Credenciais carregadas de _rendizy-creds.local.ps1" -ForegroundColor Green
}

# Validar variáveis obrigatórias
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios!" -ForegroundColor Red
    Write-Host "   Configure em _rendizy-creds.local.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not $WahaApiKey) {
    Write-Host "❌ WahaApiKey é obrigatório!" -ForegroundColor Red
    Write-Host ""
    Write-Host "COMO OBTER A API KEY DO WAHA:" -ForegroundColor Cyan
    Write-Host "1. Acesse o WAHA no VPS: http://76.13.82.60:3001" -ForegroundColor Gray
    Write-Host "2. Vá em Settings > API" -ForegroundColor Gray
    Write-Host "3. Copie a API Key" -ForegroundColor Gray
    Write-Host ""
    Write-Host "EXECUTE NOVAMENTE COM:" -ForegroundColor Yellow
    Write-Host "   .\scripts\configurar-waha-db.ps1 -WahaApiKey 'SUA_KEY_AQUI'" -ForegroundColor White
    exit 1
}

# Se OrganizationId não foi fornecido, buscar a primeira organização
if (-not $OrganizationId) {
    Write-Host "🔍 Buscando organização padrão..." -ForegroundColor Cyan
    
    $headers = @{
        "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
        "Authorization" = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
        "Content-Type" = "application/json"
    }
    
    try {
        $orgsResponse = Invoke-RestMethod `
            -Uri "$($env:SUPABASE_URL)/rest/v1/organizations?select=id,name,slug&limit=5" `
            -Headers $headers `
            -Method Get
        
        if ($orgsResponse.Count -eq 0) {
            Write-Host "❌ Nenhuma organização encontrada!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "Organizações encontradas:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $orgsResponse.Count; $i++) {
            $org = $orgsResponse[$i]
            Write-Host "  [$i] $($org.name) ($($org.slug)) - ID: $($org.id)" -ForegroundColor Gray
        }
        
        $choice = Read-Host "`nDigite o número da organização (0-$($orgsResponse.Count - 1))"
        $OrganizationId = $orgsResponse[[int]$choice].id
        
        Write-Host "✅ Organização selecionada: $($orgsResponse[[int]$choice].name)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro ao buscar organizações: $_" -ForegroundColor Red
        exit 1
    }
}

# Montar payload
$payload = @{
    organization_id = $OrganizationId
    channel = "whatsapp"
    provider = "waha"
    instance_name = $InstanceName
    api_url = $WahaUrl
    api_key = $WahaApiKey
    waha_base_url = $WahaUrl
    waha_api_key = $WahaApiKey
    status = "disconnected"
    is_enabled = $true
    is_default = $true
}

Write-Host ""
Write-Host "📦 Configuração a ser salva:" -ForegroundColor Cyan
Write-Host "   Organization ID: $OrganizationId" -ForegroundColor Gray
Write-Host "   WAHA URL: $WahaUrl" -ForegroundColor Gray
Write-Host "   WAHA API Key: $($WahaApiKey.Substring(0, [Math]::Min(10, $WahaApiKey.Length)))..." -ForegroundColor Gray
Write-Host "   Instance: $InstanceName" -ForegroundColor Gray

$confirm = Read-Host "`nConfirmar? (s/n)"
if ($confirm -ne "s") {
    Write-Host "❌ Cancelado" -ForegroundColor Yellow
    exit 0
}

# Inserir/Atualizar no banco via UPSERT
Write-Host ""
Write-Host "💾 Salvando no banco..." -ForegroundColor Cyan

$headers = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"  # UPSERT
}

try {
    $response = Invoke-RestMethod `
        -Uri "$($env:SUPABASE_URL)/rest/v1/channel_instances" `
        -Headers $headers `
        -Method Post `
        -Body ($payload | ConvertTo-Json -Depth 10)
    
    Write-Host "✅ Configuração WAHA salva com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Reinicie o app Rendizy" -ForegroundColor Gray
    Write-Host "   2. Vá em Chat > WhatsApp" -ForegroundColor Gray
    Write-Host "   3. Escaneie o QR Code se necessário" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Erro ao salvar: $_" -ForegroundColor Red
    
    # Tentar mostrar detalhes do erro
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Detalhes: $errorBody" -ForegroundColor Yellow
    }
    exit 1
}
