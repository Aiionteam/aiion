"""
NLP Router - FastAPI 라우터
NLTK 자연어 처리 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import base64

from app.nlp_service.emma.emma_wordcloud import get_nlp_service, generate_emma_wordcloud
from app.nlp_service.sansung.sangsung_wordcloud import SangsungWordcloud

# 라우터 생성
router = APIRouter(
    prefix="/nlp",
    tags=["nlp"],
    responses={404: {"description": "Not found"}}
)


# ========== 요청/응답 모델 ==========

class TextRequest(BaseModel):
    """텍스트 처리 요청 모델"""
    text: str
    name: Optional[str] = "Text"


class TokenizeRequest(BaseModel):
    """토큰화 요청 모델"""
    text: str
    pattern: Optional[str] = "[\w]+"


class StemRequest(BaseModel):
    """어간 추출 요청 모델"""
    words: List[str]


class LemmatizeRequest(BaseModel):
    """원형 복원 요청 모델"""
    words: List[str]
    pos: Optional[str] = None


class WordCloudRequest(BaseModel):
    """워드클라우드 생성 요청 모델"""
    text: Optional[str] = None
    tokens: Optional[List[str]] = None
    width: int = 1000
    height: int = 600
    background_color: str = "white"
    max_words: int = 200


# ========== 루트 엔드포인트 ==========

@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "NLTK Natural Language Processing",
        "description": "NLTK를 사용한 자연어 처리 및 문서 분석 서비스",
        "features": [
            "말뭉치 로드 및 관리",
            "토큰 생성 (문장, 단어, 정규식)",
            "형태소 분석 (어간 추출, 원형 복원)",
            "품사 태깅",
            "텍스트 분석 (빈도 분포, 연어, 유사어)",
            "워드클라우드 생성"
        ]
    }


# ========== 말뭉치 관련 엔드포인트 ==========

@router.get("/corpus/gutenberg")
async def get_gutenberg_fileids():
    """Gutenberg 말뭉치 파일 목록 조회"""
    try:
        service = get_nlp_service()
        fileids = service.get_gutenberg_fileids()
        return {
            "corpus": "gutenberg",
            "fileids": fileids,
            "count": len(fileids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"말뭉치 목록 조회 실패: {str(e)}")


@router.get("/corpus/gutenberg/{file_id}")
async def load_gutenberg_corpus(
    file_id: str,
    start: int = Query(0, ge=0),
    end: Optional[int] = Query(None, ge=0)
):
    """Gutenberg 말뭉치 로드"""
    try:
        service = get_nlp_service()
        text = service.load_corpus("gutenberg", file_id)
        
        if text is None:
            raise HTTPException(status_code=404, detail=f"말뭉치를 찾을 수 없습니다: {file_id}")
        
        # 텍스트 일부 반환
        if end:
            text = text[start:end]
        else:
            text = text[start:]
        
        return {
            "file_id": file_id,
            "text": text,
            "length": len(text),
            "preview": text[:500] if len(text) > 500 else text
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"말뭉치 로드 실패: {str(e)}")


# ========== 토큰화 엔드포인트 ==========

@router.post("/tokenize/sentences")
async def tokenize_sentences(request: TextRequest):
    """문장 단위 토큰화"""
    try:
        service = get_nlp_service()
        sentences = service.tokenize_sentences(request.text)
        return {
            "text": request.text,
            "sentences": sentences,
            "count": len(sentences)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문장 토큰화 실패: {str(e)}")


@router.post("/tokenize/words")
async def tokenize_words(request: TextRequest):
    """단어 단위 토큰화"""
    try:
        service = get_nlp_service()
        words = service.tokenize_words(request.text)
        return {
            "text": request.text,
            "words": words,
            "count": len(words)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"단어 토큰화 실패: {str(e)}")


@router.post("/tokenize/regex")
async def tokenize_regex(request: TokenizeRequest):
    """정규식 기반 토큰화"""
    try:
        service = get_nlp_service()
        tokens = service.tokenize_regex(request.text, request.pattern)
        return {
            "text": request.text,
            "pattern": request.pattern,
            "tokens": tokens,
            "count": len(tokens)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정규식 토큰화 실패: {str(e)}")


# ========== 형태소 분석 엔드포인트 ==========

@router.post("/stem/porter")
async def stem_porter(request: StemRequest):
    """Porter Stemmer를 사용한 어간 추출"""
    try:
        service = get_nlp_service()
        stemmed = service.stem_porter(request.words)
        return {
            "words": request.words,
            "stemmed": stemmed,
            "method": "Porter Stemmer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"어간 추출 실패: {str(e)}")


@router.post("/stem/lancaster")
async def stem_lancaster(request: StemRequest):
    """Lancaster Stemmer를 사용한 어간 추출"""
    try:
        service = get_nlp_service()
        stemmed = service.stem_lancaster(request.words)
        return {
            "words": request.words,
            "stemmed": stemmed,
            "method": "Lancaster Stemmer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"어간 추출 실패: {str(e)}")


@router.post("/lemmatize")
async def lemmatize(request: LemmatizeRequest):
    """원형 복원 (Lemmatization)"""
    try:
        service = get_nlp_service()
        lemmatized = service.lemmatize(request.words, request.pos)
        return {
            "words": request.words,
            "lemmatized": lemmatized,
            "pos": request.pos
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"원형 복원 실패: {str(e)}")


# ========== 품사 태깅 엔드포인트 ==========

@router.post("/pos-tag")
async def pos_tag_text(request: TextRequest):
    """품사 태깅"""
    try:
        service = get_nlp_service()
        tagged = service.pos_tag_text(request.text)
        return {
            "text": request.text,
            "tagged": [{"word": word, "pos": pos} for word, pos in tagged],
            "count": len(tagged)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"품사 태깅 실패: {str(e)}")


@router.post("/pos-tag/extract-nouns")
async def extract_nouns(request: TextRequest):
    """명사만 추출"""
    try:
        service = get_nlp_service()
        nouns = service.extract_nouns(request.text)
        return {
            "text": request.text,
            "nouns": nouns,
            "count": len(nouns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"명사 추출 실패: {str(e)}")


@router.post("/pos-tag/pos-tokens")
async def create_pos_tokens(request: TextRequest):
    """품사 정보를 포함한 토큰 생성"""
    try:
        service = get_nlp_service()
        pos_tokens = service.create_pos_tokenizer(request.text)
        return {
            "text": request.text,
            "pos_tokens": pos_tokens,
            "count": len(pos_tokens)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"POS 토큰 생성 실패: {str(e)}")


@router.get("/pos-tag/help/{tag}")
async def get_pos_help(tag: str):
    """품사 태그 설명 조회"""
    try:
        service = get_nlp_service()
        help_text = service.get_pos_help(tag)
        return {
            "tag": tag,
            "help": help_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"품사 태그 설명 조회 실패: {str(e)}")


# ========== Text 객체 관련 엔드포인트 ==========

@router.post("/text/create")
async def create_text_object(request: TextRequest):
    """Text 객체 생성"""
    try:
        service = get_nlp_service()
        text_obj = service.create_text_object(request.text, request.name)
        
        if text_obj is None:
            raise HTTPException(status_code=500, detail="Text 객체 생성 실패")
        
        return {
            "name": request.name,
            "text_length": len(request.text),
            "message": f"Text 객체 '{request.name}' 생성 완료"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text 객체 생성 실패: {str(e)}")


@router.get("/text/{name}/concordance")
async def get_concordance(
    name: str,
    word: str = Query(..., description="검색할 단어"),
    lines: int = Query(5, ge=1, le=50, description="반환할 라인 수")
):
    """단어가 사용된 문맥 조회"""
    try:
        service = get_nlp_service()
        concordance = service.concordance(name, word, lines)
        return {
            "text_name": name,
            "word": word,
            "concordance": concordance,
            "count": len(concordance)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Concordance 조회 실패: {str(e)}")


@router.get("/text/{name}/similar")
async def get_similar_words(
    name: str,
    word: str = Query(..., description="검색할 단어"),
    num: int = Query(10, ge=1, le=50, description="반환할 단어 수")
):
    """유사한 문맥에서 사용된 단어 찾기"""
    try:
        service = get_nlp_service()
        similar = service.find_similar_words(name, word, num)
        return {
            "text_name": name,
            "word": word,
            "similar_words": similar,
            "count": len(similar)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"유사 단어 검색 실패: {str(e)}")


@router.get("/text/{name}/collocations")
async def get_collocations(
    name: str,
    num: int = Query(10, ge=1, le=50, description="반환할 연어 수")
):
    """연어(collocation) 찾기"""
    try:
        service = get_nlp_service()
        collocations = service.find_collocations(name, num)
        return {
            "text_name": name,
            "collocations": [{"word1": w1, "word2": w2} for w1, w2 in collocations],
            "count": len(collocations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"연어 검색 실패: {str(e)}")


@router.get("/text/{name}/plot")
async def plot_word_frequency(
    name: str,
    num_words: int = Query(20, ge=1, le=100, description="표시할 단어 수")
):
    """단어 빈도 그래프 생성 (PNG 이미지 반환)"""
    try:
        service = get_nlp_service()
        img_base64 = service.plot_word_frequency(name, num_words)
        
        if img_base64 is None:
            raise HTTPException(status_code=404, detail=f"Text 객체를 찾을 수 없습니다: {name}")
        
        # Base64 디코딩하여 PNG 이미지 반환
        img_bytes = base64.b64decode(img_base64)
        return Response(content=img_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"그래프 생성 실패: {str(e)}")


@router.post("/text/{name}/dispersion-plot")
async def dispersion_plot(
    name: str,
    words: List[str] = Query(..., description="검색할 단어 리스트")
):
    """단어 분산 플롯 생성 (PNG 이미지 반환)"""
    try:
        service = get_nlp_service()
        img_base64 = service.dispersion_plot(name, words)
        
        if img_base64 is None:
            raise HTTPException(status_code=404, detail=f"Text 객체를 찾을 수 없습니다: {name}")
        
        # Base64 디코딩하여 PNG 이미지 반환
        img_bytes = base64.b64decode(img_base64)
        return Response(content=img_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분산 플롯 생성 실패: {str(e)}")


# ========== 빈도 분포 엔드포인트 ==========

@router.post("/freq-dist")
async def create_freq_dist(tokens: List[str]):
    """빈도 분포 생성"""
    try:
        service = get_nlp_service()
        freq_dist = service.create_freq_dist(tokens)
        stats = service.get_freq_stats(freq_dist)
        return {
            "tokens": tokens[:10],  # 처음 10개만 반환
            "total_tokens": len(tokens),
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"빈도 분포 생성 실패: {str(e)}")


@router.post("/freq-dist/extract-names")
async def extract_names(request: TextRequest):
    """텍스트에서 고유명사(이름) 추출 및 빈도 분포 생성"""
    try:
        service = get_nlp_service()
        freq_dist = service.extract_names_from_text(request.text)
        stats = service.get_freq_stats(freq_dist)
        return {
            "text": request.text,
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이름 추출 실패: {str(e)}")


# ========== 워드클라우드 엔드포인트 ==========

@router.post("/wordcloud")
async def generate_wordcloud(request: WordCloudRequest):
    """워드클라우드 생성 (PNG 이미지 반환)"""
    try:
        service = get_nlp_service()
        
        if request.text:
            # 텍스트에서 직접 생성
            img_base64 = service.generate_wordcloud_from_text(
                request.text,
                request.width,
                request.height,
                request.background_color,
                request.max_words
            )
        elif request.tokens:
            # 토큰 리스트에서 생성
            freq_dist = service.create_freq_dist(request.tokens)
            img_base64 = service.generate_wordcloud(
                freq_dist,
                request.width,
                request.height,
                request.background_color,
                request.max_words
            )
        else:
            raise HTTPException(status_code=400, detail="text 또는 tokens 중 하나는 필수입니다.")
        
        if img_base64 is None:
            raise HTTPException(status_code=500, detail="워드클라우드 생성 실패")
        
        # Base64 디코딩하여 PNG 이미지 반환
        img_bytes = base64.b64decode(img_base64)
        return Response(content=img_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"워드클라우드 생성 실패: {str(e)}")


# ========== 통합 분석 엔드포인트 ==========

@router.post("/analyze")
async def analyze_text(
    request: TextRequest,
    include_wordcloud: bool = Query(False, description="워드클라우드 포함 여부")
):
    """텍스트 종합 분석"""
    try:
        service = get_nlp_service()
        result = service.analyze_text(request.text, request.name, include_wordcloud)
        
        # Base64 이미지는 JSON 응답에서 제외 (별도 엔드포인트 사용 권장)
        if "wordcloud_image" in result:
            result["wordcloud_available"] = True
            # 실제 이미지 데이터는 제거하고 플래그만 반환
            del result["wordcloud_image"]
            result["message"] = "워드클라우드는 /wordcloud 엔드포인트를 사용하세요."
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"텍스트 분석 실패: {str(e)}")


# ========== Emma 워드클라우드 엔드포인트 ==========

@router.get("/emma")
async def get_emma(
    width: int = Query(1000, ge=100, le=2000, description="이미지 너비"),
    height: int = Query(600, ge=100, le=2000, description="이미지 높이"),
    background_color: str = Query("white", description="배경색"),
    max_words: int = Query(200, ge=10, le=500, description="최대 단어 수")
):
    """Emma 텍스트 워드클라우드 생성 (PNG 이미지 반환)"""
    import traceback
    try:
        img_base64 = generate_emma_wordcloud(
            width=width,
            height=height,
            background_color=background_color,
            max_words=max_words
        )
        
        if img_base64 is None:
            raise HTTPException(
                status_code=500, 
                detail="Emma 워드클라우드 생성 실패: 함수가 None을 반환했습니다. 로그를 확인하세요."
            )
        
        # Base64 디코딩하여 PNG 이미지 반환
        try:
            img_bytes = base64.b64decode(img_base64)
            return Response(content=img_bytes, media_type="image/png")
        except Exception as decode_error:
            raise HTTPException(
                status_code=500,
                detail=f"Base64 디코딩 실패: {str(decode_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Emma 워드클라우드 생성 실패: {str(e)}\n\n{error_trace}"
        )


# ========== Samsung 워드클라우드 엔드포인트 ==========

@router.get("/samsung")
async def get_samsung_wordcloud(
    width: int = Query(1000, ge=100, le=2000, description="이미지 너비"),
    height: int = Query(600, ge=100, le=2000, description="이미지 높이"),
    background_color: str = Query("white", description="배경색"),
    max_words: int = Query(200, ge=10, le=500, description="최대 단어 수")
):
    """삼성전자 지속가능경영보고서 워드클라우드 생성 (PNG 이미지 반환)"""
    import traceback
    try:
        img_base64 = generate_samsung_wordcloud(
            width=width,
            height=height,
            background_color=background_color,
            max_words=max_words
        )
        
        if img_base64 is None:
            raise HTTPException(
                status_code=500, 
                detail="Samsung 워드클라우드 생성 실패: 함수가 None을 반환했습니다. 로그를 확인하세요."
            )
        
        # Base64 디코딩하여 PNG 이미지 반환
        try:
            img_bytes = base64.b64decode(img_base64)
            return Response(content=img_bytes, media_type="image/png")
        except Exception as decode_error:
            raise HTTPException(
                status_code=500,
                detail=f"Base64 디코딩 실패: {str(decode_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Samsung 워드클라우드 생성 실패: {str(e)}\n\n{error_trace}"
        )


# ========== Samsung 텍스트 처리 엔드포인트 ==========

@router.post("/samsung/process")
async def process_samsung_text():
    """삼성전자 지속가능경영보고서 텍스트 처리 및 워드클라우드 생성
    
    전체 프로세스 실행:
    1. 파일 읽기
    2. 한글 추출
    3. 명사 추출
    4. 불용어 제거
    5. 빈도 분석
    6. 워드클라우드 생성 및 저장 (save/samsung_wordcloud.png)
    """
    import traceback
    try:
        # SangsungWordcloud 인스턴스 생성
        wordcloud_service = SangsungWordcloud()
        
        # text_process 메서드 실행 (전체 프로세스: 빈도 분석 + 워드클라우드 생성)
        result = wordcloud_service.text_process()
        
        # 워드클라우드 이미지 파일 경로
        from pathlib import Path
        save_path = Path(__file__).parent.parent / 'save' / 'samsung_wordcloud.png'
        
        # 빈도 데이터 처리 (pandas Series를 dict로 변환)
        freq_txt = result.get('freq_txt', {})
        if hasattr(freq_txt, 'to_dict'):
            freq_dict = freq_txt.to_dict()
        else:
            freq_dict = str(freq_txt)
        
        return {
            "status": "success",
            "message": "텍스트 처리 및 워드클라우드 생성 완료",
            "전처리결과": result.get('전처리결과', '완료'),
            "freq_txt": freq_dict,
            "freq_top_30": dict(list(freq_dict.items())[:30]) if isinstance(freq_dict, dict) else freq_dict,
            "wordcloud_path": str(save_path),
            "wordcloud_exists": save_path.exists()
        }
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"삼성전자 텍스트 처리 실패: {str(e)}\n\n{error_trace}"
        )

