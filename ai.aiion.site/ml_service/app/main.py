"""
Titanic Service - FastAPI 애플리케이션
"""

import sys
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import RedirectResponse

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import (
    LoggingMiddleware,
    setup_logging,
    SERVICE_NAME,
    SERVICE_VERSION,
    PORT,
    LOG_LEVEL,
    LOG_FORMAT
)
from app.titanic.titanic_router import router as titanic_router
from app.diary_emotion.diary_emotion_router import router as diary_emotion_router
from app.diary_mbti.router import router as diary_mbti_router
from app.seoul_crime.seoul_router import router as seoul_crime_router
from app.us_unemployment.router import router as us_unemployment_router
from app.nlp_service.nlp_router import router as nlp_router

# 로깅 설정
logger = setup_logging(SERVICE_NAME, LOG_LEVEL, LOG_FORMAT)

# FastAPI 앱 생성
# root_path 설정: API Gateway를 통한 접근 시 경로 인식
root_path = os.getenv("ROOT_PATH", "")
app = FastAPI(
    title="ML Service API",
    description="머신러닝 서비스 API 문서 (타이타닉 데이터, 일기 감정 분류, 일기 MBTI 분류, 서울 범죄 데이터, 미국 실업률 데이터, NLTK 자연어 처리)",
    version=SERVICE_VERSION,
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

# CORS 설정 제거 - 게이트웨이가 모든 CORS를 처리하므로 백엔드 서비스에서는 제거
# 프록시/파사드 패턴: 프론트엔드 -> 게이트웨이 -> 백엔드 서비스
# 게이트웨이만 CORS를 처리하고, 백엔드 서비스는 게이트웨이를 통해서만 접근

# 미들웨어 추가
app.add_middleware(LoggingMiddleware)

# 라우터 포함
app.include_router(titanic_router)
app.include_router(diary_emotion_router)
app.include_router(diary_mbti_router)
app.include_router(seoul_crime_router)
app.include_router(us_unemployment_router)
app.include_router(nlp_router)

# /passengers 엔드포인트 (라우터의 빈 경로가 작동하지 않아 직접 추가)
@app.get("/passengers")
async def get_all_passengers():
    """모든 승객 조회"""
    from pathlib import Path
    import csv
    
    csv_file_path = Path(__file__).parent / "titanic" / "train.csv"
    passengers = []
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                passengers.append({
                    "PassengerId": row.get("PassengerId", ""),
                    "Survived": row.get("Survived", ""),
                    "Pclass": row.get("Pclass", ""),
                    "Name": row.get("Name", ""),
                    "Sex": row.get("Sex", ""),
                    "Age": row.get("Age", ""),
                    "SibSp": row.get("SibSp", ""),
                    "Parch": row.get("Parch", ""),
                    "Ticket": row.get("Ticket", ""),
                    "Fare": row.get("Fare", ""),
                    "Cabin": row.get("Cabin", ""),
                    "Embarked": row.get("Embarked", "")
                })
        return {
            "count": len(passengers),
            "passengers": passengers
        }
    except FileNotFoundError:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="승객 데이터 파일을 찾을 수 없습니다.")


@app.get("/")
async def root():
    """루트 엔드포인트 - API 문서로 리다이렉트"""
    return RedirectResponse(url="/docs")


# 엔드포인트는 router.py로 이동했으므로 제거
# 라우터에서 처리: /passengers/top10, /passengers/top10/print 등


@app.on_event("startup")
async def startup_event():
    """서비스 시작 시 실행"""
    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started")
    # 타이타닉 승객 정보 출력 제거 (터미널 출력 불필요)


@app.on_event("shutdown")
async def shutdown_event():
    """서비스 종료 시 실행"""
    logger.info(f"{SERVICE_NAME} shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, root_path=root_path)
