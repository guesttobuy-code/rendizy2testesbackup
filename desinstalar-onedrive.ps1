# Script para desinstalar OneDrive e mover projeto para local seguro
Write-Host "=== DESINSTALAR ONEDRIVE ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se OneDrive está rodando
$onedrive = Get-Process -Name "OneDrive*" -ErrorAction SilentlyContinue
if ($onedrive) {
    Write-Host "⚠️  OneDrive está rodando. Parando processos..." -ForegroundColor Yellow
    Stop-Process -Name "OneDrive*" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Processos do OneDrive parados" -ForegroundColor Green
} else {
    Write-Host "✅ OneDrive não está rodando" -ForegroundColor Green
}

Write-Host ""
Write-Host "OPÇÕES:" -ForegroundColor Yellow
Write-Host "1. Desinstalar OneDrive completamente" -ForegroundColor Cyan
Write-Host "2. Apenas pausar sincronização desta pasta" -ForegroundColor Cyan
Write-Host "3. Mover projeto para fora do OneDrive" -ForegroundColor Cyan
Write-Host ""

$opcao = Read-Host "Escolha uma opção (1, 2 ou 3)"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "=== DESINSTALANDO ONEDRIVE ===" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  ATENÇÃO: Isso vai desinstalar o OneDrive completamente!" -ForegroundColor Yellow
        Write-Host "Você perderá a sincronização de TODAS as pastas do OneDrive." -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Tem certeza? (S/N)"
        
        if ($confirm -eq "S" -or $confirm -eq "s") {
            Write-Host ""
            Write-Host "Desinstalando OneDrive..." -ForegroundColor Yellow
            
            # Desinstalar OneDrive
            $onedrivePath = "${env:ProgramFiles}\Microsoft OneDrive\OneDrive.exe"
            if (Test-Path $onedrivePath) {
                Start-Process $onedrivePath -ArgumentList "/uninstall" -Wait
            } else {
                $onedrivePath = "${env:ProgramFiles(x86)}\Microsoft OneDrive\OneDrive.exe"
                if (Test-Path $onedrivePath) {
                    Start-Process $onedrivePath -ArgumentList "/uninstall" -Wait
                } else {
                    Write-Host "❌ OneDrive não encontrado nos locais padrão" -ForegroundColor Red
                    Write-Host "Tente desinstalar manualmente pelo Painel de Controle" -ForegroundColor Yellow
                }
            }
            
            Write-Host ""
            Write-Host "✅ OneDrive desinstalado!" -ForegroundColor Green
            Write-Host ""
            Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Cyan
            Write-Host "1. Reinicie o computador" -ForegroundColor White
            Write-Host "2. Mova o projeto para C:\dev\RENDIZY PASTA OFICIAL" -ForegroundColor White
        } else {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "=== PAUSAR SINCRONIZAÇÃO DESTA PASTA ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para pausar a sincronização desta pasta:" -ForegroundColor Yellow
        Write-Host "1. Clique com botão direito na pasta 'RENDIZY PASTA OFICIAL'" -ForegroundColor White
        Write-Host "2. Selecione 'OneDrive' > 'Pausar sincronização'" -ForegroundColor White
        Write-Host ""
        Write-Host "OU execute este comando no PowerShell (como Administrador):" -ForegroundColor Yellow
        Write-Host "  Set-ItemProperty -Path 'HKCU:\Software\Microsoft\OneDrive' -Name 'TenantId' -Value 'Paused'" -ForegroundColor Cyan
    }
    
    "3" {
        Write-Host ""
        Write-Host "=== MOVER PROJETO PARA FORA DO ONEDRIVE ===" -ForegroundColor Cyan
        Write-Host ""
        
        $sourcePath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
        $destPath = "C:\dev\RENDIZY PASTA OFICIAL"
        
        Write-Host "Origem: $sourcePath" -ForegroundColor Yellow
        Write-Host "Destino: $destPath" -ForegroundColor Yellow
        Write-Host ""
        
        $confirm = Read-Host "Mover projeto? (S/N)"
        
        if ($confirm -eq "S" -or $confirm -eq "s") {
            # Criar diretório destino
            if (-not (Test-Path "C:\dev")) {
                New-Item -Path "C:\dev" -ItemType Directory -Force | Out-Null
            }
            
            Write-Host ""
            Write-Host "Movendo projeto... (isso pode demorar)" -ForegroundColor Yellow
            
            # Mover pasta
            try {
                Move-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
                Write-Host "✅ Projeto movido com sucesso!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Nova localização: $destPath" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
                Write-Host "1. Feche o Cursor" -ForegroundColor White
                Write-Host "2. Abra o Cursor novamente" -ForegroundColor White
                Write-Host "3. Abra o workspace em: $destPath" -ForegroundColor White
            } catch {
                Write-Host "❌ Erro ao mover: $_" -ForegroundColor Red
                Write-Host ""
                Write-Host "Tente mover manualmente pelo Windows Explorer" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
        }
    }
    
    default {
        Write-Host "Opção inválida." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
