"""
Diary Emotion Service
일기 감정 분류 머신러닝 서비스
판다스, 넘파이, 사이킷런을 사용한 데이터 처리 및 머신러닝 서비스
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
try:
    from icecream import ic  # type: ignore
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.diary_emotion.diary_emotion_dataset import DiaryEmotionDataSet
from app.diary_emotion.diary_emotion_model import DiaryEmotionModel
from app.diary_emotion.diary_emotion_schema import DiaryEmotionSchema


class DiaryEmotionService:
    """일기 감정 분류 데이터 처리 및 머신러닝 서비스"""
    
    def __init__(self, csv_file_path: Optional[Path] = None):
        """초기화"""
        self.dataset = DiaryEmotionDataSet()
        self.model_obj = DiaryEmotionModel()
        self.csv_file_path = csv_file_path or (Path(__file__).parent / "diary_emotion.csv")
        self.df: Optional[pd.DataFrame] = None
        ic("DiaryEmotionService 초기화")
    
    def preprocess(self):
        """데이터 전처리"""
        ic("😎😎 전처리 시작")
        
        try:
            # CSV 파일 로드
            self.df = self.dataset.load_csv(self.csv_file_path)
            ic(f"데이터 로드 완료: {len(self.df)} 개 행")
            
            # 데이터 기본 정보 확인
            ic(f"컬럼: {list(self.df.columns)}")
            ic(f"감정 분포: {self.df['emotion'].value_counts().to_dict()}")
            
            # 결측치 처리
            self.df = self.df.dropna(subset=['content', 'emotion'])
            
            # 텍스트 전처리 (제목과 내용 결합)
            self.df['text'] = self.df['title'].fillna('') + ' ' + self.df['content'].fillna('')
            
            # 감정 라벨 확인 (0: 평가불가, 1: 완전긍정, 2: 긍정, 3: 평범, 4: 부정, 5: 완전부정)
            ic(f"감정 라벨: 0=평가불가, 1=완전긍정, 2=긍정, 3=평범, 4=부정, 5=완전부정")
            
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
                min_df=2,
                max_df=0.95
            )
            
            # 모델 초기화 (Random Forest)
            self.model_obj.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                random_state=42,
                n_jobs=-1
            )
            
            ic("😎😎 모델링 완료")
            
        except Exception as e:
            ic(f"모델링 오류: {e}")
            raise
    
    def learning(self):
        """모델 학습"""
        ic("😎😎 학습 시작")
        
        try:
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            if self.model_obj.model is None:
                raise ValueError("모델이 없습니다. modeling()을 먼저 실행하세요.")
            
            # 텍스트 벡터화
            X_text = self.df['text'].values
            X = self.model_obj.vectorizer.fit_transform(X_text)
            
            # 라벨 추출 (emotion)
            y = self.df['emotion'].values
            
            # 학습/테스트 데이터 분할
            # sparse matrix와 텍스트를 함께 분할하기 위해 인덱스 기반으로 분할
            indices = list(range(len(y)))
            train_indices, test_indices = train_test_split(
                indices, test_size=0.2, random_state=42, stratify=y
            )
            
            # sparse matrix를 리스트 인덱스로 인덱싱
            X_train = X[train_indices]
            X_test = X[test_indices]
            y_train = y[train_indices]
            y_test = y[test_indices]
            
            # 모델 학습
            self.model_obj.model.fit(X_train, y_train)
            
            # 학습 데이터셋 저장
            self.dataset.train = pd.DataFrame({
                'text': self.df['text'].iloc[train_indices].values,
                'emotion': y_train
            })
            self.dataset.test = pd.DataFrame({
                'text': self.df['text'].iloc[test_indices].values,
                'emotion': y_test
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
            
            # 테스트 데이터 준비
            X_test_text = self.dataset.test['text'].values
            X_test = self.model_obj.vectorizer.transform(X_test_text)
            y_test = self.dataset.test['emotion'].values
            
            # 예측
            y_pred = self.model_obj.model.predict(X_test)
            
            # 정확도 계산
            accuracy = accuracy_score(y_test, y_pred)
            ic(f"정확도: {accuracy:.4f}")
            
            # 분류 보고서
            emotion_labels = {0: '평가불가', 1: '완전긍정', 2: '긍정', 3: '평범', 4: '부정', 5: '완전부정'}
            # 실제 데이터에 있는 클래스만 사용
            unique_classes = sorted(set(list(y_test) + list(y_pred)))
            target_names = [emotion_labels.get(i, f'클래스{i}') for i in unique_classes]
            report = classification_report(
                y_test, y_pred,
                target_names=target_names,
                output_dict=True,
                zero_division=0
            )
            ic(f"분류 보고서:\n{classification_report(y_test, y_pred, target_names=target_names, zero_division=0)}")
            
            # 혼동 행렬
            cm = confusion_matrix(y_test, y_pred)
            ic(f"혼동 행렬:\n{cm}")
            
            ic("😎😎 평가 완료")
            
            return {
                'accuracy': accuracy,
                'classification_report': report,
                'confusion_matrix': cm.tolist()
            }
            
        except Exception as e:
            ic(f"평가 오류: {e}")
            raise
    
    def predict(self, text: str) -> Dict[str, Any]:
        """텍스트 감정 예측"""
        try:
            if self.model_obj.model is None:
                raise ValueError("모델이 없습니다. learning()을 먼저 실행하세요.")
            
            # 텍스트 벡터화
            X = self.model_obj.vectorizer.transform([text])
            
            # 예측
            prediction = self.model_obj.model.predict(X)[0]
            probabilities = self.model_obj.model.predict_proba(X)[0]
            
            emotion_labels = {0: '평가불가', 1: '완전긍정', 2: '긍정', 3: '평범', 4: '부정', 5: '완전부정'}
            
            return {
                'emotion': int(prediction),
                'emotion_label': emotion_labels.get(int(prediction), '알 수 없음'),
                'probabilities': {
                    emotion_labels.get(i, f'클래스{i}'): float(prob) for i, prob in enumerate(probabilities)
                }
            }
            
        except Exception as e:
            ic(f"예측 오류: {e}")
            raise
    
    def submit(self):
        """제출/모델 저장"""
        ic("😎😎 제출 시작")
        ic("😎😎 제출 완료")

