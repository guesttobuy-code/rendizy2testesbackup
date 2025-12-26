param(
  [string]$ReservationsDir = "",
  [string]$ListingsDir = "",
  [string]$ClientsDir = "",
  [string]$FinanceDir = "",
  [string]$IncludeReservation = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($ReservationsDir) { $argsList += @('--reservationsDir', $ReservationsDir) }
if ($ListingsDir) { $argsList += @('--listingsDir', $ListingsDir) }
if ($ClientsDir) { $argsList += @('--clientsDir', $ClientsDir) }
if ($FinanceDir) { $argsList += @('--financeDir', $FinanceDir) }
if ($IncludeReservation) { $argsList += @('--includeReservation', $IncludeReservation) }

node .\scripts\generate-staysnet-api-schema-consolidated.mjs @argsList
