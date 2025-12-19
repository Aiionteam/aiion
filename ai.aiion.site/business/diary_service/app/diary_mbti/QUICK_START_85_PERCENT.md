# 85% 정확도 달성을 위한 빠른 시작 가이드

## 🎯 목표
현재 정확도 48% → **85% 이상** 달성

## ✅ 즉시 실행 가능한 방법

### 방법 1: 최적화된 스크립트 사용 (권장)

**1단계**: 최적화된 학습 스크립트 실행
```bash
cd ai.aiion.site/business/diary_service/app/diary_mbti
python train_local_gpu_optimized.py
```

이 스크립트는 다음 최적화를 포함합니다:
- ✅ 텍스트 최소 길이: 100자
- ✅ 3-class 분류 유지 (0=평가불가, 1=성향1, 2=성향2)
- ✅ 클래스 가중치 자동 강화 (불균형 해결)
- ✅ Epochs: 10
- ✅ Freeze layers: 2
- ✅ Max length: 512
- ✅ Learning rate: 1e-5
- ✅ Dropout: 0.2

**예상 결과**: 70-80% 정확도

---

### 방법 2: 기존 스크립트 수정 (단계별 적용)

#### Step 1: 데이터 필터링 강화

**파일**: `diary_mbti_service.py` (line ~247)
```python
# 변경 전
self.df = self.method.filter_short_texts(self.df, min_length=50)

# 변경 후
self.df = self.method.filter_short_texts(self.df, min_length=100)
```

#### Step 2: 클래스 가중치 강화 (평가불가 유지)

**중요**: 평가불가(0) 레이블은 유지해야 합니다. 모델이 평가불가한 일기를 인식할 수 있어야 합니다.

**파일**: `diary_mbti_service.py`의 `learning()` 메서드 (line ~284)
```python
# 변경 전
self.dl_model_obj.create_models(
    num_labels=3,  # 3-class
    dropout_rate=0.3,
    hidden_size=256
)

# 변경 후 (평가불가 유지, 3-class 분류)
self.dl_model_obj.create_models(
    num_labels=3,  # 3-class 유지 (0=평가불가, 1=성향1, 2=성향2)
    dropout_rate=0.2,  # 0.3 -> 0.2
    hidden_size=256
)
```

**참고**: 클래스 가중치는 `diary_mbti_dl_trainer.py`에서 자동으로 강화됩니다.

#### Step 3: 하이퍼파라미터 최적화

**파일**: `train_local_gpu.py` (line ~108-114)
```python
# 변경 전
history = service.learning(
    epochs=4,
    batch_size=24,
    freeze_bert_layers=5,
    learning_rate=2e-5,
    max_length=384,
    early_stopping_patience=5
)

# 변경 후
history = service.learning(
    epochs=10,              # 4 -> 10
    batch_size=16,         # 24 -> 16
    freeze_bert_layers=2,  # 5 -> 2
    learning_rate=1e-5,    # 2e-5 -> 1e-5
    max_length=512,        # 384 -> 512
    early_stopping_patience=5
)
```

#### Step 4: 이순신 일기 데이터 제외 (선택사항)

**파일**: `train_local_gpu.py` (line ~54-55)
```python
# 변경 전
all_json_files = [json_files_merged, json_files_leesoonsin]

# 변경 후 (이순신 일기 제외)
all_json_files = [json_files_merged]  # 클래스 불균형 문제로 제외
```

---

## 📊 예상 결과

### 1단계 적용 시 (데이터 필터링만)
- **예상 정확도**: 60-65%
- **소요 시간**: 기존과 동일

### 2단계 적용 시 (하이퍼파라미터 최적화 포함)
- **예상 정확도**: 70-80%
- **소요 시간**: 약 2배 증가 (epochs 증가)

### 3단계 적용 시 (모든 최적화)
- **예상 정확도**: 80-85%
- **소요 시간**: 약 2.5배 증가

---

## 🔍 결과 확인 방법

학습 완료 후 출력에서 확인:
```
평균 검증 정확도: 0.8500 (85.00%)
```

또는 차원별로:
```
E_I: 0.8500 (85.00%)
S_N: 0.8400 (84.00%)
T_F: 0.8600 (86.00%)
J_P: 0.8500 (85.00%)
```

---

## ⚠️ 주의사항

1. **평가불가 유지**: 평가불가(0) 레이블은 제거하지 않습니다. 모델이 평가불가한 일기를 인식할 수 있어야 합니다.
2. **3-class 분류**: `num_labels=3` 유지 (0=평가불가, 1=성향1, 2=성향2)
3. **VRAM 부족 시**: batch_size를 16 → 12 또는 8로 감소
4. **학습 시간**: Epochs 증가로 학습 시간도 증가 (약 4-6시간)
5. **데이터 수 감소**: 필터링으로 데이터가 줄어들 수 있음 (정상)
6. **클래스 불균형**: 자동으로 가중치가 강화되어 해결됩니다

---

## 🚀 빠른 실행 (권장)

가장 빠르고 확실한 방법:

```bash
# 1. 최적화된 스크립트 실행
python train_local_gpu_optimized.py

# 2. 결과 확인
# - 85% 이상: 완료! ✅
# - 80-85%: 거의 달성, 약간의 추가 튜닝 필요
# - 70-80%: ACTION_PLAN_85_PERCENT.md의 3단계 작업 적용
# - 70% 미만: 데이터 품질 재검토 필요
```

---

## 📝 추가 개선이 필요한 경우

85% 미달 시 다음 문서 참고:
- `ACTION_PLAN_85_PERCENT.md`: 상세한 개선 계획
- `DATA_ISSUES_AND_SOLUTIONS.md`: 데이터 문제점 분석

---

## 💡 팁

1. **첫 실행**: `train_local_gpu_optimized.py` 사용 (가장 빠름)
2. **단계별 적용**: 각 변경사항의 효과를 확인하며 진행
3. **모니터링**: 학습 중 Train/Val Loss 차이 확인 (과적합 체크)
4. **백업**: 기존 모델 백업 후 새 모델 학습

