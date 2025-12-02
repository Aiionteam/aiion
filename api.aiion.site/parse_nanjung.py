"""
난중일기 CSV 파일 파싱 및 데이터베이스 삽입 스크립트
사용자 ID 1의 일기 데이터를 PostgreSQL 데이터베이스에 삽입합니다.
UTF-8 인코딩으로 처리합니다.
"""

import re
import psycopg2
from datetime import datetime
import sys

# 데이터베이스 연결 정보
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'aidb',
    'user': 'aiion',
    'password': 'aiion4man'
}

def parse_csv_file(file_path):
    """CSV 파일을 파싱합니다. UTF-8 인코딩으로 읽습니다."""
    diaries = []
    
    # UTF-8로 파일 읽기
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    # 헤더 제거
    if lines and lines[0].startswith('id,'):
        lines = lines[1:]
    
    current_record = None
    current_content = []
    in_content = False
    
    for line_num, line in enumerate(lines, start=2):
        line = line.rstrip('\r')
        
        if not line.strip():
            if in_content:
                current_content.append('')
            continue
        
        # 새 레코드 시작: 숫자로 시작하고 쉼표가 있음
        if re.match(r'^\d+,', line):
            # 이전 레코드 저장
            if current_record and current_record.get('content') is not None and current_record.get('userId') is not None:
                diaries.append(current_record)
            
            # 새 레코드 파싱
            # 형식: id,'localdate,<title>,"content",userId
            match = re.match(r'^(\d+),\'(\d{4}-\d{2}-\d{2}),<([^>]+)>,"(.*)', line)
            if match:
                diary_id = int(match.group(1))
                localdate = match.group(2)
                title = match.group(3)
                content_start = match.group(4)
                
                # content 끝 찾기
                if '",' in content_start:
                    # 같은 라인에 content 끝이 있음
                    parts = content_start.split('",', 1)
                    content = parts[0]
                    rest = parts[1] if len(parts) > 1 else ''
                    
                    # userId 찾기
                    user_id_match = re.search(r'(\d+)$', rest.strip())
                    if user_id_match:
                        user_id = int(user_id_match.group(1))
                        
                        current_record = {
                            'id': diary_id,
                            'localdate': localdate,
                            'title': title,
                            'content': content,
                            'userId': user_id
                        }
                        in_content = False
                    else:
                        current_record = {
                            'id': diary_id,
                            'localdate': localdate,
                            'title': title,
                            'content': content_start,
                            'userId': None
                        }
                        in_content = True
                        current_content = [content_start]
                else:
                    # content가 다음 라인으로 계속됨
                    current_record = {
                        'id': diary_id,
                        'localdate': localdate,
                        'title': title,
                        'content': None,
                        'userId': None
                    }
                    in_content = True
                    current_content = [content_start]
            else:
                # 다른 형식 시도 (title이 없는 경우)
                match2 = re.match(r'^(\d+),\'(\d{4}-\d{2}-\d{2}),(.*)', line)
                if match2:
                    diary_id = int(match2.group(1))
                    localdate = match2.group(2)
                    rest = match2.group(3)
                    
                    # title 찾기
                    title_match = re.search(r'<([^>]+)>', rest)
                    if title_match:
                        title = title_match.group(1)
                        after_title = rest[title_match.end():]
                    else:
                        title = ''
                        after_title = rest
                    
                    # content 시작 찾기
                    if after_title.startswith('"'):
                        content_text = after_title[1:]
                        if '",' in content_text:
                            parts = content_text.split('",', 1)
                            content = parts[0]
                            rest2 = parts[1] if len(parts) > 1 else ''
                            
                            user_id_match = re.search(r'(\d+)$', rest2.strip())
                            if user_id_match:
                                user_id = int(user_id_match.group(1))
                                current_record = {
                                    'id': diary_id,
                                    'localdate': localdate,
                                    'title': title,
                                    'content': content,
                                    'userId': user_id
                                }
                                in_content = False
                            else:
                                current_record = {
                                    'id': diary_id,
                                    'localdate': localdate,
                                    'title': title,
                                    'content': content_text,
                                    'userId': None
                                }
                                in_content = True
                                current_content = [content_text]
                        else:
                            current_record = {
                                'id': diary_id,
                                'localdate': localdate,
                                'title': title,
                                'content': None,
                                'userId': None
                            }
                            in_content = True
                            current_content = [content_text]
        elif in_content and current_record:
            # content 계속 읽기
            # content 끝 찾기
            if '",' in line or line.endswith('",'):
                # content 끝
                if '",' in line:
                    parts = line.split('",', 1)
                    current_content.append(parts[0])
                    content = '\n'.join(current_content)
                    current_record['content'] = content
                    
                    # userId 찾기
                    rest = parts[1] if len(parts) > 1 else ''
                    user_id_match = re.search(r'(\d+)$', rest.strip())
                    if user_id_match:
                        current_record['userId'] = int(user_id_match.group(1))
                        diaries.append(current_record)
                        current_record = None
                        in_content = False
                        current_content = []
                else:
                    # 라인 끝에 ", 있음
                    current_content.append(line.rstrip('",'))
                    content = '\n'.join(current_content)
                    current_record['content'] = content
                    # userId는 다음에 찾아야 함
            else:
                # content 계속
                current_content.append(line)
    
    # 마지막 레코드 저장
    if current_record and current_record.get('content') is not None and current_record.get('userId') is not None:
        diaries.append(current_record)
    
    return diaries

def insert_diary(conn, diary_data):
    """일기 데이터를 데이터베이스에 삽입합니다."""
    cursor = conn.cursor()
    
    try:
        # 날짜 파싱
        try:
            diary_date = datetime.strptime(diary_data['localdate'], '%Y-%m-%d').date()
        except:
            print(f"날짜 파싱 실패: {diary_data['localdate']}")
            return False
        
        # title 정리
        title = diary_data.get('title', '').strip()
        if not title:
            # content의 처음 200자를 title로 사용
            content = diary_data.get('content', '')
            title = content[:200] if content else '제목 없음'
        
        content = diary_data.get('content', '')
        user_id = diary_data.get('userId')
        
        if not user_id:
            print(f"userId가 없음: {diary_data.get('id')}")
            return False
        
        # SQL 삽입 (id를 명시적으로 지정하여 1부터 순차 부여)
        diary_id = diary_data.get('id')
        if not diary_id:
            print(f"일기 ID가 없음: {diary_data}")
            return False
        
        insert_sql = """
            INSERT INTO diaries (id, diary_date, title, content, user_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE 
            SET diary_date = EXCLUDED.diary_date,
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                user_id = EXCLUDED.user_id
        """
        
        cursor.execute(insert_sql, (diary_id, diary_date, title, content, user_id))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"삽입 에러 (id={diary_data.get('id')}): {e}")
        return False
    finally:
        cursor.close()

def delete_existing_diaries(conn, user_id=1):
    """기존 일기 데이터를 삭제하고 시퀀스를 리셋합니다."""
    cursor = conn.cursor()
    try:
        # 기존 일기 삭제
        delete_sql = "DELETE FROM diaries WHERE user_id = %s"
        cursor.execute(delete_sql, (user_id,))
        deleted_count = cursor.rowcount
        
        # 시퀀스 리셋 (id를 1부터 시작하도록)
        # PostgreSQL에서 시퀀스 이름 확인 및 리셋
        cursor.execute("""
            SELECT setval(pg_get_serial_sequence('diaries', 'id'), 1, false)
        """)
        
        conn.commit()
        print(f"기존 일기 {deleted_count}개 삭제 완료, 시퀀스 리셋 완료")
        return deleted_count
    except Exception as e:
        conn.rollback()
        print(f"삭제 에러: {e}")
        return 0
    finally:
        cursor.close()

def main():
    csv_file = 'nanjung.csv'
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
            print(f"  ID: {diaries[0].get('id')}")
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
                    print(f"에러 발생 일기 ID: {diary.get('id')}")
            
            if idx % 100 == 0:
                print(f"진행 중... {idx}/{len(diaries)} 처리됨 (성공: {success_count}, 실패: {error_count})")
        
        print(f"\n삽입 완료!")
        print(f"  총 처리: {len(diaries)}개")
        print(f"  성공: {success_count}개")
        print(f"  실패: {error_count}개")
        
        # 삽입된 데이터 확인
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, content FROM diaries WHERE user_id = 1 LIMIT 3")
        rows = cursor.fetchall()
        print(f"\n삽입된 데이터 샘플 (UTF-8):")
        for row in rows:
            print(f"  ID: {row[0]}, Title: {row[1][:30]}, Content: {row[2][:50]}")
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
