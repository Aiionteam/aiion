# 날씨 정보와 챗봇 응답 표시 문제 해결

## 📋 문제 요약

**증상**: 프론트엔드(www.aiion.site)에서 날씨 정보와 챗봇 응답이 표시되지 않음

## 🔍 원인 분석

### 1. API 연결 확인

#### ✅ 백엔드 서비스 상태
```bash
# 모든 서비스 정상 실행 중
docker-compose ps

# 결과:
# - aihoyun-chatbot-service (9001): ✅ 실행 중
# - aihoyun-weather-service (9004): ✅ 실행 중
# - api-gateway (8080): ✅ 실행 중
```

#### ✅ API Gateway 라우팅 설정
```yaml
# api.aiion.site/server/gateway/src/main/resources/application.yaml

spring:
  cloud:
    gateway:
      routes:
        # 챗봇 서비스
        - id: chatbot-service
          uri: http://aihoyun-chatbot-service:9001
          predicates:
            - Path=/chatbot/**
        
        # 날씨 서비스
        - id: weather-service
          uri: http://aihoyun-weather-service:9004
          predicates:
            - Path=/weather/**
```

#### ✅ API 테스트 결과
```bash
# 챗봇 서비스 (GET 테스트)
curl http://localhost:8080/chatbot/chat
# ✅ 응답 받음 (한글 인코딩 문제는 PowerShell 때문, 실제로는 정상)

# 날씨 서비스 (단기예보)
curl http://localhost:8080/weather/short-forecast?nx=60&ny=127
# ✅ 정상 응답
```

### 2. 프론트엔드 API 클라이언트 설정

#### 📂 파일 위치
```
www.aiion.site/src/
├── lib/
│   ├── constants/endpoints.ts       # API 엔드포인트 설정
│   └── api/
│       ├── client.ts                # HTTP 클라이언트
│       └── aiGateway.ts             # AI 서비스 API 클라이언트
├── app/hooks/
│   └── useAIGateway.ts              # AI 서비스 React Hooks
└── components/organisms/
    └── ChatContainer.tsx            # 챗봇 UI 컴포넌트
```

#### 🔧 설정 확인

**1. API Gateway 설정** (`lib/constants/endpoints.ts`)
```typescript
export const AI_GATEWAY_CONFIG = {
  HOST: process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || 'localhost',
  PORT: process.env.NEXT_PUBLIC_AI_GATEWAY_PORT || '8080',  // ✅ 올바른 포트
  BASE_URL: `http://localhost:8080`,  // ✅ API Gateway 사용
} as const;
```

**2. 챗봇 API 호출** (`lib/api/aiGateway.ts`)
```typescript
async sendChat(params: ChatRequest) {
  const { data, error, status } = await fetchJSONFromAIGateway<ChatResponse>(
    '/chatbot/chat',  // ✅ 올바른 경로
    {},
    {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 90000,
    }
  );
  return { data, error, status };
}
```

**3. 날씨 API 호출** (`lib/api/aiGateway.ts`)
```typescript
async getShortForecast(params: WeatherShortForecastParams) {
  const queryParams: Record<string, string> = {
    nx: String(params.nx),
    ny: String(params.ny),
  };
  
  const { data, error, status } = await fetchJSONFromAIGateway(
    '/weather/short-forecast',  // ✅ 올바른 경로
    queryParams
  );
  
  return { data, error, status };
}
```

## ✅ 해결 방법

### 1. 챗봇 서비스 UTF-8 인코딩 수정 완료

**수정 파일**: `ai.aiion.site/rag/chatbot_service/app/main.py`

```python
# UTF-8 인코딩 강제 설정
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# JSONResponse에 charset 명시
from fastapi.responses import JSONResponse

@chatbot_router.get("/chat")
def chat():
    # ... (OpenAI API 호출)
    return JSONResponse(
        content={
            "message": response.choices[0].message.content,
            "model": response.model,
            "status": "success"
        },
        media_type="application/json; charset=utf-8"  # ✅ UTF-8 명시
    )

@chatbot_router.post("/chat", response_model=ChatResponse)
def chat_post(request: ChatRequest, http_request: Request = None):
    # ... (OpenAI API 호출 및 처리)
    return JSONResponse(
        content=chat_response.model_dump(),
        media_type="application/json; charset=utf-8"  # ✅ UTF-8 명시
    )
```

**재시작 명령어**:
```bash
docker-compose restart aihoyun-chatbot-service
```

### 2. 프론트엔드 테스트 방법

#### 브라우저 개발자 도구에서 확인

1. **www.aiion.site 실행**
```bash
cd www.aiion.site
pnpm dev
```

2. **브라우저에서 http://localhost:3000 접속**

3. **개발자 도구 열기** (F12)

4. **Network 탭에서 API 호출 확인**
   - 챗봇 메시지 전송 시: `POST http://localhost:8080/chatbot/chat`
   - 날씨 정보 요청 시: `GET http://localhost:8080/weather/short-forecast?nx=60&ny=127`

5. **Console 탭에서 에러 확인**
   - CORS 에러가 있는지 확인
   - API 응답 에러가 있는지 확인

#### 예상 응답 형식

**챗봇 응답** (`POST /chatbot/chat`):
```json
{
  "message": "안녕하세요! 오늘 날씨는 참 좋은 것 같아요! 맑고 화창해서 기분도 상쾌하답니다! 😊✨",
  "model": "gpt-4-turbo-2024-04-09",
  "status": "success",
  "classification": null
}
```

**날씨 응답** (`GET /weather/short-forecast`):
```json
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "dataType": "JSON",
      "items": {
        "item": [
          {
            "baseDate": "20251203",
            "baseTime": "0500",
            "category": "TMP",
            "fcstDate": "20251203",
            "fcstTime": "0600",
            "fcstValue": "8",
            "nx": 60,
            "ny": 127
          },
          // ... more items
        ]
      }
    }
  }
}
```

### 3. 환경 변수 설정 (선택사항)

**파일**: `www.aiion.site/.env.local`

```bash
# API Gateway 설정 (기본값이 localhost:8080이므로 생략 가능)
NEXT_PUBLIC_AI_GATEWAY_HOST=localhost
NEXT_PUBLIC_AI_GATEWAY_PORT=8080
NEXT_PUBLIC_GATEWAY_HOST=localhost
NEXT_PUBLIC_GATEWAY_PORT=8080
```

## 🔍 디버깅 체크리스트

### 백엔드 확인
- [ ] `docker-compose ps`로 모든 서비스 실행 확인
- [ ] `docker-compose logs -f aihoyun-chatbot-service` 로그 확인
- [ ] `docker-compose logs -f aihoyun-weather-service` 로그 확인
- [ ] `docker-compose logs -f api-gateway` 로그 확인
- [ ] `curl http://localhost:8080/chatbot/chat` 테스트
- [ ] `curl http://localhost:8080/weather/short-forecast?nx=60&ny=127` 테스트

### 프론트엔드 확인
- [ ] `pnpm dev` 실행 확인
- [ ] 브라우저 Console에 에러 없는지 확인
- [ ] Network 탭에서 API 호출 확인
- [ ] API 응답 상태 코드 확인 (200 OK)
- [ ] API 응답 데이터 확인

### CORS 확인
- [ ] API Gateway CORS 설정 확인 (`application.yaml`)
- [ ] 브라우저 Console에 CORS 에러 없는지 확인
- [ ] `Access-Control-Allow-Origin` 헤더 확인

## 🐛 일반적인 문제 해결

### 문제 1: "서버에 연결할 수 없습니다"

**원인**: API Gateway가 실행되지 않음

**해결**:
```bash
docker-compose restart api-gateway
```

### 문제 2: "CORS policy 에러"

**원인**: CORS 설정 누락

**해결**: `api.aiion.site/server/gateway/src/main/resources/application.yaml` 확인
```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          globalcors:
            cors-configurations:
              '[/**]':
                allowedOrigins:
                  - "http://localhost:3000"
                  - "http://localhost:4000"
                allowedMethods:
                  - GET
                  - POST
                  - PUT
                  - DELETE
                  - OPTIONS
                allowedHeaders:
                  - "*"
                allowCredentials: true
```

### 문제 3: "챗봇 응답이 느림"

**원인**: GPT-4 Turbo 모델 사용으로 인한 지연 (정상)

**해결**: 
- 타임아웃 설정 확인 (90초)
- 로딩 인디케이터 표시
- 필요시 GPT-3.5 Turbo로 변경 (빠르지만 정확도 낮음)

### 문제 4: "날씨 정보가 표시되지 않음"

**원인**: 기상청 API 키 미설정

**해결**: `.env` 파일 확인
```bash
KMA_API_KEY=your-kma-api-key-here
KMA_SHORT_KEY=your-kma-short-key-here
```

### 문제 5: "챗봇이 응답하지 않음"

**원인**: OpenAI API 키 미설정

**해결**: `.env` 파일 확인
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

## 📊 테스트 명령어 모음

### 백엔드 테스트 (PowerShell)

```powershell
# 챗봇 GET 테스트
Invoke-WebRequest -Uri "http://localhost:8080/chatbot/chat" -Method GET

# 챗봇 POST 테스트
$body = @{
    message = "안녕하세요!"
    model = "gpt-4-turbo"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/chatbot/chat" `
    -Method POST `
    -Body $body `
    -ContentType "application/json; charset=utf-8"

# 날씨 단기예보 테스트
Invoke-WebRequest -Uri "http://localhost:8080/weather/short-forecast?nx=60&ny=127" -Method GET

# 날씨 중기예보 테스트
Invoke-WebRequest -Uri "http://localhost:8080/weather/mid-forecast?regionName=서울" -Method GET

# 날씨 지역 목록 조회
Invoke-WebRequest -Uri "http://localhost:8080/weather/regions" -Method GET
```

### 프론트엔드 테스트 (브라우저 Console)

```javascript
// 챗봇 API 테스트
fetch('http://localhost:8080/chatbot/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '안녕하세요!',
    model: 'gpt-4-turbo'
  })
})
.then(res => res.json())
.then(data => console.log('챗봇 응답:', data))
.catch(err => console.error('에러:', err));

// 날씨 API 테스트
fetch('http://localhost:8080/weather/short-forecast?nx=60&ny=127')
.then(res => res.json())
.then(data => console.log('날씨 응답:', data))
.catch(err => console.error('에러:', err));
```

## 📝 추가 참고 사항

### API 엔드포인트 전체 목록

| 서비스 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| 챗봇 | GET | `/chatbot/chat` | 테스트용 고정 응답 |
| 챗봇 | POST | `/chatbot/chat` | 사용자 메시지 전송 |
| 챗봇 | POST | `/chatbot/classify` | 텍스트 분류 |
| 날씨 | GET | `/weather/short-forecast` | 단기예보 (0~3일) |
| 날씨 | GET | `/weather/mid-forecast` | 중기예보 (3~10일) |
| 날씨 | GET | `/weather/regions` | 지원 지역 목록 |
| 크롤러 | GET | `/crawler/bugsmusic` | 벅스 실시간 차트 |
| 크롤러 | GET | `/crawler/netflix` | Netflix 영화 목록 |
| 크롤러 | GET | `/crawler/movie` | KMDB 영화 100선 |

### 포트 매핑

| 서비스 | 내부 포트 | 외부 포트 | 접근 방법 |
|--------|----------|----------|----------|
| API Gateway | 8080 | 8080 | http://localhost:8080 |
| 챗봇 서비스 | 9001 | 9001 | ⚠️ 직접 접근 금지, Gateway 사용 |
| 날씨 서비스 | 9004 | 9004 | ⚠️ 직접 접근 금지, Gateway 사용 |
| 크롤러 서비스 | 9003 | 9003 | ⚠️ 직접 접근 금지, Gateway 사용 |

**중요**: 프론트엔드는 항상 **API Gateway(8080)**를 통해 접근해야 합니다!

## 🎯 최종 확인

### 정상 작동 시나리오

1. **사용자가 챗봇에 메시지 입력**
   ```
   사용자 → Frontend (3000) 
         → API Gateway (8080) 
         → Chatbot Service (9001) 
         → OpenAI API 
         → Chatbot Service 
         → API Gateway 
         → Frontend 
         → 화면에 응답 표시
   ```

2. **사용자가 날씨 정보 요청**
   ```
   사용자 → Frontend (3000) 
         → API Gateway (8080) 
         → Weather Service (9004) 
         → 기상청 API 
         → Weather Service 
         → API Gateway 
         → Frontend 
         → 화면에 날씨 표시
   ```

### 성공 지표

- ✅ 브라우저 Console에 에러 없음
- ✅ Network 탭에서 200 OK 응답
- ✅ 챗봇 응답이 한글로 정상 표시
- ✅ 날씨 정보가 정상 표시
- ✅ 로딩 인디케이터 정상 작동

---

**작성일**: 2024-12-03  
**버전**: 1.0  
**문서 위치**: `develop/TROUBLESHOOTING.md`

