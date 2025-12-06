"""
재고 관리 서비스 FastAPI 애플리케이션
"""
import asyncio
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
    # 엔진의 모든 연결을 dispose하여 prepared statement 캐시 초기화
    await engine.dispose()
    await init_db()

# 애플리케이션 종료 시 데이터베이스 연결 종료
@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()

inventory_router = APIRouter(prefix="/inventory", tags=["inventory"])

@inventory_router.post("/items", response_model=schemas.InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item_api(item: schemas.InventoryItemCreate, db: AsyncSession = Depends(get_db)):
    """재고 항목 생성"""
    try:
        db_item = await crud.create_inventory_item(db=db, item=item)
        # get_db()에서 자동으로 commit하므로 여기서는 commit 불필요
        # 하지만 명시적으로 flush하여 ID를 확보
        await db.flush()
        return db_item
    except Exception as e:
        # get_db()에서 자동으로 rollback하지만, 명시적으로 처리
        await db.rollback()
        # prepared statement 캐시 문제 발생 시 재시도
        if "InvalidCachedStatementError" in str(type(e).__name__) or "cached statement" in str(e).lower():
            # AsyncSession에서는 expire_all() 대신 잠시 대기 후 재시도
            await asyncio.sleep(0.1)
            try:
                db_item = await crud.create_inventory_item(db=db, item=item)
                await db.flush()
                return db_item
            except Exception as retry_error:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"재고 항목 생성 실패 (재시도 후): {str(retry_error)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"재고 항목 생성 실패: {str(e)}"
            )

@inventory_router.get("/items", response_model=schemas.InventoryListResponse)
async def read_inventory_items_api(
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    category: str | None = None,
    item_status: str | None = None,
    location: str | None = None,
    quantity_min: int | None = None,
    quantity_max: int | None = None,
    order_by: str = 'asc',
    db: AsyncSession = Depends(get_db)
):
    """재고 목록 조회"""
    max_retries = 2
    for attempt in range(max_retries):
        try:
            items, total = await crud.get_inventory_items(
                db=db, skip=skip, limit=limit, name=name, category=category, status=item_status, location=location,
                quantity_min=quantity_min, quantity_max=quantity_max, order_by=order_by
            )
            return {"items": items, "total": total, "message": "재고 목록 조회 성공"}
        except Exception as e:
            # 트랜잭션 중단 에러 또는 캐시 문제 발생 시 재시도
            error_str = str(e).lower()
            is_retryable = (
                "InvalidCachedStatementError" in str(type(e).__name__) or 
                "cached statement" in error_str or
                "transaction is aborted" in error_str or
                "commands ignored" in error_str
            )
            
            if is_retryable and attempt < max_retries - 1:
                # 트랜잭션 롤백 후 재시도
                await db.rollback()
                await asyncio.sleep(0.1 * (attempt + 1))  # 재시도마다 대기 시간 증가
                continue
            else:
                # 재시도 불가능하거나 최대 재시도 횟수 초과
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"재고 목록 조회 실패: {str(e)}"
                )

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

@inventory_router.get("/statistics", response_model=schemas.InventoryStatisticsResponse)
async def get_inventory_statistics_api(db: AsyncSession = Depends(get_db)):
    """재고 통계 조회"""
    statistics = await crud.get_inventory_statistics(db=db)
    return statistics

app.include_router(inventory_router)

@app.get("/health")
def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "inventory-management"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9006)

