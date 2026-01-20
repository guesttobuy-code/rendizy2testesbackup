@echo off
echo ========================================
echo   INICIANDO SERVIDOR RENDIZY
echo ========================================
echo.

cd /d "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP\RendizyPrincipal"

echo Verificando Node.js...
node --version
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)

echo.
echo Parando processos Node existentes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo Instalando dependencias (se necessario)...
call npm install

echo.
echo Iniciando servidor na porta 5173...
echo URL: http://localhost:5173
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

call npm run dev

pause
