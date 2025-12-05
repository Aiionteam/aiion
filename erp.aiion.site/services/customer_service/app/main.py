"""
재고 관리 서비스 FastAPI 애플리케이션
"""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
import uvicorn
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, init_db, engine
import crud, schemas, models

app = FastAPI(
    title="Inventory Management Service API",
    version="1.0.0",
    description="재고관리API"
)

# CORS는 API Gateway에서 처리하므로 여기서는 제거
# 모든 요청은 Gateway를 통해 들어오므로 Gateway의 CORS 설정이 적용됩니다

# 애플리케이션 시작 시 데이터베이스 초기화
@app.on_event("startup")
async def on_startup():
    await init_db()

# 애플리케이션 종료 시 데이터베이스 연결 종료
@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()

inventory_router = APIRouter(prefix="/inventory", tags=["inventory"])

@inventory_router.post("/items", response_model=schemas.InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item_api(item: schemas.InventoryItemCreate, db: AsyncSession = Depends(get_db)):
    """재고 항목 생성"""
    db_item = await crud.create_inventory_item(db=db, item=item)
    return db_item

@inventory_router.get("/items", response_model=schemas.InventoryListResponse)
async def read_inventory_items_api(
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    category: str | None = None,
    status: str | None = None,
    location: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """재고 목록 조회"""
    items, total = await crud.get_inventory_items(
        db=db, skip=skip, limit=limit, name=name, category=category, status=status, location=location
    )
    return {"items": items, "total": total, "message": "재고 목록 조회 성공"}

@inventory_router.get("/items/{item_id}", response_model=schemas.InventoryItemResponse)
async def read_inventory_item_api(item_id: int, db: AsyncSession = Depends(get_db)):
    """특정 재고 조회"""
    db_item = await crud.get_inventory_item(db=db, item_id=item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return db_item

@inventory_router.put("/items/{item_id}", response_model=schemas.InventoryItemResponse)
async def update_inventory_item_api(item_id: int, item: schemas.InventoryItemUpdate, db: AsyncSession = Depends(get_db)):
    """재고 항목 수정"""
    db_item = await crud.update_inventory_item(db=db, item_id=item_id, item=item)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return db_item

@inventory_router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item_api(item_id: int, db: AsyncSession = Depends(get_db)):
    """재고 항목 삭제"""
    success = await crud.delete_inventory_item(db=db, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"message": "재고 항목 삭제 성공"}

app.include_router(inventory_router)

@app.get("/health")
def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "inventory-management"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9002)

