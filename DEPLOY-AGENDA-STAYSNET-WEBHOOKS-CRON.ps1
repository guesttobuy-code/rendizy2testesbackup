# ============================================================================
# 🚀 Deploy + Agenda (pg_cron) - staysnet-webhooks-cron
# ============================================================================
# Objetivo:
# 1) Deploy da Edge Function staysnet-webhooks-cron
# 2) (Opcional) Configurar secrets da função via Supabase CLI
# 3) Gerar/mostrar o SQL para agendar execução via pg_cron + pg_net
#
# Segurança:
# - Este script NÃO imprime valores de secrets.
# - Evite commitar arquivos com keys reais.
# ============================================================================

param(
  [string]$ProjectRef = "odcgnzfremrqnvtitpcc",
  [string]$FunctionName = "staysnet-webhooks-cron",
  [string]$EnvFile = ".env.local",
  [switch]$SetSecrets,
  [switch]$EmitSqlWithKeys
)

$ErrorActionPreference = "Stop"

function Read-DotEnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return $null
  }

  $content = Get-Content -LiteralPath $FilePath -ErrorAction Stop
  $line = $content | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
  if (-not $line) { return $null }

  $value = ($line -replace "^$([regex]::Escape($Key))=", "").Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value.Trim()
}

function Ensure-SupabaseCli {
  Write-Host "📦 Verificando Supabase CLI via npx..." -ForegroundColor Cyan
  $null = npx supabase --version 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI não encontrado via npx. Confirme Node.js instalado: node --version"
  }
}

function Ensure-SupabaseLogin {
  param([string]$EnvPath)

  Write-Host "🔐 Verificando login..." -ForegroundColor Cyan

  if ($env:SUPABASE_ACCESS_TOKEN) {
    npx supabase login --token $env:SUPABASE_ACCESS_TOKEN | Out-Null
    return
  }

  $token = Read-DotEnvValue -FilePath $EnvPath -Key "SUPABASE_ACCESS_TOKEN"
  if ($token) {
    npx supabase login --token $token | Out-Null
    return
  }

  Write-Host "⚠️ SUPABASE_ACCESS_TOKEN não encontrado. Fazendo login interativo..." -ForegroundColor Yellow
  npx supabase login | Out-Null
}

function Ensure-ProjectLinked {
  param([string]$ProjectRef)

  Write-Host "🔗 Verificando link do projeto..." -ForegroundColor Cyan
  $status = npx supabase status 2>$null
  if ($LASTEXITCODE -eq 0 -and $status -match "Linked") {
    Write-Host "✅ Projeto já está linkado" -ForegroundColor Green
    return
  }

  Write-Host "📌 Linkando com project-ref: $ProjectRef" -ForegroundColor Yellow
  npx supabase link --project-ref $ProjectRef | Out-Null
}

function Deploy-Function {
  param([string]$FunctionName)

  Write-Host "🚀 Deploy da função: $FunctionName" -ForegroundColor Cyan
  npx supabase functions deploy $FunctionName | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha no deploy da função: $FunctionName"
  }
  Write-Host "✅ Deploy concluído" -ForegroundColor Green
}

function Set-FunctionSecrets {
  param(
    [string]$EnvPath
  )

  $supabaseUrl = Read-DotEnvValue -FilePath $EnvPath -Key "VITE_SUPABASE_URL"
  if (-not $supabaseUrl) { $supabaseUrl = Read-DotEnvValue -FilePath $EnvPath -Key "SUPABASE_URL" }

  $serviceRole = Read-DotEnvValue -FilePath $EnvPath -Key "SUPABASE_SERVICE_ROLE_KEY"

  if (-not $supabaseUrl) {
    throw "Não encontrei VITE_SUPABASE_URL/SUPABASE_URL em $EnvPath (necessário para o cron)."
  }
  if (-not $serviceRole) {
    throw "Não encontrei SUPABASE_SERVICE_ROLE_KEY em $EnvPath (necessário para o cron)."
  }

  Write-Host "🔑 Configurando secrets da Edge Function (sem exibir valores)..." -ForegroundColor Cyan

  # Necessários para staysnet-webhooks-cron
  npx supabase secrets set SUPABASE_URL=$supabaseUrl | Out-Null
  npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$serviceRole | Out-Null

  Write-Host "✅ Secrets configurados" -ForegroundColor Green
}

function Emit-ScheduleSql {
  param(
    [string]$ProjectRef,
    [string]$EnvPath,
    [switch]$EmitSqlWithKeys
  )

  $projectUrl = "https://$ProjectRef.supabase.co"
  $anonKey = Read-DotEnvValue -FilePath $EnvPath -Key "VITE_SUPABASE_ANON_KEY"
  if (-not $anonKey) { $anonKey = Read-DotEnvValue -FilePath $EnvPath -Key "SUPABASE_ANON_KEY" }

  $sqlFile = Join-Path $PSScriptRoot "CRIAR_CRON_JOB_STAYSNET_WEBHOOKS_CRON.sql"
  Write-Host "🧾 SQL template (pg_cron) em: $sqlFile" -ForegroundColor Cyan
  Write-Host "   Abra no Supabase SQL Editor e execute." -ForegroundColor Gray

  if ($EmitSqlWithKeys) {
    if (-not $anonKey) {
      throw "Não encontrei VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY em $EnvPath para gerar SQL com keys."
    }

    Write-Host "\n⚠️ AVISO: Emitindo SQL com ANON KEY no console." -ForegroundColor Yellow
    Write-Host "   Não cole isso em arquivos versionados." -ForegroundColor Yellow

    $sql = @"
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('staysnet-webhooks-cron');
  EXCEPTION WHEN OTHERS THEN
    -- ignore
  END;
END $$;

SELECT cron.schedule(
  'staysnet-webhooks-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := '$projectUrl/functions/v1/staysnet-webhooks-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '$anonKey',
      'Authorization', 'Bearer $anonKey'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  ) AS request_id;
  $$
);
"@

    Write-Host $sql
  } else {
    Write-Host "\n✅ Pronto: agora rode o SQL template (sem secrets) no Dashboard." -ForegroundColor Green
  }
}

Write-Host "\n🚀 DEPLOY + AGENDA: staysnet-webhooks-cron" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $PSScriptRoot $EnvFile }

Ensure-SupabaseCli
Ensure-SupabaseLogin -EnvPath $envPath
Ensure-ProjectLinked -ProjectRef $ProjectRef
Deploy-Function -FunctionName $FunctionName

if ($SetSecrets) {
  Set-FunctionSecrets -EnvPath $envPath
} else {
  Write-Host "ℹ️ Secrets não foram alterados (rode com -SetSecrets se quiser)." -ForegroundColor Yellow
}

Emit-ScheduleSql -ProjectRef $ProjectRef -EnvPath $envPath -EmitSqlWithKeys:$EmitSqlWithKeys

Write-Host "\n🎉 Concluído." -ForegroundColor Green
