# OAuth 소셜 로그인 통합 가이드

## 개요

www.study.site의 소셜 로그인(Google, Naver, Kakao)이 api.aiion.site의 OAuth 서비스와 통합되어 있습니다.

## 아키텍처

```
프론트엔드 (www.study.site:5000)
    ↓
게이트웨이 (localhost:8080)
    ↓
OAuth 서비스 (oauth-service:8087)
    ↓
소셜 로그인 제공자 (Google/Naver/Kakao)
```

## API 엔드포인트

### Google OAuth

- **인증 URL 가져오기**: `GET /api/google/auth-url`
- **로그인**: `POST /api/google/login`
- **콜백 처리**: `GET /api/google/callback?code={code}`
- **토큰 교환**: `POST /api/google/token`
- **사용자 정보**: `GET /api/google/user`

### Naver OAuth

- **인증 URL 가져오기**: `GET /api/naver/auth-url`
- **로그인**: `POST /api/naver/login`
- **콜백 처리**: `GET /api/naver/callback?code={code}`
- **토큰 교환**: `POST /api/naver/token`
- **사용자 정보**: `GET /api/naver/user`

### Kakao OAuth

- **인증 URL 가져오기**: `GET /api/kakao/auth-url`
- **로그인**: `POST /api/kakao/login`
- **콜백 처리**: `GET /api/kakao/callback?code={code}`
- **토큰 교환**: `POST /api/kakao/token`
- **사용자 정보**: `GET /api/kakao/user`

## OAuth 플로우

1. **인증 시작**
   - 사용자가 소셜 로그인 버튼 클릭
   - 프론트엔드가 백엔드에 `/api/{provider}/auth-url` 요청
   - 백엔드가 소셜 로그인 제공자의 OAuth URL 반환

2. **OAuth 인증**
   - 팝업 창에서 소셜 로그인 제공자 페이지로 이동
   - 사용자가 로그인 및 권한 승인

3. **콜백 처리**
   - 소셜 로그인 제공자가 콜백 URL로 리다이렉트
   - 콜백 URL: `http://localhost:5000/login/callback?token={jwt_token}&refresh_token={refresh_token}`
   - 또는 에러 시: `http://localhost:5000/login/callback?error={error}&error_description={description}`

4. **토큰 저장 및 로그인 완료**
   - 콜백 페이지에서 JWT 토큰을 localStorage에 저장
   - 사용자 정보를 상태에 업데이트
   - 홈 페이지로 리다이렉트

## 게이트웨이 라우팅 설정

게이트웨이(`api.aiion.site/server/gateway/src/main/resources/application.yaml`)에서 다음 라우팅이 설정되어 있습니다:

```yaml
# OAuth 소셜 로그인 API 경로
- id: api-oauth-google-service
  uri: http://oauth-service:8087
  predicates:
    - Path=/api/google/**
  filters:
    - StripPrefix=2  # /api/google/auth-url → /google/auth-url

- id: api-oauth-naver-service
  uri: http://oauth-service:8087
  predicates:
    - Path=/api/naver/**
  filters:
    - StripPrefix=2  # /api/naver/auth-url → /naver/auth-url

- id: api-oauth-kakao-service
  uri: http://oauth-service:8087
  predicates:
    - Path=/api/kakao/**
  filters:
    - StripPrefix=2  # /api/kakao/auth-url → /kakao/auth-url
```

## 백엔드 OAuth 서비스 요구사항

백엔드 OAuth 서비스(`oauth-service:8087`)는 다음 엔드포인트를 제공해야 합니다:

### Google OAuth 엔드포인트

- `GET /google/auth-url` → OAuth 인증 URL 반환
- `POST /google/login` → 로그인 처리
- `GET /google/callback?code={code}` → 콜백 처리
- `POST /google/token` → 토큰 교환
- `GET /google/user` → 사용자 정보 조회

### Naver OAuth 엔드포인트

- `GET /naver/auth-url` → OAuth 인증 URL 반환
- `POST /naver/login` → 로그인 처리
- `GET /naver/callback?code={code}` → 콜백 처리
- `POST /naver/token` → 토큰 교환
- `GET /naver/user` → 사용자 정보 조회

### Kakao OAuth 엔드포인트

- `GET /kakao/auth-url` → OAuth 인증 URL 반환
- `POST /kakao/login` → 로그인 처리
- `GET /kakao/callback?code={code}` → 콜백 처리
- `POST /kakao/token` → 토큰 교환
- `GET /kakao/user` → 사용자 정보 조회

## 콜백 URL 설정

소셜 로그인 제공자(OAuth 앱)에서 콜백 URL을 다음과 같이 설정해야 합니다:

- **개발 환경**: `http://localhost:5000/login/callback`
- **프로덕션 환경**: `https://www.study.site/login/callback`

백엔드 OAuth 서비스에서도 이 콜백 URL을 인지하고, OAuth 인증 후 이 URL로 리다이렉트해야 합니다.

## 환경 변수

프론트엔드에서 사용하는 환경 변수:

- `NEXT_PUBLIC_API_URL`: API 게이트웨이 URL (기본값: `http://localhost:8080`)

## 테스트 방법

1. 게이트웨이 서버 실행 (포트 8080)
2. OAuth 서비스 실행 (포트 8087)
3. 프론트엔드 서버 실행 (포트 5000)
4. `/health` 페이지에서 연결 상태 확인
5. 로그인 페이지에서 소셜 로그인 버튼 클릭

## 문제 해결

### 1. 네트워크 연결 오류

- 게이트웨이 서버가 실행 중인지 확인
- OAuth 서비스가 실행 중인지 확인
- `/health` 페이지에서 연결 상태 확인

### 2. CORS 오류

- 게이트웨이의 CORS 설정 확인
- `localhost:5000`이 허용된 Origin 목록에 포함되어 있는지 확인

### 3. 404 오류

- 게이트웨이 라우팅 설정 확인
- OAuth 서비스의 엔드포인트가 올바르게 구현되어 있는지 확인

### 4. 콜백 오류

- 소셜 로그인 제공자에서 콜백 URL이 올바르게 설정되어 있는지 확인
- 백엔드 OAuth 서비스가 콜백 URL로 올바르게 리다이렉트하는지 확인

