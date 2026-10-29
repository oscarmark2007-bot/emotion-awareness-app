@echo off
chcp 65001 >nul
title 情緒觀察表 - 無憂覺察日記
cd /d "%~dp0"

echo ========================================================
echo   🌸 正在啟動「情緒觀察表」本機伺服器與手機連線服務...
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python server.py
) else (
    echo [提示] 未偵測到 Python，將直接開啟離線網頁版...
    start "" "index.html"
)

pause
