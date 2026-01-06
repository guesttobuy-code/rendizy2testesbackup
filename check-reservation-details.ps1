param(
    [string]$ReservationId = "8194661d-7eb5-44ce-9b66-70de0804466c",
    [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
    [string]$SupabaseUrl = $env:SUPABASE_URL
)

# Script para verificar dados completos da reserva

function Read-DotEnvValue {
    param(
        [string]$FilePath,
        [string]$Key
    )
    if (-not (Test-Path -LiteralPath $FilePath)) {
        return $null
    }
    try {
        $content = Get-Content -LiteralPath $FilePath -ErrorAction Stop
        $line = $content | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
        if (-not $line) { return $null }
        return ($line -replace "^$([regex]::Escape($Key))=", "").Trim()
    } catch {
        return $null
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envLocalPath = Join-Path $scriptDir ".env.local"
$envSupabasePath = Join-Path (Join-Path $scriptDir "..") (Join-Path "supabase" ".env")
$envExamplePath = Join-Path $scriptDir ".env.example"

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-DotEnvValue -FilePath $envLocalPath -Key "SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-DotEnvValue -FilePath $envLocalPath -Key "VITE_SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-DotEnvValue -FilePath $envSupabasePath -Key "SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-DotEnvValue -FilePath $envExamplePath -Key "SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = "https://odcgnzfremrqnvtitpcc.supabase.co"
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-DotEnvValue -FilePath $envLocalPath -Key "SUPABASE_SERVICE_ROLE_KEY"
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-DotEnvValue -FilePath $envSupabasePath -Key "SUPABASE_SERVICE_ROLE_KEY"
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-DotEnvValue -FilePath $envSupabasePath -Key "SERVICE_ROLE_KEY"
}

if (-not $ServiceRoleKey) {
    Write-Host "`n❌ SUPABASE_SERVICE_ROLE_KEY não encontrada." -ForegroundColor Red
    Write-Host "   - Defina a env var SUPABASE_SERVICE_ROLE_KEY nesta sessão, ou" -ForegroundColor Red
    Write-Host "   - Crie um .env.local em: $envLocalPath com SUPABASE_SERVICE_ROLE_KEY=..." -ForegroundColor Red
    exit 1
}

$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
}

Write-Host "`n🔍 VERIFICAÇÃO COMPLETA DA RESERVA" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# 1. Buscar reserva
try {
    $reservation = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/reservations?id=eq.$ReservationId&select=*" -Headers $headers -Method Get
} catch {
    Write-Host "`n❌ Erro ao buscar reserva:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

if (-not $reservation -or $reservation.Count -eq 0) {
    Write-Host "`n⚠️  Reserva não encontrada: $ReservationId" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📋 DADOS DA RESERVA:" -ForegroundColor Yellow
$reservation[0] | Format-List

# 2. Buscar hóspede
$guestId = $reservation[0].guest_id
try {
    $guest = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/guests?id=eq.$guestId&select=*" -Headers $headers -Method Get
} catch {
    Write-Host "`n❌ Erro ao buscar hóspede:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "`n👤 DADOS DO HÓSPEDE:" -ForegroundColor Green
$guest[0] | Format-List

# 3. Buscar imóvel
$propertyId = $reservation[0].property_id
try {
    $property = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/properties?id=eq.$propertyId&select=id,data" -Headers $headers -Method Get
} catch {
    Write-Host "`n❌ Erro ao buscar imóvel:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "`n🏠 DADOS DO IMÓVEL:" -ForegroundColor Magenta
if ($property.Count -gt 0) {
    Write-Host "ID: $($property[0].id)" -ForegroundColor White
    Write-Host "Nome: $($property[0].data.dadosBasicos.nomeImovel)" -ForegroundColor White
    Write-Host "Endereço: $($property[0].data.endereco.rua), $($property[0].data.endereco.numero)" -ForegroundColor White
}

Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
Write-Host "✅ VERIFICAÇÃO CONCLUÍDA!" -ForegroundColor Green
