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

# 라우터 생성
router = APIRouter(
    prefix="/diary-emotion",
    tags=["diary-emotion"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로
CSV_FILE_PATH = Path(__file__).parent / "diary.csv"

# 서비스 인스턴스
_diary_emotion_service: Optional[DiaryEmotionService] = None


def get_diary_emotion_service() -> DiaryEmotionService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _diary_emotion_service
    # CSV 파일 경로를 명시적으로 전달 (diary.csv)
    csv_path = Path(__file__).parent / "diary.csv"
    # 매번 새로 생성하거나 경로가 변경되었으면 재생성
    if _diary_emotion_service is None or _diary_emotion_service.csv_file_path != csv_path:
        _diary_emotion_service = DiaryEmotionService(csv_path)
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
        "description": "일기 텍스트를 통한 감정 분류 서비스 (0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람)"
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
    try:
        service = get_diary_emotion_service()
        
        # 모델이 없으면 자동 로드 시도
        if service.model_obj.model is None:
            loaded = service._try_load_model()
            if not loaded:
                # 모델 파일이 없거나 CSV가 업데이트된 경우 재학습 필요
                raise HTTPException(
                    status_code=400, 
                    detail="모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
                )
        
        # 예측
        result = service.predict(request.text)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 중 오류 발생: {str(e)}")


@router.post("/reset")
async def reset_model():
    """모델 초기화 - 저장된 모델 파일 삭제"""
    try:
        service = get_diary_emotion_service()
        
        deleted_files = []
        files_to_delete = [
            ("model", service.model_file),
            ("vectorizer", service.vectorizer_file),
            ("word2vec", service.word2vec_file),
            ("metadata", service.metadata_file)
        ]
        
        for name, file_path in files_to_delete:
            if file_path.exists():
                try:
                    file_path.unlink()
                    deleted_files.append(name)
                except Exception as e:
                    return {
                        "message": f"모델 초기화 중 오류 발생: {name} 파일 삭제 실패",
                        "error": str(e),
                        "deleted_files": deleted_files
                    }
        
        # 메모리의 모델도 초기화
        service.model_obj.model = None
        service.model_obj.vectorizer = None
        service.model_obj.word2vec_model = None
        service.dataset.train = None
        service.dataset.test = None
        
        return {
            "message": "모델이 초기화되었습니다.",
            "deleted_files": deleted_files,
            "total_deleted": len(deleted_files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 초기화 중 오류 발생: {str(e)}")


@router.post("/train")
async def train_model():
    """모델 학습 실행"""
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
        
        # 모델 저장
        service.save_model()
        
        return {
            "message": "모델 학습이 완료되었습니다.",
            "evaluation": evaluation,
            "model_saved": True,
            "model_path": str(service.model_file)
        }
        
    except Exception as e:
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
        
        status = {
            "service": "Diary Emotion Classification",
            "version": "1.0.0",
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
        
        metrics = {
            "model": {
                "is_trained": service.model_obj.model is not None
            },
            "data": {
                "csv_file_size": CSV_FILE_PATH.stat().st_size if CSV_FILE_PATH.exists() else 0,
                "loaded_records": len(service.df) if service.df is not None else 0
            }
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
