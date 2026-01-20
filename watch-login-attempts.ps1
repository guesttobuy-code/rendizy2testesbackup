# ============================================================================
# SCRIPT: Monitorar Apenas Tentativas de Login em Tempo Real
# ============================================================================
# Uso: .\watch-login-attempts.ps1
# ============================================================================

$ProjectRef = "odcgnzfremrqnvtitpcc"

Write-Host "🔐 Monitorando tentativas de login..." -ForegroundColor Cyan
Write-Host "   Projeto: $ProjectRef" -ForegroundColor Gray
Write-Host "   Pressione Ctrl+C para parar`n" -ForegroundColor Gray

while ($true) {
    try {
        # Buscar logs via npx supabase
        $logs = npx --yes supabase logs --service edge-function --project-ref $ProjectRef --limit 100 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $lines = $logs -split "`n"
            
            # Buscar apenas logs de login
            $loginLogs = $lines | Where-Object {
                $_ -match "/auth/login" -or
                $_ -match "POST.*auth/login" -or
                $_ -match "🔐.*POST.*auth" -or
                $_ -match "Login attempt" -or
                $_ -match "Tabela users" -or
                $_ -match "rppt" -or
                $_ -match "Verificando senha" -or
                $_ -match "Senha verificada" -or
                $_ -match "Login bem-sucedido" -or
                $_ -match "Erro no login"
            }
            
            if ($loginLogs) {
                Write-Host "`n$(Get-Date -Format 'HH:mm:ss') - NOVOS LOGS DE LOGIN:" -ForegroundColor Green
                foreach ($log in $loginLogs) {
                    if ($log -match "Login bem-sucedido|✅") {
                        Write-Host "  ✅ $log" -ForegroundColor Green
                    } elseif ($log -match "Erro|❌|ERROR") {
                        Write-Host "  ❌ $log" -ForegroundColor Red
                    } elseif ($log -match "Verificando|🔐") {
                        Write-Host "  🔐 $log" -ForegroundColor Blue
                    } else {
                        Write-Host "  📋 $log" -ForegroundColor Gray
                    }
                }
                Write-Host ""
            }
        }
        
        Start-Sleep -Seconds 2
        
    } catch {
        Write-Host "❌ Erro: $_" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}

