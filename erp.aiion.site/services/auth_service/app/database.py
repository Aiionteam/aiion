"""
데이터베이스 연결 설정
NeonDB (PostgreSQL) 연결을 위한 비동기 SQLAlchemy 설정
테이블 생성은 하지 않고 조회만 수행
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
import os
import urllib.parse
from typing import AsyncGenerator

# 환경 변수에서 데이터베이스 연결 정보 가져오기
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv("NEON_CONNECTION_STRING", "postgresql://user:password@localhost/dbname")
)

# JDBC 형식(jdbc:postgresql://)을 일반 PostgreSQL URL 형식으로 변환
if DATABASE_URL.startswith("jdbc:postgresql://"):
    jdbc_url = DATABASE_URL.replace("jdbc:postgresql://", "", 1)
    
    if "?" in jdbc_url:
        url_part, query_part = jdbc_url.split("?", 1)
        query_params = urllib.parse.parse_qs(query_part)
    else:
        url_part = jdbc_url
        query_params = {}
    
    if "/" in url_part:
        host_port, database = url_part.split("/", 1)
    else:
        host_port = url_part
        database = ""
    
    user = query_params.get("user", [None])[0] or os.getenv("NEON_USER")
    password = query_params.get("password", [None])[0] or os.getenv("NEON_PASSWORD")
    
    if user and password:
        DATABASE_URL = f"postgresql://{urllib.parse.quote(user)}:{urllib.parse.quote(password)}@{host_port}/{database}"
    else:
        DATABASE_URL = f"postgresql://{host_port}/{database}"
    
    remaining_params = {k: v for k, v in query_params.items() if k not in ["user", "password"]}
    if remaining_params:
        query_string = urllib.parse.urlencode(remaining_params, doseq=True)
        DATABASE_URL = f"{DATABASE_URL}?{query_string}"

# URL에서 sslmode 파라미터 제거
if "sslmode" in DATABASE_URL:
    parsed = urllib.parse.urlparse(DATABASE_URL)
    query_params = urllib.parse.parse_qs(parsed.query)
    query_params.pop("sslmode", None)
    query_params.pop("channel_binding", None)
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    DATABASE_URL = urllib.parse.urlunparse((
        parsed.scheme, parsed.netloc, parsed.path,
        parsed.params, new_query, parsed.fragment
    ))

# PostgreSQL 연결 문자열을 asyncpg를 사용하는 형식으로 변환
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# 비동기 엔진 생성
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    poolclass=NullPool,
    future=True,
    connect_args={
        "ssl": "require"
    } if "neon.tech" in DATABASE_URL or "neon" in DATABASE_URL.lower() else {}
)

# 비동기 세션 팩토리 생성
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    데이터베이스 세션 의존성 주입 함수
    FastAPI의 Depends에서 사용
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db():
    """
    데이터베이스 연결 종료
    애플리케이션 종료 시 호출
    """
    await engine.dispose()

