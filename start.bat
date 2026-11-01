@echo off
title Guigu Hanzi Tutor
echo ========================================================
echo    Iniciando Guigu Hanzi Tutor (鬼谷汉字)
echo    Dicionario e Reconhecimento de Caligrafia Chinesa
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "data\cedict.db" (
    echo [1/2] Banco de dados nao encontrado. Gerando cedict.db...
    python build_db.py
    if errorlevel 1 (
        echo [ERRO] Falha ao gerar banco de dados. Verifique a conexao ou Python.
        pause
        exit /b 1
    )
)

echo [2/2] Abrindo navegador e iniciando servidor local...
start http://localhost:8088
python server.py
pause
