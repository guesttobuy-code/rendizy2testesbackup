# Renomear ZIP para nome mais facil de identificar
$oldPath = "$env:USERPROFILE\Downloads\rendizy-server-deploy-20251116-214143.zip"
$newPath = "$env:USERPROFILE\Downloads\rendizy-server-v103-CORRECOES-CORS-FINAL.zip"

if (Test-Path $oldPath) {
    Move-Item -Path $oldPath -Destination $newPath -Force
    Write-Host "ZIP renomeado com sucesso!" -ForegroundColor Green
    Write-Host ""
    
    $zip = Get-Item $newPath
    $sizeMB = [math]::Round($zip.Length / 1MB, 2)
    
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "ZIP CRIADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Nome: rendizy-server-v103-CORRECOES-CORS-FINAL.zip" -ForegroundColor Cyan
    Write-Host "Local: $($zip.DirectoryName)" -ForegroundColor Cyan
    Write-Host "Tamanho: $sizeMB MB" -ForegroundColor Cyan
    Write-Host "Data: $($zip.LastWriteTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pronto para deploy no Supabase!" -ForegroundColor Green
} else {
    Write-Host "ZIP original nao encontrado!" -ForegroundColor Red
    Write-Host "Procurando outros ZIPs..." -ForegroundColor Yellow
    
    $zipFiles = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "rendizy-server-deploy-*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($zipFiles) {
        $latestZip = $zipFiles.FullName
        $newPath = "$env:USERPROFILE\Downloads\rendizy-server-v103-CORRECOES-CORS-FINAL.zip"
        Move-Item -Path $latestZip -Destination $newPath -Force
        Write-Host ""
        Write-Host "ZIP mais recente encontrado e renomeado!" -ForegroundColor Green
        Write-Host "Nome original: $($zipFiles.Name)" -ForegroundColor Gray
        Write-Host "Novo nome: rendizy-server-v103-CORRECOES-CORS-FINAL.zip" -ForegroundColor Cyan
        
        $zip = Get-Item $newPath
        $sizeMB = [math]::Round($zip.Length / 1MB, 2)
        
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host "ZIP CRIADO COM SUCESSO!" -ForegroundColor Green
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Nome: rendizy-server-v103-CORRECOES-CORS-FINAL.zip" -ForegroundColor Cyan
        Write-Host "Local: $($zip.DirectoryName)" -ForegroundColor Cyan
        Write-Host "Tamanho: $sizeMB MB" -ForegroundColor Cyan
        Write-Host "Data: $($zip.LastWriteTime.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Pronto para deploy no Supabase!" -ForegroundColor Green
    } else {
        Write-Host "Nenhum ZIP encontrado!" -ForegroundColor Red
    }
}

