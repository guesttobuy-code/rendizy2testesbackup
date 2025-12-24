param(
  [string]$EnvFile = ".env.local"
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

$uri = "$supabaseUrl/rest/v1/reservations?select=id&limit=1"
$headers = @{
  apikey        = $anonKey
  Authorization = "Bearer $anonKey"
  Prefer        = "count=exact"
}

try {
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
    Write-Host "⚠️  No Content-Range header found. Can't compute total." -ForegroundColor Yellow
    exit 1
  }

  if ($contentRange -match "/(\d+)$") {
    $total = [int]$Matches[1]
    Write-Host "✅ TOTAL_RESERVATIONS=$total" -ForegroundColor Green
    exit 0
  }

  Write-Host "⚠️  Could not parse Content-Range: $contentRange" -ForegroundColor Yellow
  exit 1
} catch {
  Write-Host "❌ Failed to count reservations" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
    Write-Host $_.InvocationInfo.PositionMessage -ForegroundColor DarkGray
  }
  exit 1
}
