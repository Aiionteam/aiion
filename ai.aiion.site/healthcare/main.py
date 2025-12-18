"""
건강 데이터 ML 서비스 메인 앱
"""
from fastapi import FastAPI  # type: ignore
import uvicorn  # type: ignore
import os
import sys

# UTF-8 인코딩 강제 설정
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# healthcare_router import
from healthcare_router import healthcare_router

# FastAPI 앱 생성
app = FastAPI(
    title="Healthcare ML Service API",
    version="1.0.0",
    description="건강 데이터 기반 진료과 및 병명 예측 ML 서비스"
)

# 라우터 등록
app.include_router(healthcare_router)

# 루트 엔드포인트
@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "healthcare-ml-service",
        "version": "1.0.0",
        "description": "건강 데이터 기반 진료과 및 병명 예측 ML 서비스"
    }


if __name__ == "__main__":
    # 환경변수로 포트 설정 가능 (기본값: 9005)
    port = int(os.getenv("PORT", 9005))
    uvicorn.run(app, host="0.0.0.0", port=port)

