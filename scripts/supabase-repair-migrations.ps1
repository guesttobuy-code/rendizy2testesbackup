Param(
  [int]$ChunkSize = 8,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$migrationsDir = Join-Path $repoRoot 'supabase\migrations'
if (-not (Test-Path $migrationsDir)) {
  throw "Migrations dir not found: $migrationsDir"
}

$excludeBaseName = '20251225_add_reservations_staysnet_raw'

$baseNames = Get-ChildItem $migrationsDir -Filter '*.sql' |
  ForEach-Object { $_.BaseName } |
  Where-Object { $_ -ne $excludeBaseName } |
  Sort-Object -Unique

if (-not $baseNames -or $baseNames.Count -eq 0) {
  throw 'No migration files found to repair.'
}

Write-Host "Found $($baseNames.Count) migrations to mark as applied (excluding $excludeBaseName)."

for ($i = 0; $i -lt $baseNames.Count; $i += $ChunkSize) {
  $end = [Math]::Min($i + $ChunkSize - 1, $baseNames.Count - 1)
  $chunk = $baseNames[$i..$end]

  $display = ($chunk -join ' ')
  Write-Host "Repair chunk $i-$end ($($chunk.Count) items): $display"

  if ($DryRun) {
    continue
  }

  & npx supabase migration repair --status applied @chunk --yes
  if ($LASTEXITCODE -ne 0) {
    throw "supabase migration repair failed for chunk $i-$end (exit $LASTEXITCODE)"
  }
}

Write-Host 'Done.'
