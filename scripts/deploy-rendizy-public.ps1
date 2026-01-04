param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot,

  [Parameter(Mandatory = $false)]
  [string]$ProjectRef = 'odcgnzfremrqnvtitpcc',

  [Parameter(Mandatory = $false)]
  [string]$FunctionName = 'rendizy-public',

  [Parameter(Mandatory = $false)]
  [string]$LogFile,

  [Parameter(Mandatory = $false)]
  [int]$TimeoutSec = 600,

  [Parameter(Mandatory = $false)]
  [switch]$CliDebug
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Notes (why this script exists):
# - The Supabase CLI can hang or take a long time on Windows when deploying Edge Functions.
# - We run the deploy in `cmd.exe` with output redirected to a log file.
# - If the process times out but the log shows "Deployed Functions", we treat it as success.
#   (This avoids false negatives when the deploy succeeded but the CLI didn't terminate.)

function Resolve-AbsolutePath([string]$PathLike, [string]$BaseDir) {
  if ([System.IO.Path]::IsPathRooted($PathLike)) { return $PathLike }
  return (Join-Path -Path $BaseDir -ChildPath $PathLike)
}

if (-not $RepoRoot) {
  # Repo root is parent of this scripts folder.
  $RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
}

$repoAbs = Resolve-AbsolutePath -PathLike $RepoRoot -BaseDir (Get-Location).Path
if (-not (Test-Path -LiteralPath $repoAbs)) {
  throw "RepoRoot not found: $repoAbs"
}

if (-not $LogFile) {
  # Default to repo root to make it easy to find.
  $LogFile = (Join-Path $repoAbs '_tmp_deploy_rendizy_public.log')
}

Push-Location -LiteralPath $repoAbs
try {
  $logAbs = Resolve-AbsolutePath -PathLike $LogFile -BaseDir (Get-Location).Path

  Write-Host "== deploy edge function =="
  Write-Host ("repo: {0}" -f (Get-Location).Path)
  Write-Host ("project-ref: {0}" -f $ProjectRef)
  Write-Host ("function: {0}" -f $FunctionName)
  Write-Host ("log: {0}" -f $logAbs)

  $logDir = Split-Path -Parent $logAbs
  if ($logDir -and -not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  }

  if (Test-Path -LiteralPath $logAbs) {
    Remove-Item -LiteralPath $logAbs -Force -ErrorAction SilentlyContinue
  }

  # Ensure log file exists even if CLI prints nothing.
  New-Item -ItemType File -Path $logAbs -Force | Out-Null

  if ($TimeoutSec -lt 30) { $TimeoutSec = 30 }

  # Use cmd.exe redirection to avoid PowerShell pipeline hangs (Tee-Object) and guarantee the process terminates.
  $cmdParts = @(
    'npx', '-y', 'supabase@latest',
    'functions', 'deploy', $FunctionName,
    '--project-ref', $ProjectRef,
    '--use-api'
  )
  if ($CliDebug) { $cmdParts += '--debug' }

  # Build command line for cmd.exe with safe quoting for the log path.
  $cmdLine = ($cmdParts -join ' ') + (' 1> "' + $logAbs + '" 2>&1')

  $p = Start-Process -FilePath "cmd.exe" -ArgumentList @('/d','/s','/c', $cmdLine) -NoNewWindow -PassThru
  $done = $false
  try {
    $done = Wait-Process -Id $p.Id -Timeout $TimeoutSec -ErrorAction SilentlyContinue
  } catch {
    $done = $false
  }
  if (-not $done) {
    try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}

    $logText = ''
    try { $logText = Get-Content -LiteralPath $logAbs -Raw -ErrorAction SilentlyContinue } catch {}
    if ($logText -match '(?m)^Deployed Functions on project\b|(?m)^Deployed Functions\b') {
      Add-Content -LiteralPath $logAbs -Value "`n(timeout) deploy exceeded ${TimeoutSec}s and was terminated, but log indicates deploy succeeded."
      Write-Host '(warn) deploy hit timeout, but log indicates success'
      Write-Host ("see log: {0}" -f $logAbs)
      exit 0
    }

    Add-Content -LiteralPath $logAbs -Value "`n(timeout) deploy exceeded ${TimeoutSec}s and was terminated."
    Write-Host ("(fail) deploy timeout after {0}s" -f $TimeoutSec)
    Write-Host ("see log: {0}" -f $logAbs)
    exit 124
  }

  $exitCode = $p.ExitCode

  if ($exitCode -ne 0) {
    $logText = ''
    try { $logText = Get-Content -LiteralPath $logAbs -Raw -ErrorAction SilentlyContinue } catch {}
    if ($logText -match '(?m)^Deployed Functions on project\b|(?m)^Deployed Functions\b') {
      Write-Host ("(warn) deploy exit code {0}, but log indicates success" -f $exitCode)
      Write-Host ("see log: {0}" -f $logAbs)
      exit 0
    }

    Write-Host ("(fail) deploy exit code: {0}" -f $exitCode)
    Write-Host ("see log: {0}" -f $logAbs)
    Write-Host 'Common causes:'
    Write-Host '- Not logged into Supabase CLI'
    Write-Host '- Token/user lacks privileges for this project (HTTP 403)'
    exit $exitCode
  }

  Write-Host '(ok) deploy completed'
  exit 0
} finally {
  Pop-Location
}
