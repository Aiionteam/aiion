"""
단가 필드 precision 확장 마이그레이션 스크립트
NUMERIC(10, 2) -> NUMERIC(18, 2)
"""
import asyncio
import sys
import os

# app 디렉토리를 Python 경로에 추가
sys.path.insert(0, '/app')

from database import AsyncSessionLocal, engine
from sqlalchemy import text


async def migrate_unit_price():
    """단가 필드 precision 확장"""
    async with AsyncSessionLocal() as session:
        try:
            print("🔧 단가 필드 precision 확장 중...")
            print("   NUMERIC(10, 2) -> NUMERIC(18, 2)")
            
            # ALTER TABLE 실행
            await session.execute(
                text("""
                    ALTER TABLE inventory_items 
                    ALTER COLUMN unit_price TYPE NUMERIC(18, 2);
                """)
            )
            await session.commit()
            
            print("✅ 단가 필드 precision 확장 완료!")
            print("   이제 최대 999,999,999,999,999,999.99 (약 1000조)까지 저장 가능합니다.")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ 마이그레이션 실패: {e}")
            import traceback
            traceback.print_exc()
            raise


async def main():
    """메인 함수"""
    try:
        await migrate_unit_price()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()
        print("🔌 데이터베이스 연결 종료")


if __name__ == "__main__":
    asyncio.run(main())

