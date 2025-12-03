"""
종합건강분석 데이터 생성 및 운동/건강 데이터 분류 스크립트
healthcare_records 테이블의 데이터를 기반으로:
1. 종합건강분석 집계 데이터 생성
2. 운동 데이터와 건강 데이터를 명확하게 분류
"""

import psycopg2
from datetime import datetime
import json

# 데이터베이스 연결 정보
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'aidb',
    'user': 'aiion',
    'password': 'aiion4man'
}

def generate_comprehensive_analysis(conn, user_id=1):
    """종합건강분석 집계 데이터 생성"""
    cursor = conn.cursor()
    
    try:
        # 전체 건강 기록 통계
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT DATE_TRUNC('month', record_date)) as total_months,
                MIN(record_date) as earliest_date,
                MAX(record_date) as latest_date,
                AVG(steps) as avg_steps,
                AVG(weight) as avg_weight,
                AVG(sleep_hours) as avg_sleep_hours,
                COUNT(CASE WHEN steps IS NOT NULL THEN 1 END) as records_with_steps,
                COUNT(CASE WHEN weight IS NOT NULL THEN 1 END) as records_with_weight,
                COUNT(CASE WHEN sleep_hours IS NOT NULL THEN 1 END) as records_with_sleep
            FROM healthcare_records
            WHERE user_id = %s
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        # 타입별 통계
        cursor.execute("""
            SELECT 
                type,
                COUNT(*) as count,
                AVG(steps) as avg_steps,
                AVG(weight) as avg_weight,
                AVG(sleep_hours) as avg_sleep_hours
            FROM healthcare_records
            WHERE user_id = %s
            GROUP BY type
            ORDER BY count DESC
        """, (user_id,))
        
        type_stats = cursor.fetchall()
        
        # 컨디션별 통계
        cursor.execute("""
            SELECT 
                condition,
                COUNT(*) as count
            FROM healthcare_records
            WHERE user_id = %s AND condition IS NOT NULL
            GROUP BY condition
            ORDER BY count DESC
            LIMIT 10
        """, (user_id,))
        
        condition_stats = cursor.fetchall()
        
        # 월별 걸음수 통계
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', record_date) as month,
                AVG(steps) as avg_steps,
                MAX(steps) as max_steps,
                MIN(steps) as min_steps,
                COUNT(*) as record_count
            FROM healthcare_records
            WHERE user_id = %s AND steps IS NOT NULL
            GROUP BY DATE_TRUNC('month', record_date)
            ORDER BY month DESC
            LIMIT 12
        """, (user_id,))
        
        monthly_steps = cursor.fetchall()
        
        # 최근 30일 활동 통계
        cursor.execute("""
            SELECT 
                COUNT(*) as recent_records,
                AVG(steps) as recent_avg_steps,
                AVG(weight) as recent_avg_weight
            FROM healthcare_records
            WHERE user_id = %s 
            AND record_date >= CURRENT_DATE - INTERVAL '30 days'
        """, (user_id,))
        
        recent_stats = cursor.fetchone()
        
        # 종합 분석 결과 구성
        analysis = {
            'summary': {
                'total_records': stats[0] if stats else 0,
                'total_months': stats[1] if stats else 0,
                'earliest_date': stats[2].isoformat() if stats and stats[2] else None,
                'latest_date': stats[3].isoformat() if stats and stats[3] else None,
                'avg_steps': float(stats[4]) if stats and stats[4] else None,
                'avg_weight': float(stats[5]) if stats and stats[5] else None,
                'avg_sleep_hours': float(stats[6]) if stats and stats[6] else None,
                'records_with_steps': stats[7] if stats else 0,
                'records_with_weight': stats[8] if stats else 0,
                'records_with_sleep': stats[9] if stats else 0,
            },
            'type_distribution': [
                {
                    'type': row[0],
                    'count': row[1],
                    'avg_steps': float(row[2]) if row[2] else None,
                    'avg_weight': float(row[3]) if row[3] else None,
                    'avg_sleep_hours': float(row[4]) if row[4] else None,
                }
                for row in type_stats
            ],
            'condition_distribution': [
                {
                    'condition': row[0],
                    'count': row[1]
                }
                for row in condition_stats
            ],
            'monthly_steps': [
                {
                    'month': row[0].strftime('%Y-%m') if row[0] else None,
                    'avg_steps': float(row[1]) if row[1] else None,
                    'max_steps': int(row[2]) if row[2] else None,
                    'min_steps': int(row[3]) if row[3] else None,
                    'record_count': row[4]
                }
                for row in monthly_steps
            ],
            'recent_activity': {
                'recent_records': recent_stats[0] if recent_stats else 0,
                'recent_avg_steps': float(recent_stats[1]) if recent_stats and recent_stats[1] else None,
                'recent_avg_weight': float(recent_stats[2]) if recent_stats and recent_stats[2] else None,
            }
        }
        
        return analysis
        
    except Exception as e:
        print(f"종합분석 생성 에러: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        cursor.close()

def classify_exercise_health_data(conn, user_id=1):
    """운동과 건강 데이터를 명확하게 분류"""
    cursor = conn.cursor()
    
    try:
        # 운동 데이터 (type='운동' 또는 type='운동/건강')
        cursor.execute("""
            SELECT 
                id,
                record_date,
                type,
                steps,
                weight,
                condition,
                weekly_summary,
                recommended_routine
            FROM healthcare_records
            WHERE user_id = %s 
            AND (type = '운동' OR type = '운동/건강')
            ORDER BY record_date DESC
        """, (user_id,))
        
        exercise_records = cursor.fetchall()
        
        # 건강 데이터 (type='건강')
        cursor.execute("""
            SELECT 
                id,
                record_date,
                type,
                sleep_hours,
                nutrition,
                weight,
                blood_pressure,
                condition,
                weekly_summary
            FROM healthcare_records
            WHERE user_id = %s 
            AND type = '건강'
            ORDER BY record_date DESC
        """, (user_id,))
        
        health_records = cursor.fetchall()
        
        return {
            'exercise': [
                {
                    'id': row[0],
                    'record_date': row[1].isoformat() if row[1] else None,
                    'type': row[2],
                    'steps': int(row[3]) if row[3] else None,
                    'weight': float(row[4]) if row[4] else None,
                    'condition': row[5],
                    'weekly_summary': row[6],
                    'recommended_routine': row[7],
                }
                for row in exercise_records
            ],
            'health': [
                {
                    'id': row[0],
                    'record_date': row[1].isoformat() if row[1] else None,
                    'type': row[2],
                    'sleep_hours': float(row[3]) if row[3] else None,
                    'nutrition': row[4],
                    'weight': float(row[5]) if row[5] else None,
                    'blood_pressure': row[6],
                    'condition': row[7],
                    'weekly_summary': row[8],
                }
                for row in health_records
            ]
        }
        
    except Exception as e:
        print(f"데이터 분류 에러: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        cursor.close()

def save_analysis_to_database(conn, analysis, user_id=1):
    """종합분석 결과를 데이터베이스에 저장 (별도 테이블 또는 JSON 필드)"""
    cursor = conn.cursor()
    
    try:
        # healthcare_analysis 테이블이 없으면 생성
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS healthcare_analysis (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                analysis_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        """)
        
        # 기존 분석 데이터 업데이트 또는 삽입
        cursor.execute("""
            INSERT INTO healthcare_analysis (user_id, analysis_data, updated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                analysis_data = EXCLUDED.analysis_data,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, json.dumps(analysis, ensure_ascii=False)))
        
        conn.commit()
        print(f"종합분석 데이터 저장 완료 (user_id: {user_id})")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"분석 데이터 저장 에러: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()

def main():
    user_id = 1
    
    # 데이터베이스 연결
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_client_encoding('UTF8')
        print("데이터베이스 연결 성공")
    except Exception as e:
        print(f"데이터베이스 연결 실패: {e}")
        return
    
    try:
        # 1. 종합건강분석 데이터 생성
        print("\n=== 종합건강분석 데이터 생성 ===")
        analysis = generate_comprehensive_analysis(conn, user_id)
        
        if analysis:
            print(f"\n📊 종합 통계:")
            print(f"  총 기록 수: {analysis['summary']['total_records']}개")
            print(f"  평균 걸음수: {analysis['summary']['avg_steps']:.0f}걸음" if analysis['summary']['avg_steps'] else "  평균 걸음수: 없음")
            print(f"  평균 체중: {analysis['summary']['avg_weight']:.1f}kg" if analysis['summary']['avg_weight'] else "  평균 체중: 없음")
            print(f"  평균 수면시간: {analysis['summary']['avg_sleep_hours']:.1f}시간" if analysis['summary']['avg_sleep_hours'] else "  평균 수면시간: 없음")
            
            print(f"\n📈 타입별 분포:")
            for type_stat in analysis['type_distribution']:
                print(f"  {type_stat['type']}: {type_stat['count']}개")
            
            print(f"\n💪 최근 30일 활동:")
            print(f"  기록 수: {analysis['recent_activity']['recent_records']}개")
            if analysis['recent_activity']['recent_avg_steps']:
                print(f"  평균 걸음수: {analysis['recent_activity']['recent_avg_steps']:.0f}걸음")
            
            # 분석 데이터 저장
            save_analysis_to_database(conn, analysis, user_id)
        
        # 2. 운동/건강 데이터 분류
        print("\n=== 운동/건강 데이터 분류 ===")
        classified = classify_exercise_health_data(conn, user_id)
        
        if classified:
            print(f"\n💪 운동 데이터: {len(classified['exercise'])}개")
            if classified['exercise']:
                print(f"  첫 번째 기록: {classified['exercise'][0]['record_date']} ({classified['exercise'][0]['type']})")
                if classified['exercise'][0]['steps']:
                    print(f"  걸음수: {classified['exercise'][0]['steps']}걸음")
            
            print(f"\n🏥 건강 데이터: {len(classified['health'])}개")
            if classified['health']:
                print(f"  첫 번째 기록: {classified['health'][0]['record_date']} ({classified['health'][0]['type']})")
                if classified['health'][0]['condition']:
                    print(f"  컨디션: {classified['health'][0]['condition']}")
        
        print("\n✅ 모든 작업 완료!")
        
    except Exception as e:
        print(f"에러: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("데이터베이스 연결 종료")

if __name__ == '__main__':
    main()

