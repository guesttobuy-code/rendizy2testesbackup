param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = (Get-Location).Path,

  [Parameter(Mandatory = $false)]
  [string]$DestFolder,

  [Parameter(Mandatory = $false)]
  [string]$WhitelistFile = 'docs/03-conventions/ROOT_MD_WHITELIST.txt',

  [Parameter(Mandatory = $false)]
  [int]$WhatIfPrintFirst = 25,

  [Parameter(Mandatory = $false)]
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $root

if (-not $DestFolder) {
  $date = Get-Date -Format 'yyyy-MM-dd'
  $DestFolder = Join-Path $root ("docs\\08-archive\\root-md-$date")
} else {
  # allow relative paths
  if (-not [System.IO.Path]::IsPathRooted($DestFolder)) {
    $DestFolder = Join-Path $root $DestFolder
  }
}

$wlPath = $WhitelistFile
if (-not [System.IO.Path]::IsPathRooted($wlPath)) {
  $wlPath = Join-Path $root $wlPath
}

$whitelist = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)
if (Test-Path -LiteralPath $wlPath) {
  foreach ($line in Get-Content -LiteralPath $wlPath) {
    $t = $line.Trim()
    if (-not $t) { continue }
    if ($t.StartsWith('#')) { continue }
    [void]$whitelist.Add($t)
  }
}

New-Item -ItemType Directory -Path $DestFolder -Force | Out-Null

$rootMds = Get-ChildItem -LiteralPath $root -File | Where-Object { $_.Name -match '\.md$' }
$toMove = @($rootMds | Where-Object { -not $whitelist.Contains($_.Name) })

Write-Host ("root .md files found: {0}" -f $rootMds.Count)
Write-Host ("whitelisted (root): {0}" -f $whitelist.Count)
Write-Host ("to move: {0}" -f $toMove.Count)
Write-Host ("dest: {0}" -f $DestFolder)

$printed = 0
foreach ($f in $toMove) {
  $dest = Join-Path $DestFolder $f.Name
  if (Test-Path -LiteralPath $dest) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $ext = [System.IO.Path]::GetExtension($f.Name)
    $i = 1
    do {
      $dest = Join-Path $DestFolder ("{0}__DUP__{1}{2}" -f $base, $i, $ext)
      $i++
    } while (Test-Path -LiteralPath $dest)
  }

  if ($WhatIf) {
    if ($printed -lt $WhatIfPrintFirst) {
      Write-Host ("WHATIF move: {0} -> {1}" -f $f.FullName, $dest)
      $printed++
      if ($printed -eq $WhatIfPrintFirst -and $toMove.Count -gt $WhatIfPrintFirst) {
        Write-Host ("... (more {0} moves not shown)" -f ($toMove.Count - $WhatIfPrintFirst))
      }
    }
    continue
  }

  Move-Item -LiteralPath $f.FullName -Destination $dest
}

if ($WhatIf) {
  Write-Host 'WHATIF done (no files moved).'
} else {
  Write-Host 'done.'
}
