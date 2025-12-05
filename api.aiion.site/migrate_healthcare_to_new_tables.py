"""
기존 healthcare_records 테이블의 데이터를 새 테이블 구조로 마이그레이션하는 스크립트

마이그레이션 대상:
- healthcare_records → user_exercise_logs (운동 관련)
- healthcare_records → user_health_logs (건강 관련)

주의사항:
- 기존 데이터는 유지됩니다 (백업 목적)
- 새 테이블에만 데이터를 복사합니다
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from datetime import datetime

# 환경 변수 로드
load_dotenv()

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'aiion'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

def migrate_exercise_records(conn, cursor):
    """운동 관련 기록을 user_exercise_logs로 마이그레이션"""
    print("\n=== 운동 기록 마이그레이션 시작 ===")
    
    # 운동 관련 기록 조회 (type이 '운동' 또는 steps > 0)
    select_sql = """
        SELECT id, user_id, record_date, type, steps, weekly_summary, recommended_routine
        FROM healthcare_records
        WHERE (type ILIKE '%운동%' OR type ILIKE '%exercise%' OR steps > 0)
        AND user_id IS NOT NULL
        ORDER BY record_date DESC
    """
    
    cursor.execute(select_sql)
    records = cursor.fetchall()
    
    print(f"운동 관련 기록 {len(records)}개 발견")
    
    insert_sql = """
        INSERT INTO user_exercise_logs (user_id, date, exercise_type, duration_minutes, intensity, mood, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """
    
    success_count = 0
    error_count = 0
    
    for record in records:
        try:
            # 운동 타입 추출
            exercise_type = record['type'] or '운동'
            
            # 걸음수 기반으로 운동 시간 추정 (걸음수 / 평균 속도)
            duration_minutes = None
            if record['steps'] and record['steps'] > 0:
                # 평균 걸음 속도: 100걸음/분 가정
                duration_minutes = min(record['steps'] // 100, 120)  # 최대 120분
            
            # 강도 추정 (걸음수 기반)
            intensity = None
            if record['steps']:
                if record['steps'] >= 10000:
                    intensity = '높음'
                elif record['steps'] >= 5000:
                    intensity = '중간'
                else:
                    intensity = '낮음'
            
            # notes에 weekly_summary와 recommended_routine 결합
            notes_parts = []
            if record['weekly_summary']:
                notes_parts.append(f"주간 요약: {record['weekly_summary']}")
            if record['recommended_routine']:
                notes_parts.append(f"추천 루틴: {record['recommended_routine']}")
            notes = '\n'.join(notes_parts) if notes_parts else None
            
            cursor.execute(insert_sql, (
                record['user_id'],
                record['record_date'],
                exercise_type,
                duration_minutes,
                intensity,
                None,  # mood는 일기에서 추출 필요
                notes
            ))
            
            success_count += 1
        except Exception as e:
            print(f"에러 (ID: {record['id']}): {e}")
            error_count += 1
    
    conn.commit()
    print(f"운동 기록 마이그레이션 완료: 성공 {success_count}개, 실패 {error_count}개")

def migrate_health_records(conn, cursor):
    """건강 관련 기록을 user_health_logs로 마이그레이션"""
    print("\n=== 건강 기록 마이그레이션 시작 ===")
    
    # 건강 관련 기록 조회
    select_sql = """
        SELECT id, user_id, record_date, type, sleep_hours, nutrition, weight, 
               blood_pressure, condition, weekly_summary
        FROM healthcare_records
        WHERE (type ILIKE '%건강%' OR type ILIKE '%health%' 
               OR sleep_hours IS NOT NULL 
               OR nutrition IS NOT NULL 
               OR weight IS NOT NULL 
               OR blood_pressure IS NOT NULL 
               OR condition IS NOT NULL)
        AND user_id IS NOT NULL
        ORDER BY record_date DESC
    """
    
    cursor.execute(select_sql)
    records = cursor.fetchall()
    
    print(f"건강 관련 기록 {len(records)}개 발견")
    
    insert_sql = """
        INSERT INTO user_health_logs (user_id, date, health_type, value, recommendation, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """
    
    success_count = 0
    error_count = 0
    
    for record in records:
        try:
            # 건강 타입 결정
            health_type = record['type'] or '건강'
            
            # value 생성 (주요 건강 데이터 요약)
            value_parts = []
            if record['sleep_hours']:
                value_parts.append(f"수면: {record['sleep_hours']}시간")
            if record['weight']:
                value_parts.append(f"체중: {record['weight']}kg")
            if record['blood_pressure']:
                value_parts.append(f"혈압: {record['blood_pressure']}")
            if record['nutrition']:
                value_parts.append(f"영양: {record['nutrition'][:50]}")
            value = ', '.join(value_parts) if value_parts else None
            
            # recommendation은 recommended_routine이 있으면 사용
            recommendation = None
            
            # notes에 weekly_summary 포함
            notes = record['weekly_summary']
            
            cursor.execute(insert_sql, (
                record['user_id'],
                record['record_date'],
                health_type,
                value,
                recommendation,
                notes
            ))
            
            success_count += 1
        except Exception as e:
            print(f"에러 (ID: {record['id']}): {e}")
            error_count += 1
    
    conn.commit()
    print(f"건강 기록 마이그레이션 완료: 성공 {success_count}개, 실패 {error_count}개")

def main():
    print("=== Healthcare 데이터 마이그레이션 시작 ===")
    print(f"시작 시간: {datetime.now()}")
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_client_encoding('UTF8')
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        print("\n데이터베이스 연결 성공")
        
        # 운동 기록 마이그레이션
        migrate_exercise_records(conn, cursor)
        
        # 건강 기록 마이그레이션
        migrate_health_records(conn, cursor)
        
        cursor.close()
        conn.close()
        
        print(f"\n=== 마이그레이션 완료 ===")
        print(f"완료 시간: {datetime.now()}")
        
    except Exception as e:
        print(f"\n마이그레이션 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

