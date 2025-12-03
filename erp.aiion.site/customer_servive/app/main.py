from fastapi import FastAPI, APIRouter  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import uvicorn  # type: ignore

app = FastAPI(
    title="Inventory Management Service API",
    version="1.0.0",
    description="재고관리API"
)

# CORS 설정 (API Gateway 및 프론트엔드 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://api-gateway:8080",
        "http://localhost:4000",  # 프론트엔드 개발 서버
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 재고관리 라우터 생성
inventory_router = APIRouter(prefix="/inventory", tags=["inventory"])

@inventory_router.get("/items")
def get_inventory_items():
    """
    재고 목록 조회 API
    
    - **반환**: 재고 목록
    """
    return {"items": [], "message": "재고 목록 조회 (구현 예정)"}

@inventory_router.get("/items/{item_id}")
def get_inventory_item(item_id: int):
    """
    특정 재고 조회 API
    
    - **item_id**: 재고 ID
    - **반환**: 재고 정보
    """
    return {"item_id": item_id, "message": "재고 조회 (구현 예정)"}

@inventory_router.post("/items")
def create_inventory_item():
    """
    재고 추가 API
    
    - **반환**: 생성된 재고 정보
    """
    return {"message": "재고 추가 (구현 예정)"}

@inventory_router.put("/items/{item_id}")
def update_inventory_item(item_id: int):
    """
    재고 수정 API
    
    - **item_id**: 재고 ID
    - **반환**: 수정된 재고 정보
    """
    return {"item_id": item_id, "message": "재고 수정 (구현 예정)"}

@inventory_router.delete("/items/{item_id}")
def delete_inventory_item(item_id: int):
    """
    재고 삭제 API
    
    - **item_id**: 재고 ID
    - **반환**: 삭제 결과
    """
    return {"item_id": item_id, "message": "재고 삭제 (구현 예정)"}

# 라우터를 앱에 포함
app.include_router(inventory_router)

# Health check
@app.get("/health")
def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "inventory-management"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9002)
