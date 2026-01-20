# ============================================================================
# SCRIPT: Watch Supabase Edge Functions Logs em Tempo Real
# ============================================================================
# Uso: .\watch-supabase-logs.ps1 [--function rendizy-server] [--follow]
# ============================================================================

param(
    [string]$Function = "rendizy-server",
    [switch]$Follow = $true,
    [string]$ProjectRef = "odcgnzfremrqnvtitpcc"
)

Write-Host "🔍 Monitorando logs do Supabase..." -ForegroundColor Cyan
Write-Host "   Projeto: $ProjectRef" -ForegroundColor Gray
Write-Host "   Função: $Function" -ForegroundColor Gray
Write-Host "   Modo: $(if ($Follow) { 'Contínuo (Ctrl+C para parar)' } else { 'Últimas 100 linhas' })" -ForegroundColor Gray
Write-Host ""

# Função para colorir logs por nível
function Format-LogLine {
    param([string]$line)
    
    if ($line -match "ERROR|❌|Erro|Error") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "WARNING|⚠️|Aviso|Warning") {
        Write-Host $line -ForegroundColor Yellow
    } elseif ($line -match "INFO|ℹ️|Info") {
        Write-Host $line -ForegroundColor Cyan
    } elseif ($line -match "✅|SUCCESS|Success") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "POST|GET|PUT|DELETE|PATCH") {
        Write-Host $line -ForegroundColor Magenta
    } elseif ($line -match "🔐|auth|login|rppt") {
        Write-Host $line -ForegroundColor Blue
    } else {
        Write-Host $line
    }
}

# Loop para buscar logs continuamente
$lastTimestamp = $null
$iteration = 0

while ($true) {
    $iteration++
    
    try {
        # Buscar logs recentes via npx supabase
        $logs = npx --yes supabase logs --service edge-function --project-ref $ProjectRef --limit 100 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $lines = $logs -split "`n"
            
            # Filtrar apenas logs relevantes
            $relevantLogs = $lines | Where-Object {
                $_ -match "/auth/login" -or
                $_ -match "rppt" -or
                $_ -match "login" -or
                $_ -match "POST" -or
                $_ -match "ERROR" -or
                $_ -match "WARNING" -or
                $_ -match "🔐" -or
                $_ -match "✅" -or
                $_ -match "❌"
            }
            
            if ($relevantLogs) {
                foreach ($log in $relevantLogs) {
                    Format-LogLine $log
                }
            } else {
                Write-Host "   (nenhum log relevante encontrado)" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "⚠️ Erro ao buscar logs: $logs" -ForegroundColor Yellow
        }
        
        if (-not $Follow) {
            break
        }
        
        # Aguardar 3 segundos antes da próxima busca
        Start-Sleep -Seconds 3
        
        # Limpar tela a cada 10 iterações (opcional)
        if ($iteration % 10 -eq 0) {
            Clear-Host
            Write-Host "🔍 Monitorando logs do Supabase... (Iteração $iteration)" -ForegroundColor Cyan
        }
        
    } catch {
        Write-Host "❌ Erro: $_" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}

