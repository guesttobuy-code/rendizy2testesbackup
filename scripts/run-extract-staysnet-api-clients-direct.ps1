param(
  [string]$Name = "",
  [string]$Email = "",
  [string]$Phone = "",
  [string]$HasReservations = "",
  [string]$ReservationFilter = "",
  [string]$ReservationFrom = "",
  [string]$ReservationTo = "",
  [string]$SortBy = "",
  [string]$Sort = "",
  [int]$Limit = 20,
  [int]$MaxPages = 10,
  [int]$Skip = 0,
  [int]$SampleDetails = 0
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($Name) { $argsList += @('--name', $Name) }
if ($Email) { $argsList += @('--email', $Email) }
if ($Phone) { $argsList += @('--phone', $Phone) }
if ($HasReservations) { $argsList += @('--hasReservations', $HasReservations) }
if ($ReservationFilter) { $argsList += @('--reservationFilter', $ReservationFilter) }
if ($ReservationFrom) { $argsList += @('--reservationFrom', $ReservationFrom) }
if ($ReservationTo) { $argsList += @('--reservationTo', $ReservationTo) }
if ($SortBy) { $argsList += @('--sortBy', $SortBy) }
if ($Sort) { $argsList += @('--sort', $Sort) }
if ($Limit -gt 0) { $argsList += @('--limit', "$Limit") }
if ($MaxPages -gt 0) { $argsList += @('--maxPages', "$MaxPages") }
if ($Skip -ge 0) { $argsList += @('--skip', "$Skip") }
if ($SampleDetails -ge 0) { $argsList += @('--sampleDetails', "$SampleDetails") }

node .\scripts\extract-staysnet-api-clients-direct.mjs @argsList
