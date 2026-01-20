# ============================================================================
# SCRIPT: Watch Supabase Edge Functions Logs em Tempo Real
# ============================================================================
# Uso: .\watch-supabase-logs-realtime.ps1 [--function rendizy-server] [--filter login]
# ============================================================================

param(
    [string]$Function = "rendizy-server",
    [string]$Filter = "",
    [int]$IntervalSeconds = 3,
    [string]$ProjectRef = "odcgnzfremrqnvtitpcc"
)

Write-Host "`n🔍 Monitorando logs do Supabase em tempo real..." -ForegroundColor Cyan
Write-Host "   Projeto: $ProjectRef" -ForegroundColor Gray
Write-Host "   Função: $Function" -ForegroundColor Gray
Write-Host "   Filtro: $(if ($Filter) { $Filter } else { 'todos' })" -ForegroundColor Gray
Write-Host "   Intervalo: ${IntervalSeconds}s" -ForegroundColor Gray
Write-Host "   Pressione Ctrl+C para parar`n" -ForegroundColor Gray

# Função para colorir logs por nível
function Format-LogLine {
    param([string]$line)
    
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    
    if ($line -match "ERROR|❌|Erro|Error|500") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "WARNING|⚠️|Aviso|Warning") {
        Write-Host $line -ForegroundColor Yellow
    } elseif ($line -match "INFO|ℹ️|Info") {
        Write-Host $line -ForegroundColor Cyan
    } elseif ($line -match "✅|SUCCESS|Success") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "POST|GET|PUT|DELETE|PATCH|200|204") {
        Write-Host $line -ForegroundColor Magenta
    } elseif ($line -match "🔐|auth|login|rppt|Tabela users|Verificando senha") {
        Write-Host $line -ForegroundColor Blue
    } else {
        Write-Host $line -ForegroundColor White
    }
}

# Armazenar últimas linhas para evitar duplicatas
$seenLogs = New-Object System.Collections.Generic.HashSet[string]
$iteration = 0
$lastClearTime = Get-Date

while ($true) {
    $iteration++
    $currentTime = Get-Date
    
    try {
        # Tentar com npx primeiro, depois com comando direto
        $logs = $null
        
        # Método 1: npx supabase logs
        try {
            $logs = npx supabase logs --service edge-function --project-ref $ProjectRef 2>&1
        } catch {
            # Método 2: supabase direto (se estiver no PATH)
            try {
                $logs = supabase logs --service edge-function --project-ref $ProjectRef 2>&1
            } catch {
                Write-Host "⚠️ Erro ao executar supabase CLI. Verifique se está instalado." -ForegroundColor Yellow
                Write-Host "   Tente: npm install -g supabase" -ForegroundColor Gray
                Start-Sleep -Seconds 5
                continue
            }
        }
        
        if ($LASTEXITCODE -eq 0 -or $logs) {
            $lines = $logs -split "`n" | Where-Object { $_ -ne "" }
            
            # Filtrar logs relevantes
            $relevantLogs = $lines | Where-Object {
                if ($Filter) {
                    $_ -match $Filter
                } else {
                    $_ -match "/auth/login" -or
                    $_ -match "POST" -or
                    $_ -match "rppt" -or
                    $_ -match "login" -or
                    $_ -match "ERROR" -or
                    $_ -match "WARNING" -or
                    $_ -match "🔐" -or
                    $_ -match "✅" -or
                    $_ -match "❌" -or
                    $_ -match "Tabela users" -or
                    $_ -match "Verificando senha" -or
                    $_ -match "Login bem-sucedido" -or
                    $_ -match "Erro no login"
                }
            }
            
            $newLogs = @()
            foreach ($log in $relevantLogs) {
                $logHash = $log.GetHashCode()
                if (-not $seenLogs.Contains($logHash)) {
                    $seenLogs.Add($logHash) | Out-Null
                    $newLogs += $log
                }
            }
            
            if ($newLogs.Count -gt 0) {
                Write-Host "`n$(Get-Date -Format 'HH:mm:ss') - NOVOS LOGS:" -ForegroundColor Green
                foreach ($log in $newLogs) {
                    Format-LogLine $log
                }
                Write-Host ""
            }
            
            # Limpar cache a cada 100 iterações ou 5 minutos
            if (($iteration % 100 -eq 0) -or (($currentTime - $lastClearTime).TotalMinutes -gt 5)) {
                $seenLogs.Clear()
                $lastClearTime = $currentTime
                Write-Host "   (cache limpo - próxima busca mostrará todos os logs)" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "⚠️ Erro ao buscar logs (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
        }
        
        # Aguardar antes da próxima busca
        Start-Sleep -Seconds $IntervalSeconds
        
        # Limpar tela a cada 30 iterações (opcional)
        if ($iteration % 30 -eq 0) {
            Clear-Host
            Write-Host "🔍 Monitorando logs do Supabase... (Iteração $iteration)" -ForegroundColor Cyan
            Write-Host ""
        }
        
    } catch {
        Write-Host "❌ Erro: $_" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}

