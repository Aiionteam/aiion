# Diary Emotion Service - 사용 중인 모델 목록

## 📋 모델 개요

일기 감정 분류 서비스는 두 가지 모델 타입을 지원합니다:
- **ML (Machine Learning)**: 전통적인 머신러닝 모델
- **DL (Deep Learning)**: 딥러닝 모델 (BERT 기반)

---

## 🤖 ML 모델 (Machine Learning)

### 1. **TF-IDF Vectorizer**
- **라이브러리**: `sklearn.feature_extraction.text.TfidfVectorizer`
- **용도**: 텍스트를 벡터로 변환
- **특징**:
  - 단어 빈도 기반 특징 추출
  - 한국어 텍스트 처리
- **저장 파일**: `models/diary_emotion_vectorizer.pkl`

### 2. **Random Forest Classifier**
- **라이브러리**: `sklearn.ensemble.RandomForestClassifier`
- **용도**: 감정 분류
- **특징**:
  - 앙상블 학습 방법
  - TF-IDF 벡터를 입력으로 사용
  - 빠른 학습 및 예측 속도
- **저장 파일**: `models/diary_emotion_model.pkl`

### 3. **메타데이터**
- **저장 파일**: `models/diary_emotion_metadata.pkl`
- **포함 정보**:
  - 학습 날짜
  - CSV 파일 경로 및 수정 시간
  - 정확도 정보

---

## 🧠 DL 모델 (Deep Learning)

### 1. **BERT 기반 모델: klue/bert-base**
- **모델 이름**: `klue/bert-base`
- **라이브러리**: HuggingFace Transformers
- **기반 모델**: BERT (Bidirectional Encoder Representations from Transformers)
- **특화**: 한국어 사전 학습 모델 (KLUE - Korean Language Understanding Evaluation)
- **용도**: 감정 분류

#### 왜 `klue/bert-base`를 선택했나요?

1. **한국어 최적화**
   - 한국어 데이터로 사전 학습됨 (MODU, CC-100-Kor, 나무위키 등)
   - 약 62GB의 다양한 한국어 텍스트로 학습
   - 한국어 문법, 어순, 표현을 잘 이해함

2. **일기 텍스트에 적합**
   - 일상적인 한국어 표현에 강함
   - 비격식체, 구어체 처리 능력 우수
   - 감정 표현의 뉘앙스 이해

3. **감정 분류 성능**
   - 문맥을 양방향으로 이해 (BERT의 장점)
   - 미묘한 감정 차이 구분 가능
   - 다양한 감정 라벨(15개) 분류에 적합

4. **실용성**
   - HuggingFace에서 쉽게 사용 가능
   - 모델 크기가 적절 (base 모델)
   - 학습 및 추론 속도 균형

5. **검증된 모델**
   - KLUE 벤치마크에서 검증됨
   - 한국어 NLP 커뮤니티에서 널리 사용
   - 안정적이고 신뢰할 수 있는 성능

#### ⚠️ 왜 KoELECTRA를 추천하지 않았나요?

**실제로 KoELECTRA (`monologg/koelectra-base`)도 매우 좋은 선택입니다!**

**KoELECTRA의 장점:**
- ✅ **ELECTRA 아키텍처**: BERT보다 효율적이고 성능 우수
- ✅ **학습 효율**: 같은 데이터로 더 나은 성능 달성 가능
- ✅ **한국어 최적화**: 한국어 데이터로 사전 학습
- ✅ **모델 크기 대비 성능**: 더 작은 모델로 더 좋은 성능
- ✅ **빠른 학습**: BERT보다 학습 시간 단축 가능

**사용 방법:**
```python
service = DiaryEmotionService(
    model_type="dl",
    dl_model_name="monologg/koelectra-base"  # KoELECTRA 사용
)
```

**모델 비교:**

| 모델 | 성능 | 학습 속도 | 메모리 | 추천도 |
|------|------|----------|--------|--------|
| `klue/bert-base` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ (기본값) |
| `monologg/koelectra-base` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ **추천!** |
| `klue/roberta-base` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**결론**: KoELECTRA는 성능과 효율성 면에서 우수하므로 **강력히 추천**합니다! 기본값이 `klue/bert-base`인 이유는 더 널리 사용되고 검증된 모델이기 때문입니다.

### 2. **BERTEmotionClassifier (커스텀 모델)**
- **구조**:
  ```
  BERT (klue/bert-base)
    ↓
  Dropout (0.3)
    ↓
  Linear Layer (hidden_size=256)
    ↓
  Dropout (0.3)
    ↓
  Classification Head (num_labels)
  ```
- **특징**:
  - BERT의 문맥 이해 능력 활용
  - 한국어 텍스트에 최적화
  - 하위 레이어 동결 가능 (학습 속도 향상)
- **저장 파일**: `models/diary_emotion_dl_model.pt`

### 3. **DL 메타데이터**
- **저장 파일**: `models/diary_emotion_dl_metadata.pkl`
- **포함 정보**:
  - 모델 이름 (klue/bert-base)
  - 학습 날짜
  - CSV 파일 경로 및 수정 시간
  - num_labels, max_length 등 하이퍼파라미터

---

## 📊 모델 비교

| 항목 | ML 모델 | DL 모델 |
|------|---------|---------|
| **모델** | Random Forest | BERT (klue/bert-base) |
| **특징 추출** | TF-IDF | BERT 임베딩 |
| **학습 데이터** | diary.csv | diary_copers.csv |
| **학습 속도** | 빠름 | 느림 (GPU 권장) |
| **예측 속도** | 빠름 | 보통 |
| **정확도** | 보통 | 높음 |
| **문맥 이해** | 제한적 | 우수 |
| **GPU 필요** | ❌ | ✅ (권장) |

---

## 🔄 모델 사용 전략

### 예측 시 (predict)
1. **DL 모델 우선 사용** (메인 모델)
2. DL 확신도가 낮거나 "평가불가"일 경우 → **ML 모델로 폴백**

### 학습 시
- **ML**: `diary.csv` 사용 (title + content 분리)
- **DL**: `diary_copers.csv` 사용 (text 컬럼, 이미 합쳐진 형태)

---

## 📁 모델 파일 위치

```
ai.aiion.site/ml_service/app/diary_emotion/models/
├── diary_emotion_model.pkl          # ML 모델
├── diary_emotion_vectorizer.pkl     # ML 벡터라이저
├── diary_emotion_metadata.pkl       # ML 메타데이터
├── diary_emotion_dl_model.pt        # DL 모델 (PyTorch)
└── diary_emotion_dl_metadata.pkl    # DL 메타데이터
```

---

## 🚀 학습 방법

### ML 모델 학습
```python
service = DiaryEmotionService(model_type="ml")
service.preprocess()
service.learning(model_type="ml")
```

### DL 모델 학습

#### klue/bert-base 사용
```python
service = DiaryEmotionService(model_type="dl", dl_model_name="klue/bert-base")
service.preprocess()
service.learning(model_type="dl", epochs=3, batch_size=16)
```

#### KoELECTRA 사용 (추천!)
```python
service = DiaryEmotionService(model_type="dl", dl_model_name="monologg/koelectra-base")
service.preprocess()
service.learning(model_type="dl", epochs=3, batch_size=16)
```

### 로컬 GPU 학습
```bash
python train_local_gpu.py
```

---

## 📝 참고사항

- **Word2Vec 제거됨**: BERT가 더 우수한 문맥 이해를 제공하므로 제거
- **GPU 권장**: DL 모델 학습 시 GPU 사용 권장 (40-50분 소요)
- **CPU 호환**: 로컬 GPU에서 학습한 모델은 CPU 호환 형식으로 저장되어 컨테이너에서도 사용 가능

