#!/usr/bin/env python3
"""
모든 일기 MBTI 분석 재실행 스크립트
diary-service의 모든 일기에 대해 DL(딥러닝) 모델을 사용하여 MBTI 분석을 수행합니다.
KoELECTRA v3 base 모델 기반의 4개 차원별 분류를 진행합니다.
"""

import requests
import json
from datetime import datetime


def reanalyze_all_diaries():
    """모든 일기에 대해 MBTI 분석을 재실행합니다."""
    # 게이트웨이를 통해 접근 (8080 포트) 또는 직접 접근 (8083 포트)
    # 게이트웨이: /diary/diaries/reanalyze-all-mbti (StripPrefix=1로 /diary가 제거되어 /diaries/reanalyze-all-mbti)
    # 직접 접근: /diaries/reanalyze-all-mbti
    
    print("=" * 60)
    print("모든 일기 MBTI 분석 시작")
    print("=" * 60)
    print()
    
    # 먼저 게이트웨이를 통해 시도, 실패하면 직접 접근
    base_urls = [
        ("http://localhost:8080/diary", "게이트웨이"),
        ("http://localhost:8083", "직접 접근")
    ]
    
    endpoint = None
    selected_base = None
    
    print("연결 테스트 중...")
    for base_url, description in base_urls:
        test_url = f"{base_url}/diaries/user"
        try:
            # 간단한 연결 테스트 (짧은 타임아웃)
            test_response = requests.get(test_url, timeout=3)
            # 200, 401, 403, 404 모두 서비스가 응답하는 것이므로 OK
            if test_response.status_code in [200, 401, 403, 404]:
                endpoint = f"{base_url}/diaries/reanalyze-all-mbti"
                selected_base = description
                print(f"✓ {description} 연결 확인: {base_url}")
                break
        except requests.exceptions.ConnectionError:
            print(f"✗ {description} 연결 실패: {base_url}")
            continue
        except Exception as e:
            print(f"✗ {description} 테스트 실패: {e}")
            continue
    
    if endpoint is None:
        # 기본값으로 직접 접근 사용 (8083)
        endpoint = f"{base_urls[1][0]}/diaries/reanalyze-all-mbti"
        selected_base = base_urls[1][1]
        print(f"⚠ 모든 연결 테스트 실패, 기본 URL 사용: {endpoint}")
    
    print()
    
    try:
        print(f"요청 URL: {endpoint} ({selected_base})")
        print("요청 중... (시간이 걸릴 수 있습니다)")
        print()
        
        # POST 요청 (타임아웃 30분 - 일기가 많을 경우를 대비)
        # 일기당 약 1-2초 소요, 200개 일기면 약 3-7분, 500개면 8-17분 예상
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json"},
            timeout=1800  # 30분
        )
        
        print()
        
        # 응답 확인
        if response.status_code == 200:
            result = response.json()
            
            print("✓ MBTI 분석 완료!")
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
            print("모든 일기 MBTI 분석이 성공적으로 완료되었습니다!")
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
        print("✗ 요청 시간 초과 (30분)")
        print("diary-service가 응답하지 않거나 처리 시간이 너무 오래 걸립니다.")
        print("일기가 매우 많을 경우 더 오래 걸릴 수 있습니다.")
        print("Docker 로그를 확인하여 실제 진행 상황을 확인하세요:")
        print("  docker-compose logs -f diary-service")
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

