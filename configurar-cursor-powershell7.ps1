# Script para configurar Cursor para usar PowerShell 7 como padrão
# Salva outputs em arquivo para o Auto ler

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\config-cursor-pwsh7.txt"

"" | Out-File -FilePath $outputFile -Encoding UTF8

function Write-ToFile {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

function Write-Output-Both {
    param([string]$Message, [string]$Color = "White")
    Write-ToFile $Message
    Write-Host $Message -ForegroundColor $Color
}

Write-Output-Both "=== CONFIGURAR CURSOR PARA POWERSHELL 7 ===" "Cyan"
Write-Output-Both ""

# 1. Verificar se PowerShell 7 está instalado
Write-Output-Both "1. Verificando se PowerShell 7 está instalado..." "Yellow"
$pwshPath = Get-Command pwsh -ErrorAction SilentlyContinue
if (-not $pwshPath) {
    Write-Output-Both "   ❌ PowerShell 7 NÃO encontrado!" "Red"
    Write-Output-Both "   Instale do site: https://aka.ms/powershell-release" "Yellow"
    Write-Output-Both "   Ou via winget: winget install --id Microsoft.PowerShell" "Yellow"
    exit 1
}

$pwshVersion = & pwsh -Command '$PSVersionTable.PSVersion.ToString()' 2>&1
Write-Output-Both "   ✅ PowerShell 7 encontrado!" "Green"
Write-Output-Both "   Versão: $pwshVersion" "Gray"
Write-Output-Both "   Caminho: $($pwshPath.Source)" "Gray"
Write-Output-Both ""

# 2. Localizar arquivo de configurações do Cursor
Write-Output-Both "2. Localizando arquivo de configurações do Cursor..." "Yellow"
$cursorSettings = "$env:APPDATA\Cursor\User\settings.json"
$cursorSettingsDir = Split-Path $cursorSettings

if (-not (Test-Path $cursorSettingsDir)) {
    Write-Output-Both "   Criando diretório de configurações..." "Yellow"
    New-Item -ItemType Directory -Path $cursorSettingsDir -Force | Out-Null
}

if (-not (Test-Path $cursorSettings)) {
    Write-Output-Both "   Arquivo não existe. Criando novo..." "Yellow"
    $defaultSettings = @{
        "terminal.integrated.defaultProfile.windows" = "PowerShell"
        "terminal.integrated.profiles.windows" = @{
            "PowerShell" = @{
                "source" = "PowerShell"
                "icon" = "terminal-powershell"
            }
        }
    } | ConvertTo-Json -Depth 10
    $defaultSettings | Out-File -FilePath $cursorSettings -Encoding UTF8
    Write-Output-Both "   ✅ Arquivo criado!" "Green"
} else {
    Write-Output-Both "   ✅ Arquivo encontrado: $cursorSettings" "Green"
}
Write-Output-Both ""

# 3. Ler configurações atuais
Write-Output-Both "3. Lendo configurações atuais..." "Yellow"
try {
    $settingsContent = Get-Content $cursorSettings -Raw
    $settings = $settingsContent | ConvertFrom-Json -ErrorAction Stop
    Write-Output-Both "   ✅ Configurações carregadas com sucesso!" "Green"
} catch {
    Write-Output-Both "   ⚠️ Erro ao ler JSON. Criando novo objeto..." "Yellow"
    $settings = @{}
    $settingsContent = "{}"
}
Write-ToFile "   Configurações atuais: $($settings | ConvertTo-Json -Compress)"
Write-Output-Both ""

# 4. Verificar se precisa criar objeto profiles
if (-not $settings.'terminal.integrated.profiles.windows') {
    Write-Output-Both "   Criando objeto profiles..." "Yellow"
    $settings | Add-Member -MemberType NoteProperty -Name "terminal.integrated.profiles.windows" -Value @{} -Force
}

# 5. Configurar PowerShell 7 como perfil padrão
Write-Output-Both "4. Configurando PowerShell 7 como padrão..." "Yellow"

# Encontrar caminho do pwsh.exe
$pwshExe = $pwshPath.Source
Write-ToFile "   Caminho do pwsh.exe: $pwshExe"

# Configurar perfil PowerShell 7
$pwshProfile = @{
    "path" = $pwshExe
    "icon" = "terminal-powershell"
    "args" = @("-NoProfile")
}

# Adicionar ao objeto settings
$settings.'terminal.integrated.profiles.windows'.PowerShell = $pwshProfile
$settings.'terminal.integrated.defaultProfile.windows' = "PowerShell"

Write-Output-Both "   ✅ Perfil PowerShell 7 configurado!" "Green"
Write-Output-Both ""

# 6. Salvar configurações
Write-Output-Both "5. Salvando configurações..." "Yellow"
try {
    # Converter de volta para JSON com formatação
    $jsonContent = $settings | ConvertTo-Json -Depth 10
    
    # Fazer backup do arquivo original
    $backupFile = "$cursorSettings.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $cursorSettings $backupFile -ErrorAction SilentlyContinue
    Write-Output-Both "   Backup criado: $backupFile" "Gray"
    
    # Salvar novo arquivo
    $jsonContent | Out-File -FilePath $cursorSettings -Encoding UTF8 -NoNewline
    Write-Output-Both "   ✅ Configurações salvas!" "Green"
} catch {
    Write-Output-Both "   ❌ Erro ao salvar configurações: $($_.Exception.Message)" "Red"
    Write-ToFile "   Erro: $($_.Exception.Message)"
    exit 1
}
Write-Output-Both ""

# 7. Verificar configuração
Write-Output-Both "6. Verificando configuração final..." "Yellow"
$verifySettings = Get-Content $cursorSettings -Raw | ConvertFrom-Json
$defaultProfile = $verifySettings.'terminal.integrated.defaultProfile.windows'
$pwshProfileConfig = $verifySettings.'terminal.integrated.profiles.windows'.PowerShell

Write-Output-Both "   Terminal padrão: $defaultProfile" "Cyan"
if ($pwshProfileConfig) {
    Write-Output-Both "   ✅ Perfil PowerShell configurado!" "Green"
    Write-Output-Both "   Caminho: $($pwshProfileConfig.path)" "Gray"
} else {
    Write-Output-Both "   ⚠️ Perfil PowerShell não encontrado na verificação" "Yellow"
}
Write-Output-Both ""

Write-Output-Both "=== CONFIGURAÇÃO CONCLUÍDA ===" "Green"
Write-Output-Both "" "White"
Write-Output-Both "PRÓXIMOS PASSOS:" "Cyan"
Write-Output-Both "1. Reinicie o Cursor completamente (feche todas as janelas)" "Yellow"
Write-Output-Both "2. Abra um novo terminal (Ctrl + `)" "Yellow"
Write-Output-Both "3. Verifique se aparece PowerShell 7" "Yellow"
Write-Output-Both "" "White"
Write-Output-Both "Arquivo de log: $outputFile" "Gray"
Write-Output-Both "O Auto pode ler este arquivo para verificar a configuração." "Yellow"
