param(
  [string]$From = "",
  [string]$To = "",
  [string]$DateType = "checkin",
  [string]$Types = "",
  [string]$ReservationId = "",
  [switch]$IncludeCanceled,
  [int]$Limit = 20,
  [int]$MaxPages = 10,
  [int]$Skip = 0
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($From) { $argsList += @('--from', $From) }
if ($To) { $argsList += @('--to', $To) }
if ($DateType) { $argsList += @('--dateType', $DateType) }
if ($Types) { $argsList += @('--types', $Types) }
if ($ReservationId) { $argsList += @('--reservationId', $ReservationId) }
if ($IncludeCanceled.IsPresent) { $argsList += @('--includeCanceled', '1') }
if ($Limit -gt 0) { $argsList += @('--limit', "$Limit") }
if ($MaxPages -gt 0) { $argsList += @('--maxPages', "$MaxPages") }
if ($Skip -ge 0) { $argsList += @('--skip', "$Skip") }

node .\scripts\extract-staysnet-api-reservations-direct.mjs @argsList
