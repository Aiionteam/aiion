from fastapi import FastAPI, APIRouter  # type: ignore
import uvicorn  # type: ignore

app = FastAPI(title="Crawler Service API")

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
    uvicorn.run(app, host="0.0.0.0", port=9003)
