param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = '.',

  [Parameter(Mandatory = $false)]
  [string]$ProjectRef = 'odcgnzfremrqnvtitpcc',

  [Parameter(Mandatory = $false)]
  [string]$FunctionName = 'rendizy-public',

  [Parameter(Mandatory = $false)]
  [string]$LogFile = '.\\_tmp_deploy_rendizy_public.log',

  [Parameter(Mandatory = $false)]
  [switch]$Debug
)

$ErrorActionPreference = 'Stop'

function Resolve-AbsolutePath([string]$PathLike, [string]$BaseDir) {
  if ([System.IO.Path]::IsPathRooted($PathLike)) { return $PathLike }
  return (Join-Path -Path $BaseDir -ChildPath $PathLike)
}

$repoAbs = Resolve-AbsolutePath -PathLike $RepoRoot -BaseDir (Get-Location).Path
if (-not (Test-Path -LiteralPath $repoAbs)) {
  throw "RepoRoot not found: $repoAbs"
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

  $args = @('-y', 'supabase@latest', 'functions', 'deploy', $FunctionName, '--project-ref', $ProjectRef)
  if ($Debug) { $args += '--debug' }

  $out = & npx @args 2>&1
  $exitCode = $LASTEXITCODE
  $out | Tee-Object -FilePath $logAbs

  if ($exitCode -ne 0) {
    Write-Host ("(fail) deploy exit code: {0}" -f $exitCode)
    Write-Host ("see log: {0}" -f $logAbs)
    exit $exitCode
  }

  Write-Host '(ok) deploy completed'
  exit 0
} finally {
  Pop-Location
}
