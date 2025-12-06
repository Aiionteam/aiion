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
    
    def _keyword_based_emotion(self, text: str) -> Optional[int]:
        """키워드 기반 감정 분석 (fallback용)"""
        text_lower = text.lower()
        
        # 슬픔 키워드
        sadness_keywords = ['힘들', '고달픈', '슬프', '슬퍼', '우울', '우울하', '힘듦', '힘들어', 
                           '지치', '지쳐', '피곤', '피곤하', '아픈', '아프', '괴로', '괴롭',
                           '외로', '외롭', '쓸쓸', '서러', '서럽', '안타깝', '안타까', '비참',
                           '절망', '절망적', '실망', '실망하', '좌절', '좌절하', '답답', '답답하']
        
        # 분노 키워드
        anger_keywords = ['화나', '화났', '화가', '짜증', '짜증나', '분노', '분노하', '열받', '열받았',
                         '빡쳐', '빡쳤', '미워', '미웠', '싫어', '싫었', '증오', '증오하', '혐오',
                         '욕하', '욕했', '욕설', '비난', '비난하', '원망', '원망하']
        
        # 두려움 키워드
        fear_keywords = ['무서', '무섭', '두려', '두렵', '걱정', '걱정하', '불안', '불안하', '공포',
                        '공포스', '겁나', '겁났', '조심', '조심하', '신중', '신중하', '우려', '우려하']
        
        # 기쁨 키워드
        joy_keywords = ['기쁘', '기뻐', '행복', '행복하', '즐거', '즐겁', '신나', '신났', '좋아',
                       '좋았', '만족', '만족하', '뿌듯', '뿌듯하', '설레', '설렜', '환상', '환상적',
                       '기대', '기대하', '희망', '희망하', '긍정', '긍정적']
        
        # 놀람 키워드
        surprise_keywords = ['놀라', '놀랐', '놀람', '깜짝', '깜짝 놀라', '충격', '충격적', '의외',
                            '의외로', '예상', '예상치', '갑자기', '갑작스', '뜻밖', '뜻밖에']
        
        # 혐오 키워드
        disgust_keywords = ['역겨', '역겹', '더러', '더럽', '싫어', '싫었', '혐오', '혐오하',
                           '징그러', '징그럽', '구역질', '토할', '토했']
        
        # 키워드 매칭 점수 계산
        sadness_score = sum(1 for keyword in sadness_keywords if keyword in text_lower)
        anger_score = sum(1 for keyword in anger_keywords if keyword in text_lower)
        fear_score = sum(1 for keyword in fear_keywords if keyword in text_lower)
        joy_score = sum(1 for keyword in joy_keywords if keyword in text_lower)
        surprise_score = sum(1 for keyword in surprise_keywords if keyword in text_lower)
        disgust_score = sum(1 for keyword in disgust_keywords if keyword in text_lower)
        
        # 가장 높은 점수의 감정 반환
        scores = {
            2: sadness_score,  # 슬픔
            3: anger_score,    # 분노
            4: fear_score,     # 두려움
            1: joy_score,      # 기쁨
            6: surprise_score, # 놀람
            5: disgust_score   # 혐오
        }
        
        max_score = max(scores.values())
        if max_score > 0:
            # 가장 높은 점수의 감정 반환
            for emotion, score in scores.items():
                if score == max_score:
                    return emotion
        
        return None  # 키워드 매칭 실패
    
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
            
            emotion_labels = {0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람'}
            
            # 최대 확률과 해당 클래스 찾기
            max_prob_idx = int(np.argmax(probabilities))
            max_prob = float(probabilities[max_prob_idx])
            
            # 확률 임계값 설정 (0.3 미만이면 키워드 기반 fallback 사용)
            CONFIDENCE_THRESHOLD = 0.3
            
            # 확률이 낮은 경우 키워드 기반 감정 분석 시도
            if max_prob < CONFIDENCE_THRESHOLD:
                keyword_emotion = self._keyword_based_emotion(processed_text)
                if keyword_emotion is not None:
                    # 키워드 기반 감정이 있으면 사용
                    final_prediction = keyword_emotion
                    final_label = emotion_labels.get(final_prediction, '알 수 없음')
                    ic(f"키워드 기반 감정 분석 사용: {final_label} (모델 확률: {max_prob:.3f})")
                elif max_prob < 0.2:
                    # 확률이 너무 낮고 키워드도 없으면 평가불가
                    final_prediction = 0
                    final_label = '평가불가'
                else:
                    # 확률이 낮지만 어느 정도 신뢰할 수 있으면 모델 예측 사용
                    final_prediction = max_prob_idx
                    final_label = emotion_labels.get(max_prob_idx, '알 수 없음')
            else:
                # 확률이 충분히 높으면 모델 예측 사용
                final_prediction = int(prediction)
                final_label = emotion_labels.get(final_prediction, '알 수 없음')
            
            # 확률 정보 구성
            prob_dict = {
                emotion_labels.get(i, f'클래스{i}'): float(prob) for i, prob in enumerate(probabilities)
            }
            
            return {
                'emotion': final_prediction,
                'emotion_label': final_label,
                'probabilities': prob_dict,
                'confidence': max_prob,  # 최대 확률 추가
                'original_prediction': int(prediction)  # 원래 예측 결과도 포함 (디버깅용)
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

