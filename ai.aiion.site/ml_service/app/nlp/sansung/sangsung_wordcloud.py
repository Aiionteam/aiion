"""
Samsung 워드클라우드 생성 모듈
삼성전자 지속가능경영보고서를 사용한 워드클라우드 생성
"""

from pathlib import Path
from typing import Optional, List
from app.nlp.emma.emma_wordcloud import get_nlp_service

try:
    from common.utils import setup_logging
    logger = setup_logging("samsung_wordcloud")
except ImportError:
    import logging
    logger = logging.getLogger("samsung_wordcloud")


def load_stopwords() -> List[str]:
    """불용어 리스트 로드"""
    stopwords_path = Path(__file__).parent.parent / "data" / "stopwords.txt"
    try:
        with open(stopwords_path, 'r', encoding='utf-8') as f:
            stopwords = [line.strip() for line in f if line.strip()]
        logger.info(f"불용어 로드 완료: {len(stopwords)}개")
        return stopwords
    except Exception as e:
        logger.error(f"불용어 로드 실패: {e}")
        return []


def generate_samsung_wordcloud(
    width: int = 1000,
    height: int = 600,
    background_color: str = "white",
    max_words: int = 200
) -> Optional[str]:
    """
    삼성전자 지속가능경영보고서로부터 워드클라우드 생성 및 저장
    
    Args:
        width: 이미지 너비
        height: 이미지 높이
        background_color: 배경색
        max_words: 최대 단어 수
    
    Returns:
        Base64 인코딩된 이미지 문자열
    """
    try:
        service = get_nlp_service()
        
        # 보고서 텍스트 로드
        report_path = Path(__file__).parent.parent / "data" / "kr-Report_2018.txt"
        if not report_path.exists():
            logger.error(f"보고서 파일을 찾을 수 없습니다: {report_path}")
            return None
        
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                report_text = f.read()
            logger.info(f"보고서 텍스트 로드 완료: {len(report_text)} 문자")
        except Exception as e:
            logger.error(f"보고서 파일 읽기 실패: {e}")
            return None
        
        # 한국어 형태소 분석을 통한 토큰화
        try:
            from konlpy.tag import Okt
            okt = Okt()
            # 명사만 추출 (더 의미있는 단어 추출)
            tokens = okt.nouns(report_text)
            logger.info(f"한국어 형태소 분석 완료 (명사 추출): {len(tokens)}개 토큰")
        except ImportError:
            logger.warning("konlpy를 사용할 수 없습니다. 정규식 토큰화로 대체합니다.")
            tokens = service.tokenize_regex(report_text)
            logger.info(f"정규식 토큰화 완료: {len(tokens)}개 토큰")
        except Exception as e:
            logger.warning(f"형태소 분석 실패: {e}. 정규식 토큰화로 대체합니다.")
            tokens = service.tokenize_regex(report_text)
            logger.info(f"정규식 토큰화 완료: {len(tokens)}개 토큰")
        
        stopwords = load_stopwords()
        
        # 불용어 제거 및 필터링 (최소 2글자 이상)
        filtered_tokens = [
            token for token in tokens 
            if token not in stopwords and len(token) > 1
        ]
        logger.info(f"필터링 완료: {len(filtered_tokens)}개 토큰")
        
        # 빈도 분포 생성
        from nltk import FreqDist
        freq_dist = FreqDist(filtered_tokens)
        
        # 저장 경로 설정
        save_dir = Path(__file__).parent.parent / "save"
        save_dir.mkdir(parents=True, exist_ok=True)
        save_path = save_dir / "samsung_wordcloud.png"
        
        # 한글 폰트 경로 설정
        font_path = Path(__file__).parent.parent / "data" / "D2Coding.ttf"
        font_path_str = None
        if font_path.exists():
            font_path_str = str(font_path)
            logger.info(f"한글 폰트 경로: {font_path_str}")
        else:
            logger.warning(f"폰트 파일을 찾을 수 없습니다: {font_path}")
        
        # 워드클라우드 생성 및 저장 (한글 폰트 사용)
        result = service.generate_wordcloud(
            freq_dist,
            width=width,
            height=height,
            background_color=background_color,
            max_words=max_words,
            save_path=save_path,
            font_path=font_path_str
        )
        
        if result:
            logger.info("Samsung 워드클라우드 생성 완료")
        else:
            logger.error("Samsung 워드클라우드 생성 실패")
        
        return result
    except Exception as e:
        logger.error(f"Samsung 워드클라우드 생성 중 오류 발생: {e}", exc_info=True)
        return None

