"""
데이터베이스 CRUD (Create, Read, Update, Delete) 작업
admin_users 테이블 관리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func as sql_func
from typing import List, Tuple, Optional

import models, schemas


async def get_admin_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 10,
    name: str | None = None,
    email: str | None = None,
    is_active: bool | None = None,
    is_superuser: bool | None = None,
) -> Tuple[List[models.AdminUser], int]:
    """
    관리자 사용자 목록을 조회합니다. 필터링 및 페이징을 지원합니다.
    """
    query = select(models.AdminUser)
    count_query = select(sql_func.count(models.AdminUser.id))

    if name:
        query = query.filter(models.AdminUser.name.ilike(f"%{name}%"))
        count_query = count_query.filter(models.AdminUser.name.ilike(f"%{name}%"))
    if email:
        query = query.filter(models.AdminUser.email.ilike(f"%{email}%"))
        count_query = count_query.filter(models.AdminUser.email.ilike(f"%{email}%"))
    if is_active is not None:
        query = query.filter(models.AdminUser.is_active == is_active)
        count_query = count_query.filter(models.AdminUser.is_active == is_active)
    if is_superuser is not None:
        query = query.filter(models.AdminUser.is_superuser == is_superuser)
        count_query = count_query.filter(models.AdminUser.is_superuser == is_superuser)

    # 총 개수 조회
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 데이터 조회 (생성일시 기준 내림차순)
    query = query.order_by(models.AdminUser.created_at.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    users = result.scalars().all()
    return users, total


async def get_admin_user(db: AsyncSession, user_id: int) -> Optional[models.AdminUser]:
    """
    특정 ID의 관리자 사용자를 조회합니다.
    """
    result = await db.execute(
        select(models.AdminUser).filter(models.AdminUser.id == user_id)
    )
    return result.scalars().first()


async def get_admin_user_by_name_or_email(db: AsyncSession, name_or_email: str) -> Optional[models.AdminUser]:
    """
    사용자명(name) 또는 이메일로 관리자 사용자 조회
    """
    result = await db.execute(
        select(models.AdminUser).filter(
            (models.AdminUser.name == name_or_email) | (models.AdminUser.email == name_or_email)
        )
    )
    return result.scalars().first()


async def update_admin_user(
    db: AsyncSession, user_id: int, user: schemas.UserUpdate
) -> Optional[models.AdminUser]:
    """
    특정 ID의 관리자 사용자를 업데이트합니다.
    """
    update_data = user.model_dump(exclude_unset=True)
    if not update_data:
        return await get_admin_user(db, user_id)

    stmt = (
        update(models.AdminUser)
        .where(models.AdminUser.id == user_id)
        .values(**update_data)
        .returning(models.AdminUser)
    )
    result = await db.execute(stmt)
    updated_user = result.scalars().first()

    if updated_user:
        await db.refresh(updated_user)
    return updated_user


async def delete_admin_user(db: AsyncSession, user_id: int) -> bool:
    """
    특정 ID의 관리자 사용자를 삭제합니다.
    """
    stmt = delete(models.AdminUser).where(models.AdminUser.id == user_id)
    result = await db.execute(stmt)
    return result.rowcount > 0
