param(
  [Parameter(Mandatory = $false)]
  [string]$Root = (Get-Location).Path,

  [Parameter(Mandatory = $false)]
  [int]$Max = 300,

  [Parameter(Mandatory = $false)]
  [string]$OutFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rootPath = (Resolve-Path -LiteralPath $Root).Path
Set-Location -LiteralPath $rootPath

$rx = [regex]::new('(?i)\S+\.md')

$ps1Files = Get-ChildItem -Recurse -File -Filter *.ps1
$hits = foreach ($f in $ps1Files) {
  Select-String -LiteralPath $f.FullName -Pattern '\.md' -AllMatches -ErrorAction SilentlyContinue
}

$mds = New-Object System.Collections.Generic.HashSet[string]

foreach ($h in $hits) {
  foreach ($m in $rx.Matches($h.Line)) {
    $v = $m.Value.Trim('"', "'", ')', ']', '}', ',', ';')
    if ($v -and ($v -match '(?i)^[A-Z0-9_\-./\\ ]+\.md$')) { [void]$mds.Add($v) }
  }
}

$list = @($mds) | Sort-Object

Write-Host ("md refs in ps1 (unique): {0}" -f $list.Count)
$top = $list | Select-Object -First $Max
$top | ForEach-Object { Write-Host $_ }

if ($OutFile) {
  $outPath = (Resolve-Path -LiteralPath (Split-Path -Parent $OutFile) -ErrorAction SilentlyContinue)
  if (-not $outPath) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $OutFile) -Force | Out-Null
  }
  $list | Out-File -FilePath $OutFile -Encoding utf8
  Write-Host ("(wrote) {0}" -f $OutFile)
}
