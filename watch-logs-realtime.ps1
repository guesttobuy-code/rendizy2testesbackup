# ============================================================================
# SCRIPT: Monitorar Logs em Tempo Real (Loop)
# ============================================================================

param(
    [int]$IntervalSeconds = 3,
    [string]$Filter = "login|auth|rppt|ERROR|❌"
)

$ProjectRef = "odcgnzfremrqnvtitpcc"
$FunctionName = "rendizy-server"

Write-Host "🔍 Monitorando logs em tempo real..." -ForegroundColor Cyan
Write-Host "   Projeto: $ProjectRef" -ForegroundColor Gray
Write-Host "   Função: $FunctionName" -ForegroundColor Gray
Write-Host "   Intervalo: ${IntervalSeconds}s" -ForegroundColor Gray
Write-Host "   Filtro: $Filter" -ForegroundColor Gray
Write-Host "   Pressione Ctrl+C para parar`n" -ForegroundColor Yellow

$lastSeen = @{}
$iteration = 0

while ($true) {
    $iteration++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    try {
        # Buscar logs recentes (projeto deve estar linkado)
        $logs = npx supabase functions logs $FunctionName --limit 20 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $lines = $logs -split "`n"
            $newLogs = @()
            
            foreach ($line in $lines) {
                # Aplicar filtro
                if ($Filter -and $line -notmatch $Filter) {
                    continue
                }
                
                # Verificar se já vimos este log
                $lineHash = $line.GetHashCode()
                if (-not $lastSeen.ContainsKey($lineHash)) {
                    $lastSeen[$lineHash] = $true
                    $newLogs += $line
                    
                    # Limitar cache de logs vistos (manter últimos 100)
                    if ($lastSeen.Count -gt 100) {
                        $lastSeen.Remove($lastSeen.Keys | Select-Object -First 1)
                    }
                }
            }
            
            if ($newLogs.Count -gt 0) {
                Write-Host "`n[$timestamp] --- NOVOS LOGS ---" -ForegroundColor Green
                foreach ($log in $newLogs) {
                    # Colorir por tipo
                    if ($log -match "ERROR|❌|Erro|Error") {
                        Write-Host "  ❌ $log" -ForegroundColor Red
                    } elseif ($log -match "WARNING|⚠️") {
                        Write-Host "  ⚠️  $log" -ForegroundColor Yellow
                    } elseif ($log -match "✅|SUCCESS") {
                        Write-Host "  ✅ $log" -ForegroundColor Green
                    } elseif ($log -match "🔐|auth|login|rppt") {
                        Write-Host "  🔐 $log" -ForegroundColor Blue
                    } elseif ($log -match "POST|GET") {
                        Write-Host "  📡 $log" -ForegroundColor Magenta
                    } else {
                        Write-Host "  📋 $log" -ForegroundColor Gray
                    }
                }
            } else {
                Write-Host "[$timestamp] Aguardando novos logs..." -ForegroundColor DarkGray
            }
        } else {
            Write-Host "[$timestamp] ⚠️  Erro ao buscar logs" -ForegroundColor Yellow
        }
        
        Start-Sleep -Seconds $IntervalSeconds
        
        # Limpar tela a cada 20 iterações
        if ($iteration % 20 -eq 0) {
            Clear-Host
            Write-Host "🔍 Monitorando logs em tempo real... (Iteração $iteration)" -ForegroundColor Cyan
            Write-Host "   Pressione Ctrl+C para parar`n" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "[$timestamp] ❌ Erro: $_" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}

