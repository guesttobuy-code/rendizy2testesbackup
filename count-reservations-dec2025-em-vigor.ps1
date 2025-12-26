param(
  [string]$EnvFile = ".env.local",
  [string]$From = "2025-12-01",
  [string]$To = "2025-12-31"
)

function Read-DotEnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )
  if (-not (Test-Path -LiteralPath $FilePath)) {
    return $null
  }

  $content = Get-Content -LiteralPath $FilePath -ErrorAction Stop
  $line = $content | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
  if (-not $line) { return $null }

  $value = ($line -replace "^$([regex]::Escape($Key))=", "").Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value.Trim()
}

function Get-PostgrestCount {
  param(
    [string]$SupabaseUrl,
    [string]$AnonKey,
    [string]$Query
  )

  $uri = "$SupabaseUrl/rest/v1/reservations?$Query&select=id&limit=1"
  $headers = @{
    apikey        = $AnonKey
    Authorization = "Bearer $AnonKey"
    Prefer        = "count=exact"
  }

  $rh = $null
  $null = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 60 -ResponseHeadersVariable rh

  $contentRange = $rh['Content-Range']
  if (-not $contentRange) { $contentRange = $rh['content-range'] }
  if ($contentRange -is [System.Array]) { $contentRange = $contentRange | Select-Object -First 1 }

  if (-not $contentRange) { throw "No Content-Range header for query: $Query" }
  if ($contentRange -match "/(\d+)$") {
    return [int]$Matches[1]
  }

  throw "Could not parse Content-Range: $contentRange"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $scriptDir $EnvFile }

if (-not (Test-Path -LiteralPath $envPath)) {
  Write-Host "❌ Env file not found: $envPath" -ForegroundColor Red
  exit 1
}

$supabaseUrl = Read-DotEnvValue -FilePath $envPath -Key "VITE_SUPABASE_URL"
if (-not $supabaseUrl) { $supabaseUrl = Read-DotEnvValue -FilePath $envPath -Key "SUPABASE_URL" }

$anonKey = Read-DotEnvValue -FilePath $envPath -Key "VITE_SUPABASE_ANON_KEY"
if (-not $anonKey) { $anonKey = Read-DotEnvValue -FilePath $envPath -Key "SUPABASE_ANON_KEY" }

if (-not $supabaseUrl -or -not $anonKey) {
  Write-Host "❌ Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY in $envPath" -ForegroundColor Red
  exit 1
}

# Filters
$baseRange = "check_in=gte.$From&check_in=lte.$To"
$staysFilter = "external_url=ilike.*stays.net*"

try {
  $total = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query $baseRange
  $cancelled = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query ($baseRange + "&status=eq.cancelled")

  # “Em vigor”: normalmente exclui cancelled. Mantém pending/confirmed/checked_in/checked_out.
  $emVigorIn = "pending,confirmed,checked_in,checked_out"
  $emVigor = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query ($baseRange + "&status=in.($emVigorIn)")

  # Extra: em vigor se considerar no_show como fora
  $noShow = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query ($baseRange + "&status=eq.no_show")

  # Apenas Stays (p/ bater com o painel da Stays)
  $staysTotal = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query ($baseRange + "&" + $staysFilter)
  $staysCancelled = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query ($baseRange + "&" + $staysFilter + "&status=eq.cancelled")
  $staysEmVigor = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -Query ($baseRange + "&" + $staysFilter + "&status=in.($emVigorIn)")

  Write-Host "✅ DEC/2025 check_in range: $From .. $To" -ForegroundColor Green
  Write-Host ("ALL: TOTAL={0} | CANCELLED={1} | NO_SHOW={2} | EM_VIGOR({3})={4}" -f $total, $cancelled, $noShow, $emVigorIn, $emVigor) -ForegroundColor White
  Write-Host ("STAYS: TOTAL={0} | CANCELLED={1} | EM_VIGOR({2})={3}" -f $staysTotal, $staysCancelled, $emVigorIn, $staysEmVigor) -ForegroundColor Cyan

  exit 0
} catch {
  Write-Host "❌ Failed to count reservations (Dec/2025)" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
