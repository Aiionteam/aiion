"""
Titanic Router - FastAPI 라우터
타이타닉 승객 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import csv
from typing import List, Dict
from app.titanic.titanic_service import TitanicService

# 라우터 생성
router = APIRouter(
    prefix="/passengers",
    tags=["passengers"],
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

@router.get("")
async def get_all_passengers():
    """test.csv에서 전체 승객 정보를 반환"""
    passengers = load_all_passengers(TEST_CSV_PATH)
    if not passengers:
        raise HTTPException(
            status_code=404,
            detail="승객 데이터를 찾을 수 없습니다."
        )
    return passengers


@router.get("/id/{passenger_id}")
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
    """데이터 전처리 실행"""
    try:
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
