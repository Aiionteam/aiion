# 영화 리뷰 감성 분석 서비스

네이버 영화 리뷰 데이터를 사용한 긍정/부정 감성 분석 서비스입니다.

## 📋 개요

- **모델**: KoELECTRA v3 base
- **태스크**: 이진 분류 (긍정/부정)
- **데이터**: 네이버 영화 리뷰 JSON 파일

## 🚀 사용법

### 1. 모델 학습

```bash
# 로컬 GPU 학습
cd ai.aiion.site/transformer_service/app/review
python train_local_gpu.py
```

### 2. API 사용

#### 단일 예측
```bash
curl -X POST http://localhost:9008/review/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "이 영화 정말 재미있었어요!"}'
```

#### 배치 예측
```bash
curl -X POST http://localhost:9008/review/predict/batch \
  -H "Content-Type: application/json" \
  -d '{"texts": ["정말 좋은 영화입니다", "별로 재미없었어요"]}'
```

#### 모델 학습
```bash
curl -X POST http://localhost:9008/review/train \
  -H "Content-Type: application/json" \
  -d '{
    "epochs": 5,
    "batch_size": 16,
    "learning_rate": 2e-5
  }'
```

## 📁 파일 구조

```
review/
├── data/                    # JSON 데이터 파일들
├── review_schema.py         # Pydantic 스키마
├── review_dataset.py        # 데이터셋 로더
├── review_model.py          # KoELECTRA 모델 클래스
├── review_trainer.py        # 학습 트레이너
├── review_service.py        # 서비스 로직
├── review_router.py         # FastAPI 라우터
├── train_local_gpu.py       # 로컬 학습 스크립트
└── README.md
```

## 🎯 데이터 형식

JSON 파일 형식:
```json
[
  {
    "review_id": "8915932",
    "movie_id": "95806",
    "author": "haha****",
    "review": "의미만 있고 내용은 재미가 하나도 없다...",
    "rating": "2",
    "date": "14.07.14"
  }
]
```

라벨 생성 규칙:
- `rating >= 7`: 긍정 (1)
- `rating <= 4`: 부정 (0)
- `rating 5-6`: 중립 (제외)

## 📊 모델 저장 위치

학습된 모델은 중앙 저장소에 저장됩니다:
- Docker: `/app/models/trained_models/review/`
- 로컬: `ai.aiion.site/models/trained_models/review/`

## 🔧 학습 파라미터

기본 설정:
- **에포크**: 5
- **배치 크기**: 16
- **학습률**: 2e-5
- **최대 길이**: 512
- **동결 레이어**: 8

## 📝 API 엔드포인트

- `GET /review/` - 서비스 정보
- `POST /review/predict` - 단일 예측
- `POST /review/predict/batch` - 배치 예측
- `POST /review/train` - 모델 학습
- `GET /review/status` - 서비스 상태
- `GET /review/health` - 헬스 체크

