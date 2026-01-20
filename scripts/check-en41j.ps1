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
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path (Split-Path -Parent $scriptDir) $EnvFile }

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

$uri = "$supabaseUrl/rest/v1/reservations?select=id,status,cancelled_at,check_in,check_out,source_created_at,external_url,staysnet_raw&external_url=ilike.*reserve%3DEN41J*&limit=10"
$headers = @{
  apikey        = $anonKey
  Authorization = "Bearer $anonKey"
}

try {
  $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 30

  if (-not $res -or $res.Count -eq 0) {
    Write-Host "⚠️  Nenhuma reservation encontrada com reserve=EN41J" -ForegroundColor Yellow
    exit 0
  }

  $res | ConvertTo-Json -Depth 8
} catch {
  Write-Host "❌ Falha ao consultar EN41J" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
