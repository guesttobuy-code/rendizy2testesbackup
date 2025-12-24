# Script Alternativo - Inserir Reserva Diretamente no Banco
# v1.0.103.352

$SUPABASE_URL = $env:SUPABASE_URL
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $SERVICE_ROLE_KEY) { throw "Missing env var SUPABASE_SERVICE_ROLE_KEY" }

Write-Host "🔍 INSERIR RESERVA DIRETAMENTE NO BANCO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Buscar imóvel
Write-Host "🏠 Buscando imóvel..." -ForegroundColor Yellow
$properties = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_drafts?select=id,title&limit=1" -Method Get -Headers $headers
$propertyId = $properties[0].id
$propertyName = $properties[0].title
Write-Host "✅ Imóvel: $propertyName" -ForegroundColor Green

# Buscar hóspede
Write-Host "👤 Buscando hóspede..." -ForegroundColor Yellow
$guests = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/guests?select=id,first_name,last_name&limit=1" -Method Get -Headers $headers
$guestId = $guests[0].id
$guestName = "$($guests[0].first_name) $($guests[0].last_name)"
Write-Host "✅ Hóspede: $guestName" -ForegroundColor Green

# Dados da reserva
$checkIn = "2025-12-18"
$checkOut = "2025-12-23"
$nights = 5

$reservationId = "rsv-test-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host ""
Write-Host "📋 Criando reserva..." -ForegroundColor Yellow

$reservationData = @{
    id = $reservationId
    organization_id = "00000000-0000-0000-0000-000000000000"
    property_id = $propertyId
    guest_id = $guestId
    check_in = $checkIn
    check_out = $checkOut
    nights = $nights
    adults = 2
    children = 0
    infants = 0
    pets = 0
    total_guests = 2
    status = "confirmed"
    platform = "direct"
    price_per_night = 350.00
    base_total = 1750.00
    cleaning_fee = 0
    service_fee = 0
    taxes = 0
    discount = 0
    total = 1750.00
    currency = "BRL"
    applied_tier = "base"
    payment_status = "pending"
    notes = "Reserva de teste criada diretamente no banco - v1.0.103.352"
    created_by = "system"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/reservations" -Method Post -Headers $headers -Body $reservationData
    
    Write-Host ""
    Write-Host "✅ RESERVA CRIADA COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "📌 ID: $reservationId" -ForegroundColor Cyan
    Write-Host "🏠 Imóvel: $propertyName" -ForegroundColor White
    Write-Host "👤 Hóspede: $guestName" -ForegroundColor White
    Write-Host "📅 Check-in: $checkIn" -ForegroundColor White
    Write-Host "📅 Check-out: $checkOut" -ForegroundColor White
    Write-Host "🌙 Noites: $nights" -ForegroundColor White
    Write-Host "💰 Total: R$ 1.750,00" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 AGORA ABRA O CALENDÁRIO E VEJA A RESERVA!" -ForegroundColor Green
    Write-Host "🌐 http://localhost:3000/calendario" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO AO CRIAR RESERVA!" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host "Tipo: $($_.Exception.GetType().Name)" -ForegroundColor Yellow
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}
