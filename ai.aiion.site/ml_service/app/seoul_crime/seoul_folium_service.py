"""
서울시 범죄 데이터 Folium 지도 생성 서비스
Folium을 사용하여 서울시 자치구별 범죄율 지도 시각화
"""

import pandas as pd
import folium
import json
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np

try:
    from common.utils import setup_logging
    logger = setup_logging("seoul_folium_service")
except ImportError:
    import logging
    logger = logging.getLogger("seoul_folium_service")


class SeoulFoliumService:
    """서울시 범죄 데이터 Folium 지도 생성 서비스"""
    
    # 서울시 중심 좌표
    SEOUL_CENTER = [37.5665, 126.9780]
    
    def __init__(self):
        self.save_dir = Path(__file__).parent / "save"
        self.data_dir = Path(__file__).parent / "data"
        self.geojson_path = self.data_dir / "kr-state.json"
        self.merged_data_path = self.save_dir / "merged_data.csv"
        
        self.geojson_data: Optional[Dict[str, Any]] = None
        self.crime_data: Optional[pd.DataFrame] = None
        self.map: Optional[folium.Map] = None
        
        # 데이터 로드
        self._load_geojson()
        self._load_crime_data()
    
    def _load_geojson(self) -> Dict[str, Any]:
        """서울시 자치구 경계 GeoJSON 데이터 로드"""
        try:
            if not self.geojson_path.exists():
                raise FileNotFoundError(f"GeoJSON 파일을 찾을 수 없습니다: {self.geojson_path}")
            
            with open(self.geojson_path, 'r', encoding='utf-8') as f:
                self.geojson_data = json.load(f)
            
            logger.info(f"GeoJSON 데이터 로드 완료: {len(self.geojson_data.get('features', []))}개 자치구")
            return self.geojson_data
            
        except Exception as e:
            logger.error(f"GeoJSON 데이터 로드 실패: {e}")
            raise
    
    def _load_crime_data(self) -> pd.DataFrame:
        """범죄 데이터 로드 및 범죄율 계산"""
        try:
            if not self.merged_data_path.exists():
                raise FileNotFoundError(f"범죄 데이터 파일을 찾을 수 없습니다: {self.merged_data_path}")
            
            self.crime_data = pd.read_csv(self.merged_data_path, encoding='utf-8-sig')
            logger.info(f"범죄 데이터 로드 완료: {len(self.crime_data)}개 자치구")
            
            # 범죄율 및 검거율 계산
            self._calculate_crime_rate()
            self._calculate_arrest_rate()
            
            return self.crime_data
            
        except Exception as e:
            logger.error(f"범죄 데이터 로드 실패: {e}")
            raise
    
    def _calculate_crime_rate(self):
        """범죄율 계산 (인구 1만 명당 범죄 발생 건수)"""
        if self.crime_data is None:
            return
        
        # 총 범죄 발생 건수 계산
        crime_columns = ['살인 발생', '강도 발생', '강간 발생', '절도 발생', '폭력 발생']
        available_crime_cols = [col for col in crime_columns if col in self.crime_data.columns]
        
        if available_crime_cols:
            self.crime_data['총_범죄_발생'] = self.crime_data[available_crime_cols].sum(axis=1)
        else:
            logger.warning("범죄 발생 컬럼을 찾을 수 없습니다.")
            self.crime_data['총_범죄_발생'] = 0
        
        # 범죄율 계산 (인구 1만 명당)
        if '인구' in self.crime_data.columns:
            self.crime_data['crime_rate'] = (self.crime_data['총_범죄_발생'] / self.crime_data['인구']) * 10000
            # 무한대나 NaN 값 처리
            self.crime_data['crime_rate'] = self.crime_data['crime_rate'].replace([np.inf, -np.inf], np.nan)
            self.crime_data['crime_rate'] = self.crime_data['crime_rate'].fillna(0)
        else:
            logger.warning("인구 컬럼을 찾을 수 없습니다.")
            self.crime_data['crime_rate'] = 0
        
        logger.info(f"범죄율 계산 완료. 평균: {self.crime_data['crime_rate'].mean():.2f}, 최대: {self.crime_data['crime_rate'].max():.2f}")
    
    def _calculate_arrest_rate(self):
        """검거율 계산 (총 검거 건수 / 총 범죄 발생 건수 * 100)"""
        if self.crime_data is None:
            return
        
        # 총 검거 건수 계산
        arrest_columns = ['살인 검거', '강도 검거', '강간 검거', '절도 검거', '폭력 검거']
        available_arrest_cols = [col for col in arrest_columns if col in self.crime_data.columns]
        
        if available_arrest_cols:
            self.crime_data['총_검거'] = self.crime_data[available_arrest_cols].sum(axis=1)
        else:
            logger.warning("검거 컬럼을 찾을 수 없습니다.")
            self.crime_data['총_검거'] = 0
        
        # 검거율 계산
        if '총_범죄_발생' in self.crime_data.columns:
            # 0으로 나누기 방지
            self.crime_data['arrest_rate'] = (
                (self.crime_data['총_검거'] / self.crime_data['총_범죄_발생']) * 100
            ).replace([np.inf, -np.inf], np.nan).fillna(0)
        else:
            logger.warning("총_범죄_발생 컬럼이 없습니다.")
            self.crime_data['arrest_rate'] = 0
        
        logger.info(f"검거율 계산 완료. 평균: {self.crime_data['arrest_rate'].mean():.2f}%, 최대: {self.crime_data['arrest_rate'].max():.2f}%")
    
    def _normalize_gu_name(self, name: str) -> str:
        """자치구 이름 정규화"""
        if pd.isna(name) or not name:
            return ""
        name = str(name).strip()
        name = name.replace(" ", "").replace("  ", "")
        return name
    
    def create_map(
        self,
        location: list = None,
        zoom_start: int = 11,
        fill_color: str = "Reds",
        fill_opacity: float = 0.7,
        line_opacity: float = 0.8,
        legend_name: str = "범죄율 (인구 1만명당)"
    ) -> folium.Map:
        """
        서울시 범죄율 히트맵 지도 생성
        
        Args:
            location: 지도 중심 좌표 [위도, 경도] (기본값: 서울시청)
            zoom_start: 초기 줌 레벨
            fill_color: 채우기 색상 (컬러맵: Reds, YlOrRd, OrRd 등)
            fill_opacity: 채우기 투명도
            line_opacity: 경계선 투명도
            legend_name: 범례 이름
        
        Returns:
            Folium Map 객체
        """
        if location is None:
            location = self.SEOUL_CENTER
        
        if self.geojson_data is None:
            self._load_geojson()
        
        if self.crime_data is None:
            self._load_crime_data()
        
        # 지도 생성
        self.map = folium.Map(location=location, zoom_start=zoom_start, tiles='OpenStreetMap')
        
        # 데이터 준비: 자치구별 정보 딕셔너리 생성
        crime_dict = {}
        arrest_dict = {}
        cctv_dict = {}
        
        for _, row in self.crime_data.iterrows():
            gu_name = self._normalize_gu_name(row['자치구'])
            crime_dict[gu_name] = row['crime_rate']
            arrest_dict[gu_name] = row.get('arrest_rate', 0)
            cctv_dict[gu_name] = row.get('소계', 0)  # CCTV 개수
        
        # 1. 범죄율 Choropleth (붉은색 그라데이션) - 기본 레이어
        crime_df = pd.DataFrame([
            {'자치구': gu_name, 'crime_rate': rate}
            for gu_name, rate in crime_dict.items()
        ])
        
        folium.Choropleth(
            geo_data=self.geojson_data,
            name="범죄율 (인구 1만명당)",
            data=crime_df,
            columns=['자치구', 'crime_rate'],
            key_on='feature.id',
            fill_color='Reds',
            fill_opacity=fill_opacity,
            line_opacity=line_opacity,
            legend_name="범죄율 (인구 1만명당)",
        ).add_to(self.map)
        
        # 2. 검거율 Choropleth (파란색 그라데이션) - 별도 레이어
        arrest_df = pd.DataFrame([
            {'자치구': gu_name, 'arrest_rate': rate}
            for gu_name, rate in arrest_dict.items()
        ])
        
        folium.Choropleth(
            geo_data=self.geojson_data,
            name="검거율 (%)",
            data=arrest_df,
            columns=['자치구', 'arrest_rate'],
            key_on='feature.id',
            fill_color='Blues',
            fill_opacity=fill_opacity,
            line_opacity=line_opacity,
            legend_name="검거율 (%)",
        ).add_to(self.map)
        
        # 3. CCTV 개수 텍스트 레이블 추가
        for feature in self.geojson_data.get('features', []):
            gu_id = feature.get('id', '')
            gu_name = self._normalize_gu_name(gu_id)
            crime_rate = crime_dict.get(gu_name, 0)
            arrest_rate = arrest_dict.get(gu_name, 0)
            cctv_count = cctv_dict.get(gu_name, 0)
            
            # 중심점 계산
            geometry = feature.get('geometry', {})
            if geometry.get('type') == 'Polygon':
                coords = geometry.get('coordinates', [])[0]
                center_lat = sum(coord[1] for coord in coords) / len(coords)
                center_lon = sum(coord[0] for coord in coords) / len(coords)
                
                # CCTV 개수 텍스트 레이블 추가
                folium.Marker(
                    [center_lat, center_lon],
                    icon=folium.DivIcon(
                        html=f'''
                        <div style="
                            font-size: 12px; 
                            font-weight: bold; 
                            color: #2c3e50;
                            background-color: rgba(255, 255, 255, 0.8);
                            border: 2px solid #34495e;
                            border-radius: 5px;
                            padding: 3px 6px;
                            text-align: center;
                            box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                        ">
                            CCTV: {int(cctv_count):,}
                        </div>
                        ''',
                        icon_size=(80, 30),
                        icon_anchor=(40, 15)
                    ),
                    tooltip=f"{gu_name}<br>CCTV: {int(cctv_count):,}개"
                ).add_to(self.map)
            
            # GeoJSON feature에 정보 추가 (팝업용)
            feature['properties']['crime_rate'] = f"{crime_rate:.2f}"
            feature['properties']['arrest_rate'] = f"{arrest_rate:.2f}%"
            feature['properties']['cctv_count'] = f"{int(cctv_count):,}개"
        
        # 4. 상세 정보 툴팁 및 팝업 레이어
        folium.GeoJson(
            self.geojson_data,
            name="상세 정보",
            style_function=lambda feature: {
                'fillColor': 'transparent',
                'color': 'black',
                'weight': 2,
                'fillOpacity': 0
            },
            tooltip=folium.GeoJsonTooltip(
                fields=['name', 'crime_rate', 'arrest_rate', 'cctv_count'],
                aliases=['자치구:', '범죄율 (1만명당):', '검거율:', 'CCTV 개수:'],
                localize=True,
                style=(
                    "background-color: white;"
                    "border: 2px solid black;"
                    "border-radius: 3px;"
                    "box-shadow: 3px 3px 4px;"
                    "font-size: 12px;"
                    "padding: 5px;"
                )
            ),
            popup=folium.GeoJsonPopup(
                fields=['name', 'crime_rate', 'arrest_rate', 'cctv_count'],
                aliases=['자치구:', '범죄율 (1만명당):', '검거율:', 'CCTV 개수:'],
                localize=True,
                max_width=300
            )
        ).add_to(self.map)
        
        # 범례 추가
        self._add_legend()
        
        # 레이어 컨트롤 추가 (각 레이어를 on/off 할 수 있음)
        folium.LayerControl(
            position='topright',
            collapsed=False
        ).add_to(self.map)
        
        logger.info("서울시 범죄율 히트맵 지도 생성 완료")
        
        return self.map
    
    def _get_color(self, value: float, colormap: str = "Reds") -> str:
        """값에 따른 색상 반환"""
        if pd.isna(value) or value == 0:
            return '#ffffff'
        
        # 색상 맵 정의
        color_maps = {
            'Reds': ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
            'YlOrRd': ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
            'OrRd': ['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000', '#7f0000'],
            'YlGn': ['#ffffe5', '#f7fcb9', '#d9f0a3', '#addd8e', '#78c679', '#41ab5d', '#238443', '#006837', '#004529']
        }
        
        colors = color_maps.get(colormap, color_maps['Reds'])
        
        # 범죄율 범위에 따른 색상 선택
        max_rate = self.crime_data['crime_rate'].max() if self.crime_data is not None else 100
        normalized = min(value / max_rate, 1.0) if max_rate > 0 else 0
        
        index = int(normalized * (len(colors) - 1))
        return colors[index]
    
    def _add_legend(self):
        """범례 추가 (범죄율, 검거율, CCTV 통계)"""
        if self.crime_data is None:
            return
        
        max_crime = self.crime_data['crime_rate'].max()
        min_crime = self.crime_data['crime_rate'].min()
        avg_crime = self.crime_data['crime_rate'].mean()
        
        max_arrest = self.crime_data['arrest_rate'].max() if 'arrest_rate' in self.crime_data.columns else 0
        min_arrest = self.crime_data['arrest_rate'].min() if 'arrest_rate' in self.crime_data.columns else 0
        avg_arrest = self.crime_data['arrest_rate'].mean() if 'arrest_rate' in self.crime_data.columns else 0
        
        total_cctv = int(self.crime_data['소계'].sum()) if '소계' in self.crime_data.columns else 0
        avg_cctv = self.crime_data['소계'].mean() if '소계' in self.crime_data.columns else 0
        
        legend_html = f'''
        <div style="position: fixed; 
                    bottom: 50px; right: 50px; width: 250px; height: auto; 
                    background-color: white; border:3px solid #34495e; z-index:9999; 
                    font-size:12px; padding: 15px; border-radius: 5px;
                    box-shadow: 3px 3px 10px rgba(0,0,0,0.3);">
        <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">📊 통계 정보</h4>
        
        <div style="margin-bottom: 10px; padding: 8px; background-color: #fee5d9; border-left: 4px solid #de2d26; border-radius: 3px;">
            <b style="color: #a50f15;">🔴 범죄율 (1만명당)</b><br>
            최소: {min_crime:.2f} | 최대: {max_crime:.2f}<br>
            평균: {avg_crime:.2f}
        </div>
        
        <div style="margin-bottom: 10px; padding: 8px; background-color: #deebf7; border-left: 4px solid #3182bd; border-radius: 3px;">
            <b style="color: #08519c;">🔵 검거율 (%)</b><br>
            최소: {min_arrest:.2f}% | 최대: {max_arrest:.2f}%<br>
            평균: {avg_arrest:.2f}%
        </div>
        
        <div style="padding: 8px; background-color: #f0f0f0; border-left: 4px solid #636363; border-radius: 3px;">
            <b style="color: #2c3e50;">📹 CCTV</b><br>
            총합: {total_cctv:,}개<br>
            평균: {avg_cctv:.0f}개/구
        </div>
        </div>
        '''
        self.map.get_root().html.add_child(folium.Element(legend_html))
    
    def save_map(self, file_path: Optional[Path] = None) -> Path:
        """
        지도를 HTML 파일로 저장
        
        Args:
            file_path: 저장 경로 (None이면 자동 생성)
        
        Returns:
            저장된 파일 경로
        """
        if self.map is None:
            raise ValueError("지도가 생성되지 않았습니다. create_map()을 먼저 호출하세요.")
        
        if file_path is None:
            file_path = self.save_dir / "seoul_crime_map.html"
        
        self.map.save(str(file_path))
        logger.info(f"지도 저장 완료: {file_path}")
        
        return file_path
    
    def get_map_html(self) -> str:
        """
        지도를 HTML 문자열로 반환
        
        Returns:
            HTML 문자열
        """
        if self.map is None:
            raise ValueError("지도가 생성되지 않았습니다. create_map()을 먼저 호출하세요.")
        
        return self.map._repr_html_()
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        범죄율, 검거율, CCTV 통계 정보 반환
        
        Returns:
            통계 정보 딕셔너리
        """
        if self.crime_data is None:
            self._load_crime_data()
        
        stats = {
            "total_districts": len(self.crime_data),
            "crime_rate": {
                "min": float(self.crime_data['crime_rate'].min()),
                "max": float(self.crime_data['crime_rate'].max()),
                "avg": float(self.crime_data['crime_rate'].mean()),
                "median": float(self.crime_data['crime_rate'].median())
            }
        }
        
        # 검거율 통계
        if 'arrest_rate' in self.crime_data.columns:
            stats["arrest_rate"] = {
                "min": float(self.crime_data['arrest_rate'].min()),
                "max": float(self.crime_data['arrest_rate'].max()),
                "avg": float(self.crime_data['arrest_rate'].mean()),
                "median": float(self.crime_data['arrest_rate'].median())
            }
        
        # CCTV 통계
        if '소계' in self.crime_data.columns:
            stats["cctv"] = {
                "total": int(self.crime_data['소계'].sum()),
                "min": int(self.crime_data['소계'].min()),
                "max": int(self.crime_data['소계'].max()),
                "avg": float(self.crime_data['소계'].mean()),
                "median": float(self.crime_data['소계'].median())
            }
        
        return stats

