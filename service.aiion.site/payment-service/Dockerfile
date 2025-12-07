# 빌드 단계
FROM gradle:8.5-jdk21 AS builder
WORKDIR /build

# Gradle 설정 파일 먼저 복사 (의존성 캐싱을 위해)
COPY build.gradle settings.gradle ./
COPY gradle.properties* ./
COPY gradle/ ./gradle/
<<<<<<<< HEAD:service.aiion.site/pathfinder-service/Dockerfile
COPY pathfinder-service/build.gradle ./pathfinder-service/
========
COPY payment-service/build.gradle ./payment-service/
>>>>>>>> b3d7b1f40f836e2f50e8c64142f93d6870bdead8:service.aiion.site/payment-service/Dockerfile

# 의존성 다운로드 (Gradle 캐시 활용 + 최적화 옵션)
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
<<<<<<<< HEAD:service.aiion.site/pathfinder-service/Dockerfile
    gradle :pathfinder-service:dependencies --no-daemon --parallel || true

# 나머지 소스 코드 복사
COPY pathfinder-service/ ./pathfinder-service/
========
    gradle :payment-service:dependencies --no-daemon --parallel || true

# 나머지 소스 코드 복사
COPY payment-service/ ./payment-service/
>>>>>>>> b3d7b1f40f836e2f50e8c64142f93d6870bdead8:service.aiion.site/payment-service/Dockerfile

# 빌드 실행 (병렬 빌드 + 빌드 캐시 활용)
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
<<<<<<<< HEAD:service.aiion.site/pathfinder-service/Dockerfile
    gradle :pathfinder-service:build -x test --no-daemon --parallel --build-cache
========
    gradle :payment-service:build -x test --no-daemon --parallel --build-cache
>>>>>>>> b3d7b1f40f836e2f50e8c64142f93d6870bdead8:service.aiion.site/payment-service/Dockerfile

# 실행 단계 (slim 버전 사용)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
<<<<<<<< HEAD:service.aiion.site/pathfinder-service/Dockerfile
COPY --from=builder /build/pathfinder-service/build/libs/*.jar app.jar
========
COPY --from=builder /build/payment-service/build/libs/*.jar app.jar
>>>>>>>> b3d7b1f40f836e2f50e8c64142f93d6870bdead8:service.aiion.site/payment-service/Dockerfile
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

