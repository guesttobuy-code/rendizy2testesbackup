param(
  [int]$IssueIndex = 0,
  [int]$Limit = 100,
  [int]$Offset = 0,
  [int]$DaysPadding = 2,
  [int]$FallbackDaysBack = 30,
  [int]$FallbackDaysForward = 30,
  [string]$ProjectRef = "odcgnzfremrqnvtitpcc",
  [string]$AnonKey = "",
  [string]$SupabaseUrl = "",
  [string]$RendizyToken = "",
  [string]$EnvFile = ".env.local",
  [string]$RendizyTokenFile = "rendizy-token.txt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FirstNonEmptyLine([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  $lines = Get-Content -LiteralPath $Path -ErrorAction Stop
  foreach ($l in $lines) {
    $t = ($l -as [string]).Trim()
    if (-not $t) { continue }
    if ($t.StartsWith('#')) { continue }
    if ($t.StartsWith('//')) { continue }
    return $t.Trim('"').Trim("'")
  }
  return ""
}

function Resolve-RendizyTokenFromText([string]$raw) {
  if (-not $raw) { return "" }

  # 1) Cookie-like: rendizy-token=...
  $m = [regex]::Match($raw, "rendizy-token\s*=\s*([^;\s`"']+)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value.Trim('"').Trim("'") }

  # 2) Key/value: rendizy-token: ... OR rendizy-token=...
  $m = [regex]::Match($raw, "rendizy-token\s*[:=]\s*([^\s`"';]+)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value.Trim('"').Trim("'") }

  # 3) Header-like: X-Auth-Token: ...
  $m = [regex]::Match($raw, "X-Auth-Token\s*[:=]\s*([^\s`"';]+)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value.Trim('"').Trim("'") }

  # 4) JSON-ish: { "rendizyToken": "..." } or { "rendizy-token": "..." }
  $m = [regex]::Match($raw, '"rendizy(?:-token|Token)"\s*:\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value.Trim() }

  return ""
}

function Resolve-RendizyTokenFromFiles([string[]]$Paths) {
  foreach ($p in $Paths) {
    if (-not $p) { continue }
    if (-not (Test-Path -LiteralPath $p)) { continue }
    try {
      $raw = Get-Content -LiteralPath $p -Raw -ErrorAction Stop
      $tok = Resolve-RendizyTokenFromText -raw $raw
      if ($tok) {
        return @($tok, $p)
      }

      $lineTok = Get-FirstNonEmptyLine -Path $p
      if ($lineTok) {
        return @($lineTok, $p)
      }
    } catch {
      continue
    }
  }
  return @("", "")
}

function Get-DotEnvValue([string]$Path, [string]$Key) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  $lines = Get-Content -LiteralPath $Path -ErrorAction Stop
  foreach ($l in $lines) {
    $t = ($l -as [string]).Trim()
    if (-not $t) { continue }
    if ($t.StartsWith('#')) { continue }
    if ($t -notmatch '^([^=]+)=(.*)$') { continue }
    $k = $matches[1].Trim()
    if ($k -ne $Key) { continue }
    $v = $matches[2].Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
    if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
    return $v
  }
  return ""
}

function Invoke-RendizyJson(
  [string]$Method,
  [string]$Url,
  [hashtable]$Headers,
  $BodyObj = $null
) {
  $params = @{
    Method  = $Method
    Uri     = $Url
    Headers = $Headers
  }

  if ($null -ne $BodyObj) {
    $params["ContentType"] = "application/json"
    $params["Body"] = ($BodyObj | ConvertTo-Json -Depth 20)
  }

  try {
    return Invoke-RestMethod @params
  } catch {
    $resp = $_.Exception.Response

    # PowerShell 7+: HttpResponseMessage
    if ($resp -is [System.Net.Http.HttpResponseMessage]) {
      $statusCode = [int]$resp.StatusCode
      $reason = [string]$resp.ReasonPhrase
      $bodyText = ''
      try {
        if ($resp.Content) {
          $bodyText = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        }
      } catch {
        $bodyText = ''
      }

      throw "HTTP error calling $Url`nStatus: $statusCode $reason`nBody: $bodyText"
    }

    # Windows PowerShell: WebResponse-like
    if ($null -ne $resp -and ($resp | Get-Member -Name 'GetResponseStream' -MemberType Method -ErrorAction SilentlyContinue)) {
      try {
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $text = $sr.ReadToEnd()
        throw "HTTP error calling $Url`nStatus: $($resp.StatusCode) $($resp.StatusDescription)`nBody: $text"
      } catch {
        throw
      }
    }

    throw
  }
}

# Resolve Supabase URL / Anon Key
if (-not $SupabaseUrl) {
  $SupabaseUrl = (Get-DotEnvValue -Path $EnvFile -Key "SUPABASE_URL")
  if (-not $SupabaseUrl) { $SupabaseUrl = (Get-DotEnvValue -Path $EnvFile -Key "VITE_SUPABASE_URL") }
}
if (-not $SupabaseUrl) {
  $SupabaseUrl = "https://$ProjectRef.supabase.co"
}

if (-not $AnonKey) {
  $AnonKey = (Get-DotEnvValue -Path $EnvFile -Key "SUPABASE_ANON_KEY")
  if (-not $AnonKey) { $AnonKey = (Get-DotEnvValue -Path $EnvFile -Key "VITE_SUPABASE_ANON_KEY") }
}

if (-not $RendizyToken) {
  $candidateFiles = @(
    $RendizyTokenFile,
    ".\\rendizy-token.txt",
    "..\\rendizy-token.txt",
    "..\\get-full-token.txt",
    ".\\get-full-token.txt",
    "..\\get-token.txt",
    ".\\get-token.txt"
  ) | Select-Object -Unique

  $resolved = Resolve-RendizyTokenFromFiles -Paths $candidateFiles
  $RendizyToken = [string]$resolved[0]
  $tokenSource = [string]$resolved[1]
}

if (-not $AnonKey) { throw "Anon key not found. Set -AnonKey or ensure $EnvFile contains VITE_SUPABASE_ANON_KEY." }
if (-not $RendizyToken) { throw "Rendizy token not found. Set -RendizyToken or ensure $RendizyTokenFile exists." }

if ($tokenSource) {
  Write-Host ("ℹ️  Using rendizy token from: {0} (len={1})" -f $tokenSource, $RendizyToken.Length) -ForegroundColor DarkGray
}

$headers = @{
  "Authorization" = "Bearer $AnonKey"
  "apikey"        = $AnonKey
  "X-Auth-Token"   = $RendizyToken
  "Accept"         = "application/json"
}

$basePath = "$SupabaseUrl/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import"
$issuesUrlOpen = "$basePath/issues?status=open&limit=$Limit&offset=$Offset"

Write-Host "➡️  Listing open StaysNet import issues..." -ForegroundColor Cyan
$issuesResp = Invoke-RendizyJson -Method "GET" -Url $issuesUrlOpen -Headers $headers

if (-not $issuesResp.success) {
  throw "Issues endpoint returned success=false: $($issuesResp | ConvertTo-Json -Depth 10)"
}

$issues = @()
if ($issuesResp.issues) { $issues = @($issuesResp.issues) }
Write-Host ("✅ Open issues: {0}" -f $issues.Count) -ForegroundColor Green

if ($issues.Count -eq 0) {
  Write-Host "Nothing to reprocess. Exiting." -ForegroundColor Yellow
  exit 0
}

if ($IssueIndex -lt 0 -or $IssueIndex -ge $issues.Count) {
  throw "Invalid -IssueIndex $IssueIndex. Must be between 0 and $($issues.Count - 1)."
}

$issue = $issues[$IssueIndex]
$issueId = [string]$issue.id
$listingId = [string]$issue.listing_id
$resCode = [string]$issue.reservation_code
$checkInRaw = [string]$issue.check_in
$checkOutRaw = [string]$issue.check_out

Write-Host "➡️  Selected issue:" -ForegroundColor Cyan
Write-Host ("   id={0} reservation_code={1} listing_id={2} status={3}" -f $issueId, $resCode, $listingId, $issue.status)

if (-not $listingId) {
  throw "Issue has no listing_id; cannot target reimport." 
}

function Parse-DateOrEmpty([string]$s) {
  if (-not $s) { return $null }
  $t = $s.Trim()
  if (-not $t) { return $null }
  try {
    return [DateTime]::Parse($t)
  } catch {
    return $null
  }
}

$checkIn = Parse-DateOrEmpty $checkInRaw
$checkOut = Parse-DateOrEmpty $checkOutRaw

if ($null -ne $checkIn) {
  $from = $checkIn.AddDays(-1 * $DaysPadding)
} else {
  $from = (Get-Date).AddDays(-1 * $FallbackDaysBack)
}
if ($null -ne $checkOut) {
  $to = $checkOut.AddDays($DaysPadding)
} else {
  $to = (Get-Date).AddDays($FallbackDaysForward)
}

$fromStr = $from.ToString('yyyy-MM-dd')
$toStr = $to.ToString('yyyy-MM-dd')

Write-Host ("➡️  Reimporting reservations for listing_id={0} (from={1} to={2})" -f $listingId, $fromStr, $toStr) -ForegroundColor Cyan

$importUrl = "$basePath/reservations"
$importBody = @{
  selectedPropertyIds = @($listingId)
  from = $fromStr
  to = $toStr
  dateType = "checkin"
  limit = 20
  maxPages = 5
  expandDetails = 1
}

$importResp = Invoke-RendizyJson -Method "POST" -Url $importUrl -Headers $headers -BodyObj $importBody

Write-Host "✅ Import call finished (response keys):" -ForegroundColor Green
$importResp.PSObject.Properties.Name | Sort-Object | ForEach-Object { Write-Host "   - $_" }

# Re-fetch the issue status (use status=all and search by id)
$issuesUrlAll = "$basePath/issues?status=all&limit=200&offset=0"
Write-Host "➡️  Re-checking issue status..." -ForegroundColor Cyan
$allResp = Invoke-RendizyJson -Method "GET" -Url $issuesUrlAll -Headers $headers
if (-not $allResp.success) {
  throw "Issues endpoint (all) returned success=false: $($allResp | ConvertTo-Json -Depth 10)"
}

$allIssues = @()
if ($allResp.issues) { $allIssues = @($allResp.issues) }
$match = $allIssues | Where-Object { [string]$_.id -eq $issueId } | Select-Object -First 1

if ($null -eq $match) {
  Write-Host "🎉 Issue no longer found in last 200 issues (may have been deleted or outside window)." -ForegroundColor Green
  exit 0
}

Write-Host ("✅ Issue after reimport: id={0} status={1} resolved_at={2}" -f $match.id, $match.status, $match.resolved_at)

if ([string]$match.status -eq "resolved") {
  Write-Host "🎉 SUCCESS: Orphan reservation issue resolved." -ForegroundColor Green
  exit 0
}

Write-Host "⚠️  Issue still open. Likely cause: anuncio mapping still missing (listing_id not found in anuncios_ultimate externalIds/raw/codigo) OR reservation not within date window." -ForegroundColor Yellow
Write-Host "   Next: import properties for this listing_id, then rerun this script." -ForegroundColor Yellow
