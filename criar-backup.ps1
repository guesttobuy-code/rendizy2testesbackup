# Script para criar backup do projeto Rendizy
$root = $PSScriptRoot
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$dest = Join-Path (Split-Path $root -Parent) ("Rendizy_Backup_$ts.zip")

Write-Host "Criando backup..." -ForegroundColor Yellow
Write-Host "Origem: $root" -ForegroundColor Cyan
Write-Host "Destino: $dest" -ForegroundColor Cyan

# Excluir arquivos temporários e pastas grandes
$exclude = @('node_modules', '.git', '.next', 'dist', 'build', '.vercel', '.turbo', '.cache', 'supabase\.temp')

Get-ChildItem -Path $root -Recurse -File | 
    Where-Object { 
        $excludePath = $false
        foreach ($ex in $exclude) {
            if ($_.FullName -match [regex]::Escape($ex)) {
                $excludePath = $true
                break
            }
        }
        -not $excludePath
    } | 
    Compress-Archive -DestinationPath $dest -Force

Write-Host ""
Write-Host "✓ Backup criado com sucesso!" -ForegroundColor Green
Write-Host "Local: $dest" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

















