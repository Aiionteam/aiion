import re
import nltk
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any, Callable
# NLTK는 FreqDist만 사용 (punkt_tab 리소스 불필요)
from nltk import FreqDist
from wordcloud import WordCloud
import io
import base64
import sys
from io import StringIO
from functools import wraps
from konlpy.tag import Okt

try:
    from common.utils import setup_logging
    logger = setup_logging("nlp_service")
except ImportError:
    import logging
    logger = logging.getLogger("nlp_service")


class SangsungWordcloud:
    """삼성전자 지속가능경영보고서 한국어 자연어 처리 및 워드클라우드 생성 클래스"""

    def __init__(self):
        """서비스 초기화"""
        self.okt = Okt()
        # 절대 경로 설정
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / 'data'
        self.save_dir = self.base_dir / 'save'
        
        # 디렉토리 생성
        self.save_dir.mkdir(parents=True, exist_ok=True)

    def read_file(self):
        """파일 읽기"""
        try:
            # Okt 초기화 (한 번만 실행)
            self.okt.pos("삼성전자 글로벌센터 전자사업부", stem=True)
            
            # 절대 경로로 파일 읽기
            file_path = self.data_dir / 'kr-Report_2018.txt'
            
            if not file_path.exists():
                raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            if not text or len(text.strip()) == 0:
                raise ValueError("파일이 비어있습니다.")
            
            logger.info(f"파일 읽기 완료: {len(text)} 문자")
            return text
            
        except FileNotFoundError as e:
            logger.error(f"파일 읽기 실패: {e}")
            raise
        except Exception as e:
            logger.error(f"파일 읽기 중 오류 발생: {e}")
            raise

    def text_process(self):
        """전체 텍스트 처리 프로세스 실행"""
        try:
            logger.info("텍스트 처리 시작")
            
            # 빈도 분석
            freq_txt = self.find_freq()
            
            # 워드클라우드 생성
            wordcloud = self.draw_wordcloud()
            
            logger.info("텍스트 처리 완료")
            
            return {
                '전처리결과': '완료',
                'freq_txt': freq_txt,
                'wordcloud_created': wordcloud is not None
            }
            
        except Exception as e:
            logger.error(f"텍스트 처리 실패: {e}")
            raise

    def extract_hangul(self, text: str):
        """한글 추출 (한글과 공백만 남김)"""
        try:
            if not text or not isinstance(text, str):
                raise ValueError("텍스트가 유효하지 않습니다.")
            
            temp = text.replace('\n', ' ')
            tokenizer = re.compile(r'[^ ㄱ-ㅣ가-힣]+')
            result = tokenizer.sub('', temp)
            
            if not result or len(result.strip()) == 0:
                raise ValueError("한글이 추출되지 않았습니다.")
            
            logger.info(f"한글 추출 완료: {len(result)} 문자")
            return result
            
        except Exception as e:
            logger.error(f"한글 추출 실패: {e}")
            raise

    def exchange_token(self, texts):
        """텍스트를 토큰으로 변환 (공백 기준, NLTK 의존성 제거)"""
        # 한글 텍스트는 공백 기준으로 토큰화하는 것이 적절
        # NLTK의 word_tokenize는 영어용이므로 사용하지 않음
        if isinstance(texts, str):
            return texts.split()
        return texts

    def change_token(self, texts):
        """텍스트를 토큰으로 변환 (공백 기준)"""
        return texts.split() if isinstance(texts, str) else texts

    def extract_noun(self):
        """명사만 추출 (예: 삼성전자의 스마트폰은 -> 삼성전자 스마트폰)"""
        try:
            # 파일 읽기 및 한글 추출
            hangul_text = self.extract_hangul(self.read_file())
            
            # 한글 텍스트를 형태소 분석하여 명사만 추출
            # nouns() 메서드를 사용하면 명사만 추출 가능
            noun_tokens = []
            
            # 텍스트를 적절한 크기로 나누어 처리 (너무 긴 텍스트는 메모리 문제 발생 가능)
            chunk_size = 1000  # 한 번에 처리할 문자 수
            for i in range(0, len(hangul_text), chunk_size):
                chunk = hangul_text[i:i+chunk_size]
                if not chunk.strip():
                    continue
                    
                try:
                    # nouns() 메서드로 명사만 직접 추출 (더 정확함)
                    nouns = self.okt.nouns(chunk)
                    
                    # 길이 1보다 큰 명사만 추가
                    for noun in nouns:
                        if len(noun) > 1:  # 길이 1보다 큰 명사만
                            # 숫자로만 이루어진 단어 제외
                            if not noun.isdigit():
                                noun_tokens.append(noun)
                except Exception as e:
                    logger.warning(f"청크 처리 중 오류: {e}")
                    continue
            
            if not noun_tokens:
                raise ValueError("명사가 추출되지 않았습니다.")
            
            # "삼성전자" 빈도 확인 및 로깅
            samsung_count = noun_tokens.count('삼성전자')
            logger.info(f"명사 추출 완료: {len(noun_tokens)}개 토큰, '삼성전자' 등장 횟수: {samsung_count}회")
            
            texts = ' '.join(noun_tokens)
            logger.info(f"명사 추출 샘플: {texts[:200]}")
            return texts
            
        except Exception as e:
            logger.error(f"명사 추출 실패: {e}")
            raise

    def read_stopword(self):
        """불용어 파일 읽기"""
        try:
            # 절대 경로로 파일 읽기
            stopword_path = self.data_dir / 'stopwords.txt'
            
            if not stopword_path.exists():
                logger.warning(f"불용어 파일이 없습니다: {stopword_path}, 빈 리스트 반환")
                return []
            
            with open(stopword_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            # 줄바꿈과 공백 모두로 분리 (파일 형식에 따라)
            # 먼저 줄바꿈으로 분리
            lines = content.split('\n')
            stopwords = []
            
            # 각 줄을 공백으로도 분리
            for line in lines:
                if line.strip():
                    # 공백으로 구분된 단어들 추가
                    words = line.strip().split()
                    stopwords.extend(words)
            
            # 중복 제거 및 빈 문자열 제거
            stopwords = list(set([word.strip() for word in stopwords if word.strip()]))
            
            logger.info(f"불용어 로드 완료: {len(stopwords)}개")
            return stopwords
            
        except Exception as e:
            logger.warning(f"불용어 파일 읽기 실패: {e}, 빈 리스트 반환")
            return []

    def remove_stopword(self):
        """불용어 제거"""
        try:
            # 명사 추출
            noun_texts = self.extract_noun()
            
            # 토큰화
            tokens = self.change_token(noun_texts)
            
            if not tokens:
                raise ValueError("토큰이 없습니다.")
            
            # 불용어 로드
            stopwords = self.read_stopword()
            
            # 불용어 제거
            filtered_texts = [text for text in tokens if text not in stopwords]
            
            if not filtered_texts:
                raise ValueError("불용어 제거 후 토큰이 없습니다.")
            
            logger.info(f"불용어 제거 완료: {len(tokens)}개 -> {len(filtered_texts)}개 토큰")
            return filtered_texts
            
        except Exception as e:
            logger.error(f"불용어 제거 실패: {e}")
            raise

    def find_freq(self):
        """단어 빈도 분석"""
        try:
            texts = self.remove_stopword()
            
            if not texts:
                raise ValueError("빈도 분석할 텍스트가 없습니다.")
            
            # 빈도 분포 계산
            freq_dist = FreqDist(texts)
            freqtxt = pd.Series(dict(freq_dist)).sort_values(ascending=False)
            
            # "삼성전자" 빈도 확인 및 로깅
            if '삼성전자' in freqtxt.index:
                samsung_freq = freqtxt['삼성전자']
                top_freq = freqtxt.iloc[0] if len(freqtxt) > 0 else 0
                logger.info(f"'삼성전자' 빈도: {samsung_freq}, 최고 빈도: {top_freq} ({freqtxt.index[0] if len(freqtxt) > 0 else 'N/A'})")
            else:
                logger.warning("'삼성전자'가 빈도 분석 결과에 없습니다!")
            
            logger.info(f"빈도 분석 완료: {len(freqtxt)}개 단어, 상위 30개: {freqtxt.head(30).to_dict()}")
            return freqtxt
            
        except Exception as e:
            logger.error(f"빈도 분석 실패: {e}")
            raise

    def draw_wordcloud(self):
        """워드클라우드 생성 및 저장"""
        try:
            # 불용어 제거된 텍스트 가져오기
            texts = self.remove_stopword()
            
            if not texts:
                raise ValueError("워드클라우드 생성할 텍스트가 없습니다.")
            
            # 텍스트 결합
            text_for_wordcloud = ' '.join(texts)
            
            # 폰트 경로 확인 (한글 폰트 필수)
            # D2Coding.ttf 또는 NanumGothic.ttf 사용
            font_path = None
            for font_name in ['D2Coding.ttf', 'NanumGothic.ttf', 'NanumBarunGothic.ttf']:
                candidate_path = self.data_dir / font_name
                if candidate_path.exists():
                    font_path = candidate_path
                    logger.info(f"한글 폰트 사용: {font_path}")
                    break
            
            if font_path is None:
                logger.error(f"한글 폰트 파일을 찾을 수 없습니다. {self.data_dir} 디렉토리를 확인하세요.")
                raise FileNotFoundError(f"한글 폰트 파일이 필요합니다. {self.data_dir}에 한글 폰트(.ttf)를 추가하세요.")
            
            # 워드클라우드 생성
            wordcloud = WordCloud(
                font_path=str(font_path) if font_path else None,
                width=800,
                height=400,
                scale=2.0,
                max_words=200,
                max_font_size=300,
                random_state=42,
                background_color='white'
            ).generate(text_for_wordcloud)
            
            # 이미지 저장
            save_path = self.save_dir / 'samsung_wordcloud.png'
            
            plt.figure(figsize=(10, 5))
            plt.imshow(wordcloud, interpolation='bilinear')
            plt.axis('off')
            plt.tight_layout(pad=0)
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            logger.info(f"워드클라우드 생성 및 저장 완료: {save_path}")
            return wordcloud
            
        except Exception as e:
            logger.error(f"워드클라우드 생성 실패: {e}")
            raise
