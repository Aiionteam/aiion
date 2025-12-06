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
import pickle
import os
from datetime import datetime
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
        self.csv_file_path = csv_file_path or (Path(__file__).parent / "diary.csv")
        self.df: Optional[pd.DataFrame] = None
        # 모델 저장 경로
        self.model_dir = Path(__file__).parent / "models"
        self.model_dir.mkdir(exist_ok=True)
        self.model_file = self.model_dir / "diary_emotion_model.pkl"
        self.vectorizer_file = self.model_dir / "diary_emotion_vectorizer.pkl"
        self.metadata_file = self.model_dir / "diary_emotion_metadata.pkl"
        ic("DiaryEmotionService 초기화")
        
        # 서비스 시작 시 모델 자동 로드 시도
        self._try_load_model()
    
    def preprocess(self):
        """데이터 전처리"""
        ic("😎😎 전처리 시작")
        
        try:
            # CSV 파일 로드
            self.df = self.dataset.load_csv(self.csv_file_path)
            ic(f"데이터 로드 완료: {len(self.df)} 개 행")
            ic(f"CSV 파일 경로: {self.csv_file_path}")
            ic(f"CSV 파일 존재 여부: {self.csv_file_path.exists()}")
            
            # 데이터 기본 정보 확인
            ic(f"컬럼: {list(self.df.columns)}")
            ic(f"데이터 타입: {self.df.dtypes.to_dict()}")
            
            # 결측치 처리 전 행 수
            before_dropna = len(self.df)
            ic(f"결측치 처리 전 행 수: {before_dropna}")
            
            # 결측치 처리
            self.df = self.df.dropna(subset=['content', 'emotion'])
            
            # 결측치 처리 후 행 수
            after_dropna = len(self.df)
            ic(f"결측치 처리 후 행 수: {after_dropna}")
            ic(f"제거된 행 수: {before_dropna - after_dropna}")
            
            if 'emotion' in self.df.columns:
                ic(f"감정 분포: {self.df['emotion'].value_counts().to_dict()}")
            
            # 텍스트 전처리 (제목과 내용 결합)
            # 줄바꿈 문자를 공백으로 변환하고, 연속된 공백을 하나로 통합
            title_text = self.df['title'].fillna('').astype(str)
            content_text = self.df['content'].fillna('').astype(str)
            
            # 줄바꿈(\n, \r\n)을 공백으로 변환
            title_text = title_text.str.replace(r'\r?\n', ' ', regex=True)
            content_text = content_text.str.replace(r'\r?\n', ' ', regex=True)
            
            # 탭 문자도 공백으로 변환
            title_text = title_text.str.replace('\t', ' ', regex=False)
            content_text = content_text.str.replace('\t', ' ', regex=False)
            
            # 연속된 공백을 하나로 통합
            title_text = title_text.str.replace(r'\s+', ' ', regex=True).str.strip()
            content_text = content_text.str.replace(r'\s+', ' ', regex=True).str.strip()
            
            # 제목과 내용 결합
            self.df['text'] = (title_text + ' ' + content_text).str.strip()
            
            # 감정 라벨 확인 (0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람)
            ic(f"감정 라벨: 0=평가불가, 1=기쁨, 2=슬픔, 3=분노, 4=두려움, 5=혐오, 6=놀람")
            
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
            
            # 텍스트 벡터화 (TF-IDF) - 정확도 향상을 위해 파라미터 조정
            self.model_obj.vectorizer = TfidfVectorizer(
                max_features=10000,  # 5000 -> 10000으로 증가 (더 많은 특징 추출)
                ngram_range=(1, 3),  # (1,2) -> (1,3)으로 증가 (3-gram까지 포함)
                min_df=1,  # 2 -> 1로 감소 (더 많은 단어 포함)
                max_df=0.90,  # 0.95 -> 0.90으로 감소 (너무 흔한 단어 제거)
                sublinear_tf=True  # 로그 스케일링으로 정확도 향상
            )
            
            # 모델 초기화 (Random Forest) - 정확도 향상을 위해 하이퍼파라미터 튜닝
            self.model_obj.model = RandomForestClassifier(
                n_estimators=200,  # 100 -> 200으로 증가 (더 많은 트리)
                max_depth=30,  # 20 -> 30으로 증가 (더 깊은 트리)
                min_samples_split=2,  # 분할 최소 샘플 수
                min_samples_leaf=1,  # 리프 노드 최소 샘플 수
                max_features='sqrt',  # 특징 선택 방식
                random_state=42,
                n_jobs=-1,
                class_weight='balanced'  # 클래스 불균형 처리
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
            
            # stratify 사용 가능 여부 확인 (각 클래스가 최소 2개 이상의 샘플 필요)
            from collections import Counter
            class_counts = Counter(y)
            min_class_count = min(class_counts.values()) if class_counts else 0
            can_stratify = min_class_count >= 2
            
            if can_stratify:
                ic(f"클래스별 샘플 수: {dict(class_counts)}, stratify 사용")
                train_indices, test_indices = train_test_split(
                    indices, test_size=0.2, random_state=42, stratify=y
                )
            else:
                ic(f"클래스별 샘플 수: {dict(class_counts)}, stratify 사용 불가 (최소 샘플 수: {min_class_count})")
                train_indices, test_indices = train_test_split(
                    indices, test_size=0.2, random_state=42
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
            emotion_labels = {0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람'}
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
            
            # 텍스트 전처리 (줄바꿈, 탭을 공백으로 변환하고 연속 공백 통합)
            import re
            processed_text = str(text)
            # 줄바꿈(\n, \r\n)을 공백으로 변환
            processed_text = re.sub(r'\r?\n', ' ', processed_text)
            # 탭 문자를 공백으로 변환
            processed_text = processed_text.replace('\t', ' ')
            # 연속된 공백을 하나로 통합
            processed_text = re.sub(r'\s+', ' ', processed_text).strip()
            
            # 텍스트 벡터화
            X = self.model_obj.vectorizer.transform([processed_text])
            
            # 예측
            prediction = self.model_obj.model.predict(X)[0]
            probabilities = self.model_obj.model.predict_proba(X)[0]
            
            emotion_labels = {0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람'}
            
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
    
    def _try_load_model(self):
        """모델 파일이 있으면 자동 로드"""
        try:
            if self.model_file.exists() and self.vectorizer_file.exists():
                ic("모델 파일 발견, 자동 로드 시도...")
                with open(self.model_file, 'rb') as f:
                    self.model_obj.model = pickle.load(f)
                with open(self.vectorizer_file, 'rb') as f:
                    self.model_obj.vectorizer = pickle.load(f)
                
                # 메타데이터 확인 (CSV 파일이 업데이트되었는지 확인)
                if self.metadata_file.exists():
                    with open(self.metadata_file, 'rb') as f:
                        metadata = pickle.load(f)
                    # pathlib을 사용하여 파일 수정 시간 가져오기 (os 대신)
                    csv_mtime = self.csv_file_path.stat().st_mtime
                    if metadata.get('csv_mtime') == csv_mtime:
                        ic("모델 자동 로드 성공 (CSV 파일 변경 없음)")
                        return True
                    else:
                        ic("CSV 파일이 업데이트됨, 재학습 필요")
                        self.model_obj.model = None
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
            if self.model_obj.model is None or self.model_obj.vectorizer is None:
                raise ValueError("모델이 학습되지 않았습니다. learning()을 먼저 실행하세요.")
            
            # 모델 디렉토리 생성 (존재하지 않으면 생성)
            try:
                self.model_dir.mkdir(parents=True, exist_ok=True)
                ic(f"모델 디렉토리 확인/생성: {self.model_dir}")
            except Exception as dir_error:
                ic(f"Path.mkdir 실패: {dir_error}, os.makedirs로 재시도...")
                # os.makedirs로 재시도 (이미 파일 상단에서 import됨)
                os.makedirs(str(self.model_dir), exist_ok=True)
                ic(f"os.makedirs로 디렉토리 생성 완료: {self.model_dir}")
            
            # 디렉토리 존재 확인
            if not self.model_dir.exists():
                raise OSError(f"모델 디렉토리를 생성할 수 없습니다: {self.model_dir}")
            
            # 모델 저장
            with open(self.model_file, 'wb') as f:
                pickle.dump(self.model_obj.model, f)
            ic(f"모델 저장 완료: {self.model_file}")
            
            # Vectorizer 저장
            with open(self.vectorizer_file, 'wb') as f:
                pickle.dump(self.model_obj.vectorizer, f)
            ic(f"Vectorizer 저장 완료: {self.vectorizer_file}")
            
            # 메타데이터 저장 (CSV 파일 수정 시간 포함)
            # pathlib을 사용하여 파일 수정 시간 가져오기 (os 대신)
            csv_mtime = self.csv_file_path.stat().st_mtime
            metadata = {
                'csv_mtime': csv_mtime,
                'csv_path': str(self.csv_file_path),
                'trained_at': datetime.now().isoformat(),
                'data_count': len(self.df) if self.df is not None else 0
            }
            with open(self.metadata_file, 'wb') as f:
                pickle.dump(metadata, f)
            ic(f"메타데이터 저장 완료: {self.metadata_file}")
            
        except Exception as e:
            ic(f"모델 저장 오류: {e}")
            raise
    
    def submit(self):
        """제출/모델 저장"""
        ic("😎😎 제출 시작")
        self.save_model()
        ic("😎😎 제출 완료")

