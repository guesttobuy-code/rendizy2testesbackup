# Script de Teste - Criação de Reserva via API
# v1.0.103.352

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE"

Write-Host "🔍 TESTE DE CRIAÇÃO DE RESERVA" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# ETAPA 1: Buscar imóveis disponíveis
Write-Host "📋 ETAPA 1: Buscando imóveis cadastrados..." -ForegroundColor Yellow

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/anuncios_drafts?select=id,title,data&limit=5" -Method Get -Headers $headers
    
    if ($response.Count -eq 0) {
        Write-Host "❌ Nenhum imóvel encontrado!" -ForegroundColor Red
        Write-Host "💡 Cadastre um imóvel primeiro em: http://localhost:3000/anuncios/novo" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "✅ Imóveis encontrados: $($response.Count)" -ForegroundColor Green
    $response | ForEach-Object {
        Write-Host "  🏠 $($_.title) (ID: $($_.id))" -ForegroundColor Gray
    }
    
    $propertyId = $response[0].id
    $propertyName = $response[0].title
    Write-Host ""
    Write-Host "📌 Usando imóvel: $propertyName" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Erro ao buscar imóveis: $_" -ForegroundColor Red
    exit
}

# ETAPA 2: Buscar hóspedes disponíveis
Write-Host "📋 ETAPA 2: Buscando hóspedes cadastrados..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/guests?select=id,first_name,last_name,email,phone&limit=5" -Method Get -Headers $headers
    
    if ($response.Count -eq 0) {
        Write-Host "❌ Nenhum hóspede encontrado!" -ForegroundColor Red
        Write-Host "💡 Cadastre um hóspede primeiro" -ForegroundColor Yellow
        exit
    }
    
    Write-Host "✅ Hóspedes encontrados: $($response.Count)" -ForegroundColor Green
    $response | ForEach-Object {
        $fullName = "$($_.first_name) $($_.last_name)"
        Write-Host "  👤 $fullName - $($_.phone) (ID: $($_.id))" -ForegroundColor Gray
    }
    
    $guestId = $response[0].id
    $guestName = "$($response[0].first_name) $($response[0].last_name)"
    Write-Host ""
    Write-Host "📌 Usando hóspede: $guestName" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Erro ao buscar hóspedes: $_" -ForegroundColor Red
    exit
}

# ETAPA 3: Criar reserva via API do backend
Write-Host "📋 ETAPA 3: Criando reserva via API..." -ForegroundColor Yellow

$checkIn = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
$checkOut = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

$reservationData = @{
    propertyId = $propertyId
    guestId = $guestId
    checkIn = $checkIn
    checkOut = $checkOut
    adults = 2
    children = 0
    platform = "direct"
    notes = "Reserva de teste criada via PowerShell - v1.0.103.352"
} | ConvertTo-Json

Write-Host "📦 Dados da reserva:" -ForegroundColor Gray
Write-Host $reservationData -ForegroundColor Gray
Write-Host ""

try {
    # Usar service role key para bypass de autenticação
    $backendHeaders = @{
        "apikey" = $SERVICE_ROLE_KEY
        "Authorization" = "Bearer $SERVICE_ROLE_KEY"
        "Content-Type" = "application/json"
    }
    
    Write-Host "📤 Enviando para: $SUPABASE_URL/functions/v1/rendizy-server/reservations" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/rendizy-server/reservations" -Method Post -Headers $backendHeaders -Body $reservationData
    
    Write-Host ""
    Write-Host "✅ RESERVA CRIADA COM SUCESSO!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "📌 ID da Reserva: $($response.data.id)" -ForegroundColor Cyan
    Write-Host "🏠 Imóvel: $propertyName" -ForegroundColor White
    Write-Host "👤 Hóspede: $guestName" -ForegroundColor White
    Write-Host "📅 Check-in: $checkIn" -ForegroundColor White
    Write-Host "📅 Check-out: $checkOut" -ForegroundColor White
    Write-Host "🌙 Noites: $($response.data.nights)" -ForegroundColor White
    Write-Host "💰 Total: R$ $($response.data.pricing.total)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Agora abra o calendário e veja a reserva!" -ForegroundColor Green
    Write-Host "🌐 http://localhost:3000/calendario" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO AO CRIAR RESERVA!" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host "Tipo: $($_.Exception.GetType().Name)" -ForegroundColor Yellow
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes do Backend:" -ForegroundColor Yellow
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host ($errorDetails | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "💡 Verifique os logs do backend:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/functions" -ForegroundColor Cyan
}
