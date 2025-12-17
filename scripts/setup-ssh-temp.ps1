<#
setup-ssh-temp.ps1
Cria um usuário temporário, instala OpenSSH Server (se necessário), adiciona sua chave pública
em `C:\Users\<user>\.ssh\authorized_keys`, e abre a porta no firewall (opcionalmente apenas para um IP).

Uso recomendado (executar em PowerShell como Administrador):
.\scripts\setup-ssh-temp.ps1 -UserName dev_remote -PublicKey 'ssh-ed25519 AAAA...' -AllowedIP '1.2.3.4' -Port 2222

Parâmetros:
 -UserName   : nome da conta local a criar (padrão: dev_remote)
 -PublicKey  : chave pública SSH (formato openssh, ex: ssh-rsa AAAA...)
 -AllowedIP  : (opcional) restringe firewall a esse IP (ex: 1.2.3.4). Se vazio, abre para todos.
 -Port       : porta SSH a usar (padrão 22). Se usar porta !=22, atualize também o cliente.

Atenção:
 - Remova a conta e a regra de firewall ao finalizar: eu te mostro como.
 - Não exponha keys sensíveis em locais públicos.
#>

param(
  [string]$UserName = 'dev_remote',
  [string]$PublicKey = '',
  [string]$AllowedIP = '',
  [int]$Port = 22
)

function Require-Admin {
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Error "Este script precisa ser executado em uma sessão do PowerShell iniciada como Administrador."; exit 1
  }
}

Require-Admin

Write-Output "[1/6] Verificando OpenSSH Server..."
$cap = Get-WindowsCapability -Online -Name OpenSSH.Server* -ErrorAction SilentlyContinue
if (-not $cap -or $cap.State -ne 'Installed') {
  Write-Output "OpenSSH Server não está instalado. Instalando... (pode demorar alguns minutos)"
  Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
} else {
  Write-Output "OpenSSH Server já instalado."
}

Write-Output "[2/6] Iniciando e configurando serviço sshd..."
Start-Service sshd -ErrorAction SilentlyContinue
Set-Service -Name sshd -StartupType Automatic

# Se porta diferente de 22, atualize sshd_config
if ($Port -ne 22) {
  $sshdConfig = 'C:\ProgramData\ssh\sshd_config'
  if (Test-Path $sshdConfig) {
    Write-Output "Atualizando porta SSH em $sshdConfig para $Port"
    # comentar linhas Port existentes e adicionar a nova no topo
    (Get-Content $sshdConfig) | ForEach-Object {
      if ($_ -match '^\s*Port\s+') { "# $_" } else { $_ }
    } | Set-Content $sshdConfig -Force
    "Port $Port" | Add-Content $sshdConfig
    Write-Output "Reiniciando sshd para aplicar porta..."
    Restart-Service sshd
  } else {
    Write-Warning "Arquivo sshd_config não encontrado em $sshdConfig — pulei alteração de porta."
  }
}

Write-Output "[3/6] Criando usuário local (se não existir)..."
if (-not (Get-LocalUser -Name $UserName -ErrorAction SilentlyContinue)) {
  $secure = Read-Host -AsSecureString "Digite uma senha temporária para $UserName (será pedida uma vez agora)"
  New-LocalUser -Name $UserName -Password $secure -FullName "Usuário temporário para acesso remoto" -Description "Criado por setup-ssh-temp.ps1" -PasswordNeverExpires:$true
  Add-LocalGroupMember -Group 'Users' -Member $UserName
  Write-Output "Usuário $UserName criado."
} else {
  Write-Output "Usuário $UserName já existe — pulando criação."
}

# Preparar pasta .ssh
$profilePath = Join-Path -Path "C:\Users" -ChildPath $UserName
$sshDir = Join-Path $profilePath ".ssh"
$authFile = Join-Path $sshDir "authorized_keys"

if (-not (Test-Path $profilePath)) {
  Write-Warning "A pasta de perfil $profilePath não existe ainda. Criando e definindo permissões mínimas."
  New-Item -ItemType Directory -Path $profilePath -Force | Out-Null
}

if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir -Force | Out-Null }

if ($PublicKey -ne '') {
  Write-Output "[4/6] Escrevendo chave pública em $authFile"
  $PublicKey.Trim() | Out-File -FilePath $authFile -Encoding ascii -Force
} else {
  if (-not (Test-Path $authFile)) { "# Cole aqui a sua chave pública SSH (ex: ssh-ed25519 AAAA...)" | Out-File -FilePath $authFile -Encoding ascii -Force }
  Write-Warning "Nenhuma chave pública fornecida. Abra $authFile e cole sua chave pública antes de tentar logar."
}

# Ajustar permissões
Write-Output "Definindo permissões NTFS na pasta .ssh"
icacls $sshDir /inheritance:r | Out-Null
icacls $sshDir /grant "$UserName:F" | Out-Null
icacls $sshDir /grant "Administrators:F" | Out-Null
icacls $authFile /grant "$UserName:F" | Out-Null
icacls $authFile /grant "Administrators:F" | Out-Null

Write-Output "[5/6] Configurando regra de firewall (porta $Port)"
$ruleName = "Allow_SSH_for_$UserName" + (Get-Random)
if ($AllowedIP -and $AllowedIP.Trim() -ne '') {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -RemoteAddress $AllowedIP -Profile Any | Out-Null
  Write-Output "Regra de firewall criada permitindo $AllowedIP na porta $Port (Rule: $ruleName)"
} else {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
  Write-Output "Regra de firewall criada permitindo toda a rede na porta $Port (Rule: $ruleName)"
}

Write-Output "[6/6] Finalizando — verificações e instruções de conexão"
$hostName = (Get-CimInstance Win32_ComputerSystem).DNSHostName
$ipAddrs = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias (Get-NetIPInterface | Where-Object { $_.AddressFamily -eq 'IPv4' -and $_.ConnectionState -eq 'Connected' } | Select-Object -First 1).InterfaceAlias).IPv4Address

Write-Output "Conexão SSH (exemplo): ssh -p $Port $UserName@<SEU_IP>"
Write-Output "Se você executou com -PublicKey, use sua chave privada correspondente. Se não, use a senha que criou no passo de criação do usuário." 
Write-Output "Para remover o usuário e a regra de firewall depois:"
Write-Output "  Remove-LocalUser -Name $UserName"
Write-Output "  Get-NetFirewallRule -DisplayName '$ruleName' | Remove-NetFirewallRule"
Write-Output "Logs: verifique eventos do Windows e o serviço sshd (Get-Service sshd; Get-EventLog -LogName System -Newest 50)"

Write-Output "Script concluído."