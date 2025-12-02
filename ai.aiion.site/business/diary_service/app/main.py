from fastapi import FastAPI, APIRouter  # type: ignore
import uvicorn  # type: ignore

app = FastAPI(
    title="Diary Service API",
    version="1.0.0",
    description="일기 서비스 API"
)

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9002)
