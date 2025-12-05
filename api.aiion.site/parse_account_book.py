"""
가계부 CSV 파일 파싱 및 데이터베이스 삽입 스크립트
사용자 ID 1의 가계부 데이터를 PostgreSQL 데이터베이스에 삽입합니다.
UTF-8 인코딩으로 처리합니다.
"""

import csv
import psycopg2
from datetime import datetime, time
import sys

# 데이터베이스 연결 정보 (Neon)
DB_CONFIG = {
    'host': 'ep-crimson-darkness-a1o2y4xd-pooler.ap-southeast-1.aws.neon.tech',
    'port': 5432,
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_yKz6I1piqEBt',
    'sslmode': 'require'
}

def parse_csv_file(file_path):
    """CSV 파일을 파싱합니다. UTF-8 인코딩으로 읽습니다."""
    accounts = []
    
    # UTF-8로 파일 읽기
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        
        for row_num, row in enumerate(reader, start=2):
            try:
                # transaction_id는 무시 (자동 생성되는 id 사용)
                
                # transaction_date 파싱
                transaction_date = None
                if row.get('transaction_date'):
                    try:
                        transaction_date = datetime.strptime(row['transaction_date'].strip(), '%Y-%m-%d').date()
                    except ValueError as e:
                        print(f"라인 {row_num}: 날짜 파싱 실패 - {row['transaction_date']}: {e}")
                        continue
                
                # transaction_time 파싱
                transaction_time = None
                if row.get('transaction_time'):
                    try:
                        time_str = row['transaction_time'].strip()
                        if time_str:
                            time_parts = time_str.split(':')
                            if len(time_parts) == 3:
                                transaction_time = time(
                                    int(time_parts[0]),
                                    int(time_parts[1]),
                                    int(time_parts[2])
                                )
                    except (ValueError, IndexError) as e:
                        print(f"라인 {row_num}: 시간 파싱 실패 - {row['transaction_time']}: {e}")
                        # 시간 파싱 실패해도 계속 진행
                
                # type (필수)
                transaction_type = row.get('type', '').strip()
                if not transaction_type:
                    print(f"라인 {row_num}: type이 없습니다. 스킵합니다.")
                    continue
                
                # amount (필수)
                amount = None
                if row.get('amount'):
                    try:
                        amount = int(row['amount'].strip())
                    except ValueError:
                        print(f"라인 {row_num}: amount 파싱 실패 - {row['amount']}")
                        continue
                else:
                    print(f"라인 {row_num}: amount가 없습니다. 스킵합니다.")
                    continue
                
                # category (선택)
                category = row.get('category', '').strip() or None
                
                # payment_method (선택)
                payment_method = row.get('payment_method', '').strip() or None
                
                # location (선택)
                location = row.get('location', '').strip() or None
                
                # description (선택)
                description = row.get('description', '').strip() or None
                
                # vat_amount (선택)
                vat_amount = None
                if row.get('vat_amount'):
                    try:
                        vat_str = row['vat_amount'].strip()
                        if vat_str:
                            vat_amount = float(vat_str)
                    except ValueError:
                        # vat_amount 파싱 실패해도 계속 진행
                        pass
                
                # income_source (선택)
                income_source = row.get('income_source', '').strip() or None
                
                account_data = {
                    'transaction_date': transaction_date,
                    'transaction_time': transaction_time,
                    'type': transaction_type,
                    'amount': amount,
                    'category': category,
                    'payment_method': payment_method,
                    'location': location,
                    'description': description,
                    'vat_amount': vat_amount,
                    'income_source': income_source,
                    'user_id': 1  # 고정값
                }
                
                accounts.append(account_data)
                
            except Exception as e:
                print(f"라인 {row_num}: 파싱 에러 - {e}")
                continue
    
    return accounts

def insert_account(conn, account_data):
    """가계부 데이터를 데이터베이스에 삽입합니다."""
    cursor = conn.cursor()
    
    try:
        insert_sql = """
            INSERT INTO accounts (
                transaction_date, transaction_time, type, amount, category,
                payment_method, location, description, vat_amount, income_source, user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_sql, (
            account_data['transaction_date'],
            account_data['transaction_time'],
            account_data['type'],
            account_data['amount'],
            account_data['category'],
            account_data['payment_method'],
            account_data['location'],
            account_data['description'],
            account_data['vat_amount'],
            account_data['income_source'],
            account_data['user_id']
        ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"삽입 에러: {e}")
        print(f"  데이터: {account_data}")
        return False
    finally:
        cursor.close()

def delete_existing_accounts(conn, user_id=1):
    """기존 가계부 데이터를 삭제하고 시퀀스를 리셋합니다."""
    cursor = conn.cursor()
    try:
        # 기존 가계부 삭제
        delete_sql = "DELETE FROM accounts WHERE user_id = %s"
        cursor.execute(delete_sql, (user_id,))
        deleted_count = cursor.rowcount
        
        # 시퀀스 리셋 (id를 1부터 시작하도록)
        cursor.execute("""
            SELECT setval(pg_get_serial_sequence('accounts', 'id'), 1, false)
        """)
        
        conn.commit()
        print(f"기존 가계부 {deleted_count}개 삭제 완료, 시퀀스 리셋 완료")
        return deleted_count
    except Exception as e:
        conn.rollback()
        print(f"삭제 에러: {e}")
        return 0
    finally:
        cursor.close()

def main():
    csv_file = 'account_book_data_3months (1).csv'
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    
    print(f"CSV 파일 파싱 시작: {csv_file}")
    
    # CSV 파싱 (UTF-8)
    try:
        accounts = parse_csv_file(csv_file)
        print(f"파싱 완료: {len(accounts)}개 가계부 내역 발견")
        
        # 파싱 결과 샘플 출력
        if accounts:
            print(f"\n첫 번째 가계부 샘플:")
            print(f"  날짜: {accounts[0].get('transaction_date')}")
            print(f"  시간: {accounts[0].get('transaction_time')}")
            print(f"  유형: {accounts[0].get('type')}")
            print(f"  금액: {accounts[0].get('amount')}")
            print(f"  카테고리: {accounts[0].get('category')}")
            print(f"  사용자 ID: {accounts[0].get('user_id')}")
    except Exception as e:
        print(f"파싱 에러: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # 데이터베이스 연결
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        # 클라이언트 인코딩을 UTF-8로 설정
        conn.set_client_encoding('UTF8')
        print("\n데이터베이스 연결 성공 (UTF-8 인코딩)")
    except Exception as e:
        print(f"데이터베이스 연결 실패: {e}")
        return
    
    try:
        # 기존 데이터 삭제 (user_id = 1)
        print("\n기존 가계부 데이터 삭제 중...")
        delete_existing_accounts(conn, user_id=1)
        
        # 새 데이터 삽입
        print("\n새 가계부 데이터 삽입 중...")
        success_count = 0
        error_count = 0
        
        for idx, account in enumerate(accounts, start=1):
            if insert_account(conn, account):
                success_count += 1
            else:
                error_count += 1
                if error_count <= 5:  # 처음 5개 에러만 출력
                    print(f"에러 발생 가계부: 날짜={account.get('transaction_date')}, 금액={account.get('amount')}")
            
            if idx % 50 == 0:
                print(f"진행 중... {idx}/{len(accounts)} 처리됨 (성공: {success_count}, 실패: {error_count})")
        
        print(f"\n삽입 완료!")
        print(f"  총 처리: {len(accounts)}개")
        print(f"  성공: {success_count}개")
        print(f"  실패: {error_count}개")
        
        # 삽입된 데이터 확인
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, transaction_date, type, amount, category 
            FROM accounts 
            WHERE user_id = 1 
            ORDER BY transaction_date DESC 
            LIMIT 5
        """)
        rows = cursor.fetchall()
        print(f"\n삽입된 데이터 샘플 (최신 5개):")
        for row in rows:
            print(f"  ID: {row[0]}, 날짜: {row[1]}, 유형: {row[2]}, 금액: {row[3]}, 카테고리: {row[4]}")
        
        # 통계 정보
        cursor.execute("""
            SELECT 
                type,
                COUNT(*) as count,
                SUM(amount) as total
            FROM accounts 
            WHERE user_id = 1 
            GROUP BY type
        """)
        stats = cursor.fetchall()
        print(f"\n유형별 통계:")
        for stat in stats:
            print(f"  {stat[0]}: {stat[1]}건, 총 {stat[2]:,}원")
        
        cursor.close()
    
    except Exception as e:
        print(f"에러: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("\n데이터베이스 연결 종료")

if __name__ == '__main__':
    main()

