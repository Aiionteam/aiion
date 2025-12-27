# YOLO Face Detection API

FastAPI 기반의 얼굴 디텍션 백엔드 서버입니다.

## 기능

- 이미지 파일 업로드 (`POST /api/upload`)
- 업로드된 파일 목록 조회 (`GET /api/files`)
- 파일 다운로드 (`GET /api/files/{filename}`)
- 파일 삭제 (`DELETE /api/files/{filename}`)
- YOLO를 사용한 얼굴 자동 디텍션 (파일 감시)

## 설치

### 1. 가상환경 생성 및 활성화

```bash
# conda 환경 생성
conda create -n py312 python=3.12
conda activate py312
```

### 2. 의존성 설치

```bash
cd cv.aiion.site
pip install -r requirements.txt
```

## 실행

### 1. FastAPI 서버 실행

```bash
cd cv.aiion.site
python main.py
```

또는

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

서버가 실행되면 `http://localhost:8000`에서 접근 가능합니다.

### 2. 파일 감시 모드 실행 (선택사항)

업로드된 이미지를 자동으로 얼굴 디텍팅하려면 별도 터미널에서 실행:

```bash
cd cv.aiion.site
python app/yolo/main.py watch
```

## API 엔드포인트

### 업로드
```
POST http://localhost:8000/api/upload
Content-Type: multipart/form-data

files: [이미지 파일들]
```

### 파일 목록 조회
```
GET http://localhost:8000/api/files
```

### 파일 다운로드
```
GET http://localhost:8000/api/files/{filename}
```

### 파일 삭제
```
DELETE http://localhost:8000/api/files/{filename}
```

### 헬스 체크
```
GET http://localhost:8000/health
```

## 디렉토리 구조

```
cv.aiion.site/
├── main.py                 # FastAPI 서버
├── requirements.txt        # Python 의존성
└── app/
    └── yolo/
        ├── data/          # 업로드된 파일 저장 위치
        ├── save/          # 처리 결과 저장 (선택)
        ├── main.py        # 파일 감시 스크립트
        └── yolo_detection.py  # 얼굴 디텍션 로직
```

## 설정

### CORS

`main.py`에서 CORS 설정:

```python
allow_origins=[
    "http://localhost:5000",  # Next.js 개발 서버
    "http://localhost:3000",
]
```

### 파일 제한

- 허용 확장자: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- 최대 파일 크기: 10MB

## 개발 팁

### API 문서 확인

FastAPI 서버 실행 후:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 디버그 모드

```bash
uvicorn main:app --reload --log-level debug
```

## Next.js 연동

Next.js에서 이 API를 사용하려면:

1. `.env.local` 파일에 환경변수 추가:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

2. 업로드 코드:
```typescript
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const formData = new FormData();
formData.append("files", file);

const response = await fetch(`${apiBaseUrl}/api/upload`, {
  method: "POST",
  body: formData,
});
```

## 트러블슈팅

### CORS 오류
- `main.py`에서 Next.js 포트가 `allow_origins`에 포함되어 있는지 확인

### 파일 저장 실패
- `app/yolo/data/` 디렉토리 쓰기 권한 확인

### 모듈 import 오류
- `cv.aiion.site` 디렉토리에서 실행하는지 확인
- 가상환경이 활성화되어 있는지 확인

