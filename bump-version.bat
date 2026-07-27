@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo Area27 Tools - Automacao de Versao e Release
echo ===================================================
echo.

set /p NEW_VER="Digite o numero da nova versao (ex: 1.0.2): "

if "%NEW_VER%"=="" (
    echo [ERRO] Nenhuma versao foi informada. Operacao cancelada.
    pause
    exit /b 1
)

echo.
echo Atualizando versao para: v%NEW_VER%...

set CSPROJ=Backend\Area27.Tools.API\Area27.Tools.API.csproj
set PACKAGE_JSON=Frontend\area27-ui\package.json

:: 1. Atualiza Versao no .csproj
powershell -NoProfile -Command "(Get-Content '%CSPROJ%') -replace '<Version>.*?</Version>', '<Version>%NEW_VER%</Version>' -replace '<AssemblyVersion>.*?</AssemblyVersion>', '<AssemblyVersion>%NEW_VER%.0</AssemblyVersion>' -replace '<InformationalVersion>.*?</InformationalVersion>', '<InformationalVersion>%NEW_VER%</InformationalVersion>' | Set-Content '%CSPROJ%'"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend (.csproj) atualizado para %NEW_VER%.
) else (
    echo [ERRO] Falha ao atualizar %CSPROJ%.
    pause
    exit /b 1
)

:: 2. Atualiza Versao no package.json
powershell -NoProfile -Command "(Get-Content '%PACKAGE_JSON%') -replace '\"version\": \".*?\"', '\"version\": \"%NEW_VER%\"' | Set-Content '%PACKAGE_JSON%'"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend (package.json) atualizado para %NEW_VER%.
) else (
    echo [ERRO] Falha ao atualizar %PACKAGE_JSON%.
    pause
    exit /b 1
)

echo.
echo Verificando compilacao do Backend...
dotnet build Backend\Area27.Tools.slnx --configuration Release -v minimal

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] A compilacao do Backend falhou! Verifique os erros acima antes de gerar a release.
    pause
    exit /b 1
)

echo [OK] Backend compilou com sucesso.

echo.
echo Criando commit e tag no Git...
git add %CSPROJ% %PACKAGE_JSON%
git commit -m "chore(release): bump version to v%NEW_VER%"
git tag -a "v%NEW_VER%" -m "Release v%NEW_VER%"

echo.
echo ===================================================
echo Versao v%NEW_VER% preparada localmente!
echo ===================================================
echo.

set /p PUSH_NOW="Deseja fazer git push e enviar a nova tag para o GitHub agora? (S/N): "

if /i "%PUSH_NOW%"=="S" (
    echo.
    echo Enviando alteracoes e tags para o GitHub...
    git push origin main
    git push origin "v%NEW_VER%"
    echo.
    echo Release v%NEW_VER% enviada com sucesso!
) else (
    echo.
    echo Alteracoes salvas localmente. Para enviar depois, execute:
    echo git push origin main ^&^& git push origin v%NEW_VER%
)

echo.
pause
