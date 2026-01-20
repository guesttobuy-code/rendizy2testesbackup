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
  return ($line -replace "^$([regex]::Escape($Key))=", "").Trim()
}

function Mask-Token {
  param([string]$Value)
  if (-not $Value) { return "<null>" }
  $v = $Value.Trim()
  if ($v.Length -le 8) { return "***" }
  return ($v.Substring(0,4) + "..." + $v.Substring($v.Length-4,4))
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $scriptDir $EnvFile }

Write-Host "\n🔎 Supabase REST Diagnostic" -ForegroundColor Cyan
Write-Host "Env file: $envPath" -ForegroundColor DarkGray

if (-not (Test-Path -LiteralPath $envPath)) {
  Write-Host "❌ Env file not found." -ForegroundColor Red
  exit 1
}

$supabaseUrl = Read-DotEnvValue -FilePath $envPath -Key "SUPABASE_URL"
if (-not $supabaseUrl) { $supabaseUrl = Read-DotEnvValue -FilePath $envPath -Key "VITE_SUPABASE_URL" }

$anonKey = Read-DotEnvValue -FilePath $envPath -Key "SUPABASE_ANON_KEY"
if (-not $anonKey) { $anonKey = Read-DotEnvValue -FilePath $envPath -Key "VITE_SUPABASE_ANON_KEY" }

$serviceKey = Read-DotEnvValue -FilePath $envPath -Key "SUPABASE_SERVICE_ROLE_KEY"
if (-not $serviceKey) { $serviceKey = Read-DotEnvValue -FilePath $envPath -Key "SERVICE_ROLE_KEY" }

Write-Host "\nSUPABASE_URL: " -NoNewline
if ($supabaseUrl) {
  $isLocal = ($supabaseUrl -match "localhost" -or $supabaseUrl -match "127\\.0\\.0\\.1" -or $supabaseUrl -match "54321")
  if ($isLocal) { Write-Host "LOCAL" -ForegroundColor Yellow } else { Write-Host "PRODUÇÃO" -ForegroundColor Green }
} else {
  Write-Host "<missing>" -ForegroundColor Red
}

$anonLen = if ($anonKey) { $anonKey.Trim().Length } else { 0 }
$serviceLen = if ($serviceKey) { $serviceKey.Trim().Length } else { 0 }
Write-Host "ANON key:   len=$anonLen mask=$(Mask-Token $anonKey)" -ForegroundColor DarkGray
Write-Host "SERVICE key:len=$serviceLen mask=$(Mask-Token $serviceKey)" -ForegroundColor DarkGray

if (-not $supabaseUrl) {
  Write-Host "\n❌ Missing SUPABASE_URL/VITE_SUPABASE_URL" -ForegroundColor Red
  exit 1
}

$testUrl = "$supabaseUrl/rest/v1/reservations?select=id&limit=1"
Write-Host "\nTest endpoint: $testUrl" -ForegroundColor DarkGray

function Try-Request {
  param(
    [string]$Label,
    [string]$Key
  )

  if (-not $Key) {
    Write-Host "\n[$Label] ❌ key missing" -ForegroundColor Red
    return
  }

  $headers = @{
    "apikey" = $Key
    "Authorization" = "Bearer $Key"
    "Content-Type" = "application/json"
  }

  try {
    $resp = Invoke-RestMethod -Uri $testUrl -Headers $headers -Method Get -TimeoutSec 30
    $count = if ($resp) { $resp.Count } else { 0 }
    Write-Host "\n[$Label] ✅ OK (rows=$count)" -ForegroundColor Green
  } catch {
    $msg = $_.Exception.Message
    Write-Host "\n[$Label] ❌ FAIL" -ForegroundColor Red
    Write-Host "Message: $msg" -ForegroundColor Red

    # Try to extract HTTP status and body if available
    try {
      $webResp = $_.Exception.Response
      if ($webResp -and $webResp.StatusCode) {
        Write-Host ("HTTP: " + [int]$webResp.StatusCode + " " + $webResp.StatusDescription) -ForegroundColor DarkYellow
      }
    } catch {}
  }
}

Try-Request -Label "SERVICE_ROLE" -Key $serviceKey
Try-Request -Label "ANON" -Key $anonKey

Write-Host "\n✅ Done." -ForegroundColor Cyan
