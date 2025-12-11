"""
Titanic Router - FastAPI 라우터
타이타닉 승객 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pathlib import Path
import csv
import io
from typing import List, Dict
from app.titanic.titanic_service import TitanicService

# 라우터 생성
router = APIRouter(
    prefix="/titanic",
    tags=["titanic"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로
TRAIN_CSV_PATH = Path(__file__).parent / "train.csv"
TEST_CSV_PATH = Path(__file__).parent / "test.csv"


def load_all_passengers(csv_path: Path) -> List[Dict[str, str]]:
    """CSV 파일에서 전체 승객 정보를 로드"""
    passengers = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                passengers.append({
                    "PassengerId": row.get("PassengerId", ""),
                    "Survived": row.get("Survived", ""),  # test.csv에는 없을 수 있음
                    "Pclass": row.get("Pclass", ""),
                    "Name": row.get("Name", ""),
                    "Sex": row.get("Sex", ""),
                    "Age": row.get("Age", ""),
                    "SibSp": row.get("SibSp", ""),
                    "Parch": row.get("Parch", ""),
                    "Ticket": row.get("Ticket", ""),
                    "Fare": row.get("Fare", ""),
                    "Cabin": row.get("Cabin", ""),
                    "Embarked": row.get("Embarked", "")
                })
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"CSV 파일 읽기 오류: {e}")
        return []
    return passengers

@router.get("/passengers")
async def get_all_passengers():
    """test.csv에서 전체 승객 정보를 반환"""
    passengers = load_all_passengers(TEST_CSV_PATH)
    if not passengers:
        raise HTTPException(
            status_code=404,
            detail="승객 데이터를 찾을 수 없습니다."
        )
    return passengers


@router.get("/passengers/{passenger_id}")
async def get_passenger_by_id(passenger_id: int):
    """PassengerId로 승객 조회 (test.csv에서)"""
    try:
        with open(TEST_CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if int(row.get("PassengerId", 0)) == passenger_id:
                    return {
                        "PassengerId": row.get("PassengerId", ""),
                        "Survived": row.get("Survived", ""),  # test.csv에는 없을 수 있음
                        "Pclass": row.get("Pclass", ""),
                        "Name": row.get("Name", ""),
                        "Sex": row.get("Sex", ""),
                        "Age": row.get("Age", ""),
                        "SibSp": row.get("SibSp", ""),
                        "Parch": row.get("Parch", ""),
                        "Ticket": row.get("Ticket", ""),
                        "Fare": row.get("Fare", ""),
                        "Cabin": row.get("Cabin", ""),
                        "Embarked": row.get("Embarked", "")
                    }
        raise HTTPException(status_code=404, detail=f"PassengerId {passenger_id}를 찾을 수 없습니다.")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="승객 데이터 파일을 찾을 수 없습니다.")
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 PassengerId 형식입니다.")


@router.post("/preprocess")
async def preprocess_data():
    """데이터 전처리 실행 (기본 설정 사용)"""
    try:
        # 기본 설정으로 서비스 생성 (환경변수 또는 기본값 사용)
        service = TitanicService()
        result = service.preprocess()
        return {
            "message": "전처리 완료",
            "data": result
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"CSV 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"전처리 중 오류 발생: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # 서버 로그에 출력
        raise HTTPException(status_code=500, detail=f"전처리 중 오류 발생: {str(e)}")


@router.post("/train")
async def train_model(tune: bool = Query(False, description="하이퍼파라미터 튜닝 수행 여부 (기본값: False)")):
    """LightGBM 모델 학습 (전처리 + 학습 + 평가)
    
    Args:
        tune: 하이퍼파라미터 튜닝 수행 여부
             - False: 기본 파라미터로 빠른 학습
             - True: RandomizedSearchCV로 하이퍼파라미터 튜닝 (시간 소요, 정확도 향상 가능)
    """
    try:
        service = TitanicService()
        result = service.train(tune_hyperparameters=tune)
        return result
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"라이브러리 오류: {str(e)}")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"CSV 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"학습 중 오류 발생: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # 서버 로그에 출력
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.post("/train/tune")
async def train_model_with_tuning():
    """LightGBM 모델 학습 (하이퍼파라미터 튜닝 포함)
    
    RandomizedSearchCV를 사용하여 최적의 하이퍼파라미터를 찾고 학습합니다.
    시간이 소요되지만 정확도가 향상될 수 있습니다.
    """
    try:
        service = TitanicService()
        result = service.train(tune_hyperparameters=True)
        return result
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"라이브러리 오류: {str(e)}")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"CSV 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"학습 중 오류 발생: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # 서버 로그에 출력
        raise HTTPException(status_code=500, detail=f"학습 중 오류 발생: {str(e)}")


@router.get("/submission")
async def get_submission_csv():
    """캐글 제출용 CSV 파일 다운로드
    
    test.csv에 대한 예측 결과를 캐글 제출 형식(PassengerId, Survived)으로 생성하여 다운로드합니다.
    모델이 학습되어 있어야 합니다.
    """
    try:
        service = TitanicService()
        submission_df = service.predict_submission()
        
        # CSV를 메모리에 생성
        output = io.StringIO()
        submission_df.to_csv(output, index=False)
        output.seek(0)
        
        # StreamingResponse로 반환
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=titanic_submission.csv"
            }
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"모델 파일을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"예측 중 오류 발생: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=500, detail=f"예측 중 오류 발생: {str(e)}")


@router.post("/reset")
async def reset_model():
    """모델 초기화 - 저장된 모델 파일 삭제"""
    try:
        # 모델 파일 경로 (titanic/models/ 폴더)
        model_dir = Path(__file__).parent / "models"
        model_file = model_dir / "titanic_lightgbm_model.pkl"
        
        deleted_files = []
        
        # 모델 파일 삭제
        if model_file.exists():
            try:
                model_file.unlink()
                deleted_files.append("titanic_lightgbm_model.pkl")
            except Exception as e:
                return {
                    "message": f"모델 초기화 중 오류 발생: 모델 파일 삭제 실패",
                    "error": str(e),
                    "deleted_files": deleted_files
                }
        
        return {
            "message": "모델이 초기화되었습니다.",
            "status": "success",
            "deleted_files": deleted_files,
            "deleted_count": len(deleted_files),
            "model_path": str(model_file.absolute())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"초기화 오류: {str(e)}")
