"""
Review Sentiment Router
영화 리뷰 감성 분석 FastAPI 라우터
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Optional

from app.review.review_service import ReviewSentimentService
from app.review.review_schema import (
    PredictRequest,
    BatchPredictRequest,
    PredictResponse,
    BatchPredictResponse,
    TrainRequest,
    TrainResponse,
    StatusResponse
)

# 라우터 생성
router = APIRouter(
    prefix="/review",
    tags=["review"],
    responses={404: {"description": "Not found"}}
)

# 서비스 인스턴스
_review_service: Optional[ReviewSentimentService] = None


def get_review_service() -> ReviewSentimentService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _review_service
    
    if _review_service is None:
        data_dir = Path(__file__).parent / "data"
        _review_service = ReviewSentimentService(data_dir=data_dir)
    
    return _review_service


@router.get("/", summary="서비스 정보")
async def root():
    """서비스 루트 엔드포인트"""
    return {
        "service": "Review Sentiment Analysis",
        "description": "네이버 영화 리뷰 긍정/부정 감성 분석 서비스",
        "model": "KoELECTRA v3 base"
    }


@router.post("/predict", response_model=PredictResponse, summary="리뷰 감성 분석")
async def predict_sentiment(request: PredictRequest):
    """
    단일 리뷰 텍스트의 감성 분석
    
    - **text**: 분석할 리뷰 텍스트
    - **반환**: sentiment (positive/negative), confidence, probabilities
    """
    try:
        service = get_review_service()
        result = service.predict(request.text)
        return PredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 실패: {str(e)}")


@router.post("/predict/batch", response_model=BatchPredictResponse, summary="배치 리뷰 감성 분석")
async def predict_batch(request: BatchPredictRequest):
    """
    여러 리뷰 텍스트의 배치 감성 분석
    
    - **texts**: 분석할 리뷰 텍스트 리스트
    - **반환**: 각 리뷰의 예측 결과 리스트
    """
    try:
        service = get_review_service()
        results = service.predict_batch(request.texts)
        return BatchPredictResponse(results=[PredictResponse(**r) for r in results])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"배치 예측 실패: {str(e)}")


@router.post("/train", response_model=TrainResponse, summary="모델 학습")
async def train_model(request: TrainRequest):
    """
    모델 학습 (비동기 처리 권장)
    
    - **data_path**: 학습 데이터 경로 (선택)
    - **epochs**: 학습 에포크 수
    - **batch_size**: 배치 크기
    - **learning_rate**: 학습률
    """
    try:
        service = get_review_service()
        
        results = service.learning(
            epochs=request.epochs,
            batch_size=request.batch_size,
            learning_rate=request.learning_rate
        )
        
        accuracy = results.get('val_accuracies', [0])[-1] if results.get('val_accuracies') else None
        
        return TrainResponse(
            status="completed",
            message="모델 학습이 완료되었습니다.",
            epochs=results.get('epochs_trained'),
            accuracy=accuracy
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학습 실패: {str(e)}")


@router.get("/status", response_model=StatusResponse, summary="서비스 상태")
async def get_status():
    """서비스 상태 조회"""
    try:
        service = get_review_service()
        status = service.get_status()
        return StatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 조회 실패: {str(e)}")


@router.get("/health", summary="헬스 체크")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}

