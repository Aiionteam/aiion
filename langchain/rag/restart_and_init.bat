@echo off
echo ========================================
echo Restart API Server and Initialize
echo ========================================
echo.

echo Step 1: Stopping any existing API server...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq api_server*" 2>nul

echo.
echo Step 2: Waiting for PostgreSQL to be ready...
timeout /t 3 /nobreak

echo.
echo Step 3: Starting API server...
start "API Server" cmd /k "conda activate torch313 && python api_server.py"

echo.
echo Step 4: Waiting for API server to start...
timeout /t 10 /nobreak

echo.
echo Step 5: Initializing documents...
python init_documents.py

echo.
echo ========================================
echo Done! Check the API Server window.
echo ========================================
pause

