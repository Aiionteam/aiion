"""
Pydantic 스키마 정의
API 요청/응답 검증 및 직렬화
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """사용자 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=255, description="사용자명")
    email: EmailStr = Field(..., description="이메일")
    nickname: Optional[str] = Field(None, max_length=255, description="닉네임")
    provider: Optional[str] = Field(default="local", description="인증 제공자")
    provider_id: Optional[str] = Field(None, description="제공자 ID")


class UserResponse(UserBase):
    """사용자 응답 스키마"""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """사용자 목록 응답 스키마"""
    users: list[UserResponse]
    total: int
    page: int = 1
    page_size: int = 10
    message: Optional[str] = None


class UserUpdate(BaseModel):
    """사용자 수정 스키마 (관리자용)"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    nickname: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
