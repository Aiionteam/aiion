"""
데이터베이스 CRUD 작업
admin_user_service의 admin_users 테이블에서 사용자 조회 및 인증
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import bcrypt

import models


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증 (bcrypt 직접 사용)"""
    if not hashed_password:
        return False
    try:
        # 비밀번호를 bytes로 변환
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        # bcrypt로 검증
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


async def get_admin_user_by_name_or_email(db: AsyncSession, name_or_email: str) -> Optional[models.AdminUser]:
    """
    사용자명(name) 또는 이메일로 관리자 사용자 조회
    admin_user_service의 admin_users 테이블에서 조회
    """
    result = await db.execute(
        select(models.AdminUser).filter(
            (models.AdminUser.name == name_or_email) | (models.AdminUser.email == name_or_email)
        )
    )
    return result.scalars().first()


async def authenticate_user(db: AsyncSession, username_or_email: str, password: str) -> Optional[models.AdminUser]:
    """
    사용자 인증
    admin_user_service의 admin_users 테이블에서 사용자를 찾고 비밀번호를 검증
    """
    user = await get_admin_user_by_name_or_email(db, username_or_email)
    if not user:
        return None
    
    # 비밀번호 검증
    if not user.password:
        return None
    
    if not verify_password(password, user.password):
        return None
    
    # 활성 상태 확인
    if not user.is_active:
        return None
    
    return user


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[models.AdminUser]:
    """
    ID로 관리자 사용자 조회
    """
    result = await db.execute(
        select(models.AdminUser).filter(models.AdminUser.id == user_id)
    )
    return result.scalars().first()
