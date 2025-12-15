"""
인증 서비스 데이터베이스 모델
admin_user_service의 admin_users 테이블을 직접 조회하기 위한 모델
테이블 생성은 하지 않음 (조회만)
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class AdminUser(Base):
    """
    관리자 사용자 모델 (admin_user_service의 admin_users 테이블 구조에 맞춤)
    테이블 생성은 하지 않고 조회만 수행
    """
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)  # 해시된 비밀번호
    nickname = Column(String(255), nullable=True)
    provider = Column(String(100), default="local", nullable=False)
    provider_id = Column(String(255), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AdminUser(id={self.id}, name='{self.name}', email='{self.email}')>"
