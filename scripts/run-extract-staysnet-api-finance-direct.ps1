param(
  [string]$From = "",
  [string]$To = "",
  [string]$PaymentProvidersStatus = "",
  [int]$SampleOwnerDetails = 2,
  [int]$SampleReservationPayments = 5,
  [string]$ReservationsExportDir = "",
  [string]$ReservationsRawPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$argsList = @()
if ($From) { $argsList += @('--from', $From) }
if ($To) { $argsList += @('--to', $To) }
if ($PaymentProvidersStatus) { $argsList += @('--paymentProvidersStatus', $PaymentProvidersStatus) }
if ($SampleOwnerDetails -ge 0) { $argsList += @('--sampleOwnerDetails', "$SampleOwnerDetails") }
if ($SampleReservationPayments -ge 0) { $argsList += @('--sampleReservationPayments', "$SampleReservationPayments") }
if ($ReservationsExportDir) { $argsList += @('--reservationsExportDir', $ReservationsExportDir) }
if ($ReservationsRawPath) { $argsList += @('--reservationsRawPath', $ReservationsRawPath) }

node .\scripts\extract-staysnet-api-finance-direct.mjs @argsList
