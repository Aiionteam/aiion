"""
US Unemployment Service - OOP 방식
미국 실업률 데이터를 Folium을 사용하여 지도 시각화
"""

import requests
import pandas as pd
import folium
from pathlib import Path
from typing import Optional, Dict, Any
import json

try:
    from common.utils import setup_logging
    logger = setup_logging("us_unemployment_service")
except ImportError:
    import logging
    logger = logging.getLogger("us_unemployment_service")


class USUnemploymentService:
    """미국 실업률 데이터 시각화 서비스"""
    
    # 기본 URL
    STATE_GEO_URL = "https://raw.githubusercontent.com/python-visualization/folium-example-data/main/us_states.json"
    STATE_DATA_URL = "https://raw.githubusercontent.com/python-visualization/folium-example-data/main/us_unemployment_oct_2012.csv"
    
    def __init__(self):
        """서비스 초기화"""
        self.state_geo: Optional[Dict[str, Any]] = None
        self.state_data: Optional[pd.DataFrame] = None
        self.map: Optional[folium.Map] = None
    
    def load_state_geo(self) -> Dict[str, Any]:
        """
        미국 주 경계 GeoJSON 데이터 로드
        
        Returns:
            GeoJSON 딕셔너리
        """
        try:
            response = requests.get(self.STATE_GEO_URL, timeout=10)
            response.raise_for_status()
            self.state_geo = response.json()
            logger.info(f"주 경계 데이터 로드 완료: {len(self.state_geo.get('features', []))}개 주")
            return self.state_geo
        except Exception as e:
            logger.error(f"주 경계 데이터 로드 실패: {e}")
            raise
    
    def load_state_data(self) -> pd.DataFrame:
        """
        미국 실업률 데이터 로드
        
        Returns:
            실업률 데이터프레임
        """
        try:
            logger.info(f"실업률 데이터 로드 시도: {self.STATE_DATA_URL}")
            # pandas.read_csv는 timeout을 지원하지 않으므로 requests로 먼저 다운로드
            import requests
            response = requests.get(self.STATE_DATA_URL, timeout=10)
            response.raise_for_status()
            
            # StringIO를 사용하여 CSV 데이터를 DataFrame으로 변환
            from io import StringIO
            self.state_data = pd.read_csv(StringIO(response.text))
            
            logger.info(f"실업률 데이터 로드 완료: {len(self.state_data)} 행")
            logger.info(f"데이터프레임 컬럼: {list(self.state_data.columns)}")
            
            # 데이터 확인
            if len(self.state_data) == 0:
                raise ValueError("로드된 데이터가 비어있습니다.")
            
            if "Unemployment" not in self.state_data.columns:
                logger.warning(f"'Unemployment' 컬럼이 없습니다. 사용 가능한 컬럼: {list(self.state_data.columns)}")
                # 대소문자 구분 없이 찾기
                for col in self.state_data.columns:
                    if col.lower() == "unemployment":
                        logger.info(f"대소문자 다른 컬럼 발견: {col}")
                        self.state_data = self.state_data.rename(columns={col: "Unemployment"})
                        break
                else:
                    raise ValueError(f"'Unemployment' 컬럼을 찾을 수 없습니다. 사용 가능한 컬럼: {list(self.state_data.columns)}")
            
            return self.state_data
        except pd.errors.EmptyDataError as e:
            logger.error(f"빈 데이터 파일: {e}")
            raise ValueError(f"데이터 파일이 비어있습니다: {e}")
        except Exception as e:
            logger.error(f"실업률 데이터 로드 실패: {e}")
            logger.error(f"URL: {self.STATE_DATA_URL}")
            raise
    
    def create_map(
        self,
        location: list = [48, -102],
        zoom_start: int = 3,
        fill_color: str = "YlGn",
        fill_opacity: float = 0.7,
        line_opacity: float = 0.2,
        legend_name: str = "Unemployment Rate (%)"
    ) -> folium.Map:
        """
        실업률 히트맵 지도 생성
        
        Args:
            location: 지도 중심 좌표 [위도, 경도]
            zoom_start: 초기 줌 레벨
            fill_color: 채우기 색상 (컬러맵)
            fill_opacity: 채우기 투명도
            line_opacity: 경계선 투명도
            legend_name: 범례 이름
        
        Returns:
            Folium Map 객체
        """
        # 데이터 로드
        if self.state_geo is None:
            self.load_state_geo()
        
        if self.state_data is None:
            self.load_state_data()
        
        # 지도 생성
        self.map = folium.Map(location=location, zoom_start=zoom_start)
        
        # Choropleth 추가
        folium.Choropleth(
            geo_data=self.state_geo,
            name="choropleth",
            data=self.state_data,
            columns=["State", "Unemployment"],
            key_on="feature.id",
            fill_color=fill_color,
            fill_opacity=fill_opacity,
            line_opacity=line_opacity,
            legend_name=legend_name,
        ).add_to(self.map)
        
        # 레이어 컨트롤 추가
        folium.LayerControl().add_to(self.map)
        
        logger.info("실업률 히트맵 지도 생성 완료")
        
        return self.map
    
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
            file_path = Path(__file__).parent / "us_unemployment_map.html"
        
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
        실업률 통계 정보 반환
        
        Returns:
            통계 정보 딕셔너리
        """
        try:
            if self.state_data is None:
                self.load_state_data()
            
            if self.state_data is None or len(self.state_data) == 0:
                raise ValueError("실업률 데이터가 로드되지 않았습니다.")
            
            # 컬럼 확인
            if "Unemployment" not in self.state_data.columns:
                logger.error(f"사용 가능한 컬럼: {list(self.state_data.columns)}")
                raise ValueError("'Unemployment' 컬럼을 찾을 수 없습니다.")
            
            # NaN 값 처리
            unemployment_series = self.state_data["Unemployment"].dropna()
            
            if len(unemployment_series) == 0:
                raise ValueError("실업률 데이터가 없습니다.")
            
            return {
                "total_states": len(self.state_data),
                "min_unemployment": float(unemployment_series.min()),
                "max_unemployment": float(unemployment_series.max()),
                "avg_unemployment": float(unemployment_series.mean()),
                "median_unemployment": float(unemployment_series.median()),
            }
        except Exception as e:
            logger.error(f"통계 정보 생성 중 오류: {str(e)}")
            logger.error(f"데이터 상태: state_data is None={self.state_data is None}")
            if self.state_data is not None:
                logger.error(f"데이터프레임 shape: {self.state_data.shape}")
                logger.error(f"데이터프레임 컬럼: {list(self.state_data.columns)}")
            raise