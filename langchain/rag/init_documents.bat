@echo off
echo ========================================
echo Initializing Documents
echo ========================================
echo.

REM Wait for API server to be ready
echo Waiting for API server to start...
timeout /t 5 /nobreak

REM Initialize documents
python init_documents.py

echo.
pause

