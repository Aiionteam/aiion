"""
건강 데이터 학습 및 예측 메서드
"""
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from typing import Dict, Tuple, Optional
import os

from healthcare_dataset import HealthcareDataset
from healthcare_model import HealthcareModel


class HealthcareMethod:
    """건강 데이터 학습 및 예측 메서드"""
    
    def __init__(self, dataset: Optional[HealthcareDataset] = None, model: Optional[HealthcareModel] = None):
        """
        초기화
        
        Args:
            dataset: HealthcareDataset 인스턴스
            model: HealthcareModel 인스턴스
        """
        self.dataset = dataset or HealthcareDataset()
        self.model = model or HealthcareModel()
    
    def train_model(
        self,
        test_size: float = 0.2,
        random_state: int = 42,
        save_model: bool = True
    ) -> Dict:
        """
        모델 학습
        
        Args:
            test_size: 테스트 데이터 비율
            random_state: 랜덤 시드
            save_model: 모델 저장 여부
            
        Returns:
            학습 결과 딕셔너리
        """
        # 데이터 로딩 및 전처리
        print("데이터 로딩 중...")
        df = self.dataset.preprocess_data()
        
        print(f"전처리된 데이터: {len(df)}개 샘플")
        
        # 특징 준비
        print("특징 준비 중...")
        X_text, X_numeric = self.model.prepare_features(df, is_training=True)
        
        # 타겟 준비
        y_label1 = df['label1'].values
        y_label2 = df['label2'].values
        
        # 학습/테스트 분할
        print("데이터 분할 중...")
        X_text_train, X_text_test, X_numeric_train, X_numeric_test, y_label1_train, y_label1_test, y_label2_train, y_label2_test = train_test_split(
            X_text, X_numeric, y_label1, y_label2,
            test_size=test_size,
            random_state=random_state,
            stratify=y_label1  # Label1 기준으로 계층적 분할
        )
        
        print(f"학습 데이터: {len(X_text_train)}개")
        print(f"테스트 데이터: {len(X_text_test)}개")
        
        # 모델 학습
        self.model.train(
            X_text_train, X_numeric_train,
            y_label1_train, y_label2_train
        )
        
        # 테스트 데이터로 평가
        print("\n모델 평가 중...")
        label1_pred, label2_pred = self.model.predict(X_text_test, X_numeric_test)
        
        # Label1 평가
        label1_accuracy = accuracy_score(y_label1_test, label1_pred)
        label1_report = classification_report(y_label1_test, label1_pred, output_dict=True)
        
        # Label2 평가
        label2_accuracy = accuracy_score(y_label2_test, label2_pred)
        label2_report = classification_report(y_label2_test, label2_pred, output_dict=True)
        
        print(f"\nLabel1 정확도: {label1_accuracy:.4f}")
        print(f"Label2 정확도: {label2_accuracy:.4f}")
        
        # 모델 저장
        if save_model:
            self.model.save()
        
        # 결과 반환
        results = {
            'label1_accuracy': float(label1_accuracy),
            'label2_accuracy': float(label2_accuracy),
            'label1_report': label1_report,
            'label2_report': label2_report,
            'train_samples': len(X_text_train),
            'test_samples': len(X_text_test)
        }
        
        return results
    
    def predict(
        self,
        symptom: str,
        accompanying_symptom: str,
        age: int,
        gender: str
    ) -> Dict:
        """
        단일 샘플 예측
        
        Args:
            symptom: 증상
            accompanying_symptom: 동반증상
            age: 연령대
            gender: 성별 ("남성" 또는 "여성")
            
        Returns:
            예측 결과 딕셔너리
        """
        # 모델이 로드되지 않았으면 로드 시도
        try:
            if self.model.label1_model is None:
                self.model.load()
        except FileNotFoundError:
            raise ValueError("모델이 학습되지 않았습니다. 먼저 train_model()을 호출하세요.")
        
        # 입력 데이터를 DataFrame으로 변환
        data = {
            'symptom': [symptom],
            'accompanying_symptom': [accompanying_symptom],
            'age': [age],
            'gender': [gender]
        }
        df = pd.DataFrame(data)
        
        # 전처리 (성별 인코딩 등)
        df['gender_encoded'] = df['gender'].map({'남성': 0, '여성': 1}).fillna(0).astype(int)
        df['combined_symptom'] = df['symptom'] + ' ' + df['accompanying_symptom']
        
        # 특징 준비
        X_text, X_numeric = self.model.prepare_features(df, is_training=False)
        
        # 예측
        label1_pred, label2_pred = self.model.predict(X_text, X_numeric)
        
        # 확률 예측
        label1_proba, label2_proba = self.model.predict_proba(X_text, X_numeric)
        
        # 결과 반환
        result = {
            'label1': int(label1_pred[0]),
            'label2': int(label2_pred[0]),
            'label1_proba': label1_proba[0].tolist(),
            'label2_proba': label2_proba[0].tolist()
        }
        
        return result
    
    def batch_predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        배치 예측
        
        Args:
            df: 입력 DataFrame (symptom, accompanying_symptom, age, gender 컬럼 필요)
            
        Returns:
            예측 결과가 추가된 DataFrame
        """
        # 모델이 로드되지 않았으면 로드 시도
        try:
            if self.model.label1_model is None:
                self.model.load()
        except FileNotFoundError:
            raise ValueError("모델이 학습되지 않았습니다. 먼저 train_model()을 호출하세요.")
        
        # 전처리
        df = df.copy()
        df['gender_encoded'] = df['gender'].map({'남성': 0, '여성': 1}).fillna(0).astype(int)
        df['combined_symptom'] = df['symptom'] + ' ' + df['accompanying_symptom']
        
        # 특징 준비
        X_text, X_numeric = self.model.prepare_features(df, is_training=False)
        
        # 예측
        label1_pred, label2_pred = self.model.predict(X_text, X_numeric)
        
        # 결과 추가
        df['predicted_label1'] = label1_pred
        df['predicted_label2'] = label2_pred
        
        return df
    
    def get_model_info(self) -> Dict:
        """
        모델 정보 반환
        
        Returns:
            모델 정보 딕셔너리
        """
        info = {
            'model_loaded': self.model.label1_model is not None,
            'model_dir': str(self.model.model_dir),
            'label1_model_exists': self.model.label1_model_path.exists(),
            'label2_model_exists': self.model.label2_model_path.exists(),
            'vectorizer_exists': self.model.vectorizer_path.exists()
        }
        
        if self.dataset.processed_df is not None:
            stats = self.dataset.get_stats()
            info['dataset_stats'] = stats
        
        return info

