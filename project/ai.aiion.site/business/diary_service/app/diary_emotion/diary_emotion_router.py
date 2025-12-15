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

# ic (icecream) import
try:
    from icecream import ic
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

from diary_emotion.diary_emotion_service import DiaryEmotionService
from diary_emotion.diary_emotion_schema import DiaryEmotionSchema

# 라우터 생성
router = APIRouter(
    prefix="/diary-emotion",
    tags=["diary-emotion"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로 (DL 전용: diary_copers.csv 사용)
CSV_FILE_PATH = Path(__file__).parent / "data" / "diary_copers.csv"

# 서비스 인스턴스 (DL 전용 싱글톤)
_diary_emotion_service: Optional[DiaryEmotionService] = None


def get_diary_emotion_service() -> DiaryEmotionService:
    """
    서비스 인스턴스 반환 (DL 전용 싱글톤)
    
    Returns:
        DiaryEmotionService 인스턴스 (DL 전용)
    """
    global _diary_emotion_service
    
    if _diary_emotion_service is None or _diary_emotion_service.csv_file_path != CSV_FILE_PATH:
        _diary_emotion_service = DiaryEmotionService(
            csv_file_path=CSV_FILE_PATH,
            dl_model_name="koelectro_v3_base"  # 로컬 KoELECTRA v3 base 모델 사용
        )
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
    """감정 예측 요청 모델 (DL 전용)"""
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
    """
    텍스트 감정 예측 (DL 전용)
    
    - **text**: 분석할 텍스트
    - **반환**: 예측된 감정 (DL 모델 사용)
    """
    try:
        # 빈 텍스트 체크
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="텍스트가 비어있습니다. 분석할 텍스트를 제공해주세요."
            )
        
        # DL 서비스 가져오기
        service = get_diary_emotion_service()
        
        # DL 모델이 없으면 자동으로 로드 시도
        if service.dl_model_obj is None or service.dl_model_obj.model is None:
            ic("DL 모델이 메모리에 없음, 파일에서 자동 로드 시도...")
            if service.dl_model_file.exists():
                load_success = service.load_model()
                if not load_success:
                    raise HTTPException(
                        status_code=400,
                        detail="DL 모델 로드 실패. /train 엔드포인트를 먼저 호출하세요."
                    )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="DL 모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
                )
        
        # DL 예측
        result = service.predict(request.text)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 중 오류 발생: {str(e)}")


async def _predict_ensemble(text: str) -> Dict:
    """ML + DL Ensemble 예측"""
    results = {}
    
    # 1. DL 예측
    try:
        dl_service = get_diary_emotion_service(model_type="dl")
        if dl_service.dl_model_obj is None or dl_service.dl_model_obj.model is None:
            results['dl'] = {"status": "not_available", "error": "DL 모델이 학습되지 않음"}
        else:
            dl_result = dl_service.predict(text)
            results['dl'] = {
                "status": "success",
                "emotion": dl_result.get('emotion'),
                "emotion_label": dl_result.get('emotion_label')
            }
    except Exception as e:
        results['dl'] = {"status": "error", "error": str(e)}
    
    # 2. ML 예측
    try:
        ml_service = get_diary_emotion_service(model_type="ml")
        if ml_service.model_obj.model is None:
            results['ml'] = {"status": "not_available", "error": "ML 모델이 학습되지 않음"}
        else:
            ml_result = ml_service.predict(text)
            results['ml'] = {
                "status": "success",
                "emotion": ml_result.get('emotion'),
                "emotion_label": ml_result.get('emotion_label'),
                "confidence": ml_result.get('confidence', 0.0)
            }
    except Exception as e:
        results['ml'] = {"status": "error", "error": str(e)}
    
    # 3. Ensemble 로직: 둘 다 성공하면 가중 평균, 하나만 성공하면 그것 사용
    if results.get('dl', {}).get('status') == 'success' and results.get('ml', {}).get('status') == 'success':
        # 둘 다 성공: DL에 더 높은 가중치 (0.7), ML에 낮은 가중치 (0.3)
        dl_emotion = results['dl']['emotion']
        ml_emotion = results['ml']['emotion']
        ml_confidence = results['ml'].get('confidence', 0.5)
        
        # DL이 더 신뢰할 만하므로 DL 결과를 우선, ML은 보조
        if dl_emotion == ml_emotion:
            # 둘 다 같은 결과: 높은 신뢰도
            final_emotion = dl_emotion
            final_confidence = 0.9
        else:
            # 다른 결과: DL 우선 (DL 가중치 0.7, ML 가중치 0.3)
            final_emotion = dl_emotion  # DL 우선
            final_confidence = 0.7 + (ml_confidence * 0.3)
        
        emotion_labels = {
            0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람',
            7: '신뢰', 8: '기대', 9: '불안', 10: '안도', 11: '후회', 12: '그리움', 13: '감사', 14: '외로움'
        }
        
        return {
            "emotion": final_emotion,
            "emotion_label": emotion_labels.get(final_emotion, '알 수 없음'),
            "confidence": final_confidence,
            "model_type": "ensemble",
            "ml_result": results['ml'],
            "dl_result": results['dl'],
            "agreement": dl_emotion == ml_emotion  # 두 모델이 같은 결과인지
        }
    elif results.get('dl', {}).get('status') == 'success':
        # DL만 성공
        return {
            "emotion": results['dl']['emotion'],
            "emotion_label": results['dl']['emotion_label'],
            "confidence": 0.8,
            "model_type": "ensemble",
            "ml_result": results['ml'],
            "dl_result": results['dl'],
            "agreement": None,
            "note": "ML 모델 사용 불가, DL 결과만 사용"
        }
    elif results.get('ml', {}).get('status') == 'success':
        # ML만 성공
        return {
            "emotion": results['ml']['emotion'],
            "emotion_label": results['ml']['emotion_label'],
            "confidence": results['ml'].get('confidence', 0.6),
            "model_type": "ensemble",
            "ml_result": results['ml'],
            "dl_result": results['dl'],
            "agreement": None,
            "note": "DL 모델 사용 불가, ML 결과만 사용"
        }
    else:
        # 둘 다 실패
        raise HTTPException(
            status_code=500,
            detail="ML과 DL 모델 모두 예측에 실패했습니다. 모델을 학습해주세요."
        )


async def _predict_with_fallback(text: str, fallback_type: str, original_error: str = "") -> Dict:
    """Fallback 예측 (DL 실패 시 ML 사용)"""
    try:
        ml_service = get_diary_emotion_service(model_type="ml")
        if ml_service.model_obj.model is None:
            raise HTTPException(
                status_code=400,
                detail="ML 모델도 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
            )
        
        result = ml_service.predict(text)
        result['model_type'] = 'ml'
        result['fallback_used'] = True
        result['original_error'] = original_error
        result['note'] = "DL 모델 실패로 ML 모델로 fallback"
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fallback 예측도 실패했습니다. ML: {str(e)}"
        )


@router.post("/reset")
async def reset_model():
    """모델 초기화 - 저장된 모델 파일 삭제"""
    try:
        service = get_diary_emotion_service()
        
        deleted_files = []
        files_to_delete = [
            ("model", service.model_file),
            ("vectorizer", service.vectorizer_file),
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
        service.dataset.train = None
        service.dataset.test = None
        
        return {
            "message": "모델이 초기화되었습니다.",
            "deleted_files": deleted_files,
            "total_deleted": len(deleted_files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 초기화 중 오류 발생: {str(e)}")


class TrainRequest(BaseModel):
    """학습 요청 모델"""
    model_type: str = "ml"  # "ml", "dl", 또는 "both" (ML과 DL 모두 학습)
    dl_model_name: Optional[str] = "koelectro_v3_base"  # DL 모델 이름 (로컬 KoELECTRA v3 base)
    epochs: Optional[int] = 3  # DL 에폭 수
    batch_size: Optional[int] = 16  # DL 배치 크기


@router.post("/train")
async def train_model(request: Optional[TrainRequest] = None):
    """
    모델 학습 API (ML, DL, 또는 둘 다)
    
    - **model_type**: 모델 타입 
        - "ml": 머신러닝만 학습
        - "dl": 딥러닝만 학습
        - "both": ML과 DL 모두 학습 (병행)
    - **dl_model_name**: 딥러닝 모델 이름 (기본: koelectro_v3_base - 로컬 KoELECTRA v3 base)
    - **epochs**: 딥러닝 에폭 수 (기본: 3)
    - **batch_size**: 딥러닝 배치 크기 (기본: 16)
    - **반환**: 학습 완료 메시지
    """
    try:
        # 요청 파라미터 파싱
        model_type = request.model_type if request else "ml"
        
        # "both"인 경우 ML과 DL 모두 학습
        if model_type == "both":
            results = {}
            
            # 1. ML 학습
            try:
                ml_service = get_diary_emotion_service(model_type="ml")
                ml_service.preprocess()
                ml_service.modeling()
                ml_service.learning()
                ml_evaluation = ml_service.evaluate()
                ml_service.save_model()
                
                results["ml"] = {
                    "status": "success",
                    "message": "ML 모델 학습 완료",
                    "evaluation": ml_evaluation,
                    "model_saved": True,
                    "model_path": str(ml_service.model_file)
                }
            except Exception as e:
                results["ml"] = {
                    "status": "error",
                    "message": f"ML 학습 실패: {str(e)}"
                }
            
            # 2. DL 학습
            try:
                dl_service = get_diary_emotion_service(model_type="dl")
                dl_service.preprocess()  # 전처리는 이미 ML에서 했지만, DL 서비스도 초기화 필요
                
                # DL 학습 파라미터 (메모리 효율을 위해 조정)
                # request가 있으면 사용, 없으면 기본값 (더 작은 값으로 메모리 절약)
                dl_epochs = request.epochs if request and request.epochs else 3
                dl_batch_size = request.batch_size if request and request.batch_size else 8  # 16 -> 8로 감소
                dl_freeze_layers = 8  # BERT 하위 레이어 동결 수
                
                # DL 학습 실행 (파라미터 전달)
                history = dl_service.learning(epochs=dl_epochs, batch_size=dl_batch_size, freeze_bert_layers=dl_freeze_layers)
                dl_service.save_model()
                
                results["dl"] = {
                    "status": "success",
                    "message": "DL 모델 학습 완료",
                    "history": {
                        "final_train_accuracy": float(history["final_train_accuracy"]),
                        "final_val_accuracy": float(history["final_val_accuracy"]),
                        "best_val_accuracy": float(history["best_val_accuracy"])
                    },
                    "model_saved": True,
                    "model_path": str(dl_service.dl_model_file)
                }
            except Exception as e:
                results["dl"] = {
                    "status": "error",
                    "message": f"DL 학습 실패: {str(e)}"
                }
            
            # 결과 반환
            all_success = results.get("ml", {}).get("status") == "success" and results.get("dl", {}).get("status") == "success"
            
            return {
                "message": "ML과 DL 모델 학습이 완료되었습니다." if all_success else "일부 모델 학습에 실패했습니다.",
                "status": "success" if all_success else "partial_success",
                "model_type": "both",
                "results": results
            }
        
        # 단일 모델 학습 (기존 로직)
        service = get_diary_emotion_service(model_type=model_type)
        service.preprocess()
        
        if model_type == "ml":
            # ML 학습
            service.modeling()
            service.learning()
            evaluation = service.evaluate()
            service.save_model()
            
            return {
                "message": "ML 모델 학습이 완료되었습니다.",
                "status": "success",
                "model_type": "ml",
                "evaluation": evaluation,
                "model_saved": True,
                "model_path": str(service.model_file)
            }
        else:
            # DL 학습
            # DL 학습 파라미터
            dl_epochs = request.epochs if request and request.epochs else 3
            dl_batch_size = request.batch_size if request and request.batch_size else 8
            dl_freeze_layers = 8
            
            history = service.learning(epochs=dl_epochs, batch_size=dl_batch_size, freeze_bert_layers=dl_freeze_layers)
            service.save_model()
            
            return {
                "message": "DL 모델 학습이 완료되었습니다.",
                "status": "success",
                "model_type": "dl",
                "history": {
                    "final_train_accuracy": float(history["final_train_accuracy"]),
                    "final_val_accuracy": float(history["final_val_accuracy"]),
                    "best_val_accuracy": float(history["best_val_accuracy"])
                },
                "model_saved": True,
                "model_path": str(service.dl_model_file)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.get("/evaluate")
async def evaluate_model(model_type: str = "ml"):
    """
    모델 평가 API (ML, DL, 또는 둘 다)
    
    - **model_type**: 평가할 모델 타입
        - "ml": 머신러닝 모델만 평가
        - "dl": 딥러닝 모델만 평가
        - "both": ML과 DL 모두 평가
    - **반환**: 평가 결과 (정확도, 분류 보고서, 혼동 행렬)
    """
    try:
        # "both"인 경우 ML과 DL 모두 평가
        if model_type == "both":
            results = {}
            
            # 1. ML 평가
            try:
                ml_service = get_diary_emotion_service(model_type="ml")
                # 모델이 없으면 로드 시도
                if ml_service.model_obj.model is None:
                    ml_service.load_model(model_type="ml")
                if ml_service.model_obj.model is None:
                    results["ml"] = {
                        "status": "not_available",
                        "error": "ML 모델이 학습되지 않았습니다."
                    }
                else:
                    ml_evaluation = ml_service.evaluate(model_type="ml")
                    results["ml"] = {
                        "status": "success",
                        **ml_evaluation
                    }
            except Exception as e:
                results["ml"] = {
                    "status": "error",
                    "error": str(e)
                }
            
            # 2. DL 평가
            try:
                dl_service = get_diary_emotion_service(model_type="dl")
                # 모델이 없으면 로드 시도
                if dl_service.dl_model_obj is None or dl_service.dl_model_obj.model is None:
                    dl_service.load_model(model_type="dl")
                if dl_service.dl_model_obj is None or dl_service.dl_model_obj.model is None:
                    results["dl"] = {
                        "status": "not_available",
                        "error": "DL 모델이 학습되지 않았습니다."
                    }
                else:
                    dl_evaluation = dl_service.evaluate(model_type="dl")
                    results["dl"] = {
                        "status": "success",
                        **dl_evaluation
                    }
            except Exception as e:
                results["dl"] = {
                    "status": "error",
                    "error": str(e)
                }
            
            # 결과 요약
            ml_accuracy = results.get("ml", {}).get("accuracy") if results.get("ml", {}).get("status") == "success" else None
            dl_accuracy = results.get("dl", {}).get("accuracy") if results.get("dl", {}).get("status") == "success" else None
            
            return {
                "model_type": "both",
                "results": results,
                "summary": {
                    "ml_accuracy": ml_accuracy,
                    "dl_accuracy": dl_accuracy,
                    "accuracy_difference": dl_accuracy - ml_accuracy if (ml_accuracy is not None and dl_accuracy is not None) else None
                }
            }
        
        # 단일 모델 평가
        service = get_diary_emotion_service(model_type=model_type)
        
        # 모델이 없으면 로드 시도
        if model_type == "dl":
            if service.dl_model_obj is None or service.dl_model_obj.model is None:
                service.load_model(model_type="dl")
            if service.dl_model_obj is None or service.dl_model_obj.model is None:
                raise HTTPException(
                    status_code=400,
                    detail="DL 모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
                )
        else:  # model_type == "ml"
            if service.model_obj.model is None:
                service.load_model(model_type="ml")
            if service.model_obj.model is None:
                raise HTTPException(
                    status_code=400,
                    detail="ML 모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
                )
        
        evaluation = service.evaluate(model_type=model_type)
        
        return evaluation
        
    except HTTPException:
        raise
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
