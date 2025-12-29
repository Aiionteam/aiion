from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.diffusers.api.v1.routes import generate
from app.diffusers.core.config import IMAGES_DIR, META_DIR

# FastAPI 앱 생성
app = FastAPI(
    title="Stable Diffusion SDXL API",
    description="RTX 4060 8GB 최적화된 SDXL 이미지 생성 API",
    version="1.0.0",
)

# CORS 설정 - Next.js에서 접근 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Next.js 개발 서버
        "http://localhost:3000",  # 다른 Next.js 포트
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(generate.router, prefix="/api/v1", tags=["Generate"])

# 정적 파일 서빙 (생성된 이미지)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
META_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/outputs/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
app.mount("/outputs/metadata", StaticFiles(directory=str(META_DIR)), name="metadata")

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 모델 프리로드 (선택적)"""
    print("=" * 60)
    print("🚀 Stable Diffusion SDXL API 시작")
    print(f"📁 이미지 저장 경로: {IMAGES_DIR}")
    print(f"📁 메타데이터 저장 경로: {META_DIR}")
    print("=" * 60)
    
    # 선택: 서버 시작 시 모델 미리 로드 (첫 요청 지연 방지)
    # from .services.diffusion.pipeline_manager import get_pipeline
    # print("🔄 모델 프리로딩...")
    # get_pipeline()
    # print("✅ 모델 로드 완료")

@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "status": "running",
        "message": "Stable Diffusion SDXL API is ready",
        "docs": "/docs",
    }

@app.get("/health")
async def health_check():
    """헬스 체크"""
    import torch
    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "cuda_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }

