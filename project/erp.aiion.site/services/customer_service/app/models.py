"""
재고 관리 데이터베이스 모델
"""
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class InventoryItem(Base):
    """
    재고 항목 모델
    """
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True, comment="재고 항목명")
    category = Column(String(100), nullable=False, index=True, comment="카테고리")
    quantity = Column(Integer, nullable=False, default=0, comment="수량")
    unit_price = Column(Numeric(18, 2), nullable=False, comment="단가")
    status = Column(String(50), default="available", comment="상태 (available, low_stock, out_of_stock)")
    location = Column(String(255), comment="위치")
    description = Column(Text, comment="설명")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="생성일시")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="수정일시")

    def __repr__(self):
        return f"<InventoryItem(id={self.id}, name='{self.name}', quantity={self.quantity})>"

