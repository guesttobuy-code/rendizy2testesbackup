# Script de Teste - Criar Reserva com Token de Usuário
# v1.0.103.353
# INSTRUÇÕES: Substitua SEU_TOKEN_AQUI pelo token JWT do localStorage

param(
    [Parameter(Mandatory=$true)]
    [string]$UserToken
)

$SUPABASE_URL = $env:SUPABASE_URL
$ANON_KEY = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $ANON_KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

Write-Host "🔍 TESTE DE CRIAÇÃO DE RESERVA COM AUTENTICAÇÃO" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Buscar imóvel
Write-Host "🏠 Buscando imóvel disponível..." -ForegroundColor Yellow
$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $UserToken"
    "Content-Type" = "application/json"
}

try {
    $property = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_ultimate?select=id,title&limit=1" -Method Get -Headers $headers
    $propertyId = $property[0].id
    $propertyName = $property[0].title
    Write-Host "✅ Imóvel: $propertyName" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao buscar imóvel: $_" -ForegroundColor Red
    exit
}

# Buscar hóspede
Write-Host "👤 Buscando hóspede disponível..." -ForegroundColor Yellow
try {
    $guest = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/guests?select=id,first_name,last_name&limit=1" -Method Get -Headers $headers
    $guestId = $guest[0].id
    $guestName = "$($guest[0].first_name) $($guest[0].last_name)"
    Write-Host "✅ Hóspede: $guestName" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao buscar hóspede: $_" -ForegroundColor Red
    exit
}

# Criar reserva via backend
Write-Host ""
Write-Host "📋 Criando reserva via API do backend..." -ForegroundColor Yellow

$reservationData = @{
    propertyId = $propertyId
    guestId = $guestId
    checkIn = "2025-12-18"
    checkOut = "2025-12-23"
    adults = 2
    children = 0
    platform = "direct"
    notes = "Reserva de teste v1.0.103.353 - Criada via script PowerShell com autenticação"
} | ConvertTo-Json

Write-Host "📦 Dados:" -ForegroundColor Gray
Write-Host $reservationData -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "📤 Enviando para: $SUPABASE_URL/functions/v1/rendizy-server/reservations" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/rendizy-server/reservations" -Method Post -Headers $headers -Body $reservationData
    
    Write-Host ""
    Write-Host "✅✅✅ RESERVA CRIADA COM SUCESSO! ✅✅✅" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 ID da Reserva: $($response.data.id)" -ForegroundColor Cyan
    Write-Host "🏠 Imóvel: $propertyName" -ForegroundColor White
    Write-Host "👤 Hóspede: $guestName" -ForegroundColor White
    Write-Host "📅 Check-in: 18/12/2025" -ForegroundColor White
    Write-Host "📅 Check-out: 23/12/2025" -ForegroundColor White
    Write-Host "🌙 Noites: 5" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉🎉🎉 AGORA ABRA O CALENDÁRIO E VEJA SUA RESERVA! 🎉🎉🎉" -ForegroundColor Green
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
        Write-Host "Detalhes do Backend:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "💡 Verifique se o token está válido" -ForegroundColor Yellow
}
