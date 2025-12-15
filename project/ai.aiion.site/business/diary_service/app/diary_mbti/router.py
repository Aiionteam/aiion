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

from diary_mbti.diary_mbti_service import DiaryMbtiService
from diary_mbti.diary_mbti_schema import DiaryMbtiSchema

# 라우터 생성
router = APIRouter(
    prefix="/diary-mbti",
    tags=["diary-mbti"],
    responses={404: {"description": "Not found"}}
)

# 서비스 인스턴스
_diary_mbti_service: Optional[DiaryMbtiService] = None


def get_diary_mbti_service() -> DiaryMbtiService:
    """서비스 인스턴스 싱글톤 패턴 (JSON 파일 사용)"""
    global _diary_mbti_service
    
    if _diary_mbti_service is None:
        # JSON 파일 경로 설정
        data_dir = Path(__file__).parent / "data"
        
        # 현대 일기 + 이순신 일기
        json_files_modern = {
            'E_I': data_dir / "mbti_corpus_modern_E_I_20000.json",
            'S_N': data_dir / "mbti_corpus_modern_S_N_20000.json",
            'T_F': data_dir / "mbti_corpus_modern_T_F_20000.json",
            'J_P': data_dir / "mbti_corpus_modern_J_P_20000.json"
        }
        
        json_files_leesoonsin = {
            'E_I': data_dir / "mbti_leesoonsin_corpus_split_E_I.json",
            'S_N': data_dir / "mbti_leesoonsin_corpus_split_S_N.json",
            'T_F': data_dir / "mbti_leesoonsin_corpus_split_T_F.json",
            'J_P': data_dir / "mbti_leesoonsin_corpus_split_J_P.json"
        }
        
        # 서비스 생성 (두 파일셋 모두 사용)
        _diary_mbti_service = DiaryMbtiService(
            json_files=[json_files_modern, json_files_leesoonsin]
        )
    
    return _diary_mbti_service


class PredictRequest(BaseModel):
    """MBTI 예측 요청 모델"""
    text: str


class TrainRequest(BaseModel):
    """학습 요청 모델 (DL 모델)"""
    epochs: int = 5
    batch_size: int = 24
    freeze_bert_layers: int = 6
    learning_rate: float = 1.5e-5
    max_length: int = 512
    early_stopping_patience: int = 5


@router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Diary MBTI Classification",
        "description": "일기 텍스트를 통한 MBTI 분류 서비스 (DL 전용, KoELECTRA 기반)",
        "model_type": "deep_learning",
        "model_name": "koelectro_v3_base",
        "dimensions": ["E_I", "S_N", "T_F", "J_P"],
        "labels": {
            "E_I": "0=평가불가, 1=E(외향), 2=I(내향)",
            "S_N": "0=평가불가, 1=S(감각), 2=N(직관)",
            "T_F": "0=평가불가, 1=T(사고), 2=F(감정)",
            "J_P": "0=평가불가, 1=J(판단), 2=P(인식)"
        }
    }




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
        
        # DL 모델이 없으면 학습 필요
        if service.dl_model_obj is None or not service.dl_model_obj.models:
            # 모델 로드 시도
            if not service.load_model():
                raise HTTPException(
                    status_code=400, 
                    detail="DL 모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요."
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
    DL 모델 학습 실행 (4개 MBTI 차원별)
    """
    try:
        service = get_diary_mbti_service()
        
        # 요청 파라미터 설정 (기본값 사용)
        epochs = 5
        batch_size = 24
        freeze_bert_layers = 6
        learning_rate = 1.5e-5
        max_length = 512
        early_stopping_patience = 5
        
        if request:
            epochs = request.epochs
            batch_size = request.batch_size
            freeze_bert_layers = request.freeze_bert_layers
            learning_rate = request.learning_rate
            max_length = request.max_length
            early_stopping_patience = request.early_stopping_patience
        
        # 전처리
        service.preprocess()
        
        # DL 모델 학습
        history = service.learning(
            epochs=epochs,
            batch_size=batch_size,
            freeze_bert_layers=freeze_bert_layers,
            learning_rate=learning_rate,
            max_length=max_length,
            early_stopping_patience=early_stopping_patience
        )
        
        # 모델 저장
        service.save_model()
        
        response = {
            "message": "DL 모델 학습이 완료되었습니다.",
            "status": "success",
            "model_type": "dl",
            "model_name": service.dl_model_name,
            "history": history,
            "model_saved": True,
            "model_path": str(service.model_dir),
            "model_files": {
                label: str(service.dl_model_files[label]) 
                for label in service.mbti_labels
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.get("/accuracy")
async def get_accuracy():
    """모델 정확도 확인 (DL 전용)"""
    try:
        service = get_diary_mbti_service()
        
        # DL 모델이 없으면 학습 필요
        if service.dl_model_obj is None or not service.dl_model_obj.models:
            if not service.load_model():
                raise HTTPException(status_code=400, detail="DL 모델이 학습되지 않았습니다. /train 엔드포인트를 먼저 호출하세요.")
        
        # 모델 메타데이터에서 학습 정보 가져오기
        if service.dl_metadata_file.exists():
            import pickle
            with open(service.dl_metadata_file, 'rb') as f:
                metadata = pickle.load(f)
            
            return {
                "message": "DL 모델 학습 정보",
                "model_type": "deep_learning",
                "model_name": metadata.get('model_name', 'koelectro_v3_base'),
                "trained_at": metadata.get('trained_at', 'N/A'),
                "data_count": metadata.get('data_count', 0),
                "dimensions": metadata.get('mbti_labels', service.mbti_labels),
                "note": "DL 모델의 정확도는 학습 중 검증 데이터로 측정됩니다. /train 엔드포인트 응답에서 확인하세요."
            }
        else:
            return {
                "message": "DL 모델 메타데이터가 없습니다.",
                "model_type": "deep_learning",
                "note": "모델이 학습되지 않았거나 메타데이터 파일이 없습니다."
            }
        
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
            ("E_I DL model", service.dl_model_files['E_I']),
            ("S_N DL model", service.dl_model_files['S_N']),
            ("T_F DL model", service.dl_model_files['T_F']),
            ("J_P DL model", service.dl_model_files['J_P']),
            ("DL metadata", service.dl_metadata_file)
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
        
        # 메모리의 DL 모델도 초기화
        if service.dl_model_obj:
            service.dl_model_obj.models = {}
        service.dl_trainer = None
        
        return {
            "message": "모델이 초기화되었습니다.",
            "deleted_files": deleted_files,
            "total_deleted": len(deleted_files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 초기화 중 오류 발생: {str(e)}")


@router.get("/status")
async def service_status():
    """서비스 상태 및 통계 (DL 전용)"""
    try:
        service = get_diary_mbti_service()
        
        # 데이터 로드 가능 여부
        data_loaded = service.df is not None
        
        # DL 모델 학습 여부
        models_loaded = False
        if service.dl_model_obj and service.dl_model_obj.models:
            models_loaded = any(m is not None for m in service.dl_model_obj.models.values())
        
        # MBTI 차원별 DL 모델 상태
        mbti_labels = []
        if service.dl_model_obj and service.dl_model_obj.models:
            for label in service.mbti_labels:
                if label in service.dl_model_obj.models and service.dl_model_obj.models[label] is not None:
                    mbti_labels.append(label)
        
        status = {
            "service": "Diary MBTI Classification",
            "version": "3.0.0",  # JSON 전용 DL 버전
            "model_type": "dl",  # DL 전용
            "data_source": "json",  # JSON 전용
            "data_loaded": data_loaded,
            "models_loaded": models_loaded,
            "mbti_labels": mbti_labels,
            "model": {
                "type": "deep_learning",
                "model_name": service.dl_model_name,
                "trained": models_loaded,
                "dimensions": service.mbti_labels
            },
            "data": {
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
    """서비스 헬스 체크 (DL 전용)"""
    try:
        service = get_diary_mbti_service()
        
        # 데이터 로드 가능 여부
        data_loaded = service.df is not None
        
        # DL 모델 학습 여부
        model_trained = False
        if service.dl_model_obj and service.dl_model_obj.models:
            model_trained = any(m is not None for m in service.dl_model_obj.models.values())
        
        # 데이터 통계
        data_stats = {}
        if data_loaded and service.df is not None:
            data_stats = {
                "total_count": len(service.df),
                "mbti_dimensions": service.mbti_labels,
                "model_type": "deep_learning"
            }
            for label in service.mbti_labels:
                if label in service.df.columns:
                    data_stats[f"{label}_distribution"] = service.df[label].value_counts().to_dict()
        
        return {
            "status": "healthy",
            "service": "diary-mbti",
            "model_type": "dl",
            "data_source": "json",
            "data_loaded": data_loaded,
            "model_trained": model_trained,
            "data_stats": data_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "diary-mbti",
            "model_type": "dl",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

