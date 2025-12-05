"""
인증 서비스 FastAPI 애플리케이션
admin_user_service의 admin_users 테이블에서 사용자 인증 후 JWT 토큰 발급
"""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import os

from database import get_db, close_db, engine
import crud, schemas
from jwt_utils import create_access_token, create_refresh_token, verify_token, get_user_id_from_token

app = FastAPI(
    title="Authentication Service API",
    version="1.0.0",
    description="인증 서비스 API (JWT 토큰 발급)"
)

# OAuth2 스키마
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# 라우터
auth_router = APIRouter(prefix="/auth", tags=["auth"])

# JWT 설정
TOKEN_EXPIRE_MINUTES = int(os.getenv("TOKEN_EXPIRE_MINUTES", "60"))


@auth_router.post("/login", response_model=schemas.TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    로그인
    admin_user_service의 admin_users 테이블에서 사용자 인증 후 JWT 토큰 발급
    """
    # 사용자 인증 (name 또는 email로 조회)
    user = await crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # JWT 토큰 생성
    token_data = {
        "sub": str(user.id),  # subject (사용자 ID)
        "name": user.name,
        "email": user.email,
    }
    
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    expires_in = TOKEN_EXPIRE_MINUTES * 60
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }


@auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(token: str = Depends(oauth2_scheme)):
    """
    로그아웃
    JWT는 stateless이므로 클라이언트에서 토큰 삭제만 하면 됨
    """
    return None


@auth_router.get("/me", response_model=schemas.UserResponse)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """
    현재 사용자 정보 조회 (JWT 토큰 검증)
    """
    # JWT 토큰 검증
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 토큰에서 사용자 ID 추출
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 정보 조회 (admin_user_service의 admin_users 테이블에서)
    user = await crud.get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # UserResponse로 변환 (필드 매핑)
    return schemas.UserResponse.from_admin_user(user)


# 라우터 등록
app.include_router(auth_router)

# 애플리케이션 종료 시 데이터베이스 연결 종료
@app.on_event("shutdown")
async def on_shutdown():
    await close_db()


@app.get("/health")
def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "auth-service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)

