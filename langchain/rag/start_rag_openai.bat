@echo off
echo ========================================
echo Starting RAG API Server with OpenAI
echo ========================================
echo.

REM Activate conda environment
call conda activate torch313

REM Check if .env file exists
if not exist "..\\.env" (
    echo [ERROR] .env file not found in root directory!
    echo Please create .env with OPENAI_API_KEY
    pause
    exit /b 1
)

echo [OK] .env file found
echo [OK] Starting API server...
echo.

python api_server.py

