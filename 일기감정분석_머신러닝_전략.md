# 일기 자동 감정 분류 가이드

## ✅ 가능합니다!

네, **일기를 계속 라벨링해서 학습 데이터를 늘리고, 정확도를 90% 이상으로 올리면, 새로운 일기를 입력했을 때 자동으로 긍정/부정/중립으로 분류할 수 있습니다!**

현재 시스템이 바로 그런 목적으로 설계되어 있습니다.

---

## 🔄 전체 프로세스

### 1단계: 일기 데이터 수집 및 라벨링

#### CSV 파일에 데이터 추가
```csv
id,localdate,title,content,userId,emotion,
22,2024-12-05,오늘의 일기,오늘 정말 행복한 하루였다. 좋은 일이 많이 생겼다.,1,1,
23,2024-12-06,우울한 하루,오늘은 정말 힘들었다. 모든 게 마음에 들지 않는다.,1,2,
24,2024-12-07,평범한 하루,오늘은 특별한 일 없이 평범하게 지냈다.,1,0,
```

**감정 라벨:**
- `0`: 중립 (neutral)
- `1`: 긍정 (positive)
- `2`: 부정 (negative)

### 2단계: 모델 재학습

데이터를 추가한 후 모델을 다시 학습:

```powershell
POST http://localhost:9003/diary-emotion/train
```

또는 Swagger UI에서:
```
http://localhost:9003/docs
→ /diary-emotion/train
→ Try it out → Execute
```

### 3단계: 새로운 일기 자동 분류

#### Postman에서 실행

**URL:**
```
POST http://localhost:9003/diary-emotion/predict
```

**Body (JSON):**
```json
{
  "text": "오늘 정말 기분이 좋다! 행복한 하루였다."
}
```

**응답:**
```json
{
  "emotion": 1,
  "emotion_label": "긍정",
  "probabilities": {
    "중립": 0.05,
    "긍정": 0.90,
    "부정": 0.05
  }
}
```

---

## 📊 정확도 향상 전략

### 1. 데이터 양 증가

**현재:** 21개 데이터 → 정확도 60%

**목표:**
- **100개 이상:** 정확도 70-80%
- **500개 이상:** 정확도 85-90%
- **1000개 이상:** 정확도 90% 이상

### 2. 데이터 균형

각 감정 레이블의 비율을 균형있게:

```
중립(0): 33% (약 330개)
긍정(1): 33% (약 330개)
부정(2): 34% (약 340개)
```

### 3. 데이터 품질

- **명확한 감정 표현**: 애매한 표현보다는 명확한 감정 표현
- **다양한 표현**: 다양한 단어와 표현 방식 포함
- **일관성**: 같은 감정에 대한 라벨링 일관성 유지

---

## 🔧 실전 사용 예시

### 시나리오: 새로운 일기 작성 후 자동 분류

#### 1. 사용자가 일기 작성
```
"오늘 친구들과 재미있게 놀았다. 정말 즐거운 시간이었다."
```

#### 2. 자동 분류 요청
```json
POST http://localhost:9003/diary-emotion/predict

{
  "text": "오늘 친구들과 재미있게 놀았다. 정말 즐거운 시간이었다."
}
```

#### 3. 분류 결과
```json
{
  "emotion": 1,
  "emotion_label": "긍정",
  "probabilities": {
    "중립": 0.03,
    "긍정": 0.94,
    "부정": 0.03
  }
}
```

**해석:**
- ✅ **94%의 확률로 긍정 감정**
- 일기 작성 시 자동으로 긍정 태그 추가 가능
- 감정 분석 리포트에 포함 가능

---

## 💡 실제 활용 방법

### 1. 일기 앱에 통합

```javascript
// 프론트엔드 예시
async function classifyDiary(text) {
  const response = await fetch('http://localhost:9003/diary-emotion/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: text })
  });
  
  const result = await response.json();
  
  // 확률이 90% 이상일 때만 자동 분류
  const maxProbability = Math.max(...Object.values(result.probabilities));
  
  if (maxProbability >= 0.9) {
    return {
      emotion: result.emotion_label,
      confidence: maxProbability,
      autoClassified: true
    };
  } else {
    return {
      emotion: null,
      confidence: maxProbability,
      autoClassified: false,
      message: "확률이 낮아 수동 분류가 필요합니다."
    };
  }
}
```

### 2. 배치 처리

여러 일기를 한번에 분류:

```python
diaries = [
    "오늘 정말 기분이 좋다!",
    "오늘은 힘들었다.",
    "오늘은 평범한 하루였다."
]

for diary in diaries:
    result = predict_emotion(diary)
    print(f"{diary} -> {result['emotion_label']} ({result['probabilities']})")
```

---

## 📈 정확도 향상 로드맵

### Phase 1: 현재 (21개 데이터)
- 정확도: ~60%
- 상태: 기본적인 분류 가능

### Phase 2: 초기 확장 (100개 데이터)
- 목표 정확도: 70-80%
- 데이터 추가 필요: +79개

### Phase 3: 중기 확장 (500개 데이터)
- 목표 정확도: 85-90%
- 데이터 추가 필요: +479개

### Phase 4: 고정확도 (1000개 이상)
- 목표 정확도: 90% 이상
- 데이터 추가 필요: +979개
- **이 시점에서 프로덕션 사용 가능**

---

## 🎯 데이터 추가 방법

### 방법 1: CSV 파일 직접 편집

1. `diary_emotion.csv` 파일 열기
2. 새 행 추가:
```csv
22,2024-12-05,제목,내용,1,1,
```

3. 모델 재학습

### 방법 2: API를 통한 데이터 추가 (향후 구현 가능)

```json
POST http://localhost:9003/diary-emotion/diaries

{
  "localdate": "2024-12-05",
  "title": "제목",
  "content": "내용",
  "userId": 1,
  "emotion": 1
}
```

---

## ⚠️ 주의사항

### 1. 정확도가 낮을 때
- 확률이 70% 미만: 수동 검토 권장
- 확률이 70-90%: 자동 분류하되 사용자 확인 옵션 제공
- 확률이 90% 이상: 자동 분류 가능

### 2. 새로운 패턴의 데이터
- 학습 데이터에 없는 새로운 표현이 들어오면 정확도가 낮을 수 있음
- 새로운 패턴의 데이터를 발견하면 학습 데이터에 추가

### 3. 주기적인 재학습
- 새로운 데이터가 쌓일 때마다 주기적으로 재학습
- 예: 100개마다, 또는 주 1회

---

## 📝 요약

✅ **가능합니다!**

1. **일기 라벨링** → CSV 파일에 추가
2. **모델 학습** → `/train` 엔드포인트 호출
3. **정확도 향상** → 데이터가 많을수록 정확도 향상
4. **자동 분류** → `/predict` 엔드포인트로 새로운 일기 분류
5. **90% 이상 달성** → 프로덕션에서 자동 분류 사용 가능

**현재 시스템이 바로 그런 목적으로 만들어져 있습니다!**

---

## 🔗 관련 엔드포인트

- **모델 학습**: `POST /diary-emotion/train`
- **감정 예측**: `POST /diary-emotion/predict`
- **모델 평가**: `GET /diary-emotion/evaluate`
- **서비스 상태**: `GET /diary-emotion/status`
- **헬스 체크**: `GET /diary-emotion/health`

