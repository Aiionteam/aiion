# 85% 정확도 달성을 위한 작업 계획

## 현재 상황
- **현재 정확도**: ~48%
- **목표 정확도**: 85% 이상
- **필요한 개선**: +37%p

## 우선순위별 작업 목록

### 🔴 1단계: 데이터 품질 개선 (즉시 적용 가능)

#### 작업 1-1: 더 엄격한 텍스트 필터링
**현재**: 최소 50자
**변경**: 최소 100자로 상향
**예상 효과**: +5-10%p

**수정 위치**: `diary_mbti_service.py`의 `preprocess()` 메서드
```python
# 현재
self.df = self.method.filter_short_texts(self.df, min_length=50)

# 변경
self.df = self.method.filter_short_texts(self.df, min_length=100)
```

#### 작업 1-2: 클래스 가중치 강화 (평가불가 유지)
**현재**: 기본 역빈도 기반 가중치
**변경**: 불균형 비율에 따라 동적 가중치 강화
**예상 효과**: +5-10%p

**이유**: 평가불가(0) 레이블도 학습해야 하므로 제거하지 않고 가중치로 해결

**수정 위치**: `diary_mbti_dl_trainer.py`의 `train()` 메서드
- 이미 적용됨: 불균형 비율에 따라 가중치 자동 강화
- 불균형이 심할수록 (3:1 이상) 가중치를 더 강하게 적용

#### 작업 1-3: 이순신 일기 데이터 제외 또는 별도 처리
**이유**: 클래스 불균형이 심함 (0이 69%)
**방법**: 
- 옵션 A: 이순신 일기 데이터 제외
- 옵션 B: 이순신 일기 데이터만 별도 모델로 학습

**수정 위치**: `train_local_gpu.py`
```python
# 옵션 A: 이순신 일기 제외
all_json_files = [json_files_merged]  # 이순신 일기 제외

# 옵션 B: 별도 학습 (나중에 구현)
```

---

### 🟡 2단계: 하이퍼파라미터 최적화

#### 작업 2-1: Epochs 증가
**현재**: 4 epochs
**변경**: 8-10 epochs
**예상 효과**: +3-5%p

**수정 위치**: `train_local_gpu.py`
```python
history = service.learning(
    epochs=10,  # 4 -> 10
    ...
)
```

#### 작업 2-2: Learning Rate 조정
**현재**: 2e-5
**변경**: 1e-5 (더 낮은 학습률로 안정적 학습)
**예상 효과**: +2-3%p

**수정 위치**: `train_local_gpu.py`
```python
learning_rate=1e-5,  # 2e-5 -> 1e-5
```

#### 작업 2-3: Freeze Layers 조정
**현재**: 5 layers 동결
**변경**: 0-2 layers만 동결 (더 많은 레이어 학습)
**예상 효과**: +3-5%p

**수정 위치**: `train_local_gpu.py`
```python
freeze_bert_layers=2,  # 5 -> 2
```

#### 작업 2-4: Max Length 증가
**현재**: 384
**변경**: 512 (더 많은 컨텍스트)
**예상 효과**: +2-3%p

**수정 위치**: `train_local_gpu.py`
```python
max_length=512,  # 384 -> 512
```

#### 작업 2-5: Dropout Rate 조정
**현재**: 0.3
**변경**: 0.2 (과적합 방지하면서 학습 능력 향상)
**예상 효과**: +1-2%p

**수정 위치**: `diary_mbti_service.py`의 `learning()` 메서드
```python
self.dl_model_obj.create_models(
    num_labels=2,  # 3 -> 2 (평가불가 제거 시)
    dropout_rate=0.2,  # 0.3 -> 0.2
    hidden_size=256
)
```

#### 작업 2-6: Batch Size 조정
**현재**: 24
**변경**: 16 (더 안정적인 gradient)
**예상 효과**: +1-2%p

**주의**: VRAM 부족 시 원래대로

---

### 🟢 3단계: 학습 전략 개선

#### 작업 3-1: 학습률 스케줄러 개선
**현재**: Linear warmup
**변경**: Cosine annealing with restarts
**예상 효과**: +2-3%p

**수정 위치**: `diary_mbti_dl_trainer.py`의 `train()` 메서드
```python
from transformers import get_cosine_schedule_with_warmup

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=int(0.1 * total_steps),
    num_training_steps=total_steps
)
```

#### 작업 3-2: 클래스 가중치 재조정
**현재**: 역빈도 기반
**변경**: 더 강한 가중치 적용
**예상 효과**: +2-3%p

**수정 위치**: `diary_mbti_dl_trainer.py`의 `train()` 메서드
```python
# 더 강한 가중치
class_weights = 1.0 / (counts + 1e-5)  # 0으로 나누기 방지
class_weights = class_weights / class_weights.sum() * len(unique) * 1.5  # 1.5배 강화
```

#### 작업 3-3: Gradient Accumulation 추가
**효과**: 큰 배치 효과를 작은 배치로 구현
**예상 효과**: +1-2%p

---

### 🔵 4단계: 데이터 증강 (선택사항)

#### 작업 4-1: 텍스트 증강
- 동의어 치환
- 문장 순서 변경
- 약간의 노이즈 추가

**예상 효과**: +3-5%p

---

### ⚪ 5단계: 모델 구조 개선 (고급)

#### 작업 5-1: Hidden Size 증가
**현재**: 256
**변경**: 512
**예상 효과**: +2-3%p

#### 작업 5-2: 추가 Dense Layer
**현재**: 1개 분류 헤드
**변경**: 2-3개 Dense Layer 스택
**예상 효과**: +2-3%p

---

## 즉시 적용 가능한 최적 조합 (권장)

### 빠른 개선 (예상: 48% → 70-75%)
1. ✅ 텍스트 최소 길이: 50 → 100자
2. ✅ 클래스 가중치 강화 (평가불가 유지, 3-class 분류)
3. ✅ Epochs: 4 → 10
4. ✅ Freeze layers: 5 → 2
5. ✅ Max length: 384 → 512

### 추가 개선 (예상: 70-75% → 80-85%)
6. ✅ Learning rate: 2e-5 → 1e-5
7. ✅ Dropout: 0.3 → 0.2
8. ✅ Cosine scheduler 적용 (선택사항)
9. ✅ 클래스 가중치 자동 강화 (이미 적용됨)

---

## 실행 순서

1. **1단계 작업 모두 적용** → 학습 실행 → 정확도 확인
2. 정확도가 70% 미만이면 → **2단계 작업 적용** → 재학습
3. 정확도가 80% 미만이면 → **3단계 작업 적용** → 재학습
4. 목표 달성 시 중단

---

## 주의사항

⚠️ **평가불가 제거 시**: `num_labels=2`로 변경 필수
⚠️ **이순신 일기 제외 시**: 데이터 수가 줄어들 수 있음
⚠️ **하이퍼파라미터 변경**: 한 번에 하나씩 변경하며 효과 확인
⚠️ **학습 시간**: Epochs 증가 시 학습 시간도 증가

---

## 모니터링 체크리스트

학습 중 확인할 사항:
- [ ] Train Loss가 지속적으로 감소하는가?
- [ ] Val Loss가 Train Loss와 비슷한가? (과적합 확인)
- [ ] 각 차원별 정확도가 균형 있는가?
- [ ] 클래스별 정확도가 균형 있는가?

