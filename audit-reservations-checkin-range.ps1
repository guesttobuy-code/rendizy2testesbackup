param(
  [string]$EnvFile = ".env.local",
  [Parameter(Mandatory=$true)][string]$From,
  [Parameter(Mandatory=$true)][string]$To,
  [switch]$OnlyImported
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

  $headers = @{
    apikey        = $anonKey
    Authorization = "Bearer $anonKey"
  }

  $filters = @(
    "check_in=gte.$From",
    "check_in=lte.$To"
  )
  if ($OnlyImported) {
    $filters += "external_id=not.is.null"
  }

  $select = "id,external_id,platform,status,check_in,check_out,created_at"
  $pageSize = 200
  $offset = 0
  $all = @()

  while ($true) {
    $qs = ( @(
        "select=$select",
        "order=check_in.asc,created_at.asc",
        "limit=$pageSize",
        "offset=$offset"
      ) + $filters ) -join "&"

    $uri = "$supabaseUrl/rest/v1/reservations?$qs"
    $page = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 60

    if ($null -eq $page) { break }

    if ($page -is [System.Array]) {
      $all += $page
      if ($page.Count -lt $pageSize) { break }
      $offset += $pageSize
      continue
    }

    # Caso retorne um único objeto (não esperado), normalize
    $all += @($page)
    break
  }

  Write-Host "✅ AUDIT_RANGE=$From..$To  rows=$($all.Count)  onlyImported=$OnlyImported" -ForegroundColor Green

  $statusCounts = $all | Group-Object status | Sort-Object Count -Descending | Select-Object Name,Count
  $platformCounts = $all | Group-Object platform | Sort-Object Count -Descending | Select-Object Name,Count

  Write-Host "\nSTATUS_COUNTS:" -ForegroundColor Cyan
  $statusCounts | Format-Table -AutoSize | Out-String | Write-Host

  Write-Host "PLATFORM_COUNTS:" -ForegroundColor Cyan
  $platformCounts | Format-Table -AutoSize | Out-String | Write-Host

  $dupes = $all | Where-Object { $_.external_id } | Group-Object external_id | Where-Object { $_.Count -gt 1 } | Sort-Object Count -Descending
  Write-Host "DUPLICATE_EXTERNAL_ID_GROUPS=$($dupes.Count)" -ForegroundColor Yellow

  if ($dupes.Count -gt 0) {
    Write-Host "\nTop duplicate external_id (max 10):" -ForegroundColor Yellow
    $dupes | Select-Object -First 10 | ForEach-Object {
      Write-Host ("  external_id={0}  count={1}" -f $_.Name, $_.Count)
    }
  }

  $first = $all | Select-Object -First 1
  $last = $all | Select-Object -Last 1
  if ($first -and $last) {
    Write-Host ("\nFIRST: check_in={0} status={1} platform={2} external_id={3}" -f $first.check_in, $first.status, $first.platform, $first.external_id) -ForegroundColor DarkGray
    Write-Host ("LAST:  check_in={0} status={1} platform={2} external_id={3}" -f $last.check_in, $last.status, $last.platform, $last.external_id) -ForegroundColor DarkGray
  }

  exit 0
} catch {
  Write-Host "❌ Failed to audit reservations" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
    Write-Host $_.InvocationInfo.PositionMessage -ForegroundColor DarkGray
  }
  exit 1
}
