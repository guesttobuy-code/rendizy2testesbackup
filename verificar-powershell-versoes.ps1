# Script para verificar versões do PowerShell instaladas
# Salva outputs em arquivo para o Auto ler

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\powershell-versoes.txt"

"" | Out-File -FilePath $outputFile -Encoding UTF8

function Write-ToFile {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-ToFile "=== VERIFICAÇÃO DE VERSÕES DO POWERSHELL ==="
Write-ToFile ""

# 1. Verificar PowerShell atual (Windows PowerShell)
Write-ToFile "1. POWERSHELL ATUAL (Windows PowerShell):"
Write-ToFile "   Versão: $($PSVersionTable.PSVersion)"
Write-ToFile "   Edição: $($PSVersionTable.PSEdition)"
Write-ToFile "   Caminho: $PSHome"
Write-ToFile ""

# 2. Verificar PowerShell 7
Write-ToFile "2. VERIFICANDO POWERSHELL 7:"
$pwshPath = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshPath) {
    Write-ToFile "   ✅ PowerShell 7 encontrado!"
    Write-ToFile "   Caminho: $($pwshPath.Source)"
    
    # Executar pwsh para pegar versão
    $pwshVersion = & pwsh -Command '$PSVersionTable.PSVersion.ToString()' 2>&1
    Write-ToFile "   Versão: $pwshVersion"
    
    # Verificar se está no PATH
    $pwshInPath = $env:PATH -split ';' | Where-Object { $_ -like "*pwsh*" }
    if ($pwshInPath) {
        Write-ToFile "   ✅ PowerShell 7 está no PATH"
    } else {
        Write-ToFile "   ⚠️ PowerShell 7 NÃO está no PATH"
    }
} else {
    Write-ToFile "   ❌ PowerShell 7 NÃO encontrado!"
    Write-ToFile "   Instale do site: https://aka.ms/powershell-release"
}
Write-ToFile ""

# 3. Verificar instalações via winget
Write-ToFile "3. VERIFICANDO INSTALAÇÕES VIA WINGET:"
$wingetCheck = winget list --name PowerShell 2>&1 | Out-String
Write-ToFile "   Output: $wingetCheck"
Write-ToFile ""

# 4. Verificar registros no Windows
Write-ToFile "4. VERIFICANDO REGISTROS NO WINDOWS:"
$regPath = "HKLM:\SOFTWARE\Microsoft\PowerShell\*\PowerShellEngine"
$regEntries = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
if ($regEntries) {
    foreach ($entry in $regEntries) {
        Write-ToFile "   PowerShell Engine: $($entry.PSVersion)"
        Write-ToFile "   Caminho: $($entry.ApplicationBase)"
    }
} else {
    Write-ToFile "   Nenhum registro encontrado"
}
Write-ToFile ""

# 5. IMPORTANTE: Sobre desinstalar PowerShell 5.1
Write-ToFile "5. ⚠️ IMPORTANTE SOBRE POWERSHELL 5.1:"
Write-ToFile "   O PowerShell 5.1 (Windows PowerShell) vem INTEGRADO ao Windows"
Write-ToFile "   NÃO é recomendado desinstalá-lo (pode quebrar o sistema)"
Write-ToFile "   SOLUÇÃO: Configure o Cursor para usar PowerShell 7 como padrão"
Write-ToFile ""

# 6. Verificar configuração do Cursor
Write-ToFile "6. VERIFICANDO CONFIGURAÇÃO DO CURSOR:"
$cursorSettings = "$env:APPDATA\Cursor\User\settings.json"
if (Test-Path $cursorSettings) {
    Write-ToFile "   ✅ Arquivo de configurações encontrado: $cursorSettings"
    $settings = Get-Content $cursorSettings -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($settings.'terminal.integrated.defaultProfile.windows') {
        Write-ToFile "   Terminal padrão configurado: $($settings.'terminal.integrated.defaultProfile.windows')"
    } else {
        Write-ToFile "   ⚠️ Terminal padrão NÃO configurado"
    }
} else {
    Write-ToFile "   ⚠️ Arquivo de configurações NÃO encontrado"
}
Write-ToFile ""

Write-ToFile "=== VERIFICAÇÃO CONCLUÍDA ==="
Write-ToFile "Arquivo salvo em: $outputFile"

Write-Host "`n✅ Verificação concluída! Output salvo em:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Cyan
