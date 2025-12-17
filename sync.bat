@echo off
chcp 65001 >nul
set GIT_PAGER=
set PAGER=

echo ========================================
echo SINCRONIZANDO COM GITHUB
echo ========================================
echo.

echo 1. Adicionando mudancas...
git --no-pager add -A
if errorlevel 1 goto error

echo 2. Fazendo commit...
git --no-pager commit -m "Update local antes de merge"
if errorlevel 1 (
    echo Nada para commitar, continuando...
)

echo 3. Atualizando remoto...
git --no-pager fetch origin
if errorlevel 1 goto error

echo 4. Fazendo merge...
git --no-pager merge origin/main --no-edit
if errorlevel 1 (
    echo CONFLITOS DETECTADOS!
    echo Verifique os arquivos em conflito e resolva manualmente.
    goto end
)

echo 5. Fazendo push...
git --no-pager push origin main
if errorlevel 1 goto error

echo.
echo ========================================
echo SUCESSO! TUDO SINCRONIZADO!
echo ========================================
goto end

:error
echo.
echo ========================================
echo ERRO!
echo ========================================
exit /b 1

:end
pause

