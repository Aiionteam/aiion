from fastapi import FastAPI, APIRouter  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import uvicorn  # type: ignore

# root_path 설정: API Gateway를 통한 접근 시 경로 인식
import os
root_path = os.getenv("ROOT_PATH", "")

app = FastAPI(
    title="Crawler Service API",
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
        version=app.version if hasattr(app, 'version') else "1.0.0",
        description=app.description if hasattr(app, 'description') else "Crawler Service API",
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

# CORS 설정 - 게이트웨이만 허용 (프론트엔드는 게이트웨이를 통해 접근)
# Spring Cloud Gateway가 이미 CORS를 처리하므로, 여기서는 게이트웨이만 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # 통합 API Gateway (로컬)
        "http://api-gateway:8080",  # Docker 내부 네트워크
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 동적 import로 오류 방지
try:
    from movie.movie import crawl_kmdb_movie_list  # type: ignore
except ImportError as e:
    print(f"Warning: movie.movie import failed: {e}")
    crawl_kmdb_movie_list = None

try:
    from netflix.netflix import crawl_netflix_movies  # type: ignore
except ImportError as e:
    print(f"Warning: netflix.netflix import failed: {e}")
    crawl_netflix_movies = None

# 서브 라우터 생성
crawler_router = APIRouter(prefix="/crawler", tags=["crawler"])

@crawler_router.get("/crawl")
def crawl():
    """
    크롤링 실행 API
    
    - **반환**: 크롤링 결과
    """
    return {"message": "크롤링 완료", "staus": "running"}

@crawler_router.get("/movie")
def movie():
    """
    KMDB 뉴욕타임즈 21세기 영화 100선 크롤링 API
    
    - **반환**: 영화 데이터 (순위, 제목, 감독, 제작년도, 링크)
    """
    movie_data = crawl_kmdb_movie_list()
    return {
        "status": "success",
        "count": len(movie_data),
        "data": movie_data
    }

@crawler_router.get("/netflix")
def netflix():
    """
    JustWatch Netflix 영화 산업 목록 크롤링 API
    
    - **반환**: Netflix 영화 데이터 (제목, 타입, 링크, 이미지)
    """
    if crawl_netflix_movies is None:
        return {
            "status": "error",
            "message": "Netflix crawler module not available",
            "count": 0,
            "data": []
        }
    
    try:
        movie_data = crawl_netflix_movies()
        return {
            "status": "success",
            "count": len(movie_data),
            "data": movie_data
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "count": 0,
            "data": []
        }

# 서브 라우터를 앱에 포함
app.include_router(crawler_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9003, root_path=root_path)
