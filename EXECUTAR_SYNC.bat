@echo off
chcp 65001 >nul
title Sincronizacao GitHub

echo.
echo ============================================================
echo   SINCRONIZACAO GIT COM GITHUB
echo ============================================================
echo.

REM Configurar Git para nao usar pager
git config --global core.pager ""

echo [1/5] Adicionando todas as mudancas...
git add -A
if errorlevel 1 (
    echo ERRO ao adicionar arquivos!
    pause
    exit /b 1
)
echo OK
echo.

echo [2/5] Fazendo commit das mudancas...
git commit -m "Update local: %date% %time%"
if errorlevel 1 (
    echo Nada para commitar ou ja commitado
)
echo.

echo [3/5] Atualizando referencias do remoto...
git fetch origin
if errorlevel 1 (
    echo ERRO ao fazer fetch!
    pause
    exit /b 1
)
echo OK
echo.

echo [4/5] Fazendo merge com origin/main...
echo (Isso pode criar conflitos - se acontecer, resolva manualmente)
git merge origin/main --no-edit
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   CONFLITOS DETECTADOS!
    echo ============================================================
    echo.
    echo Voce precisa resolver os conflitos manualmente.
    echo.
    echo Arquivos em conflito:
    git diff --name-only --diff-filter=U
    echo.
    echo Apos resolver, execute:
    echo   git add .
    echo   git commit
    echo   git push origin main
    echo.
    pause
    exit /b 1
)
echo OK
echo.

echo [5/5] Fazendo push para GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   ERRO NO PUSH!
    echo ============================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   SUCESSO! TUDO SINCRONIZADO!
echo ============================================================
echo.
pause

