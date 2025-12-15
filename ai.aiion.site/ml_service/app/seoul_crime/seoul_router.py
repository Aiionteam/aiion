"""
Seoul Crime Router - FastAPI 라우터
서울 범죄 데이터 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response, HTMLResponse
from typing import List, Dict, Optional
from pydantic import BaseModel
import base64
import logging

from app.seoul_crime.seoul_data import SeoulCrimeData
from app.seoul_crime.seoul_method import SeoulCrimeMethod
from app.seoul_crime.seoul_service import SeoulCrimeService
from app.seoul_crime.seoul_heatmap_service import SeoulHeatmapService
from app.seoul_crime.seoul_folium_service import SeoulFoliumService

# 로거 설정
try:
    from common.utils import setup_logging
    logger = setup_logging("seoul_crime_router")
except ImportError:
    logger = logging.getLogger("seoul_crime_router")

# 라우터 생성
router = APIRouter(
    prefix="/seoul-crime",
    tags=["seoul-crime"],
    responses={404: {"description": "Not found"}}
)

# 서비스 인스턴스
_seoul_crime_data: Optional[SeoulCrimeData] = None
_seoul_crime_method: Optional[SeoulCrimeMethod] = None
_seoul_crime_service: Optional[SeoulCrimeService] = None
_seoul_heatmap_service: Optional[SeoulHeatmapService] = None
_seoul_folium_service: Optional[SeoulFoliumService] = None


@router.post("/preprocess")
@router.get("/preprocess")
async def preprocess():
    """데이터 전처리 및 머지 실행 (전체 데이터 반환) - GET 또는 POST 지원"""
    try:
        service = get_seoul_crime_service()
        
        # 전처리 실행 (CCTV, 범죄, 인구 데이터 로드 및 머지)
        cctv_df, crime_df, pop_df, merged_df = service.preprocess()
        
        # DataFrame을 텍스트 테이블 형식으로 변환 (표 형식으로 보기 좋게)
        def df_to_table(df, max_rows=100):
            """DataFrame을 텍스트 테이블 형식으로 변환"""
            if len(df) == 0:
                return "데이터가 없습니다."
            # 최대 max_rows개만 표시
            display_df = df.head(max_rows)
            return display_df.to_string(index=True)
        
        return {
            "message": "데이터 전처리 및 머지가 완료되었습니다.",
            "status": "success",
            "summary": {
                "cctv_total_rows": len(cctv_df),
                "crime_total_rows": len(crime_df),
                "pop_total_rows": len(pop_df),
                "merged_total_rows": len(merged_df),
                "merged_columns": list(merged_df.columns) if len(merged_df) > 0 else []
            },
            "preprocessed_data": {
                "cctv": {
                    "rows": len(cctv_df),
                    "columns": len(cctv_df.columns),
                    "column_names": list(cctv_df.columns),
                    "table": df_to_table(cctv_df) if len(cctv_df) > 0 else "데이터가 없습니다.",
                    "data": cctv_df.to_dict(orient='records') if len(cctv_df) > 0 else []
                },
                "crime": {
                    "rows": len(crime_df),
                    "columns": len(crime_df.columns),
                    "column_names": list(crime_df.columns),
                    "table": df_to_table(crime_df) if len(crime_df) > 0 else "데이터가 없습니다.",
                    "data": crime_df.to_dict(orient='records') if len(crime_df) > 0 else []
                },
                "pop": {
                    "rows": len(pop_df),
                    "columns": len(pop_df.columns),
                    "column_names": list(pop_df.columns),
                    "table": df_to_table(pop_df) if len(pop_df) > 0 else "데이터가 없습니다.",
                    "data": pop_df.to_dict(orient='records') if len(pop_df) > 0 else []
                },
                "merged": {
                    "rows": len(merged_df),
                    "columns": len(merged_df.columns),
                    "column_names": list(merged_df.columns),
                    "description": "CCTV + 인구 + 범죄 데이터 머지 결과 (자치구 기준)",
                    "table": df_to_table(merged_df) if len(merged_df) > 0 else "데이터가 없습니다.",
                    "data": merged_df.to_dict(orient='records') if len(merged_df) > 0 else []
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"전처리 중 오류 발생: {str(e)}")


def get_seoul_crime_data() -> SeoulCrimeData:
    """서비스 인스턴스 싱글톤 패턴"""
    global _seoul_crime_data
    if _seoul_crime_data is None:
        _seoul_crime_data = SeoulCrimeData()
    return _seoul_crime_data


def get_seoul_crime_method() -> SeoulCrimeMethod:
    """메서드 인스턴스 싱글톤 패턴"""
    global _seoul_crime_method
    if _seoul_crime_method is None:
        _seoul_crime_method = SeoulCrimeMethod()
    return _seoul_crime_method


def get_seoul_crime_service() -> SeoulCrimeService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _seoul_crime_service
    if _seoul_crime_service is None:
        _seoul_crime_service = SeoulCrimeService()
    return _seoul_crime_service


def get_seoul_heatmap_service() -> SeoulHeatmapService:
    """히트맵 서비스 인스턴스 싱글톤 패턴"""
    global _seoul_heatmap_service
    if _seoul_heatmap_service is None:
        _seoul_heatmap_service = SeoulHeatmapService()
    return _seoul_heatmap_service


def get_seoul_folium_service() -> SeoulFoliumService:
    """Folium 서비스 인스턴스 싱글톤 패턴"""
    global _seoul_folium_service
    if _seoul_folium_service is None:
        _seoul_folium_service = SeoulFoliumService()
    return _seoul_folium_service


@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Seoul Crime Data Service",
        "description": "서울시 범죄, CCTV, 인구 데이터 조회 서비스",
        "endpoints": {
            "cctv": "/seoul-crime/cctv - CCTV 데이터 5개 조회",
            "crime": "/seoul-crime/crime - 범죄 데이터 5개 조회",
            "pop": "/seoul-crime/pop - 인구 데이터 5개 조회",
            "preprocess": "/seoul-crime/preprocess - 데이터 전처리 실행",
            "search_police_station": "/seoul-crime/search-police-station?station_name={name} - 경찰서 주소 및 좌표 검색"
        }
    }


@router.get("/cctv")
async def get_cctv(limit: int = 5):
    """CCTV 데이터 조회 (기본 5개)"""
    try:
        data = get_seoul_crime_data()
        
        if data.cctv is None:
            raise HTTPException(
                status_code=404,
                detail="CCTV 데이터를 찾을 수 없습니다."
            )
        
        # DataFrame을 딕셔너리 리스트로 변환
        df = data.cctv.head(limit)
        result = df.to_dict(orient='records')
        
        return {
            "count": len(result),
            "limit": limit,
            "total_rows": len(data.cctv),
            "cctv_data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CCTV 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/crime")
async def get_crime(limit: int = 5):
    """범죄 데이터 조회 (기본 5개)"""
    try:
        data = get_seoul_crime_data()
        
        if data.crime is None:
            raise HTTPException(
                status_code=404,
                detail="범죄 데이터를 찾을 수 없습니다."
            )
        
        # DataFrame을 딕셔너리 리스트로 변환
        df = data.crime.head(limit)
        result = df.to_dict(orient='records')
        
        return {
            "count": len(result),
            "limit": limit,
            "total_rows": len(data.crime),
            "crime_data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"범죄 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/pop")
async def get_pop(limit: int = 5):
    """인구 데이터 조회 (기본 5개)"""
    try:
        data = get_seoul_crime_data()
        
        if data.pop is None:
            raise HTTPException(
                status_code=404,
                detail="인구 데이터를 찾을 수 없습니다."
            )
        
        # DataFrame을 딕셔너리 리스트로 변환
        df = data.pop.head(limit)
        result = df.to_dict(orient='records')
        
        return {
            "count": len(result),
            "limit": limit,
            "total_rows": len(data.pop),
            "pop_data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인구 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/status")
async def service_status():
    """서비스 상태 및 통계"""
    try:
        data = get_seoul_crime_data()
        
        status = {
            "service": "Seoul Crime Data Service",
            "version": "1.0.0",
            "data_path": data.dname,
            "data_loaded": {
                "cctv": data.cctv is not None,
                "crime": data.crime is not None,
                "pop": data.pop is not None
            },
            "data_stats": {}
        }
        
        if data.cctv is not None:
            status["data_stats"]["cctv"] = {
                "rows": len(data.cctv),
                "columns": len(data.cctv.columns),
                "column_names": list(data.cctv.columns)
            }
        
        if data.crime is not None:
            status["data_stats"]["crime"] = {
                "rows": len(data.crime),
                "columns": len(data.crime.columns),
                "column_names": list(data.crime.columns)
            }
        
        if data.pop is not None:
            status["data_stats"]["pop"] = {
                "rows": len(data.pop),
                "columns": len(data.pop.columns),
                "column_names": list(data.pop.columns)
            }
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 확인 중 오류 발생: {str(e)}")


@router.get("/search-police-station")
async def search_police_station(station_name: str = None, name: str = None):
    """
    경찰서 이름으로 주소 및 좌표 검색
    
    Args:
        station_name: 경찰서 이름 (예: "중부서", "서울중부경찰서", "중부경찰서")
        name: 경찰서 이름 (station_name의 별칭, 호환성을 위해 제공)
    
    Returns:
        경찰서 주소, 좌표(위도/경도), 자치구 정보
    """
    try:
        # station_name 또는 name 파라미터 사용
        search_name = station_name or name
        
        if not search_name:
            raise HTTPException(
                status_code=400,
                detail={
                    "status": "error",
                    "message": "경찰서 이름이 제공되지 않았습니다.",
                    "example": "사용 예: /seoul-crime/search-police-station?station_name=중부서 또는 ?name=중부서",
                    "available_stations": [
                        "중부서", "종로서", "남대문서", "서대문서", "혜화서",
                        "용산서", "성북서", "동대문서", "마포서", "영등포서"
                    ]
                }
            )
        
        service = get_seoul_crime_service()
        result = service.search_police_station(search_name)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"경찰서 검색 중 오류 발생: {str(e)}")


@router.get("/heatmap")
@router.post("/heatmap")
async def create_heatmap(
    cmap: str = Query("Reds", description="컬러맵 (Reds, OrRd, YlOrRd 등)"),
    return_image: bool = Query(True, description="Base64 이미지 반환 여부")
):
    """
    서울시 자치구별 범죄율 히트맵 생성
    
    Args:
        cmap: 컬러맵 ('Reds', 'OrRd', 'YlOrRd' 등)
        return_image: Base64 이미지 반환 여부
    
    Returns:
        히트맵 이미지 (Base64) 및 통계 정보
    """
    try:
        service = get_seoul_heatmap_service()
        
        result = service.create_heatmap(cmap=cmap)
        
        if result['status'] == 'error':
            raise HTTPException(status_code=500, detail=result.get('error', '히트맵 생성 실패'))
        
        if return_image:
            return {
                "status": "success",
                "image_base64": result.get('image_base64'),
                "image_path": result.get('image_path'),
                "data_summary": result.get('data_summary', {}),
                "chart_type": result.get('chart_type', 'heatmap'),
                "note": result.get('note', '')
            }
        else:
            return {
                "status": "success",
                "image_path": result.get('image_path'),
                "data_summary": result.get('data_summary', {}),
                "chart_type": result.get('chart_type', 'heatmap'),
                "note": result.get('note', '')
            }
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"히트맵 생성 중 오류 발생: {str(e)}")


@router.get("/heatmap/image")
async def get_heatmap_image(
    cmap: str = Query("Reds", description="컬러맵 (Reds, OrRd, YlOrRd 등)")
):
    """
    서울시 자치구별 범죄율 히트맵 이미지 직접 반환 (PNG)
    """
    try:
        service = get_seoul_heatmap_service()
        
        result = service.create_heatmap(cmap=cmap)
        
        if result['status'] == 'error':
            raise HTTPException(status_code=500, detail=result.get('error', '히트맵 생성 실패'))
        
        # Base64 디코딩하여 이미지 반환
        image_base64 = result.get('image_base64')
        if image_base64:
            image_bytes = base64.b64decode(image_base64)
            return Response(content=image_bytes, media_type="image/png")
        else:
            raise HTTPException(status_code=500, detail="이미지 생성 실패")
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"히트맵 이미지 생성 중 오류 발생: {str(e)}")


@router.get("/heatmap/crime-rate")
async def get_crime_rate_heatmap():
    """
    범죄율 히트맵 이미지 파일 직접 반환 (PNG)
    """
    try:
        from pathlib import Path
        save_dir = Path(__file__).parent / "save"
        image_path = save_dir / "crime_rate_heatmap.png"
        
        # 이미지가 없으면 생성 시도
        if not image_path.exists():
            logger.warning(f"범죄율 히트맵 이미지가 없습니다. 생성 시도: {image_path}")
            try:
                from app.seoul_crime.create_crime_heatmap import create_crime_heatmap
                create_crime_heatmap()
            except Exception as gen_error:
                logger.error(f"히트맵 생성 실패: {gen_error}")
                raise HTTPException(
                    status_code=404, 
                    detail=f"범죄율 히트맵 이미지를 찾을 수 없고 생성에도 실패했습니다. 경로: {image_path}"
                )
        
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        
        logger.info(f"범죄율 히트맵 이미지 반환: {image_path} ({len(image_bytes)} bytes)")
        return Response(content=image_bytes, media_type="image/png")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"히트맵 이미지 로드 중 오류: {e}")
        raise HTTPException(status_code=500, detail=f"히트맵 이미지 로드 중 오류 발생: {str(e)}")


@router.get("/heatmap/arrest-rate")
async def get_arrest_rate_heatmap():
    """
    검거율 히트맵 이미지 파일 직접 반환 (PNG)
    """
    try:
        from pathlib import Path
        save_dir = Path(__file__).parent / "save"
        image_path = save_dir / "arrest_rate_heatmap.png"
        
        # 이미지가 없으면 생성 시도
        if not image_path.exists():
            logger.warning(f"검거율 히트맵 이미지가 없습니다. 생성 시도: {image_path}")
            try:
                from app.seoul_crime.create_crime_heatmap import create_arrest_rate_heatmap
                create_arrest_rate_heatmap()
            except Exception as gen_error:
                logger.error(f"히트맵 생성 실패: {gen_error}")
                raise HTTPException(
                    status_code=404, 
                    detail=f"검거율 히트맵 이미지를 찾을 수 없고 생성에도 실패했습니다. 경로: {image_path}"
                )
        
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        
        logger.info(f"검거율 히트맵 이미지 반환: {image_path} ({len(image_bytes)} bytes)")
        return Response(content=image_bytes, media_type="image/png")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"히트맵 이미지 로드 중 오류: {e}")
        raise HTTPException(status_code=500, detail=f"히트맵 이미지 로드 중 오류 발생: {str(e)}")


# ==================== Folium 지도 엔드포인트 ====================

@router.get("/map")
@router.post("/map")
async def create_crime_map(
    location_lat: float = Query(37.5665, description="지도 중심 위도"),
    location_lon: float = Query(126.9780, description="지도 중심 경도"),
    zoom_start: int = Query(11, description="초기 줌 레벨"),
    fill_color: str = Query("Reds", description="컬러맵 (Reds, YlOrRd, OrRd 등)"),
    fill_opacity: float = Query(0.7, description="채우기 투명도 (0.0 ~ 1.0)"),
    line_opacity: float = Query(0.8, description="경계선 투명도 (0.0 ~ 1.0)"),
    save_file: bool = Query(True, description="HTML 파일로 저장 여부")
):
    """
    서울시 범죄율 히트맵 지도 생성 (Folium)
    
    Args:
        location_lat: 지도 중심 위도
        location_lon: 지도 중심 경도
        zoom_start: 초기 줌 레벨
        fill_color: 컬러맵
        fill_opacity: 채우기 투명도
        line_opacity: 경계선 투명도
        save_file: HTML 파일로 저장 여부
    
    Returns:
        지도 생성 결과 및 통계 정보
    """
    try:
        service = get_seoul_folium_service()
        
        # 지도 생성
        service.create_map(
            location=[location_lat, location_lon],
            zoom_start=zoom_start,
            fill_color=fill_color,
            fill_opacity=fill_opacity,
            line_opacity=line_opacity
        )
        
        # 파일 저장
        file_path = None
        if save_file:
            file_path = service.save_map()
        
        # 통계 정보
        statistics = service.get_statistics()
        
        return {
            "status": "success",
            "message": "서울시 범죄율 히트맵 지도가 생성되었습니다.",
            "file_path": str(file_path) if file_path else None,
            "statistics": statistics,
            "map_config": {
                "location": [location_lat, location_lon],
                "zoom_start": zoom_start,
                "fill_color": fill_color,
                "fill_opacity": fill_opacity,
                "line_opacity": line_opacity
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"지도 생성 중 오류 발생: {str(e)}")


@router.get("/map/html")
async def get_crime_map_html(
    location_lat: float = Query(37.5665, description="지도 중심 위도"),
    location_lon: float = Query(126.9780, description="지도 중심 경도"),
    zoom_start: int = Query(11, description="초기 줌 레벨"),
    fill_color: str = Query("Reds", description="컬러맵"),
    fill_opacity: float = Query(0.7, description="채우기 투명도"),
    line_opacity: float = Query(0.8, description="경계선 투명도"),
    save_file: bool = Query(True, description="HTML 파일로 저장 여부")
):
    """
    서울시 범죄율 히트맵 지도를 HTML로 직접 반환 (save 폴더에 자동 저장)
    
    Returns:
        HTML 문자열
    """
    try:
        logger.info("서울 범죄 지도 HTML 생성 시작")
        service = get_seoul_folium_service()
        
        # 지도 생성
        logger.info(f"지도 생성 파라미터: location=[{location_lat}, {location_lon}], zoom={zoom_start}")
        service.create_map(
            location=[location_lat, location_lon],
            zoom_start=zoom_start,
            fill_color=fill_color,
            fill_opacity=fill_opacity,
            line_opacity=line_opacity
        )
        logger.info("지도 생성 완료")
        
        # save 폴더에 자동 저장
        if save_file:
            file_path = service.save_map()
            logger.info(f"지도 HTML 파일 저장 완료: {file_path}")
        
        # HTML 반환
        html = service.get_map_html()
        logger.info(f"HTML 반환 준비 완료 (길이: {len(html)} 문자)")
        
        return HTMLResponse(content=html)
        
    except FileNotFoundError as e:
        logger.error(f"파일을 찾을 수 없습니다: {e}")
        raise HTTPException(
            status_code=404, 
            detail=f"필수 데이터 파일이 없습니다. 데이터 전처리를 먼저 실행하세요: /seoul-crime/preprocess\n오류: {str(e)}"
        )
    except ValueError as e:
        logger.error(f"데이터 형식 오류: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"데이터 형식이 올바르지 않습니다. 데이터 전처리를 다시 실행하세요: /seoul-crime/preprocess\n오류: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"지도 HTML 생성 중 예상치 못한 오류 발생: {e}\n{error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"지도 HTML 생성 중 오류 발생: {str(e)}\n\n상세 오류:\n{error_trace}"
        )


@router.get("/map/statistics")
async def get_crime_map_statistics():
    """
    서울시 범죄율 통계 정보 조회
    
    Returns:
        범죄율 통계 정보
    """
    try:
        service = get_seoul_folium_service()
        statistics = service.get_statistics()
        
        return {
            "status": "success",
            "statistics": statistics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"통계 정보 조회 중 오류 발생: {str(e)}")




