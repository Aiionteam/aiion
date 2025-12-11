"""
Diary MBTI Router - FastAPI 라우터
일기 MBTI 분류 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import csv
from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel

from app.diary_mbti.diary_mbti_service import DiaryMbtiService
from app.diary_mbti.diary_mbti_schema import DiaryMbtiSchema

# 라우터 생성
router = APIRouter(
    prefix="/diary-mbti",
    tags=["diary-mbti"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로 (diary_mbti/data/ 폴더에 있음)
CSV_FILE_PATH = Path(__file__).parent / "data" / "diary_mbti.csv"

# 서비스 인스턴스
_diary_mbti_service: Optional[DiaryMbtiService] = None


def get_diary_mbti_service() -> DiaryMbtiService:
    """서비스 인스턴스 싱글톤 패턴"""
    global _diary_mbti_service
    # CSV 파일 경로를 명시적으로 전달 (diary_mbti/data/diary_mbti.csv)
    csv_path = Path(__file__).parent / "data" / "diary_mbti.csv"
    # 매번 새로 생성하거나 경로가 변경되었으면 재생성
    if _diary_mbti_service is None or _diary_mbti_service.csv_file_path != csv_path:
        _diary_mbti_service = DiaryMbtiService(csv_path)
    return _diary_mbti_service


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
                    "E_I": row.get("E_I", ""),
                    "S_N": row.get("S_N", ""),
                    "T_F": row.get("T_F", ""),
                    "J_P": row.get("J_P", "")
                })
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"CSV 파일 읽기 오류: {e}")
        return []
    return diaries


class PredictRequest(BaseModel):
    """MBTI 예측 요청 모델"""
    text: str


class TrainRequest(BaseModel):
    """학습 요청 모델"""
    use_hyperparameter_tuning: bool = True
    use_ensemble: bool = True
    n_trials: int = 50


@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Diary MBTI Classification",
        "description": "일기 텍스트를 통한 MBTI 분류 서비스 (E_I, S_N, T_F, J_P)",
        "labels": {
            "E_I": "0=평가불가, 1=E(외향), 2=I(내향)",
            "S_N": "0=평가불가, 1=S(감각), 2=N(직관)",
            "T_F": "0=평가불가, 1=T(사고), 2=F(감정)",
            "J_P": "0=평가불가, 1=J(판단), 2=P(인식)"
        }
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
                        "E_I": row.get("E_I", ""),
                        "S_N": row.get("S_N", ""),
                        "T_F": row.get("T_F", ""),
                        "J_P": row.get("J_P", "")
                    }
        raise HTTPException(status_code=404, detail=f"ID {diary_id}의 일기를 찾을 수 없습니다.")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="일기 데이터 파일을 찾을 수 없습니다.")
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 ID 형식입니다.")


@router.post("/predict")
async def predict_mbti(request: PredictRequest):
    """텍스트 MBTI 예측"""
    try:
        # 빈 텍스트 체크
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="텍스트가 비어있습니다. 분석할 텍스트를 제공해주세요."
            )
        
        service = get_diary_mbti_service()
        
        # 모델이 없으면 학습 필요
        if not service.model_obj.models or all(m is None for m in service.model_obj.models.values()):
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


@router.post("/train")
async def train_model(request: Optional[TrainRequest] = None):
    """
    모델 학습 실행
    
    단계적 학습 모드 (기본값):
    - 1단계: 앙상블 모델로 학습 및 오버피팅 체크
    - 2단계: 오버피팅 발견 시 하이퍼파라미터 튜닝으로 재학습
    
    기존 모드 (staged_training=False):
    - use_hyperparameter_tuning, use_ensemble 파라미터로 직접 제어
    """
    try:
        service = get_diary_mbti_service()
        
        # 단계적 학습 모드 확인
        is_staged = service.staged_training
        
        # 요청 파라미터 설정
        use_hyperparameter_tuning = True
        use_ensemble = True
        n_trials = 50
        
        if request:
            use_hyperparameter_tuning = request.use_hyperparameter_tuning
            use_ensemble = request.use_ensemble
            n_trials = request.n_trials
        
        # 단계적 학습 모드가 아닐 때만 파라미터 적용
        if not is_staged:
            service.use_hyperparameter_tuning = use_hyperparameter_tuning
            service.use_ensemble = use_ensemble
            service.n_trials = n_trials
            print(f"하이퍼파라미터 최적화: {use_hyperparameter_tuning}")
            print(f"앙상블 모델: {use_ensemble}")
        else:
            # 단계적 학습 모드에서는 n_trials만 설정 (하이퍼파라미터 튜닝 시 사용)
            service.n_trials = n_trials
            print(f"📊 단계적 학습 모드 활성화")
            print(f"  - 1단계: 앙상블 모델로 학습 및 오버피팅 체크")
            print(f"  - 2단계: 오버피팅 발견 시 하이퍼파라미터 튜닝 (n_trials={n_trials})")
        
        # 전처리
        service.preprocess()
        
        # 모델링
        service.modeling()
        
        # 학습
        service.learning()
        
        # 정확도 확인
        accuracy = service.check_accuracy()
        
        # 모델 저장
        service.save_model()
        
        # 단계적 학습 결과 포함
        overall_accuracy = accuracy.get('overall_accuracy', 0) if isinstance(accuracy, dict) else 0
        target_met = overall_accuracy >= service.target_accuracy if is_staged else False
        
        response = {
            "message": "모델 학습이 완료되었습니다.",
            "status": "success",
            "staged_training": is_staged,
            "target_accuracy": service.target_accuracy if is_staged else None,
            "target_met": target_met,
            "accuracy": accuracy,
            "model_saved": True,
            "model_path": str(service.model_dir)
        }
        
        if is_staged:
            # 단계적 학습 결과 요약
            staged_results = {}
            if hasattr(service, 'ensemble_results') and service.ensemble_results:
                for label, result in service.ensemble_results.items():
                    staged_results[label] = {
                        "overfitting_detected": result.get('is_overfitting', False),
                        "train_score": result.get('train_score', 0),
                        "val_score": result.get('val_score', 0),
                        "score_diff": result.get('score_diff', 0),
                        "final_model": "hyperparameter_tuned" if result.get('is_overfitting', False) else "ensemble"
                    }
                    if result.get('tuned_test_score'):
                        staged_results[label]["tuned_test_score"] = result.get('tuned_test_score', 0)
                        staged_results[label]["tuned_score_diff"] = result.get('tuned_score_diff', 0)
            
            response["staged_results"] = staged_results
            response["options"] = {
                "mode": "staged_training",
                "overfitting_threshold": service.overfitting_threshold,
                "n_trials": n_trials
            }
        else:
            response["options"] = {
                "hyperparameter_tuning": use_hyperparameter_tuning,
                "ensemble": use_ensemble,
                "n_trials": n_trials
            }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.get("/accuracy")
async def get_accuracy():
    """모델 정확도 확인"""
    try:
        service = get_diary_mbti_service()
        
        # 모델이 없으면 학습 필요
        if not service.model_obj.models or all(m is None for m in service.model_obj.models.values()):
            raise HTTPException(status_code=400, detail="모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요.")
        
        accuracy = service.check_accuracy()
        
        return accuracy
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정확도 확인 중 오류 발생: {str(e)}")


@router.post("/reset")
async def reset_model():
    """모델 초기화 - 저장된 모델 파일 삭제"""
    try:
        service = get_diary_mbti_service()
        
        deleted_files = []
        files_to_delete = [
            ("E_I model", service.model_files['E_I']),
            ("S_N model", service.model_files['S_N']),
            ("T_F model", service.model_files['T_F']),
            ("J_P model", service.model_files['J_P']),
            ("vectorizer", service.model_files['vectorizer']),
            ("word2vec", service.model_files['word2vec']),
            ("metadata", service.model_files['metadata'])
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
        service.model_obj.models = {}
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


@router.get("/status")
async def service_status():
    """서비스 상태 및 통계"""
    try:
        service = get_diary_mbti_service()
        
        # CSV 파일 존재 확인
        csv_exists = CSV_FILE_PATH.exists()
        
        # 데이터 로드 가능 여부
        data_loaded = service.df is not None
        
        # 모델 학습 여부
        models_loaded = False
        if service.model_obj.models:
            models_loaded = any(m is not None for m in service.model_obj.models.values())
        
        # MBTI 차원별 모델 상태
        mbti_labels = []
        if service.model_obj.models:
            for label in service.mbti_labels:
                if label in service.model_obj.models and service.model_obj.models[label] is not None:
                    mbti_labels.append(label)
        
        status = {
            "service": "Diary MBTI Classification",
            "version": "1.0.0",
            "csv_exists": csv_exists,
            "data_loaded": data_loaded,
            "models_loaded": models_loaded,
            "mbti_labels": mbti_labels,
            "model": {
                "trained": models_loaded,
                "vectorizer_ready": service.model_obj.vectorizer is not None,
                "word2vec_ready": service.model_obj.word2vec_model is not None
            },
            "data": {
                "csv_file_exists": csv_exists,
                "data_loaded": data_loaded,
                "total_count": len(service.df) if service.df is not None else 0,
                "train_count": len(service.dataset.train) if service.dataset.train is not None else 0,
                "test_count": len(service.dataset.test) if service.dataset.test is not None else 0
            }
        }
        
        # 데이터 분포 정보 추가
        if service.df is not None:
            for label in service.mbti_labels:
                if label in service.df.columns:
                    status["data"][f"{label}_distribution"] = service.df[label].value_counts().to_dict()
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 확인 중 오류 발생: {str(e)}")


@router.get("/health")
async def health_check():
    """서비스 헬스 체크"""
    try:
        service = get_diary_mbti_service()
        
        # CSV 파일 존재 확인
        csv_exists = CSV_FILE_PATH.exists()
        
        # 데이터 로드 가능 여부
        data_loaded = service.df is not None
        
        # 모델 학습 여부
        model_trained = False
        if service.model_obj.models:
            model_trained = any(m is not None for m in service.model_obj.models.values())
        
        # 데이터 통계
        data_stats = {}
        if data_loaded and service.df is not None:
            data_stats = {
                "total_count": len(service.df),
                "mbti_dimensions": service.mbti_labels
            }
            for label in service.mbti_labels:
                if label in service.df.columns:
                    data_stats[f"{label}_distribution"] = service.df[label].value_counts().to_dict()
        
        return {
            "status": "healthy",
            "service": "diary-mbti",
            "csv_file_exists": csv_exists,
            "data_loaded": data_loaded,
            "model_trained": model_trained,
            "data_stats": data_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "diary-mbti",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

