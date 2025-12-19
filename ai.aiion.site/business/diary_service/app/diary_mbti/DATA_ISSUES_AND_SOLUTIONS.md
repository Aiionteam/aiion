# MBTI 데이터 문제점 및 해결 방안

## 발견된 문제점

### 1. 텍스트 길이 문제 ⚠️ **심각**
- **병합 데이터**: 평균 65-73자 (최대 83-95자)
- **이순신 일기**: 평균 167자 (최대 9677자)
- **문제**: 너무 짧은 텍스트는 MBTI 분류에 충분한 정보를 제공하지 못함

### 2. 클래스 불균형 문제 ⚠️ **심각**
- **병합 데이터**: 0(20%), 1(40%), 2(40%) - 상대적으로 균형
- **이순신 일기**: 0(69.25%), 1(20.70%), 2(10.06%) - 심각한 불균형
- **병합 후**: 전체적으로 0의 비율이 높아져 모델이 0을 예측하는 경향

### 3. 평가불가(0) 레이블 필터링 미적용
- `filter_zero_labels()` 메서드가 있지만 `preprocess()`에서 호출되지 않음
- 평가불가 데이터가 학습에 포함되어 정확도 저하

## 해결 방안

### 방안 1: 평가불가(0) 레이블 필터링 (권장)
```python
# diary_mbti_service.py의 preprocess() 메서드에 추가
# 텍스트 전처리 후, 평가불가 데이터 필터링
self.df = self.method.filter_zero_labels(self.df, min_zero_ratio=0.3)
```

**장점**: 
- 평가불가 데이터 제거로 모델이 실제 MBTI 성향만 학습
- 2-class 분류로 단순화 가능

**단점**:
- 데이터 수 감소 (약 20-30% 감소 예상)

### 방안 2: 최소 텍스트 길이 필터링
```python
# diary_mbti_method.py에 추가
def filter_short_texts(self, df: pd.DataFrame, min_length: int = 50) -> pd.DataFrame:
    """너무 짧은 텍스트 필터링"""
    before = len(df)
    df = df[df['text'].str.len() >= min_length].copy()
    df = df.reset_index(drop=True)
    ic(f"짧은 텍스트 제거: {before - len(df):,}개")
    return df
```

**권장 최소 길이**: 50-100자

### 방안 3: 클래스 불균형 해결
1. **오버샘플링**: 소수 클래스 증폭
2. **언더샘플링**: 다수 클래스 감소
3. **가중치 조정**: 이미 적용 중이지만 더 강화 필요

### 방안 4: 데이터셋 분리 학습
- 이순신 일기 데이터는 별도로 학습하거나 제외
- 현대 일기 데이터만 사용

## 즉시 적용 가능한 수정

### 1. preprocess()에 필터링 추가
```python
# diary_mbti_service.py의 preprocess() 메서드 수정
def preprocess(self):
    # ... 기존 코드 ...
    
    # 텍스트 전처리 후
    self.df = self.method.preprocess_text(self.df)
    
    # 추가: 평가불가 데이터 필터링
    self.df = self.method.filter_zero_labels(self.df, min_zero_ratio=0.3)
    
    # 추가: 짧은 텍스트 필터링
    self.df = self.df[self.df['text'].str.len() >= 50].copy()
    self.df = self.df.reset_index(drop=True)
    
    ic("😎😎 전처리 완료")
```

### 2. 학습 시 2-class 분류로 변경 (선택사항)
평가불가를 제거하면 2-class 분류로 변경 가능:
```python
# diary_mbti_service.py의 learning() 메서드
self.dl_model_obj.create_models(
    num_labels=2,  # 3 -> 2로 변경
    dropout_rate=0.3,
    hidden_size=256
)
```

## 예상 효과

1. **정확도 향상**: 48% → 60-70% 예상
2. **데이터 품질 향상**: 짧고 의미 없는 텍스트 제거
3. **학습 안정성 향상**: 클래스 불균형 해소

