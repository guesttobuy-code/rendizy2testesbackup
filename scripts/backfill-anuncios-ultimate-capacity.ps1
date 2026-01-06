param(
  [Parameter(Mandatory = $false)][string]$RepoRoot,
  [Parameter(Mandatory = $false)][string]$AnuncioId = '379893e9-de55-4554-a7ea-9ef1f813f8bf'
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

  $headers = @{ apikey = $serviceKey; Authorization = ('Bearer ' + $serviceKey); 'Content-Type' = 'application/json' }

  function Get-ObjProp($obj, [string]$name) {
    if ($null -eq $obj) { return $null }
    try {
      $p = $obj.PSObject.Properties[$name]
      if ($p) { return $p.Value }
    } catch {}
    return $null
  }

  function MaxGuestsPerBedKey([string]$key) {
    $k = if ($null -ne $key) { [string]$key } else { '' }
    $k = $k.ToLowerInvariant()
    if (-not $k) { return 0 }
    if ($k.Contains('solteiro')) { return 1 }
    if ($k.Contains('berco') -or $k.Contains('berço')) { return 1 }
    if ($k.Contains('beliche')) { return 2 }
    if ($k.Contains('sofa') -or $k.Contains('sofá')) { return 2 }
    if ($k.Contains('king') -or $k.Contains('queen')) { return 2 }
    if ($k.Contains('casal') -or $k.Contains('dupla') -or $k.Contains('double')) { return 2 }
    if ($k.Contains('colchao') -or $k.Contains('colchão')) { return 1 }
    return 1
  }

  function NumberOrZero($v) {
    try {
      $n = [double]$v
      if ([double]::IsNaN($n) -or [double]::IsInfinity($n)) { return 0 }
      return [int][math]::Floor($n)
    } catch {
      return 0
    }
  }

  function ComputeMaxGuestsFromBedsMap($beds) {
    $total = 0
    if (-not $beds) { return 0 }

    if ($beds -is [System.Collections.IDictionary]) {
      foreach ($k in $beds.Keys) {
        $count = NumberOrZero $beds[$k]
        if ($count -le 0) { continue }
        $per = MaxGuestsPerBedKey ([string]$k)
        $total += ($count * $per)
      }
      return $total
    }

    # Typical Supabase REST JSON object comes as PSCustomObject.
    try {
      foreach ($p in $beds.PSObject.Properties) {
        $k = $p.Name
        $count = NumberOrZero $p.Value
        if ($count -le 0) { continue }
        $per = MaxGuestsPerBedKey ([string]$k)
        $total += ($count * $per)
      }
    } catch {
      return 0
    }
    return $total
  }

  function ComputeMaxGuestsFromData($d) {
    $best = 0
    $topBeds = Get-ObjProp $d 'beds'
    $best = [math]::Max($best, (ComputeMaxGuestsFromBedsMap $topBeds))

    $rooms = @()
    $roomsVal = Get-ObjProp $d 'rooms'
    if ($roomsVal) { $rooms = @($roomsVal) }
    $sumRooms = 0
    foreach ($r in $rooms) {
      $rb = Get-ObjProp $r 'beds'
      $sumRooms += (ComputeMaxGuestsFromBedsMap $rb)
    }
    $best = [math]::Max($best, $sumRooms)
    return $best
  }

  $id = $AnuncioId
  $getUrl = "$supabaseUrl/rest/v1/properties?select=id,organization_id,status,data&id=eq.$id&limit=1"
  Write-Host ("GET  " + $getUrl)
  $row = @(Invoke-RestMethod -Method Get -Uri $getUrl -Headers $headers -TimeoutSec 60) | Select-Object -First 1
  if (-not $row) { throw "anuncio not found: $id" }

  $d = $row.data
  $derived = ComputeMaxGuestsFromData $d
  $explicit = NumberOrZero (Get-ObjProp $d 'guests')
  if ($explicit -le 0) { $explicit = NumberOrZero (Get-ObjProp $d 'maxGuests') }
  if ($explicit -le 0) { $explicit = NumberOrZero (Get-ObjProp $d 'max_guests') }

  $newMax = [math]::Max($explicit, $derived)

  $roomsVal = Get-ObjProp $d 'rooms'
  $roomsCount = if ($roomsVal) { @($roomsVal).Count } else { 0 }
  $bedrooms = NumberOrZero (Get-ObjProp $d 'bedrooms')
  if ($bedrooms -le 0 -and $roomsCount -gt 0) { $bedrooms = $roomsCount }

  Write-Host ("derived maxGuests=$derived explicit=$explicit -> set=$newMax bedrooms=$bedrooms")

  if ($newMax -le 0) {
    Write-Host '(warn) maxGuests derivado = 0; nada a fazer.'
    exit 0
  }

  $needsUpdate = $false
  if ($explicit -ne $newMax) { $needsUpdate = $true }
  if ($bedrooms -gt 0 -and (NumberOrZero (Get-ObjProp $d 'bedrooms')) -ne $bedrooms) { $needsUpdate = $true }

  if (-not $needsUpdate) {
    Write-Host '(ok) anuncio_ultimate já está consistente; sem update.'
    exit 0
  }

  # Mutate data object
  try { $d | Add-Member -NotePropertyName 'guests' -NotePropertyValue $newMax -Force } catch {}
  try { $d | Add-Member -NotePropertyName 'maxGuests' -NotePropertyValue $newMax -Force } catch {}
  try { $d | Add-Member -NotePropertyName 'max_guests' -NotePropertyValue $newMax -Force } catch {}
  try { $d | Add-Member -NotePropertyName 'bedrooms' -NotePropertyValue $bedrooms -Force } catch {}

  $patchUrl = "$supabaseUrl/rest/v1/properties?id=eq.$id"
  $body = @{ data = $d } | ConvertTo-Json -Depth 50

  Write-Host ("PATCH " + $patchUrl)
  try {
    $resp = Invoke-RestMethod -Method Patch -Uri $patchUrl -Headers ($headers + @{ Prefer = 'return=representation' }) -Body $body -TimeoutSec 60
    Write-Host '(ok) updated'
    @($resp) | Select-Object -First 1 | ConvertTo-Json -Depth 5
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
