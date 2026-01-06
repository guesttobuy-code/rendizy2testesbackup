param(
    [switch]$DryRun
)

# Script para aplicar migration de calendar_pricing_rules no Supabase via SQL API
$ErrorActionPreference = 'Stop'

$root = "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
$envPath = Join-Path $root '.env.local'

if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Arquivo .env.local nao encontrado em: $envPath"
}

# Extrair service key
$serviceKey = (Get-Content $envPath | Select-String '^SUPABASE_SERVICE_ROLE_KEY=' | ForEach-Object { $_ -replace '^SUPABASE_SERVICE_ROLE_KEY=', '' }).ToString().Trim()

if (-not $serviceKey) {
    throw 'SUPABASE_SERVICE_ROLE_KEY nao encontrado no .env.local'
}

$migrationFile = Join-Path $root 'supabase\migrations\20260105_create_calendar_pricing_rules.sql'

if (-not (Test-Path -LiteralPath $migrationFile)) {
    throw "Migration file nao encontrado: $migrationFile"
}

$sql = Get-Content -LiteralPath $migrationFile -Raw

Write-Host "=== Migration: calendar_pricing_rules ==="
Write-Host "Migration file: $migrationFile"
Write-Host "SQL length: $($sql.Length) chars"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY-RUN] Nao executando SQL."
    exit 0
}

# Verificar se a tabela já existe primeiro
$checkUrl = "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/calendar_pricing_rules?select=id&limit=1"
$headers = @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
}

Write-Host "Verificando se tabela ja existe..."

try {
    $checkResp = Invoke-RestMethod -Method Get -Uri $checkUrl -Headers $headers -TimeoutSec 30
    Write-Host "✅ Tabela calendar_pricing_rules ja existe!"
    Write-Host "Registros encontrados: $(@($checkResp).Count)"
    exit 0
} catch {
    $errMsg = $_.Exception.Message
    $respBody = ""
    try {
        $r = $_.Exception.Response
        if ($r) {
            $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
            $respBody = $sr.ReadToEnd()
            $sr.Close()
        }
    } catch {}
    
    if ($respBody -match '42P01' -or $errMsg -match 'does not exist' -or $respBody -match 'does not exist') {
        Write-Host "Tabela nao existe. Aplicando migration..."
    } else {
        Write-Host "⚠️ Erro ao verificar tabela:"
        Write-Host "Message: $errMsg"
        Write-Host "Body: $respBody"
        Write-Host ""
        Write-Host "Tentando aplicar migration mesmo assim..."
    }
}

# Para executar SQL arbitrário no Supabase, precisamos:
# 1. Usar a Management API (requer token de acesso)
# 2. Ou usar a conexão direta ao Postgres
# 3. Ou executar via Dashboard

# Vamos tentar via supabase CLI com link local
Write-Host ""
Write-Host "=== Tentando via Supabase CLI ==="

# Obter token
$confirmacaoPath = Join-Path $root 'CONFIRMACAO_DEPLOY.md'
$token = $null

if (Test-Path -LiteralPath $confirmacaoPath) {
    $match = (Select-String -LiteralPath $confirmacaoPath -Pattern 'npx\s+supabase\s+login\s+--token\s+(sbp_[a-z0-9]+)' -AllMatches).Matches | Select-Object -First 1
    if ($match) {
        $token = $match.Groups[1].Value
        Write-Host "(ok) token extraido de CONFIRMACAO_DEPLOY.md"
    }
}

if (-not $token) {
    $token = $env:SUPABASE_ACCESS_TOKEN
}

if (-not $token) {
    Write-Host "❌ Token Supabase nao encontrado."
    Write-Host ""
    Write-Host "Para aplicar a migration, execute o SQL manualmente no Supabase Dashboard:"
    Write-Host "1. Acesse https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql"
    Write-Host "2. Cole o conteudo do arquivo: $migrationFile"
    Write-Host "3. Execute"
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $token

Push-Location $root
try {
    # Primeiro, garantir que o projeto está linkado
    Write-Host "Verificando link do projeto..."
    
    # Verificar se já está linkado
    $configFile = Join-Path $root 'supabase\.temp\project-ref'
    $isLinked = Test-Path -LiteralPath $configFile
    
    if (-not $isLinked) {
        Write-Host "Linkando projeto..."
        $linkResult = & npx -y supabase@latest link --project-ref odcgnzfremrqnvtitpcc 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Aviso ao linkar: $linkResult"
        }
    } else {
        Write-Host "Projeto ja linkado"
    }
    
    # Tentar db push
    Write-Host ""
    Write-Host "Executando 'supabase db push'..."
    $result = & npx -y supabase@latest db push 2>&1
    $exitCode = $LASTEXITCODE
    
    Write-Host "Exit code: $exitCode"
    Write-Host "Output: $result"
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration aplicada com sucesso!"
    } else {
        Write-Host ""
        Write-Host "⚠️ Falha no db push. Tente aplicar manualmente:"
        Write-Host "1. Acesse https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql"
        Write-Host "2. Cole o SQL de: $migrationFile"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Fim ==="
