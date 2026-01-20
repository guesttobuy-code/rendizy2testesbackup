# Script para criar usuário da Medhome via API
# Email: mrockgarage@gmail.com
# Organization ID: e78c7bb9-7823-44b8-9aee-95c9b073e7b7

Write-Host "`n🔐 Criando usuário para Medhome...`n" -ForegroundColor Cyan

$orgId = "e78c7bb9-7823-44b8-9aee-95c9b073e7b7"
$email = "mrockgarage@gmail.com"
$username = "medhome_admin"
$name = "Medhome Admin"
$password = "medhome123"

# Primeiro, fazer login como SuperAdmin para obter token
Write-Host "📝 Fazendo login como SuperAdmin..." -ForegroundColor Yellow
$loginBody = @{
    username = "rppt"
    password = "root"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/auth/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $loginBody
    
    if ($loginResponse.success -and $loginResponse.data.token) {
        $token = $loginResponse.data.token
        Write-Host "✅ Login realizado com sucesso!`n" -ForegroundColor Green
        
        # Criar usuário
        Write-Host "👤 Criando usuário..." -ForegroundColor Yellow
        $userBody = @{
            organizationId = $orgId
            name = $name
            email = $email
            username = $username
            password = $password
            role = "admin"
            status = "active"
            createdBy = "superadmin_rppt"
        } | ConvertTo-Json
        
        # Nota: A rota /users pode não aceitar password diretamente
        # Pode ser necessário criar via SQL ou ajustar a rota
        Write-Host "⚠️  Nota: Verificar se a rota /users aceita password diretamente" -ForegroundColor Yellow
        Write-Host "📋 Dados do usuário:" -ForegroundColor Cyan
        Write-Host "   Email: $email" -ForegroundColor White
        Write-Host "   Username: $username" -ForegroundColor White
        Write-Host "   Password: $password" -ForegroundColor White
        Write-Host "   Organization ID: $orgId`n" -ForegroundColor White
        
    } else {
        Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
        Write-Host ($loginResponse | ConvertTo-Json -Depth 5) -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`n💡 Sugestão: Criar usuário diretamente via SQL usando criar-usuario-medhome.sql" -ForegroundColor Yellow
}

