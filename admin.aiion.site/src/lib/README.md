# lib 폴더 구조

공통 유틸리티, API 클라이언트, 상수 등을 관리하는 폴더입니다.

## 📁 디렉토리 구조

```
lib/
├── api/
│   └── client.ts          # 공통 API 클라이언트 (fetchWithRetry, fetchFromGateway)
├── utils/
│   ├── dateUtils.ts       # 날짜 유틸리티 함수
│   └── parser.ts          # 파싱 유틸리티 함수
├── constants/
│   └── endpoints.ts       # API 엔드포인트 상수
├── index.ts               # 통합 export
└── README.md              # 이 파일
```

## 📝 사용 예시

### API 클라이언트 사용

```typescript
import { fetchWithRetry, fetchFromGateway } from '@/lib';

// 재시도 로직이 포함된 fetch
const response = await fetchWithRetry(url, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  retries: 3, // 커스텀 재시도 횟수
});

// Gateway를 통한 API 호출
const response = await fetchFromGateway('/api/agent1', {
  keyword: '검색어',
});
```

### 날짜 유틸리티 사용

```typescript
import { getLocalDateStr, getDayOfWeek } from '@/lib';

const today = new Date();
const dateStr = getLocalDateStr(today); // "2025-11-18"
const dayName = getDayOfWeek(today, 'short'); // "월"
```

### 파서 사용

```typescript
import { extractCategories } from '@/lib';

// 카테고리 추출
const categories = extractCategories('오늘 일기 썼어');
// ['일기']
```

### 엔드포인트 상수 사용

```typescript
import { AGENT_ENDPOINTS, GATEWAY_CONFIG } from '@/lib';

const url = `${GATEWAY_CONFIG.BASE_URL}${AGENT_ENDPOINTS.agent1}`;
```

## 🔧 확장 가이드

### 새로운 유틸리티 추가

1. `lib/utils/` 디렉토리에 새 파일 생성
2. 함수 export
3. `lib/index.ts`에 export 추가

### 새로운 API 클라이언트 추가

1. `lib/api/` 디렉토리에 새 파일 생성
2. `lib/index.ts`에 export 추가

### 새로운 상수 추가

1. `lib/constants/` 디렉토리에 새 파일 생성
2. `lib/index.ts`에 export 추가

## ⚠️ 주의사항

1. **순환 참조 방지**: lib 내부 모듈 간 순환 참조 지양
2. **타입 안정성**: 모든 함수와 상수에 타입 정의
3. **재사용성**: 여러 곳에서 사용 가능하도록 범용적으로 작성
4. **테스트 용이성**: 각 함수를 독립적으로 테스트 가능하도록 구성

