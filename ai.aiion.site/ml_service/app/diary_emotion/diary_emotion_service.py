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
from scipy.sparse import hstack

# ic 먼저 정의
try:
    from icecream import ic  # type: ignore
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# gensim import (ic 정의 후)
try:
    from gensim.models import Word2Vec, FastText
    from gensim.utils import simple_preprocess
    GENSIM_AVAILABLE = True
except ImportError:
    GENSIM_AVAILABLE = False
    ic("경고: gensim이 설치되지 않았습니다. Word2Vec 기능을 사용할 수 없습니다.")

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.diary_emotion.save.diary_emotion_dataset import DiaryEmotionDataSet
from app.diary_emotion.save.diary_emotion_model import DiaryEmotionModel
from app.diary_emotion.save.diary_emotion_method import DiaryEmotionMethod
from app.diary_emotion.save.diary_emotion_schema import DiaryEmotionSchema


class DiaryEmotionService:
    """일기 감정 분류 데이터 처리 및 머신러닝 서비스"""
    
    def __init__(self, csv_file_path: Optional[Path] = None):
        """초기화"""
        self.dataset = DiaryEmotionDataSet()
        self.model_obj = DiaryEmotionModel()
        self.method = DiaryEmotionMethod()  # 전처리 메서드 클래스
        # CSV 파일 경로 (data/ 폴더에 있음)
        self.csv_file_path = csv_file_path or (Path(__file__).parent.parent / "data" / "diary.csv")
        self.df: Optional[pd.DataFrame] = None
        # 모델 저장 경로 (diary_emotion/models/ 폴더)
        self.model_dir = Path(__file__).parent.parent / "models"
        self.model_dir.mkdir(exist_ok=True)
        self.model_file = self.model_dir / "diary_emotion_model.pkl"
        self.vectorizer_file = self.model_dir / "diary_emotion_vectorizer.pkl"
        self.word2vec_file = self.model_dir / "diary_emotion_word2vec.pkl"
        self.metadata_file = self.model_dir / "diary_emotion_metadata.pkl"
        self.use_word2vec = GENSIM_AVAILABLE  # Word2Vec 사용 여부
        ic("DiaryEmotionService 초기화")
        
        # 서비스 시작 시 모델 자동 로드 시도
        self._try_load_model()
    
    def preprocess(self):
        """데이터 전처리"""
        ic("😎😎 전처리 시작")
        
        try:
            # CSV 파일 로드 (method 사용)
            self.df = self.method.load_csv(self.csv_file_path)
            ic(f"CSV 파일 경로: {self.csv_file_path}")
            ic(f"CSV 파일 존재 여부: {self.csv_file_path.exists()}")
            
            # 데이터 기본 정보 확인
            ic(f"컬럼: {list(self.df.columns)}")
            ic(f"데이터 타입: {self.df.dtypes.to_dict()}")
            
            # 결측치 처리 (method 사용)
            self.df = self.method.handle_missing_values(self.df, ['content', 'emotion'])
            
            # 감정 분포 확인
            emotion_dist = self.method.get_label_distribution(self.df, 'emotion')
            if emotion_dist:
                ic(f"감정 분포: {emotion_dist}")
            
            # 텍스트 전처리 (method 사용)
            self.df = self.method.preprocess_text(self.df)
            
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
            # 문맥 이해를 위해 더 긴 n-gram 사용
            self.model_obj.vectorizer = TfidfVectorizer(
                max_features=10000,  # 5000 -> 10000으로 증가 (더 많은 특징 추출)
                ngram_range=(1, 4),  # (1,3) -> (1,4)로 증가 (4-gram까지 포함, 문맥 더 많이 반영)
                min_df=1,  # 2 -> 1로 감소 (더 많은 단어 포함)
                max_df=0.90,  # 0.95 -> 0.90으로 감소 (너무 흔한 단어 제거)
                sublinear_tf=True  # 로그 스케일링으로 정확도 향상
            )
            
            # Word2Vec 모델 초기화 (문맥 기반 임베딩)
            if self.use_word2vec:
                ic("Word2Vec 모델 초기화 (문맥 이해)")
                self.model_obj.word2vec_model = Word2Vec(
                    vector_size=100,      # 임베딩 차원
                    window=5,              # 문맥 윈도우 크기 (앞뒤 5개 단어)
                    min_count=2,           # 최소 등장 횟수
                    workers=4,             # 병렬 처리
                    sg=0                  # CBOW 사용 (0: CBOW, 1: Skip-gram)
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
            
            # TF-IDF 벡터화
            X_tfidf = self.model_obj.vectorizer.fit_transform(X_text)
            
            # Word2Vec 임베딩 생성 (문맥 정보 포함)
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                ic("Word2Vec 모델 학습 중...")
                # 텍스트를 단어 리스트로 변환
                sentences = [simple_preprocess(text, deacc=True, min_len=1) for text in X_text]
                # Word2Vec 모델 학습
                self.model_obj.word2vec_model.build_vocab(sentences)
                self.model_obj.word2vec_model.train(
                    sentences, 
                    total_examples=len(sentences), 
                    epochs=10
                )
                
                # 각 텍스트를 Word2Vec 임베딩 벡터로 변환 (평균 벡터)
                def text_to_embedding(text):
                    words = simple_preprocess(text, deacc=True, min_len=1)
                    if len(words) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    # 문장의 모든 단어 임베딩의 평균
                    word_vectors = [
                        self.model_obj.word2vec_model.wv[word] 
                        for word in words 
                        if word in self.model_obj.word2vec_model.wv
                    ]
                    if len(word_vectors) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    return np.mean(word_vectors, axis=0)
                
                X_word2vec = np.array([text_to_embedding(text) for text in X_text])
                
                # TF-IDF와 Word2Vec 결합 (문맥 정보 포함)
                from scipy.sparse import csr_matrix
                X_word2vec_sparse = csr_matrix(X_word2vec)
                X = hstack([X_tfidf, X_word2vec_sparse])
                ic(f"TF-IDF + Word2Vec 결합 완료 (TF-IDF: {X_tfidf.shape}, Word2Vec: {X_word2vec.shape})")
            else:
                # Word2Vec 없이 TF-IDF만 사용
                X = X_tfidf
                ic("TF-IDF만 사용 (Word2Vec 없음)")
            
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
            X_test_tfidf = self.model_obj.vectorizer.transform(X_test_text)
            
            # Word2Vec 임베딩 생성 (있는 경우)
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                def text_to_embedding(text):
                    words = simple_preprocess(text, deacc=True, min_len=1)
                    if len(words) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    word_vectors = [
                        self.model_obj.word2vec_model.wv[word] 
                        for word in words 
                        if word in self.model_obj.word2vec_model.wv
                    ]
                    if len(word_vectors) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    return np.mean(word_vectors, axis=0)
                
                X_test_word2vec = np.array([text_to_embedding(text) for text in X_test_text])
                from scipy.sparse import csr_matrix
                X_test_word2vec_sparse = csr_matrix(X_test_word2vec)
                X_test = hstack([X_test_tfidf, X_test_word2vec_sparse])
            else:
                X_test = X_test_tfidf
            y_test = self.dataset.test['emotion'].values
            
            # 예측
            y_pred = self.model_obj.model.predict(X_test)
            
            # 정확도 계산
            accuracy = accuracy_score(y_test, y_pred)
            ic(f"정확도: {accuracy:.4f}")
            
            # 분류 보고서
            emotion_labels = {
                0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람',
                7: '신뢰', 8: '기대', 9: '불안', 10: '안도', 11: '후회', 12: '그리움', 13: '감사', 14: '외로움'
            }
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
            
            # TF-IDF 벡터화
            X_tfidf = self.model_obj.vectorizer.transform([processed_text])
            
            # Word2Vec 임베딩 생성 (문맥 정보 포함)
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                def text_to_embedding(text):
                    words = simple_preprocess(text, deacc=True, min_len=1)
                    if len(words) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    word_vectors = [
                        self.model_obj.word2vec_model.wv[word] 
                        for word in words 
                        if word in self.model_obj.word2vec_model.wv
                    ]
                    if len(word_vectors) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    return np.mean(word_vectors, axis=0)
                
                X_word2vec = np.array([text_to_embedding(processed_text)])
                
                # TF-IDF와 Word2Vec 결합
                from scipy.sparse import csr_matrix
                X_word2vec_sparse = csr_matrix(X_word2vec)
                X = hstack([X_tfidf, X_word2vec_sparse])
            else:
                X = X_tfidf
            
            # 예측 및 확률 계산
            prediction = self.model_obj.model.predict(X)[0]
            probabilities = self.model_obj.model.predict_proba(X)[0]
            
            emotion_labels = {
                0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람',
                7: '신뢰', 8: '기대', 9: '불안', 10: '안도', 11: '후회', 12: '그리움', 13: '감사', 14: '외로움'
            }
            
            # 키워드 기반 가중치 보정
            probabilities = self._apply_keyword_weights(text, probabilities, emotion_labels)
            
            # 평가불가 확률 0.84배로 조정 (16% 감소)
            if len(probabilities) > 0:
                probabilities[0] = probabilities[0] * 0.84
                # 정규화
                probabilities = probabilities / (probabilities.sum() + 1e-10)
                ic(f"평가불가 확률 0.84배로 조정 (16% 감소)")
            
            # 평가불가 확률 추가 감소: 다른 감정의 확률이 높으면 평가불가 확률을 더 낮춤
            if len(probabilities) > 0:
                # 평가불가(0번)를 제외한 다른 감정의 최대 확률
                other_emotions_probs = probabilities[1:] if len(probabilities) > 1 else []
                if len(other_emotions_probs) > 0:
                    max_other_emotion_prob = float(np.max(other_emotions_probs))
                    cannot_evaluate_prob = float(probabilities[0])
                    
                    # 다른 감정의 최대 확률이 평가불가 확률보다 높거나 비슷하면 평가불가 확률 감소
                    if max_other_emotion_prob >= cannot_evaluate_prob * 0.8:
                        # 평가불가 확률을 15% 감소
                        probabilities[0] = probabilities[0] * 0.85
                        # 정규화
                        probabilities = probabilities / (probabilities.sum() + 1e-10)
                        ic(f"다른 감정 확률이 높음 ({max_other_emotion_prob:.3f} vs {cannot_evaluate_prob:.3f}), 평가불가 확률 15% 감소")
            
            # 슬픔 > 평범 > 기쁨 순서 조정: 슬픔 확률 증가, 기쁨 확률 감소 (미세 조정)
            if len(probabilities) > 2:
                sadness_prob = float(probabilities[2])  # 슬픔 (인덱스 2)
                joy_prob = float(probabilities[1])      # 기쁨 (인덱스 1)
                ordinary_prob = float(probabilities[0]) # 평범/평가불가 (인덱스 0)
                
                # 슬픔과 기쁨이 모두 일정 확률 이상일 때 미세 조정 (조건: 20% 이상)
                if sadness_prob > 0.20 and joy_prob > 0.20:
                    # 슬픔 확률 8% 증가 (미세 조정 강화)
                    probabilities[2] = sadness_prob * 1.08
                    # 기쁨 확률 8% 감소 (미세 조정 강화)
                    probabilities[1] = joy_prob * 0.92
                    # 정규화
                    probabilities = probabilities / (probabilities.sum() + 1e-10)
                    ic(f"슬픔/기쁨 확률 미세 조정: 슬픔 {sadness_prob:.3f} -> {probabilities[2]:.3f}, 기쁨 {joy_prob:.3f} -> {probabilities[1]:.3f}")
                
                # 슬픔이 기쁨보다 낮으면 추가 미세 조정
                if probabilities[2] < probabilities[1]:
                    # 슬픔과 기쁨의 차이를 줄이기 위해 추가 미세 조정
                    diff = probabilities[1] - probabilities[2]
                    if diff > 0.005:  # 차이가 0.5% 이상이면 (조건 완화)
                        # 슬픔 확률 추가 미세 증가 (5%)
                        probabilities[2] = probabilities[2] * 1.05
                        # 기쁨 확률 추가 미세 감소 (5%)
                        probabilities[1] = probabilities[1] * 0.95
                        # 정규화
                        probabilities = probabilities / (probabilities.sum() + 1e-10)
                        ic(f"슬픔 < 기쁨 순서 역전 방지 (미세 조정): 슬픔 {probabilities[2]:.3f}, 기쁨 {probabilities[1]:.3f}")
                
                # 슬픔이 평범보다 낮으면 추가 조정
                if probabilities[2] < probabilities[0]:
                    # 슬픔 확률을 평범보다 약간 높게 조정
                    diff = probabilities[0] - probabilities[2]
                    if diff > 0.005:  # 차이가 0.5% 이상이면
                        # 슬픔 확률 추가 미세 증가 (3%)
                        probabilities[2] = probabilities[2] * 1.03
                        # 정규화
                        probabilities = probabilities / (probabilities.sum() + 1e-10)
                        ic(f"슬픔 < 평범 순서 역전 방지 (미세 조정): 슬픔 {probabilities[2]:.3f}, 평범 {probabilities[0]:.3f}")
            
            # 긍정 감정 확률 0.02씩 증가 (기쁨, 감사, 신뢰, 기대, 안도)
            if len(probabilities) > 14:
                # 기쁨 (1)
                if probabilities[1] > 0:
                    joy_prob_before = float(probabilities[1])
                    probabilities[1] = probabilities[1] + 0.02
                    ic(f"기쁨 확률 0.02 증가: {joy_prob_before:.3f} -> {probabilities[1]:.3f}")
                
                # 감사 (13)
                if probabilities[13] > 0:
                    gratitude_prob_before = float(probabilities[13])
                    probabilities[13] = probabilities[13] + 0.02
                    ic(f"감사 확률 0.02 증가: {gratitude_prob_before:.3f} -> {probabilities[13]:.3f}")
                
                # 신뢰 (7)
                if probabilities[7] > 0:
                    trust_prob_before = float(probabilities[7])
                    probabilities[7] = probabilities[7] + 0.02
                    ic(f"신뢰 확률 0.02 증가: {trust_prob_before:.3f} -> {probabilities[7]:.3f}")
                
                # 기대 (8)
                if probabilities[8] > 0:
                    expectation_prob_before = float(probabilities[8])
                    probabilities[8] = probabilities[8] + 0.02
                    ic(f"기대 확률 0.02 증가: {expectation_prob_before:.3f} -> {probabilities[8]:.3f}")
                
                # 안도 (10)
                if probabilities[10] > 0:
                    relief_prob_before = float(probabilities[10])
                    probabilities[10] = probabilities[10] + 0.02
                    ic(f"안도 확률 0.02 증가: {relief_prob_before:.3f} -> {probabilities[10]:.3f}")
                
                # 정규화
                probabilities = probabilities / (probabilities.sum() + 1e-10)
                ic(f"긍정 감정 확률 보정 완료 및 정규화")
            
            # 최대 확률과 해당 클래스 찾기
            max_prob_idx = int(np.argmax(probabilities))
            max_prob = float(probabilities[max_prob_idx])
            
            # 평가불가 확률 확인
            cannot_evaluate_prob = float(probabilities[0]) if len(probabilities) > 0 else 0.0
            
            # 확률 임계값 설정
            CONFIDENCE_THRESHOLD = 0.3
            MIN_CONFIDENCE_FOR_EVALUATION = 0.15  # 평가 가능한 최소 확률 (15% 이상이면 평가 가능)
            CANNOT_EVALUATE_THRESHOLD = 0.5  # 평가불가로 판단하는 최소 확률 (50% 이상이어야 평가불가로 판단)
            
            # 1. 최대 확률이 평가불가(0)인 경우 특별 처리
            if max_prob_idx == 0:
                # 평가불가가 가장 높은 확률이지만, 확률이 충분히 높아야만 평가불가로 판단
                if max_prob >= CANNOT_EVALUATE_THRESHOLD:
                    # 평가불가 확률이 50% 이상이면 평가불가로 판단
                    final_prediction = 0
                    final_label = '평가불가'
                    ic(f"평가불가가 최대 확률 ({max_prob:.3f})이고 임계값({CANNOT_EVALUATE_THRESHOLD}) 이상: 평가불가로 판단")
                else:
                    # 평가불가 확률이 낮으면 두 번째로 높은 감정 확인
                    sorted_indices = np.argsort(probabilities)[::-1]
                    if len(sorted_indices) > 1 and len(probabilities) > 1:
                        second_max_idx = int(sorted_indices[1])
                        if 0 <= second_max_idx < len(probabilities):
                            second_max_prob = float(probabilities[second_max_idx])
                            # 두 번째 감정의 확률이 일정 수준 이상이면 그 감정 선택
                            if second_max_prob >= MIN_CONFIDENCE_FOR_EVALUATION and second_max_idx != 0:
                                final_prediction = second_max_idx
                                final_label = emotion_labels.get(second_max_idx, f'클래스{second_max_idx}')
                                ic(f"평가불가 확률 낮음 ({max_prob:.3f}), 두 번째 감정 선택: {final_label} ({second_max_prob:.3f})")
                            else:
                                # 두 번째 감정도 확률이 낮으면 평가불가
                                final_prediction = 0
                                final_label = '평가불가'
                                ic(f"평가불가가 최대 확률이지만 낮음 ({max_prob:.3f}), 다른 감정도 낮음: 평가불가로 판단")
                    else:
                        final_prediction = 0
                        final_label = '평가불가'
                        ic(f"평가불가가 최대 확률 ({max_prob:.3f}): 평가불가로 판단")
            # 2. 최대 확률이 충분히 높으면 모델 예측 사용 (우선순위 높음)
            elif max_prob >= CONFIDENCE_THRESHOLD:
                final_prediction = max_prob_idx
                final_label = emotion_labels.get(max_prob_idx, '알 수 없음')
                ic(f"최대 확률 충분 ({max_prob:.3f}): {final_label}로 판단")
            # 3. 최대 확률이 낮은 경우에도 모델 예측 사용 (모델이 학습 데이터로 판단)
            elif max_prob >= MIN_CONFIDENCE_FOR_EVALUATION:
                # 모델 예측 사용 (최대 확률이 15% 이상이면)
                final_prediction = max_prob_idx
                final_label = emotion_labels.get(max_prob_idx, '알 수 없음')
                ic(f"모델 예측 사용: {final_label} ({max_prob:.3f})")
            # 4. 확률이 매우 낮으면 평가불가
            else:
                # 확률이 매우 낮으면 평가불가
                final_prediction = 0
                final_label = '평가불가'
                ic(f"확률 매우 낮음 ({max_prob:.3f}): 평가불가로 판단")
            
            # 확률 정보 구성 (상위 감정들에 집중하여 확률을 더 명확하게 표시)
            # 상위 3개 감정의 확률을 추출하고 재분배
            top_3_indices = np.argsort(probabilities)[::-1][:3]  # 상위 3개 인덱스
            top_3_probs = probabilities[top_3_indices]  # 상위 3개 확률
            
            # 상위 3개 확률의 합
            top_3_sum = top_3_probs.sum()
            
            # 상위 3개 확률을 재분배: 합이 0.85가 되도록 스케일링
            # (나머지 12개 감정이 0.15를 차지)
            if top_3_sum > 0:
                scale_factor = 0.85 / top_3_sum
                # 최대 2배까지만 스케일링 (너무 과도하게 증가하지 않도록)
                scale_factor = min(scale_factor, 2.0)
            else:
                scale_factor = 1.0
            
            # 전체 확률 딕셔너리 생성
            prob_dict = {}
            total_prob = 0.0
            
            for i, prob in enumerate(probabilities):
                label = emotion_labels.get(i, f'클래스{i}')
                if i in top_3_indices:
                    # 상위 3개는 스케일링된 확률 사용
                    scaled_prob = float(prob * scale_factor)
                    prob_dict[label] = scaled_prob
                    total_prob += scaled_prob
                else:
                    # 나머지는 원래 확률을 약간 축소 (상위 3개에 집중)
                    reduced_prob = float(prob * 0.15 / (probabilities.sum() - top_3_sum)) if (probabilities.sum() - top_3_sum) > 0 else float(prob * 0.1)
                    prob_dict[label] = reduced_prob
                    total_prob += reduced_prob
            
            # 최종 정규화: 모든 확률의 합이 1이 되도록
            if total_prob > 0:
                for label in prob_dict:
                    prob_dict[label] = prob_dict[label] / total_prob
            
            # 최대 확률도 업데이트
            max_prob_normalized = prob_dict.get(emotion_labels.get(max_prob_idx, '알 수 없음'), max_prob)
            
            return {
                'emotion': final_prediction,
                'emotion_label': final_label,
                'probabilities': prob_dict,
                'confidence': max_prob_normalized,  # 정규화된 최대 확률
                'original_confidence': max_prob,  # 원래 최대 확률 (디버깅용)
                'original_prediction': int(prediction)  # 원래 예측 결과도 포함 (디버깅용)
            }
            
        except Exception as e:
            ic(f"예측 오류: {e}")
            raise
    
    def _apply_keyword_weights(self, text: str, probabilities: np.ndarray, emotion_labels: Dict[int, str]) -> np.ndarray:
        """키워드 기반 가중치를 적용하여 확률 보정"""
        # 텍스트를 소문자로 변환하여 검색
        text_lower = text.lower()
        
        # 감정별 키워드 및 가중치 정의
        keyword_weights = {
            # 평가불가 (중립적 내용: 공문서, 메모, 단순 기록) - 매우 제한적으로만 적용
            0: {  # 평가불가
                'keywords': [
                    # 공문서/공무 관련 (구체적인 공식 용어만)
                    '공문', '공무를', '공무를 봤다', '공무를 보았다', '공무를 본', '공무를 보고',
                    '공문서', '공문을', '공문을 써', '공문을 보냈다', '공문을 작성',
                    '동헌에 나가', '동헌에서', '동헌에',
                    # 문서/보고서 관련 (공식적인 용어만)
                    '문서 작성', '문서 작성했다', '문서를 작성',
                    '보고서', '보고서를', '보고를 작성',
                    '시행', '시달', '결재', '승인', '결재했다', '승인했다',
                    '회의록', '회의를 진행', '회의를 했다',
                    '안건', '안건을', '안건 처리', '안건을 처리',
                    # 메모/기록 관련 (공식적인 용어만)
                    '메모를 작성', '메모를 했다',
                    '기록을 작성', '기록을 했다',
                    # 공식적/업무적 표현
                    '부임', '부임했다', '부임하여'
                ],
                'weight': 0.1  # 가중치 대폭 낮춤 (0.3 -> 0.1): 평가불가 판정을 최소화
            },
            # 긍정적 감정 (기쁨, 감사, 신뢰, 기대, 안도) - 가중치 +1
            1: {  # 기쁨
                'keywords': [
                    # 기본 긍정 표현
                    '행복', '즐거움', '기쁨', '신남', '설렘', '웃음', '웃었다', '웃고', '즐겁', '재미있', '재밌', 
                    '좋았', '좋다', '좋아', '만족', '기쁘', '신나', '즐거', '행복하', '행복한',
                    '기분 좋', '기분 좋았', '기분 좋다', '기분 좋아', '기분이 좋', '기분이 좋았', '기분이 좋다',
                    '맛있', '맛있어', '맛있었', '맛있다', '맛있네', '맛있고',
                    # 비속어/신조어 - 긍정 강조 표현
                    '개좋', '개쩐', '개재밌', '개신나', '개만족', '개행복', '개즐거', '개기쁨', '개웃김', '개웃겨',
                    '존나좋', '존나좋아', '존나좋다', '존맛', '존맛탱', '존재밌', '존신나', '존만족', '존행복',
                    '완전좋', '완전재밌', '완전행복', '완전만족', '완전기쁨', '완전즐거',
                    '진짜좋', '진짜재밌', '진짜행복', '진짜만족', '진짜기쁨',
                    '너무좋', '너무재밌', '너무행복', '너무만족', '너무기쁨',
                    '대박', '대박나', '대박이야', '대박이다',
                    '최고', '최고다', '최고야', '최고임',
                    '짱', '짱이야', '짱이다', '짱임',
                    '헐', '헐대박', '헐개좋', '헐재밌'
                ],
                'weight': 1.5  # 비속어/신조어 포함으로 가중치 약간 증가
            },
            13: {  # 감사
                'keywords': ['감사', '고맙', '고마워', '감사하', '감사한', '고마', '고맙다', '감사하다', '고마워요', '고맙습니다'],
                'weight': 1.0
            },
            7: {  # 신뢰
                'keywords': ['믿음', '믿', '신뢰', '믿을', '믿고', '믿는다', '신뢰하', '신뢰할'],
                'weight': 1.0
            },
            8: {  # 기대
                'keywords': ['기대', '기대되', '기대한', '기대하', '기대된다', '기대돼', '기대해', '기대할'],
                'weight': 1.0
            },
            10: {  # 안도
                'keywords': ['안심', '편안', '안도', '안도감', '안심되', '편안하', '편안한', '안심하', '안도하', '안심된다', '편안하다'],
                'weight': 1.0
            },
            # 부정적 감정 (슬픔, 분노, 두려움, 혐오, 불안, 후회, 외로움) - 가중치 +2
            2: {  # 슬픔
                'keywords': [
                    # 기본 슬픔 표현
                    '슬프', '슬픔', '눈물', '울었', '울고', '슬퍼', '슬펐', '슬프다', '슬퍼서', '눈물이', '눈물을', '우울', '우울하', '우울한', '슬프네', '슬프고',
                    '아쉬', '아쉬워', '아쉬웠', '아쉬웠다', '아쉽', '아쉽다', '아쉬워서', '아쉬웠어',
                    # 비속어/신조어 - 슬픔 강조 표현
                    '개슬프', '개우울', '개눈물', '개슬퍼',
                    '존나슬프', '존나우울', '존나눈물',
                    '완전슬프', '완전우울', '완전눈물',
                    '진짜슬프', '진짜우울', '진짜눈물'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            3: {  # 분노
                'keywords': [
                    # 기본 분노 표현
                    '화나', '화났', '짜증', '분노', '화가', '화났다', '짜증나', '짜증났', '화나서', '분노하', '분노한', '화났어', '짜증나네', '화나네',
                    # 비속어/신조어 - 분노 강조 표현
                    '개짜증', '개화나', '개분노', '개빡', '개빡쳐', '개빡쳤', '개빡침',
                    '존나짜증', '존나화나', '존나분노', '존나빡', '존나빡쳐',
                    '완전짜증', '완전화나', '완전분노', '완전빡',
                    '진짜짜증', '진짜화나', '진짜분노', '진짜빡',
                    '너무짜증', '너무화나', '너무분노',
                    '핵짜증', '핵빡', '핵빡침'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            4: {  # 두려움
                'keywords': [
                    # 기본 두려움 표현
                    '무섭', '두렵', '두려움', '무서워', '무서웠', '두려워', '두려웠', '무서', '두려', '무섭다', '두렵다', '무서웠다', '두려웠다', '무서워서', '두려워서',
                    # 비속어/신조어 - 두려움 강조 표현
                    '개무서', '개두려', '개무섭', '개무서워',
                    '존나무서', '존나두려', '존나무섭',
                    '완전무서', '완전두려', '완전무섭',
                    '진짜무서', '진짜두려', '진짜무섭',
                    '겁나무서', '겁나두려', '겁나무섭'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            5: {  # 혐오
                'keywords': [
                    # 기본 혐오 표현
                    '싫', '혐오', '싫어', '싫다', '싫었', '싫은', '혐오하', '혐오스러', '싫어서', '싫어요', '싫어해', '혐오스럽', '혐오스러워',
                    # 비속어/신조어 - 혐오 강조 표현
                    '개싫', '개역겹', '개더러워', '개더러움', '개징그러워', '개징그럽',
                    '존나싫', '존나역겹', '존나더러워', '존나징그러워', '존나징그럽',
                    '씹노맛', '씹극혐', '씹역겹', '씹더러워', '씹징그러워',
                    '완전싫', '완전역겹', '완전더러워', '완전징그러워',
                    '진짜싫', '진짜역겹', '진짜더러워', '진짜징그러워',
                    '핵불쾌', '핵역겹', '핵더러워', '핵징그러워',
                    '극혐', '토나와', '쌉', '쌉싫'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            9: {  # 불안
                'keywords': [
                    # 기본 불안 표현
                    '불안', '걱정', '불안하', '불안한', '걱정되', '걱정하', '걱정이', '불안해', '불안하다', '걱정된다', '걱정돼', '불안감', '걱정스러',
                    # 비속어/신조어 - 불안 강조 표현
                    '개불안', '개걱정', '개걱정되', '개걱정돼',
                    '존나불안', '존나걱정', '존나걱정되',
                    '완전불안', '완전걱정', '완전걱정되',
                    '진짜불안', '진짜걱정', '진짜걱정되'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            11: {  # 후회
                'keywords': ['후회', '후회하', '후회한', '후회되', '후회돼', '후회해', '후회한다', '후회하고', '후회했', '후회할'],
                'weight': 1.8  # 2.0 -> 1.8: 부정 감정 과대평가 완화
            },
            14: {  # 외로움
                'keywords': ['외롭', '외로움', '외로워', '외로웠', '외롭다', '외로워서', '외로웠다', '외롭네', '외롭고', '외로워요'],
                'weight': 1.8  # 2.0 -> 1.8: 부정 감정 과대평가 완화
            },
            # 중립적 감정 (그리움, 놀람) - 최소 가중치
            12: {  # 그리움
                'keywords': ['그립', '그리움', '그리워', '그리웠', '그리다', '그리워서', '그리웠다', '보고싶', '보고싶어', '보고싶다', '보고싶었'],
                'weight': 0.5
            },
            6: {  # 놀람
                'keywords': ['놀랍', '놀람', '놀라', '놀랐', '의외', '놀랐다', '놀라워', '놀라웠', '의외다', '의외네', '놀라서', '놀랐어'],
                'weight': 0.5
            }
        }
        
        # 각 감정별로 키워드 매칭 및 가중치 계산
        weight_scores = np.zeros(len(probabilities))
        
        for emotion_id, config in keyword_weights.items():
            if emotion_id >= len(probabilities):
                continue
                
            keywords = config['keywords']
            weight = config['weight']
            
            # 키워드 매칭 개수 계산
            match_count = sum(1 for keyword in keywords if keyword in text_lower)
            
            # Word2Vec 유사도 기반 가중치 계산 (키워드 매칭이 없거나 적을 때 보완)
            similarity_score = 0.0
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                try:
                    # 텍스트를 단어 리스트로 변환
                    text_words = simple_preprocess(text_lower, deacc=True, min_len=1)
                    
                    # 각 감정 키워드와 입력 텍스트 단어 간의 유사도 계산
                    similarities = []
                    for keyword in keywords:
                        if keyword not in self.model_obj.word2vec_model.wv:
                            continue
                        for word in text_words:
                            if word in self.model_obj.word2vec_model.wv:
                                try:
                                    sim = self.model_obj.word2vec_model.wv.similarity(keyword, word)
                                    if sim > 0.3:  # 유사도 임계값 (0.3 이상만 사용)
                                        similarities.append(sim)
                                except KeyError:
                                    continue
                    
                    if similarities:
                        # 최대 유사도 사용 (또는 평균 유사도)
                        similarity_score = max(similarities) * 0.5  # 유사도 가중치 (0.5배 적용)
                        ic(f"감정 {emotion_labels.get(emotion_id, emotion_id)}: Word2Vec 유사도 {similarity_score:.3f} (최대 {max(similarities):.3f})")
                except Exception as e:
                    ic(f"Word2Vec 유사도 계산 오류: {e}")
            
            # 키워드 매칭과 Word2Vec 유사도 결합
            if match_count > 0:
                # 키워드가 발견되면 가중치 적용 (매칭 개수에 비례)
                weight_scores[emotion_id] = match_count * weight + similarity_score
                ic(f"감정 {emotion_labels.get(emotion_id, emotion_id)}: {match_count}개 키워드 매칭, 가중치 {weight_scores[emotion_id]:.3f}")
            elif similarity_score > 0:
                # 키워드 매칭은 없지만 Word2Vec 유사도가 있으면 가중치 적용
                weight_scores[emotion_id] = similarity_score * weight
                ic(f"감정 {emotion_labels.get(emotion_id, emotion_id)}: 키워드 매칭 없음, Word2Vec 유사도만 적용, 가중치 {weight_scores[emotion_id]:.3f}")
        
        # 가중치를 확률에 적용 (소프트맥스 방식)
        if weight_scores.sum() > 0:
            # 가중치를 정규화하여 확률에 더함
            normalized_weights = weight_scores / (weight_scores.sum() + 1e-10) * 0.25  # 최대 25% 보정 (15% -> 25%로 증가)
            adjusted_probs = probabilities + normalized_weights
            
            # 평가불가 확률 추가 감소: 다른 감정 키워드가 발견되면 평가불가 확률을 더 낮춤
            if len(probabilities) > 0:
                # 평가불가(0번)를 제외한 다른 감정의 가중치 합 계산
                other_emotions_weight = weight_scores[1:].sum() if len(weight_scores) > 1 else 0
                
                # 다른 감정 키워드가 발견되었고 평가불가 키워드가 없으면 평가불가 확률 감소
                if other_emotions_weight > 0 and weight_scores[0] == 0:
                    # 평가불가 확률을 10% 감소
                    adjusted_probs[0] = adjusted_probs[0] * 0.9
                    ic(f"다른 감정 키워드 발견 ({other_emotions_weight:.2f}), 평가불가 확률 10% 감소")
                elif other_emotions_weight > weight_scores[0] * 2:
                    # 다른 감정 키워드가 평가불가 키워드보다 2배 이상 많으면 평가불가 확률 10% 감소
                    adjusted_probs[0] = adjusted_probs[0] * 0.9
                    ic(f"다른 감정 키워드가 우세 ({other_emotions_weight:.2f} vs {weight_scores[0]:.2f}), 평가불가 확률 10% 감소")
            
            # 확률이 1을 넘지 않도록 정규화
            adjusted_probs = adjusted_probs / (adjusted_probs.sum() + 1e-10)
            
            return adjusted_probs
        
        return probabilities
    
    def _try_load_model(self):
        """모델 파일이 있으면 자동 로드"""
        try:
            if self.model_file.exists() and self.vectorizer_file.exists():
                ic("모델 파일 발견, 자동 로드 시도...")
                with open(self.model_file, 'rb') as f:
                    self.model_obj.model = pickle.load(f)
                with open(self.vectorizer_file, 'rb') as f:
                    self.model_obj.vectorizer = pickle.load(f)
                # Word2Vec 모델 로드 (있는 경우)
                if self.word2vec_file.exists() and self.use_word2vec:
                    with open(self.word2vec_file, 'rb') as f:
                        self.model_obj.word2vec_model = pickle.load(f)
                    ic("Word2Vec 모델 로드 완료")
                
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
                        # CSV 파일이 업데이트되었지만, 기존 모델을 사용 (재학습 권장)
                        ic("CSV 파일이 업데이트됨, 기존 모델 사용 (재학습 권장: /train 엔드포인트 호출)")
                        # 모델은 이미 로드되었으므로 그대로 사용
                        return True
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
            
            # Word2Vec 모델 저장 (있는 경우)
            if self.model_obj.word2vec_model is not None:
                with open(self.word2vec_file, 'wb') as f:
                    pickle.dump(self.model_obj.word2vec_model, f)
                ic(f"Word2Vec 모델 저장 완료: {self.word2vec_file}")
            
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

