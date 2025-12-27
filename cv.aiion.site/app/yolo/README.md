# YOLO 이미지 처리 시스템

4가지 YOLO 기능을 활용한 이미지 분석 시스템입니다.

## 📋 기능 개요

| 기능 | 파일 | 출력 | 용도 |
|------|------|------|------|
| **Detection** | `yolo_detection.py` | 바운딩 박스 + 클래스 | 모든 객체 검출 (사람, 자동차, 동물 등) |
| **Classification** | `yolo_class.py` | 클래스 + 확률 | 이미지 전체 분류 |
| **Segmentation** | `yolo_segment.py` | 픽셀 마스크 | 객체의 정확한 경계 추출 |
| **Pose** | `yolo_pose.py` | 관절 좌표 | 사람의 자세/골격 추정 |

## 🚀 현재 사용 중인 기능

### Detection (객체 검출) ✅
- **자동 실행**: FastAPI 서버와 파일 감시 스크립트 실행 시 자동으로 동작
- **검출 대상**: **모든 객체** (사람, 자동차, 개, 고양이, 버스, 의자 등 80개 클래스)
- **출력**: 
  - `save/` 폴더에 바운딩 박스가 그려진 이미지 (`*-detected.jpg`)
  - 각 객체의 클래스명과 신뢰도 표시

## 📦 필요한 모델 파일

모든 모델은 `data/` 폴더에 위치해야 합니다:

```
app/yolo/data/
├── yolo11n.pt        ✅ (Detection - 이미 설치됨)
├── yolo11n-cls.pt    ✅ (Classification - 설치됨)
├── yolo11n-seg.pt    ✅ (Segmentation - 설치됨)
└── yolo11n-pose.pt   ✅ (Pose - 설치됨)
```

## 🎯 사용 방법

### 1️⃣ 자동 실행 (현재 사용 중)

**터미널 1: FastAPI 서버 실행**
```bash
cd cv.aiion.site
conda activate py312
uvicorn main:app --reload --port 8000
```

**터미널 2: 파일 감시 스크립트 실행**
```bash
cd cv.aiion.site
conda activate py312
python app/yolo/main.py watch
```

→ 이제 Next.js에서 이미지를 업로드하면:
1. `data/` 폴더에 이미지 저장
2. 자동으로 **모든 객체** 검출
3. `save/` 폴더에 결과 저장 (`*-detected.jpg`)

### 2️⃣ 수동 실행

#### Detection (객체 검출)
```bash
# data 폴더의 모든 이미지에서 모든 객체 검출
python app/yolo/yolo_detection.py
```

#### Classification (이미지 분류)
```bash
# data 폴더의 모든 이미지 분류 (상위 5개 클래스)
python app/yolo/yolo_class.py
```

#### Segmentation (세그멘테이션)
```bash
# data 폴더의 모든 이미지에서 객체 경계 추출
python app/yolo/yolo_segment.py
```

#### Pose (자세 추정)
```bash
# data 폴더의 모든 이미지에서 사람의 골격 추출
python app/yolo/yolo_pose.py
```

## 📊 검출 가능한 객체 (COCO 데이터셋 80개 클래스)

### 사람 & 동물
- person (사람), cat (고양이), dog (개), horse (말), sheep (양), cow (소), elephant (코끼리), bear (곰), zebra (얼룩말), giraffe (기린)

### 차량
- car (자동차), truck (트럭), bus (버스), motorcycle (오토바이), bicycle (자전거), airplane (비행기), train (기차), boat (보트)

### 가구 & 생활용품
- chair (의자), couch (소파), bed (침대), dining table (식탁), potted plant (화분), clock (시계), vase (꽃병)

### 전자기기
- tv (텔레비전), laptop (노트북), mouse (마우스), remote (리모컨), keyboard (키보드), cell phone (휴대폰)

### 음식
- banana (바나나), apple (사과), orange (오렌지), pizza (피자), cake (케이크), sandwich (샌드위치), hot dog (핫도그)

### 스포츠용품
- sports ball (공), baseball bat (야구 방망이), tennis racket (테니스 라켓), skateboard (스케이트보드), surfboard (서핑보드)

### 기타 (총 80개 클래스)

## 🔧 Detection 모드 변경

### 모든 객체 검출 (현재 설정) ✅
```python
process_image_file(image_path, detect_all_objects=True)
```

### 사람만 검출
```python
process_image_file(image_path, detect_all_objects=False)
```

## 📁 폴더 구조

```
app/yolo/
├── data/                    # 원본 이미지 & 모델 파일
│   ├── yolo11n.pt
│   ├── yolo11n-cls.pt
│   ├── yolo11n-seg.pt
│   ├── yolo11n-pose.pt
│   └── [업로드된 이미지들]
├── save/                    # 처리 결과 저장
│   ├── *-detected.jpg       # Detection 결과
│   ├── *-segmented.jpg      # Segmentation 결과
│   ├── *-mask.jpg           # Segmentation 마스크
│   ├── *-pose.jpg           # Pose 결과
│   └── *_classification.txt # Classification 결과
├── yolo_detection.py        # 객체 검출
├── yolo_class.py            # 이미지 분류
├── yolo_segment.py          # 세그멘테이션
├── yolo_pose.py             # 자세 추정
└── main.py                  # 파일 감시 & 자동 처리
```

## 💡 예제 출력

### Detection 출력:
```
검출된 객체 개수: 5

검출된 객체 목록:
  1. person (신뢰도: 95.32%)
  2. car (신뢰도: 89.45%)
  3. dog (신뢰도: 87.21%)
  4. bicycle (신뢰도: 76.54%)
  5. backpack (신뢰도: 65.32%)
```

### Classification 출력:
```
[분류 결과]
이미지: bus.jpg
------------------------------------------------------------
  1. bus: 94.32%
  2. truck: 3.21%
  3. car: 1.54%
  4. train: 0.65%
  5. van: 0.28%
```

### Segmentation 출력:
```
검출된 객체 수: 3
  1. person (신뢰도: 95.32%, 마스크 영역: 45823 픽셀)
  2. dog (신뢰도: 89.12%, 마스크 영역: 28934 픽셀)
  3. chair (신뢰도: 78.45%, 마스크 영역: 12456 픽셀)
```

### Pose 출력:
```
사람 1:
  nose: (324, 156), 신뢰도: 98.23%
  left_shoulder: (289, 234), 신뢰도: 96.54%
  right_shoulder: (359, 238), 신뢰도: 95.87%
  left_wrist: (245, 412), 신뢰도: 89.32%
  right_wrist: (403, 418), 신뢰도: 91.45%
```

## 🎨 결과 시각화

- **Detection**: 다양한 색상의 바운딩 박스 + 클래스명 라벨
- **Classification**: 텍스트 파일로 결과 저장
- **Segmentation**: 컬러 마스크 오버레이 + 바운딩 박스
- **Pose**: 관절 점(초록색) + 스켈레톤 라인(파란색)

## 🔗 통합 플로우

```
사용자가 이미지 업로드 (Next.js)
        ↓
FastAPI가 data/에 저장
        ↓
파일 감시 스크립트 감지
        ↓
YOLO Detection 자동 실행 (모든 객체)
        ↓
save/에 결과 저장 (*-detected.jpg)
        ↓
Portfolio 페이지에서 확인
```

## 📝 주의사항

1. **모델 파일**: 각 기능을 사용하려면 해당 모델 파일이 `data/` 폴더에 있어야 합니다.
2. **성능**: Segmentation과 Pose는 Detection보다 처리 시간이 더 걸립니다.
3. **GPU**: CUDA가 설치되어 있으면 자동으로 GPU를 사용합니다.
4. **파일 감시**: `main.py watch` 실행 시 실시간으로 새 이미지를 자동 처리합니다.

## 🚀 다음 단계

- [ ] 웹 인터페이스에서 Detection/Segmentation/Pose 선택 가능하도록 UI 추가
- [ ] 여러 기능을 동시에 실행하여 비교
- [ ] 검출된 객체별로 통계 제공
- [ ] 비디오 처리 기능 추가

