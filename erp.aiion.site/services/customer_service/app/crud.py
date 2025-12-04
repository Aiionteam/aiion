"""
데이터베이스 CRUD (Create, Read, Update, Delete) 작업
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Tuple

import models, schemas


async def create_inventory_item(db: AsyncSession, item: schemas.InventoryItemCreate) -> models.InventoryItem:
    """
    새로운 재고 항목을 생성합니다.
    """
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    await db.flush()  # ID를 얻기 위해 flush
    await db.refresh(db_item)
    return db_item


async def get_inventory_items(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    category: str | None = None,
    status: str | None = None,
    location: str | None = None,
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

    # 총 개수 조회
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())

    # 데이터 조회
    result = await db.execute(query.offset(skip).limit(limit))
    items = result.scalars().all()
    return items, total


async def get_inventory_item(db: AsyncSession, item_id: int) -> models.InventoryItem | None:
    """
    특정 ID의 재고 항목을 조회합니다.
    """
    result = await db.execute(
        select(models.InventoryItem).filter(models.InventoryItem.id == item_id)
    )
    return result.scalars().first()


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
        await db.refresh(updated_item) # 최신 상태로 새로고침
    return updated_item


async def delete_inventory_item(db: AsyncSession, item_id: int) -> bool:
    """
    특정 ID의 재고 항목을 삭제합니다.
    """
    stmt = delete(models.InventoryItem).where(models.InventoryItem.id == item_id)
    result = await db.execute(stmt)
    return result.rowcount > 0

