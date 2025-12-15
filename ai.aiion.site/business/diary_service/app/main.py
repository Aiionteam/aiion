from fastapi import FastAPI, APIRouter  # type: ignore
import uvicorn  # type: ignore
import os

# root_path 설정: API Gateway를 통한 접근 시 경로 인식
root_path = os.getenv("ROOT_PATH", "")

app = FastAPI(
    title="Diary Service API",
    version="1.0.0",
    description="일기 서비스 API",
    root_path=root_path,  # API Gateway 경로 설정
    docs_url="/docs",  # Swagger UI 경로 명시
    redoc_url="/redoc",  # ReDoc 경로 명시
    openapi_url=f"{root_path}/openapi.json" if root_path else "/openapi.json"  # OpenAPI JSON 경로 (절대 경로)
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
    # 서버 URL 설정 (API Gateway 경로 포함)
    if root_path:
        openapi_schema["servers"] = [
            {"url": root_path, "description": "API Gateway"},
            {"url": "", "description": "Direct access"}
        ]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# 서브 라우터 생성
diary_router = APIRouter(prefix="/diary", tags=["diary"])

@diary_router.get("/diaries")
def get_diaries():
    """
    일기 목록 조회 API
    
    - **반환**: 일기 목록
    """
    return {"diaries": []}

# 서브 라우터를 앱에 포함
app.include_router(diary_router)

# MBTI 라우터 추가
from diary_mbti.router import router as diary_mbti_router
app.include_router(diary_mbti_router)

# Emotion 라우터 추가
from diary_emotion.diary_emotion_router import router as diary_emotion_router
app.include_router(diary_emotion_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9007, root_path=root_path)
