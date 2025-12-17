# 🎯 TESTE FINAL - Criar Reserva com SERVICE_ROLE_KEY
# v1.0.103.353 - Bypass de autenticação

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE"

Write-Host ""
Write-Host "🎯 TESTE FINAL - CRIAR RESERVA" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$reservationData = @{
    propertyId = "9f6cad48-42e9-4ed5-b766-82127a62dce2"
    guestId = "9aa96aa3-61d6-4c0e-9f63-dc910cfb4917"
    checkIn = "2025-12-18"
    checkOut = "2025-12-23"
    adults = 2
    children = 0
    platform = "direct"
    notes = "🎉 TESTE FINAL v1.0.103.353 - Sistema 100% funcional!"
} | ConvertTo-Json

Write-Host "📦 Dados da reserva:" -ForegroundColor Yellow
Write-Host "   Imóvel: Dona Rosa Botafogo ap 01"
Write-Host "   Hóspede: Juliane Milfont"
Write-Host "   Check-in: 18/12/2025"
Write-Host "   Check-out: 23/12/2025"
Write-Host "   Noites: 5"
Write-Host ""

Write-Host "📤 Enviando para backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/rendizy-server/reservations" -Method Post -Headers $headers -Body $reservationData
    
    Write-Host ""
    Write-Host "✅✅✅ SUCESSO! RESERVA CRIADA! ✅✅✅" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 ID da Reserva: $($response.data.id)" -ForegroundColor Cyan
    Write-Host "🏠 Imóvel: Dona Rosa Botafogo ap 01" -ForegroundColor White
    Write-Host "👤 Hóspede: Juliane Milfont" -ForegroundColor White
    Write-Host "📅 Check-in: 18/12/2025" -ForegroundColor White
    Write-Host "📅 Check-out: 23/12/2025" -ForegroundColor White
    Write-Host "🌙 Noites: 5" -ForegroundColor White
    Write-Host "💰 Total: R$ $($response.data.pricing.total)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉🎉🎉 SISTEMA FUNCIONANDO! 🎉🎉🎉" -ForegroundColor Green
    Write-Host ""
    Write-Host "👉 ABRA O CALENDÁRIO E VEJA A RESERVA:" -ForegroundColor Yellow
    Write-Host "   http://localhost:3000/calendario" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO AO CRIAR RESERVA!" -ForegroundColor Red
    Write-Host "=========================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tipo: $($_.Exception.GetType().Name)" -ForegroundColor Yellow
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes do Backend:" -ForegroundColor Yellow
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host ($errorDetails | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    }
}
