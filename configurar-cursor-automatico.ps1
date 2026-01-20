# Script para Configurar Cursor Automaticamente
# Adiciona PowerShell 7 como terminal padrão

Write-Host "=== CONFIGURAR CURSOR PARA POWERSHELL 7 ===" -ForegroundColor Cyan
Write-Host ""

$cursorSettingsPath = "$env:APPDATA\Cursor\User\settings.json"

# Verificar se arquivo existe
if (-not (Test-Path $cursorSettingsPath)) {
    Write-Host "Criando arquivo de configuracoes..." -ForegroundColor Yellow
    $settingsDir = Split-Path $cursorSettingsPath -Parent
    if (-not (Test-Path $settingsDir)) {
        New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
    }
    $defaultSettings = @{
        "terminal.integrated.profiles.windows" = @{
            "PowerShell 7" = @{
                "path" = "C:\Program Files\PowerShell\7\pwsh.exe"
                "icon" = "terminal-powershell"
                "args" = @()
            }
        }
        "terminal.integrated.defaultProfile.windows" = "PowerShell 7"
    }
    $defaultSettings | ConvertTo-Json -Depth 10 | Set-Content $cursorSettingsPath -Encoding UTF8
    Write-Host "Arquivo criado!" -ForegroundColor Green
} else {
    Write-Host "Arquivo de configuracoes encontrado." -ForegroundColor Green
    Write-Host "Caminho: $cursorSettingsPath" -ForegroundColor Gray
    Write-Host ""
    
    # Ler configurações existentes
    try {
        $settingsContent = Get-Content $cursorSettingsPath -Raw -Encoding UTF8
        $settings = $settingsContent | ConvertFrom-Json
        
        Write-Host "Configuracoes atuais:" -ForegroundColor Yellow
        
        # Verificar se já tem PowerShell 7 configurado
        $needsUpdate = $false
        
        if (-not $settings.'terminal.integrated.defaultProfile.windows') {
            Write-Host "  ⚠️  Terminal padrao NAO configurado" -ForegroundColor Yellow
            $needsUpdate = $true
        } else {
            Write-Host "  ✅ Terminal padrao: $($settings.'terminal.integrated.defaultProfile.windows')" -ForegroundColor Green
            if ($settings.'terminal.integrated.defaultProfile.windows' -ne "PowerShell 7") {
                Write-Host "  ⚠️  Terminal padrao nao e PowerShell 7" -ForegroundColor Yellow
                $needsUpdate = $true
            }
        }
        
        if (-not $settings.'terminal.integrated.profiles.windows') {
            Write-Host "  ⚠️  Perfis de terminal NAO configurados" -ForegroundColor Yellow
            $needsUpdate = $true
        } else {
            Write-Host "  ✅ Perfis de terminal configurados" -ForegroundColor Green
        }
        
        Write-Host ""
        
        if ($needsUpdate) {
            Write-Host "Atualizando configuracoes..." -ForegroundColor Yellow
            
            # Adicionar/atualizar configurações
            $settings | Add-Member -MemberType NoteProperty -Name "terminal.integrated.profiles.windows" -Value @{
                "PowerShell 7" = @{
                    "path" = "C:\Program Files\PowerShell\7\pwsh.exe"
                    "icon" = "terminal-powershell"
                    "args" = @()
                }
            } -Force
            
            $settings | Add-Member -MemberType NoteProperty -Name "terminal.integrated.defaultProfile.windows" -Value "PowerShell 7" -Force
            
            # Salvar
            $settings | ConvertTo-Json -Depth 10 | Set-Content $cursorSettingsPath -Encoding UTF8
            
            Write-Host "✅ Configuracoes atualizadas!" -ForegroundColor Green
        } else {
            Write-Host "✅ Configuracoes ja estao corretas!" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ Erro ao processar configuracoes: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Fazendo backup e criando novo arquivo..." -ForegroundColor Yellow
        
        # Backup
        $backupPath = "$cursorSettingsPath.backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
        Copy-Item $cursorSettingsPath $backupPath
        Write-Host "Backup salvo em: $backupPath" -ForegroundColor Gray
        
        # Criar novo
        $newSettings = @{
            "terminal.integrated.profiles.windows" = @{
                "PowerShell 7" = @{
                    "path" = "C:\Program Files\PowerShell\7\pwsh.exe"
                    "icon" = "terminal-powershell"
                    "args" = @()
                }
            }
            "terminal.integrated.defaultProfile.windows" = "PowerShell 7"
        }
        $newSettings | ConvertTo-Json -Depth 10 | Set-Content $cursorSettingsPath -Encoding UTF8
        Write-Host "✅ Novo arquivo criado!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== CONFIGURACAO CONCLUIDA ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Reinicie o Cursor completamente (feche todas as janelas)" -ForegroundColor White
Write-Host "  2. Abra um terminal (Ctrl + `)" -ForegroundColor White
Write-Host "  3. Verifique se aparece PowerShell 7" -ForegroundColor White
Write-Host ""
Write-Host "Arquivo configurado: $cursorSettingsPath" -ForegroundColor Gray


