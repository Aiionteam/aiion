# Hohyun Shop Frontend

Next.js 프론트엔드 프로젝트

## 개발 환경 구성

### 옵션 1: 프론트엔드 로컬 개발 + 백엔드 Docker (추천) ⭐

**가장 일반적이고 편한 개발 방식**

```bash
# 1. 백엔드만 Docker로 실행
docker-compose -f docker-compose.dev.yml up

# 2. 프론트엔드는 로컬에서 개발 서버 실행
pnpm dev
```

- ✅ 프론트엔드: `http://localhost:3000` (로컬 개발 서버)
- ✅ 백엔드: `http://localhost:8080` (Docker 컨테이너)
- ✅ 핫 리로드 빠름
- ✅ 디버깅 용이
- ✅ **개발 서버가 백엔드 Docker 컨테이너에 자동 연결됨!**

**왜 연결이 되나요?**
- Docker 컨테이너는 `ports: "8080:8080"`으로 포트 매핑됨
- 로컬 개발 서버에서 `http://localhost:8080`으로 요청
- → Docker 컨테이너의 8080 포트로 자동 라우팅됨

### 옵션 2: 프론트엔드 Docker + 백엔드 Docker

**프로덕션 환경과 동일하게 테스트**

```bash
# 전체 스택 Docker로 실행
docker-compose up
```

- ✅ 프론트엔드: `http://localhost:3000` (Docker 컨테이너)
- ✅ 백엔드: `http://localhost:8080` (Docker 컨테이너)

### 옵션 3: 모두 로컬 실행

**Docker 없이 개발**

```bash
# 1. 백엔드를 로컬에서 직접 실행 (Spring Boot)
# 2. 프론트엔드 개발 서버 실행
pnpm dev
```

## 환경 변수

### 로컬 개발 환경

기본값으로 다음 URL이 사용됩니다:
- **백엔드 API**: `http://localhost:8080` (API 클라이언트)
- **AI 챗봇 서버**: `http://localhost:9000` (챗봇 API 클라이언트)

필요시 `.env.local` 파일 생성:

```env
# 백엔드 API 서버 (Spring Gateway)
NEXT_PUBLIC_API_URL=http://localhost:8080

# AI 챗봇 서버
NEXT_PUBLIC_CHAT_API_URL=http://localhost:9000
```

### Docker 환경

`docker-compose.yml`에서 자동으로 설정됩니다:
- 프론트엔드 컨테이너: `http://gateway:8080` (내부 네트워크)
- 로컬 접근: `http://localhost:8080` (포트 매핑)

## Getting Started

### 로컬 개발 서버 실행 (추천)

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

**백엔드가 Docker로 실행 중이면 자동으로 연결됩니다!**

### Docker로 실행

```bash
# 전체 스택 빌드 및 실행
docker-compose up --build

# 백엔드만 실행 (프론트엔드는 로컬 개발 서버 사용)
docker-compose -f docker-compose.dev.yml up

# 중지
docker-compose down
```

## 백엔드 연결

프론트엔드는 두 개의 백엔드 서버와 연결됩니다:

### 1. 메인 백엔드 서버 (Spring Gateway)
- **포트**: `8080`
- **용도**: 인증, 사용자 관리, 블로그 등

#### API 엔드포인트
- 로그인: `POST /api/auth/login`
- 카카오 로그인: `POST /api/kakao/login`
- 네이버 로그인: `POST /api/auth/naver`
- 구글 로그인: `POST /api/auth/google`

### 2. AI 챗봇 서버
- **포트**: `9000`
- **용도**: AI 챗봇 대화 처리

#### API 엔드포인트
- 챗봇 메시지 전송: `POST /api/chat`
- 대화 기록 조회: `GET /api/chat/conversation/:id`
- 대화 목록 조회: `GET /api/chat/conversations`
- 대화 삭제: `DELETE /api/chat/conversation/:id`
- 서버 상태 확인: `GET /health`

### 연결 테스트

`/api-test` 페이지에서 백엔드 연결 상태를 확인할 수 있습니다.

### 사용 예시

```typescript
// 메인 백엔드 API 사용
import { apiClient } from "@/lib/api";
const response = await apiClient.get("/api/auth/user");

// AI 챗봇 API 사용
import { sendChatMessage, chatApiClient } from "@/lib/api";
const chatResponse = await sendChatMessage({
  message: "안녕하세요!",
});
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://docs.pmnd.rs/zustand)
