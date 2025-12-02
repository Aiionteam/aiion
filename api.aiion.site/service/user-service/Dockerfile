# 빌드 단계
FROM gradle:8.5-jdk21 AS builder
WORKDIR /build

# Gradle 설정 파일 먼저 복사 (의존성 캐싱을 위해)
COPY build.gradle settings.gradle ./
COPY gradle.properties* ./
COPY gradle/ ./gradle/
COPY service/user-service/build.gradle ./service/user-service/

# 의존성 다운로드 (Gradle 캐시 활용 + 최적화 옵션)
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
    gradle :service:user-service:dependencies --no-daemon --parallel || true

# 나머지 소스 코드 복사
COPY service/ ./service/

# 빌드 실행 (병렬 빌드 + 빌드 캐시 활용)
RUN --mount=type=cache,target=/root/.gradle/caches \
    --mount=type=cache,target=/root/.gradle/wrapper \
    gradle :service:user-service:build -x test --no-daemon --parallel --build-cache

# 실행 단계 (slim 버전 사용)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/service/user-service/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]