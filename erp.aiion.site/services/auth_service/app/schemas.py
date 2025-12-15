"""
Pydantic 스키마 정의
API 요청/응답 검증 및 직렬화
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    """사용자 응답 스키마"""
    id: int
    username: str  # name을 username으로 매핑
    name: str  # 원본 name 필드도 유지
    email: EmailStr
    full_name: Optional[str] = None  # nickname을 full_name으로 매핑
    nickname: Optional[str] = None  # 원본 nickname 필드도 유지
    provider: Optional[str] = None
    provider_id: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_admin_user(cls, admin_user):
        """AdminUser ORM 객체를 UserResponse로 변환 (필드 매핑)"""
        return cls(
            id=admin_user.id,
            username=admin_user.name,  # name을 username으로 매핑
            name=admin_user.name,
            email=admin_user.email,
            full_name=admin_user.nickname,  # nickname을 full_name으로 매핑
            nickname=admin_user.nickname,
            provider=admin_user.provider,
            provider_id=admin_user.provider_id,
            is_active=admin_user.is_active,
            is_superuser=admin_user.is_superuser,
            created_at=admin_user.created_at,
            updated_at=admin_user.updated_at,
        )


class TokenResponse(BaseModel):
    """토큰 응답 스키마"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
