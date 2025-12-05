"""
Pydantic 스키마 정의
API 요청/응답 검증 및 직렬화
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class InventoryItemBase(BaseModel):
    """재고 항목 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=255, description="재고 항목명")
    category: str = Field(..., min_length=1, max_length=100, description="카테고리")
    quantity: int = Field(..., ge=0, description="수량")
    unit_price: Decimal = Field(..., ge=0, description="단가")
    status: Optional[str] = Field(default="available", description="상태")
    location: Optional[str] = Field(default=None, max_length=255, description="위치")
    description: Optional[str] = Field(default=None, description="설명")


class InventoryItemCreate(InventoryItemBase):
    """재고 항목 생성 스키마"""
    pass


class InventoryItemUpdate(BaseModel):
    """재고 항목 수정 스키마 (모든 필드 선택적)"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    quantity: Optional[int] = Field(None, ge=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None


class InventoryItemResponse(InventoryItemBase):
    """재고 항목 응답 스키마"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventoryListResponse(BaseModel):
    """재고 목록 응답 스키마"""
    items: list[InventoryItemResponse]
    total: int
    message: Optional[str] = None

