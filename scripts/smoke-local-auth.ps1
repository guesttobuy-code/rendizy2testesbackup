<#
Smoke rápido de autenticação local (LOCAL_MODE=true).
1) POST /auth/login com admin/admin
2) GET  /auth/me com o token
Uso: .\scripts\smoke-local-auth.ps1
Opcional: defina BASE_URL (default http://127.0.0.1:54321/functions/v1/rendizy-server)
#>

$baseUrl = $env:BASE_URL
if (-not $baseUrl -or $baseUrl -eq "") {
    $baseUrl = "http://127.0.0.1:54321/functions/v1/rendizy-server"
}

Write-Host "🔍 BASE URL:" $baseUrl

try {
    $loginBody = @{ username = "admin"; password = "admin" } | ConvertTo-Json
    Write-Host "`n➡️  POST /auth/login"
    $loginResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $loginResp.data.token
    if (-not $token) {
        throw "Token não retornado no login. Resposta: $($loginResp | ConvertTo-Json -Depth 5)"
    }
    Write-Host "✅ Token recebido:" $token.Substring(0, [Math]::Min(16, $token.Length))"..."

    Write-Host "`n➡️  GET /auth/me com Authorization: Bearer <token>"
    $headers = @{ Authorization = "Bearer $token" }
    $meResp = Invoke-RestMethod -Method Get -Uri "$baseUrl/auth/me" -Headers $headers
    Write-Host "✅ /auth/me ok:"
    $meResp | ConvertTo-Json -Depth 5 | Write-Host
}
catch {
    Write-Error "❌ Erro no smoke de auth: $_"
    exit 1
}
