"""
Titanic Router - FastAPI 라우터
타이타닉 승객 관련 엔드포인트를 정의
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import csv
from typing import List, Dict

# 라우터 생성
router = APIRouter(
    prefix="/passengers",
    tags=["passengers"],
    responses={404: {"description": "Not found"}}
)

# CSV 파일 경로
CSV_FILE_PATH = Path(__file__).parent / "train.csv"


def load_top_10_passengers() -> List[Dict[str, str]]:
    """train.csv에서 상위 10명의 승객 정보를 로드"""
    passengers = []
    try:
        with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= 10:  # 상위 10명만
                    break
                passengers.append({
                    "PassengerId": row.get("PassengerId", ""),
                    "Survived": row.get("Survived", ""),
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


@router.get("/top10")
async def get_top_10_passengers():
    """상위 10명의 승객 정보를 반환"""
    passengers = load_top_10_passengers()
    if not passengers:
        raise HTTPException(
            status_code=404,
            detail="승객 데이터를 찾을 수 없습니다."
        )
    return {
        "count": len(passengers),
        "passengers": passengers
    }


@router.get("/top10/print")
async def print_top_10_passengers():
    """상위 10명의 승객 정보를 터미널에 출력"""
    passengers = load_top_10_passengers()
    if not passengers:
        return {"message": "출력할 승객 데이터가 없습니다."}
    
    # 터미널에 출력
    print("\n" + "="*80)
    print("타이타닉 승객 상위 10명")
    print("="*80)
    for i, passenger in enumerate(passengers, 1):
        print(f"\n[{i}] {passenger['Name']}")
        print(f"    PassengerId: {passenger['PassengerId']}")
        print(f"    Survived: {passenger['Survived']} ({'생존' if passenger['Survived'] == '1' else '사망'})")
        print(f"    Pclass: {passenger['Pclass']}")
        print(f"    Sex: {passenger['Sex']}")
        print(f"    Age: {passenger['Age']}")
        print(f"    Fare: {passenger['Fare']}")
        print(f"    Embarked: {passenger['Embarked']}")
    print("\n" + "="*80)
    
    return {
        "message": "상위 10명의 승객 정보를 터미널에 출력했습니다.",
        "count": len(passengers)
    }


@router.get("/id/{passenger_id}")
async def get_passenger_by_id(passenger_id: int):
    """PassengerId로 승객 조회"""
    try:
        with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if int(row.get("PassengerId", 0)) == passenger_id:
                    return {
                        "PassengerId": row.get("PassengerId", ""),
                        "Survived": row.get("Survived", ""),
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
