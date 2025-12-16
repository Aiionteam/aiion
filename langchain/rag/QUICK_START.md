# RAG 시스템 빠른 시작 가이드

## 현재 상황
- ✅ PostgreSQL 컨테이너: 실행 중 (깨끗한 상태)
- ✅ LangChain 컨테이너: 실행 중
- ❌ API 서버: 중지됨 (재시작 필요)
- ❌ 문서: 초기화 필요

## 해결 방법

### 1단계: API 서버 시작 (터미널 13)

**현재 터미널 13에서 Ctrl+C로 기존 프로세스 중지 후:**

```bash
cd C:\Users\jhh72\OneDrive\문서\develop\aiion_project\aiion\langchain\rag
conda activate torch313
python api_server.py
```

**예상 출력:**
```
Initializing vector store...
Using OpenAI embeddings (text-embedding-3-small)
✓ Vector store initialized!
Initializing LLM...
Using OpenAI LLM (gpt-3.5-turbo)
✓ OpenAI LLM initialized!
✓ RAG chain initialized!
API server is ready!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2단계: 문서 초기화 (새 터미널)

**API 서버가 실행된 후 새 터미널에서:**

```bash
cd C:\Users\jhh72\OneDrive\문서\develop\aiion_project\aiion\langchain\rag
python init_documents.py
```

**예상 출력:**
```
[INIT] Initializing documents...
[OK] Successfully added 5 documents!
```

### 3단계: 프론트엔드에서 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 추천 프롬프트 클릭 또는 직접 질문 입력:
   - "LangChain이 뭐야?"
   - "RAG가 무엇인가요?"
   - "pgvector의 역할은?"
3. 응답 확인

## 문제 해결

### 오류: "connection abort" 또는 "could not receive data"
- **원인:** API 서버와 PostgreSQL 연결 끊김
- **해결:** API 서버 재시작 (1단계)

### 오류: "different vector dimensions"
- **원인:** 기존 데이터와 새 임베딩 차원 불일치
- **해결:** 이미 해결됨 (Docker 볼륨 초기화 완료)

### 오류: "Failed to establish a new connection"
- **원인:** API 서버가 실행되지 않음
- **해결:** 1단계 실행

## 현재 설정

- **임베딩:** OpenAI `text-embedding-3-small` (1536차원)
- **LLM:** OpenAI `gpt-3.5-turbo`
- **데이터베이스:** PostgreSQL with pgvector
- **포트:**
  - API 서버: 8000
  - 프론트엔드: 3000
  - PostgreSQL: 5432

## 추천 프롬프트

1. "LangChain이 뭐야?"
2. "RAG가 무엇인가요?"
3. "pgvector의 역할은?"
4. "OpenAI GPT 모델 설명"
5. "벡터 데이터베이스란?"

