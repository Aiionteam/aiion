import requests
import os
from typing import Dict, List, Optional, Any

class KakaoMapSingleton:
    """
    카카오맵 REST API 싱글톤 클래스
    
    카카오맵 REST API를 사용하여 다음 기능을 제공합니다:
    - 주소 검색 (주소 → 좌표 변환)
    - 좌표-주소 변환 (좌표 → 주소 변환)
    - 키워드로 장소 검색
    - 카테고리로 장소 검색
    
    REST API 엔드포인트: https://dapi.kakao.com/v2/local
    인증 방식: Authorization 헤더에 KakaoAK {REST_API_KEY} 형식 사용
    """
    _instance = None  # 싱글턴 인스턴스를 저장할 클래스 변수

    def __new__(cls):
        if cls._instance is None:  # 인스턴스가 없으면 생성
            cls._instance = super(KakaoMapSingleton, cls).__new__(cls)
            cls._instance._api_key = cls._instance._retrieve_api_key()  # REST API 키 가져오기
            # 카카오맵 REST API 기본 URL
            cls._instance._base_url = "https://dapi.kakao.com/v2/local"
            # REST API 인증 헤더 (KakaoAK 형식)
            cls._instance._headers = {
                "Authorization": f"KakaoAK {cls._instance._api_key}"
            }
        return cls._instance  # 기존 인스턴스 반환

    def _retrieve_api_key(self) -> str:
        """API 키를 가져오는 내부 메서드"""
        # 환경 변수에서 API 키 가져오기
        api_key = os.getenv("KAKAO_MAP_REST_API_KEY") or os.getenv("KAKAO_REST_API_KEY")
        
        if not api_key:
            raise ValueError(
                "KAKAO_MAP_REST_API_KEY 또는 KAKAO_REST_API_KEY 환경 변수가 설정되지 않았습니다. "
                "환경 변수를 설정해주세요."
            )
        
        return api_key

    def get_api_key(self) -> str:
        """저장된 API 키 반환"""
        return self._api_key

    def geocode(self, address: str, page: int = 1, size: int = 10) -> Dict[str, Any]:
        """
        주소를 위도, 경도로 변환하는 메서드 (주소 검색)
        REST API: GET /v2/local/search/address.json
        
        Args:
            address: 검색할 주소
            page: 결과 페이지 번호 (기본값: 1)
            size: 한 페이지에 보여질 문서의 개수 (기본값: 10, 최대: 30)
        
        Returns:
            검색 결과 딕셔너리
        """
        # 카카오맵 REST API 주소 검색 엔드포인트
        url = f"{self._base_url}/search/address.json"
        params = {
            "query": address,
            "page": page,
            "size": size
        }
        
        try:
            response = requests.get(url, headers=self._headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"주소 검색 오류: {e}")
            return {"documents": [], "meta": {"total_count": 0}}

    def reverse_geocode(self, x: float, y: float, input_coord: str = "WGS84") -> Dict[str, Any]:
        """
        좌표를 주소로 변환하는 메서드 (좌표-주소 변환)
        REST API: GET /v2/local/geo/coord2address.json
        
        Args:
            x: 경도 (longitude)
            y: 위도 (latitude)
            input_coord: 입력 좌표계 (기본값: WGS84, 옵션: WGS84, WCONGNAMUL, CONGNAMUL, WTM, TM)
        
        Returns:
            변환 결과 딕셔너리
        """
        # 카카오맵 REST API 좌표-주소 변환 엔드포인트
        url = f"{self._base_url}/geo/coord2address.json"
        params = {
            "x": x,
            "y": y,
            "input_coord": input_coord
        }
        
        try:
            response = requests.get(url, headers=self._headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"좌표-주소 변환 오류: {e}")
            return {"documents": [], "meta": {"total_count": 0}}

    def search_keyword(self, keyword: str, x: Optional[float] = None, y: Optional[float] = None, 
                     radius: Optional[int] = None, page: int = 1, size: int = 15) -> Dict[str, Any]:
        """
        키워드로 장소를 검색하는 메서드
        REST API: GET /v2/local/search/keyword.json
        
        Args:
            keyword: 검색할 키워드
            x: 중심 좌표의 경도 (선택)
            y: 중심 좌표의 위도 (선택)
            radius: 중심 좌표로부터의 반경 거리 (미터 단위, 선택)
            page: 결과 페이지 번호 (기본값: 1)
            size: 한 페이지에 보여질 문서의 개수 (기본값: 15, 최대: 45)
        
        Returns:
            검색 결과 딕셔너리
        """
        # 카카오맵 REST API 키워드 검색 엔드포인트
        url = f"{self._base_url}/search/keyword.json"
        params = {
            "query": keyword,
            "page": page,
            "size": size
        }
        
        if x is not None and y is not None:
            params["x"] = x
            params["y"] = y
        
        if radius is not None:
            params["radius"] = radius
        
        try:
            response = requests.get(url, headers=self._headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"키워드 검색 오류: {e}")
            return {"documents": [], "meta": {"total_count": 0}}

    def search_category(self, category_group_code: str, x: float, y: float, 
                       radius: int = 20000, page: int = 1, size: int = 15) -> Dict[str, Any]:
        """
        카테고리로 장소를 검색하는 메서드
        REST API: GET /v2/local/search/category.json
        
        Args:
            category_group_code: 카테고리 그룹 코드 (예: MT1, CS2, PS3, SC4, AC5, PK6, OL7, SW8, BK9, CT1, AG2, PO3, AT4, AD5, FD6, CE7, HP8, PM9)
            x: 중심 좌표의 경도
            y: 중심 좌표의 위도
            radius: 중심 좌표로부터의 반경 거리 (미터 단위, 기본값: 20000)
            page: 결과 페이지 번호 (기본값: 1)
            size: 한 페이지에 보여질 문서의 개수 (기본값: 15, 최대: 45)
        
        Returns:
            검색 결과 딕셔너리
        """
        # 카카오맵 REST API 카테고리 검색 엔드포인트
        url = f"{self._base_url}/search/category.json"
        params = {
            "category_group_code": category_group_code,
            "x": x,
            "y": y,
            "radius": radius,
            "page": page,
            "size": size
        }
        
        try:
            response = requests.get(url, headers=self._headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"카테고리 검색 오류: {e}")
            return {"documents": [], "meta": {"total_count": 0}}

