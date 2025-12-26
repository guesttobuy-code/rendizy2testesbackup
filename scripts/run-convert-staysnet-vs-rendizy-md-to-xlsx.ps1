param(
  [Parameter(Mandatory=$false)]
  [string]$Input,
  [Parameter(Mandatory=$false)]
  [string]$Output
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($Input) { $argsList += @('--input', $Input) }
if ($Output) { $argsList += @('--output', $Output) }

node .\scripts\convert-staysnet-vs-rendizy-md-to-xlsx.mjs @argsList
