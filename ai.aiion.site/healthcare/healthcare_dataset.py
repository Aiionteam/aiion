"""
건강 데이터셋 로딩 및 전처리 모듈
"""
import pandas as pd
import numpy as np
from typing import Tuple, Optional
from pathlib import Path
import os


class HealthcareDataset:
    """건강 데이터셋 클래스"""
    
    def __init__(self, csv_path: Optional[str] = None):
        """
        초기화
        
        Args:
            csv_path: CSV 파일 경로 (기본값: 현재 디렉토리의 medical_data_final_with_joseon.csv)
        """
        if csv_path is None:
            # 현재 파일의 디렉토리 기준으로 CSV 파일 경로 설정
            current_dir = Path(__file__).parent
            csv_path = current_dir / "medical_data_final_with_joseon.csv"
        
        self.csv_path = csv_path
        self.df: Optional[pd.DataFrame] = None
        self.processed_df: Optional[pd.DataFrame] = None
        
    def load_data(self) -> pd.DataFrame:
        """
        CSV 파일 로딩
        
        Returns:
            로딩된 DataFrame
        """
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"CSV 파일을 찾을 수 없습니다: {self.csv_path}")
        
        print(f"CSV 파일 로딩 중: {self.csv_path}")
        
        # UTF-8 인코딩으로 CSV 파일 읽기
        self.df = pd.read_csv(self.csv_path, encoding='utf-8')
        
        print(f"로딩된 데이터: {len(self.df)}개 행, {len(self.df.columns)}개 컬럼")
        
        # 필요한 컬럼만 선택 (빈 컬럼 제거)
        # 실제 CSV 파일의 컬럼명 확인: '병 명(Label2)' (공백 포함)
        required_columns = ['인덱스', '증상', '동반증상', '연령대', '성별', '진료과(Label1)', '병 명(Label2)']
        
        # 컬럼명이 정확히 일치하는지 확인
        missing_columns = [col for col in required_columns if col not in self.df.columns]
        if missing_columns:
            print(f"경고: 다음 컬럼을 찾을 수 없습니다: {missing_columns}")
            print(f"실제 컬럼명: {self.df.columns.tolist()[:10]}")
            # 유사한 컬럼명 찾기 시도
            for missing_col in missing_columns:
                similar_cols = [col for col in self.df.columns if missing_col.replace(' ', '') in col.replace(' ', '')]
                if similar_cols:
                    print(f"  '{missing_col}' 대신 '{similar_cols[0]}' 사용")
                    required_columns = [similar_cols[0] if col == missing_col else col for col in required_columns]
        
        self.df = self.df[required_columns].copy()
        
        # 컬럼명 정리
        self.df.columns = ['index', 'symptom', 'accompanying_symptom', 'age', 'gender', 'label1', 'label2']
        
        print(f"전처리된 데이터: {len(self.df)}개 행")
        
        return self.df
    
    def preprocess_data(self) -> pd.DataFrame:
        """
        데이터 전처리
        
        Returns:
            전처리된 DataFrame
        """
        if self.df is None:
            self.load_data()
        
        df = self.df.copy()
        
        # 결측치 처리
        # 증상이나 동반증상이 비어있는 경우 제거
        df = df.dropna(subset=['symptom', 'accompanying_symptom'])
        
        # Label 결측치 처리 (NaN인 경우 제거)
        df = df.dropna(subset=['label1', 'label2'])
        
        # Label을 정수형으로 변환
        df['label1'] = df['label1'].astype(int)
        df['label2'] = df['label2'].astype(int)
        
        # 연령대 결측치 처리 (평균값으로 대체)
        if df['age'].isna().any():
            df['age'].fillna(df['age'].mean(), inplace=True)
        
        # 연령대를 정수형으로 변환
        df['age'] = df['age'].astype(int)
        
        # 성별 인코딩 (남성: 0, 여성: 1)
        df['gender_encoded'] = df['gender'].map({'남성': 0, '여성': 1})
        
        # 성별 결측치 처리
        if df['gender_encoded'].isna().any():
            # 성별이 없는 경우 가장 빈도가 높은 값으로 대체
            most_common_gender = df['gender'].mode()[0] if not df['gender'].mode().empty else '남성'
            df['gender_encoded'].fillna(df['gender'].map({'남성': 0, '여성': 1}).mode()[0], inplace=True)
        
        df['gender_encoded'] = df['gender_encoded'].astype(int)
        
        # 증상 텍스트 정리 (줄바꿈 제거, 공백 정리)
        df['symptom'] = df['symptom'].astype(str).str.replace('\n', ' ').str.strip()
        df['accompanying_symptom'] = df['accompanying_symptom'].astype(str).str.replace('\n', ' ').str.strip()
        
        # 증상과 동반증상을 합친 텍스트 생성
        df['combined_symptom'] = df['symptom'] + ' ' + df['accompanying_symptom']
        
        self.processed_df = df
        
        return df
    
    def get_feature_columns(self) -> list:
        """
        특징 컬럼 목록 반환
        
        Returns:
            특징 컬럼 리스트
        """
        return ['symptom', 'accompanying_symptom', 'combined_symptom', 'age', 'gender_encoded']
    
    def get_label_columns(self) -> list:
        """
        레이블 컬럼 목록 반환
        
        Returns:
            레이블 컬럼 리스트
        """
        return ['label1', 'label2']
    
    def get_stats(self) -> dict:
        """
        데이터셋 통계 정보 반환
        
        Returns:
            통계 정보 딕셔너리
        """
        if self.processed_df is None:
            self.preprocess_data()
        
        df = self.processed_df
        
        stats = {
            'total_samples': len(df),
            'label1_classes': df['label1'].nunique(),
            'label2_classes': df['label2'].nunique(),
            'label1_distribution': df['label1'].value_counts().to_dict(),
            'label2_distribution': df['label2'].value_counts().to_dict(),
            'age_range': (df['age'].min(), df['age'].max()),
            'age_mean': df['age'].mean(),
            'gender_distribution': df['gender'].value_counts().to_dict()
        }
        
        return stats

