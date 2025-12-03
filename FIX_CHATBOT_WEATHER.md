# 챗봇 및 날씨 응답 표시 문제 해결

## 🔍 문제 진단

### 증상
- 챗봇 응답이 빈 버블로 표시됨
- 날씨 정보는 정상 표시됨

### 원인 분석
1. **백엔드 응답 형식 불일치**
   - `ChatResponse` 모델에 `status` 필드가 없었음
   - 프론트엔드에서 `chatResponse.data.status === 'error'` 체크 시 undefined 처리 문제

2. **프론트엔드 응답 파싱 문제**
   - 응답 데이터가 없을 때 빈 문자열로 처리
   - 에러 처리 로직이 불완전

3. **UTF-8 인코딩 문제**
   - PowerShell에서 한글이 깨져 보임 (브라우저에서는 정상)

## ✅ 해결 방법

### 1. 백엔드 수정 (`ai.aiion.site/rag/chatbot_service/app/main.py`)

#### 변경 사항:
```python
# 응답 모델에 status 필드 추가
class ChatResponse(BaseModel):
    message: str
    model: str
    status: str = "success"  # ✅ 추가
    classification: Optional[Dict[str, Any]] = None

# GET /chatbot/chat 엔드포인트
@chatbot_router.get("/chat")
def chat():
    # ...
    chat_response = ChatResponse(
        message=response.choices[0].message.content or "",
        model=response.model,
        status="success"  # ✅ 추가
    )
    return JSONResponse(
        content=chat_response.model_dump(),
        media_type="application/json; charset=utf-8"  # ✅ UTF-8 명시
    )

# POST /chatbot/chat 엔드포인트
@chatbot_router.post("/chat", response_model=ChatResponse)
def chat_post(request: ChatRequest, http_request: Request = None):
    # ...
    chat_response = ChatResponse(
        message=response.choices[0].message.content or "",
        model=response.model,
        status="success"  # ✅ 추가
    )
    if classification:
        chat_response.classification = classification
    
    return JSONResponse(
        content=chat_response.model_dump(),
        media_type="application/json; charset=utf-8"  # ✅ UTF-8 명시
    )
```

### 2. 프론트엔드 수정 (`www.aiion.site/src/app/hooks/useHomePage.ts`)

#### 변경 사항:
```typescript
// 기존 코드 (문제 있음)
if (chatResponse.error || !chatResponse.data) {
  aiResponse = chatResponse.error || 'AI 응답을 받을 수 없습니다.';
} else if (chatResponse.data.status === 'error') {
  aiResponse = chatResponse.data.message || 'AI 처리 중 오류가 발생했습니다.';
} else {
  aiResponse = chatResponse.data.message || '응답을 생성할 수 없습니다.';
}

// 수정된 코드 (개선됨)
console.log('[useHomePage] 💬 챗봇 응답 받음:', {
  error: chatResponse.error,
  hasData: !!chatResponse.data,
  data: chatResponse.data,
  message: chatResponse.data?.message,
  status: chatResponse.status
});

if (chatResponse.error) {
  aiResponse = chatResponse.error || 'AI 응답을 받을 수 없습니다.';
  console.error('[useHomePage] ❌ 챗봇 응답 에러:', chatResponse.error);
} else if (!chatResponse.data) {
  aiResponse = 'AI 응답 데이터가 없습니다.';
  console.error('[useHomePage] ❌ 챗봇 응답 데이터 없음');
} else if (chatResponse.data.message) {
  aiResponse = chatResponse.data.message;
  console.log('[useHomePage] ✅ 챗봇 응답 메시지:', aiResponse.substring(0, 100));
} else {
  aiResponse = '응답을 생성할 수 없습니다.';
  console.error('[useHomePage] ❌ 챗봇 응답 메시지 없음:', chatResponse.data);
}
```

### 3. 프론트엔드 타입 정의 수정 (`www.aiion.site/src/lib/api/aiGateway.ts`)

#### 변경 사항:
```typescript
export interface ChatResponse {
  message: string;
  model: string;
  status?: 'success' | 'error'; // ✅ 선택사항으로 변경 (백엔드 호환성)
  classification?: Classification | null;
}
```

## 🚀 배포 및 테스트

### 1. 백엔드 재빌드 및 재시작
```bash
# 이미지 재빌드
docker-compose build --no-cache aihoyun-chatbot-service

# 컨테이너 재시작
docker-compose up -d aihoyun-chatbot-service

# 로그 확인
docker-compose logs -f aihoyun-chatbot-service
```

### 2. 프론트엔드 실행
```bash
cd www.aiion.site
pnpm dev
```

### 3. 브라우저에서 테스트
1. http://localhost:3000 접속
2. 개발자 도구(F12) 열기
3. Console 탭에서 로그 확인
4. 챗봇에 메시지 전송:
   - "안녕"
   - "오늘 날씨"
   - "일기 검색"

### 4. 확인 사항

#### Console 로그 확인:
```
[useHomePage] 💬 챗봇 응답 받음: {
  error: undefined,
  hasData: true,
  data: { message: "...", model: "...", status: "success" },
  message: "...",
  status: 200
}
[useHomePage] ✅ 챗봇 응답 메시지: 안녕하세요! 무엇을 도와드릴까요?...
```

#### Network 탭 확인:
- **요청**: `POST http://localhost:8080/chatbot/chat`
- **응답 상태**: `200 OK`
- **응답 본문**:
```json
{
  "message": "안녕하세요! 무엇을 도와드릴까요? 😊",
  "model": "gpt-4-turbo-2024-04-09",
  "status": "success",
  "classification": null
}
```

## 🐛 추가 디버깅

### 문제가 계속 발생하는 경우

#### 1. 백엔드 로그 확인
```bash
docker-compose logs -f aihoyun-chatbot-service
```

**정상 로그 예시:**
```
[챗봇] GPT 응답 생성 완료 (소요 시간: 2.34초)
INFO:     172.18.0.10:52630 - "POST /chatbot/chat HTTP/1.1" 200 OK
```

#### 2. API Gateway 로그 확인
```bash
docker-compose logs -f api-gateway
```

#### 3. 프론트엔드 Console 확인
- Network 탭에서 API 호출 확인
- 응답 상태 코드 확인 (200 OK 여부)
- 응답 본문 확인 (message 필드 존재 여부)

#### 4. 환경 변수 확인
```bash
# .env 파일 확인
cat .env | grep OPENAI_API_KEY

# 컨테이너 환경 변수 확인
docker-compose exec aihoyun-chatbot-service env | grep OPENAI
```

## 📝 주요 변경 파일

1. **백엔드**:
   - `ai.aiion.site/rag/chatbot_service/app/main.py`
     - `ChatResponse` 모델에 `status` 필드 추가
     - `JSONResponse`에 UTF-8 인코딩 명시

2. **프론트엔드**:
   - `www.aiion.site/src/app/hooks/useHomePage.ts`
     - 응답 파싱 로직 개선
     - 상세한 로깅 추가
   - `www.aiion.site/src/lib/api/aiGateway.ts`
     - `ChatResponse` 인터페이스에 `status` 필드 추가 (선택사항)

## ✅ 예상 결과

### 정상 작동 시:
1. ✅ 챗봇 응답이 한글로 정상 표시됨
2. ✅ 날씨 정보가 정상 표시됨
3. ✅ Console에 상세한 로그 출력됨
4. ✅ Network 탭에서 응답 데이터 확인 가능

### 여전히 문제가 있는 경우:
1. 브라우저 Console에서 에러 메시지 확인
2. Network 탭에서 API 응답 확인
3. 백엔드 로그에서 에러 확인
4. 환경 변수(OPENAI_API_KEY) 확인

---

**작성일**: 2024-12-03  
**버전**: 1.0  
**문서 위치**: `develop/FIX_CHATBOT_WEATHER.md`

