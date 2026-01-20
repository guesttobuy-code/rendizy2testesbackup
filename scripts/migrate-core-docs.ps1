param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath $RepoRoot).Path

function Move-IfExists {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To
  )

  if (-not (Test-Path -LiteralPath $From)) {
    Write-Host ("skip (missing): " + $From)
    return
  }

  New-Item -ItemType Directory -Path (Split-Path -Parent $To) -Force | Out-Null
  Move-Item -LiteralPath $From -Destination $To -Force
  Write-Host ("moved: " + $From + " -> " + $To)
}

Move-IfExists -From (Join-Path $root 'ARQUITETURA_ANUNCIO_ULTIMATE.md') -To (Join-Path $root 'docs\02-architecture\ARQUITETURA_ANUNCIO_ULTIMATE.md')
Move-IfExists -From (Join-Path $root 'LOGIN_VITORIAS_CONSOLIDADO.md') -To (Join-Path $root 'docs\05-operations\LOGIN_VITORIAS_CONSOLIDADO.md')
Move-IfExists -From (Join-Path $root 'Ligando os motores único.md') -To (Join-Path $root 'docs\resumos\LIGANDO_OS_MOTORES_UNICO.md')
