<#
Audit which StaysNet raw JSON payloads are actually being persisted in Supabase.

- Reads SUPABASE_URL + keys from:
  - Rendizyoficial-main/.env.local
  - Rendizyoficial-main/.env
  - supabase/.env (workspace root)

This script NEVER prints secrets or PII. It only prints counts and boolean coverage.
#>

[CmdletBinding()]
param(
  [int]$Limit = 50
)

$ErrorActionPreference = 'Stop'

function Get-EnvValFromFile([string]$path, [string]$name) {
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  foreach ($line in Get-Content -LiteralPath $path) {
    $t = ($line -as [string]).Trim()
    if (-not $t) { continue }
    if ($t.StartsWith('#')) { continue }

    $m = [regex]::Match(
      $t,
      ('^\s*' + [regex]::Escape($name) + '\s*=\s*(.+?)\s*$'),
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    if (-not $m.Success) { continue }

    $val = $m.Groups[1].Value.Trim()
    $hashIndex = $val.IndexOf('#')
    if ($hashIndex -ge 0) { $val = $val.Substring(0, $hashIndex).Trim() }

    $val = $val.Trim('"').Trim("'")
    return $val
  }
  return $null
}

function Load-EnvIfMissing([string]$name, [string[]]$files, [string[]]$aliases = @()) {
  $current = [Environment]::GetEnvironmentVariable($name)
  if ($current -and $current.Trim().Length -gt 0) { return }

  foreach ($f in $files) {
    $v = Get-EnvValFromFile -path $f -name $name
    if (-not $v) {
      foreach ($a in $aliases) {
        $v = Get-EnvValFromFile -path $f -name $a
        if ($v) { break }
      }
    }
    if ($v) {
      Set-Item -Path ("Env:$name") -Value $v
      return
    }
  }
}

function Normalize-BaseUrl([string]$url) {
  if (-not $url) { return $url }
  return $url.Trim().TrimEnd('/')
}

function Has-JsonPath($obj, [string]$path) {
  if ($null -eq $obj) { return $false }
  $parts = $path.Split('.')
  $cur = $obj
  foreach ($p in $parts) {
    if ($null -eq $cur) { return $false }
    if ($cur -is [System.Collections.IDictionary]) {
      if (-not $cur.Contains($p)) { return $false }
      $cur = $cur[$p]
      continue
    }
    # PSCustomObject
    $prop = $cur.PSObject.Properties[$p]
    if ($null -eq $prop) { return $false }
    $cur = $prop.Value
  }

  if ($null -eq $cur) { return $false }
  if ($cur -is [string]) { return $cur.Trim().Length -gt 0 }
  if ($cur -is [System.Collections.IEnumerable] -and -not ($cur -is [string])) {
    try { return @($cur).Count -gt 0 } catch { return $true }
  }
  if ($cur -is [System.Collections.IDictionary]) { return $cur.Keys.Count -gt 0 }
  return $true
}

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path  # Rendizyoficial-main/scripts
$projectRoot = Split-Path -Parent $projectRoot                  # Rendizyoficial-main

$candidateEnvFiles = @(
  (Join-Path $workspaceRoot 'supabase\.env'),
  (Join-Path $projectRoot '.env.local'),
  (Join-Path $projectRoot '.env')
)

Load-EnvIfMissing -name 'SUPABASE_URL' -files $candidateEnvFiles -aliases @('VITE_SUPABASE_URL')
Load-EnvIfMissing -name 'SUPABASE_SERVICE_ROLE_KEY' -files $candidateEnvFiles -aliases @('SERVICE_ROLE_KEY')
Load-EnvIfMissing -name 'SUPABASE_ANON_KEY' -files $candidateEnvFiles -aliases @('VITE_SUPABASE_ANON_KEY')

$supabaseUrl = Normalize-BaseUrl ([string]$env:SUPABASE_URL)
$apikey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $apikey) { $apikey = $env:SUPABASE_ANON_KEY }

if (-not $supabaseUrl) { throw 'SUPABASE_URL não encontrado (defina em .env.local ou env).' }
if (-not $apikey) { throw 'SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY não encontrado.' }

# If we have a user JWT (token.txt), prefer it for Authorization to pass RLS.
$userToken = $null
foreach ($tp in @(
  (Join-Path $projectRoot 'token.txt'),
  (Join-Path $projectRoot 'rendizy-token.txt'),
  (Join-Path $workspaceRoot 'token.txt'),
  (Join-Path $workspaceRoot 'rendizy-token.txt')
)) {
  if (-not (Test-Path -LiteralPath $tp)) { continue }
  try {
    $t = (Get-Content -LiteralPath $tp -Raw).Trim()
    if ($t -and ($t.Split('.').Count -ge 3)) { $userToken = $t; break }
  } catch { }
}

$headers = @{
  'apikey' = $apikey
  'Authorization' = if ($userToken) { "Bearer $userToken" } else { "Bearer $apikey" }
  'Accept' = 'application/json'
}

# Use a fixed orgId only if it exists in your DB. We keep it optional.
$orgId = $env:RENDIZY_ORG_ID

function Invoke-Get([string]$url) {
  return Invoke-RestMethod -Uri $url -Headers $headers -Method Get
}

function Try-Get([string]$label, [string]$url) {
  try {
    return @{ ok = $true; data = (Invoke-Get $url) }
  } catch {
    return @{ ok = $false; error = $_.Exception.Message; url = $url }
  }
}

# -----------------------------------------------------------------------------
# 1) reservations.staysnet_raw
# -----------------------------------------------------------------------------
$selectReservations = 'id,guest_id,staysnet_raw,created_at'
$baseReservationsUrl = "$supabaseUrl/rest/v1/reservations?staysnet_raw=not.is.null&select=$selectReservations&limit=$Limit"
if ($orgId) { $baseReservationsUrl = "$supabaseUrl/rest/v1/reservations?organization_id=eq.$orgId&staysnet_raw=not.is.null&select=$selectReservations&limit=$Limit" }

$reservationsResult = Try-Get -label 'reservations' -url $baseReservationsUrl

$reservationCoverage = $null
$sampleReservationId = $null
$sampleGuestId = $null

if ($reservationsResult.ok) {
  $rows = @($reservationsResult.data)
  $sampleReservationId = if ($rows.Count -gt 0) { $rows[0].id } else { $null }
  $sampleGuestId = ($rows | Where-Object { $_.guest_id } | Select-Object -First 1).guest_id

  $paths = @(
    '._id',
    '.id',
    '._idclient',
    '._idlisting',
    '.checkInDate',
    '.checkOutDate',
    '.creationDate',
    '.reservationUrl',
    '.partner',
    '.partner.name',
    '.partnerCode',
    '.price',
    '.price.currency',
    '.price._f_total',
    '.price.hostingDetails',
    '.stats._f_totalPaid',
    '.guests',
    '.guestsDetails',
    '.guestsDetails.adults',
    '.guestsDetails.children',
    '.guestsDetails.infants',
    '.guestsDetails.list'
  )

  $counts = @{}
  foreach ($p in $paths) { $counts[$p] = 0 }

  foreach ($r in $rows) {
    $raw = $r.staysnet_raw
    foreach ($p in $paths) {
      $pathNoDot = $p.TrimStart('.')
      if (Has-JsonPath $raw $pathNoDot) { $counts[$p] = [int]$counts[$p] + 1 }
    }
  }

  $reservationCoverage = @{
    rows = $rows.Count
    paths = $counts
  }
}

# -----------------------------------------------------------------------------
# 2) guests.staysnet_raw (client raw)
# -----------------------------------------------------------------------------
$guestCoverage = $null
if ($sampleGuestId) {
  $selectGuest = 'id,staysnet_raw,created_at'
  $guestUrl = "$supabaseUrl/rest/v1/guests?id=eq.$sampleGuestId&select=$selectGuest&limit=1"
  $guestResult = Try-Get -label 'guest' -url $guestUrl

  if ($guestResult.ok -and @($guestResult.data).Count -gt 0) {
    $g = @($guestResult.data)[0]
    $raw = $g.staysnet_raw

    $guestPaths = @(
      '._id',
      '.name',
      '.fName',
      '.lName',
      '.email',
      '.contactEmails',
      '.phones',
      '.documents',
      '.nationality',
      '.clientSource',
      '.creationDate'
    )

    $gp = @{}
    foreach ($p in $guestPaths) {
      $gp[$p] = Has-JsonPath $raw ($p.TrimStart('.'))
    }

    $guestCoverage = @{
      sample_guest_id = $g.id
      staysnet_raw_present = ($null -ne $raw)
      paths_present = $gp
    }
  } else {
    $guestCoverage = @{ error = $guestResult.error }
  }
}

# -----------------------------------------------------------------------------
# 3) anuncios_ultimate.data.staysnet_raw (listing raw)
# -----------------------------------------------------------------------------
$listingCoverage = $null
# PostgREST jsonb contains operator (cs.)
# data=cs.{"staysnet_raw":{}}
$containsFilter = [System.Uri]::EscapeDataString('{"staysnet_raw":{}}')
$selectAnuncio = 'id,data,created_at'
$anunciosUrl = "$supabaseUrl/rest/v1/anuncios_ultimate?data=cs.$containsFilter&select=$selectAnuncio&limit=20"
if ($orgId) { $anunciosUrl = "$supabaseUrl/rest/v1/anuncios_ultimate?organization_id=eq.$orgId&data=cs.$containsFilter&select=$selectAnuncio&limit=20" }

$anunciosResult = Try-Get -label 'anuncios_ultimate' -url $anunciosUrl

if ($anunciosResult.ok) {
  $rows = @($anunciosResult.data)
  $listingPaths = @(
    '.staysnet_raw._id',
    '.staysnet_raw.id',
    '.staysnet_raw.internalName',
    '.staysnet_raw.address.city',
    '.staysnet_raw.otaChannels',
    '.staysnet_raw.status'
  )

  $counts = @{}
  foreach ($p in $listingPaths) { $counts[$p] = 0 }

  foreach ($row in $rows) {
    $data = $row.data
    foreach ($p in $listingPaths) {
      $pathNoDot = $p.TrimStart('.')
      if (Has-JsonPath $data $pathNoDot) { $counts[$p] = [int]$counts[$p] + 1 }
    }
  }

  $listingCoverage = @{
    rows = $rows.Count
    paths = $counts
  }
} else {
  $listingCoverage = @{ error = $anunciosResult.error }
}

# -----------------------------------------------------------------------------
# 4) finance raw (Stays /finance/owners)
# -----------------------------------------------------------------------------
# We don't assume a table exists. We try the most obvious candidate and report if missing.
$financeCoverage = $null
$financeTry = Try-Get -label 'staysnet_finance_raw' -url "$supabaseUrl/rest/v1/staysnet_finance_raw?select=id&limit=1"
if ($financeTry.ok) {
  $financeCoverage = @{ table = 'staysnet_finance_raw'; exists = $true; rows_sampled = @($financeTry.data).Count }
} else {
  $financeCoverage = @{ table = 'staysnet_finance_raw'; exists = $false; note = 'Nenhuma tabela raw de finance detectada via REST (ou sem permissão/RLS).'; error = $financeTry.error }
}

# -----------------------------------------------------------------------------
# Output
# -----------------------------------------------------------------------------
$out = @{
  timestamp = (Get-Date).ToString('s')
  supabase_url_set = $true
  used_service_role = [bool]$env:SUPABASE_SERVICE_ROLE_KEY
  used_user_token = [bool]$userToken
  used_org_filter = [bool]$orgId
  reservations = if ($reservationsResult.ok) { $reservationCoverage } else { @{ error = $reservationsResult.error } }
  guests = $guestCoverage
  listings = $listingCoverage
  finance = $financeCoverage
}

$reportDir = Join-Path $projectRoot '_reports'
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
$outPath = Join-Path $reportDir ("_tmp_audit_staysnet_raw_coverage_" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json')
$out | ConvertTo-Json -Depth 20 | Out-File -LiteralPath $outPath -Encoding UTF8

Write-Host ("OK: report written to " + $outPath)
Write-Host ("SUMMARY: reservations_rows=" + ($out.reservations.rows ?? 0) + ", listings_rows=" + ($out.listings.rows ?? 0))
