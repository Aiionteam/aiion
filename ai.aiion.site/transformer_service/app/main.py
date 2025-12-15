"""
Transformer Service Main
FastAPI 애플리케이션 진입점
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# root_path 설정: API Gateway를 통한 접근 시 경로 인식
root_path = os.getenv("ROOT_PATH", "")

app = FastAPI(
    title="Transformer Service API",
    version="1.0.0",
    description="Transformer 기반 AI 서비스 API",
    root_path=root_path,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{root_path}/openapi.json" if root_path else "/openapi.json"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Gateway를 통한 접근 시 서버 URL 설정
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    if root_path:
        openapi_schema["servers"] = [
            {"url": root_path, "description": "API Gateway"},
            {"url": "", "description": "Direct access"}
        ]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Review 라우터 추가
from app.review.review_router import router as review_router
app.include_router(review_router)

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Transformer Service",
        "version": "1.0.0",
        "endpoints": {
            "review": "/review",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    """헬스 체크"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9008, root_path=root_path)
