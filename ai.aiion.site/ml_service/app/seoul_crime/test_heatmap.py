"""
히트맵 생성 테스트 스크립트
"""

from pathlib import Path
import sys

# 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.seoul_crime.seoul_heatmap_service import SeoulHeatmapService

def test_heatmap():
    """히트맵 생성 테스트"""
    print("="*60)
    print("서울시 자치구별 범죄율 히트맵 생성 테스트")
    print("="*60)
    
    try:
        service = SeoulHeatmapService()
        
        # 히트맵 생성
        print("\n히트맵 생성 중...")
        result = service.create_heatmap(cmap='Reds')
        
        if result['status'] == 'success':
            print(f"\n✅ 히트맵 생성 성공!")
            print(f"   이미지 경로: {result.get('image_path')}")
            print(f"   차트 타입: {result.get('chart_type', 'heatmap')}")
            
            if 'data_summary' in result:
                summary = result['data_summary']
                print(f"\n   데이터 요약:")
                print(f"   - 총 자치구 수: {summary.get('total_gu', 'N/A')}")
                print(f"   - 최소 범죄율: {summary.get('min_crime_rate', 'N/A'):.2f}")
                print(f"   - 최대 범죄율: {summary.get('max_crime_rate', 'N/A'):.2f}")
                print(f"   - 평균 범죄율: {summary.get('avg_crime_rate', 'N/A'):.2f}")
            
            if 'note' in result and result['note']:
                print(f"\n   참고: {result['note']}")
            
            return True
        else:
            print(f"\n❌ 히트맵 생성 실패")
            print(f"   오류: {result.get('error', 'Unknown error')}")
            if 'traceback' in result:
                print(f"\n   상세 오류:")
                print(result['traceback'])
            return False
            
    except Exception as e:
        print(f"\n❌ 테스트 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_heatmap()
    sys.exit(0 if success else 1)

