from pathlib import Path
import pandas as pd
import numpy as np
from icecream import ic

class TitanicMethod(object):
    
    def __init__(self):
        pass

    def new_model(self, fname:str) -> pd.DataFrame:
        """CSV 파일을 읽어와서 DataFrame 반환"""
        return pd.read_csv(fname)

    def create_train(self, df:pd.DataFrame, label:str) -> pd.DataFrame:
        """Survived 컬럼을 제거한 학습 데이터(특성) DataFrame 반환"""
        return df.drop(columns=[label])

    def create_label(self, df:pd.DataFrame, label:str) -> pd.DataFrame:
        """Survived 라벨만 포함하는 답안지 DataFrame 반환"""
        return df[label]
    
    def drop_features(self, df:pd.DataFrame, *feature: str) -> pd.DataFrame:
        """피처를 삭제하는 메서드"""
        return df.drop(columns=[x for x in feature])

    
    def check_null(self, df:pd.DataFrame) -> int:
        """널 값을 확인하는 메서드"""
        return int(df.isnull().sum().sum())


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
        """
        df = df.copy()
        if 'Name' not in df.columns:
            return df
        
        # Name에서 Title 추출 (예: "Braund, Mr. Owen Harris" -> "Mr")
        df['Title'] = df['Name'].str.extract(r',\s*([^\.]+)\.', expand=False)
        df['Title'] = df['Title'].str.strip()
        
        # 희소한 타이틀을 "Rare" 그룹으로 묶기
        title_counts = df['Title'].value_counts()
        rare_titles = title_counts[title_counts < 10].index.tolist()
        df['Title'] = df['Title'].replace(rare_titles, 'Rare')
        
        # 결측치 처리 (Title이 없는 경우 "Unknown"으로)
        df['Title'] = df['Title'].fillna('Unknown')
        
        # One-hot encoding
        title_dummies = pd.get_dummies(df['Title'], prefix='Title')
        df = pd.concat([df, title_dummies], axis=1)
        
        # 원본 Title 컬럼은 유지 (필요시 삭제 가능)
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
        
        # 나이 구간화
        # bins가 9개이면 구간은 8개가 되므로 labels도 8개여야 함
        bins = [-1, 0, 5, 12, 18, 24, 35, 60, np.inf]
        labels = ['Unknown', 'Baby', 'Child', 'Teenager', 'Young Adult', 'Adult', 'Senior', 'Elderly']
        df['Age_band'] = pd.cut(df['Age'], bins=bins, labels=labels, include_lowest=True)
        
        # Age_band를 ordinal로 변환 (숫자 인코딩)
        df['Age_band_ordinal'] = df['Age_band'].cat.codes
        
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
        
        # 희소한 접두사를 "Rare"로 묶기
        prefix_counts = df['Ticket_prefix'].value_counts()
        rare_prefixes = prefix_counts[prefix_counts < 5].index.tolist()
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
        
        # Fare를 사분위수로 구간화하여 ordinal 피처 생성
        try:
            df['Fare_band'] = pd.qcut(df['Fare'], q=4, labels=[0, 1, 2, 3], duplicates='drop')
            # Fare_band를 숫자로 변환 (Categorical 타입인 경우 cat.codes 사용)
            if pd.api.types.is_categorical_dtype(df['Fare_band']):
                df['Fare_band'] = df['Fare_band'].cat.codes
            else:
                df['Fare_band'] = df['Fare_band'].astype(int)
        except ValueError as e:
            # qcut이 실패하는 경우 (중복값이 많을 때) quantile을 사용
            ic(f"qcut 실패, quantile 사용: {e}")
            df['Fare_band'] = pd.cut(df['Fare'], bins=4, labels=[0, 1, 2, 3], duplicates='drop')
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
