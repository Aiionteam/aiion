# Dockerfile 경로 수정 완료

## 문제점

모든 서비스의 Dockerfile이 이전 구조(`api.aiion.site/service/{service-name}/`)를 참조하고 있었습니다.
하지만 서비스들이 `service.aiion.site`로 이동했으므로 경로를 수정해야 했습니다.

## 수정 내용

### 변경 사항
- `service/{service-name}/` → `{service-name}/` (경로 수정)
- `:service:{service-name}:build` → `:{service-name}:build` (Gradle 명령 수정)

### 수정된 서비스 목록

1. ✅ **calendar-service** - Dockerfile 경로 수정 완료
2. ✅ **diary-service** - Dockerfile 경로 수정 완료
3. ✅ **user-service** - Dockerfile 경로 수정 완료
4. ✅ **common-service** - Dockerfile 경로 수정 완료
5. ✅ **auth-service** - Dockerfile 경로 수정 완료
6. ✅ **account-service** - Dockerfile 경로 수정 완료
7. ✅ **culture-service** - Dockerfile 경로 수정 완료
8. ✅ **healthcare-service** - Dockerfile 경로 수정 완료 + 파일명 변경 (dockerfile → Dockerfile)

## 수정 전후 비교

### 수정 전
```dockerfile
COPY service/calendar-service/build.gradle ./service/calendar-service/
gradle :service:calendar-service:build
COPY --from=builder /build/service/calendar-service/build/libs/*.jar app.jar
```

### 수정 후
```dockerfile
COPY calendar-service/build.gradle ./calendar-service/
gradle :calendar-service:build
COPY --from=builder /build/calendar-service/build/libs/*.jar app.jar
```

## 빌드 테스트

✅ **calendar-service 빌드 성공**
```bash
./gradlew :calendar-service:build -x test
BUILD SUCCESSFUL in 30s
```

## docker-compose.yaml 설정

모든 서비스는 다음과 같이 설정되어 있습니다:
```yaml
calendar-service:
  build:
    context: ../service.aiion.site
    dockerfile: ./calendar-service/Dockerfile
```

이제 `context`가 `../service.aiion.site`이므로, Dockerfile 내부에서 `calendar-service/`로 직접 참조하는 것이 올바릅니다.

## 다음 단계

1. ✅ 모든 Dockerfile 경로 수정 완료
2. ✅ calendar-service 빌드 테스트 성공
3. ⏭️ Docker Compose로 전체 빌드 테스트 권장

