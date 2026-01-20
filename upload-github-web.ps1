# Script para abrir o GitHub no navegador para upload manual
# METODO MAIS SIMPLES - sem precisar de token!

Write-Host "Abrindo GitHub para Upload Manual..." -ForegroundColor Cyan
Write-Host ""

$repoUrl = "https://github.com/suacasarendemais-png/Rendizy2producao/upload"
$zipPath = "C:\Users\rafae\Downloads"

Write-Host "Instrucoes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. O navegador vai abrir a pagina de upload do GitHub" -ForegroundColor White
Write-Host "2. Faca login se ainda nao estiver logado" -ForegroundColor White
Write-Host "3. Arraste os arquivos ou clique em 'choose your files'" -ForegroundColor White
Write-Host "4. Digite uma mensagem de commit" -ForegroundColor White
Write-Host "5. Clique em 'Commit changes'" -ForegroundColor White
Write-Host ""
Write-Host "PRONTO! Sem token, sem complicacao!" -ForegroundColor Green
Write-Host ""

# Abrir navegador
Start-Process "https://github.com/suacasarendemais-png/Rendizy2producao/upload"

Write-Host ""
Write-Host "Dica: Voce tambem pode fazer upload do ZIP completo:" -ForegroundColor Cyan
Write-Host "   Local do ZIP que criamos: $zipPath" -ForegroundColor Gray
Write-Host ""

