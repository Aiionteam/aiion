"""
사용자 관리 서비스 FastAPI 애플리케이션
admin.aiion.site에서 관리자 사용자 리스트를 조회/관리하는 API
admin_users 테이블 사용
"""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from database import get_db, close_db, engine, init_db
import crud, schemas

app = FastAPI(
    title="Admin User Management Service API",
    version="1.0.0",
    description="관리자 사용자 목록 관리 API (admin_users 테이블)"
)

# 라우터
user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("", response_model=schemas.UserListResponse)
async def get_users(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(10, ge=1, le=100, description="페이지 크기"),
    name: Optional[str] = Query(None, description="사용자명 검색"),
    email: Optional[str] = Query(None, description="이메일 검색"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    is_superuser: Optional[bool] = Query(None, description="슈퍼유저 필터"),
    db: AsyncSession = Depends(get_db)
):
    """
    관리자 사용자 목록 조회 (페이징 및 필터링 지원)
    """
    skip = (page - 1) * page_size
    users, total = await crud.get_admin_users(
        db=db,
        skip=skip,
        limit=page_size,
        name=name,
        email=email,
        is_active=is_active,
        is_superuser=is_superuser,
    )
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "message": "관리자 사용자 목록 조회 성공"
    }


@user_router.get("/{user_id}", response_model=schemas.UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    특정 관리자 사용자 조회
    """
    user = await crud.get_admin_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@user_router.put("/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: int,
    user: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    관리자 사용자 정보 수정 (관리자용)
    """
    db_user = await crud.update_admin_user(db=db, user_id=user_id, user=user)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    관리자 사용자 삭제 (관리자용)
    """
    success = await crud.delete_admin_user(db=db, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return None


app.include_router(user_router)

# 애플리케이션 시작 시 데이터베이스 초기화
@app.on_event("startup")
async def on_startup():
    await init_db()

# 애플리케이션 종료 시 데이터베이스 연결 종료
@app.on_event("shutdown")
async def on_shutdown():
    await close_db()


@app.get("/health")
def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "admin-user-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001)
