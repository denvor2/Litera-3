@echo off
echo ========== LitStudio 2 ==========
echo.
echo Убиваю старые процессы...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1
timeout /t 2 /nobreak

echo.
echo Запускаю Backend (порт 3000)...
start "Backend - LitStudio" cmd /k "cd /d E:\Projects\LitStudio_3\backend && npm run dev"
timeout /t 3 /nobreak

echo.
echo Запускаю Frontend (порт 5176)...
start "Frontend - LitStudio" cmd /k "cd /d E:\Projects\LitStudio_3\frontend && npm run dev"
timeout /t 5 /nobreak

echo.
echo ========== ГОТОВО ==========
echo.
echo Откройте браузер: http://localhost:5176
echo.
timeout /t 3 /nobreak
