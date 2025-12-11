"""
서울시 자치구 경계 데이터 다운로드 스크립트
공공데이터 또는 오픈소스 데이터 소스에서 자치구 경계 GeoJSON/Shapefile 다운로드
"""

import requests
from pathlib import Path
import json

def download_seoul_boundary_geojson():
    """
    서울시 자치구 경계 GeoJSON 다운로드
    여러 소스에서 시도
    """
    save_dir = Path(__file__).parent / "save"
    save_dir.mkdir(exist_ok=True)
    
    output_path = save_dir / "seoul_gu.geojson"
    
    # 방법 1: VWorld API 사용 (한국 공공데이터)
    print("서울시 자치구 경계 데이터 다운로드 시도 중...")
    
    # VWorld 행정구역 경계 API (무료, API 키 불필요)
    # 서울시 자치구 경계 GeoJSON 다운로드
    vworld_url = "https://api.vworld.kr/req/data"
    
    # 서울시 자치구 코드: 11 (서울특별시)
    params = {
        "service": "data",
        "request": "GetFeature",
        "data": "LT_C_ADSIDO_INFO",  # 행정구역 경계
        "key": "발급받은_API_키",  # 실제 사용 시 API 키 필요
        "domain": "http://localhost:8000",
        "size": 1000,
        "geometry": "true",
        "attribute": "true",
        "crs": "EPSG:4326"
    }
    
    print("⚠️  VWorld API는 API 키가 필요합니다.")
    print("대안: 수동으로 GeoJSON 파일을 다운로드하거나 아래 방법을 사용하세요.")
    
    # 방법 2: GitHub에서 오픈소스 데이터 사용 (대체 URL들)
    github_urls = [
        "https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_geo_simple.json",
        "https://raw.githubusercontent.com/jeongwhanchoi/korea-geojson/main/seoul/seoul.geojson",
        "https://raw.githubusercontent.com/teusink/Seoul-GeoJSON/master/seoul.geojson",
    ]
    
    print("\nGitHub 오픈소스 데이터 시도 중...")
    for url in github_urls:
        try:
            print(f"다운로드 시도: {url}")
            response = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
            if response.status_code == 200:
                data = response.json()
                
                # GeoJSON 형식 확인 및 저장
                if isinstance(data, dict) and 'type' in data:
                    with open(output_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"✅ GeoJSON 다운로드 완료: {output_path}")
                    print(f"   파일 크기: {len(json.dumps(data))} bytes")
                    return output_path
                else:
                    print(f"⚠️  GeoJSON 형식이 아닙니다.")
        except Exception as e:
            print(f"❌ 다운로드 실패: {e}")
            continue
    
    # 방법 2-1: 간단한 GeoJSON 직접 생성 (대체 방법)
    print("\n간단한 GeoJSON 직접 생성 시도 중...")
    try:
        simple_geojson = create_simple_seoul_geojson()
        if simple_geojson:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(simple_geojson, f, ensure_ascii=False, indent=2)
            print(f"✅ 간단한 GeoJSON 생성 완료: {output_path}")
            print("⚠️  주의: 이 GeoJSON은 근사치입니다. 실제 경계 데이터를 사용하는 것을 권장합니다.")
            return output_path
    except Exception as e:
        print(f"❌ GeoJSON 생성 실패: {e}")
    
    # 방법 3: 수동 다운로드 안내
    print("\n" + "="*60)
    print("자동 다운로드 실패 - 수동 다운로드 안내")
    print("="*60)
    print("\n다음 중 하나의 방법으로 서울시 자치구 경계 데이터를 다운로드하세요:")
    print("\n1. 공공데이터포털 (data.go.kr):")
    print("   - 검색: '서울시 행정구역 경계'")
    print("   - 다운로드 후 GeoJSON 또는 Shapefile 형식으로 변환")
    print("\n2. VWorld 디지털트윈국토:")
    print("   - https://www.vworld.kr/ 접속")
    print("   - '행정동' 검색 → 서울시 자치구 경계 데이터 다운로드")
    print("   - 또는 API 키 발급 후 API 사용")
    print("\n3. 공공데이터포털 (data.go.kr):")
    print("   - https://www.data.go.kr 접속")
    print("   - '서울시 행정구역 경계' 또는 'TL_SCCO_SIG' 검색")
    print("   - 도로명주소지도 사이트에서 '구역의 도형' 신청")
    print("\n4. GitHub 오픈소스 (대체):")
    print("   - https://github.com/southkorea/seoul-maps")
    print("   - https://github.com/jeongwhanchoi/korea-geojson")
    print("\n4. 파일 저장 위치:")
    print(f"   - GeoJSON: {save_dir / 'seoul_gu.geojson'}")
    print(f"   - Shapefile: {save_dir / 'seoul_gu.shp'}")
    print("="*60)
    
    return None


def create_simple_seoul_geojson():
    """
    서울시 자치구 중심 좌표를 기반으로 간단한 사각형 경계 GeoJSON 생성
    실제 경계가 아닌 근사치이지만, 히트맵 테스트용으로 사용 가능
    """
    # 서울시 자치구 중심 좌표 및 대략적인 크기 (경도, 위도, 반경)
    seoul_gu_data = {
        '강남구': {'lon': 127.0473, 'lat': 37.5172, 'radius': 0.03},
        '강동구': {'lon': 127.1238, 'lat': 37.5301, 'radius': 0.025},
        '강북구': {'lon': 127.0256, 'lat': 37.6398, 'radius': 0.02},
        '강서구': {'lon': 126.8495, 'lat': 37.5509, 'radius': 0.04},
        '관악구': {'lon': 126.9516, 'lat': 37.4784, 'radius': 0.025},
        '광진구': {'lon': 127.0845, 'lat': 37.5384, 'radius': 0.02},
        '구로구': {'lon': 126.8874, 'lat': 37.4954, 'radius': 0.025},
        '금천구': {'lon': 126.9027, 'lat': 37.4519, 'radius': 0.02},
        '노원구': {'lon': 127.0568, 'lat': 37.6542, 'radius': 0.03},
        '도봉구': {'lon': 127.0456, 'lat': 37.6688, 'radius': 0.025},
        '동대문구': {'lon': 127.0603, 'lat': 37.5744, 'radius': 0.02},
        '동작구': {'lon': 126.9534, 'lat': 37.5124, 'radius': 0.02},
        '마포구': {'lon': 126.9019, 'lat': 37.5663, 'radius': 0.025},
        '서대문구': {'lon': 126.9366, 'lat': 37.5791, 'radius': 0.02},
        '서초구': {'lon': 127.0324, 'lat': 37.4837, 'radius': 0.025},
        '성동구': {'lon': 127.0366, 'lat': 37.5633, 'radius': 0.02},
        '성북구': {'lon': 127.0167, 'lat': 37.5894, 'radius': 0.025},
        '송파구': {'lon': 127.1058, 'lat': 37.5145, 'radius': 0.03},
        '양천구': {'lon': 126.8664, 'lat': 37.5170, 'radius': 0.025},
        '영등포구': {'lon': 126.9070, 'lat': 37.5264, 'radius': 0.025},
        '용산구': {'lon': 126.9942, 'lat': 37.5326, 'radius': 0.02},
        '은평구': {'lon': 126.9302, 'lat': 37.6028, 'radius': 0.025},
        '종로구': {'lon': 126.9978, 'lat': 37.5730, 'radius': 0.015},
        '중구': {'lon': 126.9970, 'lat': 37.5640, 'radius': 0.015},
        '중랑구': {'lon': 127.0776, 'lat': 37.6063, 'radius': 0.025},
    }
    
    features = []
    for gu_name, info in seoul_gu_data.items():
        lon, lat, radius = info['lon'], info['lat'], info['radius']
        
        # 중심점 주변에 사각형 생성 (간단한 근사치)
        coordinates = [
            [lon - radius, lat - radius],  # 좌하
            [lon + radius, lat - radius],  # 우하
            [lon + radius, lat + radius],  # 우상
            [lon - radius, lat + radius],  # 좌상
            [lon - radius, lat - radius],  # 닫기
        ]
        
        feature = {
            "type": "Feature",
            "properties": {
                "name": gu_name,
                "GU_NAME": gu_name,
                "SIG_KOR_NM": gu_name,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [coordinates]
            }
        }
        features.append(feature)
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    return geojson


def create_simple_boundary_from_points():
    """
    포인트 데이터로부터 간단한 경계 생성 (대체 방법)
    실제 경계가 없을 때 사용
    """
    try:
        import geopandas as gpd
        from shapely.geometry import Polygon
        import pandas as pd
        
        save_dir = Path(__file__).parent / "save"
        point_shp = save_dir / "seoul_crime_data" / "seoul_crime_data.shp"
        
        if not point_shp.exists():
            print("포인트 shapefile을 찾을 수 없습니다.")
            return None
        
        # 포인트 데이터 로드
        gdf = gpd.read_file(str(point_shp))
        
        # 각 포인트 주변에 간단한 사각형 경계 생성 (임시 방법)
        # 실제로는 Voronoi 다이어그램이나 다른 방법 사용 가능
        print("⚠️  포인트 데이터로부터 경계를 생성하는 것은 정확하지 않습니다.")
        print("실제 자치구 경계 shapefile을 다운로드하는 것을 권장합니다.")
        
        return None
        
    except ImportError:
        print("geopandas가 설치되지 않았습니다.")
        return None
    except Exception as e:
        print(f"오류 발생: {e}")
        return None


if __name__ == "__main__":
    # 먼저 자동 다운로드 시도
    result = download_seoul_boundary_geojson()
    
    if not result:
        print("\n자동 다운로드가 실패했습니다.")
        print("수동으로 데이터를 다운로드하여 save 폴더에 저장하세요.")

