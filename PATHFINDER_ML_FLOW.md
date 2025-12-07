# Pathfinder ML 학습 추천 플로우

## 📋 개요

일기 데이터를 기반으로 ML 모델을 통해 학습 주제를 추천하는 시스템입니다.

## 🔄 전체 플로우

### 1️⃣ 학습 단계 (오프라인)

```
diary.csv (감정 분석된 일기 데이터)
  ↓
pathfinder_learning 모듈
  ↓
POST /pathfinder-learning/train
  ↓
ML 모델 학습 (RandomForestClassifier + RandomForestRegressor)
  ↓
학습된 모델 저장 (models/ 폴더)
```

**주요 파일:**
- `ai.aiion.site/ml_service/app/pathfinder_learning/learning_recommendation_service.py`
- `ai.aiion.site/ml_service/app/pathfinder_learning/data_collector.py`

### 2️⃣ 실시간 예측 단계 (온라인)

```
프론트엔드
  ↓
GET /pathfinder/pathfinders/recommendations/{userId}
  ↓
PathfinderController.getRecommendations()
  ↓
PathfinderAnalysisService.generateComprehensiveRecommendations()
  ↓
MLServiceClient.getMLRecommendations()
  │
  ├─→ DiaryServiceClient
  │   └─→ diary-service → Neon DB (일기 조회)
  │       └─→ diary_emotions 테이블과 조인하여 감정 정보 포함
  │
  └─→ 각 일기마다:
      ├─ emotion이 있으면 → 그대로 사용
      ├─ emotion이 없으면 → diary-emotion ML 서비스 호출하여 감정 분석
      └─→ POST /pathfinder-learning/predict
          └─→ 학습된 ML 모델로 학습 주제 예측
  ↓
ML 예측 결과 수집 및 정렬
  ↓
LearningRecommendation 리스트 생성
  ↓
프론트엔드에 반환
```

**주요 파일:**
- `service.aiion.site/pathfinder-service/src/main/java/site/aiion/api/pathfinder/client/MLServiceClient.java`
- `service.aiion.site/pathfinder-service/src/main/java/site/aiion/api/pathfinder/PathfinderAnalysisService.java`

## 🔑 핵심 수정 사항

### 1. MLServiceClient 생성
- `pathfinder-service`에서 `aihoyun-ml-service`를 호출하는 클라이언트
- 일기 데이터를 ML 서비스에 전달하여 학습 주제 예측
- 감정 정보가 없으면 자동으로 `diary-emotion` ML 서비스를 호출하여 감정 분석 수행

### 2. PathfinderAnalysisService 수정
- 기존: 키워드 매칭 기반 규칙 추천
- 변경: ML 서비스 호출로 전환
- `analyzeDiariesAndExtractLearningTopics()` 메서드가 ML 서비스를 호출하도록 수정

### 3. 감정 분석 자동화
- 일기 조회 시 `diary_emotions` 테이블과 조인하여 감정 정보 포함
- 감정 정보가 없으면 `diary-emotion` ML 서비스를 호출하여 실시간 감정 분석 수행

## 📊 데이터 흐름

```
Neon DB (diaries 테이블)
  ↓
diary-service (일기 조회)
  ↓
diary_emotions 테이블 조인 (감정 정보)
  ↓
MLServiceClient
  ↓
aihoyun-ml-service
  ├─ diary-emotion/predict (감정 분석, 필요시)
  └─ pathfinder-learning/predict (학습 주제 예측)
  ↓
학습 추천 결과
  ↓
프론트엔드 표시
```

## 🎯 API 엔드포인트

### 학습 추천 조회
```
GET /pathfinder/pathfinders/recommendations/{userId}
```

### ML 서비스 직접 호출 (테스트용)
```
POST /pathfinder-learning/predict
Body: {
  "diary_content": "일기 내용",
  "emotion": 1,
  "behavior_patterns": "",
  "behavior_frequency": "",
  "mbti_type": "UNKNOWN",
  "mbti_confidence": 0.0
}
```

## 📝 참고사항

- **학습 데이터**: `diary.csv`에서 감정 분석된 일기 데이터 사용
- **예측 데이터**: Neon DB의 실제 사용자 일기 데이터 사용
- **감정 분석**: 일기 저장 시 자동 수행, 없으면 예측 시 실시간 수행
- **ML 모델**: RandomForest 기반 분류 모델 (학습 주제) + 회귀 모델 (추천 점수)

