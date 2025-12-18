"""
Review Sentiment Schema
영화 리뷰 감성 분석 스키마
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class PredictRequest(BaseModel):
    """리뷰 예측 요청 모델"""
    text: str = Field(..., description="분석할 리뷰 텍스트", min_length=1)


class BatchPredictRequest(BaseModel):
    """배치 리뷰 예측 요청 모델"""
    texts: List[str] = Field(..., description="분석할 리뷰 텍스트 리스트", min_items=1)


class PredictResponse(BaseModel):
    """리뷰 예측 응답 모델"""
    sentiment: str = Field(..., description="감성 분석 결과 (positive/negative)")
    confidence: float = Field(..., description="신뢰도 (0.0 ~ 1.0)", ge=0.0, le=1.0)
    probabilities: Dict[str, float] = Field(..., description="각 클래스별 확률")
    text: str = Field(..., description="입력 텍스트")


class BatchPredictResponse(BaseModel):
    """배치 리뷰 예측 응답 모델"""
    results: List[PredictResponse] = Field(..., description="예측 결과 리스트")


class TrainRequest(BaseModel):
    """모델 학습 요청 모델"""
    data_path: Optional[str] = Field(None, description="학습 데이터 경로")
    epochs: int = Field(5, description="학습 에포크 수", ge=1, le=100)
    batch_size: int = Field(16, description="배치 크기", ge=1, le=128)
    learning_rate: float = Field(2e-5, description="학습률", ge=1e-6, le=1e-3)


class TrainResponse(BaseModel):
    """모델 학습 응답 모델"""
    status: str = Field(..., description="학습 상태")
    message: str = Field(..., description="상태 메시지")
    epochs: Optional[int] = Field(None, description="학습된 에포크 수")
    accuracy: Optional[float] = Field(None, description="정확도")


class StatusResponse(BaseModel):
    """서비스 상태 응답 모델"""
    status: str = Field(..., description="서비스 상태")
    model_loaded: bool = Field(..., description="모델 로드 여부")
    model_path: Optional[str] = Field(None, description="모델 경로")

