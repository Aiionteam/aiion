# 프론트엔드 TODO: Redis 토큰 저장 시스템 연동

## 현재 상태
- ✅ 백엔드: Redis를 통한 토큰 저장 시스템 완료
- ✅ 프론트엔드: 기본 API 클라이언트 및 로그인 플로우 구현 완료
- ⚠️ 토큰 저장 로직: 현재 테스트를 위해 비활성화됨

## 해야 할 작업

### 1. 백엔드 응답 형식 확인 및 인터페이스 업데이트
**파일**: `src/lib/api/auth.ts`

**작업 내용**:
- 백엔드가 반환하는 실제 응답 형식 확인
  - Access Token 필드명 확인 (`token`, `accessToken`, `access_token` 등)
  - Refresh Token 필드명 확인 (`refreshToken`, `refresh_token` 등)
  - 사용자 정보 필드 확인 (`user`, `userInfo` 등)
- `LoginResponse` 인터페이스 업데이트
  ```typescript
  export interface LoginResponse {
    success?: boolean;
    accessToken?: string;      // Access Token
    refreshToken?: string;     // Refresh Token (새로 추가)
    token?: string;            // 하위 호환성 유지
    user?: {
      id: string;
      username: string;
      email?: string;
    };
    message?: string;
  }
  ```

**확인 필요 사항**:
- 백엔드 응답 예시 요청
- 각 소셜 로그인(카카오, 네이버, 구글) 응답 형식이 동일한지 확인

---

### 2. 토큰 저장 로직 활성화 및 개선
**파일**: `src/lib/api/auth.ts`, `src/store/slices/loginSlice.ts`

**작업 내용**:
- [ ] Access Token과 Refresh Token 분리 저장
  - Access Token: `localStorage` 또는 `sessionStorage`에 저장
  - Refresh Token: `httpOnly` 쿠키 사용 권장 (XSS 방지) 또는 `localStorage`
- [ ] 토큰 저장 함수 업데이트
  ```typescript
  // 현재: saveToken(token: string)
  // 변경: saveTokens(accessToken: string, refreshToken?: string)
  ```
- [ ] `loginSlice.ts`의 주석 처리된 토큰 저장 코드 활성화
  - `handleKakaoLogin`, `handleNaverLogin`, `handleGoogleLogin`에서 토큰 저장

**저장 위치 결정**:
- **Access Token**: `localStorage` (페이지 새로고침 시에도 유지)
- **Refresh Token**: `localStorage` (백엔드에서 Redis에 저장하므로 프론트엔드는 선택적)
- 또는 백엔드가 토큰을 Redis에만 저장하고 프론트엔드에는 저장하지 않을 수도 있음

---

### 3. API 요청 시 토큰 헤더 자동 추가
**파일**: `src/lib/api/client.ts`

**현재 상태**: ✅ 이미 구현됨 (`getHeaders()` 메서드에서 `Authorization: Bearer ${token}` 추가)

**확인 사항**:
- [ ] 토큰이 없을 때 헤더를 추가하지 않는지 확인
- [ ] 토큰이 만료되었을 때 자동 갱신 로직 연동 (4번 작업 후)

---

### 4. 토큰 만료 시 자동 갱신 (Refresh Token)
**파일**: `src/lib/api/client.ts`, `src/lib/api/auth.ts`

**작업 내용**:
- [ ] 401 Unauthorized 응답 시 Refresh Token으로 토큰 갱신 시도
- [ ] Refresh Token API 엔드포인트 확인 (`/api/auth/refresh` 또는 유사)
- [ ] 토큰 갱신 인터셉터 구현
  ```typescript
  // client.ts의 handleErrorResponse에 추가
  if (response.status === 401) {
    // Refresh Token으로 Access Token 갱신 시도
    const newToken = await refreshAccessToken();
    if (newToken) {
      // 원래 요청 재시도
      return retryOriginalRequest(newToken);
    }
  }
  ```
- [ ] Refresh Token도 만료되었을 때 로그아웃 처리

**확인 필요 사항**:
- 백엔드 Refresh Token API 엔드포인트 및 요청/응답 형식

---

### 5. OAuth2 실제 플로우 구현 (선택사항)
**현재 상태**: 프론트엔드에서 백엔드 API를 직접 호출 (`POST /api/{provider}/login`)

**작업 내용**:
- [ ] 백엔드가 OAuth2 리다이렉트 플로우를 사용하는지 확인
  - 리다이렉트 방식 사용 시:
    - 소셜 로그인 버튼 클릭 → 백엔드 OAuth2 인증 URL로 리다이렉트
    - 콜백 페이지에서 Authorization Code 받기
    - 콜백 페이지에서 백엔드로 코드 전송
  - 현재 직접 API 호출 방식 유지 시:
    - 변경 불필요

**확인 필요 사항**:
- 백엔드가 OAuth2 리다이렉트를 사용하는지, 아니면 현재처럼 직접 API 호출만 사용하는지
- 리다이렉트 사용 시 콜백 URL 설정

---

### 6. 로그아웃 시 토큰 삭제
**파일**: `src/store/slices/loginSlice.ts`, `src/lib/api/auth.ts`

**작업 내용**:
- [ ] `logout()` 함수에서 모든 토큰 삭제
  - Access Token 삭제
  - Refresh Token 삭제
  - Session Storage의 `isAuthenticated` 삭제
- [ ] 백엔드 로그아웃 API 호출 확인
  - 백엔드 Redis에서 토큰 삭제 요청

**현재 상태**: `localStorage.removeItem("token")`만 실행 중

---

### 7. 에러 처리 개선
**파일**: `src/store/slices/loginSlice.ts`

**작업 내용**:
- [ ] 토큰 만료 에러(401)와 인증 실패 에러 구분
- [ ] Refresh Token 만료 시 명확한 메시지 표시
- [ ] 네트워크 에러와 인증 에러 구분

---

### 8. 보안 검토
**작업 내용**:
- [ ] XSS 공격 방지를 위한 토큰 저장 방식 검토
  - Access Token: `localStorage` 사용 시 XSS 취약점 존재
  - Refresh Token: `httpOnly` 쿠키 사용 권장 (백엔드 지원 필요)
- [ ] CSRF 공격 방지 확인
- [ ] 토큰이 브라우저 개발자 도구에서 노출되지 않도록 주의

---

## 백엔드와 협의 필요 사항

### 1. 응답 형식
- [ ] 로그인 성공 시 응답 형식 (JSON 구조)
- [ ] Access Token 필드명
- [ ] Refresh Token 필드명
- [ ] 사용자 정보 필드명

### 2. 토큰 관리
- [ ] Access Token 만료 시간 (백엔드 Redis 설정: 1시간)
- [ ] Refresh Token 만료 시간 (백엔드 Redis 설정: 30일)
- [ ] Refresh Token API 엔드포인트 (`/api/auth/refresh` 등)
- [ ] 프론트엔드에서 Refresh Token도 저장해야 하는지, 아니면 백엔드 Redis에만 저장하는지

### 3. OAuth2 플로우
- [ ] 현재 직접 API 호출 방식 유지할지
- [ ] OAuth2 리다이렉트 플로우로 변경할지
- [ ] 리다이렉트 사용 시 콜백 URL (`http://localhost:3000/oauth2/callback` 등)

### 4. 로그아웃
- [ ] 로그아웃 API 엔드포인트 확인
- [ ] 로그아웃 시 백엔드 Redis에서 토큰 삭제하는지

---

## 우선순위

### High Priority (즉시 필요)
1. ✅ 백엔드 응답 형식 확인 및 인터페이스 업데이트
2. ✅ 토큰 저장 로직 활성화

### Medium Priority (곧 필요)
3. ✅ 토큰 만료 시 자동 갱신
4. ✅ 로그아웃 시 토큰 삭제

### Low Priority (향후 개선)
5. ✅ OAuth2 실제 플로우 구현
6. ✅ 보안 검토 및 개선

---

## 참고 파일
- `src/lib/api/auth.ts` - 인증 API 및 토큰 관리
- `src/lib/api/client.ts` - API 클라이언트 (토큰 헤더 자동 추가)
- `src/store/slices/loginSlice.ts` - 로그인 상태 관리
- `docs/FRONTEND_API_ENDPOINTS.md` - API 엔드포인트 정리

---

## 테스트 체크리스트

### 로그인 테스트
- [ ] 카카오 로그인 성공 시 토큰 저장 확인
- [ ] 네이버 로그인 성공 시 토큰 저장 확인
- [ ] 구글 로그인 성공 시 토큰 저장 확인
- [ ] 로그인 후 API 요청 시 토큰이 헤더에 포함되는지 확인

### 토큰 갱신 테스트
- [ ] Access Token 만료 시 자동 갱신 확인
- [ ] Refresh Token 만료 시 로그아웃 처리 확인

### 로그아웃 테스트
- [ ] 로그아웃 시 모든 토큰 삭제 확인
- [ ] 로그아웃 후 API 요청 시 401 에러 확인

