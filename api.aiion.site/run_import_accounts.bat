@echo off
chcp 65001 >nul
echo ========================================
echo 가계부 데이터 Neon DB 삽입 스크립트
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Python 확인 중...
python --version
if errorlevel 1 (
    echo Python을 찾을 수 없습니다. Python이 설치되어 있는지 확인하세요.
    pause
    exit /b 1
)

echo.
echo [2/3] 필요한 패키지 설치 중...
python -m pip install psycopg2-binary --quiet
if errorlevel 1 (
    echo 패키지 설치 실패. 인터넷 연결을 확인하세요.
    pause
    exit /b 1
)

echo.
echo [3/3] CSV 파일 파싱 및 데이터베이스 삽입 중...
python parse_account_book.py
if errorlevel 1 (
    echo 스크립트 실행 실패.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 완료!
echo ========================================
pause

