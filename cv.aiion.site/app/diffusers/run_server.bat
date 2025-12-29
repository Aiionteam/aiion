@echo off
chcp 65001 >nul
echo ========================================
echo Stable Diffusion SDXL API 서버 시작
echo ========================================
echo.

REM 현재 스크립트 위치에서 cv.aiion.site로 이동
cd /d "%~dp0\..\.."

REM conda 환경 활성화
call conda activate diffuser
if errorlevel 1 (
    echo [오류] conda 환경 활성화 실패
    echo diffuser 환경이 설치되어 있는지 확인하세요.
    pause
    exit /b 1
)

REM uvicorn 설치 확인
python -c "import uvicorn" 2>nul
if errorlevel 1 (
    echo [오류] uvicorn이 설치되어 있지 않습니다.
    echo 설치 중...
    pip install uvicorn[standard]
    if errorlevel 1 (
        echo [오류] uvicorn 설치 실패
        pause
        exit /b 1
    )
)

echo [서버 시작 중...]
echo 포트: 8001
echo API 문서: http://localhost:8001/docs
echo 헬스 체크: http://localhost:8001/health
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

python -m uvicorn app.diffusers.main:app --host 0.0.0.0 --port 8001 --reload

pause

