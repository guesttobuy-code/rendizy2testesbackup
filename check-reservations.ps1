param(
    [string]$ServiceRoleKey = $null,
    [string]$SupabaseUrl = $null,
    [string]$AnonKey = $null
)

# Script para verificar reservas no banco de dados

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
        $value = ($line -replace "^$([regex]::Escape($Key))=", "").Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        return $value.Trim()
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
    # Frontend env convention
    $SupabaseUrl = Read-DotEnvValue -FilePath $envLocalPath -Key "VITE_SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = $env:SUPABASE_URL
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-DotEnvValue -FilePath $envSupabasePath -Key "SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-DotEnvValue -FilePath $envExamplePath -Key "SUPABASE_URL"
}

if (-not $SupabaseUrl) {
    # fallback para o projectId conhecido do projeto
    $SupabaseUrl = "https://odcgnzfremrqnvtitpcc.supabase.co"
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-DotEnvValue -FilePath $envLocalPath -Key "SUPABASE_SERVICE_ROLE_KEY"
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-DotEnvValue -FilePath $envSupabasePath -Key "SUPABASE_SERVICE_ROLE_KEY"
}

if (-not $ServiceRoleKey) {
    # alguns setups usam SERVICE_ROLE_KEY
    $ServiceRoleKey = Read-DotEnvValue -FilePath $envSupabasePath -Key "SERVICE_ROLE_KEY"
}

if (-not $ServiceRoleKey) {
    $ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
}

if (-not $AnonKey) {
    $AnonKey = Read-DotEnvValue -FilePath $envLocalPath -Key "VITE_SUPABASE_ANON_KEY"
}

if (-not $AnonKey) {
    $AnonKey = Read-DotEnvValue -FilePath $envLocalPath -Key "SUPABASE_ANON_KEY"
}

if (-not $AnonKey) {
    $AnonKey = $env:SUPABASE_ANON_KEY
}

if (-not $ServiceRoleKey) {
    Write-Host "`n⚠️  SUPABASE_SERVICE_ROLE_KEY não encontrada. Vou tentar com ANON (pode respeitar RLS e retornar menos dados)." -ForegroundColor Yellow
}

if (-not $AnonKey -and -not $ServiceRoleKey) {
    Write-Host "`n❌ Nenhuma chave encontrada (SERVICE_ROLE ou ANON)." -ForegroundColor Red
    Write-Host "   - Defina SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY em $envLocalPath" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Consultando reservas no banco de dados..." -ForegroundColor Cyan

function Invoke-ReservationsQuery {
    param(
        [string]$Key,
        [string]$KeyLabel
    )

    $headers = @{
        "apikey" = $Key
        "Authorization" = "Bearer $Key"
        "Content-Type" = "application/json"
    }

    $url = "$SupabaseUrl/rest/v1/reservations?select=id,property_id,guest_id,check_in,check_out,status,pricing_total,platform,created_at&order=created_at.desc&limit=10"
    Write-Host "Usando chave: $KeyLabel" -ForegroundColor DarkGray
    return Invoke-RestMethod -Uri $url -Headers $headers -Method Get
}

try {
    if ($ServiceRoleKey) {
        try {
            $response = Invoke-ReservationsQuery -Key $ServiceRoleKey -KeyLabel "SERVICE_ROLE"
        } catch {
            # fallback específico quando service role falha
            if ($AnonKey -and $_.Exception.Message -match "401") {
                Write-Host "`n⚠️  SERVICE_ROLE retornou 401. Tentando com ANON..." -ForegroundColor Yellow
                $response = Invoke-ReservationsQuery -Key $AnonKey -KeyLabel "ANON"
            } else {
                throw
            }
        }
    } else {
        $response = Invoke-ReservationsQuery -Key $AnonKey -KeyLabel "ANON"
    }
    
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
    exit 1
}
