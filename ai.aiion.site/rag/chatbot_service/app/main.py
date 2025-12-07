"""
챗봇 서비스 - 텍스트 분류 및 구조화 기능

구현된 카테고리:
- ✅ 일기: 텍스트를 일기로 분류하고 구조화, 일기 서비스에 저장
- ✅ 건강: 운동, 식단 등 건강 정보 분류 및 구조화
- ✅ 가계: 수입/지출 정보 분류 및 구조화
- ✅ 문화: 영화, 책 등 문화 활동 분류 및 구조화
- ✅ 패스파인더: 목표, 계획 등 패스파인더 정보 분류 및 구조화

저장 로직:
- 일기: 일기 서비스(diary-service)에 저장
- 건강/가계/문화/패스파인더: 서비스 준비 대기 중 (구조화만 수행, 저장은 로그만)

주의사항:
- 구조화 데이터는 DB 구조와 독립적으로 설계되었습니다.
- 나중에 각 서비스의 DB 스키마가 정해지면 변환 함수를 통해 저장할 수 있습니다.
- save_classified_data() 함수에서 각 카테고리별 저장 로직 추가 예정입니다.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Request  # type: ignore
# CORS는 게이트웨이에서 처리하므로 제거
from pydantic import BaseModel  # type: ignore
import uvicorn  # type: ignore
import os
import requests  # type: ignore
from openai import OpenAI  # type: ignore
from dotenv import load_dotenv  # type: ignore
from datetime import datetime, timedelta  # type: ignore
import re  # type: ignore
from concurrent.futures import ThreadPoolExecutor, as_completed  # type: ignore
import time  # type: ignore
import json  # type: ignore
from typing import Optional, Dict, Any  # type: ignore

# 환경 변수 로드
load_dotenv()

# OpenAI 클라이언트 초기화
openai_api_key = os.getenv("OPENAI_API_KEY", "")
if not openai_api_key:
    print("Warning: OPENAI_API_KEY not set. Chat functionality will be limited.")
    client = None
else:
    client = OpenAI(api_key=openai_api_key)

# GPT 모델 선택 (환경 변수로 설정 가능, 기본값: gpt-4-turbo)
# gpt-4-turbo 사용 시 분류 정확도 향상 (비용 증가)
DEFAULT_CLASSIFICATION_MODEL = os.getenv("OPENAI_CLASSIFICATION_MODEL", "gpt-4-turbo")
DEFAULT_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4-turbo")

app = FastAPI(
    title="Chatbot Service API",
    version="1.0.0",
    description="챗봇 서비스 API"
)

# UTF-8 인코딩 강제 설정
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# CORS 설정 제거 - 게이트웨이가 모든 CORS를 처리하므로 백엔드 서비스에서는 제거
# 프록시/파사드 패턴: 프론트엔드 -> 게이트웨이 -> 백엔드 서비스
# 게이트웨이만 CORS를 처리하고, 백엔드 서비스는 게이트웨이를 통해서만 접근

# 서브 라우터 생성
chatbot_router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# 메시지 모델
class Message(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str

# 요청 모델
class ChatRequest(BaseModel):
    message: str
    model: str = "gpt-4-turbo"  # 기본값을 gpt-4-turbo로 변경
    system_message: str = (
        "너는 20살 명랑한 여자 대학생처럼 대화해야 해. "
        "밝고 귀엽고 친근한 말투를 쓰고, 문장 끝에는 종종 "
        "이모티콘이나 느낌표를 붙여서 활기차게 말해."
    )
    conversation_history: list[Message] = []  # 대화 히스토리 (선택사항)
    userId: Optional[int] = None  # 사용자 ID (일기 검색 시 필요)
    jwtToken: Optional[str] = None  # JWT 토큰 (일기 검색 시 사용, userId 대신 사용 가능)

# 응답 모델
class ChatResponse(BaseModel):
    message: str
    model: str
    status: str = "success"  # 응답 상태 (success, error)
    classification: Optional[Dict[str, Any]] = None  # 분류 정보 (선택사항)

# ========== NLP 기반 의도 분류 및 엔티티 추출 ==========

def classify_intent(message: str) -> dict:
    """GPT를 사용하여 사용자 메시지의 의도를 분류하고 엔티티를 추출합니다.
    
    Returns:
        {
            "intent": "weather" | "diary" | "health" | "finance" | "culture" | "pathfinder" | "general",
            "confidence": 0.0 ~ 1.0,
            "entities": {
                "location": "지역명" or None,
                "date": "날짜 표현" or None,
                "other": {...}
            },
            "original_message": "원본 메시지"
        }
    """
    if client is None:
        # OpenAI 클라이언트가 없으면 기존 키워드 방식 폴백
        return {
            "intent": "general",
            "confidence": 0.0,
            "entities": {},
            "original_message": message
        }
    
    try:
        prompt = f"""
사용자 메시지를 분석하여 의도(intent)와 엔티티(entity)를 추출해주세요.

메시지: "{message}"

**의도 분류 기준:**
- weather: 날씨, 기온, 온도, 비, 눈, 맑음, 흐림, 예보 등 날씨 관련 질문
  예: "오늘 날씨 어때?", "비 오냐?", "몇도야?", "서울 날씨", "내일 부산 날씨"
- diary: 일상 기록, 일기, 오늘의 일, 하루 일과 등
- health: 운동, 식단, 건강, 다이어트, 체중 등
- finance: 돈, 지출, 수입, 가계부, 구매 등
- culture: 영화, 책, 음악, 공연 등 문화 활동
- pathfinder: 목표, 계획, 학습, 프로젝트 등
- general: 위 카테고리에 해당하지 않는 일반적인 대화

**엔티티 추출 기준:**
- location: 지역명 (예: 서울, 부산, 제주)
- date: 날짜 표현 (예: 오늘, 내일, 모레, 12월 5일, 다음주)
- time: 시간 표현 (예: 아침, 저녁, 3시)
- other: 기타 중요한 정보

**중요:**
- 날씨 질문이 명확하면 confidence를 0.8 이상으로 설정
- 애매한 경우 confidence를 0.5 이하로 설정
- 일기 관련 키워드(공무, 업무, 동헌)가 있으면 diary로 분류

다음 JSON 형식으로만 응답해주세요:
{{
    "intent": "weather" | "diary" | "health" | "finance" | "culture" | "pathfinder" | "general",
    "confidence": 0.0 ~ 1.0,
    "entities": {{
        "location": "지역명" or null,
        "date": "날짜 표현" or null,
        "time": "시간 표현" or null,
        "other": {{}}
    }},
    "reason": "분류 이유 (한 줄)"
}}
"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # 빠르고 저렴한 모델 사용
            messages=[
                {"role": "system", "content": "You are an intent classification and entity extraction expert. Respond only with valid JSON. Always use Korean for text fields."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,  # 일관성을 위해 낮게 설정
            max_tokens=300
        )
        
        result = json.loads(response.choices[0].message.content)
        result["original_message"] = message
        
        print(f"[의도 분류] 메시지: {message}")
        print(f"[의도 분류] 결과: intent={result.get('intent')}, confidence={result.get('confidence'):.2f}, entities={result.get('entities')}")
        print(f"[의도 분류] 이유: {result.get('reason')}")
        
        return result
        
    except Exception as e:
        print(f"[의도 분류] 오류: {e}")
        import traceback
        traceback.print_exc()
        # 오류 발생 시 기존 키워드 방식 폴백
        return {
            "intent": "general",
            "confidence": 0.0,
            "entities": {},
            "original_message": message
        }

# 날씨 관련 키워드 감지 함수 (NLP 기반 + 키워드 폴백)
def is_weather_related(message: str, intent_result: dict = None) -> bool:
    """사용자 메시지가 날씨 관련인지 확인 (키워드 우선 + NLP 폴백)
    
    Args:
        message: 사용자 메시지
        intent_result: 이미 분류된 의도 결과 (선택사항, 있으면 재사용)
    
    키워드 기반으로 먼저 빠르게 체크하고, 불명확한 경우에만 GPT를 사용합니다.
    """
    # 이미 분류된 의도 결과가 있으면 재사용
    if intent_result and intent_result.get("intent") == "weather" and intent_result.get("confidence", 0) >= 0.5:
        print(f"[날씨 감지] NLP 기반 (재사용): {message} → weather (confidence: {intent_result.get('confidence'):.2f})")
        return True
    
    # 신뢰도가 낮거나 GPT 결과가 없으면 키워드 방식 폴백
    message_lower = message.lower()
    
    # 기본 날씨 키워드 (가장 일반적인 키워드)
    basic_weather_keywords = [
        '날씨', '예보', '기온', '온도', '몇도', '몇 도', '몇도야', '몇도인데', '몇도냐', '몇도지',
        '비', '눈', '맑음', '흐림', '기상', '강수', '습도', '바람', '미세먼지', '황사', '대기질'
    ]
    
    # 명시적인 날씨 키워드
    explicit_weather_keywords = [
        '단기날씨', '중기날씨', '단기예보', '중기예보',
        '오늘 날씨', '내일 날씨', '모레 날씨', '주간 날씨',
        '날씨 알려줘', '날씨 어때', '날씨는', '날씨정보',
        '날씨 정보', '오늘의 날씨', '오늘의날씨', '날씨알려줘'
    ]
    
    # 기본 키워드가 있으면 날씨 요청으로 인식
    if any(keyword in message_lower for keyword in basic_weather_keywords):
        # 일기 관련 키워드와 구별 (일기 우선)
        diary_keywords = ['공무', '업무', '일상', '하루', '동헌', '점검', '순찰', '공문', '원수', '문서']
        if not any(keyword in message_lower for keyword in diary_keywords):
            print(f"[날씨 감지] 키워드 기반: {message} → weather")
            return True
    
    # 명시적인 날씨 키워드가 있으면 날씨 요청으로 인식
    if any(keyword in message_lower for keyword in explicit_weather_keywords):
        print(f"[날씨 감지] 키워드 기반: {message} → weather")
        return True
    
    return False

# 지역 코드 매핑 (확장된 버전 - 더 많은 지역 지원)
REGION_CODES = {
    '서울': {'stnId': '108', 'nx': 60, 'ny': 127},
    '인천': {'stnId': '109', 'nx': 55, 'ny': 124},
    '강릉': {'stnId': '105', 'nx': 73, 'ny': 134},
    '대전': {'stnId': '133', 'nx': 67, 'ny': 100},
    '대구': {'stnId': '143', 'nx': 89, 'ny': 90},
    '광주': {'stnId': '156', 'nx': 58, 'ny': 74},
    '부산': {'stnId': '159', 'nx': 98, 'ny': 76},
    '울산': {'stnId': '159', 'nx': 102, 'ny': 84},
    '제주': {'stnId': '184', 'nx': 52, 'ny': 38},
    # 추가 지역 (단기예보용 좌표)
    '수원': {'stnId': '119', 'nx': 60, 'ny': 121},
    '성남': {'stnId': '119', 'nx': 62, 'ny': 123},
    '고양': {'stnId': '108', 'nx': 57, 'ny': 128},
    '용인': {'stnId': '119', 'nx': 64, 'ny': 119},
    '부천': {'stnId': '109', 'nx': 56, 'ny': 125},
    '안산': {'stnId': '119', 'nx': 58, 'ny': 121},
    '안양': {'stnId': '108', 'nx': 59, 'ny': 123},
    '평택': {'stnId': '232', 'nx': 62, 'ny': 114},
    '의정부': {'stnId': '108', 'nx': 60, 'ny': 130},
    '구리': {'stnId': '108', 'nx': 62, 'ny': 127},
    '남양주': {'stnId': '108', 'nx': 64, 'ny': 128},
    '오산': {'stnId': '119', 'nx': 62, 'ny': 118},
    '시흥': {'stnId': '119', 'nx': 57, 'ny': 123},
    '군포': {'stnId': '119', 'nx': 59, 'ny': 122},
    '의왕': {'stnId': '119', 'nx': 60, 'ny': 122},
    '하남': {'stnId': '108', 'nx': 64, 'ny': 126},
    '이천': {'stnId': '119', 'nx': 68, 'ny': 121},
    '안성': {'stnId': '232', 'nx': 65, 'ny': 115},
    '김포': {'stnId': '109', 'nx': 55, 'ny': 128},
    '화성': {'stnId': '119', 'nx': 57, 'ny': 119},
    '광명': {'stnId': '108', 'nx': 58, 'ny': 125},
    '양주': {'stnId': '108', 'nx': 61, 'ny': 131},
    '포천': {'stnId': '108', 'nx': 64, 'ny': 134},
    '여주': {'stnId': '119', 'nx': 71, 'ny': 121},
    '양평': {'stnId': '108', 'nx': 69, 'ny': 125},
    '과천': {'stnId': '108', 'nx': 60, 'ny': 124},
    '가평': {'stnId': '108', 'nx': 69, 'ny': 133},
    '연천': {'stnId': '108', 'nx': 61, 'ny': 138},
}

def extract_region(message: str) -> dict:
    """메시지에서 지역 정보 추출 (개선된 버전)
    
    지역명이 명시되지 않으면 기본값으로 서울을 반환합니다.
    """
    message_lower = message.lower()
    
    # 지역명 추출 (우선순위: 정확한 매칭 > 부분 매칭)
    matched_regions = []
    
    for region, codes in REGION_CODES.items():
        region_lower = region.lower()
        # 정확한 매칭 (단어 경계 고려)
        if region in message or region_lower in message_lower:
            # 단어 경계 확인 (예: "서울"이 "서울시"에 포함되는 경우도 허용)
            matched_regions.append((region, codes, region in message))
    
    # 정확한 매칭 우선 선택
    if matched_regions:
        # 정확한 매칭이 있으면 그것을 선택, 없으면 첫 번째 부분 매칭 선택
        exact_match = next((r for r in matched_regions if r[2]), None)
        if exact_match:
            region, codes, _ = exact_match
        else:
            region, codes, _ = matched_regions[0]
        
        result = codes.copy()
        result['name'] = region
        return result
    
    # 기본값: 서울
    result = REGION_CODES['서울'].copy()
    result['name'] = '서울'
    return result

def extract_date_range(message: str, nlp_date: str = None) -> dict:
    """메시지에서 날짜/기간 정보 추출
    
    단기예보: 오늘부터 3일 후까지 (기상청 단기예보 범위)
    중기예보: 4일 후부터 (기상청 중기예보 범위)
    
    Returns:
        dict: {
            'has_date': bool,  # 날짜가 명시되었는지
            'days_from_now': int,  # 현재로부터 며칠 후인지 (None이면 명시되지 않음)
            'use_short': bool,  # 단기예보 사용 여부 (0~3일)
            'use_mid': bool  # 중기예보 사용 여부 (4일 이상)
        }
    """
    now = datetime.now()
    message_lower = message.lower()
    
    # 오늘, 오늘날씨, 지금, 현재
    today_keywords = ['오늘', '지금', '현재', 'today', 'now']
    if any(keyword in message_lower for keyword in today_keywords):
        return {
            'has_date': True,
            'days_from_now': 0,
            'use_short': True,
            'use_mid': False
        }
    
    # 내일, 내일날씨
    tomorrow_keywords = ['내일', 'tomorrow']
    if any(keyword in message_lower for keyword in tomorrow_keywords):
        return {
            'has_date': True,
            'days_from_now': 1,
            'use_short': True,
            'use_mid': False
        }
    
    # 모레
    if '모레' in message_lower:
        return {
            'has_date': True,
            'days_from_now': 2,
            'use_short': True,
            'use_mid': False
        }
    
    # 3일 후 (단기예보 범위 내 - 단기예보는 3일까지 제공)
    if '3일' in message or '삼일' in message_lower:
        return {
            'has_date': True,
            'days_from_now': 3,
            'use_short': True,  # 단기예보는 3일까지 제공되므로 단기예보 사용
            'use_mid': False
        }
    
    # 일주일, 주간, 주, 7일
    week_keywords = ['일주일', '주간', '주', '7일', 'week']
    if any(keyword in message_lower for keyword in week_keywords):
        return {
            'has_date': True,
            'days_from_now': 7,
            'use_short': False,
            'use_mid': True
        }
    
    # 숫자로 된 날짜 추출 (예: 12월 5일, 5일)
    import re
    # "N일 후", "N일 뒤" 패턴
    days_match = re.search(r'(\d+)일\s*(후|뒤)?', message)
    if days_match:
        days = int(days_match.group(1))
        if days <= 3:
            # 단기예보는 3일까지 제공되므로 3일 이내는 단기예보 사용
            return {
                'has_date': True,
                'days_from_now': days,
                'use_short': True,
                'use_mid': False
            }
        else:
            # 4일 이상은 중기예보 사용
            return {
                'has_date': True,
                'days_from_now': days,
                'use_short': False,
                'use_mid': True
            }
    
    # 실제 날짜 추출 (예: 12월 5일, 12/5, 12-5)
    # 월/일 패턴 찾기
    date_patterns = [
        r'(\d{1,2})월\s*(\d{1,2})일',  # 12월 5일
        r'(\d{1,2})[/-](\d{1,2})',     # 12/5, 12-5
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, message)
        if match:
            month = int(match.group(1))
            day = int(match.group(2))
            
            # 현재 연도 가져오기
            current_year = now.year
            target_date = datetime(current_year, month, day).date()
            current_date = now.date()
            
            # 올해 날짜가 이미 지났으면 내년으로
            if target_date < current_date:
                target_date = datetime(current_year + 1, month, day).date()
            
            # 며칠 후인지 계산
            days_diff = (target_date - current_date).days
            
            if days_diff <= 3:
                # 단기예보는 3일까지 제공되므로 3일 이내는 단기예보 사용
                return {
                    'has_date': True,
                    'days_from_now': days_diff,
                    'use_short': True,
                    'use_mid': False
                }
            else:
                # 4일 이상은 중기예보 사용
                return {
                    'has_date': True,
                    'days_from_now': days_diff,
                    'use_short': False,
                    'use_mid': True
                }
    
    # 날짜가 명시되지 않은 경우: 기본적으로 단기예보만 사용 (오늘 날씨)
    # 사용자가 명시적으로 "주간", "일주일" 같은 키워드를 사용하지 않았다면 단기예보
    return {
        'has_date': False,
        'days_from_now': None,
        'use_short': True,
        'use_mid': False  # 명시적 요청이 없으면 중기예보는 사용하지 않음
    }

def get_weather_info(region_info: dict, date_range: dict = None) -> str:
    """날씨 서비스에서 단기예보와 중기예보 정보 조회
    
    Args:
        region_info: 지역 정보 (nx, ny, name 포함)
        date_range: 날짜 범위 정보 (extract_date_range 결과)
    """
    if date_range is None:
        date_range = {
            'has_date': False,
            'use_short': True,
            'use_mid': True
        }
    
    short_forecast = ""
    mid_forecast = ""
    
    try:
        # 1. 단기예보 조회 (3일 이내 날씨)
        if date_range.get('use_short', True):
            try:
                print(f"[챗봇] 단기예보 조회 시작: {region_info.get('name', 'Unknown')}")
                short_url = "http://aihoyun-weather-service:9004/weather/short-forecast"
                short_params = {
                    "nx": region_info['nx'],
                    "ny": region_info['ny'],
                    "dataType": "JSON",
                    "numOfRows": 100
                }
                
                short_response = requests.get(short_url, params=short_params, timeout=10)
                print(f"[챗봇] 단기예보 응답 상태: {short_response.status_code}")
                
                if short_response.status_code == 200:
                    short_data = short_response.json()
                    # base_date, base_time 추출
                    base_date = datetime.now().strftime('%Y%m%d')
                    base_time = '0800'
                    if 'response' in short_data and 'body' in short_data['response']:
                        items = short_data['response']['body'].get('items', {})
                        if isinstance(items, dict):
                            item_list = items.get('item', [])
                            if item_list and len(item_list) > 0:
                                first_item = item_list[0] if isinstance(item_list, list) else item_list
                                base_date = first_item.get('baseDate', base_date)
                                base_time = first_item.get('baseTime', base_time)
                    
                    short_forecast = format_weather_response(short_data, base_date, base_time)
                    print(f"[챗봇] 단기예보 조회 완료")
                else:
                    short_forecast = f"단기예보 조회 실패 (상태 코드: {short_response.status_code})"
            except Exception as e:
                print(f"[챗봇] 단기예보 조회 오류: {e}")
                short_forecast = "단기예보 정보를 가져올 수 없습니다."
        
        # 2. 중기예보 조회 (3일 이상 날씨)
        if date_range.get('use_mid', True):
            try:
                print(f"[챗봇] 중기예보 조회 시작: {region_info.get('name', 'Unknown')}")
                mid_url = "http://aihoyun-weather-service:9004/weather/mid-forecast"
                mid_params = {
                    "regionName": region_info.get('name', '서울'),
                    "dataType": "JSON"
                }
                # tmFc는 생략하면 서비스에서 자동 계산
                
                mid_response = requests.get(mid_url, params=mid_params, timeout=10)
                print(f"[챗봇] 중기예보 응답 상태: {mid_response.status_code}")
                
                if mid_response.status_code == 200:
                    mid_data = mid_response.json()
                    mid_forecast = format_mid_weather_response(mid_data)
                    print(f"[챗봇] 중기예보 조회 완료")
                else:
                    mid_forecast = f"중기예보 조회 실패 (상태 코드: {mid_response.status_code})"
            except Exception as e:
                print(f"[챗봇] 중기예보 조회 오류: {e}")
                mid_forecast = "중기예보 정보를 가져올 수 없습니다."
        
        # 3. 두 정보 합치기 (사용자 요청에 따라 구분)
        result_parts = []
        
        # 단기예보가 요청된 경우
        if date_range.get('use_short', False) and short_forecast and "실패" not in short_forecast and "가져올 수 없습니다" not in short_forecast:
            days_info = ""
            if date_range.get('has_date') and date_range.get('days_from_now') is not None:
                days = date_range['days_from_now']
                if days == 0:
                    days_info = " (오늘)"
                elif days == 1:
                    days_info = " (내일)"
                elif days == 2:
                    days_info = " (모레)"
                else:
                    days_info = f" ({days}일 후)"
            else:
                days_info = " (오늘)"
            result_parts.append(f"【단기예보{days_info}】\n{short_forecast}")
        
        # 중기예보가 요청된 경우
        if date_range.get('use_mid', False) and mid_forecast and "실패" not in mid_forecast and "가져올 수 없습니다" not in mid_forecast:
            days_info = ""
            if date_range.get('has_date') and date_range.get('days_from_now') is not None:
                days = date_range['days_from_now']
                if days >= 3:
                    days_info = f" ({days}일 후부터)"
                else:
                    days_info = " (3일 후부터)"
            else:
                days_info = " (3일 후부터)"
            result_parts.append(f"【중기예보{days_info}】\n{mid_forecast}")
        
        if result_parts:
            return "\n\n".join(result_parts)
        else:
            return "날씨 정보를 조회할 수 없습니다."
            
    except Exception as e:
        print(f"[챗봇] Weather API error: {e}")
        import traceback
        traceback.print_exc()
        return "날씨 정보 조회 중 오류가 발생했습니다."

def format_mid_weather_response(weather_data: dict) -> str:
    """중기예보 데이터를 읽기 쉬운 형식으로 변환"""
    try:
        if 'response' not in weather_data or 'body' not in weather_data['response']:
            return "중기예보 응답 형식이 올바르지 않습니다."
        
        body = weather_data['response']['body']
        if not isinstance(body, dict):
            return "중기예보 body가 딕셔너리가 아닙니다."
        
        items = body.get('items', {})
        if not isinstance(items, dict):
            return "중기예보 items가 딕셔너리가 아닙니다."
        
        item_data = items.get('item', [])
        if not isinstance(item_data, list):
            item_data = [item_data] if item_data else []
        
        if not item_data or len(item_data) == 0:
            return "중기예보 정보가 없습니다."
        
        # 첫 번째 항목 사용
        item = item_data[0]
        if not isinstance(item, dict):
            return f"중기예보 item이 딕셔너리가 아닙니다. (타입: {type(item)})"
        
        # 중기예보 주요 정보 추출
        result = []
        
        # 날씨 (wfSv) - 가장 중요한 정보
        wfSv = item.get('wfSv', '')
        if wfSv:
            result.append(f"날씨: {wfSv}")
        
        # 발표시각 (tmFc)
        tmFc = item.get('tmFc', '')
        if tmFc and len(tmFc) >= 12:
            result.append(f"발표시각: {tmFc[:4]}년 {tmFc[4:6]}월 {tmFc[6:8]}일 {tmFc[8:10]}시 {tmFc[10:12]}분")
        
        # 기온 정보 (taMin, taMax)
        taMin = item.get('taMin', '')
        taMax = item.get('taMax', '')
        if taMin or taMax:
            temp_info = []
            if taMin:
                temp_info.append(f"최저기온: {taMin}°C")
            if taMax:
                temp_info.append(f"최고기온: {taMax}°C")
            if temp_info:
                result.append(", ".join(temp_info))
        
        # 강수량 (rnSt)
        rnSt = item.get('rnSt', '')
        if rnSt:
            result.append(f"강수량: {rnSt}mm")
        
        # 건조 정보 (wf)
        wf = item.get('wf', '')
        if wf:
            result.append(f"예보: {wf}")
        
        if result:
            return "\n".join(result)
        else:
            return "중기예보 정보를 파싱할 수 없습니다."
    except Exception as e:
        print(f"[챗봇] 중기예보 포맷팅 오류: {e}")
        import traceback
        traceback.print_exc()
        return f"중기예보 정보 처리 중 오류: {str(e)}"

def format_weather_response(weather_data: dict, base_date: str, base_time: str) -> str:
    """날씨 데이터를 읽기 쉬운 형식으로 변환"""
    try:
        if 'response' in weather_data and 'body' in weather_data['response']:
            body = weather_data['response']['body']
            items = body.get('items', {})
            
            # items가 딕셔너리인 경우 item 배열 추출
            if isinstance(items, dict):
                item_list = items.get('item', [])
                # item이 단일 객체인 경우 리스트로 변환
                if not isinstance(item_list, list):
                    item_list = [item_list] if item_list else []
            elif isinstance(items, list):
                item_list = items
            else:
                item_list = []
            
            if not item_list:
                return "날씨 정보가 없습니다."
            
            # 첫 번째 예보 시간의 정보 수집
            first_item = item_list[0]
            fcst_date = first_item.get('fcstDate', '')
            fcst_time = first_item.get('fcstTime', '')
            
            # 해당 시간의 모든 정보 수집
            time_info = {}
            for item in item_list:
                if item.get('fcstDate') == fcst_date and item.get('fcstTime') == fcst_time:
                    cat = item.get('category', '')
                    val = item.get('fcstValue', '')
                    if cat == 'TMP':
                        time_info['기온'] = f"{val}°C"
                    elif cat == 'SKY':
                        sky_map = {'1': '맑음', '3': '구름많음', '4': '흐림'}
                        time_info['하늘상태'] = sky_map.get(val, val)
                    elif cat == 'PTY':
                        pty_map = {'0': '없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기'}
                        time_info['강수형태'] = pty_map.get(val, val)
                    elif cat == 'POP':
                        time_info['강수확률'] = f"{val}%"
                    elif cat == 'REH':
                        time_info['습도'] = f"{val}%"
                    elif cat == 'WSD':
                        time_info['풍속'] = f"{val}m/s"
            
            # 요약 생성
            summary = f"현재 날씨 정보 (발표: {base_date} {base_time}):\n"
            summary += f"예보 시간: {fcst_date[:4]}년 {fcst_date[4:6]}월 {fcst_date[6:8]}일 {fcst_time[:2]}시 {fcst_time[2:4]}분\n"
            
            for key, value in time_info.items():
                summary += f"- {key}: {value}\n"
            
            # 다음 시간대 정보도 추가 (3시간 후)
            next_time_info = {}
            for item in item_list:
                item_date = item.get('fcstDate', '')
                item_time = item.get('fcstTime', '')
                # 같은 날짜이고 3시간 후 시간대 찾기
                if item_date == fcst_date and item_time != fcst_time:
                    # 첫 번째 다른 시간대 선택
                    if not next_time_info:
                        for it in item_list:
                            if it.get('fcstDate') == item_date and it.get('fcstTime') == item_time:
                                cat = it.get('category', '')
                                val = it.get('fcstValue', '')
                                if cat == 'TMP':
                                    next_time_info['기온'] = f"{val}°C"
                                elif cat == 'SKY':
                                    sky_map = {'1': '맑음', '3': '구름많음', '4': '흐림'}
                                    next_time_info['하늘상태'] = sky_map.get(val, val)
                                elif cat == 'POP':
                                    next_time_info['강수확률'] = f"{val}%"
                        if next_time_info:
                            summary += f"\n{fcst_date[4:6]}월 {fcst_date[6:8]}일 {item_time[:2]}시 예보:\n"
                            for key, value in next_time_info.items():
                                summary += f"- {key}: {value}\n"
                    break
            
            return summary
        else:
            return "날씨 데이터 형식이 올바르지 않습니다."
    except Exception as e:
        print(f"Format weather error: {e}")
        import traceback
        traceback.print_exc()
        return f"날씨 정보 처리 중 오류: {str(e)}"

# 일기 검색 관련 키워드 감지 함수
def is_diary_detail_request(message: str) -> bool:
    """사용자 메시지가 일기 상세 조회 요청인지 확인
    
    일기 상세 조회 요청 예시:
    - "1번 일기 자세히"
    - "첫 번째 일기 전체"
    - "2번 일기 자세하게 보여줘"
    - "여기서 1번 일기를 자세하게 보여줘"
    - "첫번째 일기 전체 내용"
    """
    message_lower = message.lower()
    
    # 일기 상세 조회 키워드
    detail_keywords = [
        '자세히', '자세하게', '전체', '상세', '전체 내용', '전체 본문',
        '자세히 보여', '자세하게 보여', '전체 보여', '상세 보여',
        'detail', 'show detail', 'full content', 'complete'
    ]
    
    # 일기 번호 패턴 (1번, 첫 번째, 첫번째, 2번 등)
    number_patterns = [
        r'\d+번',
        r'첫\s*번째',
        r'두\s*번째',
        r'세\s*번째',
        r'네\s*번째',
        r'다섯\s*번째',
        r'여섯\s*번째',
        r'일곱\s*번째',
        r'여덟\s*번째',
        r'아홉\s*번째',
        r'열\s*번째'
    ]
    
    # 일기 상세 조회 키워드가 있고, 일기 번호 패턴이 있으면 상세 조회 요청
    has_detail_keyword = any(keyword in message_lower for keyword in detail_keywords)
    has_number_pattern = any(re.search(pattern, message_lower) for pattern in number_patterns)
    
    # "일기" 키워드가 있거나, 번호 패턴이 있으면 상세 조회 요청으로 간주
    if has_detail_keyword and ('일기' in message_lower or has_number_pattern):
        return True
    
    # 번호 패턴이 있고 "일기" 키워드가 있으면 상세 조회 요청
    if has_number_pattern and '일기' in message_lower:
        return True
    
    return False

def extract_diary_number(message: str) -> int:
    """메시지에서 일기 번호 추출 (1부터 시작)
    
    Returns:
        일기 번호 (1, 2, 3, ...), 추출 실패 시 1 반환
    """
    message_lower = message.lower()
    
    # 숫자 + 번 패턴 (1번, 2번, 3번 등)
    number_match = re.search(r'(\d+)번', message_lower)
    if number_match:
        return int(number_match.group(1))
    
    # 한글 숫자 패턴 (첫 번째, 두 번째 등)
    korean_numbers = {
        '첫': 1, '두': 2, '세': 3, '네': 4, '다섯': 5,
        '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9, '열': 10
    }
    
    for korean, number in korean_numbers.items():
        if korean in message_lower and ('번째' in message_lower or '번' in message_lower):
            return number
    
    # 기본값: 1번
    return 1

def is_diary_search_request(message: str) -> bool:
    """사용자 메시지가 일기 검색 요청인지 확인 (개선된 버전)
    
    일기 검색 요청 예시:
    - "일기에서 ~를 찾아줘"
    - "일기 검색"
    - "난중일기에서 ~"
    - "일기 조회"
    - "일기 찾아줘"
    - "일기에 ~가 있나?"
    - "일기에서 ~ 언급"
    
    주의: 일기 상세 조회 요청은 검색 요청이 아닙니다.
    """
    # 일기 상세 조회 요청은 검색 요청이 아님
    if is_diary_detail_request(message):
        return False
    
    message_lower = message.lower()
    
    # 명시적인 검색 키워드
    search_keywords = [
        '일기 검색', '일기 찾아', '일기 찾아줘', '일기에서', '일기 조회',
        '난중일기', '난중일기에서', '난중일기 검색',
        '일기 내용', '일기 보여줘', '일기 알려줘',
        '일기에', '일기 중', '일기에서 찾', '일기 검색해',
        'diary search', 'find diary', 'search diary'
    ]
    
    # 검색 키워드가 있으면 검색 요청
    if any(keyword in message_lower for keyword in search_keywords):
        return True
    
    # "~에 관한 일기", "~에 대한 일기", "~ 일기" 패턴 확인
    # 예: "해전에 관한 일기", "공무에 대한 일기", "오늘 일기"
    if '일기' in message_lower:
        # 정규식으로 패턴 매칭
        import re
        # "X에 관한 일기", "X에 대한 일기", "X 일기" 패턴
        patterns = [
            r'\S+에\s*관한\s*일기',  # "~에 관한 일기"
            r'\S+에\s*대한\s*일기',  # "~에 대한 일기"
            r'\S+\s*일기',          # "~ 일기" (예: "해전 일기", "공무 일기")
        ]
        for pattern in patterns:
            if re.search(pattern, message_lower):
                # "오늘 일기", "내일 일기", "어제 일기"는 일기 검색이 아님 (일기 작성 요청)
                date_patterns = ['오늘', '내일', '어제', '이번', '지난', '다음']
                if not any(date_word in message_lower for date_word in date_patterns):
                    return True
    
    # "일기" + 질문 형식 (예: "일기에서 공무를 언급한 것 찾아줘")
    if '일기' in message_lower:
        question_patterns = [
            '찾아', '검색', '조회', '보여', '알려', '에서', 
            '있나', '있어', '언급', '나타나', '나타났', '나타나는',
            '말했', '말한', '적어', '적었', '기록', '기록했'
        ]
        if any(pattern in message_lower for pattern in question_patterns):
            return True
    
    return False

def extract_search_query(message: str) -> str:
    """메시지에서 검색어 추출 (개선된 버전)
    
    예:
    - "일기에서 공무를 찾아줘" -> "공무"
    - "난중일기 검색: 이순신" -> "이순신"
    - "일기에서 동헌에 대해" -> "동헌"
    - "일기에서 공무와 원수를 찾아줘" -> "공무 원수"
    - "해전에 관한 일기를 찾아줘" -> "해전"
    - "공무에 대한 일기" -> "공무"
    """
    # 정규식으로 더 정확하게 검색어 추출
    import re
    
    # 패턴 0: "X에 관한 일기를 찾아줘", "X에 대한 일기를 찾아줘" 형식 (최우선)
    pattern0 = r'(.+?)에\s*(?:관한|대한)\s*일기(?:를|을)?\s*(?:찾아|검색|조회|보여|알려|줘)?'
    match0 = re.search(pattern0, message, re.IGNORECASE)
    if match0:
        query = match0.group(1).strip()
        # 조사 제거
        query = re.sub(r'\s*(을|를|이|가|에|에서|의|로|으로|와|과|도|만|은|는)\s*$', '', query)
        query = query.strip()
        if query:
            print(f"[검색어 추출] 패턴0 매칭: '{query}' (원본: '{message}')")
            return query
    
    # 패턴 1: "일기에서 X를 찾아줘" 형식
    pattern1 = r'일기(?:에서|에)?\s*(.+?)(?:를|을|에 대해|에 대해서|에 관해|에 관해서)?\s*(?:찾아|검색|조회|보여|알려|줘)'
    match1 = re.search(pattern1, message, re.IGNORECASE)
    if match1:
        query = match1.group(1).strip()
        # 조사 제거 (끝에 있는 조사만)
        query = re.sub(r'\s*(을|를|이|가|에|에서|의|로|으로|와|과|도|만|은|는)\s*$', '', query)
        query = query.strip()
        if query:
            print(f"[검색어 추출] 패턴1 매칭: '{query}' (원본: '{message}')")
            return query
    
    # 패턴 2: "검색: X" 또는 "검색 X" 형식
    pattern2 = r'검색\s*[:：]\s*(.+)'
    match2 = re.search(pattern2, message, re.IGNORECASE)
    if match2:
        query = match2.group(1).strip()
        if query:
            return query
    
    # 패턴 3: "X를 찾아줘" (일기 키워드가 앞에 있는 경우)
    if '일기' in message.lower():
        pattern3 = r'일기.*?([가-힣\w\s]+?)(?:를|을|에 대해|에 대해서|에 관해|에 관해서)?\s*(?:찾아|검색|조회|보여|알려)'
        match3 = re.search(pattern3, message, re.IGNORECASE)
        if match3:
            query = match3.group(1).strip()
            # 조사 제거
            query = re.sub(r'\s*(을|를|이|가|에|에서|의|로|으로|와|과|도|만|은|는)\s*', ' ', query)
            query = query.strip()
            if query:
                return query
    
    # 패턴 4: "일기" 키워드 뒤의 모든 내용을 검색어로 (마지막 폴백)
    if '일기' in message.lower():
        parts = re.split(r'일기', message, flags=re.IGNORECASE, maxsplit=1)
        if len(parts) > 1:
            query = parts[1].strip()
            # 검색 관련 키워드 제거
            query = re.sub(r'\s*(찾아|검색|조회|보여|알려|줘|주세요|해줘|해주세요)\s*', '', query, flags=re.IGNORECASE)
            # 조사 제거 (앞뒤)
            query = re.sub(r'^\s*(을|를|이|가|에|에서|의|로|으로|와|과|도|만|은|는)\s+', '', query)
            query = re.sub(r'\s+(을|를|이|가|에|에서|의|로|으로|와|과|도|만|은|는)\s*$', '', query)
            query = query.strip()
            # "를" 같은 단일 조사만 남은 경우 제외
            if query and query not in ['를', '을', '이', '가', '에', '에서', '의', '로', '으로', '와', '과', '도', '만', '은', '는']:
                print(f"[검색어 추출] 패턴4 매칭: '{query}' (원본: '{message}')")
                return query
    
    # 기본: 검색 키워드 제거 후 남은 내용
    search_keywords = [
        '일기 검색', '일기 찾아', '일기 찾아줘', '일기에서', '일기 조회',
        '난중일기', '난중일기에서', '난중일기 검색',
        '일기 내용', '일기 보여줘', '일기 알려줘',
        '찾아줘', '찾아', '검색', '조회', '보여줘', '알려줘'
    ]
    
    query = message
    for keyword in search_keywords:
        query = re.sub(re.escape(keyword), '', query, flags=re.IGNORECASE)
    
    # 콜론(:) 뒤의 내용 추출
    if ':' in query or '：' in query:
        parts = re.split(r'[:：]', query, maxsplit=1)
        if len(parts) > 1:
            query = parts[1].strip()
    
    # 불필요한 단어 제거
    stop_words = ['을', '를', '이', '가', '에', '에서', '의', '로', '으로', '와', '과', '도', '만', '은', '는']
    words = query.split()
    query = ' '.join([w for w in words if w not in stop_words])
    
    return query.strip()

def calculate_relevance_score(diary: dict, search_terms: list) -> float:
    """일기의 검색 관련도 점수 계산
    
    Args:
        diary: 일기 객체
        search_terms: 검색어 리스트 (여러 단어)
    
    Returns:
        관련도 점수 (0.0 ~ 1.0, 높을수록 관련도 높음)
    """
    title = diary.get("title", "").lower()
    content = diary.get("content", "").lower()
    
    score = 0.0
    total_terms = len(search_terms)
    
    for term in search_terms:
        term_lower = term.lower().strip()
        if not term_lower:
            continue
        
        # 제목에 포함되면 높은 점수 (제목 매칭은 더 중요)
        if term_lower in title:
            score += 0.5  # 제목 매칭 가중치
        
        # 내용에 포함되면 점수 추가
        content_count = content.count(term_lower)
        if content_count > 0:
            # 여러 번 나타나면 점수 증가 (최대 0.3)
            score += min(0.3, 0.1 * min(content_count, 3))
    
    # 정규화 (0.0 ~ 1.0)
    if total_terms > 0:
        score = min(1.0, score / total_terms)
    
    return score

def search_diaries(user_id: Optional[int] = None, search_query: str = "", jwt_token: Optional[str] = None) -> list:
    """diary-service에서 일기 검색 (개선된 버전)
    
    Args:
        user_id: 사용자 ID (선택사항, jwt_token이 있으면 사용하지 않음)
        search_query: 검색어 (선택사항, 빈 문자열이면 전체 조회)
                      여러 단어 지원 (공백으로 구분)
        jwt_token: JWT 토큰 (선택사항, 있으면 JWT 기반 엔드포인트 사용)
    
    Returns:
        검색된 일기 리스트 (관련도 순으로 정렬)
    """
    try:
        print(f"[챗봇] 일기 검색 시작: userId={user_id}, query='{search_query}', hasJwtToken={jwt_token is not None}")
        
        # API Gateway URL (환경 변수로 설정 가능, 기본값: api-gateway:8080)
        api_gateway_url = os.getenv("API_GATEWAY_URL", "http://api-gateway:8080")
        
        # JWT 토큰이 있으면 JWT 기반 엔드포인트 사용
        if jwt_token:
            # API Gateway를 통해 접근: /diary/diaries/user
            search_url = f"{api_gateway_url}/diary/diaries/user"
            headers = {
                "Authorization": f"Bearer {jwt_token}"
            }
            response = requests.get(search_url, headers=headers, timeout=10)
        elif user_id:
            # userId가 있으면 기존 방식 사용
            # API Gateway를 통해 접근: /diary/diaries/user/{user_id}
            search_url = f"{api_gateway_url}/diary/diaries/user/{user_id}"
            response = requests.get(search_url, timeout=10)
        else:
            print(f"[챗봇] 일기 검색 실패: userId와 jwtToken이 모두 없습니다.")
            return []
        
        if response.status_code != 200:
            print(f"[챗봇] 일기 검색 실패: {response.status_code}")
            return []
        
        data = response.json()
        
        # Messenger 형식 파싱
        if data.get("code") != 200:
            print(f"[챗봇] 일기 검색 실패: {data.get('message', 'Unknown error')}")
            return []
        
        diaries = data.get("data", [])
        if not isinstance(diaries, list):
            diaries = []
        
        print(f"[챗봇] 일기 조회 성공: {len(diaries)}개")
        
        # 검색어가 있으면 필터링 및 관련도 계산
        if search_query:
            # 검색어를 여러 단어로 분리
            search_terms = [term.strip() for term in search_query.split() if term.strip()]
            
            if not search_terms:
                return diaries
            
            print(f"[챗봇] 검색어 분리: {search_terms}")
            
            filtered_diaries = []
            for diary in diaries:
                title = diary.get("title", "").lower()
                content = diary.get("content", "").lower()
                
                # 하나 이상의 검색어가 제목이나 내용에 포함되어 있으면 포함
                matched = False
                for term in search_terms:
                    term_lower = term.lower()
                    if term_lower in title or term_lower in content:
                        matched = True
                        break
                
                if matched:
                    # 관련도 점수 계산
                    relevance_score = calculate_relevance_score(diary, search_terms)
                    diary['_relevance_score'] = relevance_score
                    filtered_diaries.append(diary)
            
            # 관련도 점수 순으로 정렬 (높은 점수부터)
            filtered_diaries.sort(key=lambda x: x.get('_relevance_score', 0.0), reverse=True)
            
            print(f"[챗봇] 검색어 필터링 결과: {len(filtered_diaries)}개 (관련도 순 정렬)")
            return filtered_diaries
        
        return diaries
        
    except Exception as e:
        print(f"[챗봇] 일기 검색 오류: {e}")
        import traceback
        traceback.print_exc()
        return []

def highlight_search_terms(text: str, search_terms: list) -> str:
    """텍스트에서 검색어를 강조 표시 (간단한 버전)
    
    Args:
        text: 원본 텍스트
        search_terms: 검색어 리스트
    
    Returns:
        강조 표시된 텍스트
    """
    if not search_terms:
        return text
    
    result = text
    for term in search_terms:
        if term.strip():
            # 대소문자 구분 없이 검색어 강조
            import re
            pattern = re.escape(term)
            result = re.sub(
                pattern, 
                lambda m: f"【{m.group(0)}】",  # 【】로 강조
                result, 
                flags=re.IGNORECASE
            )
    
    return result

def format_diary_search_results(diaries: list, search_query: str = "") -> str:
    """일기 검색 결과를 읽기 쉬운 형식으로 포맷팅 (개선된 버전)
    
    Args:
        diaries: 일기 리스트 (관련도 순으로 정렬됨)
        search_query: 검색어 (선택사항)
    
    Returns:
        포맷팅된 문자열
    """
    if not diaries:
        if search_query:
            return f"'{search_query}'에 대한 검색 결과가 없습니다. 다른 검색어로 시도해보세요."
        return "일기가 없습니다."
    
    result_parts = []
    
    # 검색어 분리
    search_terms = [term.strip() for term in search_query.split() if term.strip()] if search_query else []
    
    if search_query:
        result_parts.append(f"🔍 '{search_query}' 검색 결과: {len(diaries)}개\n")
    else:
        result_parts.append(f"📝 전체 일기: {len(diaries)}개\n")
    
    # 최대 10개만 표시 (너무 많으면 요약)
    display_count = min(len(diaries), 10)
    
    for i, diary in enumerate(diaries[:display_count], 1):
        diary_date = diary.get("diaryDate", "")
        title = diary.get("title", "제목 없음")
        content = diary.get("content", "")
        
        # 검색어가 있으면 강조 표시
        if search_terms:
            title = highlight_search_terms(title, search_terms)
            content = highlight_search_terms(content, search_terms)
        
        # 관련도 점수 표시 (검색어가 있는 경우)
        relevance_score = diary.get('_relevance_score')
        relevance_info = ""
        if relevance_score is not None and search_query:
            relevance_percent = int(relevance_score * 100)
            relevance_info = f" (관련도: {relevance_percent}%)"
        
        # 내용이 너무 길면 검색어 주변으로 잘라내기
        if len(content) > 300:
            if search_terms:
                # 검색어가 있으면 검색어 주변으로 잘라내기
                content_lower = content.lower()
                first_term = search_terms[0].lower()
                term_pos = content_lower.find(first_term)
                
                if term_pos >= 0:
                    # 검색어 앞뒤로 150자씩
                    start = max(0, term_pos - 150)
                    end = min(len(content), term_pos + len(first_term) + 150)
                    content = content[start:end]
                    if start > 0:
                        content = "..." + content
                    if end < len(diary.get("content", "")):
                        content = content + "..."
                else:
                    # 검색어가 없으면 앞부분만
                    content = content[:300] + "..."
            else:
                content = content[:300] + "..."
        
        result_parts.append(f"{i}. [{diary_date}]{relevance_info} {title}")
        result_parts.append(f"   {content}")
        result_parts.append(f"   💡 자세히 보려면: '{i}번 일기 자세히' 또는 '{i}번 일기 전체'라고 말씀해주세요.\n")
    
    if len(diaries) > display_count:
        result_parts.append(f"\n... 외 {len(diaries) - display_count}개 더 있음")
    
    return "\n".join(result_parts)

# 일기 관련 키워드 감지 함수
def should_classify_as_diary(message: str) -> bool:
    """사용자 메시지가 일기로 분류되어야 하는지 확인
    
    일기로 분류 가능한 경우:
    - 개인적인 일상 기록 패턴
    - 감정이나 하루를 정리하는 표현
    - 날짜가 포함된 일상 기록
    - 공무, 업무, 일상 활동 기록
    
    주의: 
    - "일기" 키워드만으로는 일기로 분류하지 않습니다 (일기 검색 요청일 수 있음)
    - 일기 검색 요청("일기에서 ~를 찾아줘")은 일기로 분류하지 않습니다.
    - 날씨 관련 키워드가 있으면 일기로 분류하지 않습니다 (날씨 질문 우선)
    - 일기 저장은 나중에 별도 AI 라우터 모델이 처리할 예정입니다.
    
    Note:
        모든 카테고리(일기, 건강, 가계, 문화, 패스파인더)가 구현되어 있습니다.
        통합 분류는 classify_and_parse() 함수를 사용하세요.
    """
    message_lower = message.lower()
    
    # 일기 검색 요청은 일기로 분류하지 않음 (최우선 체크)
    if is_diary_search_request(message):
        print(f"[챗봇] 일기 검색 요청 감지 - 일기로 분류하지 않음")
        return False
    
    # "일기" 키워드만으로는 일기로 분류하지 않음 (나중에 AI 라우터가 처리)
    if '일기' in message_lower:
        print(f"[챗봇] '일기' 키워드 감지 - 일기로 분류하지 않음 (AI 라우터가 처리 예정)")
        return False
    
    # ✅ 날씨 관련 키워드가 있으면 일기로 분류하지 않음 (날씨 질문 우선)
    if is_weather_related(message):
        print(f"[챗봇] 날씨 관련 키워드 감지 - 일기로 분류하지 않음 (날씨 질문 우선)")
        return False
    
    diary_keywords = [
        '기록', '오늘', '하루', '오늘 하루', '정리',
        '오늘 있었던 일', '오늘 한 일', '오늘 느낀 점',
        '공무', '업무', '일상', '하루 일과', '오늘 하루',
        '공문', '원수', '문서', '자문', '서계',  # 고전 일기 키워드
        '몸', '나아진', '나았다',  # 건강 상태 기록 (일기)
        'diary', 'today', 'daily', 'log'
    ]
    
    # 명시적 일기 키워드 확인
    if any(keyword in message_lower for keyword in diary_keywords):
        return True
    
    # 일기로 분류할 만한 패턴 확인
    # 예: "오늘 ~했어", "~했더니 ~했어", "오늘은 ~"
    diary_patterns = [
        r'오늘\s+[가-힣]+[었었]',
        r'오늘\s+[가-힣]+\s+[가-힣]+[었었]',
        r'오늘은\s+[가-힣]+',
        r'하루\s+[가-힣]+',
        r'\d{4}-\d{2}-\d{2}',  # 날짜 패턴 (YYYY-MM-DD)
        r'\d{4}년\s*\d{1,2}월\s*\d{1,2}일',  # 날짜 패턴 (YYYY년 MM월 DD일)
        r'동헌', r'공무', r'점검', r'순찰',  # 고전 일기 패턴
        r'공문', r'원수', r'문서', r'자문', r'서계',  # 고전 일기 문서 관련 패턴
        r'몸이\s+[가-힣]+', r'나아진', r'나았다',  # 건강 상태 기록 패턴
    ]
    
    for pattern in diary_patterns:
        if re.search(pattern, message):
            return True
    
    # 일상 기록 패턴 (문화 키워드와 구별)
    # "~했다", "~했다가", "~하고", "~했더니" 같은 패턴이 있으면 일기 가능성 높음
    daily_patterns = [
        r'[가-힣]+했다',
        r'[가-힣]+했다가',
        r'[가-힣]+하고',
        r'[가-힣]+했더니',
        r'[가-힣]+했다\.',
    ]
    
    # 문화 관련 명시적 키워드가 없고, 일상 기록 패턴이 있으면 일기로 분류
    culture_explicit_keywords = ['영화', '책', '드라마', '만화', '웹툰', '음악', '노래', '앨범', 
                                 '전시', '박물관', '미술관', '공연', '연극', '뮤지컬', '콘서트']
    has_culture_keyword = any(keyword in message_lower for keyword in culture_explicit_keywords)
    
    if not has_culture_keyword:
        for pattern in daily_patterns:
            if re.search(pattern, message):
                return True
    
    return False

def classify_and_parse_diary(text: str) -> Optional[Dict[str, Any]]:
    """텍스트를 일기로 분류하고 구조화
    
    ⚠️ 주의: 이 함수는 DB 구조와 독립적으로 설계되었습니다.
    - 현재는 구조화만 수행하고, DB 저장은 하지 않습니다.
    - 나중에 일기 서비스의 DB 스키마가 정해지면, 변환 함수를 통해 저장할 수 있습니다.
    
    Args:
        text: 사용자 입력 텍스트
        
    Returns:
        분류된 일기 데이터 또는 None (분류 실패 시)
        {
            "category": "일기",
            "confidence": float,
            "data": {
                "mood": str,
                "events": list[str],
                "keywords": list[str],
                "date": str,
                "content": str
            }
        }
        
    Note:
        - 현재 데이터 구조는 나중에 DB 스키마에 맞춰 변환해야 할 수 있습니다.
        - DB 구조가 정해진 후 transform_to_db_format() 같은 함수를 추가하세요.
    """
    if client is None:
        return None
    
    try:
        prompt = f"""
다음 텍스트를 일기 형식으로 구조화해주세요.

텍스트: "{text}"

**중요한 구분 기준:**
- 일기: 개인의 일상 기록, 하루 동안 있었던 일, 감정이나 생각, 공무/업무 기록, 날짜가 포함된 일상 기록
- 문화: 영화/책/드라마/음악 등 특정 작품에 대한 감상이나 리뷰, 문화 콘텐츠 소비 기록
- 일기는 "오늘 공무를 봤다", "동헌에 나갔다", "점검했다" 같은 일상 활동 기록입니다.
- 문화는 "영화를 봤다", "책을 읽었다", "콘서트를 갔다" 같은 특정 작품/콘텐츠에 대한 기록입니다.

다음 JSON 형식으로만 응답해주세요:
{{
    "category": "일기",
    "confidence": 0.0부터 1.0까지의 숫자,
    "data": {{
        "mood": "기쁨" | "슬픔" | "평온" | "스트레스" | "즐거움" | "피곤" | "불안" | "만족" | "보통" | null,
        "events": ["사건1", "사건2", ...],
        "keywords": ["키워드1", "키워드2", ...],
        "date": "YYYY-MM-DD 형식 (오늘 날짜)",
        "content": "원본 텍스트"
    }}
}}

**분류 기준:**
- 이 텍스트가 개인의 일상 기록, 공무/업무 기록, 하루 동안 있었던 일이라면 confidence를 0.7 이상으로 설정하세요.
- 이 텍스트가 특정 문화 작품(영화, 책, 드라마 등)에 대한 감상이나 리뷰라면 confidence를 0.3 미만으로 설정하세요.
- 이 텍스트가 일기가 아니라면, confidence를 0.5 미만으로 설정해주세요.
"""
        
        response = client.chat.completions.create(
            model=DEFAULT_CLASSIFICATION_MODEL,
            messages=[
                {"role": "system", "content": "You are a JSON parser. Respond only with valid JSON. Always use Korean for text fields."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # 분류 정확도 향상을 위해 낮춤
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # confidence가 충분히 높을 때만 반환
        if result.get("confidence", 0) >= 0.5:
            # 날짜가 없으면 오늘 날짜로 설정
            if not result.get("data", {}).get("date"):
                result["data"]["date"] = datetime.now().strftime("%Y-%m-%d")
            return result
        else:
            return None
            
    except Exception as e:
        print(f"[챗봇] 일기 분류 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== 건강 카테고리 ==========

def should_classify_as_health(message: str) -> bool:
    """사용자 메시지가 건강 관련인지 확인"""
    health_keywords = [
        '운동', '헬스', '조깅', '러닝', '걷기', '달리기', '수영', '요가',
        '식단', '다이어트', '칼로리', '체중', '몸무게', '건강', '건강검진',
        '병원', '약', '증상', '아픔', '수면', '잠', '피로', '스트레칭',
        'exercise', 'health', 'diet', 'workout', 'calories', 'sleep'
    ]
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in health_keywords)

def classify_and_parse_health(text: str) -> Optional[Dict[str, Any]]:
    """텍스트를 건강 관련으로 분류하고 구조화"""
    if client is None:
        return None
    
    try:
        prompt = f"""
다음 텍스트를 건강 관련 정보로 구조화해주세요.

텍스트: "{text}"

다음 JSON 형식으로만 응답해주세요:
{{
    "category": "건강",
    "confidence": 0.0부터 1.0까지의 숫자,
    "data": {{
        "type": "운동" | "식단" | "수면" | "체중" | "건강검진" | "기타" | null,
        "exercise_type": "러닝" | "헬스" | "요가" | "수영" | "걷기" | null,
        "duration": 숫자 (분 단위),
        "distance": 숫자 (km 단위),
        "calories": 숫자,
        "weight": 숫자 (kg 단위),
        "memo": "추가 메모",
        "date": "YYYY-MM-DD 형식 (오늘 날짜)",
        "content": "원본 텍스트"
    }}
}}

만약 이 텍스트가 건강 관련이 아니라면, confidence를 0.5 미만으로 설정해주세요.
"""
        
        response = client.chat.completions.create(
            model=DEFAULT_CLASSIFICATION_MODEL,
            messages=[
                {"role": "system", "content": "You are a JSON parser. Respond only with valid JSON. Always use Korean for text fields."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # 분류 정확도 향상을 위해 낮춤
        )
        
        result = json.loads(response.choices[0].message.content)
        
        if result.get("confidence", 0) >= 0.5:
            if not result.get("data", {}).get("date"):
                result["data"]["date"] = datetime.now().strftime("%Y-%m-%d")
            return result
        else:
            return None
            
    except Exception as e:
        print(f"[챗봇] 건강 분류 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== 가계 카테고리 ==========

def should_classify_as_finance(message: str) -> bool:
    """사용자 메시지가 가계 관련인지 확인
    
    주의: "원수", "원인", "원칙" 같은 단어의 "원"은 가계가 아닙니다.
    금액이 명시된 경우(예: "10000원", "5만원")만 가계로 분류합니다.
    """
    message_lower = message.lower()
    
    # 금액 패턴 확인 (숫자 + 만원, 원, 등) - 가장 확실한 가계 신호
    amount_patterns = [
        r'\d+\s*만원',
        r'\d+\s*원\b',  # \b로 단어 경계 확인 (숫자 + 원)
        r'\d+\s*천원',
        r'\d+\s*억',
        r'\d+[,]\d+\s*원\b',  # 10,000원 형식
    ]
    
    # 금액 패턴이 있으면 가계로 분류
    if any(re.search(pattern, message) for pattern in amount_patterns):
        return True
    
    # 명시적인 가계 키워드 (단어 경계 고려)
    finance_keywords = [
        '썼다', '쓴다', '지출', '수입', '가계', '가계부', '돈',
        '결제', '카드', '현금', '송금', '입금', '출금', '예산', '비용',
        '구매', '구매했다', '산다', '샀다', '마트', '편의점', '카페',
        'finance', 'money', 'spend', 'expense', 'income', 'payment'
    ]
    
    # 일기 관련 키워드가 있으면 가계가 아님
    diary_keywords = ['공문', '원수', '문서', '자문', '서계', '공무', '업무', 
                      '몸', '나아진', '나았다', '동헌', '점검', '순찰']
    if any(keyword in message_lower for keyword in diary_keywords):
        return False  # 일기 우선
    
    # 가계 키워드 확인
    if any(keyword in message_lower for keyword in finance_keywords):
        return True
    
    return False

def classify_and_parse_finance(text: str) -> Optional[Dict[str, Any]]:
    """텍스트를 가계 관련으로 분류하고 구조화"""
    if client is None:
        return None
    
    try:
        prompt = f"""
다음 텍스트를 가계(수입/지출) 정보로 구조화해주세요.

텍스트: "{text}"

**중요한 구분 기준:**
- 가계: 금액이 명시된 수입/지출 기록, 구매/결제 기록, 가계부 기록
- 일기: 개인의 일상 기록, 공무/업무 기록, 건강 상태 기록, 문서/공문 관련 기록
- "몸이 나아진 것 같다", "공문이 왔다", "문서를 받았다" 같은 것은 일기입니다 (가계 아님).
- "10000원을 썼다", "마트에서 5만원 결제", "월급 300만원 받았다" 같은 금액이 명시된 기록만 가계입니다.

다음 JSON 형식으로만 응답해주세요:
{{
    "category": "가계",
    "confidence": 0.0부터 1.0까지의 숫자,
    "data": {{
        "type": "지출" | "수입" | null,
        "amount": 숫자 (원 단위),
        "currency": "KRW",
        "location": "장소명",
        "category_detail": "식료품" | "외식" | "교통" | "쇼핑" | "생활비" | "기타" | null,
        "payment_method": "카드" | "현금" | "계좌이체" | null,
        "memo": "추가 메모",
        "date": "YYYY-MM-DD 형식 (오늘 날짜)",
        "time": "HH:MM 형식",
        "content": "원본 텍스트"
    }}
}}

**분류 기준:**
- 이 텍스트에 금액(원, 만원, 억 등)이 명시되어 있고, 수입/지출/구매/결제 관련이라면 confidence를 0.7 이상으로 설정하세요.
- 이 텍스트가 일상 기록, 공무 기록, 건강 상태 기록, 문서 관련 기록이라면 confidence를 0.3 미만으로 설정하세요 (일기로 분류되어야 함).
- 이 텍스트가 가계 관련이 아니라면, confidence를 0.5 미만으로 설정해주세요.
"""
        
        response = client.chat.completions.create(
            model=DEFAULT_CLASSIFICATION_MODEL,
            messages=[
                {"role": "system", "content": "You are a JSON parser. Respond only with valid JSON. Always use Korean for text fields."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # 분류 정확도 향상을 위해 낮춤
        )
        
        result = json.loads(response.choices[0].message.content)
        
        if result.get("confidence", 0) >= 0.5:
            if not result.get("data", {}).get("date"):
                result["data"]["date"] = datetime.now().strftime("%Y-%m-%d")
            if not result.get("data", {}).get("time"):
                result["data"]["time"] = datetime.now().strftime("%H:%M")
            return result
        else:
            return None
            
    except Exception as e:
        print(f"[챗봇] 가계 분류 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== 문화 카테고리 ==========

def should_classify_as_culture(message: str) -> bool:
    """사용자 메시지가 문화 관련인지 확인
    
    주의: 일기에서도 "봤다", "읽었다" 같은 표현이 나올 수 있으므로
    명시적인 문화 콘텐츠 키워드가 있어야만 문화로 분류합니다.
    """
    # 명시적인 문화 콘텐츠 키워드 (일기와 구별)
    culture_explicit_keywords = [
        '영화', '책', '드라마', '만화', '웹툰', '음악', '노래', '앨범',
        '전시', '박물관', '미술관', '공연', '연극', '뮤지컬', '콘서트',
        '도서관', '독서',
        'movie', 'book', 'music', 'concert', 'exhibition', 'culture',
        '소설', '에세이', '시집', '만화책', '웹소설'
    ]
    
    message_lower = message.lower()
    
    # 명시적인 문화 키워드가 있어야만 문화로 분류
    if any(keyword in message_lower for keyword in culture_explicit_keywords):
        # 일기 관련 키워드가 함께 있으면 일기 우선
        diary_keywords_in_message = ['공무', '업무', '일상', '오늘', '하루', '동헌', '점검', '순찰']
        if any(keyword in message_lower for keyword in diary_keywords_in_message):
            return False  # 일기 우선
        return True
    
    return False

def classify_and_parse_culture(text: str) -> Optional[Dict[str, Any]]:
    """텍스트를 문화 관련으로 분류하고 구조화"""
    if client is None:
        return None
    
    try:
        prompt = f"""
다음 텍스트를 문화 활동 정보로 구조화해주세요.

텍스트: "{text}"

**중요한 구분 기준:**
- 문화: 영화/책/드라마/음악 등 특정 작품에 대한 감상, 리뷰, 평가, 문화 콘텐츠 소비 기록
- 일기: 개인의 일상 기록, 공무/업무 기록, 하루 동안 있었던 일 (작품 제목이나 감상이 없는 경우)
- "오늘 공무를 봤다", "동헌에 나갔다", "점검했다" 같은 것은 일기입니다 (문화 아님).
- "영화를 봤다", "책을 읽었다", "콘서트를 갔다" 같은 특정 작품/콘텐츠에 대한 기록만 문화입니다.

다음 JSON 형식으로만 응답해주세요:
{{
    "category": "문화",
    "confidence": 0.0부터 1.0까지의 숫자,
    "data": {{
        "type": "영화" | "책" | "전시" | "공연" | "음악" | "드라마" | "웹툰" | null,
        "title": "작품 제목",
        "genre": "장르",
        "rating": 숫자 (0.0 ~ 5.0),
        "author": "작가/감독/아티스트",
        "memo": "추가 메모",
        "date": "YYYY-MM-DD 형식 (오늘 날짜)",
        "content": "원본 텍스트"
    }}
}}

**분류 기준:**
- 이 텍스트가 특정 문화 작품(영화, 책, 드라마, 음악 등)에 대한 감상, 리뷰, 평가라면 confidence를 0.7 이상으로 설정하세요.
- 이 텍스트가 일상 기록이나 공무/업무 기록이라면 confidence를 0.3 미만으로 설정하세요 (일기로 분류되어야 함).
- 이 텍스트가 문화 관련이 아니라면, confidence를 0.5 미만으로 설정해주세요.
"""
        
        response = client.chat.completions.create(
            model=DEFAULT_CLASSIFICATION_MODEL,
            messages=[
                {"role": "system", "content": "You are a JSON parser. Respond only with valid JSON. Always use Korean for text fields."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # 분류 정확도 향상을 위해 낮춤
        )
        
        result = json.loads(response.choices[0].message.content)
        
        if result.get("confidence", 0) >= 0.5:
            if not result.get("data", {}).get("date"):
                result["data"]["date"] = datetime.now().strftime("%Y-%m-%d")
            return result
        else:
            return None
            
    except Exception as e:
        print(f"[챗봇] 문화 분류 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== 패스파인더 카테고리 ==========

def should_classify_as_pathfinder(message: str) -> bool:
    """사용자 메시지가 패스파인더 관련인지 확인"""
    pathfinder_keywords = [
        '목표', '계획', '목표 설정', '계획 세우기', '할 일', '해야 할 일',
        '진로', '탐색', '학습', '공부', '스킬', '능력', '도전', '시작',
        '프로젝트', '과제', '마감', '데드라인', '완료', '달성',
        'goal', 'plan', 'target', 'objective', 'pathfinder', 'explore'
    ]
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in pathfinder_keywords)

def classify_and_parse_pathfinder(text: str) -> Optional[Dict[str, Any]]:
    """텍스트를 패스파인더 관련으로 분류하고 구조화"""
    if client is None:
        return None
    
    try:
        prompt = f"""
다음 텍스트를 패스파인더(목표/계획) 정보로 구조화해주세요.

텍스트: "{text}"

다음 JSON 형식으로만 응답해주세요:
{{
    "category": "패스파인더",
    "confidence": 0.0부터 1.0까지의 숫자,
    "data": {{
        "type": "목표" | "계획" | "탐색" | "학습" | "프로젝트" | null,
        "goal": "목표 내용",
        "deadline": "YYYY-MM-DD 형식",
        "priority": "high" | "medium" | "low" | null,
        "status": "진행중" | "완료" | "대기" | "취소" | null,
        "tags": ["태그1", "태그2", ...],
        "memo": "추가 메모",
        "date": "YYYY-MM-DD 형식 (오늘 날짜)",
        "content": "원본 텍스트"
    }}
}}

만약 이 텍스트가 패스파인더 관련이 아니라면, confidence를 0.5 미만으로 설정해주세요.
"""
        
        response = client.chat.completions.create(
            model=DEFAULT_CLASSIFICATION_MODEL,
            messages=[
                {"role": "system", "content": "You are a JSON parser. Respond only with valid JSON. Always use Korean for text fields."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2  # 분류 정확도 향상을 위해 낮춤
        )
        
        result = json.loads(response.choices[0].message.content)
        
        if result.get("confidence", 0) >= 0.5:
            if not result.get("data", {}).get("date"):
                result["data"]["date"] = datetime.now().strftime("%Y-%m-%d")
            return result
        else:
            return None
            
    except Exception as e:
        print(f"[챗봇] 패스파인더 분류 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== 통합 분류 함수 ==========

def classify_and_parse(text: str) -> Optional[Dict[str, Any]]:
    """텍스트를 모든 카테고리 중 하나로 분류하고 구조화
    
    카테고리 우선순위:
    1. 날씨 (최우선 - 날씨 질문은 다른 카테고리보다 우선)
    2. 일기 (일상 기록, 공무/업무 기록)
    3. 가계 (금액 정보가 명확한 경우)
    4. 건강 (운동, 식단 등)
    5. 패스파인더 (목표, 계획 등)
    6. 문화 (영화, 책 등 - 명시적인 작품 감상만)
    
    주의: 
    - "일기" 키워드만으로는 일기로 분류하지 않습니다 (일기 검색 요청일 수 있음)
    - "일기에서 ~를 찾아줘" 같은 검색 요청은 일기로 분류하지 않습니다.
    - 날씨 관련 키워드가 있으면 일기로 분류하지 않습니다 (날씨 질문 우선)
    - 일기 저장은 나중에 별도 AI 라우터 모델이 처리할 예정입니다.
    - "오늘 공무를 봤다" 같은 일상 기록은 일기로 분류되어야 합니다.
    
    Returns:
        분류된 데이터 또는 None
    """
    # ✅ 날씨 관련 키워드가 있으면 분류하지 않음 (날씨 질문은 별도 처리)
    if is_weather_related(text):
        print(f"[챗봇] 날씨 관련 키워드 감지 - 분류하지 않음 (날씨 질문은 별도 처리)")
        return None
    
    # 일기 검색 요청은 분류하지 않음 (최우선 체크)
    if is_diary_search_request(text):
        print(f"[챗봇] 일기 검색 요청 감지 - 분류하지 않음")
        return None
    
    # "일기" 키워드만으로는 일기로 분류하지 않음 (나중에 AI 라우터가 처리)
    text_lower = text.lower()
    if '일기' in text_lower:
        print(f"[챗봇] '일기' 키워드 감지 - 일기로 분류하지 않음 (AI 라우터가 처리 예정)")
        # "일기" 키워드가 있으면 다른 카테고리도 분류하지 않음 (일기 검색 요청일 가능성)
        return None
    
    # 우선순위 순서로 분류 시도 (일기가 최우선)
    classifiers = [
        ("일기", should_classify_as_diary, classify_and_parse_diary),  # 최우선
        ("가계", should_classify_as_finance, classify_and_parse_finance),
        ("건강", should_classify_as_health, classify_and_parse_health),
        ("패스파인더", should_classify_as_pathfinder, classify_and_parse_pathfinder),
        ("문화", should_classify_as_culture, classify_and_parse_culture),
    ]
    
    results = []
    
    for category_name, should_classify_func, classify_func in classifiers:
        if should_classify_func(text):
            try:
                classification = classify_func(text)
                if classification and classification.get("confidence", 0) >= 0.5:
                    confidence = classification.get("confidence", 0)
                    results.append((confidence, classification))
                    print(f"[챗봇] {category_name} 분류 성공 (confidence: {confidence:.2f})")
            except Exception as e:
                print(f"[챗봇] {category_name} 분류 오류: {e}")
                continue
    
    if results:
        # confidence가 가장 높은 것 선택
        results.sort(key=lambda x: x[0], reverse=True)
        best_result = results[0][1]
        best_category = best_result.get("category", "")
        best_confidence = results[0][0]
        
        # 일기와 다른 카테고리 충돌 시 특별 처리 (일기 우선)
        if best_category != "일기" and len(results) > 1:
            # 일기 결과도 있는지 확인
            diary_result = next((r for r in results if r[1].get("category") == "일기"), None)
            if diary_result:
                diary_confidence = diary_result[0]
                # 일기가 최우선순위이므로, confidence 차이가 0.3 이하면 일기 우선
                if best_confidence - diary_confidence < 0.3:
                    print(f"[챗봇] 일기와 {best_category} 충돌 감지 - 일기 우선 선택 (일기: {diary_confidence:.2f}, {best_category}: {best_confidence:.2f})")
                    return diary_result[1]
        
        print(f"[챗봇] 최종 분류: {best_category} (confidence: {best_confidence:.2f})")
        return best_result
    
    return None

# ========== 카테고리별 저장 함수 ==========

def save_classified_data(classification: Dict[str, Any], user_id: Optional[int] = None) -> bool:
    """분류된 데이터를 해당 카테고리 서비스에 저장
    
    Args:
        classification: 분류된 데이터
        user_id: 사용자 ID (필수)
    
    Note:
        현재는 일기 서비스만 존재하므로 일기만 저장.
        나머지 카테고리는 서비스가 준비되면 추가할 예정.
        
        주의: "일기" 키워드만으로는 자동 저장하지 않습니다.
        나중에 별도 AI 라우터 모델이 저장 여부를 결정하도록 변경 예정입니다.
    """
    if not classification:
        return False
    
    category = classification.get("category")
    if not category:
        return False
    
    try:
        if category == "일기":
            # userId가 없으면 저장 불가
            if not user_id:
                print(f"[챗봇] 일기 저장 실패: userId가 없습니다.")
                return False
            
            # 일기 서비스에 저장
            diary_data = classification.get("data", {})
            # API Gateway URL (환경 변수로 설정 가능, 기본값: api-gateway:8080)
            api_gateway_url = os.getenv("API_GATEWAY_URL", "http://api-gateway:8080")
            # API Gateway를 통해 접근: /diary/diaries
            save_url = f"{api_gateway_url}/diary/diaries"
            
            # DiaryModel 형식에 맞춰 변환
            # 필수 필드: diaryDate, userId
            # 선택 필드: title, content
            date_str = diary_data.get("date", datetime.now().strftime("%Y-%m-%d"))
            content = diary_data.get("content", "")
            
            # title이 없으면 content의 첫 부분을 title로 사용 (최대 200자)
            title = diary_data.get("title", "")
            if not title and content:
                # content의 첫 줄이나 첫 부분을 title로 사용
                first_line = content.split('\n')[0].strip()
                if first_line:
                    title = first_line[:200] if len(first_line) > 200 else first_line
                else:
                    title = "제목 없음"
            
            payload = {
                "diaryDate": date_str,  # 필수: YYYY-MM-DD 형식
                "title": title or "제목 없음",  # 선택 (없으면 "제목 없음")
                "content": content,  # 선택
                "userId": user_id  # 필수
            }
            
            print(f"[챗봇] 일기 저장 시도: userId={user_id}, date={date_str}, title={title[:50] if title else 'None'}...")
            
            response = requests.post(save_url, json=payload, timeout=10)
            if response.status_code in [200, 201]:
                print(f"[챗봇] 일기 저장 성공: {response.status_code}")
                return True
            else:
                error_msg = response.text if hasattr(response, 'text') else "Unknown error"
                print(f"[챗봇] 일기 저장 실패: {response.status_code}, {error_msg}")
                return False
        
        elif category == "건강":
            # 건강 서비스 저장 (서비스 준비되면 추가)
            print(f"[챗봇] 건강 데이터 저장 예정 (서비스 준비 대기 중)")
            # TODO: health-service 준비되면 추가
            return False
        
        elif category == "가계":
            # 가계 서비스 저장 (서비스 준비되면 추가)
            print(f"[챗봇] 가계 데이터 저장 예정 (서비스 준비 대기 중)")
            # TODO: finance-service 준비되면 추가
            return False
        
        elif category == "문화":
            # 문화 서비스 저장 (서비스 준비되면 추가)
            print(f"[챗봇] 문화 데이터 저장 예정 (서비스 준비 대기 중)")
            # TODO: culture-service 준비되면 추가
            return False
        
        elif category == "패스파인더":
            # 패스파인더 서비스 저장 (서비스 준비되면 추가)
            print(f"[챗봇] 패스파인더 데이터 저장 예정 (서비스 준비 대기 중)")
            # TODO: pathfinder-service 준비되면 추가
            return False
        
        return False
        
    except Exception as e:
        print(f"[챗봇] 데이터 저장 오류 ({category}): {e}")
        import traceback
        traceback.print_exc()
        return False

@chatbot_router.get("/chat")
def chat():
    """
    챗봇 대화 API (GET - 기본 테스트)
    
    - **반환**: 챗봇 응답
    """
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    try:
        response = client.chat.completions.create(
            model=DEFAULT_CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 20살 명랑한 여자 대학생처럼 대화해야 해. "
                        "밝고 귀엽고 친근한 말투를 쓰고, 문장 끝에는 종종 "
                        "이모티콘이나 느낌표를 붙여서 활기차게 말해."
                    )
                },
                {"role": "user", "content": "안녕하세요! 오늘 날씨 어때요?"}
            ]
        )
        
        from fastapi.responses import JSONResponse
        chat_response = ChatResponse(
            message=response.choices[0].message.content or "",
            model=response.model,
            status="success"
        )
        return JSONResponse(
            content=chat_response.model_dump(),
            media_type="application/json; charset=utf-8"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

@chatbot_router.post("/chat", response_model=ChatResponse)
def chat_post(request: ChatRequest, http_request: Request = None):
    """
    챗봇 대화 API (POST - 사용자 메시지 전송)
    
    대화 히스토리를 포함하여 연속적인 대화가 가능합니다.
    
    - **message**: 사용자 메시지
    - **model**: 사용할 모델 (기본값: gpt-4-turbo)
    - **system_message**: 시스템 메시지 (기본값: 20살 명랑한 여자 대학생 스타일)
    - **conversation_history**: 이전 대화 히스토리 (선택사항)
        예: [{"role": "user", "content": "안녕"}, {"role": "assistant", "content": "안녕하세요!"}]
    
    - **반환**: 챗봇 응답
    """
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    try:
        # Authorization 헤더에서 JWT 토큰 추출 (request.jwtToken이 없을 때)
        jwt_token = request.jwtToken
        if not jwt_token and http_request:
            auth_header = http_request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                jwt_token = auth_header.replace("Bearer ", "")
                print(f"[챗봇] Authorization 헤더에서 JWT 토큰 추출 성공")
        
        start_time = time.time()
        
        # ========== 빠른 키워드 기반 체크 (GPT 호출 전) ==========
        # 키워드 기반으로 먼저 빠르게 체크하여 불필요한 GPT 호출 방지
        message_lower = request.message.lower()
        
        # 날씨 키워드 빠른 체크
        quick_weather_keywords = ['날씨', '예보', '기온', '온도', '몇도', '비', '눈', '맑음', '흐림']
        quick_is_weather = any(keyword in message_lower for keyword in quick_weather_keywords)
        
        # 일기 검색 키워드 빠른 체크
        quick_diary_search_keywords = ['일기 검색', '일기 찾아', '일기에서', '일기 조회', '에 관한 일기', '에 대한 일기']
        quick_is_diary_search = any(keyword in message_lower for keyword in quick_diary_search_keywords)
        
        # ========== NLP 기반 의도 분류 및 엔티티 추출 (필요할 때만) ==========
        # 키워드로 명확하지 않은 경우에만 GPT 호출
        intent_result = None
        intent = "general"
        confidence = 0.0
        entities = {}
        
        # 키워드로 명확하지 않은 경우에만 의도 분류 수행
        needs_intent_classification = not quick_is_weather and not quick_is_diary_search
        
        if needs_intent_classification:
            intent_result = classify_intent(request.message)
            intent = intent_result.get("intent", "general")
            confidence = intent_result.get("confidence", 0.0)
            entities = intent_result.get("entities", {})
            print(f"[챗봇] 🎯 의도 분류 결과: intent={intent}, confidence={confidence:.2f}")
            print(f"[챗봇] 🎯 추출된 엔티티: {entities}")
        else:
            print(f"[챗봇] ⚡ 키워드 기반 빠른 체크 완료 (GPT 호출 생략)")
        
        # 날씨 관련 질문인지 확인 (키워드 우선, 필요시 NLP)
        if quick_is_weather:
            is_weather = True
        else:
            is_weather = is_weather_related(request.message, intent_result)
        # 일기 검색 요청인지 확인
        is_diary_search = is_diary_search_request(request.message)
        # 일기 상세 조회 요청인지 확인
        is_diary_detail = is_diary_detail_request(request.message)
        # 분류가 필요한지 확인 ("일기" 키워드만으로는 분류하지 않음, 나중에 AI 라우터가 처리)
        # ✅ 날씨 질문이 아니고, 일기 검색/상세 조회 요청이 아니고, "일기" 키워드가 없을 때만 분류 시도
        needs_classification = not is_weather and not is_diary_search and not is_diary_detail and '일기' not in request.message.lower() and should_classify_as_diary(request.message)
        
        # 병렬 처리: 날씨 API, 일기 검색, 분류를 동시에 실행
        weather_context = ""
        diary_search_context = ""
        classification = None
        classification_context = ""
        
        def fetch_weather():
            """날씨 정보 조회 (별도 스레드) - NLP 엔티티 활용"""
            if not is_weather:
                return ""
            try:
                print(f"[챗봇] 🌤️ 날씨 관련 질문 감지: {request.message}")
                # NLP로 추출된 엔티티를 활용하여 지역 정보 추출
                region_info = extract_region(request.message, entities)
                print(f"[챗봇] 🌤️ 추출된 지역 정보: {region_info}")
                # NLP로 추출된 날짜 엔티티를 활용하여 날짜 범위 추출
                date_range = extract_date_range(request.message, entities.get('date'))
                print(f"[챗봇] 🌤️ 추출된 날짜 범위: {date_range}")
                weather_info = get_weather_info(region_info, date_range)
                print(f"[챗봇] 🌤️ 날씨 정보 조회 결과 (길이: {len(weather_info) if weather_info else 0}): {weather_info[:200] if weather_info else 'None'}...")
                
                if weather_info and "날씨 정보를 조회할 수 없습니다" not in weather_info and "오류" not in weather_info and "실패" not in weather_info:
                    forecast_type = ""
                    if date_range.get('use_short', False) and date_range.get('use_mid', False):
                        forecast_type = "단기예보와 중기예보"
                    elif date_range.get('use_short', False):
                        forecast_type = "단기예보"
                    elif date_range.get('use_mid', False):
                        forecast_type = "중기예보"
                    else:
                        forecast_type = "단기예보"  # 기본값
                    
                    print(f"[챗봇] ✅ 날씨 정보 조회 성공: {forecast_type}")
                    return f"\n\n[날씨 정보 - {forecast_type}]\n{weather_info}\n\n⚠️ 중요: 위 날씨 정보는 기상청 API에서 가져온 실제 데이터입니다. 이 정보를 반드시 사용해서 답변해주세요. 일기 내용이나 다른 추측은 사용하지 마세요!"
                else:
                    print(f"[챗봇] ⚠️ 날씨 정보 조회 실패 또는 오류: {weather_info}")
                    # 날씨 정보 조회 실패 시에도 일기 컨텍스트를 사용하지 않도록 빈 문자열 반환
                    return ""
            except Exception as e:
                print(f"[챗봇] ❌ Weather integration error: {e}")
                import traceback
                traceback.print_exc()
            return ""
        
        def fetch_diary_search():
            """일기 검색 또는 상세 조회 (별도 스레드)"""
            if not is_diary_search and not is_diary_detail:
                return ""
            
            # userId 또는 jwtToken이 없으면 검색 불가
            if not request.userId and not jwt_token:
                print(f"[챗봇] 일기 요청이지만 userId와 jwtToken이 모두 없음")
                return "\n\n[일기 검색 안내]\n로그인이 필요합니다. 일기 검색을 위해서는 사용자 인증이 필요합니다."
            
            try:
                # 일기 상세 조회 요청 처리
                if is_diary_detail:
                    print(f"[챗봇] 📖 일기 상세 조회 요청 감지: {request.message}")
                    diary_number = extract_diary_number(request.message)
                    print(f"[챗봇] 📖 추출된 일기 번호: {diary_number}")
                    
                    # 대화 히스토리에서 이전 검색어 추출 시도
                    previous_search_query = ""
                    if request.conversation_history:
                        # 최근 대화에서 일기 검색 관련 메시지 찾기
                        for msg in reversed(request.conversation_history[-5:]):  # 최근 5개만 확인
                            if msg.role == "user":
                                # 이전 사용자 메시지에서 검색어 추출
                                prev_query = extract_search_query(msg.content)
                                if prev_query:
                                    previous_search_query = prev_query
                                    break
                    
                    # 검색어가 없으면 전체 조회
                    if not previous_search_query:
                        previous_search_query = ""
                    
                    print(f"[챗봇] 📖 이전 검색어 (또는 전체): '{previous_search_query}'")
                    
                    # 일기 검색 수행
                    diaries = search_diaries(request.userId, previous_search_query, jwt_token)
                    
                    if not diaries or len(diaries) == 0:
                        return "\n\n[일기 상세 조회]\n일기를 찾을 수 없습니다. 먼저 일기를 검색해주세요."
                    
                    # 요청한 번호의 일기 가져오기 (1부터 시작)
                    if diary_number > len(diaries):
                        return f"\n\n[일기 상세 조회]\n{diary_number}번 일기를 찾을 수 없습니다. 검색 결과는 {len(diaries)}개입니다."
                    
                    target_diary = diaries[diary_number - 1]  # 0-based index
                    
                    # 일기 전체 내용 포맷팅
                    diary_date = target_diary.get("diaryDate", "")
                    title = target_diary.get("title", "제목 없음")
                    content = target_diary.get("content", "")
                    emotion = target_diary.get("emotion", "")
                    
                    detail_text = f"📖 [{diary_date}] {title}\n\n"
                    if emotion:
                        detail_text += f"감정: {emotion}\n\n"
                    detail_text += f"{content}"
                    
                    print(f"[챗봇] 📖 일기 상세 조회 완료: {diary_number}번 일기")
                    return f"\n\n[일기 상세 내용]\n{detail_text}"
                
                # 일기 검색 요청 처리
                if is_diary_search:
                    print(f"[챗봇] 일기 검색 요청 감지: userId={request.userId}, hasJwtToken={jwt_token is not None}, message={request.message}")
                    search_query = extract_search_query(request.message)
                    print(f"[챗봇] 추출된 검색어: '{search_query}'")
                    # JWT 토큰이 있으면 JWT 기반 검색, 없으면 userId 기반 검색
                    diaries = search_diaries(request.userId, search_query, jwt_token)
                    formatted_results = format_diary_search_results(diaries, search_query)
                    
                    if formatted_results and "검색 결과가 없습니다" not in formatted_results and "일기가 없습니다" not in formatted_results:
                        return f"\n\n[일기 검색 결과]\n{formatted_results}\n\n위 일기 정보를 참고하여 사용자의 질문에 정확하게 답변해주세요. 특정 일기를 자세히 보고 싶으시면 '1번 일기 자세히' 또는 '첫 번째 일기 전체'라고 말씀해주세요."
                    else:
                        return f"\n\n[일기 검색 결과]\n{formatted_results}"
            except Exception as e:
                print(f"[챗봇] 일기 요청 오류: {e}")
                import traceback
                traceback.print_exc()
                return f"\n\n[일기 요청 오류]\n일기 요청 처리 중 오류가 발생했습니다: {str(e)}"
            return ""
        
        def fetch_classification():
            """텍스트 분류 (별도 스레드)"""
            if not needs_classification:
                return None
            try:
                print(f"[챗봇] 텍스트 분류 시도: {request.message}")
                return classify_and_parse(request.message)
            except Exception as e:
                print(f"[챗봇] 분류 오류: {e}")
            return None
        
        # 병렬 실행 (최대 3초 대기 - 속도 개선)
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {}
            if is_weather:
                futures['weather'] = executor.submit(fetch_weather)
            if is_diary_search or is_diary_detail:
                futures['diary_search'] = executor.submit(fetch_diary_search)
            if needs_classification:
                futures['classification'] = executor.submit(fetch_classification)
            
            # 결과 수집 (최대 3초 대기 - 속도 개선)
            for key, future in futures.items():
                try:
                    result = future.result(timeout=3.0)
                    # 결과 타입에 따라 분류
                    if isinstance(result, str):
                        if key == 'weather':
                            weather_context = result
                        elif key == 'diary_search':
                            diary_search_context = result
                    elif isinstance(result, dict):
                        classification = result
                except Exception as e:
                    print(f"[챗봇] 병렬 처리 오류 ({key}): {e}")
        
        parallel_time = time.time() - start_time
        print(f"[챗봇] 병렬 처리 완료 (소요 시간: {parallel_time:.2f}초)")
        
        # ========== 일기 조회는 GPT 응답 생성 없이 바로 반환 (속도 개선) ==========
        # 일기 상세 조회 및 검색 결과는 DB에서 데이터를 가져와서 포맷팅만 하면 되므로 GPT 호출 불필요
        if (is_diary_detail or is_diary_search) and diary_search_context:
            print(f"[챗봇] ⚡ 일기 조회 - GPT 응답 생성 생략 (즉시 반환)")
            # 일기 내용을 그대로 반환 (GPT 응답 생성 없이)
            # [일기 상세 내용] 또는 [일기 검색 결과] 헤더 제거
            message_content = diary_search_context
            if "[일기 상세 내용]\n" in message_content:
                message_content = message_content.replace("[일기 상세 내용]\n", "").strip()
            elif "[일기 검색 결과]\n" in message_content:
                message_content = message_content.replace("[일기 검색 결과]\n", "").strip()
            
            chat_response = ChatResponse(
                message=message_content,
                model="direct-return",  # GPT를 사용하지 않았음을 표시
                status="success"
            )
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content=chat_response.model_dump(),
                media_type="application/json; charset=utf-8"
            )
        
        # 분류 결과 처리
        if classification and classification.get("confidence", 0) >= 0.5:
            category = classification.get("category", "")
            confidence = classification.get("confidence", 0)
            data = classification.get("data", {})
            
            print(f"[챗봇] {category}로 분류됨 (신뢰도: {confidence:.2f})")
            
            # 카테고리별 컨텍스트 생성
            if category == "일기":
                mood = data.get("mood", "")
                events = data.get("events", [])
                keywords = data.get("keywords", [])
                summary = f"이 메시지는 일기로 분류되었습니다."
                if mood:
                    summary += f"\n- 감정: {mood}"
                if events:
                    summary += f"\n- 주요 사건: {', '.join(events[:3])}"
                if keywords:
                    summary += f"\n- 키워드: {', '.join(keywords[:5])}"
                classification_context = f"\n\n[일기 정보]\n{summary}\n\n사용자의 일기를 이해하고 공감하며 답변해주세요."
            
            elif category == "건강":
                health_type = data.get("type", "")
                exercise_type = data.get("exercise_type", "")
                duration = data.get("duration")
                summary = f"이 메시지는 건강 정보로 분류되었습니다."
                if health_type:
                    summary += f"\n- 유형: {health_type}"
                if exercise_type:
                    summary += f"\n- 운동 종류: {exercise_type}"
                if duration:
                    summary += f"\n- 시간: {duration}분"
                classification_context = f"\n\n[건강 정보]\n{summary}\n\n사용자의 건강 활동을 이해하고 응원하며 답변해주세요."
            
            elif category == "가계":
                finance_type = data.get("type", "")
                amount = data.get("amount")
                location = data.get("location", "")
                summary = f"이 메시지는 가계 정보로 분류되었습니다."
                if finance_type:
                    summary += f"\n- 유형: {finance_type}"
                if amount:
                    summary += f"\n- 금액: {amount:,}원"
                if location:
                    summary += f"\n- 장소: {location}"
                classification_context = f"\n\n[가계 정보]\n{summary}\n\n사용자의 가계 정보를 이해하고 도움이 되는 답변을 해주세요."
            
            elif category == "문화":
                culture_type = data.get("type", "")
                title = data.get("title", "")
                rating = data.get("rating")
                summary = f"이 메시지는 문화 활동으로 분류되었습니다."
                if culture_type:
                    summary += f"\n- 유형: {culture_type}"
                if title:
                    summary += f"\n- 작품: {title}"
                if rating:
                    summary += f"\n- 평점: {rating}/5"
                classification_context = f"\n\n[문화 정보]\n{summary}\n\n사용자의 문화 활동을 이해하고 공감하며 답변해주세요."
            
            elif category == "패스파인더":
                pathfinder_type = data.get("type", "")
                goal = data.get("goal", "")
                deadline = data.get("deadline", "")
                summary = f"이 메시지는 패스파인더(목표/계획)로 분류되었습니다."
                if pathfinder_type:
                    summary += f"\n- 유형: {pathfinder_type}"
                if goal:
                    summary += f"\n- 목표: {goal}"
                if deadline:
                    summary += f"\n- 마감일: {deadline}"
                classification_context = f"\n\n[패스파인더 정보]\n{summary}\n\n사용자의 목표와 계획을 이해하고 도움이 되는 조언을 해주세요."
            
            # 분류된 데이터 저장 시도
            try:
                save_classified_data(classification, request.userId)
            except Exception as e:
                print(f"[챗봇] 데이터 저장 실패 (계속 진행): {e}")
        else:
            if classification:
                print(f"[챗봇] 분류되지 않음 (신뢰도 낮음)")
            classification = None
        
        # 메시지 배열 구성
        # ✅ 날씨 질문일 때는 일기 컨텍스트를 제거하고 날씨 정보만 사용
        if is_weather:
            # 날씨 질문일 때는 기본 시스템 메시지만 사용 (일기 컨텍스트 완전 제거)
            system_content = (
                "너는 20살 명랑한 여자 대학생처럼 대화해야 해. "
                "밝고 귀엽고 친근한 말투를 쓰고, 문장 끝에는 종종 "
                "이모티콘이나 느낌표를 붙여서 활기차게 말해."
            )
            if weather_context:
                system_content += "\n\n⚠️ 중요: 사용자가 날씨 질문을 했습니다. 제공된 날씨 정보(기상청 API 데이터)를 반드시 사용해서 답변해야 합니다. 일기 내용이나 다른 정보는 사용하지 마세요. 날씨 정보만 사용해서 정확하게 답변해주세요!"
            else:
                system_content += "\n\n⚠️ 중요: 사용자가 날씨 질문을 했습니다. 날씨 정보를 조회하려고 시도했지만 정보를 가져올 수 없었습니다. 일기 내용이나 다른 추측은 사용하지 마세요. 날씨 정보가 없다고 정직하게 말해주세요."
        else:
            # 일반 질문일 때는 기존 시스템 메시지 사용
            system_content = request.system_message
            if weather_context:
                system_content += "\n\n날씨 정보도 제공할 수 있어! 날씨 관련 질문이 있으면 제공된 날씨 정보를 사용해서 답변해줘~"
            
            if diary_search_context:
                system_content += "\n\n사용자의 일기를 검색하고 조회할 수 있어! 일기 검색 요청이 있으면 제공된 일기 정보를 사용해서 정확하게 답변해줘!"
            
            if classification_context:
                category = classification.get("category", "") if classification else ""
                if category == "일기":
                    system_content += "\n\n사용자의 일기를 기록하고 공감할 수 있어! 일기 내용에 대해 따뜻하게 응답해줘~"
                elif category == "건강":
                    system_content += "\n\n사용자의 건강 활동을 응원하고 도움을 줄 수 있어! 건강 관련 정보에 대해 유익한 답변을 해줘!"
                elif category == "가계":
                    system_content += "\n\n사용자의 가계 관리를 도울 수 있어! 가계 정보에 대해 도움이 되는 답변을 해줘~"
                elif category == "문화":
                    system_content += "\n\n사용자의 문화 활동을 공유하고 토론할 수 있어! 문화 콘텐츠에 대해 공감하며 답변해줘!"
                elif category == "패스파인더":
                    system_content += "\n\n사용자의 목표와 계획을 도울 수 있어! 목표 달성을 위한 조언과 응원을 해줘~"
        
        messages = [
            {"role": "system", "content": system_content}
        ]
        
        # 대화 히스토리가 있으면 추가
        # ✅ 날씨 질문일 때는 일기 관련 히스토리는 제외 (날씨 정보만 사용)
        if request.conversation_history:
            for msg in request.conversation_history:
                # 날씨 질문일 때는 일기 관련 내용이 포함된 히스토리는 제외
                if is_weather and weather_context:
                    # 일기 관련 키워드가 포함된 히스토리는 제외
                    if msg.role == "assistant" and any(keyword in msg.content.lower() for keyword in ['일기', 'diary', '기록']):
                        continue
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        # 현재 사용자 메시지 추가 (날씨/일기 검색/분류 정보 컨텍스트 포함)
        user_message = request.message
        # ✅ 날씨 질문일 때는 날씨 정보를 우선적으로 강조
        if weather_context:
            # 날씨 질문일 때는 날씨 정보를 명확하게 강조
            user_message = f"{request.message}\n\n{weather_context}\n\n⚠️ 중요: 위 날씨 정보는 기상청 API에서 가져온 실제 데이터입니다. 이 정보를 반드시 사용해서 답변해주세요. 일기 내용이나 다른 추측은 사용하지 마세요!"
        elif diary_search_context:
            user_message += diary_search_context
        elif classification_context:
            user_message += classification_context
        else:
            # 날씨/일기 검색/분류가 아닌 경우에만 모두 추가
            if diary_search_context:
                user_message += diary_search_context
            if classification_context:
                user_message += classification_context
        
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # 요청 모델 사용 (사용자가 지정한 모델 그대로 사용)
        chat_model = request.model if request.model else DEFAULT_CHAT_MODEL
        
        # GPT 응답 생성 (최적화: max_tokens 제한, temperature 낮춤, 빠른 모델 사용)
        gpt_start_time = time.time()
        response = client.chat.completions.create(
            model=chat_model,
            messages=messages,
            max_tokens=800,  # 응답 길이 제한으로 속도 향상 (1000 → 800)
            temperature=0.7,  # 일관성과 창의성의 균형
        )
        gpt_time = time.time() - gpt_start_time
        print(f"[챗봇] GPT 응답 생성 완료 (소요 시간: {gpt_time:.2f}초)")
        
        # 응답 생성
        chat_response = ChatResponse(
            message=response.choices[0].message.content or "",
            model=response.model,
            status="success"
        )
        
        # 분류 정보가 있으면 포함
        if classification:
            chat_response.classification = classification
        
        # UTF-8 인코딩 명시
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=chat_response.model_dump(),
            media_type="application/json; charset=utf-8"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

# 일기 분류 요청 모델
class ClassifyRequest(BaseModel):
    """분류 요청 모델"""
    text: str
    userId: Optional[int] = None  # 사용자 ID (일기 저장 시 필요)

# 텍스트 분류 전용 엔드포인트 (모든 카테고리)
@chatbot_router.post("/classify")
def classify_text(request: ClassifyRequest):
    """
    텍스트를 카테고리(일기, 건강, 가계, 문화, 패스파인더)로 분류하고 구조화
    
    - **text**: 분류할 텍스트
    
    - **반환**: 분류 결과
    """
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    try:
        classification = classify_and_parse(request.text)
        
        if classification:
            # 분류된 데이터 저장 시도
            try:
                save_classified_data(classification, request.userId)
            except Exception as e:
                print(f"[챗봇] 분류 후 저장 실패 (응답은 반환): {e}")
            
            return {
                "success": True,
                "classification": classification
            }
        else:
            return {
                "success": False,
                "message": "분류되지 않았습니다.",
                "classification": None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

# 서브 라우터를 앱에 포함
app.include_router(chatbot_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9002)
