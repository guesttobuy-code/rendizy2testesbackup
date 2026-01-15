param(
  [Parameter(Mandatory = $false)][string]$RepoRoot = $(Split-Path -Parent $PSScriptRoot),
  [Parameter(Mandatory = $false)][string]$Subdomain = 'medhome',
  [Parameter(Mandatory = $false)][string]$ZipPath = '',
  [Parameter(Mandatory = $false)][string]$VercelBase = 'https://rendizy2testesbackup.vercel.app/site/',
  [Parameter(Mandatory = $false)][int]$TimeoutSec = 300
)

$ErrorActionPreference = 'Stop'

function Get-EnvValue([string]$path, [string[]]$keys) {
  foreach ($k in $keys) {
    $m = Get-Content -LiteralPath $path | Select-String -Pattern ('^' + [regex]::Escape($k) + '=') | Select-Object -First 1
    if ($m) { return $m.ToString().Split('=', 2)[1].Trim().Trim('"') }
  }
  return $null
}

function Get-RefsFromHtml([string]$html) {
  $rx = [regex]'(?:src|href)="([^"]+)"'
  $vals = foreach ($m in $rx.Matches($html)) { $m.Groups[1].Value }
  $vals | Where-Object {
    $_ -and (
      $_ -match '^assets/' -or
      $_ -match '\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|mjs|woff2?|ttf)(\?|$)'
    )
  } | Sort-Object -Unique
}

if (-not $Subdomain) { throw 'Subdomain vazio' }
$sub = $Subdomain.Trim().ToLowerInvariant()

if (-not $ZipPath) {
  $candidate = Join-Path $RepoRoot ('site bolt/' + $sub + 'Celso-v3-completo.zip')
  if (Test-Path -LiteralPath $candidate) { $ZipPath = $candidate }
}

if (-not (Test-Path -LiteralPath $ZipPath)) {
  throw "ZIP não encontrado: $ZipPath"
}

$envPathCandidates = @(
  (Join-Path $RepoRoot '.env.local'),
  (Join-Path (Join-Path $RepoRoot 'Rendizyoficial-main') '.env.local')
)
$envPath = $envPathCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $envPath) { throw "Nao achei .env.local em: $($envPathCandidates -join ', ')" }

$supabaseUrl = (Get-EnvValue $envPath @('SUPABASE_URL', 'VITE_SUPABASE_URL')).TrimEnd('/')
$serviceRole = Get-EnvValue $envPath @('SUPABASE_SERVICE_ROLE_KEY')

if (-not $supabaseUrl) { throw 'faltou SUPABASE_URL/VITE_SUPABASE_URL' }
if (-not $serviceRole) { throw 'faltou SUPABASE_SERVICE_ROLE_KEY' }

$authHeaders = @{ apikey = $serviceRole; Authorization = ('Bearer ' + $serviceRole) }

Write-Host '== 1) Query client_sites by subdomain ==' -ForegroundColor Cyan
$queryUrl = $supabaseUrl + "/rest/v1/client_sites?select=id,subdomain,organization_id,archive_path,extracted_base_url,extracted_files_count,updated_at&subdomain=eq.$sub&limit=1"
$row = Invoke-RestMethod -Method Get -Uri $queryUrl -Headers $authHeaders -TimeoutSec 60
if (-not $row -or @($row).Count -eq 0) { throw "client_sites não encontrado para subdomain=$sub" }
$row = @($row)[0]
$clientSiteId = $row.id
$orgId = $row.organization_id
Write-Host ("OK: site id=$clientSiteId orgId=$orgId")

Write-Host '== 2) Inspect ZIP (dist/index.html) ==' -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $hasIndex = ($z.Entries | Where-Object { $_.FullName -ieq 'dist/index.html' }).Count -gt 0
  $distCount = ($z.Entries | Where-Object { $_.FullName -match '^dist/' }).Count
  if (-not $hasIndex) { throw 'ZIP inválido: faltou dist/index.html' }
  Write-Host ("OK: dist/index.html presente; dist entries=$distCount")
} finally {
  $z.Dispose()
}

Write-Host '== 3) Upload ZIP to Storage (client-sites) ==' -ForegroundColor Cyan
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$baseName = [IO.Path]::GetFileName($ZipPath)
if (-not $baseName.ToLowerInvariant().EndsWith('.zip')) { $baseName = $baseName + '.zip' }
$baseName = $baseName -replace '\.zip\.zip$', '.zip'
$fileName = "${timestamp}-$baseName"
$newArchivePath = "$orgId/$fileName"
$encodedKey = ([Uri]::EscapeDataString($orgId) + '/' + [Uri]::EscapeDataString($fileName))
$uploadUrl = $supabaseUrl + '/storage/v1/object/client-sites/' + $encodedKey

$uploadHeaders = @{} + $authHeaders
$uploadHeaders['Content-Type'] = 'application/zip'
$uploadResp = Invoke-WebRequest -Method Put -Uri $uploadUrl -Headers $uploadHeaders -InFile $ZipPath -TimeoutSec $TimeoutSec
Write-Host ("Upload status: $($uploadResp.StatusCode)")

Write-Host '== 4) Patch client_sites to point to new archive and force re-extract ==' -ForegroundColor Cyan
$patchUrl = "$supabaseUrl/rest/v1/client_sites?id=eq.$clientSiteId"
$patchHeaders = @{} + $authHeaders
$patchHeaders['Content-Type'] = 'application/json'
$patchHeaders['Prefer'] = 'return=representation'
$patchBody = @{
  archive_path = $newArchivePath
  archive_url = $null
  extracted_base_url = $null
  extracted_files_count = $null
} | ConvertTo-Json -Depth 5

$updated = Invoke-RestMethod -Method Patch -Uri $patchUrl -Headers $patchHeaders -Body $patchBody -TimeoutSec 60
$updated = @($updated)[0]
Write-Host ("OK: archive_path atualizado -> $($updated.archive_path)")

Write-Host '== 5) Warm: call rendizy-public serve (forces lazy extraction) ==' -ForegroundColor Cyan
$serveUrl = "$supabaseUrl/functions/v1/rendizy-public/client-sites/serve/$sub"
$warmMaxRedirect = 20
try {
  $serveResp = Invoke-WebRequest -Method Get -Uri $serveUrl -SkipHttpErrorCheck -MaximumRedirection $warmMaxRedirect -TimeoutSec 90
} catch {
  throw "Warm failed (serveUrl=$serveUrl, maxRedirect=$warmMaxRedirect): $($_.Exception.Message)"
}

$finalWarmUrl = $null
try { $finalWarmUrl = $serveResp.BaseResponse.ResponseUri.AbsoluteUri } catch {}
Write-Host ("Warm status: $($serveResp.StatusCode) finalUrl=$finalWarmUrl")

$warmHtml = [string]$serveResp.Content
if ($serveResp.StatusCode -ne 200 -or (-not $warmHtml) -or (-not ($warmHtml -match '<!doctype\s+html|<html'))) {
  $preview = $warmHtml
  if ($preview.Length -gt 400) { $preview = $preview.Substring(0, 400) }
  throw "Warm response inesperada. status=$($serveResp.StatusCode) finalUrl=$finalWarmUrl preview=$preview"
}

Write-Host '== 6) Optional: Vercel proxy smoke (/site/<subdomain>/ + assets) ==' -ForegroundColor Cyan
if ($VercelBase) {
  $siteBase = $VercelBase.TrimEnd('/') + "/$sub"
  $indexUrl = $siteBase + "/?v=$timestamp"
  $index = Invoke-WebRequest -Uri $indexUrl -SkipHttpErrorCheck -TimeoutSec 60
  Write-Host ("Vercel HTML $($index.StatusCode) ct=$($index.Headers['Content-Type'])")
  $refs = Get-RefsFromHtml ([string]$index.Content)
  Write-Host ("Refs: $(@($refs).Count)")
  foreach ($r in $refs) {
    $u = if ($r -match '^https?://') { $r } else { $siteBase.TrimEnd('/') + '/' + $r.TrimStart('/') }
    $resp = Invoke-WebRequest -Uri $u -SkipHttpErrorCheck -TimeoutSec 60
    Write-Host ("$($resp.StatusCode) $u ct=$($resp.Headers['Content-Type'])")
  }
}

Write-Host ''
Write-Host 'DONE' -ForegroundColor Green
Write-Host ("subdomain=$sub")
Write-Host ("newArchivePath=$newArchivePath")
Write-Host ("serveUrl=$serveUrl")
