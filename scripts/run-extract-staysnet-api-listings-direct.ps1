param(
  [string]$Status = "",
  [string]$GroupId = "",
  [string]$Rel = "",
  [string]$PropertyId = "",
  [int]$Limit = 20,
  [int]$MaxPages = 10,
  [int]$Skip = 0,
  [int]$SampleRooms = 0
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($Status) { $argsList += @('--status', $Status) }
if ($GroupId) { $argsList += @('--groupId', $GroupId) }
if ($Rel) { $argsList += @('--rel', $Rel) }
if ($PropertyId) { $argsList += @('--propertyId', $PropertyId) }
if ($Limit -gt 0) { $argsList += @('--limit', "$Limit") }
if ($MaxPages -gt 0) { $argsList += @('--maxPages', "$MaxPages") }
if ($Skip -ge 0) { $argsList += @('--skip', "$Skip") }
if ($SampleRooms -ge 0) { $argsList += @('--sampleRooms', "$SampleRooms") }

node .\scripts\extract-staysnet-api-listings-direct.mjs @argsList
