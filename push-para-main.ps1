# Script para fazer push para main (branch padrão do GitHub)
$log = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\powershell-outputs.txt"
Set-Location "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"

Write-Host "=== PUSH PARA MAIN ===" -ForegroundColor Cyan

# Verificar branch atual
$branch = git branch --show-current
Write-Host "Branch atual: $branch" -ForegroundColor Yellow

# Se estiver em master, renomear para main
if ($branch -eq "master") {
    Write-Host "Renomeando branch de master para main..." -ForegroundColor Yellow
    git branch -m master main
    $branch = "main"
}

# Fazer push
Write-Host "Fazendo push para origin/$branch..." -ForegroundColor Yellow
$result = git push -u origin $branch 2>&1 | Out-String

# Salvar no log
"[$(Get-Date -Format 'HH:mm:ss')] Push para $branch" | Out-File $log -Append -Encoding UTF8
$result | Out-File $log -Append -Encoding UTF8
"Exit: $LASTEXITCODE" | Out-File $log -Append -Encoding UTF8

# Mostrar resultado
Write-Host "`nResultado:" -ForegroundColor Cyan
Write-Host $result

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Push realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Erro no push. Verifique acima." -ForegroundColor Red
}

Write-Host "`nLog salvo em: $log" -ForegroundColor Gray
