"""
네온 DB accounts 테이블 데이터 확인 스크립트
"""

import psycopg2
from datetime import datetime

# 데이터베이스 연결 정보 (Neon)
DB_CONFIG = {
    'host': 'ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1.aws.neon.tech',
    'port': 5432,
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_yKz6I1piqEBt',
    'sslmode': 'require'
}

def check_accounts_data():
    """accounts 테이블의 데이터를 확인합니다."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_client_encoding('UTF8')
        print("✅ 데이터베이스 연결 성공\n")
        
        cursor = conn.cursor()
        
        # 전체 레코드 수 확인
        cursor.execute("SELECT COUNT(*) FROM accounts WHERE user_id = 1")
        total_count = cursor.fetchone()[0]
        print(f"📊 user_id = 1인 전체 레코드 수: {total_count}개\n")
        
        if total_count == 0:
            print("⚠️  데이터가 없습니다!")
            return
        
        # 날짜별 통계
        cursor.execute("""
            SELECT 
                transaction_date,
                COUNT(*) as count,
                SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense
            FROM accounts
            WHERE user_id = 1
            GROUP BY transaction_date
            ORDER BY transaction_date DESC
            LIMIT 10
        """)
        
        print("📅 최근 10일간 거래 내역:")
        print("-" * 80)
        for row in cursor.fetchall():
            date, count, income, expense = row
            print(f"  {date}: {count}건 | 수입: {income:,}원 | 지출: {expense:,}원")
        print()
        
        # 월별 통계
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', transaction_date) as month,
                COUNT(*) as count,
                SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense
            FROM accounts
            WHERE user_id = 1
            GROUP BY DATE_TRUNC('month', transaction_date)
            ORDER BY month DESC
        """)
        
        print("📆 월별 통계:")
        print("-" * 80)
        for row in cursor.fetchall():
            month, count, income, expense = row
            month_str = month.strftime('%Y-%m')
            print(f"  {month_str}: {count}건 | 수입: {income:,}원 | 지출: {expense:,}원")
        print()
        
        # 샘플 데이터 확인
        cursor.execute("""
            SELECT 
                id, transaction_date, transaction_time, type, amount, 
                category, payment_method, location
            FROM accounts
            WHERE user_id = 1
            ORDER BY transaction_date DESC, transaction_time DESC
            LIMIT 5
        """)
        
        print("📋 최근 5개 거래 내역 샘플:")
        print("-" * 80)
        for row in cursor.fetchall():
            id, date, time, type, amount, category, payment_method, location = row
            print(f"  ID: {id} | {date} {time or ''} | {type} | {amount:,}원")
            print(f"    카테고리: {category or 'N/A'} | 결제수단: {payment_method or 'N/A'} | 위치: {location or 'N/A'}")
        print()
        
        cursor.close()
        conn.close()
        print("✅ 데이터 확인 완료")
        
    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_accounts_data()

