param(
  [string]$Subdomain = 'medhome',
  [int]$Port = 4179,
  [string]$Mount = 'site'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host "== serve-client-site-from-supabase ==" -ForegroundColor Cyan
Write-Host "cwd: $((Get-Location).Path)"
Write-Host "subdomain: $Subdomain"
Write-Host "port: $Port"
Write-Host "mount: $Mount"

node .\scripts\serve-client-site-from-supabase.mjs --subdomain $Subdomain --port $Port --mount $Mount
