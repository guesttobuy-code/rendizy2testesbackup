param(
  [string]$Tables = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($Tables) { $argsList += @('--tables', $Tables) }

node .\scripts\generate-rendizy-schema-direct.mjs @argsList
