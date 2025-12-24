param(
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$AnonKey = $env:SUPABASE_ANON_KEY,
  [string]$RendizyToken = $env:RENDIZY_TOKEN,
  [switch]$IncludeLong = $false
)

$ErrorActionPreference = 'Stop'

function Normalize-BaseUrl([string]$url) {
  if (-not $url) { return $url }
  return $url.Trim().TrimEnd('/')
}

function Mask([string]$value, [int]$start = 6, [int]$end = 4) {
  if (-not $value) { return '<empty>' }
  $v = $value.Trim()
  if ($v.Length -le ($start + $end + 3)) { return ('*' * [Math]::Min(12, $v.Length)) }
  return ($v.Substring(0, $start) + '...' + $v.Substring($v.Length - $end))
}

$SupabaseUrl = Normalize-BaseUrl $SupabaseUrl
if (-not $SupabaseUrl) { throw 'SUPABASE_URL não definido (ex: https://odcgnzfremrqnvtitpcc.supabase.co)' }

$AnonKey = $AnonKey
if (-not $AnonKey) {
  $AnonKey = $env:VITE_SUPABASE_ANON_KEY
}
if (-not $AnonKey) { throw 'SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY) não definido' }

$base = "$SupabaseUrl/functions/v1/rendizy-server"

$headers = @{
  'apikey' = $AnonKey
  'Authorization' = "Bearer $AnonKey"
  'Content-Type' = 'application/json'
}

if ($RendizyToken) {
  $headers['X-Auth-Token'] = $RendizyToken
}

function Probe([string]$method, [string]$path, [string]$body = $null, [int]$timeoutSec = 25) {
  $url = "$base$path"
  try {
    if ($method -eq 'GET') {
      $r = Invoke-WebRequest -SkipHttpErrorCheck -Method Get -Uri $url -Headers $headers -TimeoutSec $timeoutSec
    } else {
      $r = Invoke-WebRequest -SkipHttpErrorCheck -Method Post -Uri $url -Headers $headers -Body ($body ?? '{}') -TimeoutSec $timeoutSec
    }

    $snippet = ($r.Content | Out-String).Trim()
    if ($snippet.Length -gt 200) { $snippet = $snippet.Substring(0, 200) + '...' }

    [pscustomobject]@{
      Method = $method
      Path   = $path
      Status = $r.StatusCode
      Body   = $snippet
    }
  } catch {
    [pscustomobject]@{
      Method = $method
      Path   = $path
      Status = 'EXC'
      Body   = $_.Exception.Message
    }
  }
}

Write-Host "\n=== TEST WHATSAPP/CHAT PROD (2025-12-24) ===" -ForegroundColor Cyan
Write-Host "Base: $base" -ForegroundColor DarkGray
Write-Host "Anon: $(Mask $AnonKey 12 6)" -ForegroundColor DarkGray
Write-Host "X-Auth-Token: $(if ($RendizyToken) { Mask $RendizyToken 12 6 } else { '<not set>' })" -ForegroundColor DarkGray

$tests = @(
  # Health
  @{ m='GET';  p='/health' },
  @{ m='GET';  p='/rendizy-server/health' },

  # Auth (variações observadas nos docs/scripts)
  @{ m='GET';  p='/auth/me' },
  @{ m='GET';  p='/rendizy-server/auth/me' },
  @{ m='GET';  p='/rendizy-server/make-server-67caf26a/auth/me' },

  # Chat config
  @{ m='GET';  p='/chat/channels/config' },
  @{ m='GET';  p='/rendizy-server/chat/channels/config' },
  @{ m='GET';  p='/rendizy-server/make-server-67caf26a/chat/channels/config' },

  # WhatsApp status (novo e legado)
  @{ m='POST'; p='/chat/channels/whatsapp/status'; body='{}' },
  @{ m='POST'; p='/rendizy-server/chat/channels/whatsapp/status'; body='{}' },
  @{ m='GET';  p='/whatsapp/status' },
  @{ m='GET';  p='/rendizy-server/whatsapp/status' },
  @{ m='GET';  p='/rendizy-server/make-server-67caf26a/whatsapp/status' },

  # StaysNet (para confirmar se a Edge Function está respondendo)
  @{ m='POST'; p='/make-server-67caf26a/staysnet/import/reservations'; body='{}'; timeout=35 },
  @{ m='POST'; p='/rendizy-server/make-server-67caf26a/staysnet/import/reservations'; body='{}'; timeout=180 }
)

$results = foreach ($t in $tests) {
  $timeout = if ($t.timeout) { [int]$t.timeout } else { 25 }
  if (-not $IncludeLong -and $timeout -gt 60) {
    continue
  }

  Probe $t.m $t.p ($t.body) $timeout
}

$results | Format-Table -AutoSize

Write-Host "\nNotas:" -ForegroundColor Yellow
Write-Host "- 200 em /auth/me indica token válido. 401 = token expirado. 404 = rota não está montada nesse path." -ForegroundColor DarkGray
Write-Host "- Para pegar token válido: abra o app logado e rode GET-TOKEN.js no console (F12)." -ForegroundColor DarkGray
Write-Host "- Evitei /connect e /disconnect aqui para não causar efeitos colaterais." -ForegroundColor DarkGray
