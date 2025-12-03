# Git 머지 충돌 해결 가이드

## 🔍 현재 상태 분석

### 브랜치 정보
- **현재 브랜치**: `feature-david`
- **최신 커밋**: `2c12e41 victory`
- **상태**: `up to date with origin/feature-david`

### 수정된 파일 (15개)
```
.vscode/settings.json
service.aiion.site/healthcare-service/Dockerfile
service.aiion.site/healthcare-service/src/main/java/site/aiion/api/healthcare/
  - Healthcare.java
  - HealthcareController.java (⚠️ trailing whitespace)
  - HealthcareModel.java
  - HealthcareService.java
  - HealthcareServiceImpl.java
  - Messenger.java
  - JwtTokenUtil.java (⚠️ trailing whitespace)
www.aiion.site/
  - package.json
  - pnpm-lock.yaml (⚠️ 충돌 가능성 높음)
  - src/app/hooks/useDiaryApi.ts
  - src/app/hooks/useHomePage.ts
  - src/app/hooks/usePathfinderApi.ts
  - src/app/hooks/useUserApi.ts
  - src/components/organisms/HealthView.tsx
```

### 새 파일 (8개)
```
ARCHITECTURE_ANALYSIS.md
HEALTHCARE_JWT_ISSUE_RESOLUTION.md
api.aiion.site/generate_health_analysis.py
service.aiion.site/healthcare-service/src/main/java/site/aiion/api/healthcare/
  - HealthcareAnalysis.java
  - HealthcareAnalysisRepository.java
service.aiion.site/healthcare-service/src/main/resources/migration/
www.aiion.site/extracted_nanjung_exercise.csv
www.aiion.site/src/app/hooks/useHealthcare.ts
```

---

## ⚠️ 잠재적 머지 충돌 원인

### 1. Trailing Whitespace (공백 문자)
**위치**:
- `HealthcareController.java` 71번, 216번 줄
- `JwtTokenUtil.java` 50번 줄

**문제**: 줄 끝의 불필요한 공백이 다른 브랜치와 충돌 가능

**해결**:
```bash
# 공백 제거
git diff --check  # 문제 확인
# IDE에서 "Trim Trailing Whitespace" 실행
```

### 2. pnpm-lock.yaml 충돌
**원인**: 여러 개발자가 동시에 패키지 설치
**해결**:
```bash
# Option 1: pnpm-lock.yaml 재생성
cd www.aiion.site
rm pnpm-lock.yaml
pnpm install

# Option 2: 머지 시 theirs/ours 선택
git checkout --theirs pnpm-lock.yaml  # 다른 브랜치 선택
git checkout --ours pnpm-lock.yaml    # 현재 브랜치 선택
pnpm install  # 재설치
```

### 3. 같은 파일 동시 수정
**충돌 가능 파일**:
- `Healthcare.java` - userId, type, recordDate 필드 추가
- `HealthcareController.java` - /analysis 엔드포인트 추가
- `HealthView.tsx` - 종합건강분석 UI 추가

---

## ✅ 머지 전 준비 작업

### 1단계: Trailing Whitespace 제거
```bash
# 공백 문제 파일 수정
cd service.aiion.site/healthcare-service/src/main/java/site/aiion/api/healthcare
# HealthcareController.java 71번, 216번 줄 공백 제거
# JwtTokenUtil.java 50번 줄 공백 제거
```

### 2단계: 변경사항 커밋
```bash
cd C:\Users\hi\Documents\develop\aiion

# 새 파일 추가
git add ARCHITECTURE_ANALYSIS.md
git add HEALTHCARE_JWT_ISSUE_RESOLUTION.md
git add api.aiion.site/generate_health_analysis.py
git add service.aiion.site/healthcare-service/src/main/java/site/aiion/api/healthcare/HealthcareAnalysis.java
git add service.aiion.site/healthcare-service/src/main/java/site/aiion/api/healthcare/HealthcareAnalysisRepository.java
git add service.aiion.site/healthcare-service/src/main/resources/migration/
git add www.aiion.site/extracted_nanjung_exercise.csv
git add www.aiion.site/src/app/hooks/useHealthcare.ts

# 수정된 파일 추가
git add .vscode/settings.json
git add service.aiion.site/healthcare-service/Dockerfile
git add service.aiion.site/healthcare-service/src/main/java/site/aiion/api/healthcare/
git add www.aiion.site/package.json
git add www.aiion.site/pnpm-lock.yaml
git add www.aiion.site/src/app/hooks/
git add www.aiion.site/src/components/organisms/HealthView.tsx

# 커밋
git commit -m "feat: 헬스케어 종합분석 및 프록시 구조 구현

- 종합건강분석 API 추가 (HealthcareAnalysis entity)
- JWT 기반 /healthcare/analysis 엔드포인트 구현
- 프론트엔드 useHealthcareAnalysis hook 추가
- HealthView에 종합건강분석 데이터 표시
- 운동/건강 데이터 분류 스크립트 추가
- 507개 난중일기 건강 기록 데이터 삽입
"
```

### 3단계: 원격 브랜치와 동기화
```bash
# 최신 변경사항 가져오기
git fetch origin

# develop 브랜치 최신 상태 확인
git log origin/develop --oneline -5
```

---

## 🔄 머지 시나리오별 해결

### 시나리오 1: develop → feature-david 머지
```bash
# 현재 브랜치에서 develop 머지
git merge origin/develop

# 충돌 발생 시
git status  # 충돌 파일 확인

# 충돌 해결 후
git add <충돌_해결된_파일>
git commit -m "Merge develop into feature-david"
```

### 시나리오 2: feature-david → develop 머지 (Pull Request)
```bash
# GitHub/GitLab에서 Pull Request 생성
# 충돌 발생 시 웹에서 해결 또는:

git checkout develop
git pull origin develop
git merge feature-david

# 충돌 해결 후
git push origin develop
```

---

## 🛠️ 충돌 해결 전략

### 1. pnpm-lock.yaml 충돌
```bash
# 항상 머지 후 재생성
git checkout --theirs www.aiion.site/pnpm-lock.yaml
cd www.aiion.site
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: pnpm-lock.yaml 재생성"
```

### 2. Healthcare 관련 파일 충돌
```bash
# 수동 병합 필요
# VSCode에서 충돌 마커 확인:
<<<<<<< HEAD (현재 브랜치)
// 현재 코드
=======
// 다른 브랜치 코드
>>>>>>> develop

# 필요한 부분 선택 또는 양쪽 모두 포함
```

### 3. useHealthcare.ts 충돌 (새 파일)
```bash
# 다른 브랜치에 같은 이름 파일이 있다면
git checkout --ours www.aiion.site/src/app/hooks/useHealthcare.ts
# 또는
git checkout --theirs www.aiion.site/src/app/hooks/useHealthcare.ts

# 수동으로 병합
```

---

## 📋 체크리스트

### 머지 전
- [ ] Trailing whitespace 제거
- [ ] 모든 변경사항 커밋
- [ ] 원격 브랜치 최신화 확인
- [ ] 로컬 테스트 완료

### 머지 중
- [ ] 충돌 파일 확인 (`git status`)
- [ ] 충돌 해결 전략 결정
- [ ] 코드 리뷰

### 머지 후
- [ ] pnpm-lock.yaml 재생성
- [ ] 빌드 테스트
- [ ] API 테스트
- [ ] 프론트엔드 테스트

---

## 🚨 긴급 복구

### 머지 취소 (머지 완료 전)
```bash
git merge --abort
```

### 머지 취소 (머지 완료 후)
```bash
# 마지막 커밋 되돌리기
git reset --hard HEAD~1

# 특정 커밋으로 되돌리기
git reset --hard <commit-hash>
```

---

## 📞 도움이 필요한 경우

### 충돌 파일 확인
```bash
git diff --name-only --diff-filter=U
```

### 충돌 내용 확인
```bash
git diff <충돌_파일>
```

### 머지 기록 확인
```bash
git log --merge
```

---

**작성일**: 2025-12-03  
**작성자**: AI Assistant (Claude)  
**상태**: 준비 완료 (머지 대기)

