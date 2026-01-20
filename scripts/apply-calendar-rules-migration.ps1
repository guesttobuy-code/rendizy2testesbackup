param(
    [switch]$DryRun
)

# Script para aplicar migration de calendar_pricing_rules no Supabase
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

# Extrair Supabase URL
$supabaseUrl = (Get-Content $envPath | Select-String '^(SUPABASE_URL|VITE_SUPABASE_URL)=' | Select-Object -First 1).ToString().Split('=',2)[1].Trim().TrimEnd('/')

if (-not $supabaseUrl) {
    throw 'SUPABASE_URL nao encontrado no .env.local'
}

$migrationFile = Join-Path $root 'supabase\migrations\20260105_create_calendar_pricing_rules.sql'

if (-not (Test-Path -LiteralPath $migrationFile)) {
    throw "Migration file nao encontrado: $migrationFile"
}

$sql = Get-Content -LiteralPath $migrationFile -Raw

Write-Host "=== Migration: calendar_pricing_rules ==="
Write-Host "Supabase URL: $supabaseUrl"
Write-Host "Migration file: $migrationFile"
Write-Host "SQL length: $($sql.Length) chars"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY-RUN] Nao executando SQL. Mostrando primeiros 500 chars:"
    Write-Host ($sql.Substring(0, [Math]::Min(500, $sql.Length)))
    Write-Host "..."
    exit 0
}

# Executar via Supabase REST API (rpc)
# Como não temos endpoint direto para SQL, usamos o supabase CLI
Write-Host "Executando migration via Supabase CLI..."

# Primeiro, obter token do CONFIRMACAO_DEPLOY.md
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
    # Tentar do env
    $token = $env:SUPABASE_ACCESS_TOKEN
}

if (-not $token) {
    throw "Token Supabase nao encontrado. Configure SUPABASE_ACCESS_TOKEN ou adicione em CONFIRMACAO_DEPLOY.md"
}

$env:SUPABASE_ACCESS_TOKEN = $token

Push-Location $root
try {
    # Executar migration via supabase db push (se linked) ou executar SQL diretamente
    # Como pode não estar linked, vamos usar psql ou API direta
    
    # Alternativa: usar o endpoint /rest/v1/rpc se tivermos uma função exec_sql
    # Por agora, vamos tentar via supabase CLI
    
    Write-Host "Tentando aplicar via 'supabase db push'..."
    $result = & npx -y supabase@latest db push --project-ref odcgnzfremrqnvtitpcc 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✅ Migration aplicada com sucesso!"
    } else {
        Write-Host "⚠️ supabase db push retornou exit code $exitCode"
        Write-Host "Saida: $result"
        
        # Tentar alternativa: executar SQL via REST API usando função do Postgres
        Write-Host ""
        Write-Host "Tentando via SQL direto no endpoint REST..."
        
        # Verificar se a tabela já existe
        $checkUrl = "$supabaseUrl/rest/v1/calendar_pricing_rules?select=id&limit=1"
        $headers = @{
            apikey = $serviceKey
            Authorization = "Bearer $serviceKey"
        }
        
        try {
            $checkResp = Invoke-RestMethod -Method Get -Uri $checkUrl -Headers $headers -TimeoutSec 30
            Write-Host "✅ Tabela calendar_pricing_rules ja existe! (ou foi criada agora)"
        } catch {
            $errMsg = $_.Exception.Message
            if ($errMsg -match '42P01' -or $errMsg -match 'does not exist') {
                Write-Host "❌ Tabela nao existe. A migration precisa ser aplicada manualmente via Supabase Dashboard > SQL Editor"
                Write-Host ""
                Write-Host "Copie e cole o SQL em: $migrationFile"
            } else {
                Write-Host "Erro ao verificar tabela: $errMsg"
            }
        }
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== Fim ==="
