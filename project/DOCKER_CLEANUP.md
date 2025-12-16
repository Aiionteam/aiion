# Docker 용량 관리 가이드

Docker 컨테이너를 사용하다 보면 로그, 이미지, 볼륨 등이 계속 쌓여서 디스크 용량이 부족해질 수 있습니다.

## 문제점

1. **컨테이너 로그가 무한히 쌓임**
   - 위치: `/var/lib/docker/containers/<container-id>/<container-id>-json.log`
   - 개발 중이면 콘솔 로그가 많아서 수 GB까지 커질 수 있음

2. **이미지 레이어가 계속 쌓임**
   - `docker-compose up --build`를 자주 하면 불필요한 이미지 레이어가 남음

3. **중지된 컨테이너가 계속 쌓임**
   - 개발 중 자주 재시작하면 Exited 상태의 컨테이너가 남음

4. **볼륨이 계속 커짐**
   - DB, 캐시, 업로드 파일 등이 볼륨에 저장되면 계속 증가

## 해결 방법

### 1. 로그 로테이션 설정 (docker-compose.yaml)

모든 서비스에 로그 로테이션 설정이 자동으로 적용됩니다:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"      # 로그 파일 최대 크기 (10MB)
    max-file: "3"        # 보관할 로그 파일 개수 (총 30MB)
```

**적용 방법:**
- 기존 컨테이너를 재시작하면 자동 적용됩니다:
  ```bash
  docker-compose down
  docker-compose up -d
  ```

### 2. 정리 스크립트 사용

#### Windows (PowerShell)
```powershell
# 전체 정리
.\docker-cleanup.ps1 -all

# 개별 정리
.\docker-cleanup.ps1 -containers  # 중지된 컨테이너만
.\docker-cleanup.ps1 -images      # 사용하지 않는 이미지만
.\docker-cleanup.ps1 -volumes     # 사용하지 않는 볼륨만
.\docker-cleanup.ps1 -cache       # 빌드 캐시만
```

#### Linux/Mac (Bash)
```bash
# 실행 권한 부여
chmod +x docker-cleanup.sh

# 전체 정리
./docker-cleanup.sh --all

# 개별 정리
./docker-cleanup.sh --containers
./docker-cleanup.sh --images
./docker-cleanup.sh --volumes
./docker-cleanup.sh --cache
```

### 3. 수동 정리 명령어

#### 현재 상태 확인
```bash
docker system df
docker system df -v  # 상세 정보
```

#### 중지된 컨테이너 제거
```bash
docker container prune -f
```

#### 사용하지 않는 이미지 제거
```bash
docker image prune -a -f
```

#### 사용하지 않는 볼륨 제거
```bash
docker volume prune -f
```

#### 빌드 캐시 제거
```bash
docker builder prune -a -f
```

#### 전체 정리 (한 번에)
```bash
docker system prune -a --volumes -f
```

⚠️ **주의**: `--volumes` 옵션은 사용하지 않는 볼륨까지 모두 삭제합니다. 중요한 데이터가 있는 볼륨은 제외됩니다.

### 4. 정기적인 정리 (권장)

주 1회 정도 정리 스크립트를 실행하는 것을 권장합니다:

```bash
# Windows
.\docker-cleanup.ps1 -all

# Linux/Mac
./docker-cleanup.sh --all
```

## 예상 절약 용량

- **빌드 캐시**: 1-2GB (자주 빌드하는 경우)
- **사용하지 않는 이미지**: 1-3GB (여러 버전을 쌓은 경우)
- **중지된 컨테이너**: 수십 MB (많이 쌓인 경우)
- **로그 파일**: 수백 MB ~ 수 GB (로그 로테이션 없이 오래 실행한 경우)

## 로그 확인 방법

로그가 제대로 로테이션되는지 확인:

```bash
# 특정 컨테이너 로그 확인
docker logs --tail 100 <container-name>

# 로그 파일 크기 확인 (Linux/Mac)
docker inspect <container-name> | grep LogPath
```

## 추가 팁

1. **개발 중에는 로그 레벨을 낮춰서** 불필요한 로그를 줄이세요
2. **프로덕션에서는 로그 로테이션을 필수로** 설정하세요
3. **CI/CD 파이프라인에서도 정리 스크립트를 실행**하세요

