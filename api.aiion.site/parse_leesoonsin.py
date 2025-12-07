"""
이순신 일기 CSV 파일 파싱 및 데이터베이스 삽입 스크립트
사용자 ID 1의 일기 데이터를 PostgreSQL 데이터베이스에 삽입합니다.
UTF-8 인코딩으로 처리합니다.
"""

import csv
import psycopg2
from datetime import datetime
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
    diaries = []
    
    # UTF-8로 파일 읽기 (BOM 제거를 위해 utf-8-sig 사용)
    with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f)
        
        row_count = 0
        for row in reader:
            row_count += 1
            # BOM이 있을 수 있으므로 키에서도 제거
            localdate = row.get('localdate', row.get('\ufefflocaldate', '')).strip()
            title = row.get('title', '').strip()
            content = row.get('content', '').strip()
            userId_str = row.get('userId', '').strip()
            
            if not localdate or not userId_str:
                continue
            
            # userId 파싱
            try:
                userId = int(userId_str)
            except ValueError:
                print(f"userId 파싱 실패: {userId_str}")
                continue
            
            # 날짜 파싱 (M/d/yyyy 형식)
            try:
                diary_date = datetime.strptime(localdate, '%m/%d/%Y').date()
            except ValueError:
                print(f"날짜 파싱 실패: {localdate}")
                continue
            
            # title이 비어있으면 content의 처음 200자를 사용
            if not title and content:
                title = content[:200] if len(content) > 200 else content
            if not title:
                title = '제목 없음'
            
            diaries.append({
                'localdate': diary_date,
                'title': title,
                'content': content,
                'userId': userId
            })
    
    return diaries

def insert_diary(conn, diary_data):
    """일기 데이터를 데이터베이스에 삽입합니다."""
    cursor = conn.cursor()
    
    try:
        diary_date = diary_data['localdate']
        title = diary_data['title']
        content = diary_data['content']
        user_id = diary_data['userId']
        
        # SQL 삽입 (id는 자동 생성, 중복 시 무시)
        insert_sql = """
            INSERT INTO diaries (diary_date, title, content, user_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """
        
        cursor.execute(insert_sql, (diary_date, title, content, user_id))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        # 중복 키 에러는 무시 (이미 존재하는 데이터)
        if 'duplicate key' not in str(e).lower():
            print(f"삽입 에러 (날짜={diary_data.get('localdate')}): {e}")
        return False
    finally:
        cursor.close()

def delete_existing_diaries(conn, user_id=1):
    """기존 일기 데이터를 삭제합니다."""
    cursor = conn.cursor()
    try:
        # 기존 일기 삭제
        delete_sql = "DELETE FROM diaries WHERE user_id = %s"
        cursor.execute(delete_sql, (user_id,))
        deleted_count = cursor.rowcount
        
        conn.commit()
        print(f"기존 일기 {deleted_count}개 삭제 완료")
        return deleted_count
    except Exception as e:
        conn.rollback()
        print(f"삭제 에러: {e}")
        return 0
    finally:
        cursor.close()

def main():
    csv_file = 'leesoonsin.csv'
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    
    print(f"CSV 파일 파싱 시작: {csv_file}")
    
    # CSV 파싱 (UTF-8)
    try:
        diaries = parse_csv_file(csv_file)
        print(f"파싱 완료: {len(diaries)}개 일기 발견")
        
        # 파싱 결과 샘플 출력
        if diaries:
            print(f"\n첫 번째 일기 샘플:")
            print(f"  날짜: {diaries[0].get('localdate')}")
            print(f"  제목: {diaries[0].get('title')}")
            print(f"  내용 (처음 100자): {diaries[0].get('content', '')[:100]}")
            print(f"  사용자 ID: {diaries[0].get('userId')}")
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
        print("\n기존 일기 데이터 삭제 중...")
        delete_existing_diaries(conn, user_id=1)
        
        # 새 데이터 삽입
        print("\n새 일기 데이터 삽입 중...")
        success_count = 0
        error_count = 0
        
        for idx, diary in enumerate(diaries, start=1):
            if insert_diary(conn, diary):
                success_count += 1
            else:
                error_count += 1
                if error_count <= 5:  # 처음 5개 에러만 출력
                    print(f"에러 발생 일기 날짜: {diary.get('localdate')}")
            
            if idx % 100 == 0:
                print(f"진행 중... {idx}/{len(diaries)} 처리됨 (성공: {success_count}, 실패: {error_count})")
        
        print(f"\n삽입 완료!")
        print(f"  총 처리: {len(diaries)}개")
        print(f"  성공: {success_count}개")
        print(f"  실패: {error_count}개")
        
        # 삽입된 데이터 확인
        cursor = conn.cursor()
        cursor.execute("SELECT id, diary_date, title, content FROM diaries WHERE user_id = 1 LIMIT 3")
        rows = cursor.fetchall()
        print(f"\n삽입된 데이터 샘플 (UTF-8):")
        for row in rows:
            print(f"  ID: {row[0]}, 날짜: {row[1]}, 제목: {row[2][:30]}, 내용: {row[3][:50]}")
        cursor.close()
    
    except Exception as e:
        print(f"에러: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("데이터베이스 연결 종료")

if __name__ == '__main__':
    main()

