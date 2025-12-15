from fastapi import FastAPI, APIRouter, HTTPException, Query  # type: ignore
# CORS는 게이트웨이에서 처리하므로 제거
from pydantic import BaseModel  # type: ignore
import uvicorn  # type: ignore
import os
import requests  # type: ignore
from dotenv import load_dotenv  # type: ignore
from typing import Optional, Dict  # type: ignore
from datetime import datetime, timedelta  # type: ignore
import csv  # type: ignore

# 환경 변수 로드
load_dotenv()

# 기상청 API 키 (중기예보용)
KMA_API_KEY = os.getenv("KMA_API_KEY", "")
if not KMA_API_KEY:
    print("Warning: KMA_API_KEY not set. Mid-term forecast API functionality will be limited.")

# 기상청 API 키 (단기예보용)
KMA_SHORT_KEY = os.getenv("KMA_SHORT_KEY", "")
if not KMA_SHORT_KEY:
    print("Warning: KMA_SHORT_KEY not set. Short-term forecast API functionality will be limited.")

# root_path 설정: API Gateway를 통한 접근 시 경로 인식
import os
root_path = os.getenv("ROOT_PATH", "")

app = FastAPI(
    title="Weather Service API",
    version="1.0.0",
    description="기상청 API 서비스",
    root_path=root_path,  # API Gateway 경로 설정
    docs_url="/docs",  # Swagger UI 경로 명시
    redoc_url="/redoc",  # ReDoc 경로 명시
    openapi_url=f"{root_path}/openapi.json" if root_path else "/openapi.json"  # OpenAPI JSON 경로 (절대 경로)
)

# API Gateway를 통한 접근 시 서버 URL 설정
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # 서버 URL 설정 (API Gateway 경로 포함)
    if root_path:
        openapi_schema["servers"] = [
            {"url": root_path, "description": "API Gateway"},
            {"url": "", "description": "Direct access"}
        ]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# CORS 설정 제거 - 게이트웨이가 모든 CORS를 처리하므로 백엔드 서비스에서는 제거
# 프록시/파사드 패턴: 프론트엔드 -> 게이트웨이 -> 백엔드 서비스
# 게이트웨이만 CORS를 처리하고, 백엔드 서비스는 게이트웨이를 통해서만 접근

# 서브 라우터 생성
weather_router = APIRouter(prefix="/weather", tags=["weather"])

# 기상청 API 기본 URL
MID_FCST_BASE_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService"  # 중기예보
SHORT_FCST_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"  # 단기예보

# 중기예보 구역 코드 로드
REGION_CODE_MAP: Dict[str, str] = {}
REGION_NAME_MAP: Dict[str, str] = {}  # 지역명 -> regId 매핑

# 지역명 -> stnId 매핑 (중기예보용)
REGION_TO_STNID: Dict[str, str] = {
    '서울': '108',
    '인천': '109',
    '강릉': '105',
    '대전': '133',
    '대구': '143',
    '광주': '156',
    '부산': '159',
    '울산': '159',
    '제주': '184',
}

def load_region_codes():
    """CSV 파일에서 지역 코드 로드"""
    csv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '중기예보_중기기온예보구역코드.csv')
    # Docker 컨테이너 내부 경로도 시도
    docker_csv_path = '/app/중기예보_중기기온예보구역코드.csv'
    
    csv_file = None
    if os.path.exists(csv_path):
        csv_file = csv_path
    elif os.path.exists(docker_csv_path):
        csv_file = docker_csv_path
    elif os.path.exists('중기예보_중기기온예보구역코드.csv'):
        csv_file = '중기예보_중기기온예보구역코드.csv'
    
    if csv_file:
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 2:
                        region_name = row[0].strip()
                        reg_id = row[1].strip()
                        REGION_CODE_MAP[reg_id] = region_name
                        REGION_NAME_MAP[region_name] = reg_id
                        # 대소문자 구분 없이 검색 가능하도록 소문자 키도 추가
                        REGION_NAME_MAP[region_name.lower()] = reg_id
            print(f"[날씨 서비스] {len(REGION_NAME_MAP)}개 지역 코드 로드 완료")
        except Exception as e:
            print(f"[날씨 서비스] 지역 코드 로드 실패: {e}")
    else:
        print("[날씨 서비스] 지역 코드 CSV 파일을 찾을 수 없습니다. stnId만 사용합니다.")

# 앱 시작 시 지역 코드 로드
load_region_codes()

@weather_router.get("/mid-forecast")
def get_mid_weather_forecast(
    stnId: str = Query(None, description="지역 코드 (예: 108). regionName 또는 regId와 함께 사용 불가"),
    regionName: str = Query(None, description="지역명 (예: 서울, 인천, 과천 등). stnId 또는 regId와 함께 사용 불가"),
    regId: str = Query(None, description="중기기온예보구역코드 (예: 11B10101). stnId 또는 regionName과 함께 사용 불가"),
    tmFc: str = Query(None, description="발표시각 (YYYYMMDDHHmm 형식, 예: 202401010600). 생략 시 자동 계산"),
    pageNo: int = Query(1, description="페이지 번호"),
    numOfRows: int = Query(10, description="한 페이지 결과 수"),
    dataType: str = Query("JSON", description="응답 데이터 타입 (XML 또는 JSON)")
):
    """
    중기예보 조회 API
    
    기상청 중기예보 정보를 조회합니다. (KMA_API_KEY 사용)
    
    **파라미터 (하나만 선택):**
    - **stnId** (선택): 지역 코드
        - 108: 서울
        - 109: 인천
        - 105: 강릉
        - 133: 대전
        - 143: 대구
        - 156: 광주
        - 184: 제주
        - 기타 지역 코드 참조
    - **regionName** (선택): 지역명 (CSV 파일 기반)
        - 예: "서울", "인천", "과천", "광명", "강화", "김포" 등
        - 지원 지역: CSV 파일에 등록된 모든 지역
    - **regId** (선택): 중기기온예보구역코드
        - 예: "11B10101" (서울), "11B20201" (인천) 등
        - CSV 파일의 코드 사용
    
    **공통 파라미터:**
    - **tmFc** (선택): 발표시각 (YYYYMMDDHHmm 형식, 예: 202401010600)
        - 생략 시 가장 최근 발표시각 자동 계산 (오전 6시 또는 오후 6시)
    - **pageNo** (선택): 페이지 번호 (기본값: 1)
    - **numOfRows** (선택): 한 페이지 결과 수 (기본값: 10)
    - **dataType** (선택): 응답 데이터 타입 - XML 또는 JSON (기본값: JSON)
    
    **반환**: 기상청 중기예보 API 응답 데이터
    
    **참고**: 
    - 중기예보는 매일 오전 6시와 오후 6시에 발표됩니다.
    - stnId, regionName, regId 중 하나만 사용해야 합니다.
    """
    if not KMA_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="KMA_API_KEY not configured. Please set KMA_API_KEY environment variable."
        )
    
    # 파라미터 검증: 하나만 사용해야 함
    param_count = sum([bool(stnId), bool(regionName), bool(regId)])
    if param_count == 0:
        raise HTTPException(
            status_code=400,
            detail="stnId, regionName, 또는 regId 중 하나는 필수입니다."
        )
    if param_count > 1:
        raise HTTPException(
            status_code=400,
            detail="stnId, regionName, regId 중 하나만 사용해야 합니다."
        )
    
    try:
        # regionName이 제공되면 stnId로 변환 (중기예보는 stnId만 지원)
        if regionName:
            if regionName in REGION_TO_STNID:
                stnId = REGION_TO_STNID[regionName]
            elif regionName.lower() in REGION_TO_STNID:
                stnId = REGION_TO_STNID[regionName.lower()]
            else:
                # regId로 변환 시도 (단기예보용, 중기예보에서는 사용 안 함)
                if regionName in REGION_NAME_MAP:
                    # regId는 중기예보에서 지원하지 않으므로 stnId로 변환 시도
                    # 주요 도시는 stnId로 매핑
                    raise HTTPException(
                        status_code=404,
                        detail=f"지역명 '{regionName}'에 대한 중기예보 stnId를 찾을 수 없습니다. 지원 지역: 서울, 인천, 강릉, 대전, 대구, 광주, 부산, 울산, 제주"
                    )
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"지역명 '{regionName}'을 찾을 수 없습니다. 지원 지역: 서울, 인천, 강릉, 대전, 대구, 광주, 부산, 울산, 제주"
                    )
        
        # tmFc가 제공되지 않으면 자동으로 가장 최근 발표시각 계산
        if not tmFc:
            now = datetime.now()
            current_hour = now.hour
            
            # 오전 6시 이전이면 전날 오후 6시, 오전 6시~오후 6시 사이면 오전 6시, 오후 6시 이후면 오후 6시
            if current_hour < 6:
                # 전날 오후 6시
                yesterday = now - timedelta(days=1)
                tmFc = yesterday.strftime('%Y%m%d') + '1800'
            elif current_hour < 18:
                # 오늘 오전 6시
                tmFc = now.strftime('%Y%m%d') + '0600'
            else:
                # 오늘 오후 6시
                tmFc = now.strftime('%Y%m%d') + '1800'
        
        url = f"{MID_FCST_BASE_URL}/getMidFcst"
        
        params = {
            'serviceKey': KMA_API_KEY,
            'pageNo': str(pageNo),
            'numOfRows': str(numOfRows),
            'dataType': dataType,
            'tmFc': tmFc
        }
        
        # 중기예보는 stnId만 지원 (regId는 지원하지 않음)
        if stnId:
            params['stnId'] = stnId
        elif regId:
            # regId가 제공되었지만 중기예보는 stnId만 지원하므로 에러
            raise HTTPException(
                status_code=400,
                detail="중기예보 API는 regId를 지원하지 않습니다. stnId 또는 regionName을 사용하세요."
            )
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        if dataType.upper() == "JSON":
            result = response.json()
            # 응답 검증 및 정리
            if 'response' in result:
                header = result['response'].get('header', {})
                result_code = header.get('resultCode', '')
                result_msg = header.get('resultMsg', '')
                
                # 데이터가 없는 경우 명확한 메시지 반환
                if result_code == '03' or result_msg == 'NO_DATA':
                    # 다른 발표시각 시도 (오전 6시 <-> 오후 6시)
                    alternative_tmFc = tmFc[:-4] + ('0600' if tmFc[-4:] == '1800' else '1800')
                    params['tmFc'] = alternative_tmFc
                    retry_response = requests.get(url, params=params, timeout=10)
                    if retry_response.status_code == 200:
                        retry_result = retry_response.json()
                        if retry_result.get('response', {}).get('header', {}).get('resultCode') == '00':
                            return retry_result
                    
                    return {
                        "response": {
                            "header": {
                                "resultCode": result_code,
                                "resultMsg": result_msg or "NO_DATA"
                            },
                            "body": {
                                "items": [],
                                "message": f"해당 날짜/시간({tmFc})에 대한 중기예보 데이터가 없습니다. 중기예보는 매일 오전 6시와 오후 6시에 발표됩니다."
                            }
                        }
                    }
                
                # items가 빈 문자열이거나 비어있는 경우 처리
                body = result['response'].get('body', {})
                items = body.get('items', {})
                if isinstance(items, dict):
                    item = items.get('item', '')
                    if item == '' or (isinstance(item, list) and len(item) == 0):
                        return {
                            "response": {
                                "header": header,
                                "body": {
                                    "items": [],
                                    "message": f"중기예보 데이터가 비어있습니다. 발표시각({tmFc})을 확인해주세요."
                                }
                            }
                        }
            return result
        else:
            return {"content": response.text, "content_type": "XML"}
            
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Mid-term forecast API request failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@weather_router.get("/short-forecast")
def get_short_weather_forecast(
    nx: int = Query(..., description="예보지점 X 좌표"),
    ny: int = Query(..., description="예보지점 Y 좌표"),
    base_date: str = Query(None, description="발표일자 (YYYYMMDD 형식, 예: 20240101). 생략 시 자동 계산"),
    base_time: str = Query(None, description="발표시각 (HHmm 형식, 예: 0500). 생략 시 자동 계산"),
    pageNo: int = Query(1, description="페이지 번호"),
    numOfRows: int = Query(10, description="한 페이지 결과 수"),
    dataType: str = Query("JSON", description="응답 데이터 타입 (XML 또는 JSON)")
):
    """
    단기예보 조회 API
    
    기상청 단기예보 정보를 조회합니다. (KMA_SHORT_KEY 사용)
    
    **파라미터:**
    - **nx** (필수): 예보지점 X 좌표 (격자 X)
        - 예: 서울 60, 인천 55, 부산 98 등
    - **ny** (필수): 예보지점 Y 좌표 (격자 Y)
        - 예: 서울 127, 인천 124, 부산 76 등
    - **base_date** (선택): 발표일자 (YYYYMMDD 형식, 예: 20240101)
        - 생략 시 자동으로 오늘 날짜 계산
    - **base_time** (선택): 발표시각 (HHmm 형식, 예: 0500)
        - 생략 시 자동으로 가장 최근 발표시각 계산
        - 일반적으로 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300에 발표
    - **pageNo** (선택): 페이지 번호 (기본값: 1)
    - **numOfRows** (선택): 한 페이지 결과 수 (기본값: 10)
    - **dataType** (선택): 응답 데이터 타입 - XML 또는 JSON (기본값: JSON)
    
    **반환**: 기상청 단기예보 API 응답 데이터
    
    **참고**: 
    - 격자 좌표는 기상청 공공데이터포털에서 확인 가능합니다.
    - base_date와 base_time을 생략하면 현재 시간을 기준으로 가장 최근 발표시각을 자동으로 사용합니다.
    """
    if not KMA_SHORT_KEY:
        raise HTTPException(
            status_code=500,
            detail="KMA_SHORT_KEY not configured. Please set KMA_SHORT_KEY environment variable."
        )
    
    try:
        # base_date와 base_time이 제공되지 않으면 자동으로 계산
        if not base_date or not base_time:
            now = datetime.now()
            current_hour = now.hour
            
            # 가장 최근 발표시각 계산
            # 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
            if current_hour < 2:
                # 전날 2300
                yesterday = now - timedelta(days=1)
                base_date = yesterday.strftime('%Y%m%d')
                base_time = '2300'
            elif current_hour < 5:
                base_date = now.strftime('%Y%m%d')
                base_time = '0200'
            elif current_hour < 8:
                base_date = now.strftime('%Y%m%d')
                base_time = '0500'
            elif current_hour < 11:
                base_date = now.strftime('%Y%m%d')
                base_time = '0800'
            elif current_hour < 14:
                base_date = now.strftime('%Y%m%d')
                base_time = '1100'
            elif current_hour < 17:
                base_date = now.strftime('%Y%m%d')
                base_time = '1400'
            elif current_hour < 20:
                base_date = now.strftime('%Y%m%d')
                base_time = '1700'
            elif current_hour < 23:
                base_date = now.strftime('%Y%m%d')
                base_time = '2000'
            else:
                base_date = now.strftime('%Y%m%d')
                base_time = '2300'
        
        # base_date만 제공된 경우 base_time 자동 계산
        elif base_date and not base_time:
            now = datetime.now()
            current_hour = now.hour
            
            if current_hour < 2:
                base_time = '2300'
            elif current_hour < 5:
                base_time = '0200'
            elif current_hour < 8:
                base_time = '0500'
            elif current_hour < 11:
                base_time = '0800'
            elif current_hour < 14:
                base_time = '1100'
            elif current_hour < 17:
                base_time = '1400'
            elif current_hour < 20:
                base_time = '1700'
            elif current_hour < 23:
                base_time = '2000'
            else:
                base_time = '2300'
        
        # base_time만 제공된 경우 base_date는 오늘 날짜
        elif not base_date and base_time:
            base_date = datetime.now().strftime('%Y%m%d')
        
        url = f"{SHORT_FCST_BASE_URL}/getVilageFcst"
        
        params = {
            'serviceKey': KMA_SHORT_KEY,
            'pageNo': str(pageNo),
            'numOfRows': str(numOfRows),
            'dataType': dataType,
            'base_date': base_date,
            'base_time': base_time,
            'nx': str(nx),
            'ny': str(ny)
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        if dataType.upper() == "JSON":
            result = response.json()
            # 응답 검증 및 정리
            if 'response' in result:
                header = result['response'].get('header', {})
                result_code = header.get('resultCode', '')
                result_msg = header.get('resultMsg', '')
                
                # 데이터가 없는 경우 명확한 메시지 반환
                if result_code == '03' or result_msg == 'NO_DATA':
                    return {
                        "response": {
                            "header": {
                                "resultCode": result_code,
                                "resultMsg": result_msg or "NO_DATA"
                            },
                            "body": {
                                "items": [],
                                "message": "해당 날짜/시간에 대한 단기예보 데이터가 없습니다. 다른 발표시각을 시도해보세요."
                            }
                        }
                    }
                
                # items가 비어있는 경우 확인
                body = result['response'].get('body', {})
                items = body.get('items', {})
                if isinstance(items, dict):
                    item_list = items.get('item', [])
                    if not item_list or len(item_list) == 0:
                        return {
                            "response": {
                                "header": header,
                                "body": {
                                    "items": [],
                                    "message": "날씨 데이터가 없습니다. 발표시각을 확인해주세요."
                                }
                            }
                        }
            return result
        else:
            return {"content": response.text, "content_type": "XML"}
            
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Short-term forecast API request failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@weather_router.get("/regions")
def get_regions():
    """
    지원 지역 목록 조회 API
    
    중기예보에서 사용 가능한 지역 목록을 반환합니다.
    
    - **반환**: 지역 목록 (지역명과 regId)
    """
    regions = []
    for region_name, reg_id in REGION_NAME_MAP.items():
        # 소문자 키는 제외 (원본만 표시)
        if region_name.islower():
            continue
        regions.append({
            "name": region_name,
            "regId": reg_id
        })
    
    return {
        "total": len(regions),
        "regions": sorted(regions, key=lambda x: x["name"])
    }

@weather_router.get("/health")
def health_check():
    """
    서비스 상태 확인 API
    
    - **반환**: 서비스 상태
    """
    return {
        "status": "healthy",
        "service": "weather",
        "kma_api_key_configured": bool(KMA_API_KEY),
        "kma_short_key_configured": bool(KMA_SHORT_KEY),
        "region_codes_loaded": len(REGION_NAME_MAP) > 0
    }

# 서브 라우터를 앱에 포함
app.include_router(weather_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9004, root_path=root_path)

