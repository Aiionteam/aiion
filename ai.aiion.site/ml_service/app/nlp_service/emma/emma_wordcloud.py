"""
NLTK 자연어 처리 서비스 및 Emma 워드클라우드 생성 모듈
NLTK(Natural Language Toolkit) 패키지를 사용한 자연어 처리 및 문서 분석 서비스
Gutenberg 말뭉치의 Emma 텍스트를 사용한 워드클라우드 생성
"""

import nltk
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any, Callable
from nltk.tokenize import sent_tokenize, word_tokenize, RegexpTokenizer
from nltk.stem import PorterStemmer, LancasterStemmer, WordNetLemmatizer
from nltk.tag import pos_tag, untag
from nltk import Text, FreqDist
from nltk.corpus import gutenberg
from wordcloud import WordCloud
import io
import base64
import sys
from io import StringIO
from functools import wraps

try:
    from common.utils import setup_logging
    logger = setup_logging("nlp_service")
except ImportError:
    import logging
    logger = logging.getLogger("nlp_service")


def safe_execute(default_return=None):
    """에러 처리를 위한 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"{func.__name__} 실패: {e}")
                return default_return if default_return is not None else ([] if isinstance(default_return, list) else None)
        return wrapper
    return decorator


class EmmaWordcloud:
    """NLTK 자연어 처리 서비스 클래스"""
    
    # 명사 품사 태그
    NOUN_TAGS = {"NN", "NNS", "NNP", "NNPS"}
    
    def __init__(self):
        """NLTK 서비스 초기화"""
        self._download_nltk_data()
        self.stemmer_porter = PorterStemmer()
        self.stemmer_lancaster = LancasterStemmer()
        self.lemmatizer = WordNetLemmatizer()
        self.regex_tokenizer = RegexpTokenizer("[\w]+")
        self.text_objects: Dict[str, Text] = {}
        self.corpus_data: Dict[str, str] = {}
        
    def _download_nltk_data(self):
        """NLTK 데이터 다운로드"""
        try:
            for data in ['book', 'punkt', 'wordnet', 'averaged_perceptron_tagger']:
                nltk.download(data, quiet=True)
            logger.info("NLTK 데이터 다운로드 완료")
        except Exception as e:
            logger.warning(f"NLTK 데이터 다운로드 중 오류: {e}")
    
    def _capture_stdout(self, func: Callable, *args, **kwargs) -> str:
        """stdout 캡처 헬퍼"""
        old_stdout = sys.stdout
        sys.stdout = captured = StringIO()
        try:
            func(*args, **kwargs)
            return captured.getvalue()
        finally:
            sys.stdout = old_stdout
    
    def _create_image_base64(self, figsize: Tuple[int, int] = (12, 6)) -> Optional[str]:
        """matplotlib 이미지를 Base64로 변환"""
        try:
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            return img_base64
        except Exception as e:
            logger.error(f"이미지 생성 실패: {e}")
            plt.close()
            return None
    
    # ========== 말뭉치 관련 ==========
    
    @safe_execute(default_return=[])
    def get_gutenberg_fileids(self) -> List[str]:
        """Gutenberg 말뭉치 파일 ID 목록 반환"""
        return gutenberg.fileids()
    
    @safe_execute()
    def load_corpus(self, corpus_name: str, file_id: Optional[str] = None) -> Optional[str]:
        """말뭉치 데이터 로드"""
        if corpus_name == 'gutenberg' and file_id:
            raw_text = gutenberg.raw(file_id)
            self.corpus_data[file_id] = raw_text
            logger.info(f"말뭉치 로드 완료: {file_id}")
            return raw_text
        logger.warning(f"지원하지 않는 말뭉치: {corpus_name}")
        return None
    
    def get_corpus_text(self, file_id: str, start: int = 0, end: Optional[int] = None) -> str:
        """저장된 말뭉치 텍스트 조회"""
        if file_id in self.corpus_data:
            text = self.corpus_data[file_id]
            return text[start:end] if end else text[start:]
        logger.warning(f"말뭉치가 로드되지 않았습니다: {file_id}")
        return ""
    
    # ========== 토큰화 ==========
    
    @safe_execute(default_return=[])
    def tokenize_sentences(self, text: str) -> List[str]:
        """문장 단위 토큰화"""
        return sent_tokenize(text)
    
    @safe_execute(default_return=[])
    def tokenize_words(self, text: str) -> List[str]:
        """단어 단위 토큰화"""
        return word_tokenize(text)
    
    @safe_execute(default_return=[])
    def tokenize_regex(self, text: str, pattern: str = "[\w]+") -> List[str]:
        """정규식 기반 토큰화"""
        return RegexpTokenizer(pattern).tokenize(text)
    
    # ========== 형태소 분석 ==========
    
    @safe_execute(default_return=[])
    def stem_porter(self, words: List[str]) -> List[str]:
        """Porter Stemmer 어간 추출"""
        return [self.stemmer_porter.stem(w) for w in words]
    
    @safe_execute(default_return=[])
    def stem_lancaster(self, words: List[str]) -> List[str]:
        """Lancaster Stemmer 어간 추출"""
        return [self.stemmer_lancaster.stem(w) for w in words]
    
    @safe_execute(default_return=[])
    def lemmatize(self, words: List[str], pos: Optional[str] = None) -> List[str]:
        """원형 복원"""
        if pos:
            return [self.lemmatizer.lemmatize(w, pos=pos) for w in words]
        return [self.lemmatizer.lemmatize(w) for w in words]
    
    # ========== 품사 태깅 ==========
    
    @safe_execute(default_return=[])
    def pos_tag_text(self, text: str) -> List[Tuple[str, str]]:
        """품사 태깅"""
        return pos_tag(word_tokenize(text))
    
    @safe_execute(default_return=[])
    def pos_tag_tokens(self, tokens: List[str]) -> List[Tuple[str, str]]:
        """토큰 리스트에 품사 태깅"""
        return pos_tag(tokens)
    
    @safe_execute(default_return=[])
    def extract_nouns(self, text: str) -> List[str]:
        """명사만 추출"""
        tagged = self.pos_tag_text(text)
        return [word for word, pos in tagged if pos in self.NOUN_TAGS]
    
    @safe_execute(default_return=[])
    def create_pos_tokenizer(self, text: str) -> List[str]:
        """품사 정보를 포함한 토큰 생성"""
        tagged = self.pos_tag_text(text)
        return ["/".join([word, pos]) for word, pos in tagged]
    
    @safe_execute(default_return=[])
    def untag_tokens(self, tagged_tokens: List[Tuple[str, str]]) -> List[str]:
        """품사 태그 제거"""
        return untag(tagged_tokens)
    
    def get_pos_help(self, tag: str) -> str:
        """품사 태그 설명 조회"""
        try:
            nltk.help.upenn_tagset(tag)
            return f"품사 태그 '{tag}'의 설명을 출력했습니다."
        except Exception as e:
            logger.error(f"품사 태그 설명 조회 실패: {e}")
            return ""
    
    # ========== Text 객체 관련 ==========
    
    @safe_execute()
    def create_text_object(self, text: str, name: str = "Text") -> Optional[Text]:
        """NLTK Text 객체 생성"""
        tokens = self.regex_tokenizer.tokenize(text)
        text_obj = Text(tokens, name=name)
        self.text_objects[name] = text_obj
        logger.info(f"Text 객체 생성 완료: {name}")
        return text_obj
    
    def get_text_object(self, name: str) -> Optional[Text]:
        """저장된 Text 객체 조회"""
        return self.text_objects.get(name)
    
    def plot_word_frequency(self, text_name: str, num_words: int = 20) -> Optional[str]:
        """단어 빈도 그래프 생성 (Base64)"""
        text_obj = self.get_text_object(text_name)
        if not text_obj:
            logger.warning(f"Text 객체를 찾을 수 없습니다: {text_name}")
            return None
        
        plt.figure(figsize=(12, 6))
        text_obj.plot(num_words)
        return self._create_image_base64()
    
    def dispersion_plot(self, text_name: str, words: List[str]) -> Optional[str]:
        """단어 분산 플롯 생성 (Base64)"""
        text_obj = self.get_text_object(text_name)
        if not text_obj:
            logger.warning(f"Text 객체를 찾을 수 없습니다: {text_name}")
            return None
        
        plt.figure(figsize=(12, 6))
        text_obj.dispersion_plot(words)
        return self._create_image_base64()
    
    @safe_execute(default_return=[])
    def concordance(self, text_name: str, word: str, lines: int = 5) -> List[str]:
        """단어가 사용된 문맥 조회"""
        text_obj = self.get_text_object(text_name)
        if not text_obj:
            return []
        
        result = self._capture_stdout(text_obj.concordance, word, lines=lines)
        return [line.strip() for line in result.split('\n') if line.strip()]
    
    @safe_execute(default_return=[])
    def find_similar_words(self, text_name: str, word: str, num: int = 10) -> List[str]:
        """유사한 문맥에서 사용된 단어 찾기"""
        text_obj = self.get_text_object(text_name)
        if not text_obj:
            return []
        
        result = self._capture_stdout(text_obj.similar, word, num=num)
        words = [w.strip() for w in result.split() if w.strip()]
        return words[:num]
    
    @safe_execute(default_return=[])
    def find_collocations(self, text_name: str, num: int = 10) -> List[Tuple[str, str]]:
        """연어(collocation) 찾기"""
        text_obj = self.get_text_object(text_name)
        if not text_obj:
            return []
        
        result = self._capture_stdout(text_obj.collocations, num=num)
        collocations = []
        for line in result.split('\n'):
            if line.strip():
                parts = line.strip().split()
                if len(parts) >= 2:
                    collocations.append((parts[0], parts[1]))
        return collocations[:num]
    
    # ========== 빈도 분포 ==========
    
    @safe_execute(default_return=FreqDist([]))
    def create_freq_dist(self, tokens: List[str]) -> FreqDist:
        """빈도 분포 객체 생성"""
        return FreqDist(tokens)
    
    @safe_execute(default_return={})
    def get_freq_stats(self, freq_dist: FreqDist, word: Optional[str] = None) -> Dict[str, Any]:
        """빈도 분포 통계 조회"""
        if word:
            return {
                "word": word,
                "count": freq_dist[word],
                "frequency": freq_dist.freq(word),
                "total_tokens": freq_dist.N()
            }
        return {
            "total_tokens": freq_dist.N(),
            "unique_tokens": len(freq_dist),
            "most_common": freq_dist.most_common(10)
        }
    
    @safe_execute(default_return=FreqDist([]))
    def extract_names_from_text(self, text: str, stopwords: Optional[List[str]] = None) -> FreqDist:
        """고유명사(이름) 추출 및 빈도 분포 생성"""
        if stopwords is None:
            stopwords = ["Mr.", "Mrs.", "Miss", "Mr", "Mrs", "Dear"]
        
        tokens = self.regex_tokenizer.tokenize(text)
        tagged = pos_tag(tokens)
        names = [word for word, pos in tagged if pos == "NNP" and word not in stopwords]
        return FreqDist(names)
    
    # ========== 워드클라우드 ==========
    
    def generate_wordcloud(
        self,
        freq_dist: FreqDist,
        width: int = 1000,
        height: int = 600,
        background_color: str = "white",
        max_words: int = 200,
        save_path: Optional[Path] = None,
        font_path: Optional[str] = None
    ) -> Optional[str]:
        """워드클라우드 생성 (Base64)"""
        try:
            word_freq = dict(freq_dist.most_common(max_words))
            wc_params = {
                "width": width,
                "height": height,
                "background_color": background_color,
                "random_state": 0
            }
            if font_path:
                wc_params["font_path"] = font_path
            wc = WordCloud(**wc_params)
            wc.generate_from_frequencies(word_freq)
            
            buf = io.BytesIO()
            plt.figure(figsize=(width/100, height/100))
            plt.imshow(wc, interpolation='bilinear')
            plt.axis("off")
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            
            # 파일로 저장
            if save_path:
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, 'wb') as f:
                    f.write(base64.b64decode(img_base64))
                logger.info(f"워드클라우드 저장 완료: {save_path}")
            
            plt.close()
            return img_base64
        except Exception as e:
            logger.error(f"워드클라우드 생성 실패: {e}")
            plt.close()
            return None
    
    def generate_wordcloud_from_text(
        self,
        text: str,
        width: int = 1000,
        height: int = 600,
        background_color: str = "white",
        max_words: int = 200,
        save_path: Optional[Path] = None,
        font_path: Optional[str] = None
    ) -> Optional[str]:
        """텍스트에서 직접 워드클라우드 생성"""
        tokens = self.regex_tokenizer.tokenize(text)
        freq_dist = FreqDist(tokens)
        return self.generate_wordcloud(freq_dist, width, height, background_color, max_words, save_path, font_path)
    
    # ========== 통합 분석 ==========
    
    @safe_execute(default_return={"error": "분석 실패"})
    def analyze_text(self, text: str, name: str = "Text", include_wordcloud: bool = True) -> Dict[str, Any]:
        """텍스트 종합 분석"""
        sentences = self.tokenize_sentences(text)
        words = self.tokenize_words(text)
        tokens = self.regex_tokenizer.tokenize(text)
        tagged = self.pos_tag_tokens(tokens)
        nouns = self.extract_nouns(text)
        freq_dist = self.create_freq_dist(tokens)
        self.create_text_object(text, name)
        
        result = {
            "name": name,
            "statistics": {
                "total_characters": len(text),
                "total_sentences": len(sentences),
                "total_words": len(words),
                "total_tokens": len(tokens),
                "unique_tokens": len(freq_dist),
                "noun_count": len(nouns)
            },
            "most_common_words": freq_dist.most_common(10),
            "top_nouns": FreqDist(nouns).most_common(10) if nouns else []
        }
        
        if include_wordcloud:
            wordcloud_img = self.generate_wordcloud_from_text(text)
            if wordcloud_img:
                result["wordcloud_image"] = wordcloud_img
        
        return result


# 싱글톤 인스턴스
_nlp_service_instance: Optional[EmmaWordcloud] = None


def get_nlp_service() -> EmmaWordcloud:
    """NLP 서비스 싱글톤 인스턴스 반환"""
    global _nlp_service_instance
    if _nlp_service_instance is None:
        _nlp_service_instance = EmmaWordcloud()
    return _nlp_service_instance


# ========== Emma 워드클라우드 생성 함수 ==========

def load_english_stopwords() -> List[str]:
    """영어 불용어 리스트 로드"""
    try:
        # NLTK stopwords 다운로드 시도
        try:
            from nltk.corpus import stopwords
            nltk.download('stopwords', quiet=True)
            english_stopwords = set(stopwords.words('english'))
            logger.info("NLTK stopwords 로드 성공")
        except Exception as nltk_error:
            logger.warning(f"NLTK stopwords 로드 실패: {nltk_error}, 기본 리스트 사용")
            english_stopwords = set()
        
        # 추가 불용어 (인칭대명사, 일반 동사 등)
        additional_stopwords = {
            'said', 'would', 'could', 'should', 'might', 'must', 'may',
            'one', 'two', 'three', 'first', 'second', 'last', 'next',
            'much', 'many', 'more', 'most', 'very', 'quite', 'rather',
            'also', 'well', 'now', 'then', 'here', 'there', 'where',
            'mr', 'mrs', 'miss', 'mr.', 'mrs.', 'miss.'
        }
        
        all_stopwords = english_stopwords | additional_stopwords
        logger.info(f"총 {len(all_stopwords)}개 불용어 로드 완료")
        return list(all_stopwords)
    except Exception as e:
        logger.warning(f"불용어 로드 실패, 기본 리스트 사용: {e}")
        # 기본 영어 불용어 리스트
        basic_stopwords = [
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
            'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
            'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
            'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
            'one', 'all', 'would', 'there', 'their', 'said', 'each',
            'which', 'she', 'do', 'how', 'if', 'up', 'out', 'many',
            'then', 'them', 'these', 'so', 'some', 'her', 'would',
            'make', 'like', 'into', 'him', 'has', 'two', 'more',
            'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been',
            'call', 'who', 'its', 'now', 'find', 'down', 'day', 'did',
            'get', 'come', 'made', 'may', 'part'
        ]
        logger.info(f"기본 불용어 리스트 사용: {len(basic_stopwords)}개")
        return basic_stopwords


def generate_emma_wordcloud(
    width: int = 1000,
    height: int = 600,
    background_color: str = "white",
    max_words: int = 200
) -> Optional[str]:
    """
    Emma 텍스트로부터 워드클라우드 생성 및 저장
    불용어를 제거하여 주요 단어(특히 캐릭터 이름)가 더 크게 표시되도록 함
    
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
        
        # Emma 말뭉치 로드
        emma_text = service.load_corpus("gutenberg", "austen-emma.txt")
        if not emma_text:
            logger.error("Emma 말뭉치를 로드할 수 없습니다")
            return None
        
        logger.info(f"Emma 텍스트 로드 완료: {len(emma_text)} 문자")
        
        # 토큰화
        tokens = service.tokenize_regex(emma_text)
        if not tokens:
            logger.error("토큰화 결과가 비어있습니다")
            return None
        
        logger.info(f"토큰화 완료: {len(tokens)}개 토큰")
        
        # 불용어 제거
        stopwords = load_english_stopwords()
        # 소문자로 변환하여 비교 (대소문자 구분 없이)
        stopwords_lower = [sw.lower() for sw in stopwords]
        
        # 불용어 제거 및 필터링 (최소 2글자 이상)
        filtered_tokens = [
            token for token in tokens 
            if token.lower() not in stopwords_lower and len(token) > 1
        ]
        
        if not filtered_tokens:
            logger.error("필터링 후 토큰이 없습니다")
            return None
        
        logger.info(f"불용어 제거 후: {len(filtered_tokens)}개 토큰")
        
        # 빈도 분포 생성
        try:
            freq_dist = FreqDist(filtered_tokens)
            if len(freq_dist) == 0:
                logger.error("빈도 분포가 비어있습니다")
                return None
        except Exception as freq_error:
            logger.error(f"빈도 분포 생성 실패: {freq_error}")
            return None
        
        # 저장 경로 설정
        save_dir = Path(__file__).parent.parent / "save"
        save_dir.mkdir(parents=True, exist_ok=True)
        save_path = save_dir / "emma_wordcloud.png"
        
        # StyleCloud를 사용한 워드클라우드 생성
        try:
            import stylecloud
            
            # 빈도 딕셔너리를 텍스트로 변환 (단어를 빈도만큼 반복)
            word_freq = dict(freq_dist.most_common(max_words))
            # 빈도에 비례하여 단어를 반복하여 텍스트 생성
            text_list = []
            for word, freq in word_freq.items():
                text_list.extend([word] * freq)
            text_for_stylecloud = ' '.join(text_list)
            
            # StyleCloud 생성 (임시 파일로 저장 후 Base64로 변환)
            temp_path = save_dir / "emma_wordcloud_temp.png"
            # stylecloud는 size를 단일 정수로 받음 (정사각형)
            size = max(width, height)
            stylecloud.gen_stylecloud(
                text=text_for_stylecloud,
                size=size,  # 단일 정수값
                background_color=background_color,
                max_words=max_words,
                output_name=str(temp_path),
                icon_name='fas fa-book',  # 책 아이콘 스타일
                palette='cartocolors.qualitative.Pastel_8',  # 파스텔 색상 팔레트
                gradient='horizontal',  # 수평 그라데이션
            )
            
            # 생성된 이미지를 읽어서 Base64로 변환
            with open(temp_path, 'rb') as f:
                img_bytes = f.read()
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            
            # 최종 저장 경로로 복사
            with open(save_path, 'wb') as f:
                f.write(img_bytes)
            
            # 임시 파일 삭제
            if temp_path.exists():
                temp_path.unlink()
            
            logger.info("Emma StyleCloud 생성 완료")
            # 상위 단어 로그 출력 (디버깅용)
            top_words = freq_dist.most_common(20)
            logger.info(f"상위 20개 단어: {top_words}")
            
            return img_base64
            
        except ImportError:
            logger.warning("stylecloud를 사용할 수 없습니다. 기본 wordcloud로 대체합니다.")
            # Fallback: 기존 wordcloud 사용
            result = service.generate_wordcloud(
                freq_dist,
                width=width,
                height=height,
                background_color=background_color,
                max_words=max_words,
                save_path=save_path
            )
            return result
        except Exception as stylecloud_error:
            logger.error(f"StyleCloud 생성 실패: {stylecloud_error}. 기본 wordcloud로 대체합니다.")
            # Fallback: 기존 wordcloud 사용
            result = service.generate_wordcloud(
                freq_dist,
                width=width,
                height=height,
                background_color=background_color,
                max_words=max_words,
                save_path=save_path
            )
            return result
    except Exception as e:
        logger.error(f"Emma 워드클라우드 생성 중 오류 발생: {e}", exc_info=True)
        return None
