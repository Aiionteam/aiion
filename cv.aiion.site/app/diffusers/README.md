# Stable Diffusion SDXL API
## RTX 4060 8GB 최적화 버전

SDXL 모델을 사용한 텍스트-이미지 생성 API입니다. RTX 4060 8GB VRAM 환경에 최적화되어 있습니다.

## 주요 최적화 사항

### 1. 메모리 최적화
- ✅ **xFormers** 메모리 효율적 어텐션 (가장 중요!)
- ✅ **VAE Tiling** 고해상도 안정화
- ✅ **Float16** 정밀도 (VRAM 50% 절약)
- ✅ **Attention Slicing** (xFormers 실패 시 대체)

### 2. 안전한 파라미터 제한
- **해상도**: 기본 1024x1024, 최대 1280x1280
- **샘플링 스텝**: 기본 25, 최대 50
- **CFG Scale**: 기본 7.0 (SDXL 권장 5-9)
- **동시성**: 1 (OOM 방지)

### 3. 모델 설정
- 기본 모델: `stabilityai/stable-diffusion-xl-base-1.0`
- 환경변수 `MODEL_ID`로 커스텀 모델 경로 변경 가능
- 로컬 모델 사용 예: `MODEL_ID=/path/to/your/model`

## 설치 방법

### 1. 필수 패키지 설치
```bash
cd cv.aiion.site/app/diffusers
pip install -r requirements.txt
```

### 2. 로컬 모델 사용 (권장)
로컬에 SDXL 모델이 있는 경우, `app/diffusers/model/` 폴더에 배치하면 자동으로 인식됩니다.

**로컬 모델 구조:**
```
app/diffusers/model/
├── model_index.json      # 필수
├── sd_xl_base_1.0.safetensors
├── sd_xl_refiner_1.0.safetensors
├── sdxl.vae.safetensors
└── config.json
```

**자동 인식 우선순위:**
1. 환경변수 `MODEL_ID` (최우선)
2. `app/diffusers/model/` 폴더의 로컬 모델 (자동 감지)
3. Hugging Face 모델 (기본값)

**로컬 모델 인식 테스트:**
```bash
cd cv.aiion.site/app/diffusers
python test_local_model.py
```

## 실행 방법

### 방법 1: uvicorn 직접 실행
```bash
cd cv.aiion.site
conda activate diffuser  # 또는 적절한 가상환경
uvicorn app.diffusers.main:app --host 0.0.0.0 --port 8001 --reload
```

### 방법 2: 환경변수와 함께 실행
```bash
MODEL_ID=stabilityai/stable-diffusion-xl-base-1.0 \
DEVICE=cuda \
DTYPE=float16 \
uvicorn app.diffusers.main:app --host 0.0.0.0 --port 8001
```

## API 사용법

### 1. 기본 요청 (txt2img)
```bash
curl -X POST http://localhost:8001/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful landscape with mountains and a lake, sunset, highly detailed",
    "negative_prompt": "blurry, low quality, distorted",
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "guidance_scale": 7.0,
    "seed": 42
  }'
```

### 2. 응답 예시
```json
{
  "id": "a1b2c3d4e5f6...",
  "image_url": "/outputs/images/a1b2c3d4e5f6.png",
  "meta_url": "/outputs/metadata/a1b2c3d4e5f6.json",
  "meta": {
    "model_id": "stabilityai/stable-diffusion-xl-base-1.0",
    "prompt": "...",
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "guidance_scale": 7.0,
    "seed": 42,
    "device": "cuda"
  }
}
```

### 3. 이미지 접근
생성된 이미지는 다음 URL로 접근 가능:
- 이미지: `http://localhost:8001/outputs/images/{id}.png`
- 메타데이터: `http://localhost:8001/outputs/metadata/{id}.json`

## API 엔드포인트

### `GET /`
API 상태 확인

### `GET /health`
헬스 체크 (CUDA 사용 가능 여부 포함)

### `POST /api/v1/generate`
텍스트로부터 이미지 생성

**Request Body:**
```json
{
  "prompt": "string (필수)",
  "negative_prompt": "string (선택)",
  "width": "integer (선택, 기본 1024)",
  "height": "integer (선택, 기본 1024)",
  "steps": "integer (선택, 기본 25)",
  "guidance_scale": "float (선택, 기본 7.0)",
  "seed": "integer (선택, 랜덤)"
}
```

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `MODEL_ID` | `stabilityai/stable-diffusion-xl-base-1.0` | SDXL 모델 ID 또는 경로 |
| `DEVICE` | `cuda` | 디바이스 (cuda/cpu) |
| `DTYPE` | `float16` | 정밀도 (float16/float32) |
| `DEFAULT_WIDTH` | `1024` | 기본 이미지 너비 |
| `DEFAULT_HEIGHT` | `1024` | 기본 이미지 높이 |
| `DEFAULT_STEPS` | `25` | 기본 샘플링 스텝 |
| `DEFAULT_GUIDANCE` | `7.0` | 기본 CFG Scale |
| `MAX_WIDTH` | `1280` | 최대 이미지 너비 |
| `MAX_HEIGHT` | `1280` | 최대 이미지 높이 |
| `MAX_STEPS` | `50` | 최대 샘플링 스텝 |
| `MAX_CONCURRENCY` | `1` | 최대 동시 생성 수 |

## 메모리 사용량

### RTX 4060 8GB 기준
- **1024x1024, 25 steps**: 약 6-7GB VRAM
- **1280x1280, 50 steps**: 약 7-8GB VRAM

### OOM 발생 시 대처
1. 해상도 낮추기 (768x768)
2. 스텝 수 줄이기 (15-20)
3. `pipeline_manager.py`에서 `enable_model_cpu_offload()` 활성화

## 프론트엔드 연동

### Next.js에서 사용 예시
```typescript
const response = await fetch("http://localhost:8001/api/v1/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: prompt,
    negative_prompt: negativePrompt,
    width: 1024,
    height: 1024,
    steps: 25,
    guidance_scale: 7.0,
  }),
});

const data = await response.json();
const imageUrl = `http://localhost:8001${data.image_url}`;
```

## 트러블슈팅

### 1. CUDA out of memory
- 해상도를 768x768로 낮추기
- 스텝 수를 20 이하로 줄이기
- 다른 GPU 사용 프로그램 종료

### 2. 모델 다운로드 느림
- Hugging Face 계정 로그인: `huggingface-cli login`
- 로컬 모델 사용: `MODEL_ID=/path/to/model`

### 3. xFormers 오류
- PyTorch 버전 확인: `pip list | grep torch`
- xFormers 재설치: `pip install xformers --upgrade`

## 성능 최적화 팁

1. **첫 요청이 느림**: 모델 로딩 시간 (30초~1분)
2. **이후 요청**: 이미지당 10-30초 (해상도/스텝 수에 따름)
3. **서버 시작 시 모델 프리로드**: `main.py`의 `startup_event`에서 주석 해제

## 라이선스
- SDXL 모델: [Stability AI License](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
- 코드: 프로젝트 라이선스 참조

