import os
from pathlib import Path

# 프로젝트 루트: app/diffusers/
# __file__ = app/diffusers/core/config.py
# parents[1] = app/diffusers/
BASE_DIR = Path(__file__).resolve().parents[1]

OUTPUTS_DIR = BASE_DIR / "outputs"
IMAGES_DIR = OUTPUTS_DIR / "images"
META_DIR = OUTPUTS_DIR / "metadata"

# 로컬 모델 경로 (app/diffusers/model/)
LOCAL_MODEL_DIR = BASE_DIR / "model"

# 모델 캐시 위치 (원하면 바꾸세요)
HF_CACHE_DIR = Path(os.getenv("HF_HOME", str(BASE_DIR / ".hf_cache")))

# RTX 4060 8GB 최적화: SDXL 기본
# 1. 환경변수 MODEL_ID 우선
# 2. 로컬 모델 폴더 자동 인식 (model/model_index.json 존재 + 올바른 구조 확인)
# 3. 기본값: Hugging Face 모델
MODEL_ID_ENV = os.getenv("MODEL_ID")
if MODEL_ID_ENV:
    MODEL_ID = MODEL_ID_ENV
elif (LOCAL_MODEL_DIR / "model_index.json").exists():
    # 로컬 모델 형식 확인
    # 1. 단일 safetensors 파일 형식 (sd_xl_base_1.0.safetensors, sdxl.vae.safetensors)
    has_unet_file = (LOCAL_MODEL_DIR / "sd_xl_base_1.0.safetensors").exists()
    has_vae_file = (LOCAL_MODEL_DIR / "sdxl.vae.safetensors").exists()
    
    # 2. 표준 diffusers 형식 (서브모델 폴더)
    has_text_encoder = (LOCAL_MODEL_DIR / "text_encoder").exists()
    has_unet = (LOCAL_MODEL_DIR / "unet").exists()
    has_vae = (LOCAL_MODEL_DIR / "vae").exists()
    
    if has_unet_file and has_vae_file:
        # 단일 safetensors 파일 형식
        MODEL_ID = str(LOCAL_MODEL_DIR)
        print(f"📁 로컬 모델 감지 (단일 safetensors 형식): {MODEL_ID}")
    elif has_text_encoder and has_unet and has_vae:
        # 표준 diffusers 형식
        MODEL_ID = str(LOCAL_MODEL_DIR)
        print(f"📁 로컬 모델 감지 (표준 diffusers 형식): {MODEL_ID}")
    else:
        # 구조가 올바르지 않음 - Hugging Face 모델 사용
        MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
        print(f"⚠️  로컬 모델 구조가 올바르지 않습니다.")
        print(f"   단일 파일 형식: sd_xl_base_1.0.safetensors, sdxl.vae.safetensors")
        print(f"   또는 표준 형식: text_encoder/, unet/, vae/ 폴더")
        print(f"   Hugging Face 모델 사용: {MODEL_ID}")
else:
    MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"

# 디바이스/정밀도
DEVICE = os.getenv("DEVICE", "cuda")  # cuda / cpu
DTYPE = os.getenv("DTYPE", "float16")  # float16 권장 (VRAM 절약, xformers와 호환)

# RTX 4060 8GB 안전 기본값 (SDXL 기준)
DEFAULT_WIDTH = int(os.getenv("DEFAULT_WIDTH", "1024"))  # SDXL 최적 해상도
DEFAULT_HEIGHT = int(os.getenv("DEFAULT_HEIGHT", "1024"))
DEFAULT_STEPS = int(os.getenv("DEFAULT_STEPS", "25"))  # 품질과 속도 균형
DEFAULT_GUIDANCE = float(os.getenv("DEFAULT_GUIDANCE", "7.0"))  # SDXL 권장값

# Refiner 설정 (디테일 향상용)
# Refiner strength: 0.25~0.3 → 디테일 살리면서 원본 유지
DEFAULT_REFINER_STRENGTH = float(os.getenv("DEFAULT_REFINER_STRENGTH", "0.3"))  # 권장값: 0.25~0.3
USE_REFINER = os.getenv("USE_REFINER", "true").lower() == "true"  # Refiner 사용 여부 (기본값: true)

# OOM 방지 상한 (8GB 기준, SDXL, attention slicing 사용)
# 1280x1280은 8GB에서 OOM 발생 가능하므로 1024로 제한
MAX_WIDTH = int(os.getenv("MAX_WIDTH", "1024"))  # 1024x1024까지 안전
MAX_HEIGHT = int(os.getenv("MAX_HEIGHT", "1024"))
MAX_STEPS = int(os.getenv("MAX_STEPS", "50"))  # 고품질 생성 시 최대

# 동시성 제한 (8GB도 1이 운영적으로 안전, 메모리 누수 방지)
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "1"))

# 타임아웃 (초)
GENERATION_TIMEOUT = int(os.getenv("GENERATION_TIMEOUT", "300"))  # 5분

# Scheduler 설정
# "euler" (기본), "dpm++" (Karras 조합, 고품질)
SCHEDULER_TYPE = os.getenv("SCHEDULER_TYPE", "dpm++")  # euler 또는 dpm++
USE_KARRAS = os.getenv("USE_KARRAS", "true").lower() == "true"  # Karras 시그마 스케줄 사용

# URL prefix (리버스프록시/도메인 붙이면 사용)
PUBLIC_IMAGE_BASE = os.getenv("PUBLIC_IMAGE_BASE", "/outputs/images")
PUBLIC_META_BASE = os.getenv("PUBLIC_META_BASE", "/outputs/metadata")