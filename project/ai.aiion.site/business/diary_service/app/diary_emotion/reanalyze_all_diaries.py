#!/usr/bin/env python3
"""
모든 일기 감정 분석 재실행 스크립트
diary-service의 모든 일기에 대해 DL(딥러닝) 모델을 사용하여 감정 분석을 수행합니다.
DL 모델이 없거나 확신도가 낮은 경우 자동으로 ML 모델로 폴백됩니다.
"""

import requests
import json
from datetime import datetime


def reanalyze_all_diaries():
    """모든 일기에 대해 감정 분석을 재실행합니다."""
    # diary-service 직접 접근 (8083 포트)
    base_url = "http://localhost:8083"
    endpoint = f"{base_url}/diaries/reanalyze-all-emotions"
    
    print("=" * 60)
    print("모든 일기 감정 분석 시작")
    print("=" * 60)
    print()
    
    try:
        print(f"요청 URL: {endpoint}")
        print("요청 중... (시간이 걸릴 수 있습니다)")
        print()
        
        # POST 요청 (타임아웃 10분)
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json"},
            timeout=600
        )
        
        print()
        
        # 응답 확인
        if response.status_code == 200:
            result = response.json()
            
            print("✓ 감정 분석 완료!")
            print()
            print("결과:")
            print(f"  코드: {result.get('code', 'N/A')}")
            print(f"  메시지: {result.get('message', 'N/A')}")
            
            if result.get('data'):
                data = result['data']
                print()
                print("상세 통계:")
                print(f"  전체 일기: {data.get('total', 0)} 개")
                print(f"  성공: {data.get('success', 0)} 개")
                print(f"  실패: {data.get('fail', 0)} 개")
            
            print()
            print("모든 일기 감정 분석이 성공적으로 완료되었습니다!")
            return True
            
        else:
            print(f"✗ 오류 발생 (HTTP {response.status_code})")
            print()
            
            try:
                error_data = response.json()
                print("오류 상세:")
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                print("응답 본문:")
                print(response.text)
            
            return False
            
    except requests.exceptions.Timeout:
        print("✗ 요청 시간 초과 (10분)")
        print("diary-service가 응답하지 않거나 처리 시간이 너무 오래 걸립니다.")
        return False
        
    except requests.exceptions.ConnectionError:
        print("✗ 연결 오류")
        print("diary-service가 실행 중인지 확인하세요:")
        print("  docker-compose ps diary-service")
        return False
        
    except Exception as e:
        print(f"✗ 예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = reanalyze_all_diaries()
    exit(0 if success else 1)
