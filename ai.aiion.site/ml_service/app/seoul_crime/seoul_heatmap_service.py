"""
서울시 범죄 데이터 히트맵 생성 서비스
geopandas와 matplotlib을 사용하여 서울시 자치구별 범죄율 히트맵 생성
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # 백엔드 설정 (서버 환경에서 사용)
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import io
import base64
import os

try:
    import geopandas as gpd
    GEOPANDAS_AVAILABLE = True
except ImportError:
    GEOPANDAS_AVAILABLE = False
    print("경고: geopandas가 설치되지 않았습니다. pip install geopandas를 실행하세요.")

try:
    from common.utils import setup_logging
    logger = setup_logging("seoul_heatmap_service")
except ImportError:
    import logging
    logger = logging.getLogger("seoul_heatmap_service")


class SeoulHeatmapService:
    """서울시 범죄 데이터 히트맵 생성 서비스"""
    
    def __init__(self):
        self.save_dir = Path(__file__).parent / "save"  # save 폴더 경로
        self.data_dir = Path(__file__).parent / "data"  # data 폴더 경로
        self.shapefile_path = None
        self._load_shapefile()
    
    def _load_shapefile(self):
        """shapefile 경로 찾기"""
        # 가능한 shapefile 경로들
        possible_paths = [
            self.data_dir / "seoul_gu_shapefile.shp",
            self.data_dir / "seoul_gu.shp",
            self.save_dir / "seoul_gu_shapefile.shp",
            self.save_dir / "seoul_gu.shp",
        ]
        
        for path in possible_paths:
            if path.exists():
                self.shapefile_path = path
                logger.info(f"Shapefile 발견: {path}")
                return
        
        logger.warning("Shapefile을 찾을 수 없습니다. GeoJSON을 사용하거나 shapefile을 다운로드해야 합니다.")
    
    def _normalize_gu_name(self, name: str) -> str:
        """
        자치구 이름 정규화 (공백, 띄어쓰기 제거)
        예: "강남구" -> "강남구", "강남 구" -> "강남구"
        """
        if pd.isna(name) or not name:
            return ""
        name = str(name).strip()
        # 공백 제거
        name = name.replace(" ", "").replace("  ", "")
        return name
    
    def _calculate_crime_rate(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        범죄율 계산
        총 범죄 발생 건수 / 인구 * 10000 (인구 1만 명당 범죄 발생 건수)
        """
        df = df.copy()
        
        # 총 범죄 발생 건수 계산
        crime_columns = ['살인 발생', '강도 발생', '강간 발생', '절도 발생', '폭력 발생']
        available_crime_cols = [col for col in crime_columns if col in df.columns]
        
        if available_crime_cols:
            df['총_범죄_발생'] = df[available_crime_cols].sum(axis=1)
        else:
            logger.warning("범죄 발생 컬럼을 찾을 수 없습니다.")
            df['총_범죄_발생'] = 0
        
        # 범죄율 계산 (인구 1만 명당)
        if '인구' in df.columns:
            df['crime_rate'] = (df['총_범죄_발생'] / df['인구']) * 10000
            # 무한대나 NaN 값 처리
            df['crime_rate'] = df['crime_rate'].replace([np.inf, -np.inf], np.nan)
            df['crime_rate'] = df['crime_rate'].fillna(0)
        else:
            logger.warning("인구 컬럼을 찾을 수 없습니다.")
            df['crime_rate'] = 0
        
        return df
    
    def _load_merged_data(self) -> pd.DataFrame:
        """merged_data.csv 로드"""
        merged_csv_path = self.save_dir / "merged_data.csv"
        
        if not merged_csv_path.exists():
            raise FileNotFoundError(f"merged_data.csv를 찾을 수 없습니다: {merged_csv_path}")
        
        df = pd.read_csv(merged_csv_path, encoding='utf-8-sig')
        logger.info(f"merged_data.csv 로드 완료: {len(df)} 행")
        
        # 범죄율 계산
        df = self._calculate_crime_rate(df)
        
        # 자치구 이름 정규화
        if '자치구' in df.columns:
            df['자치구_정규화'] = df['자치구'].apply(self._normalize_gu_name)
        else:
            raise ValueError("'자치구' 컬럼을 찾을 수 없습니다.")
        
        return df
    
    def _load_shapefile_data(self) -> Optional[gpd.GeoDataFrame]:
        """shapefile 데이터 로드"""
        if not GEOPANDAS_AVAILABLE:
            logger.error("geopandas가 설치되지 않았습니다.")
            return None
        
        if not self.shapefile_path or not self.shapefile_path.exists():
            logger.warning("Shapefile을 찾을 수 없습니다. GeoJSON을 시도합니다.")
            # GeoJSON 파일 시도 (우선순위: kr-state.json > seoul_gu.geojson)
            geojson_paths = [
                self.data_dir / "kr-state.json",  # 서울시 경계선 데이터 (최우선)
                self.data_dir / "seoul_gu.geojson",
                self.data_dir / "seoul_gu.json",
                self.save_dir / "seoul_gu.geojson",
            ]
            
            for path in geojson_paths:
                if path.exists():
                    try:
                        gdf = gpd.read_file(str(path))
                        logger.info(f"GeoJSON 로드 완료: {path}")
                        logger.info(f"로드된 자치구 수: {len(gdf)}")
                        logger.info(f"사용 가능한 컬럼: {list(gdf.columns)}")
                        return gdf
                    except Exception as e:
                        logger.error(f"GeoJSON 로드 실패 ({path}): {e}")
                        continue
            
            logger.error("Shapefile 또는 GeoJSON을 찾을 수 없습니다.")
            return None
        
        try:
            gdf = gpd.read_file(str(self.shapefile_path))
            logger.info(f"Shapefile 로드 완료: {self.shapefile_path}")
            return gdf
        except Exception as e:
            logger.error(f"Shapefile 로드 실패: {e}")
            return None
    
    def _merge_data_with_shapefile(self, df: pd.DataFrame, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """데이터프레임과 shapefile 병합"""
        # shapefile의 자치구 컬럼 찾기
        gu_column = None
        possible_gu_columns = ['GU_NAME', 'GU_NAME_KR', 'SIG_KOR_NM', 'SIG_CD', 'name', '자치구', '구']
        
        for col in possible_gu_columns:
            if col in gdf.columns:
                gu_column = col
                logger.info(f"자치구 컬럼 발견: {col}")
                break
        
        if not gu_column:
            # 모든 컬럼 확인
            logger.warning(f"자치구 컬럼을 찾을 수 없습니다. 사용 가능한 컬럼: {list(gdf.columns)}")
            # 첫 번째 문자열 컬럼 사용 시도
            for col in gdf.columns:
                if gdf[col].dtype == 'object':
                    gu_column = col
                    logger.info(f"문자열 컬럼을 자치구로 사용: {col}")
                    break
        
        if not gu_column:
            raise ValueError("shapefile에서 자치구 컬럼을 찾을 수 없습니다.")
        
        # shapefile의 자치구 이름 정규화
        gdf['자치구_정규화'] = gdf[gu_column].apply(self._normalize_gu_name)
        
        # 병합
        merged_gdf = gdf.merge(
            df[['자치구_정규화', 'crime_rate', '총_범죄_발생', '인구'] + 
                [col for col in df.columns if col not in ['자치구_정규화', 'crime_rate', '총_범죄_발생', '인구']]],
            on='자치구_정규화',
            how='left'
        )
        
        logger.info(f"데이터 병합 완료: {len(merged_gdf)} 행")
        
        return merged_gdf
    
    def create_heatmap(
        self, 
        cmap: str = 'Reds',
        figsize: Tuple[int, int] = (12, 10),
        dpi: int = 300,
        save_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        서울시 자치구별 범죄율 히트맵 생성
        
        Args:
            cmap: 컬러맵 ('Reds', 'OrRd', 'YlOrRd' 등)
            figsize: 그림 크기 (너비, 높이)
            dpi: 해상도
            save_path: 저장 경로 (None이면 자동 생성)
        
        Returns:
            딕셔너리 (base64 이미지, 저장 경로 등)
        """
        try:
            # 데이터 로드
            df = self._load_merged_data()
            
            # shapefile 로드
            gdf = self._load_shapefile_data()
            
            if gdf is None:
                # shapefile이 없으면 단순 막대 그래프로 대체
                logger.warning("Shapefile이 없어 막대 그래프로 대체합니다.")
                return self._create_bar_chart(df, cmap, figsize, dpi, save_path)
            
            # 데이터 병합
            merged_gdf = self._merge_data_with_shapefile(df, gdf)
            
            # 범죄율이 없는 지역 처리
            merged_gdf['crime_rate'] = merged_gdf['crime_rate'].fillna(0)
            
            # 히트맵 생성
            fig, ax = plt.subplots(1, 1, figsize=figsize, dpi=dpi)
            
            # 지도 그리기
            merged_gdf.plot(
                column='crime_rate',
                cmap=cmap,
                ax=ax,
                edgecolor='black',
                linewidth=0.5,
                legend=True,
                legend_kwds={
                    'label': '범죄율 (인구 1만 명당)',
                    'orientation': 'vertical',
                    'shrink': 0.8
                }
            )
            
            # 제목 및 레이블
            ax.set_title('서울시 자치구별 범죄율 히트맵', fontsize=16, fontweight='bold', pad=20)
            ax.set_xlabel('경도', fontsize=12)
            ax.set_ylabel('위도', fontsize=12)
            
            # 축 제거 (선택사항)
            ax.axis('off')
            
            # 자치구 이름 표시 (선택사항)
            # merged_gdf.apply(lambda x: ax.annotate(
            #     text=x['자치구_정규화'] if '자치구_정규화' in x else '',
            #     xy=x.geometry.centroid.coords[0],
            #     ha='center',
            #     fontsize=8
            # ), axis=1)
            
            plt.tight_layout()
            
            # 이미지 저장
            if save_path is None:
                save_path = self.save_dir / "seoul_crime_heatmap.png"
            
            plt.savefig(save_path, dpi=dpi, bbox_inches='tight')
            logger.info(f"히트맵 저장 완료: {save_path}")
            
            # Base64 인코딩
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=dpi, bbox_inches='tight')
            img_buffer.seek(0)
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            img_buffer.close()
            
            plt.close()
            
            return {
                "status": "success",
                "image_path": str(save_path),
                "image_base64": img_base64,
                "data_summary": {
                    "total_gu": len(merged_gdf),
                    "min_crime_rate": float(merged_gdf['crime_rate'].min()),
                    "max_crime_rate": float(merged_gdf['crime_rate'].max()),
                    "avg_crime_rate": float(merged_gdf['crime_rate'].mean()),
                }
            }
            
        except Exception as e:
            import traceback
            logger.error(f"히트맵 생성 중 오류 발생: {str(e)}")
            logger.error(traceback.format_exc())
            return {
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
            }
    
    def _create_bar_chart(
        self,
        df: pd.DataFrame,
        cmap: str = 'Reds',
        figsize: Tuple[int, int] = (12, 10),
        dpi: int = 300,
        save_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """shapefile이 없을 때 막대 그래프로 대체"""
        try:
            fig, ax = plt.subplots(1, 1, figsize=figsize, dpi=dpi)
            
            # 범죄율 기준 정렬
            df_sorted = df.sort_values('crime_rate', ascending=True)
            
            # 막대 그래프 생성
            colors = plt.cm.get_cmap(cmap)(df_sorted['crime_rate'] / df_sorted['crime_rate'].max())
            ax.barh(df_sorted['자치구'], df_sorted['crime_rate'], color=colors)
            
            ax.set_xlabel('범죄율 (인구 1만 명당)', fontsize=12)
            ax.set_ylabel('자치구', fontsize=12)
            ax.set_title('서울시 자치구별 범죄율', fontsize=16, fontweight='bold')
            ax.grid(axis='x', alpha=0.3)
            
            plt.tight_layout()
            
            if save_path is None:
                save_path = self.save_dir / "seoul_crime_bar_chart.png"
            
            plt.savefig(save_path, dpi=dpi, bbox_inches='tight')
            logger.info(f"막대 그래프 저장 완료: {save_path}")
            
            # Base64 인코딩
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=dpi, bbox_inches='tight')
            img_buffer.seek(0)
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            img_buffer.close()
            
            plt.close()
            
            return {
                "status": "success",
                "image_path": str(save_path),
                "image_base64": img_base64,
                "chart_type": "bar_chart",
                "note": "Shapefile이 없어 막대 그래프로 대체되었습니다.",
                "data_summary": {
                    "total_gu": len(df),
                    "min_crime_rate": float(df['crime_rate'].min()),
                    "max_crime_rate": float(df['crime_rate'].max()),
                    "avg_crime_rate": float(df['crime_rate'].mean()),
                }
            }
            
        except Exception as e:
            import traceback
            logger.error(f"막대 그래프 생성 중 오류 발생: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
            }

