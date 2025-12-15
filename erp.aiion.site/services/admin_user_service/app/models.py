"""
관리자 사용자 관리 데이터베이스 모델
admin_users 테이블 (비밀번호 포함)
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class AdminUser(Base):
    """
    관리자 사용자 모델
    비밀번호 필드 포함
    """
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True, comment="사용자명")
    email = Column(String(255), unique=True, nullable=False, index=True, comment="이메일")
    password = Column(String(255), nullable=False, comment="해시된 비밀번호")
    nickname = Column(String(255), nullable=True, comment="닉네임")
    provider = Column(String(100), default="local", nullable=False, comment="인증 제공자")
    provider_id = Column(String(255), unique=True, nullable=True, index=True, comment="제공자 ID")
    is_active = Column(Boolean, default=True, nullable=False, comment="활성 상태")
    is_superuser = Column(Boolean, default=False, nullable=False, comment="슈퍼유저 여부")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="생성일시")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="수정일시")

    def __repr__(self):
        return f"<AdminUser(id={self.id}, name='{self.name}', email='{self.email}')>"
