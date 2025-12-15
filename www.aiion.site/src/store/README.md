# Zustand 스토어 구조 가이드

## 📋 개요

이 프로젝트는 **12개 서비스** (AI 에이전트 5개 + MS 7개)를 위한 확장 가능한 Zustand 스토어 구조를 사용합니다.

## 🏗️ 구조

```
app/store/
├── types.ts                    # 전체 스토어 타입 정의
├── useAppStore.ts              # 단일 스토어 (모든 슬라이스 통합)
├── slices/
│   ├── searchSlice.ts          # 검색 슬라이스 (예시)
│   ├── agent1Slice.ts          # AI 에이전트 1 슬라이스
│   ├── agent2Slice.ts          # AI 에이전트 2 슬라이스
│   ├── ...                     # AI 에이전트 3-5
│   ├── service1Slice.ts        # MS 1 슬라이스
│   ├── service2Slice.ts        # MS 2 슬라이스
│   └── ...                     # MS 3-7
└── README.md                   # 이 파일
```

## 📝 슬라이스 생성 가이드

### 1. 슬라이스 파일 생성

```typescript
// app/store/slices/agent1Slice.ts
import { StateCreator } from "zustand";
import { AppStore } from "../types";

export interface Agent1State {
  // 상태 정의
}

export interface Agent1Actions {
  // 액션 정의
}

export interface Agent1Slice extends Agent1State, Agent1Actions {}

export const createAgent1Slice: StateCreator<
  AppStore,
  [],
  [],
  Agent1Slice
> = (set, get) => ({
  // 초기 상태
  // 액션 구현
});
```

### 2. useAppStore에 통합

```typescript
// app/store/useAppStore.ts
import { createAgent1Slice } from "./slices/agent1Slice";

export const useAppStore = create<AppStore>()((...a) => ({
  search: createSearchSlice(...a),
  agent1: createAgent1Slice(...a),  // 추가
  // ...
}));
```

### 3. types.ts에 타입 추가

```typescript
// app/store/types.ts
export interface AppStore {
  search: SearchSlice;
  agent1: Agent1Slice;  // 추가
  // ...
}
```

## 🎯 네이밍 컨벤션

### 슬라이스 파일명
- AI 에이전트: `agent1Slice.ts`, `agent2Slice.ts`, ...
- 마이크로서비스: `service1Slice.ts`, `service2Slice.ts`, ...
- 또는 도메인명: `userSlice.ts`, `orderSlice.ts`, ...

### 슬라이스 내부
- State 인터페이스: `{ServiceName}State`
- Actions 인터페이스: `{ServiceName}Actions`
- Slice 인터페이스: `{ServiceName}Slice`
- Creator 함수: `create{ServiceName}Slice`

## ⚡ 성능 최적화

### 선택적 구독
```typescript
// ❌ 나쁜 예: 전체 스토어 구독
const store = useAppStore();

// ✅ 좋은 예: 필요한 부분만 구독
const agent1Data = useAppStore((state) => state.agent1.data);
const agent1Action = useAppStore((state) => state.agent1.fetchData);
```

### 액션만 구독
```typescript
// 액션은 변경되지 않으므로 안전하게 구독 가능
const fetchData = useAppStore((state) => state.agent1.fetchData);
```

## 🔧 유지보수 팁

1. **단일 책임 원칙**: 각 슬라이스는 하나의 도메인만 담당
2. **타입 안정성**: 모든 상태와 액션에 타입 정의
3. **독립성**: 슬라이스 간 직접 의존 최소화
4. **테스트 용이성**: 각 슬라이스를 독립적으로 테스트 가능

## 📦 확장 시나리오

### 시나리오 1: AI 에이전트 추가
1. `slices/agent6Slice.ts` 생성
2. `types.ts`에 `agent6: Agent6Slice` 추가
3. `useAppStore.ts`에 `agent6: createAgent6Slice(...a)` 추가

### 시나리오 2: 도메인별 그룹핑
```typescript
export interface AppStore {
  // AI 에이전트 그룹
  agents: {
    agent1: Agent1Slice;
    agent2: Agent2Slice;
    // ...
  };
  
  // MS 그룹
  services: {
    service1: Service1Slice;
    service2: Service2Slice;
    // ...
  };
}
```

## ⚠️ 주의사항

1. **순환 참조 방지**: 슬라이스 간 직접 참조 지양
2. **상태 크기 관리**: 각 슬라이스의 상태 크기 최소화
3. **액션 네이밍**: 명확하고 일관된 네이밍 사용
4. **타입 일관성**: 모든 슬라이스에서 동일한 타입 패턴 사용

