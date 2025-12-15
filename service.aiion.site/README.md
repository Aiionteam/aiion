# Service.aiion.site

이 프로젝트는 마이크로서비스 아키텍처의 도메인 서비스들을 포함합니다.

## 프로젝트 구조

```
service.aiion.site/
├── common-service/      # 공통 서비스
├── account-service/      # 계정 서비스
├── auth-service/         # 인증 서비스
├── calendar-service/     # 캘린더 서비스
├── diary-service/        # 일기 서비스
├── user-service/         # 사용자 서비스
├── culture-service/      # 문화 서비스
├── healthcare-service/   # 건강 서비스
├── build.gradle          # Gradle 빌드 설정
├── settings.gradle        # Gradle 프로젝트 설정
└── gradle/               # Gradle Wrapper
```

## 빌드 및 실행

### 전체 빌드
```bash
./gradlew build
```

### 특정 서비스 빌드
```bash
./gradlew :common-service:build
./gradlew :auth-service:build
```

### Docker 빌드
각 서비스는 독립적인 Dockerfile을 가지고 있으며, `api.aiion.site/docker-compose.yaml`에서 통합 관리됩니다.

## 서비스 포트

- common-service: 8081
- user-service: 8082
- diary-service: 8083
- calendar-service: 8084
- culture-service: 8086
- auth-service: 8087
- healthcare-service: 8088
- account-service: 8089

## API Gateway 통합

모든 서비스는 `api.aiion.site`의 Spring Cloud Gateway(포트 8080)를 통해 라우팅됩니다.

## 데이터베이스

모든 서비스는 공유 PostgreSQL 데이터베이스(`aidb`)를 사용하며, 각 서비스는 자체 스키마를 소유합니다.

## 개발 환경

- Java 21
- Spring Boot 3.5.8
- Gradle 8.5+
- PostgreSQL 15
- Redis 7

