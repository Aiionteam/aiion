"""
merged_data.csv를 Shapefile 형식으로 변환하는 스크립트
서울시 자치구 중심 좌표를 사용하여 포인트 shapefile 생성
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple

try:
    import geopandas as gpd
    from shapely.geometry import Point
    GEOPANDAS_AVAILABLE = True
except ImportError:
    GEOPANDAS_AVAILABLE = False
    print("경고: geopandas가 설치되지 않았습니다. pip install geopandas를 실행하세요.")

# 서울시 자치구 중심 좌표 (경도, 위도)
SEOUL_GU_COORDINATES: Dict[str, Tuple[float, float]] = {
    '강남구': (127.0473, 37.5172),
    '강동구': (127.1238, 37.5301),
    '강북구': (127.0256, 37.6398),
    '강서구': (126.8495, 37.5509),
    '관악구': (126.9516, 37.4784),
    '광진구': (127.0845, 37.5384),
    '구로구': (126.8874, 37.4954),
    '금천구': (126.9027, 37.4519),
    '노원구': (127.0568, 37.6542),
    '도봉구': (127.0456, 37.6688),
    '동대문구': (127.0603, 37.5744),
    '동작구': (126.9534, 37.5124),
    '마포구': (126.9019, 37.5663),
    '서대문구': (126.9366, 37.5791),
    '서초구': (127.0324, 37.4837),
    '성동구': (127.0366, 37.5633),
    '성북구': (127.0167, 37.5894),
    '송파구': (127.1058, 37.5145),
    '양천구': (126.8664, 37.5170),
    '영등포구': (126.9070, 37.5264),
    '용산구': (126.9942, 37.5326),
    '은평구': (126.9302, 37.6028),
    '종로구': (126.9978, 37.5730),
    '중구': (126.9970, 37.5640),
    '중랑구': (127.0776, 37.6063),
}


def create_shapefile_from_csv():
    """merged_data.csv를 shapefile로 변환"""
    if not GEOPANDAS_AVAILABLE:
        print("오류: geopandas가 설치되지 않았습니다.")
        print("다음 명령어를 실행하세요: pip install geopandas")
        return
    
    # 경로 설정
    base_dir = Path(__file__).parent
    save_dir = base_dir / "save"
    csv_path = save_dir / "merged_data.csv"
    # Shapefile은 여러 파일로 구성되므로 확장자 없이 저장 (자동으로 .shp, .shx, .dbf, .prj 생성)
    output_path = save_dir / "seoul_crime_data"
    
    # CSV 파일 읽기
    print(f"CSV 파일 읽기: {csv_path}")
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    print(f"데이터 로드 완료: {len(df)} 행, {len(df.columns)} 컬럼")
    
    # 자치구별 좌표 추가
    geometries = []
    missing_gu = []
    
    for idx, row in df.iterrows():
        gu_name = row['자치구']
        if gu_name in SEOUL_GU_COORDINATES:
            lon, lat = SEOUL_GU_COORDINATES[gu_name]
            geometries.append(Point(lon, lat))
        else:
            print(f"경고: '{gu_name}'의 좌표를 찾을 수 없습니다.")
            missing_gu.append(gu_name)
            # 기본 좌표 (서울시청) 사용
            geometries.append(Point(126.9780, 37.5665))
    
    if missing_gu:
        print(f"좌표를 찾지 못한 자치구: {missing_gu}")
    
    # GeoDataFrame 생성
    gdf = gpd.GeoDataFrame(df, geometry=geometries, crs='EPSG:4326')  # WGS84 좌표계
    
    # 범죄율 계산 (히트맵 서비스와 동일한 로직)
    crime_columns = ['살인 발생', '강도 발생', '강간 발생', '절도 발생', '폭력 발생']
    available_crime_cols = [col for col in crime_columns if col in gdf.columns]
    
    if available_crime_cols:
        gdf['총_범죄_발생'] = gdf[available_crime_cols].sum(axis=1)
    else:
        gdf['총_범죄_발생'] = 0
    
    if '인구' in gdf.columns:
        gdf['crime_rate'] = (gdf['총_범죄_발생'] / gdf['인구']) * 10000
        gdf['crime_rate'] = gdf['crime_rate'].replace([np.inf, -np.inf], np.nan)
        gdf['crime_rate'] = gdf['crime_rate'].fillna(0)
    else:
        gdf['crime_rate'] = 0
    
    # 컬럼명을 영어로 변환 (shapefile 호환성 - 최대 10자)
    column_mapping = {
        '자치구': 'GU_NAME',
        '관서명': 'STATION',
        '소계': 'CCTV_TOT',
        '인구': 'POPULATION',
        '살인 발생': 'MURDER_OC',
        '살인 검거': 'MURDER_AR',
        '강도 발생': 'ROBBERY_OC',
        '강도 검거': 'ROBBERY_AR',
        '강간 발생': 'RAPE_OCC',
        '강간 검거': 'RAPE_ARR',
        '절도 발생': 'THEFT_OCC',
        '절도 검거': 'THEFT_ARR',
        '폭력 발생': 'VIOLENCE_',
        '폭력 검거': 'VIOLENCE1',
        '총_범죄_발생': 'TOTAL_CRIM',
        'crime_rate': 'CRIME_RATE',
    }
    
    # 컬럼명 변경
    rename_dict = {k: v for k, v in column_mapping.items() if k in gdf.columns}
    gdf = gdf.rename(columns=rename_dict)
    
    # Shapefile 저장
    print(f"\nShapefile 저장 중: {output_path}")
    gdf.to_file(str(output_path), driver='ESRI Shapefile', encoding='utf-8')
    
    print(f"Shapefile 생성 완료!")
    print(f"   저장 위치: {output_path}")
    print(f"   생성된 파일:")
    print(f"     - {output_path}.shp (기하학적 데이터)")
    print(f"     - {output_path}.shx (인덱스 파일)")
    print(f"     - {output_path}.dbf (속성 데이터)")
    print(f"     - {output_path}.prj (좌표계 정보)")
    print(f"\n   총 {len(gdf)} 개 자치구 데이터")
    print(f"   컬럼: {list(gdf.columns)}")
    
    # 통계 정보 출력
    if 'CRIME_RATE' in gdf.columns:
        print(f"\n범죄율 통계:")
        print(f"   최소: {gdf['CRIME_RATE'].min():.2f}")
        print(f"   최대: {gdf['CRIME_RATE'].max():.2f}")
        print(f"   평균: {gdf['CRIME_RATE'].mean():.2f}")
    
    return output_path


if __name__ == "__main__":
    create_shapefile_from_csv()

