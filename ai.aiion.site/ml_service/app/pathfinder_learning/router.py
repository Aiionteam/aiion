"""
Learning Recommendation Router - FastAPI 라우터
학습 추천 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

from app.pathfinder_learning.learning_recommendation_service import LearningRecommendationService

# 라우터 생성
router = APIRouter(
    prefix="/pathfinder-learning",
    tags=["pathfinder-learning"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로
CSV_FILE_PATH = Path(__file__).parent / "learning_recommendation_dataset.csv"

# 서비스 인스턴스
_learning_recommendation_service: Optional[LearningRecommendationService] = None


def get_learning_recommendation_service() -> LearningRecommendationService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _learning_recommendation_service
    csv_path = Path(__file__).parent / "learning_recommendation_dataset.csv"
    if _learning_recommendation_service is None or _learning_recommendation_service.csv_file_path != csv_path:
        _learning_recommendation_service = LearningRecommendationService(csv_path)
    return _learning_recommendation_service


class PredictRequest(BaseModel):
    """학습 추천 예측 요청 모델"""
    diary_content: str
    emotion: int
    behavior_patterns: Optional[str] = ""
    behavior_frequency: Optional[str] = ""
    mbti_type: Optional[str] = ""
    mbti_confidence: Optional[float] = 0.0


@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Learning Recommendation",
        "description": "일기 데이터를 기반으로 학습 주제 추천 서비스"
    }


@router.post("/collect-data")
async def collect_training_data(
    user_id: Optional[int] = Query(None, description="특정 사용자 ID (use_csv=false일 때만 사용)"),
    limit: Optional[int] = Query(None, description="수집할 데이터 개수 제한"),
    use_csv: bool = Query(True, description="True: diary_emotion/diary.csv 사용, False: diary-service에서 가져오기")
):
    """학습용 데이터 수집
    
    diary_emotion/diary.csv 파일에서 일기 데이터를 가져와서
    ML 분석 결과와 결합하여 학습용 CSV를 생성합니다.
    """
    try:
        from app.pathfinder_learning.data_collector import LearningRecommendationDataCollector
        
        collector = LearningRecommendationDataCollector()
        count = collector.collect_and_save(user_id, limit, use_csv=use_csv)
        
        if count == 0:
            raise HTTPException(
                status_code=400,
                detail="수집된 데이터가 없습니다. CSV 파일 경로나 diary-service 연결을 확인하세요."
            )
        
        return {
            "message": "데이터 수집이 완료되었습니다.",
            "collected_count": count,
            "csv_path": str(collector.output_csv_path),
            "source": "diary_emotion/diary.csv" if use_csv else "diary-service"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 수집 중 오류 발생: {str(e)}")


@router.post("/train")
async def train_model(
    collect_data: bool = Query(True, description="True이면 데이터 수집 후 학습"),
    user_id: Optional[int] = Query(None, description="특정 사용자 ID (use_csv=false일 때만 사용)"),
    data_limit: Optional[int] = Query(None, description="수집할 데이터 개수 제한"),
    use_csv: bool = Query(True, description="True: diary_emotion/diary.csv 사용, False: diary-service에서 가져오기")
):
    """모델 학습 실행
    
    Args:
        collect_data: True이면 실제 일기 데이터를 수집하여 학습 (기본값: True)
        user_id: 특정 사용자 일기만 수집 (use_csv=false일 때만 사용)
        data_limit: 수집할 데이터 개수 제한 (None이면 전체)
        use_csv: True이면 diary_emotion/diary.csv 사용, False이면 diary-service에서 가져오기
    """
    try:
        service = get_learning_recommendation_service()
        
        # 데이터 수집 (옵션)
        if collect_data:
            from app.pathfinder_learning.data_collector import LearningRecommendationDataCollector
            collector = LearningRecommendationDataCollector()
            collected_count = collector.collect_and_save(user_id, data_limit, use_csv=use_csv)
            
            if collected_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="수집된 학습 데이터가 없습니다. collect_data=false로 설정하거나 일기 데이터를 확인하세요."
                )
        
        # 전처리
        service.preprocess()
        
        # 모델링
        service.modeling()
        
        # 학습
        service.learning()
        
        # 평가
        evaluation = service.evaluate()
        
        # 모델 저장
        service.save_model()
        
        return {
            "message": "모델 학습이 완료되었습니다.",
            "data_collected": collect_data,
            "data_source": "diary_emotion/diary.csv" if (collect_data and use_csv) else ("diary-service" if collect_data else "existing_csv"),
            "data_count": len(service.df) if service.df is not None else 0,
            "evaluation": evaluation,
            "model_saved": True,
            "model_path": str(service.model_file)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.post("/predict")
async def predict_recommendation(request: PredictRequest):
    """학습 추천 예측"""
    try:
        service = get_learning_recommendation_service()
        
        # 모델이 없으면 자동 로드 시도
        if service.model_obj.model is None:
            loaded = service._try_load_model()
            if not loaded:
                raise HTTPException(
                    status_code=400, 
                    detail="모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
                )
        
        # 예측
        result = service.predict(
            diary_content=request.diary_content,
            emotion=request.emotion,
            behavior_patterns=request.behavior_patterns or "",
            behavior_frequency=request.behavior_frequency or "",
            mbti_type=request.mbti_type or "",
            mbti_confidence=request.mbti_confidence or 0.0
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 중 오류 발생: {str(e)}")


@router.get("/evaluate")
async def evaluate_model():
    """모델 평가"""
    try:
        service = get_learning_recommendation_service()
        
        if service.model_obj.model is None:
            raise HTTPException(status_code=400, detail="모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요.")
        
        evaluation = service.evaluate()
        
        return evaluation
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"평가 중 오류 발생: {str(e)}")


@router.get("/health")
async def health_check():
    """서비스 헬스 체크"""
    try:
        service = get_learning_recommendation_service()
        
        # CSV 파일 존재 확인
        csv_exists = CSV_FILE_PATH.exists()
        
        # 데이터 로드 가능 여부
        data_loaded = service.df is not None
        
        # 모델 학습 여부
        model_trained = service.model_obj.model is not None
        ranking_model_trained = service.model_obj.ranking_model is not None
        
        # 데이터 통계
        data_stats = {}
        if data_loaded and service.df is not None:
            data_stats = {
                "total_count": len(service.df),
                "emotion_distribution": service.df['emotion'].value_counts().to_dict() if 'emotion' in service.df.columns else {},
                "topic_distribution": service.df['recommended_topic'].value_counts().to_dict() if 'recommended_topic' in service.df.columns else {}
            }
        
        return {
            "status": "healthy",
            "service": "pathfinder-learning",
            "csv_file_exists": csv_exists,
            "data_loaded": data_loaded,
            "model_trained": model_trained,
            "ranking_model_trained": ranking_model_trained,
            "data_stats": data_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "pathfinder-learning",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

