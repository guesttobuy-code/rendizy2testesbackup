@echo off
chcp 65001 >nul
title SERVIDOR RENDIZY - LOCALHOST
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║         SERVIDOR RENDIZY - INICIANDO...                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/4] Parando processos Node existentes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo ❌ ERRO: Node.js não encontrado!
    echo    Instale Node.js de: https://nodejs.org
    echo.
    pause
    exit /b 1
)
node --version
echo.

echo [3/4] Instalando/Atualizando dependências...
call npm install
if errorlevel 1 (
    color 0C
    echo.
    echo ❌ ERRO ao instalar dependências!
    echo.
    pause
    exit /b 1
)
echo.

echo [4/4] Iniciando servidor Vite...
echo.
color 0B
echo ════════════════════════════════════════════════════════════
echo   ✅ SERVIDOR INICIANDO...
echo ════════════════════════════════════════════════════════════
echo.
echo   🌐 URL: http://localhost:5173
echo   📁 Diretório: %CD%
echo.
echo   ⏳ Aguarde alguns segundos para o servidor iniciar...
echo   💡 O navegador abrirá automaticamente
echo.
echo   ⚠️  Para parar o servidor, pressione Ctrl+C
echo.
echo ════════════════════════════════════════════════════════════
echo.

timeout /t 2 /nobreak >nul

call npm run dev

if errorlevel 1 (
    color 0C
    echo.
    echo ❌ ERRO ao iniciar servidor!
    echo    Verifique os erros acima.
    echo.
    pause
)
