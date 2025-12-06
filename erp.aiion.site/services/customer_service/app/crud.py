"""
데이터베이스 CRUD (Create, Read, Update, Delete) 작업
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, text
from typing import List, Tuple

import models, schemas


async def create_inventory_item(db: AsyncSession, item: schemas.InventoryItemCreate) -> models.InventoryItem:
    """
    새로운 재고 항목을 생성합니다.
    수량에 따라 상태를 자동으로 설정합니다.
    """
    item_data = item.model_dump()
    
    # 상태가 명시되지 않았거나 'available'인 경우, 수량에 따라 자동 설정
    if not item_data.get('status') or item_data.get('status') == 'available':
        quantity = item_data.get('quantity', 0)
        if quantity == 0:
            item_data['status'] = 'out_of_stock'
        elif quantity < 20:
            item_data['status'] = 'low_stock'
        else:
            item_data['status'] = 'available'
    
    db_item = models.InventoryItem(**item_data)
    db.add(db_item)
    await db.flush()  # ID를 얻기 위해 flush
    
    # prepared statement 캐시 문제를 피하기 위해 refresh 대신 직접 조회
    try:
        result = await db.execute(
            select(models.InventoryItem).filter(models.InventoryItem.id == db_item.id)
        )
        refreshed_item = result.scalars().first()
        if refreshed_item:
            db_item = refreshed_item
    except Exception as e:
        # 캐시 문제 발생 시 잠시 대기 후 재시도
        if "InvalidCachedStatementError" in str(type(e).__name__) or "cached statement" in str(e).lower():
            await asyncio.sleep(0.1)
            try:
                result = await db.execute(
                    select(models.InventoryItem).filter(models.InventoryItem.id == db_item.id)
                )
                refreshed_item = result.scalars().first()
                if refreshed_item:
                    db_item = refreshed_item
            except Exception:
                # 재시도 실패해도 flush된 db_item은 유효하므로 그대로 반환
                pass
        # refresh 실패해도 flush된 db_item은 유효하므로 그대로 반환
    
    return db_item


async def get_inventory_items(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    category: str | None = None,
    status: str | None = None,
    location: str | None = None,
    quantity_min: int | None = None,
    quantity_max: int | None = None,
    order_by: str = 'desc',  # 'desc' 또는 'asc'
) -> Tuple[List[models.InventoryItem], int]:
    """
    재고 항목 목록을 조회합니다. 필터링 및 페이징을 지원합니다.
    """
    query = select(models.InventoryItem)
    count_query = select(models.InventoryItem.id)

    if name:
        query = query.filter(models.InventoryItem.name.ilike(f"%{name}%"))
        count_query = count_query.filter(models.InventoryItem.name.ilike(f"%{name}%"))
    if category:
        query = query.filter(models.InventoryItem.category.ilike(f"%{category}%"))
        count_query = count_query.filter(models.InventoryItem.category.ilike(f"%{category}%"))
    if status:
        query = query.filter(models.InventoryItem.status == status)
        count_query = count_query.filter(models.InventoryItem.status == status)
    if location:
        query = query.filter(models.InventoryItem.location.ilike(f"%{location}%"))
        count_query = count_query.filter(models.InventoryItem.location.ilike(f"%{location}%"))
    if quantity_min is not None:
        query = query.filter(models.InventoryItem.quantity >= quantity_min)
        count_query = count_query.filter(models.InventoryItem.quantity >= quantity_min)
    if quantity_max is not None:
        query = query.filter(models.InventoryItem.quantity <= quantity_max)
        count_query = count_query.filter(models.InventoryItem.quantity <= quantity_max)

    # 총 개수 조회
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    # 데이터 조회 (정렬 순서에 따라)
    if order_by == 'desc':
        result = await db.execute(
            query.order_by(models.InventoryItem.id.desc()).offset(skip).limit(limit)
        )
    else:  # 기본값: asc (오름차순)
        result = await db.execute(
            query.order_by(models.InventoryItem.id.asc()).offset(skip).limit(limit)
        )
    items = result.scalars().all()
    return items, total


async def get_inventory_item(db: AsyncSession, item_id: int) -> models.InventoryItem | None:
    """
    특정 ID의 재고 항목을 조회합니다.
    """
    try:
        result = await db.execute(
            select(models.InventoryItem).filter(models.InventoryItem.id == item_id)
        )
        return result.scalars().first()
    except Exception as e:
        # prepared statement 캐시 문제 발생 시 재시도
        if "InvalidCachedStatementError" in str(type(e).__name__) or "cached statement" in str(e).lower():
            # AsyncSession에서는 expire_all() 대신 잠시 대기 후 재시도
            await asyncio.sleep(0.1)
            result = await db.execute(
                select(models.InventoryItem).filter(models.InventoryItem.id == item_id)
            )
            return result.scalars().first()
        else:
            raise


async def update_inventory_item(
    db: AsyncSession, item_id: int, item: schemas.InventoryItemUpdate
) -> models.InventoryItem | None:
    """
    특정 ID의 재고 항목을 업데이트합니다.
    """
    # 업데이트할 필드만 추출
    update_data = item.model_dump(exclude_unset=True)
    if not update_data:
        return await get_inventory_item(db, item_id) # 변경 사항 없으면 현재 객체 반환

    stmt = (
        update(models.InventoryItem)
        .where(models.InventoryItem.id == item_id)
        .values(**update_data)
        .returning(models.InventoryItem)  # 업데이트된 객체를 반환하도록 설정
    )
    result = await db.execute(stmt)
    updated_item = result.scalars().first()

    if updated_item:
        # prepared statement 캐시 문제를 피하기 위해 refresh를 try-except로 감싸기
        try:
            await db.refresh(updated_item) # 최신 상태로 새로고침
        except Exception as e:
            # 캐시 문제 발생 시 세션을 expire하고 재시도
            if "InvalidCachedStatementError" in str(type(e).__name__) or "cached statement" in str(e).lower():
                await db.expire_all()
                import asyncio
                await asyncio.sleep(0.1)
                try:
                    await db.refresh(updated_item)
                except Exception:
                    # refresh 실패해도 updated_item은 이미 반환값이므로 그대로 사용
                    pass
            else:
                raise
    return updated_item


async def delete_inventory_item(db: AsyncSession, item_id: int) -> bool:
    """
    특정 ID의 재고 항목을 삭제합니다.
    """
    stmt = delete(models.InventoryItem).where(models.InventoryItem.id == item_id)
    result = await db.execute(stmt)
    return result.rowcount > 0


async def get_inventory_statistics(db: AsyncSession) -> dict:
    """
    재고 통계를 계산합니다.
    데이터베이스에서 직접 집계하여 효율적으로 계산합니다.
    """
    # 전체 재고 수량 합계 (품절 제외, 실제 판매 가능한 재고만)
    total_quantity_result = await db.execute(
        select(func.sum(models.InventoryItem.quantity))
        .where(models.InventoryItem.quantity > 0)
    )
    total_quantity = int(total_quantity_result.scalar() or 0)
    
    # 전체 항목 개수
    total_items_result = await db.execute(
        select(func.count(models.InventoryItem.id))
    )
    total_items = int(total_items_result.scalar() or 0)
    
    # 재고 있음: 수량 >= 20
    in_stock_result = await db.execute(
        select(func.count(models.InventoryItem.id))
        .where(models.InventoryItem.quantity >= 20)
    )
    in_stock_count = int(in_stock_result.scalar() or 0)
    
    # 재고 부족: 0 < 수량 < 20
    low_stock_result = await db.execute(
        select(func.count(models.InventoryItem.id))
        .where(models.InventoryItem.quantity > 0)
        .where(models.InventoryItem.quantity < 20)
    )
    low_stock_count = int(low_stock_result.scalar() or 0)
    
    # 품절: 수량 = 0
    out_of_stock_result = await db.execute(
        select(func.count(models.InventoryItem.id))
        .where(models.InventoryItem.quantity == 0)
    )
    out_of_stock_count = int(out_of_stock_result.scalar() or 0)
    
    return {
        "total_quantity": total_quantity,
        "in_stock_count": in_stock_count,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "total_items": total_items,
    }

