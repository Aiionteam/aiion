"""
건강 데이터 FastAPI 라우터
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from healthcare_service import HealthcareService

# 라우터 생성
healthcare_router = APIRouter(
    prefix="/healthcare",
    tags=["healthcare"]
)

# 서비스 인스턴스
healthcare_service = HealthcareService()


# 요청 모델
class TrainRequest(BaseModel):
    """모델 학습 요청"""
    test_size: Optional[float] = Field(default=0.2, ge=0.1, le=0.5, description="테스트 데이터 비율")
    save_model: Optional[bool] = Field(default=True, description="모델 저장 여부")


class PredictRequest(BaseModel):
    """예측 요청"""
    symptom: str = Field(..., description="증상")
    accompanying_symptom: str = Field(..., description="동반증상")
    age: int = Field(..., ge=0, le=150, description="연령대")
    gender: str = Field(..., pattern="^(남성|여성)$", description="성별 (남성 또는 여성)")


# 응답 모델
class TrainResponse(BaseModel):
    """모델 학습 응답"""
    status: str
    message: str
    results: Optional[dict] = None
    error: Optional[str] = None


class PredictResponse(BaseModel):
    """예측 응답"""
    status: str
    prediction: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None


class ModelInfoResponse(BaseModel):
    """모델 정보 응답"""
    status: str
    info: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None


class DatasetStatsResponse(BaseModel):
    """데이터셋 통계 응답"""
    status: str
    stats: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None


@healthcare_router.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """
    모델 학습
    
    - **test_size**: 테스트 데이터 비율 (0.1 ~ 0.5)
    - **save_model**: 모델 저장 여부
    """
    result = healthcare_service.train(
        test_size=request.test_size,
        save_model=request.save_model
    )
    
    if result['status'] == 'error':
        raise HTTPException(status_code=500, detail=result['message'])
    
    return result


@healthcare_router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    증상 기반 진료과 및 병명 예측
    
    - **symptom**: 증상
    - **accompanying_symptom**: 동반증상
    - **age**: 연령대 (0 ~ 150)
    - **gender**: 성별 (남성 또는 여성)
    """
    result = healthcare_service.predict(
        symptom=request.symptom,
        accompanying_symptom=request.accompanying_symptom,
        age=request.age,
        gender=request.gender
    )
    
    if result['status'] == 'error':
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result


@healthcare_router.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info():
    """
    모델 정보 조회
    
    모델 로드 상태, 모델 파일 존재 여부 등을 반환합니다.
    """
    result = healthcare_service.get_model_info()
    
    if result['status'] == 'error':
        raise HTTPException(status_code=500, detail=result['message'])
    
    return result


@healthcare_router.get("/dataset/stats", response_model=DatasetStatsResponse)
async def get_dataset_stats():
    """
    데이터셋 통계 정보 조회
    
    데이터셋의 샘플 수, 클래스 분포, 연령대 범위 등을 반환합니다.
    """
    result = healthcare_service.get_dataset_stats()
    
    if result['status'] == 'error':
        raise HTTPException(status_code=500, detail=result['message'])
    
    return result


@healthcare_router.get("/health")
async def health_check():
    """
    헬스 체크 엔드포인트
    """
    return {
        "status": "healthy",
        "service": "healthcare-ml-service"
    }

