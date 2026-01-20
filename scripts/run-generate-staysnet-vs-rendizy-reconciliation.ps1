param(
  [string]$StaysDoc = "",
  [string]$RendizyDoc = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($StaysDoc) { $argsList += @('--staysDoc', $StaysDoc) }
if ($RendizyDoc) { $argsList += @('--rendizyDoc', $RendizyDoc) }

node .\scripts\generate-staysnet-vs-rendizy-reconciliation.mjs @argsList
