# 개발 서버 시작 스크립트
# 포트 3000을 사용하는 프로세스 종료 후 서버 시작

Write-Host "포트 3000 정리 중..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($pid in $processes) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "프로세스 $pid 종료됨" -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
}

Write-Host "개발 서버 시작 중..." -ForegroundColor Yellow
npm run dev

