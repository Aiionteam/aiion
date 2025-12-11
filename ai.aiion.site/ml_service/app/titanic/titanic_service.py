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
from app.titanic.titanic_dataset import TitanicDataSet

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.titanic.titanic_method import TitanicMethod
from app.titanic.titanic_config import TitanicConfig


class TitanicService:
    """타이타닉 데이터 처리 및 머신러닝 서비스"""
    
    def __init__(self, config: Optional[TitanicConfig] = None):
        """초기화
        
        Args:
            config: 타이타닉 설정 객체 (None이면 기본 설정 사용)
        """
        self.config = config or TitanicConfig.default()
        self.config.validate()
    
    def preprocess(self, config: Optional[TitanicConfig] = None) -> Dict[str, Any]:
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
            
            # 설정 사용 (파라미터로 전달된 설정이 있으면 사용, 없으면 인스턴스 설정 사용)
            config = config or self.config
            config.validate()
            
            the_method = TitanicMethod(config)
            
            ic(f"Train CSV 경로: {config.train_csv_path}")
            ic(f"Test CSV 경로: {config.test_csv_path}")
            
            # Train과 Test 데이터 합쳐서 로드
            ic("Train과 Test 데이터 로드 시작...")
            df_combined, df_test_original = the_method.new_model(
                str(config.train_csv_path), 
                str(config.test_csv_path) if config.test_csv_path else None
            )
            ic(f"합쳐진 데이터 로드 완료: {len(df_combined)}행")
            
            # train과 test 분리 (label_column이 None인 것이 test)
            train_mask = df_combined[config.label_column].notna()
            df_train_combined = df_combined[train_mask].copy()
            df_test_combined = df_combined[~train_mask].copy()
            
            train_len = len(df_train_combined)
            test_len = len(df_test_combined)
            ic(f"Train 데이터: {train_len}행, Test 데이터: {test_len}행")
            
            # 합쳐진 데이터로 전처리 (label_column 제거)
            this = the_method.create_train(df_combined, config.label_column)
            ic(f'1. 합쳐진 데이터 type \n {type(this)} ')
            ic(f'2. 합쳐진 데이터 column \n {this.columns.tolist()} ')
            ic(f'3. 합쳐진 데이터 상위 5개 행\n {this.head(5)} ')
            ic(f'4. 합쳐진 데이터 null 의 갯수\n {this.isnull().sum().sum()}개')
            
            # 전처리 수행 (설정 기반)
            # 1. 피처 삭제
            for feature in config.drop_features:
                if feature in this.columns:
                    this = this.drop(columns=[feature])
            
            # 2. 전처리 파이프라인 실행 (설정 기반)
            preprocessing_map = {
                'pclass_ordinal': the_method.pclass_ordinal,
                'fare_ratio': the_method.fare_ratio,
                'embarked_nominal': the_method.embarked_nominal,
                'gender_nominal': the_method.gender_nominal,
                'age_ratio': the_method.age_ratio,
                'title_nominal': the_method.title_nominal,
            }
            
            for step_name in config.preprocessing_steps:
                if step_name in preprocessing_map:
                    ic(f"전처리 단계 실행: {step_name}")
                    this = preprocessing_map[step_name](this)
                else:
                    ic(f"⚠️ 알 수 없는 전처리 단계: {step_name}")
            
            # 전처리 후 train과 test로 다시 분리 (원본 인덱스 기준)
            this_train = this.iloc[:train_len].copy()
            this_test = this.iloc[train_len:].copy()
            

            
            ic("😎😎 Train, Test 전처리 완료")
            ic(f'1. Train 의 type \n {type(this_train)} ')
            ic(f'2. Train 의 column \n {this_train.columns.tolist()} ')
            ic(f'3. Train 의 상위 5개 행\n {this_train.head(5)} ')
            ic(f'4. Train 의 null 의 갯수\n {this_train.isnull().sum().sum()}개')
            ic(f'1. Test 의 type \n {type(this_test)} ')
            ic(f'2. Test 의 column \n {this_test.columns.tolist()} ')
            ic(f'3. Test 의 상위 5개 행\n {this_test.head(5)} ')
            ic(f'4. Test 의 null 의 갯수\n {this_test.isnull().sum().sum()}개')
        
            
            # 모든 컬럼을 int로 변환하고 원본 문자열 컬럼 제거
            def convert_to_int(df: pd.DataFrame) -> pd.DataFrame:
                """모든 컬럼을 int로 변환하고 원본 문자열/category 컬럼 제거 (설정 기반)"""
                df = df.copy()
                
                # 제거할 원본 문자열/category 컬럼 목록 (설정에서 가져옴)
                cols_to_drop = []
                
                # 모든 컬럼을 int로 변환
                for col in df.columns:
                    # Categorical 타입 처리 (LightGBM이 직접 처리하지 못함)
                    if pd.api.types.is_categorical_dtype(df[col]):
                        # Age_band 같은 경우 이미 Age_band_ordinal이 있으므로 제거
                        if col == 'Age_band':
                            cols_to_drop.append(col)
                        else:
                            # 다른 categorical은 숫자로 변환 시도
                            try:
                                df[col] = df[col].cat.codes
                            except:
                                cols_to_drop.append(col)
                    elif df[col].dtype == bool or df[col].dtype == 'bool':
                        # boolean을 int로 변환
                        df[col] = df[col].astype(int)
                    elif df[col].dtype == object:
                        # 문자열 컬럼 처리
                        if col in config.columns_to_drop_after_encoding:
                            # 설정에 명시된 컬럼은 제거
                            cols_to_drop.append(col)
                        elif col == 'Title':
                            # Title은 Label encoding으로 숫자로 변환되어야 함
                            # 만약 아직 object라면 숫자로 변환 시도
                            try:
                                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                            except:
                                cols_to_drop.append(col)
                        else:
                            # 기타 object 컬럼은 제거 (예상치 못한 문자열 컬럼)
                            cols_to_drop.append(col)
                    elif pd.api.types.is_numeric_dtype(df[col]):
                        # 숫자형 컬럼(float, int 등)을 int로 변환
                        # NaN이 있으면 먼저 0으로 채우기
                        if df[col].isnull().any():
                            df[col] = df[col].fillna(0)
                        df[col] = df[col].astype(int)
                
                # 원본 문자열/category 컬럼 제거
                if cols_to_drop:
                    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
                
                # 최종 검증: 모든 컬럼이 int인지 확인
                non_int_cols = []
                for col in df.columns:
                    if not pd.api.types.is_integer_dtype(df[col]):
                        non_int_cols.append({
                            'column': col,
                            'dtype': str(df[col].dtype),
                            'sample_values': df[col].head(3).tolist()
                        })
                
                if non_int_cols:
                    ic(f"⚠️ 경고: int가 아닌 컬럼 발견: {non_int_cols}")
                    # 강제로 int 변환 시도
                    for col_info in non_int_cols:
                        col = col_info['column']
                        try:
                            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                            ic(f"강제 변환 성공: {col} -> int")
                        except Exception as e:
                            ic(f"⚠️ 강제 변환 실패: {col} - {e}")
                            # 변환 실패한 컬럼은 삭제
                            if col in df.columns:
                                df = df.drop(columns=[col])
                                ic(f"컬럼 삭제: {col}")
                else:
                    ic("✓ 모든 컬럼이 int 타입으로 변환되었습니다.")
                
                ic(f"변환 후 컬럼: {list(df.columns)}")
                ic(f"변환 후 타입: {df.dtypes.to_dict()}")
                
                # 최종 검증: 모든 컬럼이 int인지 재확인
                final_check = all(pd.api.types.is_integer_dtype(df[col]) for col in df.columns)
                if not final_check:
                    remaining_non_int = [
                        {'col': col, 'dtype': str(df[col].dtype)}
                        for col in df.columns
                        if not pd.api.types.is_integer_dtype(df[col])
                    ]
                    ic(f"❌ 최종 검증 실패: int가 아닌 컬럼 존재 - {remaining_non_int}")
                else:
                    ic("✓ 최종 검증 통과: 모든 컬럼이 int 타입입니다.")
                
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

    def train(self, config: Optional[TitanicConfig] = None, tune_hyperparameters: bool = False) -> Dict[str, Any]:
        """LightGBM 모델 학습 (전처리 + 학습 + 평가)
        
        Args:
            config: 타이타닉 설정 객체
            tune_hyperparameters: 하이퍼파라미터 튜닝 수행 여부 (기본값: False)
        """
        try:
            ic("😎😎 학습 시작")
            
            # 설정 사용
            config = config or self.config
            config.validate()
            
            # LightGBM import
            try:
                import lightgbm as lgb
            except ImportError:
                raise ImportError("LightGBM이 설치되지 않았습니다. 'pip install lightgbm'을 실행하세요.")
            
            the_method = TitanicMethod(config)
            
            ic(f"Train CSV 경로: {config.train_csv_path}")
            ic(f"Test CSV 경로: {config.test_csv_path}")
            
            # Train과 Test 데이터 합쳐서 로드
            ic("Train과 Test 데이터 로드 시작...")
            df_combined, df_test_original = the_method.new_model(
                str(config.train_csv_path), 
                str(config.test_csv_path) if config.test_csv_path else None
            )
            ic(f"합쳐진 데이터 로드 완료: {len(df_combined)}행")
            
            # train과 test 분리 (label_column이 None인 것이 test)
            train_mask = df_combined[config.label_column].notna()
            df_train_combined = df_combined[train_mask].copy()
            df_test_combined = df_combined[~train_mask].copy()
            
            train_len = len(df_train_combined)
            test_len = len(df_test_combined)
            ic(f"Train 데이터: {train_len}행, Test 데이터: {test_len}행")
            
            # 라벨 추출 (학습 전에)
            y_train_all = df_train_combined[config.label_column].copy()
            # 라벨을 int로 변환 (float나 object 타입일 수 있음)
            y_train_all = y_train_all.astype(int)
            ic(f"라벨 타입: {y_train_all.dtype}, 고유값: {y_train_all.unique()}")
            
            # 합쳐진 데이터로 전처리 (label_column 제거)
            this = the_method.create_train(df_combined, config.label_column)
            ic(f"전처리 시작: {len(this)}행, {len(this.columns)}개 컬럼")
            
            # 전처리 수행 (설정 기반)
            # 1. 피처 삭제
            for feature in config.drop_features:
                if feature in this.columns:
                    this = this.drop(columns=[feature])
            
            # 2. 전처리 파이프라인 실행
            preprocessing_map = {
                'pclass_ordinal': the_method.pclass_ordinal,
                'fare_ratio': the_method.fare_ratio,
                'embarked_nominal': the_method.embarked_nominal,
                'gender_nominal': the_method.gender_nominal,
                'age_ratio': the_method.age_ratio,
                'title_nominal': the_method.title_nominal,
            }
            
            for step_name in config.preprocessing_steps:
                if step_name in preprocessing_map:
                    ic(f"전처리 단계 실행: {step_name}")
                    this = preprocessing_map[step_name](this)
            
            # 전처리 후 train과 test로 다시 분리
            X_train_all = this.iloc[:train_len].copy()
            X_test = this.iloc[train_len:].copy()
            
            # int로 변환
            def convert_to_int(df: pd.DataFrame) -> pd.DataFrame:
                """모든 컬럼을 int로 변환하고 원본 문자열/category 컬럼 제거 (LightGBM 호환)"""
                df = df.copy()
                cols_to_drop = []
                
                for col in df.columns:
                    # Categorical 타입 처리 (LightGBM이 직접 처리하지 못함)
                    if pd.api.types.is_categorical_dtype(df[col]):
                        # Age_band 같은 경우 이미 Age_band_ordinal이 있으므로 제거
                        if col == 'Age_band':
                            cols_to_drop.append(col)
                        else:
                            # 다른 categorical은 숫자로 변환 시도
                            try:
                                df[col] = df[col].cat.codes
                            except:
                                cols_to_drop.append(col)
                    elif df[col].dtype == bool or df[col].dtype == 'bool':
                        df[col] = df[col].astype(int)
                    elif df[col].dtype == object:
                        if col in config.columns_to_drop_after_encoding:
                            cols_to_drop.append(col)
                        elif col == 'Title':
                            try:
                                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                            except:
                                cols_to_drop.append(col)
                        else:
                            cols_to_drop.append(col)
                    elif pd.api.types.is_numeric_dtype(df[col]):
                        if df[col].isnull().any():
                            df[col] = df[col].fillna(0)
                        df[col] = df[col].astype(int)
                
                if cols_to_drop:
                    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
                
                # 최종 검증: 모든 컬럼이 int인지 확인
                non_int_cols = []
                for col in df.columns:
                    if not pd.api.types.is_integer_dtype(df[col]):
                        non_int_cols.append({
                            'column': col,
                            'dtype': str(df[col].dtype),
                            'sample_values': df[col].head(3).tolist()
                        })
                
                if non_int_cols:
                    ic(f"⚠️ 경고: int가 아닌 컬럼 발견: {non_int_cols}")
                    # 강제로 int 변환 시도
                    for col_info in non_int_cols:
                        col = col_info['column']
                        try:
                            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                            ic(f"강제 변환 성공: {col} -> int")
                        except Exception as e:
                            ic(f"⚠️ 강제 변환 실패: {col} - {e}")
                            # 변환 실패한 컬럼은 삭제
                            if col in df.columns:
                                df = df.drop(columns=[col])
                                ic(f"컬럼 삭제: {col}")
                else:
                    ic("✓ 모든 컬럼이 int 타입으로 변환되었습니다.")
                
                ic(f"변환 후 컬럼: {list(df.columns)}")
                ic(f"변환 후 타입: {df.dtypes.to_dict()}")
                
                # 최종 검증: 모든 컬럼이 int인지 재확인
                final_check = all(pd.api.types.is_integer_dtype(df[col]) for col in df.columns)
                if not final_check:
                    remaining_non_int = [
                        {'col': col, 'dtype': str(df[col].dtype)}
                        for col in df.columns
                        if not pd.api.types.is_integer_dtype(df[col])
                    ]
                    ic(f"❌ 최종 검증 실패: int가 아닌 컬럼 존재 - {remaining_non_int}")
                else:
                    ic("✓ 최종 검증 통과: 모든 컬럼이 int 타입입니다.")
                
                return df
            
            X_train_all = convert_to_int(X_train_all)
            X_test = convert_to_int(X_test)
            
            ic(f"전처리 완료: X_train={X_train_all.shape}, X_test={X_test.shape}")
            
            # Train/Test split
            from sklearn.model_selection import train_test_split
            X_train, X_val, y_train, y_val = train_test_split(
                X_train_all, y_train_all, test_size=0.2, random_state=42, stratify=y_train_all
            )
            
            ic(f"학습/검증 분할: train={X_train.shape}, val={X_val.shape}")
            
            # LightGBM 모델 학습
            best_params = None
            best_cv_score = None
            
            if tune_hyperparameters:
                ic("하이퍼파라미터 튜닝 시작...")
                from sklearn.model_selection import RandomizedSearchCV
                
                # 하이퍼파라미터 그리드 정의 (빠른 탐색을 위해 범위 축소)
                param_distributions = {
                    'n_estimators': [100, 200],
                    'max_depth': [3, 5, 7],
                    'learning_rate': [0.05, 0.1, 0.2],
                    'num_leaves': [31, 50],
                    'min_child_samples': [20, 30],
                    'subsample': [0.8, 0.9],
                    'colsample_bytree': [0.8, 0.9],
                    'reg_alpha': [0, 0.1],
                    'reg_lambda': [0, 0.1]
                }
                
                # 기본 모델
                base_model = lgb.LGBMClassifier(
                    objective='binary',
                    metric='binary_logloss',
                    random_state=42,
                    verbose=-1
                )
                
                # RandomizedSearchCV로 튜닝 (빠른 탐색 - 시간 단축)
                random_search = RandomizedSearchCV(
                    base_model,
                    param_distributions=param_distributions,
                    n_iter=20,  # 20번 랜덤 시도 (50 -> 20으로 감소)
                    cv=3,  # 3-fold 교차 검증 (5 -> 3으로 감소, 총 60번 학습)
                    scoring='accuracy',
                    n_jobs=-1,
                    random_state=42,
                    verbose=1
                )
                
                ic("교차 검증으로 하이퍼파라미터 탐색 중... (시간이 소요될 수 있습니다)")
                ic(f"총 {random_search.n_iter}번 시도 × {random_search.cv} fold = {random_search.n_iter * random_search.cv}번 학습 예정")
                
                # 진행 상황을 출력하기 위해 fit 실행
                import time
                start_time = time.time()
                random_search.fit(X_train, y_train)
                elapsed_time = time.time() - start_time
                ic(f"하이퍼파라미터 튜닝 완료 (소요 시간: {elapsed_time:.1f}초)")
                model = random_search.best_estimator_
                best_params = random_search.best_params_
                best_cv_score = random_search.best_score_
                
                ic(f"✅ 최적 하이퍼파라미터: {best_params}")
                ic(f"✅ 최적 교차 검증 점수: {best_cv_score:.4f}")
                
                # 최적 모델로 최종 학습 (전체 train 데이터 사용)
                ic("최적 파라미터로 전체 학습 데이터로 재학습 중...")
                model.fit(
                    X_train_all, y_train_all,
                    eval_set=[(X_val, y_val)],
                    callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)]
                )
                ic(f"✅ 하이퍼파라미터 튜닝된 모델 재학습 완료")
                ic(f"✅ 저장될 모델 타입: {type(model)}")
                ic(f"✅ 저장될 모델 파라미터: {model.get_params()}")
            else:
                ic("LightGBM 모델 학습 중...")
                model = lgb.LGBMClassifier(
                    n_estimators=100,
                    max_depth=5,
                    learning_rate=0.1,
                    random_state=42,
                    objective='binary',
                    metric='binary_logloss',
                    verbose=-1
                )
                
                model.fit(
                    X_train, y_train,
                    eval_set=[(X_val, y_val)],
                    callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)]
                )
            
            # 평가 (하이퍼파라미터 튜닝의 경우 X_train_all로 학습했으므로 X_train_all로 평가)
            from sklearn.metrics import accuracy_score, classification_report
            
            if tune_hyperparameters:
                # 하이퍼파라미터 튜닝의 경우 전체 학습 데이터로 학습했으므로 전체로 평가
                y_train_pred = model.predict(X_train_all)
                y_train = y_train_all.astype(int)
                y_train_pred = y_train_pred.astype(int)
                train_accuracy = accuracy_score(y_train, y_train_pred)
                
                # Validation은 여전히 X_val 사용
                y_val_pred = model.predict(X_val)
                y_val = y_val.astype(int)
                y_val_pred = y_val_pred.astype(int)
                val_accuracy = accuracy_score(y_val, y_val_pred)
            else:
                y_train_pred = model.predict(X_train)
                y_val_pred = model.predict(X_val)
                
                # 예측값과 실제값을 int로 변환 (타입 일치 보장)
                y_train = y_train.astype(int)
                y_val = y_val.astype(int)
                y_train_pred = y_train_pred.astype(int)
                y_val_pred = y_val_pred.astype(int)
                
                train_accuracy = accuracy_score(y_train, y_train_pred)
                val_accuracy = accuracy_score(y_val, y_val_pred)
            
            ic(f"Train 정확도: {train_accuracy:.4f}")
            ic(f"Validation 정확도: {val_accuracy:.4f}")
            
            # 모델 저장 - titanic/models/ 폴더 사용
            # Path(__file__) = titanic_service.py
            # Path(__file__).parent = titanic/
            model_dir = Path(__file__).parent / "models"
            model_dir.mkdir(parents=True, exist_ok=True)
            model_file = model_dir / "titanic_lightgbm_model.pkl"
            ic(f"모델 저장 경로: {model_dir.absolute()}")
            
            import pickle
            ic(f"💾 모델 저장 시작... (하이퍼파라미터 튜닝: {tune_hyperparameters})")
            ic(f"💾 저장할 모델 타입: {type(model)}")
            if tune_hyperparameters:
                ic(f"💾 저장할 모델 파라미터 (일부): {dict(list(model.get_params().items())[:5])}")
            with open(model_file, 'wb') as f:
                pickle.dump(model, f)
            ic(f"💾 모델 pickle 저장 완료")
            
            ic(f"✅ 모델 저장 완료: {model_file}")
            ic(f"✅ 모델 파일 크기: {model_file.stat().st_size if model_file.exists() else 0} bytes")
            ic(f"✅ 모델 파일 존재 여부: {model_file.exists()}")
            
            # 하이퍼파라미터 튜닝된 경우 최적 파라미터도 별도로 저장
            if tune_hyperparameters:
                from datetime import datetime
                params_file = model_dir / "titanic_lightgbm_best_params.pkl"
                with open(params_file, 'wb') as f:
                    pickle.dump({
                        'best_params': best_params,
                        'best_cv_score': best_cv_score,
                        'trained_at': datetime.now().isoformat()
                    }, f)
                ic(f"✅ 최적 하이퍼파라미터 저장 완료: {params_file}")
            
            # 결과 반환
            # 나이브 베이즈(NB)
            # 로지스틱 회귀
            # 랜덤 포레스트
            # SVD
            # lightGBM
            result = {
                "message": "LightGBM 모델 학습 완료",
                "status": "success",
                "train_accuracy": float(train_accuracy),
                "validation_accuracy": float(val_accuracy),
                "train_samples": len(X_train),
                "validation_samples": len(X_val),
                "features": list(X_train.columns),
                "model_path": str(model_file),
                "hyperparameter_tuning": tune_hyperparameters
            }
            
            # 하이퍼파라미터 튜닝을 사용한 경우 최적 파라미터 추가
            if tune_hyperparameters and best_params is not None:
                result["best_hyperparameters"] = best_params
                result["best_cv_score"] = float(best_cv_score)
            
            ic("😎😎 학습 완료")
            return result
            
        except Exception as e:
            ic(f"학습 중 에러 발생: {type(e).__name__}: {str(e)}")
            import traceback
            ic(traceback.format_exc())
            raise
    
    def predict_submission(self, config: Optional[TitanicConfig] = None) -> pd.DataFrame:
        """캐글 제출용 예측 결과 생성 (test.csv에 대한 예측)
        
        Args:
            config: 타이타닉 설정 객체
            
        Returns:
            캐글 제출 형식 DataFrame (PassengerId, Survived)
        """
        try:
            ic("캐글 제출용 예측 시작...")
            
            # 설정 사용
            config = config or self.config
            config.validate()
            
            # 모델 로드
            model_dir = Path(__file__).parent / "models"
            model_file = model_dir / "titanic_lightgbm_model.pkl"
            
            if not model_file.exists():
                raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {model_file}. 먼저 /titanic/train을 실행하세요.")
            
            import pickle
            with open(model_file, 'rb') as f:
                model = pickle.load(f)
            ic(f"모델 로드 완료: {model_file}")
            
            # LightGBM import
            try:
                import lightgbm as lgb
            except ImportError:
                raise ImportError("LightGBM이 설치되지 않았습니다.")
            
            the_method = TitanicMethod(config)
            
            # Train과 Test 데이터 합쳐서 로드
            ic("Train과 Test 데이터 로드 시작...")
            df_combined, df_test_original = the_method.new_model(
                str(config.train_csv_path), 
                str(config.test_csv_path) if config.test_csv_path else None
            )
            
            if df_test_original is None:
                raise ValueError("Test CSV 파일이 필요합니다.")
            
            # test 데이터의 PassengerId 저장
            passenger_ids = df_test_original['PassengerId'].values
            
            train_len = len(df_combined) - len(df_test_original)
            
            # 합쳐진 데이터로 전처리 (label_column 제거)
            this = the_method.create_train(df_combined, config.label_column)
            
            # 전처리 수행 (설정 기반)
            # 1. 피처 삭제
            for feature in config.drop_features:
                if feature in this.columns:
                    this = this.drop(columns=[feature])
            
            # 2. 전처리 파이프라인 실행
            preprocessing_map = {
                'pclass_ordinal': the_method.pclass_ordinal,
                'fare_ratio': the_method.fare_ratio,
                'embarked_nominal': the_method.embarked_nominal,
                'gender_nominal': the_method.gender_nominal,
                'age_ratio': the_method.age_ratio,
                'title_nominal': the_method.title_nominal,
            }
            
            for step_name in config.preprocessing_steps:
                if step_name in preprocessing_map:
                    this = preprocessing_map[step_name](this)
            
            # Test 데이터 추출
            X_test = this.iloc[train_len:].copy()
            
            # int로 변환 (train 메서드와 동일한 로직)
            def convert_to_int(df: pd.DataFrame) -> pd.DataFrame:
                """모든 컬럼을 int로 변환"""
                df = df.copy()
                cols_to_drop = []
                
                for col in df.columns:
                    if pd.api.types.is_categorical_dtype(df[col]):
                        if col == 'Age_band':
                            cols_to_drop.append(col)
                        else:
                            try:
                                df[col] = df[col].cat.codes
                            except:
                                cols_to_drop.append(col)
                    elif df[col].dtype == bool or df[col].dtype == 'bool':
                        df[col] = df[col].astype(int)
                    elif df[col].dtype == object:
                        if col in config.columns_to_drop_after_encoding:
                            cols_to_drop.append(col)
                        elif col == 'Title':
                            try:
                                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                            except:
                                cols_to_drop.append(col)
                        else:
                            cols_to_drop.append(col)
                    elif pd.api.types.is_numeric_dtype(df[col]):
                        if df[col].isnull().any():
                            df[col] = df[col].fillna(0)
                        df[col] = df[col].astype(int)
                
                if cols_to_drop:
                    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
                
                return df
            
            X_test = convert_to_int(X_test)
            ic(f"Test 데이터 전처리 완료: {X_test.shape}")
            
            # 예측 수행
            ic("예측 수행 중...")
            predictions = model.predict(X_test)
            predictions = predictions.astype(int)
            
            # 캐글 제출 형식 DataFrame 생성
            submission_df = pd.DataFrame({
                'PassengerId': passenger_ids,
                'Survived': predictions
            })
            
            ic(f"예측 완료: {len(submission_df)}개 행")
            ic(f"생존 예측 분포: {submission_df['Survived'].value_counts().to_dict()}")
            
            return submission_df
            
        except Exception as e:
            ic(f"예측 중 에러 발생: {type(e).__name__}: {str(e)}")
            import traceback
            ic(traceback.format_exc())
            raise