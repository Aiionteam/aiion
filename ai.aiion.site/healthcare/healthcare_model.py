"""
건강 데이터 ML 모델 정의
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
import numpy as np
from typing import Optional, Tuple
import joblib
import os
from pathlib import Path


class HealthcareModel:
    """건강 데이터 분류 모델"""
    
    def __init__(self, model_dir: Optional[str] = None):
        """
        초기화
        
        Args:
            model_dir: 모델 저장 디렉토리 (기본값: 현재 디렉토리의 models 폴더)
        """
        if model_dir is None:
            current_dir = Path(__file__).parent
            model_dir = current_dir / "models"
        
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # Label1 모델 (진료과 분류)
        self.label1_model: Optional[Pipeline] = None
        
        # Label2 모델 (병명 분류)
        self.label2_model: Optional[Pipeline] = None
        
        # 텍스트 벡터화기
        self.text_vectorizer: Optional[TfidfVectorizer] = None
        
        # 모델 파일 경로
        self.label1_model_path = self.model_dir / "label1_model.joblib"
        self.label2_model_path = self.model_dir / "label2_model.joblib"
        self.vectorizer_path = self.model_dir / "text_vectorizer.joblib"
    
    def create_model(self) -> Tuple[Pipeline, Pipeline]:
        """
        모델 생성
        
        Returns:
            (label1_model, label2_model) 튜플
        """
        # 텍스트 벡터화기 (증상 텍스트용)
        # max_features를 제한하여 메모리 사용량 감소
        text_vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),  # 단어와 2-gram 사용
            min_df=2,  # 최소 2번 이상 등장한 단어만 사용
            max_df=0.95,  # 95% 이상 문서에 등장한 단어 제외
            stop_words=None  # 한국어는 별도 처리 필요
        )
        
        # Label1 모델 (진료과 분류)
        # 텍스트 특징과 수치 특징을 결합하는 파이프라인
        label1_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=30,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'  # 클래스 불균형 처리
        )
        
        # Label2 모델 (병명 분류)
        label2_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=30,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'  # 클래스 불균형 처리
        )
        
        self.text_vectorizer = text_vectorizer
        self.label1_model = label1_model
        self.label2_model = label2_model
        
        return label1_model, label2_model
    
    def prepare_features(self, df, is_training: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """
        특징 준비
        
        Args:
            df: 전처리된 DataFrame
            is_training: 학습 모드 여부
            
        Returns:
            (text_features, numeric_features) 튜플
        """
        # 텍스트 특징 (증상 + 동반증상)
        combined_text = df['combined_symptom'].values
        
        if is_training:
            # 학습 모드: 벡터화기 학습
            text_features = self.text_vectorizer.fit_transform(combined_text).toarray()
        else:
            # 예측 모드: 기존 벡터화기 사용
            text_features = self.text_vectorizer.transform(combined_text).toarray()
        
        # 수치 특징 (연령대, 성별)
        numeric_features = df[['age', 'gender_encoded']].values
        
        return text_features, numeric_features
    
    def train(self, X_text: np.ndarray, X_numeric: np.ndarray, y_label1: np.ndarray, y_label2: np.ndarray):
        """
        모델 학습
        
        Args:
            X_text: 텍스트 특징 행렬
            X_numeric: 수치 특징 행렬
            y_label1: Label1 타겟
            y_label2: Label2 타겟
        """
        if self.label1_model is None or self.label2_model is None:
            self.create_model()
        
        # 특징 결합
        X_combined = np.hstack([X_text, X_numeric])
        
        # 모델 학습
        print("Label1 모델 학습 중...")
        self.label1_model.fit(X_combined, y_label1)
        
        print("Label2 모델 학습 중...")
        self.label2_model.fit(X_combined, y_label2)
        
        print("모델 학습 완료!")
    
    def predict(self, X_text: np.ndarray, X_numeric: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        예측
        
        Args:
            X_text: 텍스트 특징 행렬
            X_numeric: 수치 특징 행렬
            
        Returns:
            (label1_predictions, label2_predictions) 튜플
        """
        if self.label1_model is None or self.label2_model is None:
            raise ValueError("모델이 학습되지 않았습니다. train() 메서드를 먼저 호출하세요.")
        
        # 특징 결합
        X_combined = np.hstack([X_text, X_numeric])
        
        # 예측
        label1_pred = self.label1_model.predict(X_combined)
        label2_pred = self.label2_model.predict(X_combined)
        
        return label1_pred, label2_pred
    
    def predict_proba(self, X_text: np.ndarray, X_numeric: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        확률 예측
        
        Args:
            X_text: 텍스트 특징 행렬
            X_numeric: 수치 특징 행렬
            
        Returns:
            (label1_proba, label2_proba) 튜플
        """
        if self.label1_model is None or self.label2_model is None:
            raise ValueError("모델이 학습되지 않았습니다. train() 메서드를 먼저 호출하세요.")
        
        # 특징 결합
        X_combined = np.hstack([X_text, X_numeric])
        
        # 확률 예측
        label1_proba = self.label1_model.predict_proba(X_combined)
        label2_proba = self.label2_model.predict_proba(X_combined)
        
        return label1_proba, label2_proba
    
    def save(self):
        """모델 저장"""
        if self.label1_model is None or self.label2_model is None:
            raise ValueError("저장할 모델이 없습니다.")
        
        joblib.dump(self.label1_model, self.label1_model_path)
        joblib.dump(self.label2_model, self.label2_model_path)
        joblib.dump(self.text_vectorizer, self.vectorizer_path)
        
        print(f"모델이 저장되었습니다: {self.model_dir}")
    
    def load(self):
        """모델 로드"""
        if not self.label1_model_path.exists() or not self.label2_model_path.exists():
            raise FileNotFoundError("저장된 모델을 찾을 수 없습니다. 먼저 모델을 학습하세요.")
        
        self.label1_model = joblib.load(self.label1_model_path)
        self.label2_model = joblib.load(self.label2_model_path)
        self.text_vectorizer = joblib.load(self.vectorizer_path)
        
        print(f"모델이 로드되었습니다: {self.model_dir}")

