# AIION Platform - 전체 시스템 아키텍처

> **마이크로서비스 기반 AI 통합 플랫폼**  
> 작성일: 2025-12-03  
> 버전: 2.0

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [레이어 구조](#3-레이어-구조)
4. [서비스 목록](#4-서비스-목록)
5. [데이터 흐름](#5-데이터-흐름)
6. [기술 스택](#6-기술-스택)
7. [인프라 구조](#7-인프라-구조)
8. [보안 아키텍처](#8-보안-아키텍처)
9. [확장 가이드](#9-확장-가이드)

---

## 1. 시스템 개요

### 1.1 프로젝트 구조

```
develop/                                    # 루트 디렉토리
├── .env                                    # 환경 변수 (Neon, Upstash, OAuth, API Keys)
├── docker-compose.yaml                     # 통합 컨테이너 오케스트레이션
│
├── api.aiion.site/                         # API Gateway & 서버 관리
│   ├── server/gateway/                     # Spring Cloud Gateway
│   ├── parse_nanjung.py                    # 데이터 파싱 스크립트
│   └── nanjung.csv                         # 일기 데이터
│
├── service.aiion.site/                     # 도메인 마이크로서비스 (Spring Boot)
│   ├── common-service/                     # 공통 기능
│   ├── auth-service/                       # 인증/인가 (OAuth2, JWT)
│   ├── user-service/                       # 사용자 관리
│   ├── diary-service/                      # 일기 관리
│   ├── calendar-service/                   # 일정/작업 관리
│   ├── culture-service/                    # 문화 정보
│   ├── healthcare-service/                 # 건강 관리
│   ├── pathfinder-service/                 # 경로 탐색
│   └── account-service/                    # 가계부
│
├── ai.aiion.site/                          # AI 서비스 (Python/FastAPI)
│   ├── rag/chatbot_service/                # AI 챗봇 (OpenAI)
│   ├── feed/weather_service/               # 기상청 API 연동
│   └── feed/crawler_service/               # 웹 크롤링
│
├── erp.aiion.site/                         # ERP 서비스 (Python/FastAPI)
│   └── customer_servive/                   # 재고 관리
│
├── www.aiion.site/                         # 사용자 프론트엔드 (Next.js)
│   └── src/
│       ├── app/                            # 페이지 (Landing, Home, Login)
│       ├── components/                     # Atomic Design 컴포넌트
│       ├── store/                          # Zustand 상태 관리
│       └── lib/                            # API 클라이언트
│
└── admin.aiion.site/                       # 관리자 프론트엔드 (Next.js)
    └── src/
        ├── app/dashboard/                  # 대시보드
        ├── containers/                     # 컨테이너 컴포넌트
        ├── handlers/                       # 비즈니스 로직
        ├── service/                        # API 서비스
        └── store/                          # Zustand 상태 관리
```

---

## 2. 전체 아키텍처

### 2.1 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────┐        ┌─────────────────────────┐         │
│  │   www.aiion.site        │        │  admin.aiion.site       │         │
│  │   (User Frontend)       │        │  (Admin Dashboard)      │         │
│  │                         │        │                         │         │
│  │  • Next.js 15           │        │  • Next.js 15           │         │
│  │  • Zustand Store        │        │  • Zustand Store        │         │
│  │  • Atomic Design        │        │  • IIFE Pattern         │         │
│  │  • OAuth Login          │        │  • Email Login          │         │
│  │  • Port: 3000           │        │  • Port: 4000           │         │
│  └─────────────────────────┘        └─────────────────────────┘         │
│              │                                    │                       │
└──────────────┼────────────────────────────────────┼───────────────────────┘
               │                                    │
               └────────────────┬───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Edge Layer (API Gateway)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Spring Cloud Gateway (Port: 8080)                    │  │
│  │                                                                   │  │
│  │  • Routing & Load Balancing                                      │  │
│  │  • CORS Configuration                                            │  │
│  │  • Authentication/Authorization                                  │  │
│  │  • Request/Response Logging                                      │  │
│  │  • Circuit Breaker (준비 중)                                      │  │
│  │  • Rate Limiting (준비 중)                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Domain Microservices Layer                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ auth-service │  │ user-service │  │diary-service │                   │
│  │  Port: 8087  │  │  Port: 8082  │  │  Port: 8083  │                   │
│  │              │  │              │  │              │                   │
│  │ • OAuth2     │  │ • User CRUD  │  │ • Diary CRUD │                   │
│  │ • JWT        │  │ • Profile    │  │ • Search     │                   │
│  │ • Social     │  │ • Settings   │  │ • Analytics  │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │calendar-svc  │  │culture-svc   │  │healthcare-svc│                   │
│  │  Port: 8084  │  │  Port: 8086  │  │  Port: 8088  │                   │
│  │              │  │              │  │              │                   │
│  │ • Events     │  │ • Culture    │  │ • Health     │                   │
│  │ • Tasks      │  │ • Activities │  │ • Tracking   │                   │
│  │ • Reminders  │  │ • Info       │  │ • Reports    │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │pathfinder-svc│  │account-svc   │  │ common-svc   │                   │
│  │  Port: 8090  │  │  Port: 8089  │  │  Port: 8081  │                   │
│  │              │  │              │  │              │                   │
│  │ • Pathfinder │  │ • Accounting │  │ • Health     │                   │
│  │ • Analysis   │  │ • Budget     │  │ • Metrics    │                   │
│  │ • Routes     │  │ • Reports    │  │ • Common     │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI Services Layer                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  chatbot-service │  │ weather-service  │  │ crawler-service  │      │
│  │   Port: 9001     │  │   Port: 9004     │  │   Port: 9003     │      │
│  │                  │  │                  │  │                  │      │
│  │  • OpenAI GPT    │  │  • KMA API       │  │  • Web Scraping  │      │
│  │  • RAG           │  │  • Forecast      │  │  • Data Extract  │      │
│  │  • Context       │  │  • Weather Info  │  │  • Parsing       │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERP Services Layer                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │              inventory-service (Port: 9002)                  │       │
│  │                                                              │       │
│  │  • 재고 관리                                                  │       │
│  │  • 고객 서비스                                                │       │
│  │  • FastAPI                                                   │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Data & Cache Layer                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────┐    ┌────────────────────────────┐       │
│  │   Neon PostgreSQL          │    │   Upstash Redis            │       │
│  │   (Serverless)             │    │   (Serverless)             │       │
│  │                            │    │                            │       │
│  │  • Primary Database        │    │  • Session Store           │       │
│  │  • Auto-scaling            │    │  • Cache Layer             │       │
│  │  • Connection Pooling      │    │  • Rate Limiting           │       │
│  │  • SSL/TLS                 │    │  • SSL/TLS                 │       │
│  │  • Region: ap-southeast-1  │    │  • Global Distribution     │       │
│  └────────────────────────────┘    └────────────────────────────┘       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 레이어 구조

### 3.1 레이어별 책임

| 레이어 | 기술 스택 | 책임 | 포트 범위 |
|--------|----------|------|-----------|
| **Client Layer** | Next.js 15, React 19, Zustand | UI/UX, 사용자 상호작용, 상태 관리 | 3000, 4000 |
| **Edge Layer** | Spring Cloud Gateway | 라우팅, 인증, CORS, 로깅 | 8080 |
| **Domain Services** | Spring Boot 3.x, JPA | 비즈니스 로직, 도메인 모델 | 8081-8090 |
| **AI Services** | Python, FastAPI, OpenAI | AI 기능, 외부 API 연동 | 9001-9004 |
| **ERP Services** | Python, FastAPI | 재고/고객 관리 | 9002 |
| **Data Layer** | Neon PostgreSQL, Upstash Redis | 데이터 저장, 캐싱 | Cloud |

### 3.2 통신 패턴

```
┌─────────────────────────────────────────────────────────────┐
│                    Communication Patterns                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Client → Gateway (HTTP/HTTPS)                           │
│     • REST API                                              │
│     • JSON Payload                                          │
│     • JWT Token in Header/Cookie                           │
│                                                              │
│  2. Gateway → Microservices (HTTP)                          │
│     • Service Discovery (준비 중)                            │
│     • Load Balancing                                        │
│     • Circuit Breaker (준비 중)                              │
│                                                              │
│  3. Microservices → Database (JDBC)                         │
│     • HikariCP Connection Pool                             │
│     • JPA/Hibernate ORM                                    │
│     • SSL/TLS Encryption                                   │
│                                                              │
│  4. Microservices → Cache (Redis)                           │
│     • Spring Data Redis                                    │
│     • SSL/TLS Encryption                                   │
│     • Session Management                                   │
│                                                              │
│  5. AI Services → External APIs                             │
│     • OpenAI API (GPT)                                     │
│     • 기상청 API (KMA)                                      │
│     • HTTP/HTTPS                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 서비스 목록

### 4.1 Spring Boot 마이크로서비스

| 서비스 | 포트 | 설명 | 주요 기능 | 데이터베이스 | 캐시 |
|--------|------|------|-----------|-------------|------|
| **gateway** | 8080 | API Gateway | 라우팅, CORS, 인증 | ❌ | ✅ Redis |
| **common-service** | 8081 | 공통 기능 | Health Check, Metrics | ✅ Neon | ✅ Redis |
| **user-service** | 8082 | 사용자 관리 | CRUD, Profile, Settings | ✅ Neon | ✅ Redis |
| **diary-service** | 8083 | 일기 관리 | CRUD, Search, Analytics | ✅ Neon | ✅ Redis |
| **calendar-service** | 8084 | 일정/작업 | Events, Tasks, Reminders | ✅ Neon | ✅ Redis |
| **culture-service** | 8086 | 문화 정보 | Culture, Activities | ✅ Neon | ✅ Redis |
| **auth-service** | 8087 | 인증/인가 | OAuth2, JWT, Social Login | ✅ Neon | ✅ Redis |
| **healthcare-service** | 8088 | 건강 관리 | Health Tracking, Reports | ✅ Neon | ✅ Redis |
| **account-service** | 8089 | 가계부 | Accounting, Budget | ✅ Neon | ✅ Redis |
| **pathfinder-service** | 8090 | 경로 탐색 | Pathfinder, Analysis | ✅ Neon | ✅ Redis |

### 4.2 Python AI/ERP 서비스

| 서비스 | 포트 | 설명 | 주요 기능 | 외부 API |
|--------|------|------|-----------|----------|
| **aihoyun-chatbot-service** | 9001 | AI 챗봇 | GPT 대화, RAG, Context | OpenAI API |
| **inventory-service** | 9002 | 재고 관리 | 재고 관리, 고객 서비스 | - |
| **aihoyun-crawler-service** | 9003 | 웹 크롤링 | Web Scraping, Parsing | - |
| **aihoyun-weather-service** | 9004 | 기상 정보 | 날씨 예보, 중기예보 | 기상청 API |

### 4.3 프론트엔드 애플리케이션

| 애플리케이션 | 포트 | 설명 | 주요 기능 |
|-------------|------|------|-----------|
| **www.aiion.site** | 3000 | 사용자 웹 | Landing, Home, Diary, Calendar, Chat |
| **admin.aiion.site** | 4000 | 관리자 대시보드 | Inventory, Orders, Reports, Settings |

---

## 5. 데이터 흐름

### 5.1 사용자 로그인 플로우 (OAuth2)

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │ 1. "구글로 시작하기" 클릭
       ▼
┌─────────────────────────────────────┐
│  www.aiion.site (Frontend)          │
│  • handleGoogleLogin() 실행         │
└──────┬──────────────────────────────┘
       │ 2. POST /auth/google/login
       ▼
┌─────────────────────────────────────┐
│  API Gateway (Port: 8080)           │
│  • Route to auth-service            │
└──────┬──────────────────────────────┘
       │ 3. Forward to auth-service
       ▼
┌─────────────────────────────────────┐
│  auth-service (Port: 8087)          │
│  • GoogleController.login()         │
│  • Generate OAuth URL               │
└──────┬──────────────────────────────┘
       │ 4. Return authUrl
       ▼
┌─────────────────────────────────────┐
│  Frontend                           │
│  • window.location.href = authUrl   │
└──────┬──────────────────────────────┘
       │ 5. Redirect to Google
       ▼
┌─────────────────────────────────────┐
│  Google OAuth2                      │
│  • User Login & Consent             │
└──────┬──────────────────────────────┘
       │ 6. Callback with code
       ▼
┌─────────────────────────────────────┐
│  auth-service                       │
│  • GoogleOAuthService.callback()    │
│  • Exchange code for token          │
│  • Get user info                    │
│  • Create/Update user in DB         │
│  • Generate JWT token               │
└──────┬──────────────────────────────┘
       │ 7. Redirect to /login/callback?token=xxx
       ▼
┌─────────────────────────────────────┐
│  Frontend                           │
│  • Extract token from URL           │
│  • Store in localStorage            │
│  • Redirect to /pages/HomePage      │
└─────────────────────────────────────┘
```

### 5.2 일기 작성 플로우

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │ 1. 일기 작성 & 저장 버튼 클릭
       ▼
┌─────────────────────────────────────┐
│  www.aiion.site                     │
│  • DiaryView Component              │
│  • useDiary Hook                    │
└──────┬──────────────────────────────┘
       │ 2. POST /api/diaries
       │    Headers: { Authorization: Bearer <JWT> }
       │    Body: { title, content, diaryDate, userId }
       ▼
┌─────────────────────────────────────┐
│  API Gateway                        │
│  • Validate JWT                     │
│  • Route to diary-service           │
└──────┬──────────────────────────────┘
       │ 3. Forward request
       ▼
┌─────────────────────────────────────┐
│  diary-service (Port: 8083)         │
│  • DiaryController.createDiary()    │
│  • DiaryService.save()              │
└──────┬──────────────────────────────┘
       │ 4. Save to DB
       ▼
┌─────────────────────────────────────┐
│  Neon PostgreSQL                    │
│  • INSERT INTO diaries              │
│  • Return saved entity              │
└──────┬──────────────────────────────┘
       │ 5. Cache invalidation
       ▼
┌─────────────────────────────────────┐
│  Upstash Redis                      │
│  • DEL diary:user:{userId}          │
└──────┬──────────────────────────────┘
       │ 6. Return response
       ▼
┌─────────────────────────────────────┐
│  Frontend                           │
│  • Update Zustand store             │
│  • Re-render DiaryView              │
│  • Show success message             │
└─────────────────────────────────────┘
```

### 5.3 AI 챗봇 대화 플로우

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │ 1. 메시지 입력 & 전송
       ▼
┌─────────────────────────────────────┐
│  www.aiion.site                     │
│  • ChatContainer Component          │
│  • useAIGateway Hook                │
└──────┬──────────────────────────────┘
       │ 2. POST /api/chat
       │    Body: { message, context }
       ▼
┌─────────────────────────────────────┐
│  API Gateway                        │
│  • Route to chatbot-service         │
└──────┬──────────────────────────────┘
       │ 3. Forward to AI service
       ▼
┌─────────────────────────────────────┐
│  aihoyun-chatbot-service (9001)     │
│  • /chat endpoint                   │
│  • Build context from history       │
└──────┬──────────────────────────────┘
       │ 4. Call OpenAI API
       ▼
┌─────────────────────────────────────┐
│  OpenAI API                         │
│  • GPT-4 Processing                 │
│  • Generate response                │
└──────┬──────────────────────────────┘
       │ 5. Return AI response
       ▼
┌─────────────────────────────────────┐
│  chatbot-service                    │
│  • Parse response                   │
│  • Save to conversation history     │
└──────┬──────────────────────────────┘
       │ 6. Return to frontend
       ▼
┌─────────────────────────────────────┐
│  Frontend                           │
│  • Display AI message               │
│  • Update chat history              │
└─────────────────────────────────────┘
```

---

## 6. 기술 스택

### 6.1 Backend (Spring Boot)

```yaml
Framework: Spring Boot 3.2.x
Language: Java 17+
Build Tool: Gradle 8.x

Core Dependencies:
  - spring-boot-starter-web          # REST API
  - spring-boot-starter-data-jpa     # ORM
  - spring-cloud-starter-gateway     # API Gateway
  - spring-boot-starter-security     # Security
  - spring-boot-starter-oauth2-client # OAuth2
  - spring-boot-starter-data-redis   # Redis Cache
  - spring-boot-starter-actuator     # Monitoring

Database:
  - PostgreSQL Driver (org.postgresql:postgresql)
  - HikariCP (Connection Pooling)

Security:
  - JWT (io.jsonwebtoken:jjwt)
  - BCrypt (Password Hashing)

Documentation:
  - Springdoc OpenAPI (Swagger UI)

Testing:
  - JUnit 5
  - Mockito
  - Spring Boot Test
```

### 6.2 Backend (Python)

```yaml
Framework: FastAPI 0.100+
Language: Python 3.11+
Package Manager: pip

Core Dependencies:
  - fastapi                # Web Framework
  - uvicorn                # ASGI Server
  - pydantic               # Data Validation
  - httpx                  # HTTP Client
  - python-dotenv          # Environment Variables

AI/ML:
  - openai                 # OpenAI API Client
  - langchain              # LLM Framework (준비 중)
  - chromadb               # Vector DB (준비 중)

Web Scraping:
  - beautifulsoup4         # HTML Parsing
  - selenium               # Browser Automation
  - requests               # HTTP Client

Testing:
  - pytest
  - pytest-asyncio
```

### 6.3 Frontend

```yaml
Framework: Next.js 15 (App Router)
Language: TypeScript 5.x
Package Manager: pnpm

Core Dependencies:
  - react 19               # UI Library
  - next 15                # React Framework
  - zustand                # State Management
  - axios                  # HTTP Client

UI Components:
  - tailwindcss            # CSS Framework
  - shadcn/ui              # Component Library
  - lucide-react           # Icons

Forms & Validation:
  - react-hook-form        # Form Management
  - zod                    # Schema Validation

Date & Time:
  - date-fns               # Date Utilities

Testing:
  - jest
  - @testing-library/react
```

### 6.4 Infrastructure

```yaml
Containerization:
  - Docker 24+
  - Docker Compose 2.x

Cloud Database:
  - Neon PostgreSQL (Serverless)
  - Region: ap-southeast-1
  - Connection Pooling: Enabled
  - SSL/TLS: Required

Cloud Cache:
  - Upstash Redis (Serverless)
  - Global Distribution
  - SSL/TLS: Required

Monitoring (준비 중):
  - Prometheus
  - Grafana
  - Zipkin (Distributed Tracing)
```

---

## 7. 인프라 구조

### 7.1 Docker Compose 구성

```yaml
# docker-compose.yaml 구조

services:
  # Edge Layer
  gateway:                    # API Gateway (Spring Cloud Gateway)
    ports: ["8080:8080"]
    networks: [spring-network]
    environment:
      - SPRING_DATA_REDIS_HOST=${UPSTASH_REDIS_HOST}
      - SPRING_DATA_REDIS_PASSWORD=${UPSTASH_REDIS_PASSWORD}

  # Domain Services (Spring Boot)
  common-service:             # Port: 8081
  user-service:               # Port: 8082
  diary-service:              # Port: 8083
  calendar-service:           # Port: 8084
  culture-service:            # Port: 8086
  auth-service:               # Port: 8087
  healthcare-service:         # Port: 8088
  account-service:            # Port: 8089
  pathfinder-service:         # Port: 8090
    # 공통 환경 변수:
    environment:
      - SPRING_DATASOURCE_URL=${NEON_CONNECTION_STRING}
      - SPRING_DATASOURCE_USERNAME=${NEON_USER}
      - SPRING_DATASOURCE_PASSWORD=${NEON_PASSWORD}
      - SPRING_DATA_REDIS_HOST=${UPSTASH_REDIS_HOST}
      - SPRING_DATA_REDIS_PASSWORD=${UPSTASH_REDIS_PASSWORD}
      - SPRING_JPA_HIBERNATE_DDL_AUTO=update

  # AI Services (Python/FastAPI)
  aihoyun-chatbot-service:    # Port: 9001
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
  
  aihoyun-weather-service:    # Port: 9004
    environment:
      - KMA_API_KEY=${KMA_API_KEY}
  
  aihoyun-crawler-service:    # Port: 9003

  # ERP Services
  inventory-service:          # Port: 9002

networks:
  spring-network:
    driver: bridge
```

### 7.2 환경 변수 구조 (.env)

```bash
# ===========================================
# Neon Database Configuration
# ===========================================
NEON_CONNECTION_STRING=jdbc:postgresql://ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NEON_HOST=ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1.aws.neon.tech
NEON_DATABASE=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=npg_yKz6I1piqEBt

# ===========================================
# Upstash Redis Configuration
# ===========================================
UPSTASH_REDIS_URL=rediss://default:xxx@helpful-troll-43968.upstash.io:6379
UPSTASH_REDIS_HOST=helpful-troll-43968.upstash.io
UPSTASH_REDIS_PORT=6379
UPSTASH_REDIS_PASSWORD=xxx
UPSTASH_REDIS_REST_URL=https://helpful-troll-43968.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ===========================================
# JPA/Hibernate Configuration
# ===========================================
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=true
SPRING_JPA_PROPERTIES_HIBERNATE_FORMAT_SQL=true
SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect

# ===========================================
# OAuth2 Configuration (for auth-service)
# ===========================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8080/oauth2/callback/google

NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_REDIRECT_URI=http://localhost:8080/oauth2/callback/naver

KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=http://localhost:8080/oauth2/callback/kakao

JWT_SECRET=your-secret-key-here-change-in-production-min-256-bits

# ===========================================
# AI Services API Keys
# ===========================================
OPENAI_API_KEY=
KMA_API_KEY=
KMA_SHORT_KEY=
```

### 7.3 네트워크 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: spring-network            │
│                    Driver: bridge                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Internal Communication (Service Name Resolution):          │
│                                                              │
│  gateway:8080                                               │
│    ├─→ common-service:8081                                 │
│    ├─→ auth-service:8087                                   │
│    ├─→ user-service:8082                                   │
│    ├─→ diary-service:8083                                  │
│    ├─→ calendar-service:8084                               │
│    ├─→ culture-service:8086                                │
│    ├─→ healthcare-service:8088                             │
│    ├─→ pathfinder-service:8090                             │
│    ├─→ account-service:8089                                │
│    ├─→ aihoyun-chatbot-service:9001                        │
│    ├─→ aihoyun-weather-service:9004                        │
│    ├─→ aihoyun-crawler-service:9003                        │
│    └─→ inventory-service:9002                              │
│                                                              │
│  External Access (Port Mapping):                            │
│    localhost:8080 → gateway:8080                           │
│    localhost:8081-8090 → services:8081-8090                │
│    localhost:9001-9004 → ai-services:9001-9004             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Neon PostgreSQL (Cloud)                                    │
│    • ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1...  │
│    • SSL/TLS Required                                       │
│    • Connection Pooling (HikariCP)                          │
│                                                              │
│  Upstash Redis (Cloud)                                      │
│    • helpful-troll-43968.upstash.io:6379                   │
│    • SSL/TLS Required (rediss://)                          │
│    • Global Distribution                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 보안 아키텍처

### 8.1 인증/인가 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Social Login (OAuth2)                                   │
│     User → Frontend → Gateway → auth-service                │
│     → OAuth Provider (Google/Naver/Kakao)                   │
│     → Callback → auth-service → Generate JWT                │
│     → Frontend (Store JWT in localStorage)                  │
│                                                              │
│  2. Email/Password Login                                    │
│     User → Frontend → Gateway → auth-service                │
│     → Validate credentials (BCrypt)                         │
│     → Generate JWT → Frontend                               │
│                                                              │
│  3. API Request with JWT                                    │
│     Frontend → Gateway (JWT in Authorization Header)        │
│     → Validate JWT → Extract userId                         │
│     → Forward to Microservice                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 보안 계층

| 계층 | 보안 메커니즘 | 설명 |
|------|--------------|------|
| **Transport** | HTTPS/TLS | 전송 계층 암호화 (프로덕션) |
| **API Gateway** | CORS, Rate Limiting | Cross-Origin 제어, API 호출 제한 |
| **Authentication** | OAuth2, JWT | 소셜 로그인, 토큰 기반 인증 |
| **Authorization** | Role-Based Access Control | 사용자 권한 기반 접근 제어 |
| **Database** | SSL/TLS, Connection Pooling | DB 연결 암호화, 안전한 연결 관리 |
| **Cache** | SSL/TLS, Password Auth | Redis 연결 암호화, 비밀번호 인증 |
| **Secrets** | Environment Variables | 민감 정보를 .env 파일로 관리 |

### 8.3 JWT 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["USER"],
    "iat": 1234567890,
    "exp": 1234571490
  },
  "signature": "HMACSHA256(base64UrlEncode(header) + '.' + base64UrlEncode(payload), JWT_SECRET)"
}
```

---

## 9. 확장 가이드

### 9.1 새로운 마이크로서비스 추가

#### Step 1: 서비스 생성

```bash
# service.aiion.site/ 디렉토리에서
mkdir new-service
cd new-service

# Spring Initializr로 프로젝트 생성
# 또는 기존 서비스를 템플릿으로 복사
```

#### Step 2: Dockerfile 작성

```dockerfile
# service.aiion.site/new-service/Dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE 8091
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### Step 3: docker-compose.yaml 업데이트

```yaml
# develop/docker-compose.yaml
services:
  # ... 기존 서비스들

  new-service:
    build:
      context: ./service.aiion.site
      dockerfile: ./new-service/Dockerfile
    container_name: new-service
    ports:
      - "8091:8091"
    networks:
      - spring-network
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - SPRING_DATASOURCE_URL=${NEON_CONNECTION_STRING}
      - SPRING_DATASOURCE_USERNAME=${NEON_USER}
      - SPRING_DATASOURCE_PASSWORD=${NEON_PASSWORD}
      - SPRING_DATA_REDIS_HOST=${UPSTASH_REDIS_HOST}
      - SPRING_DATA_REDIS_PASSWORD=${UPSTASH_REDIS_PASSWORD}
```

#### Step 4: Gateway 라우팅 추가

```yaml
# api.aiion.site/server/gateway/src/main/resources/application.yaml
spring:
  cloud:
    gateway:
      routes:
        - id: new-service
          uri: http://new-service:8091
          predicates:
            - Path=/api/new/**
          filters:
            - StripPrefix=1
```

### 9.2 새로운 AI 서비스 추가

#### Step 1: 서비스 생성

```bash
# ai.aiion.site/ 디렉토리에서
mkdir -p ml/recommendation_service
cd ml/recommendation_service

# FastAPI 프로젝트 구조 생성
mkdir app
touch app/main.py
touch Dockerfile
touch requirements.txt
```

#### Step 2: FastAPI 애플리케이션 작성

```python
# ai.aiion.site/ml/recommendation_service/app/main.py
from fastapi import FastAPI
import os

app = FastAPI(title="Recommendation Service")

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/recommend")
async def recommend(user_id: int):
    # Recommendation logic
    return {"recommendations": []}
```

#### Step 3: docker-compose.yaml 업데이트

```yaml
# develop/docker-compose.yaml
services:
  # ... 기존 서비스들

  aihoyun-recommendation-service:
    build:
      context: ./ai.aiion.site
      dockerfile: ml/recommendation_service/Dockerfile
    container_name: aihoyun-recommendation-service
    ports:
      - "9005:9005"
    networks:
      - spring-network
    environment:
      - API_GATEWAY_URL=http://api-gateway:8080
    restart: unless-stopped
```

### 9.3 프론트엔드 페이지 추가

#### Step 1: 페이지 생성

```bash
# www.aiion.site/src/app/ 디렉토리에서
mkdir new-feature
touch new-feature/page.tsx
```

#### Step 2: 페이지 컴포넌트 작성

```typescript
// www.aiion.site/src/app/new-feature/page.tsx
'use client';

import { useState } from 'react';

export default function NewFeaturePage() {
  const [data, setData] = useState(null);

  return (
    <div>
      <h1>New Feature</h1>
      {/* Component logic */}
    </div>
  );
}
```

#### Step 3: API Hook 생성

```typescript
// www.aiion.site/src/app/hooks/useNewFeature.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

export const useNewFeature = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/new-feature`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, fetchData };
};
```

### 9.4 데이터베이스 스키마 변경

#### 자동 스키마 업데이트 (개발 환경)

```yaml
# .env
SPRING_JPA_HIBERNATE_DDL_AUTO=update  # 자동으로 스키마 업데이트
```

#### 수동 마이그레이션 (프로덕션 권장)

```sql
-- Neon PostgreSQL에 직접 연결하여 실행
-- psql 'postgresql://neondb_owner:xxx@ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

-- 새로운 테이블 생성
CREATE TABLE new_table (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기존 테이블에 컬럼 추가
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
```

---

## 10. 모니터링 & 로깅 (준비 중)

### 10.1 계획된 모니터링 스택

```yaml
# docker-compose.yaml (주석 처리된 부분)
prometheus:
  image: prom/prometheus:latest
  ports: ["9090:9090"]
  # Metrics 수집

grafana:
  image: grafana/grafana:latest
  ports: ["3001:3000"]
  # 시각화 대시보드

zipkin:
  image: openzipkin/zipkin:latest
  ports: ["9411:9411"]
  # Distributed Tracing
```

### 10.2 로깅 전략

| 서비스 | 로그 레벨 | 출력 위치 |
|--------|----------|----------|
| Spring Boot | INFO | stdout, 파일 (준비 중) |
| FastAPI | INFO | stdout |
| Gateway | DEBUG | stdout (CORS, Routing) |

---

## 11. 성능 최적화

### 11.1 데이터베이스 최적화

```yaml
# HikariCP Connection Pool 설정
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5
SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2
SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=30000
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=600000
SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=1800000
```

### 11.2 캐싱 전략

```
┌─────────────────────────────────────────────────────────────┐
│                    Caching Strategy                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Session Store (Redis)                                   │
│     • User sessions                                         │
│     • JWT token blacklist                                   │
│     • TTL: 24 hours                                         │
│                                                              │
│  2. API Response Cache (Redis)                              │
│     • Frequently accessed data                              │
│     • Weather information                                   │
│     • TTL: 5-60 minutes                                     │
│                                                              │
│  3. Database Query Cache (JPA 2nd Level Cache)              │
│     • Entity cache                                          │
│     • Query result cache                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. 배포 전략 (향후 계획)

### 12.1 개발 환경

```bash
# 로컬 개발
docker-compose up -d

# 프론트엔드 개발 서버
cd www.aiion.site
pnpm dev

cd admin.aiion.site
pnpm dev
```

### 12.2 프로덕션 환경 (계획)

```yaml
# Kubernetes 배포 (향후)
- Container Orchestration: Kubernetes
- Cloud Provider: AWS/GCP/Azure
- CI/CD: GitHub Actions
- Monitoring: Prometheus + Grafana
- Logging: ELK Stack
```

---

## 13. 트러블슈팅

### 13.1 일반적인 문제

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| 컨테이너 시작 실패 | 포트 충돌 | `docker-compose down` 후 재시작 |
| DB 연결 실패 | Neon 자격 증명 오류 | `.env` 파일 확인 |
| Redis 연결 실패 | Upstash 자격 증명 오류 | `.env` 파일 확인 |
| OAuth 로그인 실패 | Client ID/Secret 누락 | `.env`에 OAuth 설정 추가 |
| CORS 에러 | Gateway CORS 설정 | `CorsConfig.java` 확인 |

### 13.2 디버깅 명령어

```bash
# 컨테이너 로그 확인
docker-compose logs -f [service-name]

# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 재시작
docker-compose restart [service-name]

# 전체 재빌드
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 데이터베이스 연결 테스트
psql 'postgresql://neondb_owner:xxx@ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

# Redis 연결 테스트
redis-cli -h helpful-troll-43968.upstash.io -p 6379 -a xxx --tls
```

---

## 14. 참고 자료

### 14.1 공식 문서

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Cloud Gateway](https://spring.io/projects/spring-cloud-gateway)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Neon PostgreSQL](https://neon.tech/docs)
- [Upstash Redis](https://docs.upstash.com/redis)

### 14.2 아키텍처 패턴

- [Microservices Pattern](https://microservices.io/)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
- [Circuit Breaker Pattern](https://microservices.io/patterns/reliability/circuit-breaker.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)

---

## 15. 버전 히스토리

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| 1.0 | 2024-11-XX | 초기 아키텍처 구성 (로컬 PostgreSQL, Redis) |
| 2.0 | 2024-12-03 | 클라우드 전환 (Neon, Upstash), Docker Compose 통합 |

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

**Last Updated**: 2024-12-03

