#!/bin/bash
# Docker 용량 정리 스크립트 (Linux/Mac)
# 사용법: ./docker-cleanup.sh [옵션]

set -e

echo "========================================"
echo "Docker 용량 정리 스크립트"
echo "========================================"
echo ""

# 현재 상태 확인
echo "[현재 상태]"
docker system df
echo ""

case "${1:-}" in
    --all|-a)
        echo "[전체 정리 시작]"
        
        # 중지된 컨테이너 제거
        echo "1. 중지된 컨테이너 제거 중..."
        stopped=$(docker ps -a -q -f "status=exited")
        if [ -n "$stopped" ]; then
            docker rm $stopped
            echo "   제거 완료"
        else
            echo "   제거할 컨테이너 없음"
        fi
        
        # 사용하지 않는 이미지 제거
        echo "2. 사용하지 않는 이미지 제거 중..."
        docker image prune -a -f
        echo "   제거 완료"
        
        # 사용하지 않는 볼륨 제거
        echo "3. 사용하지 않는 볼륨 제거 중..."
        docker volume prune -f
        echo "   제거 완료"
        
        # 빌드 캐시 제거
        echo "4. 빌드 캐시 제거 중..."
        docker builder prune -a -f
        echo "   제거 완료"
        
        # 컨테이너 로그 정리
        echo "5. 컨테이너 로그 정리 중..."
        containers=$(docker ps -a -q)
        for container in $containers; do
            log_path="/var/lib/docker/containers/$container/$container-json.log"
            if [ -f "$log_path" ]; then
                truncate -s 0 "$log_path" 2>/dev/null || true
            fi
        done
        echo "   로그 정리 완료"
        ;;
    
    --containers|-c)
        echo "[중지된 컨테이너 제거]"
        stopped=$(docker ps -a -q -f "status=exited")
        if [ -n "$stopped" ]; then
            docker rm $stopped
            echo "제거 완료"
        else
            echo "제거할 컨테이너 없음"
        fi
        ;;
    
    --images|-i)
        echo "[사용하지 않는 이미지 제거]"
        docker image prune -a -f
        echo "제거 완료"
        ;;
    
    --volumes|-v)
        echo "[사용하지 않는 볼륨 제거]"
        docker volume prune -f
        echo "제거 완료"
        ;;
    
    --cache)
        echo "[빌드 캐시 제거]"
        docker builder prune -a -f
        echo "제거 완료"
        ;;
    
    --logs)
        echo "[컨테이너 로그 정리]"
        containers=$(docker ps -a -q)
        for container in $containers; do
            log_path="/var/lib/docker/containers/$container/$container-json.log"
            if [ -f "$log_path" ]; then
                truncate -s 0 "$log_path" 2>/dev/null || true
            fi
        done
        echo "로그 정리 완료"
        ;;
    
    *)
        echo "[사용법]"
        echo "  ./docker-cleanup.sh --all          # 전체 정리"
        echo "  ./docker-cleanup.sh --containers   # 중지된 컨테이너만"
        echo "  ./docker-cleanup.sh --images      # 사용하지 않는 이미지만"
        echo "  ./docker-cleanup.sh --volumes      # 사용하지 않는 볼륨만"
        echo "  ./docker-cleanup.sh --cache        # 빌드 캐시만"
        echo "  ./docker-cleanup.sh --logs         # 컨테이너 로그만"
        echo ""
        echo "[현재 사용량 상세]"
        docker system df -v
        exit 0
        ;;
esac

echo ""
echo "[정리 후 상태]"
docker system df
echo ""
echo "정리 완료!"

