from pathlib import Path
from typing import Tuple, Optional
import pandas as pd
import numpy as np
from icecream import ic
from app.titanic.titanic_dataset import TitanicDataSet
from app.titanic.titanic_config import TitanicConfig

class TitanicMethod(object):
    
    def __init__(self, config: Optional[TitanicConfig] = None):
        self.this = TitanicDataSet()
        self.config = config or TitanicConfig.default()

    def new_model(self, train_fname: str, test_fname: str = None) -> Tuple[pd.DataFrame, pd.DataFrame | None]:
        """
        Train과 Test CSV를 로드하고 합쳐서 반환
        - train_fname: train CSV 파일 경로
        - test_fname: test CSV 파일 경로 (선택적)
        - 반환: (합쳐진 DataFrame, 원본 test DataFrame)
        """
        # Train CSV 로드
        df_train = pd.read_csv(train_fname)
        ic(f"Train 데이터 로드: {len(df_train)}행")
        
        df_test_original = None
        
        # Test CSV가 있으면 로드
        if test_fname:
            df_test_original = pd.read_csv(test_fname)
            ic(f"Test 데이터 로드: {len(df_test_original)}행")
            
            # Test에 Survived 컬럼이 없으면 None으로 추가
            if 'Survived' not in df_test_original.columns:
                df_test_original['Survived'] = None
                ic("Test 데이터에 Survived 컬럼 추가 (None)")
            
            # Train과 Test 합치기
            df_combined = pd.concat([df_train, df_test_original], ignore_index=True)
            ic(f"Train과 Test 합침: {len(df_combined)}행")
        else:
            # Test가 없으면 Train만 반환
            df_combined = df_train.copy()
        
        return df_combined, df_test_original

    def read_csv(self, fname:str) -> pd.DataFrame:
        """CSV 파일을 읽어와서 DataFrame 반환"""
        df = pd.read_csv(fname)
        return df

    def create_df(self, df: pd.DataFrame, label:str) -> pd.DataFrame:
        """Survived 컬럼을 제거한 학습 데이터(특성) DataFrame 반환"""
        if label in df.columns:
            return df.drop(columns=[label])
        return df

    def create_train(self, df: pd.DataFrame, label: str) -> pd.DataFrame:
        """Survived 컬럼을 제거한 학습 데이터(특성) DataFrame 반환 (create_df와 동일)"""
        return self.create_df(df, label)

    def create_label(self, df: pd.DataFrame) -> pd.Series:
        """Survived 라벨만 포함하는 답안지 Series 반환"""
        if 'Survived' in df.columns:
            return df['Survived']
        elif 'label' in df.columns:
            return df['label']
        raise ValueError("Survived 또는 label 컬럼이 없습니다.")
    
    def drop_features(self, df: pd.DataFrame, *features: str) -> pd.DataFrame:
        """피처를 삭제하는 메서드 (DataFrame을 받고 반환)"""
        df = df.copy()
        for feature in features:
            if feature in df.columns:
                df = df.drop(columns=[feature])
        return df
    
    def check_null(self, df: pd.DataFrame) -> int:
        """널 값을 확인하는 메서드 (DataFrame의 전체 null 개수 반환)"""
        # DataFrame인지 확인
        if isinstance(df, pd.DataFrame):
            null_count = df.isnull().sum().sum()
            ic(f"DataFrame null 개수: {null_count}")
            return null_count
        # TitanicDataSet 객체인 경우 (이전 호환성)
        elif hasattr(df, 'train') and hasattr(df, 'test'):
            train_null = df.train.isnull().sum().sum() if df.train is not None else 0
            test_null = df.test.isnull().sum().sum() if df.test is not None else 0
            ic(f"Train null: {train_null}, Test null: {test_null}")
            return train_null + test_null
        else:
            # 기타 경우
            ic(f"⚠️ 알 수 없는 타입: {type(df)}")
            return 0

    #nominal , ordinal, interval, ratio
    def pclass_ordinal(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        Pclass: 객실 등급 (1, 2, 3)
        - 서열형 척도(ordinal)로 처리합니다.
        - 1등석 > 2등석 > 3등석이므로, 생존률 관점에서 1이 가장 좋고 3이 가장 안 좋습니다.
        """
        df = df.copy()
        df['Pclass'] = df['Pclass'].astype(int)
        return df

    def title_nominal(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        Title: 명칭 (Mr, Mrs, Miss, Master, Dr, etc.)
        - Name 컬럼에서 추출한 타이틀입니다.
        - nominal 척도입니다.
        - Label encoding으로 숫자로 변환 (0, 1, 2, 3, 4...)
        """
        df = df.copy()
        if 'Name' not in df.columns:
            return df
        
        # Name에서 Title 추출 (예: "Braund, Mr. Owen Harris" -> "Mr")
        df['Title'] = df['Name'].str.extract(r',\s*([^\.]+)\.', expand=False)
        df['Title'] = df['Title'].str.strip()
        
        # 희소한 타이틀을 "Rare" 그룹으로 묶기 (설정 기반)
        title_counts = df['Title'].value_counts()
        rare_titles = title_counts[title_counts < self.config.rare_title_threshold].index.tolist()
        df['Title'] = df['Title'].replace(rare_titles, 'Rare')
        
        # 결측치 처리 (Title이 없는 경우 "Unknown"으로)
        df['Title'] = df['Title'].fillna('Unknown')
        
        # Label encoding으로 숫자 변환 (one-hot encoding 대신)
        from sklearn.preprocessing import LabelEncoder
        label_encoder = LabelEncoder()
        df['Title'] = label_encoder.fit_transform(df['Title'].astype(str))
        # int 타입으로 명시적 변환
        df['Title'] = df['Title'].astype(int)
        
        return df

    def gender_nominal(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        gender: 성별 (male, female)
        - nominal 척도입니다.
        """
        df = df.copy()
        
        # 'Sex' 컬럼이 있으면 'gender'로 rename
        if 'Sex' in df.columns and 'gender' not in df.columns:
            df['gender'] = df['Sex']
        
        if 'gender' not in df.columns:
            return df
        
        # One-hot encoding
        gender_dummies = pd.get_dummies(df['gender'], prefix='gender')
        df = pd.concat([df, gender_dummies], axis=1)
        
        # 원본 gender 컬럼은 유지 (필요시 삭제 가능)
        return df

    def age_ratio(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        Age: 나이
        - 원래는 ratio 척도지만, 여기서는 나이를 구간으로 나눈 ordinal 피처를 만들고자 합니다.
        - bins: [-1, 0, 5, 12, 18, 24, 35, 60, np.inf] (9개 엣지 = 8개 구간)
        - labels: ['Unknown', 'Baby', 'Child', 'Teenager', 'Young Adult', 'Adult', 'Senior', 'Elderly'] (8개 라벨)
        """
        df = df.copy()
        if 'Age' not in df.columns:
            return df
        
        # 결측치 처리: 중앙값으로 채우기
        if df['Age'].isnull().any():
            median_age = df['Age'].median()
            df['Age'] = df['Age'].fillna(median_age)
            ic(f"Age 결측치를 중앙값 {median_age}으로 채웠습니다.")
        
        # 나이 구간화 (설정 기반)
        df['Age_band'] = pd.cut(
            df['Age'], 
            bins=self.config.age_bins, 
            labels=self.config.age_labels, 
            include_lowest=True
        )
        
        # Age_band를 ordinal로 변환 (숫자 인코딩)
        df['Age_band_ordinal'] = df['Age_band'].cat.codes
        # int 타입으로 명시적 변환
        df['Age_band_ordinal'] = df['Age_band_ordinal'].astype(int)
        
        # 원본 Age 컬럼은 유지
        return df

    def ticket_nominal(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        Ticket: 티켓 번호
        - nominal 척도입니다.
        - 티켓 번호는 고유 식별자이므로, 일반적으로 그룹화하거나 삭제하는 것이 좋습니다.
        """
        df = df.copy()
        if 'Ticket' not in df.columns:
            return df
        
        # 티켓 번호의 접두사 추출 (예: "PC 17755" -> "PC")
        df['Ticket_prefix'] = df['Ticket'].str.extract(r'^([A-Za-z]+)', expand=False)
        df['Ticket_prefix'] = df['Ticket_prefix'].fillna('Numeric')
        
        # 희소한 접두사를 "Rare"로 묶기 (설정 기반)
        prefix_counts = df['Ticket_prefix'].value_counts()
        rare_prefixes = prefix_counts[prefix_counts < self.config.rare_prefix_threshold].index.tolist()
        df['Ticket_prefix'] = df['Ticket_prefix'].replace(rare_prefixes, 'Rare')
        
        # One-hot encoding
        ticket_dummies = pd.get_dummies(df['Ticket_prefix'], prefix='Ticket')
        df = pd.concat([df, ticket_dummies], axis=1)
        
        # 원본 Ticket 컬럼은 유지 (필요시 삭제 가능)
        return df

    def fare_ratio(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        Fare: 요금
        - 원래는 ratio 척도이지만, 여기서는 구간화하여 서열형(ordinal)으로 사용합니다.
        """
        df = df.copy()
        if 'Fare' not in df.columns:
            return df
        
        # 결측치 처리: 중앙값으로 채우기
        if df['Fare'].isnull().any():
            median_fare = df['Fare'].median()
            df['Fare'] = df['Fare'].fillna(median_fare)
            ic(f"Fare 결측치를 중앙값 {median_fare}으로 채웠습니다.")
        
        # Fare를 사분위수로 구간화하여 ordinal 피처 생성 (설정 기반)
        try:
            labels = list(range(self.config.fare_quantiles))
            df['Fare_band'] = pd.qcut(df['Fare'], q=self.config.fare_quantiles, labels=labels, duplicates='drop')
            # Fare_band를 숫자로 변환 (Categorical 타입인 경우 cat.codes 사용)
            if pd.api.types.is_categorical_dtype(df['Fare_band']):
                df['Fare_band'] = df['Fare_band'].cat.codes
            else:
                df['Fare_band'] = df['Fare_band'].astype(int)
        except ValueError as e:
            # qcut이 실패하는 경우 (중복값이 많을 때) quantile을 사용
            ic(f"qcut 실패, quantile 사용: {e}")
            labels = list(range(self.config.fare_quantiles))
            df['Fare_band'] = pd.cut(df['Fare'], bins=self.config.fare_quantiles, labels=labels, duplicates='drop')
            if pd.api.types.is_categorical_dtype(df['Fare_band']):
                df['Fare_band'] = df['Fare_band'].cat.codes
            else:
                df['Fare_band'] = df['Fare_band'].astype(int)
        
        # 원본 Fare 컬럼은 유지
        return df

    def embarked_nominal(self, df:pd.DataFrame) -> pd.DataFrame:
        """
        Embarked: 탑승 항구 (C, Q, S)
        - 본질적으로는 nominal(명목) 척도입니다.
        - one-hot encoding을 사용합니다.
        """
        df = df.copy()
        if 'Embarked' not in df.columns:
            return df
        
        # 결측치 처리: 가장 많이 등장하는 값(mode)으로 채우기
        if df['Embarked'].isnull().any():
            mode_embarked = df['Embarked'].mode()[0] if not df['Embarked'].mode().empty else 'S'
            df['Embarked'] = df['Embarked'].fillna(mode_embarked)
            ic(f"Embarked 결측치를 최빈값 {mode_embarked}으로 채웠습니다.")
        
        # One-hot encoding
        embarked_dummies = pd.get_dummies(df['Embarked'], prefix='Embarked')
        df = pd.concat([df, embarked_dummies], axis=1)
        
        # 원본 Embarked 컬럼은 유지 (필요시 삭제 가능)
        return df
