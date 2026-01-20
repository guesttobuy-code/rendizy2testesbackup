param(
  [string]$EnvFile = ".env.local",
  [Parameter(Mandatory=$true)][string]$From,
  [Parameter(Mandatory=$true)][string]$To,
  [switch]$OnlyImported,
  [switch]$ExcludeCancelled
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
    [Parameter(Mandatory=$true)][string]$SupabaseUrl,
    [Parameter(Mandatory=$true)][string]$AnonKey,
    [Parameter(Mandatory=$true)][string]$QueryString
  )

  $uri = "$SupabaseUrl/rest/v1/reservations?$QueryString"
  $headers = @{
    apikey        = $AnonKey
    Authorization = "Bearer $AnonKey"
    Prefer        = "count=exact"
  }

  $rh = $null
  $null = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 30 -ResponseHeadersVariable rh

  $contentRange = $null
  if ($rh) {
    $contentRange = $rh["Content-Range"]
    if (-not $contentRange) { $contentRange = $rh["content-range"] }
  }

  if ($contentRange -is [System.Array]) {
    $contentRange = $contentRange | Select-Object -First 1
  }
  if (-not $contentRange) {
    throw "No Content-Range header found."
  }

  if ($contentRange -match "/(\d+)$") {
    return [int]$Matches[1]
  }

  throw "Could not parse Content-Range: $contentRange"
}

try {
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

  $filters = @(
    "check_in=gte.$From",
    "check_in=lte.$To"
  )

  if ($OnlyImported) {
    $filters += "external_id=not.is.null"
  }

  if ($ExcludeCancelled) {
    $filters += "status=neq.cancelled"
  }

  $qs = ( @(
      "select=id",
      "limit=1"
    ) + $filters ) -join "&"

  $count = Get-PostgrestCount -SupabaseUrl $supabaseUrl -AnonKey $anonKey -QueryString $qs

  $suffix = @()
  if ($OnlyImported) { $suffix += "onlyImported" }
  if ($ExcludeCancelled) { $suffix += "excludeCancelled" }
  $tag = if ($suffix.Count -gt 0) { " (" + ($suffix -join ",") + ")" } else { "" }

  Write-Host "✅ COUNT_RESERVATIONS_CHECKIN_RANGE=$count$tag" -ForegroundColor Green
  exit 0
} catch {
  Write-Host "❌ Failed to count reservations by check_in range" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
    Write-Host $_.InvocationInfo.PositionMessage -ForegroundColor DarkGray
  }
  exit 1
}
