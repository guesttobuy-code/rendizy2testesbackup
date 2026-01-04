param(
  [Parameter(Mandatory = $false)][string]$RepoRoot,
  [Parameter(Mandatory = $false)][string]$AnuncioId = '379893e9-de55-4554-a7ea-9ef1f813f8bf',
  [Parameter(Mandatory = $true)][double]$DailyRate,
  [Parameter(Mandatory = $false)][string]$Currency = 'BRL',
  [Parameter(Mandatory = $false)][switch]$SetLegacyKeys
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-AbsolutePath([string]$PathLike, [string]$BaseDir) {
  if ([System.IO.Path]::IsPathRooted($PathLike)) { return $PathLike }
  return (Join-Path -Path $BaseDir -ChildPath $PathLike)
}

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}

$repoAbs = Resolve-AbsolutePath -PathLike $RepoRoot -BaseDir (Get-Location).Path
Push-Location -LiteralPath $repoAbs
try {
  $envPathCandidates = @(
    (Join-Path $repoAbs '.env.local'),
    (Join-Path (Join-Path $repoAbs 'Rendizyoficial-main') '.env.local')
  )
  $envPath = $envPathCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $envPath) { throw 'Nao achei .env.local em RepoRoot nem em RepoRoot/Rendizyoficial-main' }

  function Get-EnvValue([string]$path, [string[]]$keys) {
    foreach ($k in $keys) {
      $m = Get-Content -LiteralPath $path | Select-String -Pattern ('^' + [regex]::Escape($k) + '=') | Select-Object -First 1
      if ($m) { return $m.ToString().Split('=', 2)[1].Trim() }
    }
    return $null
  }

  $supabaseUrl = (Get-EnvValue $envPath @('SUPABASE_URL','VITE_SUPABASE_URL')).TrimEnd('/')
  $serviceKey = Get-EnvValue $envPath @('SUPABASE_SERVICE_ROLE_KEY')
  if (-not $supabaseUrl) { throw 'no SUPABASE_URL/VITE_SUPABASE_URL' }
  if (-not $serviceKey) { throw 'no SUPABASE_SERVICE_ROLE_KEY' }

  if (-not [double]::IsFinite($DailyRate) -or $DailyRate -lt 0) {
    throw "DailyRate invalido: $DailyRate"
  }

  $headers = @{ apikey = $serviceKey; Authorization = ('Bearer ' + $serviceKey); 'Content-Type' = 'application/json' }

  $id = $AnuncioId
  $getUrl = "$supabaseUrl/rest/v1/anuncios_ultimate?select=id,organization_id,status,data&id=eq.$id&limit=1"
  Write-Host ("GET  " + $getUrl)
  $row = @(Invoke-RestMethod -Method Get -Uri $getUrl -Headers $headers -TimeoutSec 60) | Select-Object -First 1
  if (-not $row) { throw "anuncio not found: $id" }

  $d = $row.data

  # Ensure nested object exists
  if (-not $d.pricing) {
    try { $d | Add-Member -NotePropertyName 'pricing' -NotePropertyValue ([pscustomobject]@{}) -Force } catch {}
  }

  $daily = [double]$DailyRate
  $cur = if ($Currency) { $Currency.Trim() } else { 'BRL' }

  try { $d.pricing | Add-Member -NotePropertyName 'dailyRate' -NotePropertyValue $daily -Force } catch {}
  try { $d.pricing | Add-Member -NotePropertyName 'basePrice' -NotePropertyValue $daily -Force } catch {}
  try { $d.pricing | Add-Member -NotePropertyName 'currency' -NotePropertyValue $cur -Force } catch {}

  if ($SetLegacyKeys) {
    try { $d | Add-Member -NotePropertyName 'dailyRate' -NotePropertyValue $daily -Force } catch {}
    try { $d | Add-Member -NotePropertyName 'basePrice' -NotePropertyValue $daily -Force } catch {}
    try { $d | Add-Member -NotePropertyName 'price' -NotePropertyValue $daily -Force } catch {}
    try { $d | Add-Member -NotePropertyName 'valor_diaria' -NotePropertyValue $daily -Force } catch {}
    try { $d | Add-Member -NotePropertyName 'currency' -NotePropertyValue $cur -Force } catch {}
  }

  $patchUrl = "$supabaseUrl/rest/v1/anuncios_ultimate?id=eq.$id"
  $body = @{ data = $d } | ConvertTo-Json -Depth 50

  Write-Host ("PATCH " + $patchUrl)
  try {
    $resp = Invoke-RestMethod -Method Patch -Uri $patchUrl -Headers ($headers + @{ Prefer = 'return=representation' }) -Body $body -TimeoutSec 60
    Write-Host '(ok) updated'
    @($resp) | Select-Object -First 1 | ConvertTo-Json -Depth 6
  } catch {
    Write-Host 'ERROR:' $_.Exception.Message
    try {
      $r = $_.Exception.Response
      if ($r) {
        Write-Host ('HTTP ' + [int]$r.StatusCode)
        $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
        $txt = $sr.ReadToEnd(); $sr.Close()
        Write-Host 'BODY:'
        Write-Host $txt
      }
    } catch {}
    exit 1
  }
} finally {
  Pop-Location
}
