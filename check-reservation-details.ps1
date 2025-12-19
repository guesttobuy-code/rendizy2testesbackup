# Script para verificar dados completos da reserva

$envContent = Get-Content .env.local
$serviceKey = ($envContent | Select-String "SUPABASE_SERVICE_ROLE_KEY" | ForEach-Object { $_ -replace "SUPABASE_SERVICE_ROLE_KEY=", "" }).ToString().Trim()

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

Write-Host "`n🔍 VERIFICAÇÃO COMPLETA DA RESERVA" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# 1. Buscar reserva
$reservationId = "8194661d-7eb5-44ce-9b66-70de0804466c"
$reservation = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/reservations?id=eq.$reservationId&select=*" -Headers $headers -Method Get

Write-Host "`n📋 DADOS DA RESERVA:" -ForegroundColor Yellow
$reservation[0] | Format-List

# 2. Buscar hóspede
$guestId = $reservation[0].guest_id
$guest = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/guests?id=eq.$guestId&select=*" -Headers $headers -Method Get

Write-Host "`n👤 DADOS DO HÓSPEDE:" -ForegroundColor Green
$guest[0] | Format-List

# 3. Buscar imóvel
$propertyId = $reservation[0].property_id
$property = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/anuncios_drafts?id=eq.$propertyId&select=id,data" -Headers $headers -Method Get

Write-Host "`n🏠 DADOS DO IMÓVEL:" -ForegroundColor Magenta
if ($property.Count -gt 0) {
    Write-Host "ID: $($property[0].id)" -ForegroundColor White
    Write-Host "Nome: $($property[0].data.dadosBasicos.nomeImovel)" -ForegroundColor White
    Write-Host "Endereço: $($property[0].data.endereco.rua), $($property[0].data.endereco.numero)" -ForegroundColor White
}

Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
Write-Host "✅ VERIFICAÇÃO CONCLUÍDA!" -ForegroundColor Green
