param(
    [switch]$ExportPatches = $true,
    [switch]$DeleteLocalBranches = $true,
    [switch]$DeleteRemoteBranches,
    [switch]$Force,
    [string]$MainBranch = 'main',
    [string]$PatchRoot = 'docs/08-archive/_inventory/branch-cleanup'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)][string[]]$Args
    )
    $out = & git @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("git " + ($Args -join ' ') + " failed (exit $LASTEXITCODE):\n" + ($out | Out-String))
    }
    return $out
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location -LiteralPath $repoRoot

$topRaw = (Invoke-Git -Args @('rev-parse', '--show-toplevel')).ToString().Trim()
$topNorm = [System.IO.Path]::GetFullPath(($topRaw -replace '/', '\'))
$rootNorm = [System.IO.Path]::GetFullPath($repoRoot.Path)
if ($topNorm -ine $rootNorm) {
    throw "Safety check failed: git toplevel '$topRaw' != expected repo root '$($repoRoot.Path)'. Aborting."
}

$status = (Invoke-Git -Args @('status', '--porcelain=v1'))
if ($status -and ($status | Measure-Object).Count -gt 0 -and -not $Force) {
    throw "Working tree not clean. Commit/stash changes or re-run with -Force."
}

$current = (Invoke-Git -Args @('branch', '--show-current')).ToString().Trim()
if ($current -ne $MainBranch) {
    if (-not $Force) {
        throw "You are on '$current'. Checkout '$MainBranch' first, or re-run with -Force to auto-switch."
    }
    Invoke-Git -Args @('checkout', $MainBranch) | Out-Null
}

$localBranches = @(Invoke-Git -Args @('for-each-ref', 'refs/heads', '--format=%(refname:short)')) |
    ForEach-Object { $_.ToString().Trim() } |
    Where-Object { $_ -and $_ -ne $MainBranch }

if (-not $localBranches -or $localBranches.Count -eq 0) {
    Write-Host "(ok) No extra local branches. Only '$MainBranch' exists."
    exit 0
}

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$patchRootResolved = Join-Path $repoRoot.Path $PatchRoot
$runPatchDir = Join-Path $patchRootResolved $timestamp

if ($ExportPatches) {
    New-Item -ItemType Directory -Force -Path $runPatchDir | Out-Null
}

Write-Host ("Extra local branches found: " + ($localBranches -join ', '))

foreach ($b in $localBranches) {
    $uniqueCount = [int](Invoke-Git -Args @('rev-list', '--count', "$MainBranch..$b")).ToString().Trim()
    Write-Host ("- " + $b + " (unique commits vs " + $MainBranch + ": " + $uniqueCount + ")")

    if ($ExportPatches -and $uniqueCount -gt 0) {
        $outDir = Join-Path $runPatchDir ($b -replace '[^a-zA-Z0-9._-]', '_')
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
        Invoke-Git -Args @('format-patch', "$MainBranch..$b", '-o', $outDir) | Out-Null
        Write-Host ("  patches -> " + (Resolve-Path $outDir).Path)
    }

    if ($DeleteLocalBranches) {
        Invoke-Git -Args @('branch', '-D', $b) | Out-Null
        Write-Host "  deleted local branch"
    }
}

if ($DeleteRemoteBranches) {
    $remotes = @(Invoke-Git -Args @('remote')) | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ }
    foreach ($r in $remotes) {
        $remoteHeads = @(Invoke-Git -Args @('ls-remote', '--heads', $r))
        foreach ($line in $remoteHeads) {
            $parts = $line -split "\s+"
            if ($parts.Length -lt 2) { continue }
            $ref = $parts[1]
            if ($ref -notlike 'refs/heads/*') { continue }
            $name = $ref.Substring('refs/heads/'.Length)
            if ($name -eq $MainBranch) { continue }
            Invoke-Git -Args @('push', $r, "--delete", $name) | Out-Null
            Write-Host ("deleted remote branch " + $r + "/" + $name)
        }
    }
}

Write-Host "(done) Branch cleanup complete."
