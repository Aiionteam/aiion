# Next.js + FastAPI 연동 가이드

## 아키텍처

```
사용자 브라우저
    ↓ (파일 업로드)
Next.js (localhost:5000)
    ↓ (fetch → FastAPI)
FastAPI (localhost:8000)
    ↓ (파일 저장)
cv.aiion.site/app/yolo/data/
    ↓ (감지)
YOLO Face Detection
    ↓ (결과 저장)
파일명-detected.jpg
```

## 실행 순서

### 1. FastAPI 서버 실행

```bash
# 터미널 1
cd cv.aiion.site
conda activate py312
python main.py
```

서버 실행 확인: `http://localhost:8000/docs`

### 2. YOLO 파일 감시 실행 (선택사항)

```bash
# 터미널 2
cd cv.aiion.site
conda activate py312
python app/yolo/main.py watch
```

### 3. Next.js 개발 서버 실행

```bash
# 터미널 3
cd www.study.site
pnpm dev
```

서버 실행 확인: `http://localhost:5000`

## 환경변수 설정

### www.study.site/.env.local

```env
# FastAPI Backend URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Gateway URL (기존)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8080
```

`.env.local.example` 파일을 복사해서 `.env.local`을 만들고 설정하세요:

```bash
cd www.study.site
cp .env.local.example .env.local
```

## 업로드 흐름

1. **사용자**: YOLO 업로드 페이지에서 파일 선택
2. **Next.js**: `FormData`로 FastAPI에 전송
   ```typescript
   fetch(`${apiBaseUrl}/api/upload`, {
     method: "POST",
     body: formData,
   })
   ```
3. **FastAPI**: 파일을 `cv.aiion.site/app/yolo/data/`에 저장
4. **파일 감시**: 새 파일 감지 → 얼굴 디텍팅 실행
5. **결과**: `파일명-detected.jpg` 생성

## 페이지

### YOLO 업로드 페이지
- 경로: `/yolo`
- 기능: 드래그 앤 드롭으로 이미지 업로드
- API: FastAPI `/api/upload`

### 포트폴리오 페이지
- 경로: `/portfolio`
- 기능: 업로드된 파일 목록 및 관리
- API: FastAPI `/api/files`, `/api/files/{filename}`

## API 엔드포인트

### FastAPI (localhost:8000)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/upload` | 파일 업로드 |
| GET | `/api/files` | 파일 목록 조회 |
| GET | `/api/files/{filename}` | 파일 다운로드 |
| DELETE | `/api/files/{filename}` | 파일 삭제 |
| GET | `/health` | 헬스 체크 |

## 디버깅

### FastAPI 로그 확인

FastAPI 서버 실행 시 콘솔에 모든 요청이 로그로 출력됩니다.

### Next.js 개발자 도구

브라우저 개발자 도구 → Network 탭에서 FastAPI 요청 확인 가능

### CORS 오류 시

`cv.aiion.site/main.py`에서 CORS 설정 확인:

```python
allow_origins=[
    "http://localhost:5000",  # Next.js 포트
]
```

## 배포 시 고려사항

### 프로덕션 환경

1. **환경변수 변경**
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
   ```

2. **CORS 설정 업데이트**
   ```python
   allow_origins=[
       "https://yourdomain.com",
   ]
   ```

3. **파일 저장소**
   - 로컬 파일 시스템 대신 S3, GCS 등 클라우드 스토리지 사용 권장

4. **보안**
   - 파일 업로드 크기 제한
   - 파일 확장자 검증
   - 바이러스 스캔
   - 인증/인가 추가

## 트러블슈팅

### FastAPI 연결 실패

- FastAPI가 실행 중인지 확인: `curl http://localhost:8000/health`
- 포트 충돌 확인: `lsof -i :8000`

### 파일 업로드 실패

- 파일 크기 확인 (최대 10MB)
- 지원 확장자 확인 (jpg, png, gif 등)
- FastAPI 로그 확인

### 이미지 미리보기 안 됨

- FastAPI 서버가 실행 중인지 확인
- 이미지 URL 확인: `http://localhost:8000/api/files/{filename}`

