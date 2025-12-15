"""
US Unemployment Router - FastAPI 라우터
미국 실업률 데이터 시각화 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional, Dict, Any
from pathlib import Path

from app.us_unemployment.service import USUnemploymentService

# 라우터 생성
router = APIRouter(
    prefix="/us-unemployment",
    tags=["us-unemployment"],
    responses={404: {"description": "Not found"}}
)

# 서비스 인스턴스
_us_unemployment_service: Optional[USUnemploymentService] = None


def get_us_unemployment_service() -> USUnemploymentService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _us_unemployment_service
    if _us_unemployment_service is None:
        _us_unemployment_service = USUnemploymentService()
    return _us_unemployment_service


@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "US Unemployment Service",
        "description": "미국 실업률 데이터 시각화 서비스",
        "endpoints": {
            "map": "/us-unemployment/map - 실업률 히트맵 지도 생성",
            "map_html": "/us-unemployment/map/html - 지도 HTML 반환",
            "statistics": "/us-unemployment/statistics - 실업률 통계 정보"
        }
    }


@router.get("/map")
@router.post("/map")
async def create_unemployment_map(
    location_lat: float = Query(48, description="지도 중심 위도"),
    location_lon: float = Query(-102, description="지도 중심 경도"),
    zoom_start: int = Query(3, description="초기 줌 레벨"),
    fill_color: str = Query("YlGn", description="컬러맵 (YlGn, YlOrRd, Reds 등)"),
    fill_opacity: float = Query(0.7, description="채우기 투명도 (0.0 ~ 1.0)"),
    line_opacity: float = Query(0.2, description="경계선 투명도 (0.0 ~ 1.0)"),
    save_file: bool = Query(True, description="HTML 파일로 저장 여부")
):
    """
    미국 실업률 히트맵 지도 생성
    
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
        service = get_us_unemployment_service()
        
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
            "message": "실업률 히트맵 지도가 생성되었습니다.",
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
async def get_map_html(
    location_lat: float = Query(48, description="지도 중심 위도"),
    location_lon: float = Query(-102, description="지도 중심 경도"),
    zoom_start: int = Query(3, description="초기 줌 레벨"),
    fill_color: str = Query("YlGn", description="컬러맵"),
    fill_opacity: float = Query(0.7, description="채우기 투명도"),
    line_opacity: float = Query(0.2, description="경계선 투명도")
):
    """
    미국 실업률 히트맵 지도를 HTML로 직접 반환
    
    Returns:
        HTML 문자열
    """
    try:
        service = get_us_unemployment_service()
        
        # 지도 생성
        service.create_map(
            location=[location_lat, location_lon],
            zoom_start=zoom_start,
            fill_color=fill_color,
            fill_opacity=fill_opacity,
            line_opacity=line_opacity
        )
        
        # HTML 반환
        html = service.get_map_html()
        
        return HTMLResponse(content=html)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"지도 HTML 생성 중 오류 발생: {str(e)}")


@router.get("/statistics")
async def get_statistics():
    """
    미국 실업률 통계 정보 조회
    
    Returns:
        실업률 통계 정보
    """
    try:
        service = get_us_unemployment_service()
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


@router.get("/data")
async def get_unemployment_data():
    """
    미국 실업률 원본 데이터 조회
    
    Returns:
        실업률 데이터
    """
    try:
        service = get_us_unemployment_service()
        service.load_state_data()
        
        if service.state_data is None:
            raise HTTPException(status_code=404, detail="데이터를 로드할 수 없습니다.")
        
        # DataFrame을 딕셔너리 리스트로 변환
        data = service.state_data.to_dict(orient='records')
        
        return {
            "status": "success",
            "count": len(data),
            "data": data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"데이터 조회 중 오류 발생: {str(e)}")

