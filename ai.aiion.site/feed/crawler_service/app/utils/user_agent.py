"""
User-Agent 유틸리티 모듈
fake-useragent를 사용하여 랜덤 User-Agent 생성
"""
from fake_useragent import UserAgent  # type: ignore

# UserAgent 인스턴스 생성 (캐싱)
_ua = None

def get_user_agent():
    """
    랜덤 User-Agent 문자열 반환
    
    Returns:
        str: User-Agent 문자열
    """
    global _ua
    if _ua is None:
        try:
            _ua = UserAgent()
        except Exception:
            # fake-useragent 실패시 기본값 반환
            return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    try:
        return _ua.random
    except Exception:
        # 랜덤 생성 실패시 기본값 반환
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def get_headers(referer=None):
    """
    requests용 헤더 딕셔너리 반환 (User-Agent 포함)
    
    Args:
        referer: Referer URL (선택사항)
        
    Returns:
        dict: HTTP 헤더 딕셔너리
    """
    headers = {
        'User-Agent': get_user_agent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    if referer:
        headers['Referer'] = referer
    
    return headers

