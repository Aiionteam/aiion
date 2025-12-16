# Docker 용량 정리 스크립트 (PowerShell)
# 사용법: .\docker-cleanup.ps1 [옵션]
# 옵션:
#   -all: 모든 정리 (이미지, 컨테이너, 볼륨, 빌드 캐시)
#   -containers: 중지된 컨테이너만 정리
#   -images: 사용하지 않는 이미지만 정리
#   -volumes: 사용하지 않는 볼륨만 정리
#   -cache: 빌드 캐시만 정리
#   -logs: 컨테이너 로그만 정리

param(
    [switch]$all,
    [switch]$containers,
    [switch]$images,
    [switch]$volumes,
    [switch]$cache,
    [switch]$logs
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker 용량 정리 스크립트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 현재 상태 확인
Write-Host "[현재 상태]" -ForegroundColor Yellow
docker system df
Write-Host ""

if ($all) {
    Write-Host "[전체 정리 시작]" -ForegroundColor Green
    
    # 중지된 컨테이너 제거
    Write-Host "1. 중지된 컨테이너 제거 중..." -ForegroundColor Yellow
    $stopped = docker ps -a -q -f "status=exited"
    if ($stopped) {
        docker rm $stopped
        Write-Host "   제거 완료" -ForegroundColor Green
    } else {
        Write-Host "   제거할 컨테이너 없음" -ForegroundColor Gray
    }
    
    # 사용하지 않는 이미지 제거
    Write-Host "2. 사용하지 않는 이미지 제거 중..." -ForegroundColor Yellow
    docker image prune -a -f
    Write-Host "   제거 완료" -ForegroundColor Green
    
    # 사용하지 않는 볼륨 제거
    Write-Host "3. 사용하지 않는 볼륨 제거 중..." -ForegroundColor Yellow
    docker volume prune -f
    Write-Host "   제거 완료" -ForegroundColor Green
    
    # 빌드 캐시 제거
    Write-Host "4. 빌드 캐시 제거 중..." -ForegroundColor Yellow
    docker builder prune -a -f
    Write-Host "   제거 완료" -ForegroundColor Green
    
    # 컨테이너 로그 정리
    Write-Host "5. 컨테이너 로그 정리 중..." -ForegroundColor Yellow
    $containers = docker ps -a -q
    foreach ($container in $containers) {
        $logPath = "/var/lib/docker/containers/$container/$container-json.log"
        docker exec $container sh -c "truncate -s 0 $logPath" 2>$null
    }
    Write-Host "   로그 정리 완료 (Windows에서는 제한적)" -ForegroundColor Green
    
} elseif ($containers) {
    Write-Host "[중지된 컨테이너 제거]" -ForegroundColor Green
    $stopped = docker ps -a -q -f "status=exited"
    if ($stopped) {
        docker rm $stopped
        Write-Host "제거 완료" -ForegroundColor Green
    } else {
        Write-Host "제거할 컨테이너 없음" -ForegroundColor Gray
    }
    
} elseif ($images) {
    Write-Host "[사용하지 않는 이미지 제거]" -ForegroundColor Green
    docker image prune -a -f
    Write-Host "제거 완료" -ForegroundColor Green
    
} elseif ($volumes) {
    Write-Host "[사용하지 않는 볼륨 제거]" -ForegroundColor Green
    docker volume prune -f
    Write-Host "제거 완료" -ForegroundColor Green
    
} elseif ($cache) {
    Write-Host "[빌드 캐시 제거]" -ForegroundColor Green
    docker builder prune -a -f
    Write-Host "제거 완료" -ForegroundColor Green
    
} elseif ($logs) {
    Write-Host "[컨테이너 로그 정리]" -ForegroundColor Green
    Write-Host "Windows에서는 docker-compose.yaml의 logging 설정을 사용하세요" -ForegroundColor Yellow
    Write-Host "또는 다음 명령어로 로그 확인:" -ForegroundColor Yellow
    Write-Host '  docker logs --tail 100 container-name' -ForegroundColor Gray
    
} else {
    Write-Host "[사용법]" -ForegroundColor Yellow
    Write-Host "  .\docker-cleanup.ps1 -all          # 전체 정리" -ForegroundColor White
    Write-Host "  .\docker-cleanup.ps1 -containers  # 중지된 컨테이너만" -ForegroundColor White
    Write-Host "  .\docker-cleanup.ps1 -images      # 사용하지 않는 이미지만" -ForegroundColor White
    Write-Host "  .\docker-cleanup.ps1 -volumes     # 사용하지 않는 볼륨만" -ForegroundColor White
    Write-Host "  .\docker-cleanup.ps1 -cache       # 빌드 캐시만" -ForegroundColor White
    Write-Host ""
    Write-Host "[현재 사용량 상세]" -ForegroundColor Yellow
    docker system df -v
    exit
}

Write-Host ""
Write-Host "[정리 후 상태]" -ForegroundColor Yellow
docker system df
Write-Host ""
Write-Host "정리 완료!" -ForegroundColor Green

