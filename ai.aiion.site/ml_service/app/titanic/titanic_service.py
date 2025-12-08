"""
타이타닉 데이터 서비스
판다스, 넘파이, 사이킷런을 사용한 데이터 처리 및 머신러닝 서비스
"""
import sys
from pathlib import Path
from typing import List, Dict, Optional, Any, ParamSpecArgs
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from icecream import ic

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.titanic.titanic_method import TitanicMethod


class TitanicService:
    """타이타닉 데이터 처리 및 머신러닝 서비스"""
    
    def __init__(self):
        pass


    def preprocess(self) -> Dict[str, Any]:
        """데이터 전처리 및 정보 반환"""
        def clean_for_json(obj):
            """DataFrame의 NaN, inf 값을 None으로 변환하고 boolean을 int로 변환하여 JSON 직렬화 가능하게 함"""
            if isinstance(obj, bool):
                return 1 if obj else 0
            elif isinstance(obj, (np.integer, np.floating)):
                if np.isnan(obj) or np.isinf(obj):
                    return None
                return float(obj) if isinstance(obj, np.floating) else int(obj)
            elif isinstance(obj, dict):
                return {k: clean_for_json(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [clean_for_json(item) for item in obj]
            elif isinstance(obj, pd.Series):
                return clean_for_json(obj.to_dict())
            elif isinstance(obj, pd.DataFrame):
                return clean_for_json(obj.to_dict('records'))
            return obj
        
        try:
            ic("😎😎 전처리 시작")
            the_method = TitanicMethod()
            
            # CSV 파일 경로 설정
            base_path = Path(__file__).parent
            train_csv_path = base_path / 'train.csv'
            test_csv_path = base_path / 'test.csv'
            
            # 파일 존재 확인
            if not train_csv_path.exists():
                raise FileNotFoundError(f"Train CSV 파일을 찾을 수 없습니다: {train_csv_path}")
            if not test_csv_path.exists():
                raise FileNotFoundError(f"Test CSV 파일을 찾을 수 없습니다: {test_csv_path}")
            
            ic(f"Train CSV 경로: {train_csv_path}")
            ic(f"Test CSV 경로: {test_csv_path}")
            
            # Train 데이터 전처리
            ic("Train 데이터 로드 시작...")
            df_train = the_method.new_model(str(train_csv_path))
            ic(f"Train 데이터 로드 완료: {len(df_train)}행")
            
            this_train = the_method.create_train(df_train, 'Survived')
            ic(f'1. Train 의 type \n {type(this_train)} ')
            ic(f'2. Train 의 column \n {this_train.columns.tolist()} ')
            ic(f'3. Train 의 상위 5개 행\n {this_train.head(5)} ')
            ic(f'4. Train 의 null 의 갯수\n {the_method.check_null(this_train)}개')
            
            drop_features = ['SibSp', 'Parch', 'Cabin', 'Ticket']
            this_train = the_method.drop_features(this_train, *drop_features)
            this_train = the_method.pclass_ordinal(this_train)
            this_train = the_method.fare_ratio(this_train)
            this_train = the_method.embarked_nominal(this_train)
            this_train = the_method.gender_nominal(this_train)
            this_train = the_method.age_ratio(this_train)
            this_train = the_method.title_nominal(this_train)
            drop_name = ['Name']
            this_train = the_method.drop_features(this_train, *drop_name)
            
            ic("😎😎 Train 전처리 완료")
            ic(f'1. Train 의 type \n {type(this_train)} ')
            ic(f'2. Train 의 column \n {this_train.columns.tolist()} ')
            ic(f'3. Train 의 상위 5개 행\n {this_train.head(5)} ')
            ic(f'4. Train 의 null 의 갯수\n {the_method.check_null(this_train)}개')
            
            # Test 데이터 전처리
            ic("Test 데이터 로드 시작...")
            df_test = the_method.new_model(str(test_csv_path))
            ic(f"Test 데이터 로드 완료: {len(df_test)}행")
            this_test = df_test.copy()
            ic(f'1. Test 의 type \n {type(this_test)} ')
            ic(f'2. Test 의 column \n {this_test.columns.tolist()} ')
            ic(f'3. Test 의 상위 5개 행\n {this_test.head(5)} ')
            ic(f'4. Test 의 null 의 갯수\n {the_method.check_null(this_test)}개')
            
            drop_features_test = ['SibSp', 'Parch', 'Cabin', 'Ticket']
            this_test = the_method.drop_features(this_test, *drop_features_test)
            this_test = the_method.pclass_ordinal(this_test)
            this_test = the_method.fare_ratio(this_test)
            this_test = the_method.embarked_nominal(this_test)
            this_test = the_method.gender_nominal(this_test)
            this_test = the_method.age_ratio(this_test)
            this_test = the_method.title_nominal(this_test)
            drop_name_test = ['Name']
            this_test = the_method.drop_features(this_test, *drop_name_test)
            
            ic("😎😎 Test 전처리 완료")
            ic(f'1. Test 의 type \n {type(this_test)} ')
            ic(f'2. Test 의 column \n {this_test.columns.tolist()} ')
            ic(f'3. Test 의 상위 5개 행\n {this_test.head(5)} ')
            ic(f'4. Test 의 null 의 갯수\n {the_method.check_null(this_test)}개')
            ic("😎😎 전체 전처리 완료")
            
            # boolean과 문자열 컬럼을 int로 변환하고 원본 문자열 컬럼 제거
            def convert_to_int(df: pd.DataFrame) -> pd.DataFrame:
                """boolean과 문자열 컬럼을 int로 변환하고 원본 문자열 컬럼 제거"""
                df = df.copy()
                
                # 제거할 원본 문자열 컬럼 목록
                cols_to_drop = []
                
                # boolean 컬럼들을 int로 변환
                for col in df.columns:
                    if df[col].dtype == bool or df[col].dtype == 'bool':
                        df[col] = df[col].astype(int)
                    elif df[col].dtype == object:
                        # 문자열 컬럼 처리
                        if col == 'gender' or col == 'Sex':
                            # gender는 one-hot encoding이 있으므로 원본 제거
                            cols_to_drop.append(col)
                        elif col == 'Age_band':
                            # Age_band는 ordinal이 있으므로 원본 제거
                            cols_to_drop.append(col)
                        elif col == 'Embarked':
                            # Embarked는 one-hot encoding이 있으므로 원본 제거
                            cols_to_drop.append(col)
                        elif col == 'Title':
                            # Title은 one-hot encoding이 있으므로 원본 제거
                            cols_to_drop.append(col)
                
                # 원본 문자열 컬럼 제거
                if cols_to_drop:
                    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
                
                return df
            
            # Train과 Test 데이터를 int로 변환
            this_train_int = convert_to_int(this_train)
            this_test_int = convert_to_int(this_test)
            
            # 결과 반환
            result = {
                "train": {
                    "type": str(type(this_train_int)),
                    "columns": this_train_int.columns.tolist(),
                    "head": clean_for_json(this_train_int.head(5).to_dict('records')),
                    "null_count": int(the_method.check_null(this_train_int))
                },
                "test": {
                    "type": str(type(this_test_int)),
                    "columns": this_test_int.columns.tolist(),
                    "head": clean_for_json(this_test_int.head(5).to_dict('records')),
                    "null_count": int(the_method.check_null(this_test_int))
                }
            }
            
            ic("결과 반환 준비 완료")
            return result
            
        except FileNotFoundError as e:
            ic(f"파일을 찾을 수 없음: {e}")
            raise
        except Exception as e:
            ic(f"전처리 중 에러 발생: {type(e).__name__}: {str(e)}")
            import traceback
            ic(traceback.format_exc())
            raise

    def modeling(self):
        ic("😎😎 모델링 시작")
        ic("😎😎 모델링 완료")

    def learning(self):
        ic("😎😎 학습 시작")
        ic("😎😎 학습 완료")

    def evaluate(self):
        ic("😎😎 평가 시작")
        ic("😎😎 평가 완료")


    def submit(self):
        ic("😎😎 제출 시작")
        ic("😎😎 제출 완료")