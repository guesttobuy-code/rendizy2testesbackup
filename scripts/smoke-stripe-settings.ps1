param(
  [Parameter(Mandatory = $false)]
  [string]$OrganizationId,

  # Alternativa ao service-role: usar o token do usuário (header X-Auth-Token)
  [Parameter(Mandatory = $false)]
  [string]$XAuthToken,

  # Se não passar -Write, o script só faz GET (não altera nada)
  [switch]$Write,

  # Payload de escrita (opcional)
  [Parameter(Mandatory = $false)]
  [Nullable[bool]]$Enabled,
  [Parameter(Mandatory = $false)]
  [Nullable[bool]]$IsTestMode,
  [Parameter(Mandatory = $false)]
  [string]$PublishableKey,
  [Parameter(Mandatory = $false)]
  [string]$SecretKey,
  [Parameter(Mandatory = $false)]
  [string]$WebhookSigningSecret,
  [Parameter(Mandatory = $false)]
  [string]$RestrictedKey,
  [Parameter(Mandatory = $false)]
  [string]$WebhookUrl
)

$ErrorActionPreference = 'Stop'

function Get-EnvValueFromFile([string]$Path, [string]$Key) {
  $m = (Get-Content -LiteralPath $Path | Select-String -Pattern ("^" + [regex]::Escape($Key) + "=") | Select-Object -First 1)
  if (-not $m) { return $null }
  $v = ($m.ToString().Split('=', 2)[1]).Trim()
  # suportar .env com valores entre aspas
  if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
    $v = $v.Substring(1, $v.Length - 2)
  }
  return $v.Trim()
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$envPathCandidates = @(
  (Join-Path $repoRoot '.env.local'),
  (Join-Path (Split-Path -Parent $repoRoot) '.env.local')
)

$envPath = $envPathCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $envPath) {
  throw "Nao achei .env.local (tentei: `n- $($envPathCandidates -join "`n- ") )"
}

$supabaseUrl = (Get-EnvValueFromFile -Path $envPath -Key 'SUPABASE_URL')
if (-not $supabaseUrl) {
  $supabaseUrl = (Get-EnvValueFromFile -Path $envPath -Key 'VITE_SUPABASE_URL')
}
if (-not $supabaseUrl) { throw 'Faltou SUPABASE_URL/VITE_SUPABASE_URL no .env.local' }
$supabaseUrl = $supabaseUrl.Trim().TrimEnd('/')

$serviceKey = (Get-EnvValueFromFile -Path $envPath -Key 'SUPABASE_SERVICE_ROLE_KEY')

if (-not $XAuthToken -and -not $OrganizationId) {
  throw 'Informe -OrganizationId (service role) OU -XAuthToken (usuario).'
}

if (-not $XAuthToken -and -not $serviceKey) {
  throw 'Faltou SUPABASE_SERVICE_ROLE_KEY no .env.local (necessario para modo service role).'
}

$base = "$supabaseUrl/functions/v1/rendizy-server/make-server-67caf26a/settings/stripe"
$url = $base
if ($OrganizationId) {
  $url = $url + "?organization_id=$OrganizationId"
}

$headers = @{
  'Content-Type' = 'application/json'
}
if ($XAuthToken) {
  $headers['X-Auth-Token'] = $XAuthToken
}
if ($serviceKey) {
  $headers['apikey'] = $serviceKey
  $headers['Authorization'] = 'Bearer ' + $serviceKey
}

Write-Host "== Stripe settings smoke =="
Write-Host "envPath: $envPath"
Write-Host "url: $url"
Write-Host ("mode: " + ($(if ($XAuthToken) { 'user-token' } else { 'service-role' })))

Write-Host "`n== GET =="
$get = Invoke-WebRequest -Uri $url -Method GET -Headers $headers -TimeoutSec 60 -SkipHttpErrorCheck
Write-Host ("HTTP " + $get.StatusCode)
if ($get.Content) {
  ($get.Content.Substring(0, [Math]::Min(1200, $get.Content.Length))) | Write-Host
}

if (-not $Write) {
  Write-Host "`n(ok) GET-only. Passe -Write para fazer POST." 
  exit 0
}

$payload = @{}
if ($null -ne $Enabled) { $payload.enabled = [bool]$Enabled }
if ($null -ne $IsTestMode) { $payload.isTestMode = [bool]$IsTestMode }
if ($PublishableKey) { $payload.publishableKey = $PublishableKey }
if ($SecretKey) { $payload.secretKey = $SecretKey }
if ($WebhookSigningSecret) { $payload.webhookSigningSecret = $WebhookSigningSecret }
if ($RestrictedKey) { $payload.restrictedKey = $RestrictedKey }
if ($WebhookUrl) { $payload.webhookUrl = $WebhookUrl }

if ($payload.Keys.Count -eq 0) {
  throw 'Passe pelo menos 1 campo para POST (ex.: -Enabled $true -IsTestMode $true -PublishableKey pk_... etc).'
}

$body = ($payload | ConvertTo-Json -Depth 6)
Write-Host "`n== POST =="
Write-Host "payload keys: $($payload.Keys -join ', ')"

$post = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 120 -SkipHttpErrorCheck
Write-Host ("HTTP " + $post.StatusCode)
if ($post.Content) {
  ($post.Content.Substring(0, [Math]::Min(1200, $post.Content.Length))) | Write-Host
}

exit 0
