# ERP 시스템 MSA 구현 전략

## 📋 목차
1. [전략 개요](#전략-개요)
2. [서비스 분해 전략](#서비스-분해-전략)
3. [데이터베이스 전략](#데이터베이스-전략)
4. [서비스 간 통신 전략](#서비스-간-통신-전략)
5. [배포 전략](#배포-전략)
6. [API 설계 전략](#api-설계-전략)
7. [보안 전략](#보안-전략)
8. [확장 전략](#확장-전략)
9. [구현 로드맵](#구현-로드맵)

---

## 전략 개요

### 목표
Admin ERP 시스템을 **ai.aiion.site** 프로젝트 내에서 **마이크로서비스 아키텍처(MSA)**로 구현하여, 기존 아키텍처와 통합하면서도 독립적으로 확장 가능한 구조를 만듭니다.

### 핵심 원칙
- ✅ **도메인 주도 설계(DDD)**: 비즈니스 도메인별로 서비스 분리
- ✅ **독립성**: 각 서비스는 독립적으로 배포 및 확장 가능
- ✅ **데이터 격리**: 각 서비스는 자체 데이터베이스 스키마 소유
- ✅ **통합 게이트웨이**: 기존 Spring Cloud Gateway(8080) 활용
- ✅ **기술 다양성**: Python FastAPI + Spring Boot 혼합 사용

### 아키텍처 스타일
```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Frontend (Next.js)                      │
│                    admin.aiion.site:4000                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             │ Authorization: Bearer JWT
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Cloud Gateway (8080)                         │
│  기존 라우팅 + 신규 ERP 라우팅                                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─────────────────────────────────────────┐
             │                                         │
             ▼                                         ▼
┌──────────────────────────────┐      ┌──────────────────────────────┐
│   ERP 서비스 레이어           │      │  기존 서비스 레이어           │
│   (Python FastAPI)           │      │  (Spring Boot + FastAPI)     │
│                              │      │                              │
│  ┌──────────────────────┐   │      │  ┌──────────────────────┐   │
│  │ customer-service      │   │      │  │ diary-service        │   │
│  │ 포트: 9010            │   │      │  │ 포트: 8083            │   │
│  └──────────────────────┘   │      │  └──────────────────────┘   │
│                              │      │                              │
│  ┌──────────────────────┐   │      │  ┌──────────────────────┐   │
│  │ product-service       │   │      │  │ chatbot-service      │   │
│  │ 포트: 9011            │   │      │  │ 포트: 9001            │   │
│  └──────────────────────┘   │      │  └──────────────────────┘   │
│                              │      │                              │
│  ┌──────────────────────┐   │      │  ... (기타 서비스들)          │
│  │ order-service         │   │      │                              │
│  │ 포트: 9012            │   │      │                              │
│  └──────────────────────┘   │      │                              │
│                              │      │                              │
│  ┌──────────────────────┐   │      │                              │
│  │ finance-service       │   │      │                              │
│  │ 포트: 9013            │   │      │                              │
│  └──────────────────────┘   │      │                              │
│                              │      │                              │
│  ┌──────────────────────┐   │      │                              │
│  │ report-service        │   │      │                              │
│  │ 포트: 9014            │   │      │                              │
│  └──────────────────────┘   │      │                              │
└──────────────┬───────────────┘      └──────────────┬───────────────┘
               │                                      │
               └──────────────┬───────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │      데이터 레이어            │
              │                              │
              │  ┌──────────────────────┐   │
              │  │ PostgreSQL            │   │
              │  │ 포트: 5432            │   │
              │  │ - erp_db (스키마)     │   │
              │  │   - customers         │   │
              │  │   - products          │   │
              │  │   - orders            │   │
              │  │   - transactions      │   │
              │  │   - reports           │   │
              │  └──────────────────────┘   │
              │                              │
              │  ┌──────────────────────┐   │
              │  │ Redis                │   │
              │  │ 포트: 6379            │   │
              │  │ - ERP 세션 관리       │   │
              │  │ - 캐싱                │   │
              │  └──────────────────────┘   │
              └──────────────────────────────┘
```

---

## 서비스 분해 전략

### 1. 도메인별 서비스 분리

#### 1.1 Customer Service (고객 서비스)
**책임**: 고객 정보 관리
- 고객 CRUD
- 고객 통계 계산 (총 주문, 총 매출)
- 고객 검색 및 필터링

**데이터베이스 테이블**:
- `customers`

**포트**: 9010

**엔드포인트**:
- `GET /erp/customers` - 고객 목록 조회
- `GET /erp/customers/{id}` - 고객 상세 조회
- `POST /erp/customers` - 고객 생성
- `PUT /erp/customers/{id}` - 고객 수정
- `DELETE /erp/customers/{id}` - 고객 삭제
- `GET /erp/customers/{id}/stats` - 고객 통계 조회

---

#### 1.2 Product Service (제품/재고 서비스)
**책임**: 제품 및 재고 관리
- 제품 CRUD
- 재고 수량 관리
- 재고 상태 자동 업데이트 (품절, 재고부족, 재고있음)
- 재고 거래 내역 관리

**데이터베이스 테이블**:
- `products`
- `inventory_transactions`

**포트**: 9011

**엔드포인트**:
- `GET /erp/products` - 제품 목록 조회
- `GET /erp/products/{id}` - 제품 상세 조회
- `POST /erp/products` - 제품 생성
- `PUT /erp/products/{id}` - 제품 수정
- `DELETE /erp/products/{id}` - 제품 삭제
- `POST /erp/products/{id}/stock` - 재고 입출고
- `GET /erp/products/{id}/transactions` - 재고 거래 내역

**비즈니스 로직**:
- 재고 수량 변경 시 상태 자동 업데이트
- 재고 거래 생성 시 제품 수량 자동 업데이트

---

#### 1.3 Order Service (주문 서비스)
**책임**: 주문 관리
- 주문 CRUD
- 주문 항목 관리
- 주문 상태 관리 (주문완료, 배송중, 배송준비, 취소됨, 반품)
- 주문 완료 시 재고 차감 및 재무 거래 생성

**데이터베이스 테이블**:
- `orders`
- `order_items`

**포트**: 9012

**엔드포인트**:
- `GET /erp/orders` - 주문 목록 조회
- `GET /erp/orders/{id}` - 주문 상세 조회
- `POST /erp/orders` - 주문 생성
- `PUT /erp/orders/{id}` - 주문 수정
- `DELETE /erp/orders/{id}` - 주문 삭제
- `PUT /erp/orders/{id}/status` - 주문 상태 변경
- `GET /erp/orders/{id}/items` - 주문 항목 조회

**서비스 간 통신**:
- `Product Service`로 재고 차감 요청
- `Finance Service`로 거래 생성 요청
- `Customer Service`로 고객 정보 조회

---

#### 1.4 Finance Service (재무 서비스)
**책임**: 재무 거래 관리
- 거래 CRUD (수입, 지출)
- 거래 카테고리 관리 (매출, 구매, 운영, 기타)
- 재무 통계 계산 (총 수입, 총 지출, 순이익)

**데이터베이스 테이블**:
- `transactions`

**포트**: 9013

**엔드포인트**:
- `GET /erp/transactions` - 거래 목록 조회
- `GET /erp/transactions/{id}` - 거래 상세 조회
- `POST /erp/transactions` - 거래 생성
- `PUT /erp/transactions/{id}` - 거래 수정
- `DELETE /erp/transactions/{id}` - 거래 삭제
- `GET /erp/transactions/stats` - 재무 통계 조회

---

#### 1.5 Report Service (보고서 서비스)
**책임**: 보고서 생성 및 관리
- 보고서 템플릿 관리
- 보고서 생성 (매출, 재고, 고객, 재무, 주문)
- 보고서 파일 저장 및 다운로드

**데이터베이스 테이블**:
- `reports`

**포트**: 9014

**엔드포인트**:
- `GET /erp/reports` - 보고서 목록 조회
- `GET /erp/reports/{id}` - 보고서 상세 조회
- `POST /erp/reports` - 보고서 생성
- `GET /erp/reports/{id}/download` - 보고서 다운로드
- `GET /erp/reports/templates` - 보고서 템플릿 목록

**서비스 간 통신**:
- 모든 ERP 서비스로부터 데이터 수집

---

### 2. 서비스 크기 및 복잡도

| 서비스명 | 복잡도 | 데이터베이스 테이블 수 | 외부 의존성 |
|---------|--------|---------------------|-----------|
| Customer Service | 낮음 | 1 | Order Service |
| Product Service | 중간 | 2 | - |
| Order Service | 높음 | 2 | Product, Finance, Customer |
| Finance Service | 낮음 | 1 | - |
| Report Service | 중간 | 1 | 모든 ERP 서비스 |

---

## 데이터베이스 전략

### 1. Database per Service 패턴

각 서비스는 독립적인 데이터베이스 스키마를 소유하지만, 동일한 PostgreSQL 인스턴스를 공유합니다.

```sql
-- ERP 전용 스키마 생성
CREATE SCHEMA erp_db;

-- 각 서비스별 테이블은 erp_db 스키마에 생성
CREATE TABLE erp_db.customers (...);
CREATE TABLE erp_db.products (...);
CREATE TABLE erp_db.orders (...);
CREATE TABLE erp_db.transactions (...);
CREATE TABLE erp_db.reports (...);
```

### 2. 데이터 일관성 전략

#### 2.1 Saga 패턴
**주문 생성 시나리오**:
```
1. Order Service: 주문 생성 (status = '주문완료')
2. Product Service: 재고 차감 (비동기 호출)
   - 성공: 재고 차감 완료
   - 실패: Order Service로 보상 트랜잭션 요청 (주문 취소)
3. Finance Service: 거래 생성 (비동기 호출)
   - 성공: 거래 생성 완료
   - 실패: Order Service로 보상 트랜잭션 요청 (주문 취소)
```

#### 2.2 Event Sourcing (향후 고려)
- 모든 상태 변경을 이벤트로 저장
- Redis Streams 또는 Kafka 활용

### 3. 데이터 복제 전략

#### 3.1 CQRS (Command Query Responsibility Segregation)
- **Command**: 각 서비스가 자체 데이터 소유
- **Query**: Report Service가 읽기 전용 복제본 유지

#### 3.2 Materialized View
- 고객 통계 (총 주문, 총 매출) → Redis 캐싱
- 재고 상태 → 실시간 계산

---

## 서비스 간 통신 전략

### 1. 통신 패턴

#### 1.1 동기 통신 (REST API)
**사용 시나리오**:
- 즉시 응답이 필요한 경우
- 데이터 조회 (GET)

**예시**:
```python
# Order Service → Customer Service
async def get_customer(customer_id: str, jwt_token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_GATEWAY_URL}/erp/customers/{customer_id}",
            headers={"Authorization": f"Bearer {jwt_token}"}
        )
        return response.json()
```

#### 1.2 비동기 통신 (Message Queue)
**사용 시나리오**:
- 시간이 오래 걸리는 작업
- 보상 트랜잭션이 필요한 경우

**기술 선택**:
- **Redis Pub/Sub**: 간단한 이벤트 전파
- **RabbitMQ** (향후): 복잡한 메시지 라우팅

**예시**:
```python
# Order Service → Product Service (재고 차감)
await redis.publish(
    "order.created",
    json.dumps({
        "order_id": "ORD-2024-001",
        "items": [
            {"product_id": "INV-001", "quantity": 5}
        ]
    })
)
```

### 2. API Gateway 라우팅

#### 2.1 Spring Cloud Gateway 라우팅 추가
```yaml
# api.aiion.site/server/gateway/src/main/resources/application.yaml
spring:
  cloud:
    gateway:
      routes:
        # ERP 서비스 라우팅
        - id: customer-service
          uri: http://customer-service:9010
          predicates:
            - Path=/erp/customers/**
          filters:
            - StripPrefix=1

        - id: product-service
          uri: http://product-service:9011
          predicates:
            - Path=/erp/products/**
          filters:
            - StripPrefix=1

        - id: order-service
          uri: http://order-service:9012
          predicates:
            - Path=/erp/orders/**
          filters:
            - StripPrefix=1

        - id: finance-service
          uri: http://finance-service:9013
          predicates:
            - Path=/erp/transactions/**
          filters:
            - StripPrefix=1

        - id: report-service
          uri: http://report-service:9014
          predicates:
            - Path=/erp/reports/**
          filters:
            - StripPrefix=1
```

### 3. 서비스 디스커버리

#### 3.1 현재 전략: 정적 라우팅
- Docker Compose 네트워크 내 서비스명으로 통신
- 예: `http://customer-service:9010`

#### 3.2 향후 전략: 동적 디스커버리
- **Consul** 또는 **Eureka** 도입 검토
- 서비스 인스턴스 자동 등록 및 발견

---

## 배포 전략

### 1. Docker Compose 구조

#### 1.1 ai.aiion.site/docker-compose.yaml 확장
```yaml
services:
  # ===================
  # ERP Services
  # ===================
  customer-service:
    build:
      context: .
      dockerfile: business/customer_service/Dockerfile
    container_name: erp-customer-service
    ports:
      - "9010:9010"
    depends_on:
      - postgres
      - redis
    networks:
      - spring-network
    environment:
      - DATABASE_URL=postgresql://aiion:aiion4man@postgres:5432/aidb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - API_GATEWAY_URL=http://api-gateway:8080
    restart: unless-stopped

  product-service:
    build:
      context: .
      dockerfile: business/product_service/Dockerfile
    container_name: erp-product-service
    ports:
      - "9011:9011"
    depends_on:
      - postgres
      - redis
    networks:
      - spring-network
    environment:
      - DATABASE_URL=postgresql://aiion:aiion4man@postgres:5432/aidb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    restart: unless-stopped

  order-service:
    build:
      context: .
      dockerfile: business/order_service/Dockerfile
    container_name: erp-order-service
    ports:
      - "9012:9012"
    depends_on:
      - postgres
      - redis
      - customer-service
      - product-service
      - finance-service
    networks:
      - spring-network
    environment:
      - DATABASE_URL=postgresql://aiion:aiion4man@postgres:5432/aidb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - API_GATEWAY_URL=http://api-gateway:8080
    restart: unless-stopped

  finance-service:
    build:
      context: .
      dockerfile: business/finance_service/Dockerfile
    container_name: erp-finance-service
    ports:
      - "9013:9013"
    depends_on:
      - postgres
      - redis
    networks:
      - spring-network
    environment:
      - DATABASE_URL=postgresql://aiion:aiion4man@postgres:5432/aidb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    restart: unless-stopped

  report-service:
    build:
      context: .
      dockerfile: business/report_service/Dockerfile
    container_name: erp-report-service
    ports:
      - "9014:9014"
    depends_on:
      - postgres
      - redis
      - customer-service
      - product-service
      - order-service
      - finance-service
    networks:
      - spring-network
    environment:
      - DATABASE_URL=postgresql://aiion:aiion4man@postgres:5432/aidb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - API_GATEWAY_URL=http://api-gateway:8080
    restart: unless-stopped

networks:
  spring-network:
    external: true
```

### 2. 디렉토리 구조

```
ai.aiion.site/
├── business/
│   ├── customer_service/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── crud.py
│   │   │   └── dependencies.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── product_service/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── crud.py
│   │   │   └── inventory.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── order_service/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── crud.py
│   │   │   └── saga.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── finance_service/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   └── crud.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── report_service/
│       ├── app/
│       │   ├── main.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   ├── crud.py
│       │   └── generator.py
│       ├── Dockerfile
│       └── requirements.txt
│
├── rag/ (기존 챗봇 서비스)
├── feed/ (기존 날씨, 크롤러 서비스)
├── services/ (기존 공통 서비스)
├── docker-compose.yaml
└── ERP_MSA_전략.md (이 문서)
```

---

## API 설계 전략

### 1. RESTful API 설계 원칙

#### 1.1 URL 구조
```
/erp/{resource}/{id}/{sub-resource}
```

**예시**:
- `GET /erp/customers` - 고객 목록
- `GET /erp/customers/CUST-001` - 고객 상세
- `GET /erp/customers/CUST-001/orders` - 고객 주문 목록
- `POST /erp/orders` - 주문 생성
- `PUT /erp/orders/ORD-2024-001/status` - 주문 상태 변경

#### 1.2 HTTP 메서드
- `GET`: 조회
- `POST`: 생성
- `PUT`: 전체 수정
- `PATCH`: 부분 수정
- `DELETE`: 삭제

#### 1.3 응답 형식
```json
{
  "success": true,
  "data": {
    "id": "CUST-001",
    "name": "ABC 기업",
    "email": "contact@abc.com"
  },
  "message": "고객 조회 성공",
  "timestamp": "2025-12-02T10:30:00Z"
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "고객을 찾을 수 없습니다.",
    "details": "고객 ID: CUST-999"
  },
  "timestamp": "2025-12-02T10:30:00Z"
}
```

### 2. API 버전 관리

#### 2.1 URL 버전
```
/erp/v1/customers
/erp/v2/customers
```

#### 2.2 헤더 버전
```
Accept: application/vnd.erp.v1+json
```

### 3. 페이지네이션

```
GET /erp/customers?page=1&size=20&sort=created_at:desc
```

**응답**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "size": 20,
    "total_pages": 5
  }
}
```

### 4. 필터링 및 검색

```
GET /erp/customers?status=활성&type=기업&search=ABC
GET /erp/products?category=전자제품&status=재고있음&min_quantity=10
GET /erp/orders?status=주문완료&date_from=2024-01-01&date_to=2024-12-31
```

---

## 보안 전략

### 1. 인증 및 인가

#### 1.1 JWT 기반 인증
- 모든 ERP API 요청은 JWT 토큰 필수
- `Authorization: Bearer <token>` 헤더

#### 1.2 역할 기반 접근 제어 (RBAC)
```python
# JWT 토큰에서 역할 추출
def verify_admin_role(token: str):
    payload = decode_jwt(token)
    if payload.get("role") not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
```

**역할 정의**:
- `ADMIN`: 모든 권한
- `MANAGER`: 읽기 + 쓰기 (삭제 제외)
- `STAFF`: 읽기 전용

#### 1.3 데이터 격리
- 각 사용자는 자신이 생성한 데이터만 수정/삭제 가능
- `created_by` 필드로 소유권 확인

### 2. API Rate Limiting

#### 2.1 Redis 기반 Rate Limiting
```python
async def rate_limit(user_id: str, limit: int = 100, window: int = 60):
    key = f"rate_limit:{user_id}"
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window)
    if current > limit:
        raise HTTPException(status_code=429, detail="요청 한도 초과")
```

### 3. 데이터 암호화

#### 3.1 전송 중 암호화
- HTTPS (프로덕션 환경)

#### 3.2 저장 시 암호화
- 민감한 필드 (사업자등록번호, 전화번호) 암호화

---

## 확장 전략

### 1. 수평 확장 (Horizontal Scaling)

#### 1.1 서비스 인스턴스 복제
```yaml
# Docker Compose에서 스케일링
docker-compose up --scale customer-service=3
```

#### 1.2 로드 밸런싱
- Spring Cloud Gateway의 라운드 로빈 로드 밸런싱 활용

### 2. 수직 확장 (Vertical Scaling)

#### 2.1 리소스 할당
```yaml
services:
  customer-service:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### 3. 캐싱 전략

#### 3.1 Redis 캐싱
```python
# 고객 통계 캐싱
async def get_customer_stats(customer_id: str):
    cache_key = f"customer_stats:{customer_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # DB에서 계산
    stats = await calculate_customer_stats(customer_id)
    await redis.setex(cache_key, 3600, json.dumps(stats))
    return stats
```

#### 3.2 캐시 무효화
- 주문 생성/수정 시 고객 통계 캐시 삭제
- 재고 변경 시 제품 캐시 삭제

### 4. 데이터베이스 최적화

#### 4.1 인덱스 전략
```sql
-- 자주 조회되는 필드에 인덱스 생성
CREATE INDEX idx_customers_email ON erp_db.customers(email);
CREATE INDEX idx_customers_status ON erp_db.customers(status);
CREATE INDEX idx_orders_customer_id ON erp_db.orders(customer_id);
CREATE INDEX idx_orders_order_date ON erp_db.orders(order_date);
CREATE INDEX idx_products_category ON erp_db.products(category);
CREATE INDEX idx_products_status ON erp_db.products(status);
```

#### 4.2 읽기 복제본 (Read Replica)
- 보고서 생성 시 읽기 전용 복제본 사용
- PostgreSQL Streaming Replication

---

## 구현 로드맵

### Phase 1: 기반 구축 (1-2주)
- [ ] ERP 데이터베이스 스키마 생성
- [ ] Customer Service 구현
- [ ] Product Service 구현
- [ ] API Gateway 라우팅 추가
- [ ] 기본 인증/인가 구현

### Phase 2: 핵심 기능 (2-3주)
- [ ] Order Service 구현
- [ ] Finance Service 구현
- [ ] 서비스 간 통신 구현 (동기)
- [ ] Saga 패턴 구현 (주문 생성)
- [ ] 에러 처리 및 보상 트랜잭션

### Phase 3: 고급 기능 (2-3주)
- [ ] Report Service 구현
- [ ] 비동기 통신 구현 (Redis Pub/Sub)
- [ ] 캐싱 전략 구현
- [ ] Rate Limiting 구현
- [ ] 데이터 암호화

### Phase 4: 최적화 및 모니터링 (1-2주)
- [ ] 성능 최적화
- [ ] 로깅 및 모니터링 (Prometheus + Grafana)
- [ ] 에러 추적 (Sentry)
- [ ] 부하 테스트
- [ ] 문서화 (API 문서, 운영 가이드)

### Phase 5: 프론트엔드 통합 (2-3주)
- [ ] Admin Frontend (Next.js) 구현
- [ ] 대시보드 화면
- [ ] 고객 관리 화면
- [ ] 주문 관리 화면
- [ ] 재고 관리 화면
- [ ] 재무 관리 화면
- [ ] 보고서 화면

---

## 기술 스택

### 백엔드 (ERP 서비스)
- **Framework**: FastAPI (Python 3.11)
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **HTTP Client**: httpx
- **Validation**: Pydantic v2

### 프론트엔드 (Admin)
- **Framework**: Next.js 14+ (React)
- **Language**: TypeScript
- **State Management**: React Query
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

### 인프라
- **Containerization**: Docker, Docker Compose
- **Gateway**: Spring Cloud Gateway
- **Network**: Docker Bridge Network
- **Monitoring**: Prometheus, Grafana (향후)
- **Logging**: ELK Stack (향후)

---

## 모니터링 및 관찰성

### 1. 로깅 전략

#### 1.1 구조화된 로깅
```python
import logging
import json

logger = logging.getLogger(__name__)

def log_request(method: str, path: str, user_id: str):
    logger.info(json.dumps({
        "event": "api_request",
        "method": method,
        "path": path,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat()
    }))
```

#### 1.2 로그 레벨
- `DEBUG`: 개발 환경
- `INFO`: 프로덕션 환경 (일반 이벤트)
- `WARNING`: 경고 (재고 부족 등)
- `ERROR`: 에러 (API 호출 실패 등)
- `CRITICAL`: 치명적 에러 (서비스 다운 등)

### 2. 메트릭 수집

#### 2.1 Prometheus 메트릭
```python
from prometheus_client import Counter, Histogram

# API 호출 횟수
api_requests = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])

# API 응답 시간
api_latency = Histogram('api_latency_seconds', 'API latency', ['method', 'endpoint'])
```

### 3. 분산 추적

#### 3.1 OpenTelemetry (향후)
- 서비스 간 요청 추적
- 병목 지점 식별

---

## 재해 복구 및 백업

### 1. 데이터베이스 백업

#### 1.1 자동 백업
```bash
# 매일 자정 PostgreSQL 백업
0 0 * * * pg_dump -U aiion aidb > /backups/erp_$(date +\%Y\%m\%d).sql
```

#### 1.2 백업 보관 정책
- 일일 백업: 7일 보관
- 주간 백업: 4주 보관
- 월간 백업: 12개월 보관

### 2. 서비스 복구

#### 2.1 Health Check
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "customer-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
```

#### 2.2 자동 재시작
```yaml
services:
  customer-service:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9010/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 보안 체크리스트

### 개발 단계
- [ ] JWT 토큰 검증 구현
- [ ] 역할 기반 접근 제어 구현
- [ ] SQL Injection 방지 (ORM 사용)
- [ ] XSS 방지 (입력 검증)
- [ ] CSRF 방지 (토큰 기반 인증)
- [ ] Rate Limiting 구현
- [ ] 민감한 데이터 암호화

### 배포 단계
- [ ] HTTPS 적용
- [ ] 환경 변수로 비밀 정보 관리
- [ ] 데이터베이스 접근 제한
- [ ] 방화벽 설정
- [ ] 정기적인 보안 업데이트
- [ ] 로그 모니터링

---

## 성능 목표

### 1. 응답 시간
- 단순 조회 (GET): < 100ms
- 복잡한 조회 (JOIN): < 500ms
- 생성/수정 (POST/PUT): < 1s
- 보고서 생성: < 10s

### 2. 처리량
- 동시 사용자: 100명
- 초당 요청 (RPS): 1000
- 데이터베이스 연결: 최대 100

### 3. 가용성
- 목표 가동률: 99.9% (월 43분 다운타임)
- 평균 복구 시간 (MTTR): < 5분

---

## 문서 버전
- **작성일**: 2025-12-02
- **버전**: 1.0.0
- **작성자**: AI Assistant
- **기반**: ERD.md, 기존 아키텍처.md

---

## 참고 자료

### 내부 문서
- `ERD.md`: 데이터베이스 구조
- `api.aiion.site/아키텍처.md`: 기존 시스템 아키텍처

### 외부 자료
- [Microservices Patterns](https://microservices.io/patterns/index.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Spring Cloud Gateway](https://spring.io/projects/spring-cloud-gateway)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

