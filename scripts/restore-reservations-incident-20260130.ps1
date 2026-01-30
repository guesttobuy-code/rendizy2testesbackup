# ============================================================================
# Script de Restauração de Reservas - Incidente 2026-01-30
# ============================================================================
# 
# PROBLEMA: A reconciliação de 29/01 às 23:58 cancelou 286 reservas
#           incorretamente, marcando-as como "deletadas na Stays.net"
#           quando na verdade elas ainda existem na API.
#
# SOLUÇÃO: Este script restaura as reservas usando os dados de staysnet_raw
#          e valida cada uma na API da Stays.net antes de restaurar.
#
# EXECUÇÃO:
# 1. Certifique-se de ter as credenciais configuradas em _rendizy-creds.local.ps1
# 2. Execute: .\scripts\restore-reservations-incident-20260130.ps1
# 3. Revise os resultados e confirme a restauração
#
# ============================================================================

# Carregar credenciais
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$credsPath = Join-Path (Split-Path -Parent $scriptPath) "_rendizy-creds.local.ps1"
if (Test-Path $credsPath) {
    . $credsPath
}

# Configurações
$env:SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE"

$STAYS_API_KEY = "a5146970"
$STAYS_API_SECRET = "bfcf4daf"
$STAYS_BASE_URL = "https://bvm.stays.net/external/v1"

$headers = @{
    apikey = $env:SUPABASE_SERVICE_ROLE_KEY
    Authorization = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

# Função para verificar reserva na Stays.net
function Test-StaysReservation {
    param([string]$ExternalId)
    
    try {
        $auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${STAYS_API_KEY}:${STAYS_API_SECRET}"))
        $url = "$STAYS_BASE_URL/booking/reservations/$ExternalId"
        $staysHeaders = @{
            Authorization = "Basic $auth"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri $url -Headers $staysHeaders -TimeoutSec 10 -ErrorAction Stop
        return @{
            Success = $true
            Exists = $true
            Type = $response.type
            CheckIn = $response.checkInDate
            CheckOut = $response.checkOutDate
            Data = $response
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            return @{ Success = $true; Exists = $false }
        }
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Função para mapear status do Stays para Rendizy
function Get-MappedStatus {
    param([string]$StaysType)
    
    $map = @{
        "booked" = "confirmed"
        "confirmed" = "confirmed"
        "new" = "confirmed"
        "pending" = "pending"
        "inquiry" = "pending"
        "cancelled" = "cancelled"
        "canceled" = "cancelled"
        "checked_in" = "checked_in"
        "checked_out" = "checked_out"
    }
    
    $lower = $StaysType.ToLower()
    if ($map.ContainsKey($lower)) { return $map[$lower] }
    return "pending"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESTAURAÇÃO DE RESERVAS - INCIDENTE 2026-01-30" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Buscar reservas canceladas pela reconciliação
Write-Host "🔍 Buscando reservas canceladas pela reconciliação..." -ForegroundColor Yellow

$uri = "$env:SUPABASE_URL/rest/v1/reservations?cancellation_reason=ilike.*reconcilia*`&select=id,external_id,staysnet_reservation_code,check_in,check_out,status,cancelled_at,staysnet_raw`&limit=500"
$cancelledReservations = Invoke-RestMethod -Uri $uri -Headers $headers

Write-Host "   Encontradas: $($cancelledReservations.Count) reservas" -ForegroundColor White

if ($cancelledReservations.Count -eq 0) {
    Write-Host ""
    Write-Host "✅ Nenhuma reserva para restaurar!" -ForegroundColor Green
    exit 0
}

# 2. Validar cada reserva na API da Stays.net
Write-Host ""
Write-Host "🔄 Validando reservas na API da Stays.net..." -ForegroundColor Yellow
Write-Host ""

$toRestore = @()
$alreadyDeleted = @()
$apiErrors = @()
$stats = @{
    Total = $cancelledReservations.Count
    Validated = 0
    ExistsInStays = 0
    DeletedInStays = 0
    Errors = 0
}

foreach ($reservation in $cancelledReservations) {
    $stats.Validated++
    $progress = [math]::Round(($stats.Validated / $stats.Total) * 100)
    Write-Progress -Activity "Validando reservas" -Status "$($stats.Validated) de $($stats.Total)" -PercentComplete $progress
    
    $result = Test-StaysReservation -ExternalId $reservation.external_id
    
    if ($result.Success) {
        if ($result.Exists) {
            $stats.ExistsInStays++
            $mappedStatus = Get-MappedStatus -StaysType $result.Type
            
            # Só restaura se o status na Stays não for cancelado
            if ($mappedStatus -ne "cancelled") {
                $toRestore += @{
                    id = $reservation.id
                    external_id = $reservation.external_id
                    code = $reservation.staysnet_reservation_code
                    check_in = $reservation.check_in
                    check_out = $reservation.check_out
                    stays_type = $result.Type
                    new_status = $mappedStatus
                }
            }
            else {
                # Reserva realmente está cancelada na Stays
                $alreadyDeleted += $reservation
            }
        }
        else {
            $stats.DeletedInStays++
            $alreadyDeleted += $reservation
        }
    }
    else {
        $stats.Errors++
        $apiErrors += @{
            id = $reservation.id
            external_id = $reservation.external_id
            error = $result.Error
        }
    }
    
    # Rate limiting
    Start-Sleep -Milliseconds 200
}

Write-Progress -Activity "Validando reservas" -Completed

# 3. Exibir resumo
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESUMO DA VALIDAÇÃO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Total analisadas:        $($stats.Total)" -ForegroundColor White
Write-Host "   Existem na Stays.net:    $($stats.ExistsInStays)" -ForegroundColor Green
Write-Host "   Deletadas na Stays.net:  $($stats.DeletedInStays)" -ForegroundColor Yellow
Write-Host "   Erros de API:            $($stats.Errors)" -ForegroundColor Red
Write-Host ""
Write-Host "   📋 Para restaurar:       $($toRestore.Count)" -ForegroundColor Cyan
Write-Host ""

if ($toRestore.Count -eq 0) {
    Write-Host "✅ Nenhuma reserva precisa ser restaurada." -ForegroundColor Green
    exit 0
}

# 4. Exibir lista de reservas a restaurar
Write-Host "Reservas que serão restauradas:" -ForegroundColor Yellow
Write-Host ""
Write-Host ("  {0,-10} {1,-26} {2,-12} {3,-12} {4,-10} {5,-10}" -f "Código", "External ID", "Check-in", "Check-out", "Stays", "Novo Status")
Write-Host ("  {0,-10} {1,-26} {2,-12} {3,-12} {4,-10} {5,-10}" -f "------", "-----------", "--------", "---------", "-----", "-----------")

foreach ($res in $toRestore | Select-Object -First 20) {
    Write-Host ("  {0,-10} {1,-26} {2,-12} {3,-12} {4,-10} {5,-10}" -f $res.code, $res.external_id, $res.check_in, $res.check_out, $res.stays_type, $res.new_status)
}

if ($toRestore.Count -gt 20) {
    Write-Host ""
    Write-Host "  ... e mais $($toRestore.Count - 20) reservas" -ForegroundColor DarkGray
}

# 5. Confirmar restauração
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
$confirm = Read-Host "Deseja restaurar $($toRestore.Count) reservas? (sim/não)"

if ($confirm -ne "sim") {
    Write-Host ""
    Write-Host "❌ Restauração cancelada pelo usuário." -ForegroundColor Red
    exit 0
}

# 6. Executar restauração
Write-Host ""
Write-Host "🔄 Restaurando reservas..." -ForegroundColor Yellow
Write-Host ""

$restored = 0
$errors = 0

foreach ($res in $toRestore) {
    try {
        $updateBody = @{
            status = $res.new_status
            cancelled_at = $null
            cancellation_reason = $null
            updated_at = (Get-Date).ToString("o")
        } | ConvertTo-Json
        
        $updateUri = "$env:SUPABASE_URL/rest/v1/reservations?id=eq.$($res.id)"
        $updateHeaders = $headers.Clone()
        $updateHeaders["Prefer"] = "return=minimal"
        
        Invoke-RestMethod -Uri $updateUri -Method Patch -Headers $updateHeaders -Body $updateBody | Out-Null
        
        $restored++
        Write-Host "  ✅ $($res.code) ($($res.external_id)) -> $($res.new_status)" -ForegroundColor Green
    }
    catch {
        $errors++
        Write-Host "  ❌ $($res.code) - Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 7. Resumo final
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESTAURAÇÃO CONCLUÍDA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Restauradas com sucesso: $restored" -ForegroundColor Green
Write-Host "   Erros na restauração:    $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "White" })
Write-Host ""

if ($apiErrors.Count -gt 0) {
    Write-Host "⚠️  Reservas com erro de API (não processadas):" -ForegroundColor Yellow
    foreach ($err in $apiErrors | Select-Object -First 10) {
        Write-Host "    - $($err.external_id): $($err.error)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "✅ Script finalizado!" -ForegroundColor Green
