# Pathfinder 프론트엔드 연동 가이드

## 전체 흐름

### 1. 앱 시작 → HomePage 렌더링

```
HomePage.tsx
  ↓
MainLayout (사이드바 + 컨텐츠 영역)
  ↓
현재 카테고리 선택에 따라 컴포넌트 렌더링
  - 'path' 선택 시 → PathfinderView 컴포넌트 표시
```

### 2. PathfinderView 컴포넌트 동작

#### 초기화

```typescript
// 1. 사용자 정보 가져오기 (Zustand Store)
const user = useStore((state) => state.user?.user);

// 2. 상태 관리
- recommendationData: API에서 받은 데이터
- isLoading: 로딩 상태
- error: 에러 메시지
- selectedRecommendation: 선택된 학습 추천 (모달용)
```

#### 데이터 로드 (useEffect)

```typescript
// pathfinderView가 'home' 또는 'recommendations'일 때
useEffect(() => {
  if (user?.id) {
    // API 호출
    fetchRecommendations(user.id)
      → fetchJSONFromGateway('/pathfinder/pathfinders/recommendations/{userId}')
      → Gateway (localhost:8080)
      → pathfinder-service (8090)
      → PathfinderAnalysisService.analyzeDiariesAndExtractLearningTopics()
      → 일기 데이터 분석
      → 학습 추천 생성
      → JSON 응답 반환
  }
}, [user?.id, pathfinderView]);
```

### 3. API 호출 흐름

```
PathfinderView 컴포넌트
  ↓
usePathfinderApi.ts
  ↓ fetchRecommendations(userId)
  ↓
lib/api/client.ts
  ↓ fetchJSONFromGateway()
  ↓
HTTP GET http://localhost:8080/pathfinder/pathfinders/recommendations/1
  ↓
Gateway (Spring Cloud Gateway)
  ↓ 라우팅: /pathfinder/** → pathfinder-service:8090
  ↓
PathfinderController.getRecommendations()
  ↓
PathfinderAnalysisService.generateComprehensiveRecommendations()
  ↓
일기 데이터 분석 (키워드 추출, 빈도수 계산)
  ↓
학습 추천 생성 (영상 정보, 카테고리, 통계 포함)
  ↓
JSON 응답 반환
  ↓
프론트엔드에서 파싱 및 상태 업데이트
  ↓
UI 렌더링
```

### 4. 화면 렌더링

#### Home 뷰
- `isLoading`이 true → "로딩 중..." 표시
- `recommendationData`가 있으면 → 통계, 최근 활동 표시
- `error`가 있으면 → 에러 메시지 표시

#### Recommendations 뷰
- 학습 기회 카드 목록 (API 데이터)
- 인기 학습 주제 태그 (API 데이터)
- 카테고리별 탐색 그리드 (API 데이터)
- 카드 클릭 → 모달 표시 (추천 이유, 영상 목록)

### 5. 데이터 흐름 다이어그램

```
[사용자 로그인]
    ↓
[Zustand Store에 user 정보 저장]
    ↓
[PathfinderView 마운트]
    ↓
[useEffect 실행]
    ↓
[user.id 확인]
    ↓
[fetchRecommendations(user.id) 호출]
    ↓
[fetchJSONFromGateway()]
    ↓
[HTTP 요청: GET /pathfinder/pathfinders/recommendations/1]
    ↓
[Gateway → pathfinder-service]
    ↓
[일기 데이터 분석]
    ↓
[JSON 응답]
    ↓
[setRecommendationData(data)]
    ↓
[UI 업데이트 (리렌더링)]
    ↓
[사용자에게 학습 추천 표시]
```

### 6. 주요 파일 역할

- **PathfinderView.tsx**: UI 컴포넌트, 상태 관리, 렌더링
- **usePathfinderApi.ts**: API 호출 함수
- **lib/api/client.ts**: HTTP 통신 유틸리티
- **store/**: Zustand 상태 관리 (사용자 정보)

### 7. 실제 동작 예시

1. 사용자가 "Path Finder" 메뉴 클릭
2. `pathfinderView = 'home'` 설정
3. `useEffect` 실행 → API 호출
4. 로딩 중 → "로딩 중..." 표시
5. API 응답 수신 → `recommendationData` 업데이트
6. UI 리렌더링 → 통계, 최근 활동 표시
7. "학습 추천" 버튼 클릭 → `pathfinderView = 'recommendations'`
8. 학습 기회 카드 목록 표시 (API 데이터)
9. 카드 클릭 → 모달 표시 (상세 정보)

## API 엔드포인트

### 학습 추천 조회 (종합)

```
GET /pathfinder/pathfinders/recommendations/{userId}
```

**응답 형식:**
```json
{
  "Code": 200,
  "message": "학습 추천 조회 성공: 5개",
  "data": {
    "recommendations": [
      {
        "id": "123456",
        "title": "응급처치 기초",
        "emoji": "🩹",
        "category": "의료",
        "frequency": 15,
        "reason": "일기에서 응급처치 기초 관련 내용이 15회 발견되었습니다...",
        "relatedDiary": "...병마사의 군관 이경신이...",
        "quickLearn": "응급상황에서 기본적인 처치 방법을 배웁니다...",
        "videos": [
          {
            "id": "v1",
            "title": "응급처치 기초 강의",
            "duration": "15분",
            "thumbnail": "https://via.placeholder.com/300x200"
          }
        ]
      }
    ],
    "popularTopics": ["응급처치 기초", "군사 전략 및 무기", ...],
    "categories": [
      {
        "id": "의료",
        "name": "의료",
        "emoji": "🩹",
        "count": 8
      }
    ],
    "stats": {
      "discovered": 5,
      "inProgress": 0,
      "completed": 0
    }
  }
}
```

### 간단 학습 추천 조회

```
GET /pathfinder/pathfinders/recommendations/{userId}/simple
```

**응답 형식:**
```json
{
  "Code": 200,
  "message": "학습 추천 조회 성공: 5개",
  "data": [
    {
      "id": "123456",
      "title": "응급처치 기초",
      "emoji": "🩹",
      "category": "의료",
      "frequency": 15,
      "reason": "...",
      "relatedDiary": "...",
      "quickLearn": "...",
      "videos": [...]
    }
  ]
}
```

## 프론트엔드 파일 구조

```
frontend/src/
├── app/
│   └── hooks/
│       └── usePathfinderApi.ts      # API 호출 함수
├── components/
│   └── organisms/
│       └── PathfinderView.tsx       # 메인 컴포넌트
├── lib/
│   └── api/
│       └── client.ts                # HTTP 통신 유틸리티
└── store/                           # Zustand 상태 관리
```

## 백엔드 파일 구조

```
service/pathfinder-service/
├── src/main/java/site/aiion/api/pathfinder/
│   ├── PathfinderController.java           # REST API 컨트롤러
│   ├── PathfinderAnalysisService.java      # 일기 분석 및 추천 생성
│   ├── PathfinderService.java              # 기본 CRUD 서비스
│   ├── PathfinderServiceImpl.java          # 서비스 구현
│   ├── PathfinderRepository.java           # 데이터베이스 접근
│   └── Pathfinder.java                     # 엔티티
└── FRONTEND_INTEGRATION.md                 # 이 문서
```

## 주요 기능

### 1. 일기 데이터 분석
- 사용자의 일기 데이터를 DB에서 조회
- 키워드 매핑을 통한 학습 주제 추출
- 빈도수 계산으로 우선순위 결정

### 2. 학습 추천 생성
- 일기에서 발견한 학습 기회 목록
- 인기 학습 주제 (빈도수 기준)
- 카테고리별 그룹화
- 통계 정보 (발견한 학습, 진행중, 완료)

### 3. 프론트엔드 연동
- 자동 데이터 로드 (useEffect)
- 로딩 상태 관리
- 에러 처리
- 실시간 UI 업데이트

## 테스트 방법

### API 직접 테스트

```powershell
# PowerShell에서
Invoke-RestMethod http://localhost:8080/pathfinder/pathfinders/recommendations/1
```

### 브라우저에서 테스트

1. 프론트엔드 실행: `http://localhost:3000`
2. 로그인 후 "Path Finder" 메뉴 클릭
3. "학습 추천" 버튼 클릭
4. 학습 기회 카드 확인
5. 카드 클릭하여 모달 확인

## 문제 해결

### 데이터가 표시되지 않는 경우

1. **사용자 ID 확인**
   - 브라우저 콘솔에서 `user?.id` 확인
   - 로그인 상태 확인

2. **API 응답 확인**
   - 브라우저 개발자 도구 → Network 탭
   - `/pathfinder/pathfinders/recommendations/{userId}` 요청 확인
   - 응답 상태 코드 및 데이터 확인

3. **일기 데이터 확인**
   - DB에 일기 데이터가 있는지 확인
   - `pathfinders` 테이블에 `user_id = 1`인 데이터 확인

4. **Gateway 라우팅 확인**
   - `server/gateway/src/main/resources/application.yaml`에서 pathfinder-service 라우팅 확인

### 로딩이 계속되는 경우

- 네트워크 연결 확인
- 백엔드 서비스 실행 상태 확인
- 브라우저 콘솔 에러 확인

