param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rootPath = (Resolve-Path -LiteralPath $RepoRoot).Path

$bad = Join-Path $rootPath 'Rendizyoficial-main\docs\08-archive\_inventory\md_refs_in_ps1.txt'
$good = Join-Path $rootPath 'docs\08-archive\_inventory\md_refs_in_ps1.txt'

if (Test-Path -LiteralPath $bad) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $good) -Force | Out-Null
  Move-Item -LiteralPath $bad -Destination $good -Force
  Write-Host ("moved inventory -> " + $good)
} else {
  Write-Host ("inventory not found (ok): " + $bad)
}

$nested = Join-Path $rootPath 'Rendizyoficial-main'
if (Test-Path -LiteralPath $nested) {
  Remove-Item -LiteralPath $nested -Recurse -Force
  Write-Host ("removed nested folder -> " + $nested)
} else {
  Write-Host ("nested folder not found (ok): " + $nested)
}
