"""
초기 관리자 계정 생성 스크립트
admin_users 테이블에 admin 계정 생성
"""
import asyncio
import sys
import os

# app 디렉토리를 Python 경로에 추가
sys.path.insert(0, '/app')

from database import AsyncSessionLocal, init_db, engine
from sqlalchemy import text
import uuid
import bcrypt

def get_password_hash(password: str) -> str:
    """비밀번호 해싱 (bcrypt 직접 사용)"""
    # 비밀번호를 bytes로 변환
    password_bytes = password.encode('utf-8')
    # bcrypt로 해싱
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    # 문자열로 반환
    return hashed.decode('utf-8')


async def create_admin_user():
    """관리자 계정 생성"""
    async with AsyncSessionLocal() as session:
        try:
            # 먼저 테이블이 존재하는지 확인
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'admin_users'
                    );
                """)
            )
            table_exists = result.scalar()
            
            if not table_exists:
                print("❌ admin_users 테이블이 존재하지 않습니다. 테이블을 생성합니다...")
                await init_db()
                print("✅ 테이블 생성 완료")
            
            # 기존 admin 계정 확인
            result = await session.execute(
                text("""
                    SELECT id, name, email, is_superuser, provider_id
                    FROM admin_users 
                    WHERE name = :name
                """),
                {"name": "admin"}
            )
            existing_admin = result.fetchone()
            
            if existing_admin:
                print("✅ admin 계정이 이미 존재합니다.")
                print(f"   - ID: {existing_admin[0]}")
                print(f"   - Name: {existing_admin[1]}")
                print(f"   - Email: {existing_admin[2]}")
                print(f"   - Is Superuser: {existing_admin[3]}")
                print(f"   - Provider ID: {existing_admin[4] if existing_admin[4] else 'N/A'}")
                return
            
            # 비밀번호 해싱
            hashed_password = get_password_hash("1234")
            
            # provider_id 생성 (고유한 ID)
            provider_id = str(uuid.uuid4())
            
            # admin 계정 생성
            await session.execute(
                text("""
                    INSERT INTO admin_users (name, email, password, provider, provider_id, is_active, is_superuser)
                    VALUES (:name, :email, :password, :provider, :provider_id, :is_active, :is_superuser)
                """),
                {
                    "name": "admin",
                    "email": "admin@example.com",
                    "password": hashed_password,
                    "provider": "local",
                    "provider_id": provider_id,
                    "is_active": True,
                    "is_superuser": True
                }
            )
            await session.commit()
            
            print("✅ 관리자 계정이 성공적으로 생성되었습니다!")
            print(f"   - Name: admin")
            print(f"   - Password: 1234")
            print(f"   - Email: admin@example.com")
            print(f"   - Provider ID: {provider_id}")
            print(f"   - Is Superuser: True")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 관리자 계정 생성 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
            raise


async def main():
    """메인 함수"""
    try:
        # 데이터베이스 초기화 (테이블 생성)
        print("🔧 데이터베이스 초기화 중...")
        await init_db()
        print("✅ 데이터베이스 초기화 완료")
        
        # 관리자 계정 생성
        print("👤 관리자 계정 생성 중...")
        await create_admin_user()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # 데이터베이스 연결 종료
        await engine.dispose()
        print("🔌 데이터베이스 연결 종료")


if __name__ == "__main__":
    asyncio.run(main())
