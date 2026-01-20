param(
  [Parameter(Mandatory = $false)]
  [string]$IndexUrl = 'https://odcgnzfremrqnvtitpcc.supabase.co/storage/v1/object/public/client-sites/e78c7bb9-7823-44b8-9aee-95c9b073e7b7/public-sites/medhome/index.html',

  [Parameter(Mandatory = $false)]
  [string[]]$Needles = @(
    'rendizy-public',
    'rendizy-server',
    '/functions/v1/',
    '/rest/v1/',
    '/reservations',
    'accommod'
  )
)

$ErrorActionPreference = 'Stop'

Write-Host "GET $IndexUrl"

$resp = Invoke-WebRequest -Uri $IndexUrl -Method GET -SkipHttpErrorCheck -TimeoutSec 60
Write-Host ("HTTP {0}" -f $resp.StatusCode)

if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 300) {
  if ($resp.Content) {
    Write-Host 'BODY (first 400):'
    Write-Host $resp.Content.Substring(0, [Math]::Min(400, $resp.Content.Length))
  }
  exit 1
}

$html = [string]$resp.Content
Write-Host ("bytes={0}" -f ([Text.Encoding]::UTF8.GetByteCount($html)))

foreach ($t in $Needles) {
  $hit = $html.ToLower().Contains($t.ToLower())
  Write-Host ("{0}: {1}" -f $t, $hit)
}

exit 0
