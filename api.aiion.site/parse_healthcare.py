"""
난중일기 Healthcare CSV 파일 파싱 및 데이터베이스 삽입 스크립트
extracted_nanjung_exercise.csv 파일을 파싱하여 PostgreSQL healthcare_records 테이블에 삽입합니다.
UTF-8 인코딩으로 처리합니다.
"""

import re
import psycopg2
from datetime import datetime
import sys
import os

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
    import csv
    
    records = []
    
    # UTF-8로 파일 읽기
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        # CSV 리더 사용 (따옴표 처리 자동, 여러 줄 필드 지원)
        reader = csv.reader(f, quotechar='"', delimiter=',', quoting=csv.QUOTE_ALL, skipinitialspace=True)
        
        # 헤더 건너뛰기
        header = next(reader, None)
        if not header or header[0] != 'id':
            print("헤더를 찾을 수 없습니다.")
            return records
        
        for row_num, row in enumerate(reader, start=2):
            if not row or len(row) < 12:
                continue
            
            try:
                # 필드 파싱
                record_id = int(row[0]) if row[0] else None
                record_date = row[1] if row[1] else None
                user_id = float(row[2]) if row[2] else None
                record_type = row[3] if row[3] else None
                sleep_hours = float(row[4]) if row[4] else None
                nutrition = row[5] if row[5] else None
                steps = float(row[6]) if row[6] else None
                weight = float(row[7]) if row[7] else None
                blood_pressure = row[8] if row[8] else None
                condition = row[9] if row[9] else None
                weekly_summary = row[10] if len(row) > 10 and row[10] else None
                recommended_routine = row[11] if len(row) > 11 and row[11] else None
                
                # 빈 문자열을 None으로 변환
                if weekly_summary == '':
                    weekly_summary = None
                if recommended_routine == '':
                    recommended_routine = None
                
                record = {
                    'id': record_id,
                    'recordDate': record_date,
                    'userId': int(user_id) if user_id else None,
                    'type': record_type,
                    'sleepHours': sleep_hours,
                    'nutrition': nutrition if nutrition else None,
                    'steps': int(steps) if steps else None,
                    'weight': weight,
                    'bloodPressure': blood_pressure if blood_pressure else None,
                    'condition': condition if condition else None,
                    'weeklySummary': weekly_summary,
                    'recommendedRoutine': recommended_routine
                }
                
                records.append(record)
            except Exception as e:
                print(f"라인 {row_num} 파싱 에러: {e}")
                if row:
                    print(f"  첫 번째 필드: {row[0] if len(row) > 0 else 'N/A'}")
                continue
    
    return records

def insert_healthcare(conn, healthcare_data):
    """Healthcare 데이터를 데이터베이스에 삽입합니다."""
    cursor = conn.cursor()
    
    try:
        # 날짜 파싱
        try:
            if healthcare_data['recordDate']:
                # 날짜 형식: 1592-02-13
                record_date = datetime.strptime(healthcare_data['recordDate'], '%Y-%m-%d').date()
            else:
                print(f"날짜가 없음: {healthcare_data.get('id')}")
                return False
        except Exception as e:
            print(f"날짜 파싱 실패: {healthcare_data['recordDate']}, 에러: {e}")
            return False
        
        # 값 정리
        user_id = healthcare_data.get('userId')
        if not user_id:
            print(f"userId가 없음: {healthcare_data.get('id')}")
            return False
        
        record_type = healthcare_data.get('type')
        sleep_hours = healthcare_data.get('sleepHours')
        nutrition = healthcare_data.get('nutrition')
        steps = healthcare_data.get('steps')
        weight = healthcare_data.get('weight')
        blood_pressure = healthcare_data.get('bloodPressure')
        condition = healthcare_data.get('condition')
        weekly_summary = healthcare_data.get('weeklySummary')
        recommended_routine = healthcare_data.get('recommendedRoutine')
        
        # SQL 삽입 (id는 자동 생성되므로 제외)
        insert_sql = """
            INSERT INTO healthcare_records (
                record_date, user_id, type, sleep_hours, nutrition, 
                steps, weight, blood_pressure, condition, 
                weekly_summary, recommended_routine
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """
        
        cursor.execute(insert_sql, (
            record_date,
            user_id,
            record_type,
            sleep_hours,
            nutrition,
            steps,
            weight,
            blood_pressure,
            condition,
            weekly_summary,
            recommended_routine
        ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"삽입 에러 (id={healthcare_data.get('id')}): {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()

def delete_existing_healthcare(conn, user_id=1):
    """기존 healthcare 데이터를 삭제합니다."""
    cursor = conn.cursor()
    try:
        # 기존 데이터 삭제
        delete_sql = "DELETE FROM healthcare_records WHERE user_id = %s"
        cursor.execute(delete_sql, (user_id,))
        deleted_count = cursor.rowcount
        
        conn.commit()
        print(f"기존 healthcare 기록 {deleted_count}개 삭제 완료")
        return deleted_count
    except Exception as e:
        conn.rollback()
        print(f"삭제 에러: {e}")
        return 0
    finally:
        cursor.close()

def main():
    # CSV 파일 경로
    csv_file = '../www.aiion.site/extracted_nanjung_exercise.csv'
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    
    # 파일 경로 확인
    if not os.path.exists(csv_file):
        print(f"CSV 파일을 찾을 수 없습니다: {csv_file}")
        return
    
    print(f"CSV 파일 파싱 시작: {csv_file}")
    
    # CSV 파싱 (UTF-8)
    try:
        records = parse_csv_file(csv_file)
        print(f"파싱 완료: {len(records)}개 기록 발견")
        
        # 파싱 결과 샘플 출력
        if records:
            print(f"\n첫 번째 기록 샘플:")
            print(f"  ID: {records[0].get('id')}")
            print(f"  날짜: {records[0].get('recordDate')}")
            print(f"  사용자 ID: {records[0].get('userId')}")
            print(f"  유형: {records[0].get('type')}")
            print(f"  걸음수: {records[0].get('steps')}")
            print(f"  컨디션: {records[0].get('condition')}")
            print(f"  주간 요약 (처음 100자): {records[0].get('weeklySummary', '')[:100] if records[0].get('weeklySummary') else '없음'}")
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
        print("\n기존 healthcare 데이터 삭제 중...")
        delete_existing_healthcare(conn, user_id=1)
        
        # 새 데이터 삽입
        print("\n새 healthcare 데이터 삽입 중...")
        success_count = 0
        error_count = 0
        
        for idx, record in enumerate(records, start=1):
            if insert_healthcare(conn, record):
                success_count += 1
            else:
                error_count += 1
                if error_count <= 5:  # 처음 5개 에러만 출력
                    print(f"에러 발생 기록 ID: {record.get('id')}")
            
            if idx % 100 == 0:
                print(f"진행 중... {idx}/{len(records)} 처리됨 (성공: {success_count}, 실패: {error_count})")
        
        print(f"\n삽입 완료!")
        print(f"  총 처리: {len(records)}개")
        print(f"  성공: {success_count}개")
        print(f"  실패: {error_count}개")
        
        # 삽입된 데이터 확인
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, record_date, user_id, type, steps, condition 
            FROM healthcare_records 
            WHERE user_id = 1 
            ORDER BY record_date 
            LIMIT 5
        """)
        rows = cursor.fetchall()
        print(f"\n삽입된 데이터 샘플 (UTF-8):")
        for row in rows:
            print(f"  ID: {row[0]}, 날짜: {row[1]}, 사용자: {row[2]}, 유형: {row[3]}, 걸음수: {row[4]}, 컨디션: {row[5]}")
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

