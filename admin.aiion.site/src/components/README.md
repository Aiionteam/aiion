# 컴포넌트 구조 (아토믹 디자인 패턴)

이 프로젝트는 **아토믹 디자인 패턴**을 사용하여 컴포넌트를 구성합니다.

## 📁 디렉토리 구조

```
app/
├── components/
│   ├── atoms/              # 가장 작은 단위의 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Toggle.tsx
│   │   ├── Icon.tsx
│   │   └── index.ts
│   ├── molecules/          # Atoms를 조합한 컴포넌트
│   │   ├── CategoryBadge.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── EventCard.tsx
│   │   └── index.ts
│   ├── organisms/          # Molecules와 Atoms를 조합한 복잡한 컴포넌트
│   │   ├── Sidebar.tsx
│   │   ├── ChatContainer.tsx
│   │   ├── PromptInput.tsx
│   │   ├── AvatarMode.tsx
│   │   └── index.ts
│   ├── templates/          # Organisms를 배치한 레이아웃
│   │   └── MainLayout.tsx
│   ├── types.ts            # 공통 타입 정의
│   └── utils/              # 유틸리티 함수
│       └── dateUtils.ts
├── hooks/                  # 커스텀 훅
│   └── useHomePage.ts
└── pages/                  # Templates에 데이터를 넣은 최종 페이지
    └── HomePage.tsx
```

## 🎯 아토믹 디자인 패턴 레벨

### 1. Atoms (원자)
가장 작은 단위의 재사용 가능한 컴포넌트입니다.
- **Button**: 버튼 컴포넌트
- **Input**: 입력 필드 컴포넌트
- **Badge**: 배지 컴포넌트
- **Toggle**: 토글 스위치 컴포넌트
- **Icon**: 아이콘 컴포넌트

### 2. Molecules (분자)
Atoms를 조합하여 만든 더 복잡한 컴포넌트입니다.
- **CategoryBadge**: 카테고리 배지 그룹
- **ChatMessage**: 채팅 메시지 (사용자/AI)
- **EventCard**: 이벤트 카드

### 3. Organisms (유기체)
Molecules와 Atoms를 조합한 복잡한 컴포넌트입니다.
- **Sidebar**: 사이드바 네비게이션
- **ChatContainer**: 채팅 컨테이너
- **PromptInput**: 프롬프트 입력 필드
- **AvatarMode**: 아바타 모드 화면

### 4. Templates (템플릿)
Organisms를 배치한 레이아웃 구조입니다.
- **MainLayout**: 메인 레이아웃 (사이드바 + 컨텐츠 영역)

### 5. Pages (페이지)
Templates에 실제 데이터를 넣은 최종 페이지입니다.
- **HomePage**: 홈 페이지

## 📝 사용 예시

### Atoms 사용
```tsx
import { Button, Input, Badge } from '@/components/atoms';

<Button variant="primary" size="md">클릭</Button>
<Input label="이름" placeholder="이름을 입력하세요" />
<Badge variant="primary">카테고리</Badge>
```

### Molecules 사용
```tsx
import { ChatMessage } from '@/components/molecules';

<ChatMessage interaction={interaction} darkMode={darkMode} />
```

### Organisms 사용
```tsx
import { Sidebar } from '@/components/organisms';

<Sidebar
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  // ... 기타 props
/>
```

### Templates 사용
```tsx
import { MainLayout } from '@/components/templates';

<MainLayout {...layoutProps}>
  {/* 컨텐츠 */}
</MainLayout>
```

## 🔧 확장 가이드

### 새로운 Atom 추가
1. `components/atoms/` 디렉토리에 새 파일 생성
2. `components/atoms/index.ts`에 export 추가

### 새로운 Molecule 추가
1. `components/molecules/` 디렉토리에 새 파일 생성
2. 필요한 Atoms import
3. `components/molecules/index.ts`에 export 추가

### 새로운 Organism 추가
1. `components/organisms/` 디렉토리에 새 파일 생성
2. 필요한 Molecules와 Atoms import
3. `components/organisms/index.ts`에 export 추가

## ⚠️ 주의사항

1. **단방향 데이터 흐름**: Atoms → Molecules → Organisms → Templates → Pages
2. **재사용성**: 각 레벨의 컴포넌트는 독립적으로 재사용 가능해야 함
3. **타입 안정성**: 모든 props에 타입 정의 필수
4. **단일 책임**: 각 컴포넌트는 하나의 명확한 역할만 담당

