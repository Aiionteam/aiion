"""
Learning Recommendation Service
학습 추천 머신러닝 서비스
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
import pickle
import os
import json
import re
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, mean_squared_error, r2_score
try:
    from icecream import ic  # type: ignore
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.pathfinder_learning.learning_recommendation_dataset import LearningRecommendationDataSet
from app.pathfinder_learning.learning_recommendation_model import LearningRecommendationModel


class LearningRecommendationService:
    """학습 추천 데이터 처리 및 머신러닝 서비스"""
    
    def __init__(self, csv_file_path: Optional[Path] = None):
        """초기화"""
        self.dataset = LearningRecommendationDataSet()
        self.model_obj = LearningRecommendationModel()
        self.csv_file_path = csv_file_path or (Path(__file__).parent / "learning_recommendation_dataset.csv")
        self.df: Optional[pd.DataFrame] = None
        # 모델 저장 경로
        self.model_dir = Path(__file__).parent / "models"
        self.model_dir.mkdir(exist_ok=True)
        self.model_file = self.model_dir / "learning_recommendation_model.pkl"
        self.ranking_model_file = self.model_dir / "learning_recommendation_ranking_model.pkl"
        self.vectorizer_file = self.model_dir / "learning_recommendation_vectorizer.pkl"
        self.metadata_file = self.model_dir / "learning_recommendation_metadata.pkl"
        ic("LearningRecommendationService 초기화")
        
        # 서비스 시작 시 모델 자동 로드 시도
        self._try_load_model()
    
    def preprocess(self):
        """데이터 전처리"""
        ic("😎😎 전처리 시작")
        
        try:
            # CSV 파일 로드
            self.df = self.dataset.load_csv(self.csv_file_path)
            ic(f"데이터 로드 완료: {len(self.df)} 개 행")
            
            # 결측치 처리
            before_dropna = len(self.df)
            self.df = self.df.dropna(subset=['content', 'emotion', 'recommended_topic'])
            after_dropna = len(self.df)
            ic(f"결측치 처리: {before_dropna} -> {after_dropna} 행")
            
            # 텍스트 전처리
            self.df['text'] = self.df['content'].fillna('').astype(str)
            self.df['text'] = self.df['text'].str.replace(r'\r?\n', ' ', regex=True)
            self.df['text'] = self.df['text'].str.replace('\t', ' ', regex=False)
            self.df['text'] = self.df['text'].str.replace(r'\s+', ' ', regex=True).str.strip()
            
            # TODO: 행동 데이터는 나중에 추가 예정 - 현재는 감정만 처리
            # behavior_frequency 컬럼이 있으면 빈 딕셔너리로 behavior_freq_dict 생성 (호환성 유지)
            if 'behavior_frequency' in self.df.columns:
                self.df['behavior_freq_dict'] = self.df['behavior_frequency'].apply(lambda x: {} if pd.isna(x) or x == '' else {})
            else:
                self.df['behavior_freq_dict'] = [{}] * len(self.df)
            
            # 감정 라벨 확인
            ic(f"감정 분포: {self.df['emotion'].value_counts().to_dict()}")
            ic(f"추천 주제 분포: {self.df['recommended_topic'].value_counts().to_dict()}")
            
            ic("😎😎 전처리 완료")
            
        except Exception as e:
            ic(f"전처리 오류: {e}")
            raise
    
    def modeling(self):
        """모델링 설정"""
        ic("😎😎 모델링 시작")
        
        try:
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            
            # 텍스트 벡터화 (TF-IDF)
            self.model_obj.vectorizer = TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.95,
                sublinear_tf=True
            )
            
            # 주제 분류 모델 (Random Forest)
            self.model_obj.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                min_samples_split=2,
                min_samples_leaf=1,
                max_features='sqrt',
                random_state=42,
                n_jobs=-1,
                class_weight='balanced'
            )
            
            # 랭킹 모델 (추천 점수 예측, Random Forest Regressor)
            self.model_obj.ranking_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=20,
                min_samples_split=2,
                min_samples_leaf=1,
                max_features='sqrt',
                random_state=42,
                n_jobs=-1
            )
            
            # 라벨 인코더
            self.model_obj.topic_encoder = LabelEncoder()
            self.model_obj.category_encoder = LabelEncoder()
            
            ic("😎😎 모델링 완료")
            
        except Exception as e:
            ic(f"모델링 오류: {e}")
            raise
    
    def _extract_features(self, df: pd.DataFrame, is_training: bool = False) -> np.ndarray:
        """특징 추출
        
        Args:
            df: 입력 데이터프레임
            is_training: True이면 학습 시 (one-hot encoding 구조 저장), False이면 평가/예측 시 (저장된 구조 사용)
        """
        # 1. 텍스트 벡터화
        if self.model_obj.vectorizer is not None:
            text_features = self.model_obj.vectorizer.transform(df['text'].values)
            text_features_dense = text_features.toarray()
        else:
            text_features_dense = np.zeros((len(df), 5000))
        
        # 2. 감정 (one-hot encoding) - 고정된 구조 사용
        if is_training:
            # 학습 시: 전체 데이터로 one-hot encoding 구조 생성 및 저장
            emotion_dummies = pd.get_dummies(df['emotion'], prefix='emotion')
            self.model_obj.emotion_columns = emotion_dummies.columns.tolist()
            emotion_onehot = emotion_dummies.values
        else:
            # 평가/예측 시: 저장된 구조 사용
            if self.model_obj.emotion_columns is not None:
                emotion_dummies = pd.get_dummies(df['emotion'], prefix='emotion')
                # 저장된 컬럼과 일치하도록 재정렬 (없는 컬럼은 0으로 채움)
                emotion_onehot = np.zeros((len(df), len(self.model_obj.emotion_columns)))
                for i, col in enumerate(self.model_obj.emotion_columns):
                    if col in emotion_dummies.columns:
                        emotion_onehot[:, i] = emotion_dummies[col].values
            else:
                # 학습 전이면 기본 구조 사용
                emotion_onehot = pd.get_dummies(df['emotion'], prefix='emotion').values
        
        # 3. MBTI 타입 (one-hot encoding) - TODO: 나중에 추가 예정
        if is_training:
            if 'mbti_type' in df.columns:
                mbti_dummies = pd.get_dummies(df['mbti_type'], prefix='mbti')
                self.model_obj.mbti_columns = mbti_dummies.columns.tolist()
                mbti_onehot = mbti_dummies.values
            else:
                self.model_obj.mbti_columns = [f'mbti_{i}' for i in range(16)]
                mbti_onehot = np.zeros((len(df), 16))
        else:
            if self.model_obj.mbti_columns is not None:
                if 'mbti_type' in df.columns:
                    mbti_dummies = pd.get_dummies(df['mbti_type'], prefix='mbti')
                    mbti_onehot = np.zeros((len(df), len(self.model_obj.mbti_columns)))
                    for i, col in enumerate(self.model_obj.mbti_columns):
                        if col in mbti_dummies.columns:
                            mbti_onehot[:, i] = mbti_dummies[col].values
                else:
                    mbti_onehot = np.zeros((len(df), len(self.model_obj.mbti_columns)))
            else:
                mbti_onehot = np.zeros((len(df), 16))
        
        # 4. MBTI 신뢰도 - TODO: 나중에 추가 예정
        mbti_conf = df['mbti_confidence'].fillna(0.0).values.reshape(-1, 1) if 'mbti_confidence' in df.columns else np.zeros((len(df), 1))
        
        # TODO: 행동 데이터는 나중에 추가 예정 - 현재는 감정만 처리
        
        # 모든 특징 결합 (감정 중심)
        features = np.hstack([
            text_features_dense,
            emotion_onehot,
            mbti_onehot,
            mbti_conf
        ])
        
        return features
    
    def learning(self):
        """모델 학습"""
        ic("😎😎 학습 시작")
        
        try:
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            if self.model_obj.model is None:
                raise ValueError("모델이 없습니다. modeling()을 먼저 실행하세요.")
            
            # 텍스트 벡터화 학습
            X_text = self.df['text'].values
            self.model_obj.vectorizer.fit(X_text)
            
            # 특징 추출 (학습 모드: one-hot encoding 구조 저장)
            X = self._extract_features(self.df, is_training=True)
            
            # 타겟 변수
            y_topic = self.df['recommended_topic'].values
            y_score = self.df['recommendation_score'].values
            
            # 라벨 인코딩
            y_topic_encoded = self.model_obj.topic_encoder.fit_transform(y_topic)
            
            # 학습/테스트 데이터 분할
            indices = list(range(len(y_topic_encoded)))
            train_indices, test_indices = train_test_split(
                indices, test_size=0.2, random_state=42, stratify=y_topic_encoded
            )
            
            X_train = X[train_indices]
            X_test = X[test_indices]
            y_train_topic = y_topic_encoded[train_indices]
            y_test_topic = y_topic_encoded[test_indices]
            y_train_score = y_score[train_indices]
            y_test_score = y_score[test_indices]
            
            # 주제 분류 모델 학습
            self.model_obj.model.fit(X_train, y_train_topic)
            
            # 랭킹 모델 학습
            self.model_obj.ranking_model.fit(X_train, y_train_score)
            
            # 학습 데이터셋 저장
            self.dataset.train = pd.DataFrame({
                'text': self.df['text'].iloc[train_indices].values,
                'emotion': self.df['emotion'].iloc[train_indices].values,
                'recommended_topic': y_topic[train_indices],
                'recommendation_score': y_train_score
            })
            self.dataset.test = pd.DataFrame({
                'text': self.df['text'].iloc[test_indices].values,
                'emotion': self.df['emotion'].iloc[test_indices].values,
                'recommended_topic': y_topic[test_indices],
                'recommendation_score': y_test_score
            })
            
            ic(f"학습 데이터: {X_train.shape[0]} 개")
            ic(f"테스트 데이터: {X_test.shape[0]} 개")
            ic("😎😎 학습 완료")
            
        except Exception as e:
            ic(f"학습 오류: {e}")
            raise
    
    def evaluate(self):
        """모델 평가"""
        ic("😎😎 평가 시작")
        
        try:
            if self.model_obj.model is None:
                raise ValueError("모델이 없습니다. learning()을 먼저 실행하세요.")
            if self.dataset.test is None:
                raise ValueError("테스트 데이터가 없습니다. learning()을 먼저 실행하세요.")
            
            # 테스트 데이터 준비 (평가 모드: 저장된 구조 사용)
            test_df = self.dataset.test.copy()
            X_test = self._extract_features(test_df, is_training=False)
            y_test_topic = self.model_obj.topic_encoder.transform(test_df['recommended_topic'].values)
            y_test_score = test_df['recommendation_score'].values
            
            # 주제 분류 평가
            y_pred_topic = self.model_obj.model.predict(X_test)
            topic_accuracy = accuracy_score(y_test_topic, y_pred_topic)
            
            # 랭킹 모델 평가
            y_pred_score = self.model_obj.ranking_model.predict(X_test)
            score_mse = mean_squared_error(y_test_score, y_pred_score)
            score_r2 = r2_score(y_test_score, y_pred_score)
            
            ic(f"주제 분류 정확도: {topic_accuracy:.4f}")
            ic(f"추천 점수 MSE: {score_mse:.4f}")
            ic(f"추천 점수 R²: {score_r2:.4f}")
            
            ic("😎😎 평가 완료")
            
            return {
                'topic_classification': {
                    'accuracy': float(topic_accuracy),
                },
                'ranking': {
                    'mse': float(score_mse),
                    'r2': float(score_r2)
                }
            }
            
        except Exception as e:
            ic(f"평가 오류: {e}")
            raise
    
    def predict(self, diary_content: str, emotion: int, behavior_patterns: str = "", 
                behavior_frequency: str = "", mbti_type: str = "", mbti_confidence: float = 0.0) -> Dict[str, Any]:
        """학습 추천 예측"""
        try:
            if self.model_obj.model is None:
                raise ValueError("모델이 없습니다. learning()을 먼저 실행하세요.")
            
            # 입력 데이터 준비 (감정 중심)
            # TODO: 행동 데이터는 나중에 추가 예정 - 현재는 감정만 처리
            input_data = pd.DataFrame([{
                'content': diary_content,
                'text': diary_content,
                'emotion': emotion,
                'mbti_type': mbti_type or 'UNKNOWN',
                'mbti_confidence': mbti_confidence or 0.0
            }])
            
            # 텍스트 전처리
            input_data['text'] = input_data['text'].str.replace(r'\r?\n', ' ', regex=True)
            input_data['text'] = input_data['text'].str.replace('\t', ' ', regex=False)
            input_data['text'] = input_data['text'].str.replace(r'\s+', ' ', regex=True).str.strip()
            
            # TODO: 행동 데이터는 나중에 추가 예정 - 현재는 감정만 처리
            # MBTI 기본값 설정 (없으면)
            if 'mbti_type' not in input_data.columns:
                input_data['mbti_type'] = 'UNKNOWN'
            if 'mbti_confidence' not in input_data.columns:
                input_data['mbti_confidence'] = 0.0
            
            # behavior_freq_dict 생성 (호환성 유지)
            input_data['behavior_freq_dict'] = [{}] * len(input_data)
            
            # 특징 추출 (예측 모드: 저장된 구조 사용)
            X = self._extract_features(input_data, is_training=False)
            
            # 주제 예측
            topic_encoded = self.model_obj.model.predict(X)[0]
            topic = self.model_obj.topic_encoder.inverse_transform([topic_encoded])[0]
            topic_proba = self.model_obj.model.predict_proba(X)[0]
            
            # 추천 점수 예측
            score = float(self.model_obj.ranking_model.predict(X)[0])
            score = max(0.0, min(1.0, score))  # 0-1 범위로 클리핑
            
            return {
                'recommended_topic': topic,
                'recommendation_score': score,
                'topic_probabilities': {
                    self.model_obj.topic_encoder.inverse_transform([i])[0]: float(prob)
                    for i, prob in enumerate(topic_proba)
                }
            }
            
        except Exception as e:
            ic(f"예측 오류: {e}")
            raise
    
    def _try_load_model(self):
        """모델 파일이 있으면 자동 로드"""
        try:
            if (self.model_file.exists() and self.ranking_model_file.exists() and 
                self.vectorizer_file.exists()):
                ic("모델 파일 발견, 자동 로드 시도...")
                with open(self.model_file, 'rb') as f:
                    self.model_obj.model = pickle.load(f)
                with open(self.ranking_model_file, 'rb') as f:
                    self.model_obj.ranking_model = pickle.load(f)
                with open(self.vectorizer_file, 'rb') as f:
                    self.model_obj.vectorizer = pickle.load(f)
                
                # 메타데이터 확인
                if self.metadata_file.exists():
                    with open(self.metadata_file, 'rb') as f:
                        metadata = pickle.load(f)
                    csv_mtime = self.csv_file_path.stat().st_mtime
                    if metadata.get('csv_mtime') == csv_mtime:
                        # 라벨 인코더 로드
                        if 'topic_encoder' in metadata:
                            self.model_obj.topic_encoder = metadata['topic_encoder']
                        if 'category_encoder' in metadata:
                            self.model_obj.category_encoder = metadata['category_encoder']
                        # one-hot encoding 컬럼 구조 로드
                        if 'emotion_columns' in metadata:
                            self.model_obj.emotion_columns = metadata['emotion_columns']
                        if 'mbti_columns' in metadata:
                            self.model_obj.mbti_columns = metadata['mbti_columns']
                        ic("모델 자동 로드 성공")
                        return True
                    else:
                        ic("CSV 파일이 업데이트됨, 재학습 필요")
                        self.model_obj.model = None
                        self.model_obj.ranking_model = None
                        self.model_obj.vectorizer = None
                        return False
                else:
                    ic("모델 자동 로드 성공 (메타데이터 없음)")
                    return True
        except Exception as e:
            ic(f"모델 자동 로드 실패: {e}")
            return False
    
    def save_model(self):
        """모델을 파일로 저장"""
        try:
            if (self.model_obj.model is None or self.model_obj.ranking_model is None or 
                self.model_obj.vectorizer is None):
                raise ValueError("모델이 학습되지 않았습니다. learning()을 먼저 실행하세요.")
            
            # 모델 디렉토리 생성
            self.model_dir.mkdir(parents=True, exist_ok=True)
            
            # 모델 저장
            with open(self.model_file, 'wb') as f:
                pickle.dump(self.model_obj.model, f)
            ic(f"모델 저장 완료: {self.model_file}")
            
            # 랭킹 모델 저장
            with open(self.ranking_model_file, 'wb') as f:
                pickle.dump(self.model_obj.ranking_model, f)
            ic(f"랭킹 모델 저장 완료: {self.ranking_model_file}")
            
            # Vectorizer 저장
            with open(self.vectorizer_file, 'wb') as f:
                pickle.dump(self.model_obj.vectorizer, f)
            ic(f"Vectorizer 저장 완료: {self.vectorizer_file}")
            
            # 메타데이터 저장
            csv_mtime = self.csv_file_path.stat().st_mtime
            metadata = {
                'csv_mtime': csv_mtime,
                'csv_path': str(self.csv_file_path),
                'trained_at': datetime.now().isoformat(),
                'data_count': len(self.df) if self.df is not None else 0,
                'topic_encoder': self.model_obj.topic_encoder,
                'category_encoder': self.model_obj.category_encoder,
                'emotion_columns': self.model_obj.emotion_columns,  # one-hot encoding 구조 저장
                'mbti_columns': self.model_obj.mbti_columns  # one-hot encoding 구조 저장
            }
            with open(self.metadata_file, 'wb') as f:
                pickle.dump(metadata, f)
            ic(f"메타데이터 저장 완료: {self.metadata_file}")
            
        except Exception as e:
            ic(f"모델 저장 오류: {e}")
            raise

