$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$xlsxPath = Join-Path (Split-Path -Parent $repoRoot) 'planilhas auditoria\data-reconciliation-report_2025-11-26_to_2025-12-26_2025-12-26T02-01-19-586Z.xlsx'

Write-Host "RepoRoot: $repoRoot"
Write-Host "XLSXPath: $xlsxPath"

$logPath = Join-Path $repoRoot '_tmp_analyze_reconciliation_xlsx.log'
Remove-Item -Force -ErrorAction SilentlyContinue $logPath

node .\scripts\analyze-reconciliation-xlsx.mjs "$xlsxPath" *>&1 | Tee-Object -FilePath $logPath

Write-Host "Log: $logPath"
