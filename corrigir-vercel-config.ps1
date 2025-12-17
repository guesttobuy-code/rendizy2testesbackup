# Script rápido para corrigir configuração do Vercel

Write-Host "Corrigindo configuracao do Vercel..." -ForegroundColor Cyan

$baseDir = Get-Location
$rendizyDir = Join-Path $baseDir "RendizyPrincipal"
$vercelJsonRendizy = Join-Path $rendizyDir "vercel.json"
$vercelJsonRoot = Join-Path $baseDir "vercel.json"

# Criar/atualizar vercel.json na raiz apontando para RendizyPrincipal
$vercelConfig = @{
    buildCommand = "cd RendizyPrincipal && npm run build"
    outputDirectory = "RendizyPrincipal/dist"
    framework = "vite"
    rewrites = @(
        @{
            source = "/(.*)"
            destination = "/index.html"
        }
    )
    headers = @(
        @{
            source = "/assets/(.*)"
            headers = @(
                @{
                    key = "Cache-Control"
                    value = "public, max-age=31536000, immutable"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$vercelConfig | Set-Content $vercelJsonRoot -Encoding UTF8
Write-Host "OK: vercel.json criado/atualizado na raiz" -ForegroundColor Green

# Também garantir que o de RendizyPrincipal está correto
if (Test-Path $vercelJsonRendizy) {
    $rendizyConfig = Get-Content $vercelJsonRendizy -Raw | ConvertFrom-Json
    
    if ($rendizyConfig.outputDirectory -ne "dist") {
        $rendizyConfig.outputDirectory = "dist"
        $rendizyConfig | ConvertTo-Json -Depth 10 | Set-Content $vercelJsonRendizy -Encoding UTF8
        Write-Host "OK: vercel.json em RendizyPrincipal corrigido" -ForegroundColor Green
    }
}

Write-Host "`nConfiguracao corrigida! Pronto para deploy." -ForegroundColor Green










