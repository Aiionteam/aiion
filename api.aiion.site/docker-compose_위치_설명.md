# Docker Compose 위치 결정 가이드

## 현재 구조 분석

### api.aiion.site/docker-compose.yaml이 관리하는 것:
1. **데이터 레이어**
   - PostgreSQL (postgres)
   - Redis (redis)

2. **게이트웨이**
   - Spring Cloud Gateway (api.aiion.site/server/gateway)

3. **마이크로서비스** (service.aiion.site에서 빌드)
   - common-service, auth-service, user-service 등

4. **AI 서비스** (ai.aiion.site에서 빌드)
   - chatbot-service, weather-service, crawler-service

5. **인프라 설정**
   - 네트워크 (spring-network)
   - 볼륨 (postgres_data, redis_data)

## 결론: api.aiion.site에 있어야 함 ✅

### 이유:

#### 1. **게이트웨이 소유권**
- 게이트웨이는 `api.aiion.site/server/gateway`에 있음
- docker-compose.yaml에서 게이트웨이를 빌드하려면 같은 디렉토리에 있어야 함
```yaml
gateway:
  build:
    context: .  # api.aiion.site 디렉토리
    dockerfile: ./server/gateway/Dockerfile
```

#### 2. **전체 시스템 통합 관리**
- 여러 프로젝트를 통합 관리:
  - `api.aiion.site` (게이트웨이)
  - `service.aiion.site` (마이크로서비스)
  - `ai.aiion.site` (AI 서비스)
- 중앙 집중식 관리가 필요

#### 3. **데이터베이스 및 인프라 관리**
- PostgreSQL, Redis는 전체 시스템의 공통 인프라
- 네트워크와 볼륨 설정도 전체 시스템 차원에서 관리

#### 4. **의존성 관리**
- 게이트웨이가 모든 서비스의 진입점
- 게이트웨이와 함께 전체 시스템을 관리하는 것이 자연스러움

## 만약 service.aiion.site에 두면?

### 문제점:

1. **게이트웨이 빌드 불가**
   ```yaml
   # service.aiion.site/docker-compose.yaml에서
   gateway:
     build:
       context: .  # service.aiion.site
       dockerfile: ./server/gateway/Dockerfile  # ❌ 존재하지 않음
   ```
   - 게이트웨이는 `api.aiion.site`에 있으므로 빌드 불가

2. **경로 복잡성 증가**
   ```yaml
   # service.aiion.site에서 게이트웨이를 빌드하려면
   gateway:
     build:
       context: ../api.aiion.site  # 상대 경로 복잡
       dockerfile: ./server/gateway/Dockerfile
   ```
   - 상대 경로가 복잡해지고 관리가 어려워짐

3. **책임 분리 위반**
   - `service.aiion.site`는 마이크로서비스 소스 코드만 관리해야 함
   - 전체 시스템 오케스트레이션은 `api.aiion.site`의 책임

## 권장 구조

```
develop/
├── api.aiion.site/              # ✅ docker-compose.yaml 위치
│   ├── docker-compose.yaml      # 전체 시스템 통합 관리
│   ├── server/
│   │   └── gateway/             # 게이트웨이
│   └── ...
│
├── service.aiion.site/          # 마이크로서비스 소스 코드만
│   ├── common-service/
│   ├── auth-service/
│   ├── user-service/
│   └── ...
│
└── ai.aiion.site/               # AI 서비스 소스 코드만
    ├── rag/
    ├── feed/
    └── ...
```

## 실행 방법

### 현재 구조 (권장) ✅
```bash
cd api.aiion.site
docker-compose up -d
```

### 만약 service.aiion.site에 있다면?
```bash
cd service.aiion.site
docker-compose up -d
# 하지만 게이트웨이 빌드 경로 문제 발생
```

## 결론

**`api.aiion.site/docker-compose.yaml`에 있는 것이 올바른 위치입니다.**

- ✅ 게이트웨이와 같은 위치
- ✅ 전체 시스템 통합 관리
- ✅ 명확한 책임 분리
- ✅ 실행 및 관리 용이

