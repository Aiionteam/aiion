"""
Diary Emotion Router - FastAPI 라우터
일기 감정 분류 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import csv
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

from app.diary_emotion.diary_emotion_service import DiaryEmotionService
from app.diary_emotion.diary_emotion_schema import DiaryEmotionSchema
from app.diary_emotion.diary_emotion_monitor import get_monitor

# 라우터 생성
router = APIRouter(
    prefix="/diary-emotion",
    tags=["diary-emotion"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로
CSV_FILE_PATH = Path(__file__).parent / "dirary_data.csv"

# 서비스 인스턴스
_diary_emotion_service: Optional[DiaryEmotionService] = None


def get_diary_emotion_service() -> DiaryEmotionService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _diary_emotion_service
    if _diary_emotion_service is None:
        _diary_emotion_service = DiaryEmotionService(CSV_FILE_PATH)
    return _diary_emotion_service


def load_diaries(limit: Optional[int] = None) -> List[Dict[str, any]]:
    """CSV에서 일기 데이터 로드"""
    diaries = []
    try:
        with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if limit and i >= limit:
                    break
                    diaries.append({
                        "id": row.get("id", ""),
                        "localdate": row.get("localdate", ""),
                        "title": row.get("title", ""),
                        "content": row.get("content", ""),
                        "userId": row.get("userid", row.get("userId", "")),  # userid 또는 userId 지원
                        "emotion": row.get("emotion", "")
                    })
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"CSV 파일 읽기 오류: {e}")
        return []
    return diaries


class PredictRequest(BaseModel):
    """감정 예측 요청 모델"""
    text: str


@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Diary Emotion Classification",
        "description": "일기 텍스트를 통한 감정 분류 서비스 (0: 평가불가, 1: 완전긍정, 2: 긍정, 3: 평범, 4: 부정, 5: 완전부정)"
    }


@router.get("/diaries")
async def get_diaries(limit: int = 10):
    """일기 목록 조회"""
    diaries = load_diaries(limit)
    if not diaries:
        raise HTTPException(
            status_code=404,
            detail="일기 데이터를 찾을 수 없습니다."
        )
    return {
        "count": len(diaries),
        "diaries": diaries
    }


@router.get("/diaries/{diary_id}")
async def get_diary_by_id(diary_id: int):
    """ID로 일기 조회"""
    try:
        with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if int(row.get("id", 0)) == diary_id:
                        return {
                            "id": row.get("id", ""),
                            "localdate": row.get("localdate", ""),
                            "title": row.get("title", ""),
                            "content": row.get("content", ""),
                            "userId": row.get("userid", row.get("userId", "")),  # userid 또는 userId 지원
                            "emotion": row.get("emotion", "")
                        }
        raise HTTPException(status_code=404, detail=f"ID {diary_id}의 일기를 찾을 수 없습니다.")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="일기 데이터 파일을 찾을 수 없습니다.")
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 ID 형식입니다.")


@router.post("/predict")
async def predict_emotion(request: PredictRequest):
    """텍스트 감정 예측"""
    monitor = get_monitor()
    monitor.increment_request()
    monitor.increment_predict()
    
    try:
        service = get_diary_emotion_service()
        
        # 데이터 전처리 및 학습이 되어있지 않으면 먼저 실행
        if service.df is None:
            service.preprocess()
        if service.model_obj.model is None:
            service.modeling()
        if service.dataset.train is None:
            service.learning()
        
        # 예측
        result = service.predict(request.text)
        
        return result
        
    except Exception as e:
        monitor.increment_error(str(e))
        raise HTTPException(status_code=500, detail=f"예측 중 오류 발생: {str(e)}")


@router.post("/train")
async def train_model():
    """모델 학습 실행"""
    monitor = get_monitor()
    monitor.increment_request()
    monitor.increment_train()
    
    try:
        service = get_diary_emotion_service()
        
        # 전처리
        service.preprocess()
        
        # 모델링
        service.modeling()
        
        # 학습
        service.learning()
        
        # 평가
        evaluation = service.evaluate()
        
        return {
            "message": "모델 학습이 완료되었습니다.",
            "evaluation": evaluation
        }
        
    except Exception as e:
        monitor.increment_error(str(e))
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.get("/evaluate")
async def evaluate_model():
    """모델 평가"""
    try:
        service = get_diary_emotion_service()
        
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
        service = get_diary_emotion_service()
        
        # CSV 파일 존재 확인
        csv_exists = CSV_FILE_PATH.exists()
        
        # 데이터 로드 가능 여부
        data_loaded = service.df is not None
        
        # 모델 학습 여부
        model_trained = service.model_obj.model is not None
        
        # 데이터 통계
        data_stats = {}
        if data_loaded and service.df is not None:
            data_stats = {
                "total_count": len(service.df),
                "emotion_distribution": service.df['emotion'].value_counts().to_dict() if 'emotion' in service.df.columns else {}
            }
        
        return {
            "status": "healthy",
            "service": "diary-emotion",
            "csv_file_exists": csv_exists,
            "data_loaded": data_loaded,
            "model_trained": model_trained,
            "data_stats": data_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "diary-emotion",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get("/status")
async def service_status():
    """서비스 상태 및 통계"""
    try:
        service = get_diary_emotion_service()
        monitor = get_monitor()
        
        status = {
            "service": "Diary Emotion Classification",
            "version": "1.0.0",
            "uptime": monitor.get_uptime(),
            "statistics": monitor.get_stats(),
            "model": {
                "trained": service.model_obj.model is not None,
                "vectorizer_ready": service.model_obj.vectorizer is not None
            },
            "data": {
                "csv_file_exists": CSV_FILE_PATH.exists(),
                "data_loaded": service.df is not None,
                "total_count": len(service.df) if service.df is not None else 0,
                "train_count": len(service.dataset.train) if service.dataset.train is not None else 0,
                "test_count": len(service.dataset.test) if service.dataset.test is not None else 0
            }
        }
        
        # 데이터 분포 정보 추가
        if service.df is not None and 'emotion' in service.df.columns:
            status["data"]["emotion_distribution"] = service.df['emotion'].value_counts().to_dict()
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 확인 중 오류 발생: {str(e)}")


@router.get("/metrics")
async def get_metrics():
    """서비스 메트릭스"""
    try:
        service = get_diary_emotion_service()
        monitor = get_monitor()
        
        metrics = {
            "requests": {
                "total": monitor.request_count,
                "train": monitor.train_count,
                "predict": monitor.predict_count,
                "errors": monitor.error_count
            },
            "model": {
                "is_trained": service.model_obj.model is not None,
                "last_train_time": monitor.last_train_time.isoformat() if monitor.last_train_time else None
            },
            "data": {
                "csv_file_size": CSV_FILE_PATH.stat().st_size if CSV_FILE_PATH.exists() else 0,
                "loaded_records": len(service.df) if service.df is not None else 0
            },
            "uptime_seconds": (datetime.now() - monitor.start_time).total_seconds()
        }
        
        # 모델 평가 지표 추가 (모델이 학습되어 있을 경우)
        if service.model_obj.model is not None and service.dataset.test is not None:
            try:
                evaluation = service.evaluate()
                metrics["model"]["evaluation"] = {
                    "accuracy": evaluation.get("accuracy", 0),
                    "last_evaluated": datetime.now().isoformat()
                }
            except:
                pass
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"메트릭스 조회 중 오류 발생: {str(e)}")
