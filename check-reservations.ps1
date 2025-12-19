# Script para verificar reservas no banco de dados

# Ler as variáveis de ambiente
$envContent = Get-Content .env.local
$anonKey = ($envContent | Select-String "VITE_SUPABASE_ANON_KEY" | ForEach-Object { $_ -replace "VITE_SUPABASE_ANON_KEY=", "" }).ToString().Trim()
$serviceKey = ($envContent | Select-String "SUPABASE_SERVICE_ROLE_KEY" | ForEach-Object { $_ -replace "SUPABASE_SERVICE_ROLE_KEY=", "" }).ToString().Trim()

Write-Host "🔍 Consultando reservas no banco de dados..." -ForegroundColor Cyan

# Usar service role key para bypass RLS
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/reservations?select=id,property_id,guest_id,check_in,check_out,status,pricing_total,platform,created_at&order=created_at.desc&limit=10" -Headers $headers -Method Get
    
    Write-Host "`n✅ Total de reservas encontradas: $($response.Count)" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        Write-Host "`n📋 RESERVAS NO BANCO:" -ForegroundColor Yellow
        Write-Host "=" * 80 -ForegroundColor Yellow
        
        foreach ($res in $response) {
            Write-Host "`n🔹 ID: $($res.id)" -ForegroundColor White
            Write-Host "   Property ID: $($res.property_id)" -ForegroundColor Gray
            Write-Host "   Guest ID: $($res.guest_id)" -ForegroundColor Gray
            Write-Host "   Check-in: $($res.check_in)" -ForegroundColor Cyan
            Write-Host "   Check-out: $($res.check_out)" -ForegroundColor Cyan
            Write-Host "   Status: $($res.status)" -ForegroundColor Green
            Write-Host "   Plataforma: $($res.platform)" -ForegroundColor Magenta
            Write-Host "   Total: R$ $($res.pricing_total)" -ForegroundColor Yellow
            Write-Host "   Criado em: $($res.created_at)" -ForegroundColor Gray
            Write-Host "   " + ("-" * 75) -ForegroundColor Gray
        }
    } else {
        Write-Host "`n⚠️  Nenhuma reserva encontrada no banco!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "`n❌ Erro ao consultar banco:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
