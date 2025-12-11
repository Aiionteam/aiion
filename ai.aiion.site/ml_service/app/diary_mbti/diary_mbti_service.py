"""
Diary MBTI Service
일기 MBTI 분류 머신러닝 서비스
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
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_score, recall_score, f1_score
from scipy.sparse import hstack

# ic 먼저 정의 (다른 import 전에)
try:
    from icecream import ic  # type: ignore
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# Optuna (하이퍼파라미터 최적화) - 선택적 import (ic 정의 후)
try:
    import optuna
    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False
    ic("경고: optuna가 설치되지 않았습니다. 하이퍼파라미터 최적화를 사용할 수 없습니다.")

# XGBoost, LightGBM (앙상블용) - 선택적 import (ic 정의 후)
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    ic("경고: xgboost가 설치되지 않았습니다. XGBoost 앙상블을 사용할 수 없습니다.")

try:
    from lightgbm import LGBMClassifier
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    ic("경고: lightgbm이 설치되지 않았습니다. LightGBM 앙상블을 사용할 수 없습니다.")

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

from app.diary_mbti.diary_mbti_dataset import DiaryMbtiDataSet
from app.diary_mbti.diary_mbti_model import DiaryMbtiModel
from app.diary_mbti.diary_mbti_method import DiaryMbtiMethod


class DiaryMbtiService:
    """일기 MBTI 분류 데이터 처리 및 머신러닝 서비스"""
    
    def __init__(self, csv_file_path: Optional[Path] = None):
        """초기화"""
        self.dataset = DiaryMbtiDataSet()
        self.model_obj = DiaryMbtiModel()
        self.mbti_labels = ['E_I', 'S_N', 'T_F', 'J_P']  # MBTI 차원들
        self.method = DiaryMbtiMethod(self.mbti_labels)  # 전처리 메서드 클래스
        # CSV 파일 경로 (diary_mbti/data/ 폴더에 있음)
        self.csv_file_path = csv_file_path or (Path(__file__).parent / "data" / "diary_mbti.csv")
        
        # CSV 파일 경로 검증 (폴더가 아닌 파일인지 확인)
        if self.csv_file_path.exists() and self.csv_file_path.is_dir():
            raise ValueError(f"오류: {self.csv_file_path}는 폴더입니다. 파일이어야 합니다. 폴더를 삭제해주세요.")
        
        # 오타로 인한 폴더가 있는지 확인하고 경고
        typo_folder = Path(__file__).parent / "dirary_mbti.csv"
        if typo_folder.exists() and typo_folder.is_dir():
            ic(f"⚠️  경고: 오타로 인한 폴더 발견: {typo_folder}")
            ic(f"   → 이 폴더는 삭제해야 합니다: Remove-Item -Path '{typo_folder}' -Recurse -Force")
        
        self.df: Optional[pd.DataFrame] = None
        # 모델 저장 경로 - diary_mbti/models/ 폴더 사용
        # Path(__file__) = diary_mbti/diary_mbti_service.py
        # Path(__file__).parent = diary_mbti/
        self.model_dir = Path(__file__).parent / "models"
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model_files = {
            'E_I': self.model_dir / "diary_mbti_e_i_model.pkl",
            'S_N': self.model_dir / "diary_mbti_s_n_model.pkl",
            'T_F': self.model_dir / "diary_mbti_t_f_model.pkl",
            'J_P': self.model_dir / "diary_mbti_j_p_model.pkl"
        }
        self.vectorizer_file = self.model_dir / "diary_mbti_vectorizer.pkl"
        self.word2vec_file = self.model_dir / "diary_mbti_word2vec.pkl"
        self.metadata_file = self.model_dir / "diary_mbti_metadata.pkl"
        self.use_word2vec = GENSIM_AVAILABLE  # Word2Vec 재활성화 (문맥 이해용)
        self.test_indices = None  # 테스트 인덱스 저장 (적중률 체크용)
        self.use_ensemble = False  # 앙상블 모델 사용 여부
        self.use_hyperparameter_tuning = False  # 하이퍼파라미터 최적화 사용 여부
        self.n_trials = 50  # 하이퍼파라미터 최적화 시행 횟수
        self.best_params = {}  # 최적화된 하이퍼파라미터 저장
        self.staged_training = True  # 단계적 학습 활성화 (앙상블 → 오버피팅 체크 → 하이퍼파라미터 튜닝)
        self.overfitting_threshold = 0.05  # 오버피팅 판단 기준 (train - validation 차이)
        self.min_val_score_threshold = 0.75  # 최소 Validation Score 기준 (이보다 낮으면 튜닝)
        self.target_accuracy = 0.85  # 목표 정확도 (85%)
        self.ensemble_results = {}  # 앙상블 학습 결과 저장
        self.single_class_values = {}  # 클래스가 1개만 있는 차원의 값 저장 (예측용)
        
        # 모델 저장 경로 로그 출력
        ic(f"모델 저장 디렉토리: {self.model_dir}")
        ic(f"모델 저장 디렉토리 (절대 경로): {self.model_dir.absolute()}")
        ic(f"현재 파일 위치: {Path(__file__).absolute()}")
        ic(f"현재 파일 부모: {Path(__file__).parent.absolute()}")
        
        ic("DiaryMbtiService 초기화")
        
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
            required_cols = ['title', 'content'] + self.mbti_labels
            self.df = self.method.handle_missing_values(self.df, required_cols)
            
            # MBTI 라벨 분포 확인 (method 사용)
            self.method.check_label_distribution(self.df)
            
            # 텍스트 전처리 (method 사용)
            self.df = self.method.preprocess_text(self.df)
            
            # 평가불가(0) 데이터 필터링 (선택적)
            # S_N, J_P 차원의 평가불가 비율이 높으면 제거
            original_count = len(self.df)
            self.df = self.method.filter_zero_labels(
                self.df, 
                labels=self.mbti_labels,
                min_zero_ratio=0.3  # 30% 이상인 차원의 평가불가 데이터 제거
            )
            filtered_count = len(self.df)
            if filtered_count < original_count:
                ic(f"평가불가 데이터 필터링: {original_count - filtered_count:,} 개 제거됨")
            
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
            
            # 텍스트 벡터화 (TF-IDF) - 균형잡힌 설정
            self.model_obj.vectorizer = TfidfVectorizer(
                max_features=2000,  # 500 → 2000 (E_I 성능 향상, 오버피팅 방지)
                ngram_range=(1, 2),  # (1, 1) → (1, 2) (문맥 정보 추가)
                min_df=3,  # 10 → 3 (너무 제한적이지 않게)
                max_df=0.85,  # 0.75 → 0.85 (적당한 범위)
                sublinear_tf=True
            )
            
            # Word2Vec 모델 초기화 (문맥 기반 임베딩) - 단순화
            if self.use_word2vec:
                ic("Word2Vec 모델 초기화 (문맥 이해, 단순화 버전)")
                self.model_obj.word2vec_model = Word2Vec(
                    vector_size=50,  # 100 → 50 (오버피팅 방지)
                    window=3,  # 5 → 3 (문맥 창 축소)
                    min_count=3,  # 2 → 3 (희귀 단어 제외)
                    workers=4,
                    sg=1,  # 0(CBOW) → 1(Skip-gram, 더 단순)
                    epochs=5  # 10 → 5 (과적합 방지)
                )
            
            # 각 MBTI 차원별 모델 초기화 (차원별 맞춤 설정)
            for label in self.mbti_labels:
                # 차원별 특성에 맞는 파라미터 설정
                if label == 'E_I':
                    # E_I: 낮은 정확도 (79%) → 더 복잡한 모델 필요
                    self.model_obj.models[label] = RandomForestClassifier(
                        n_estimators=100,  # 더 많은 트리
                        max_depth=10,  # 더 깊은 트리
                        min_samples_split=10,  # 적당한 정규화
                        min_samples_leaf=5,
                        max_features='sqrt',
                        random_state=42,
                        n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                        class_weight='balanced',
                        max_samples=0.8
                    )
                    ic(f"{label} 모델 초기화 완료 (성능 향상 설정)")
                elif label in ['S_N', 'T_F', 'J_P']:
                    # S_N, T_F, J_P: 오버피팅 (99%+) → 강한 정규화
                    self.model_obj.models[label] = RandomForestClassifier(
                        n_estimators=50,  # 적당한 트리 수
                        max_depth=5,  # 얕은 트리
                        min_samples_split=30,  # 강한 정규화
                        min_samples_leaf=15,
                        max_features='log2',  # 적은 특징
                        random_state=42,
                        n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                        class_weight='balanced',
                        max_samples=0.7  # 적은 샘플
                    )
                    ic(f"{label} 모델 초기화 완료 (오버피팅 방지 강화)")
                else:
                    # 기본 설정
                    self.model_obj.models[label] = RandomForestClassifier(
                        n_estimators=75,
                        max_depth=7,
                        min_samples_split=20,
                        min_samples_leaf=10,
                        max_features='sqrt',
                        random_state=42,
                        n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                        class_weight='balanced',
                        max_samples=0.75
                    )
                    ic(f"{label} 모델 초기화 완료 (기본 설정)")
            
            ic("😎😎 모델링 완료")
            
        except Exception as e:
            ic(f"모델링 오류: {e}")
            raise
    
    def learning(self):
        """
        모델 학습 (4개 MBTI 차원별로 각각 학습)
        단계적 학습 프로세스:
        1. 앙상블 모델로 먼저 학습하여 오버피팅 체크
        2. 오버피팅이 확인되면 하이퍼파라미터 튜닝으로 재학습
        """
        ic("😎😎 학습 시작")
        
        # 단계적 학습 모드인 경우
        if self.staged_training:
            ic("📊 단계적 학습 모드 활성화")
            ic("  1단계: 앙상블 모델로 학습 및 오버피팅 체크")
            ic("  2단계: 오버피팅 발견 시 하이퍼파라미터 튜닝으로 재학습")
            return self._staged_learning()
        
        try:
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            if not self.model_obj.models:
                raise ValueError("모델이 없습니다. modeling()을 먼저 실행하세요.")
            
            # 텍스트 벡터화 (읽기 전용 뷰 방지를 위해 copy 사용)
            X_text = self.df['text'].values.copy()
            
            # TF-IDF 벡터화
            X_tfidf = self.model_obj.vectorizer.fit_transform(X_text)
            
            # Word2Vec 임베딩 생성 (문맥 정보 포함) - 단순화 버전
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                ic("Word2Vec 모델 학습 중 (단순화 버전)...")
                sentences = [simple_preprocess(text, deacc=True, min_len=1) for text in X_text]
                self.model_obj.word2vec_model.build_vocab(sentences)
                self.model_obj.word2vec_model.train(
                    sentences,
                    total_examples=len(sentences),
                    epochs=5  # 10 → 5 (오버피팅 방지)
                )
                
                def text_to_embedding(text, use_tfidf_weight=True):
                    """Word2Vec 임베딩 생성 (TF-IDF 가중 평균 지원)"""
                    words = simple_preprocess(text, deacc=True, min_len=1)
                    if len(words) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    
                    word_vectors = []
                    weights = []
                    
                    # TF-IDF 가중치 계산 (옵션)
                    if use_tfidf_weight and self.model_obj.vectorizer is not None:
                        try:
                            # 텍스트를 TF-IDF로 변환
                            tfidf_scores = self.model_obj.vectorizer.transform([text])
                            feature_names = self.model_obj.vectorizer.get_feature_names_out()
                            
                            for word in words:
                                if word in self.model_obj.word2vec_model.wv:
                                    word_vectors.append(self.model_obj.word2vec_model.wv[word])
                                    # TF-IDF 가중치 가져오기
                                    if word in feature_names:
                                        word_idx = np.where(feature_names == word)[0]
                                        if len(word_idx) > 0:
                                            weight = tfidf_scores[0, word_idx[0]]
                                            weights.append(float(weight))
                                        else:
                                            weights.append(0.0)
                                    else:
                                        weights.append(0.0)
                        except Exception as e:
                            ic(f"TF-IDF 가중치 계산 실패, 단순 평균 사용: {e}")
                            # 실패 시 단순 평균으로 폴백
                            word_vectors = [
                                self.model_obj.word2vec_model.wv[word]
                                for word in words
                                if word in self.model_obj.word2vec_model.wv
                            ]
                            weights = [1.0] * len(word_vectors)
                    else:
                        # 단순 평균 (TF-IDF 가중치 없음)
                        word_vectors = [
                            self.model_obj.word2vec_model.wv[word]
                            for word in words
                            if word in self.model_obj.word2vec_model.wv
                        ]
                        weights = [1.0] * len(word_vectors)
                    
                    if len(word_vectors) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    
                    # 가중 평균 계산
                    weights = np.array(weights)
                    weights = weights / (weights.sum() + 1e-8)  # 정규화
                    return np.average(word_vectors, axis=0, weights=weights)
                
                ic("Word2Vec 임베딩 생성 중 (단순 평균 사용, 오버피팅 방지)...")
                X_word2vec = np.array([text_to_embedding(text, use_tfidf_weight=False) for text in X_text])
                from scipy.sparse import csr_matrix
                X_word2vec_sparse = csr_matrix(X_word2vec)
                X_base = hstack([X_tfidf, X_word2vec_sparse])
                ic(f"TF-IDF + Word2Vec 결합 완료")
            else:
                X_base = X_tfidf
                ic("TF-IDF만 사용 (Word2Vec 없음)")
            
            # 고급 특징은 오버피팅 위험이 높으므로 제거
            # 기본 특징만 사용: TF-IDF + Word2Vec
            X = X_base
            ic(f"특징 준비 완료: TF-IDF + Word2Vec만 사용 ({X.shape[1]}개 특징, 고급 특징 제외)")
            
            # 데이터 크기 검증
            n_samples = X.shape[0]
            n_df_rows = len(self.df)
            ic(f"데이터 크기 검증: X 행 수={n_samples}, DataFrame 행 수={n_df_rows}")
            
            if n_samples != n_df_rows:
                raise ValueError(
                    f"데이터 크기 불일치: X 행 수({n_samples})와 DataFrame 행 수({n_df_rows})가 다릅니다. "
                    f"전처리 과정에서 데이터가 일치하지 않습니다."
                )
            
            # 각 MBTI 차원별로 학습
            train_indices_list = {}
            test_indices_list = {}
            
            for label in self.mbti_labels:
                ic(f"{label} 차원 학습 시작...")
                
                # 라벨 추출 (읽기 전용 뷰 방지를 위해 copy 사용)
                y = self.df[label].values.copy()
                
                # 데이터 크기 검증
                if len(y) != n_samples:
                    raise ValueError(
                        f"{label} 차원 데이터 크기 불일치: y 길이({len(y)})와 X 행 수({n_samples})가 다릅니다."
                    )
                
                # 클래스 분포 확인
                from collections import Counter
                class_counts = Counter(y)
                ic(f"{label} 클래스 분포: {class_counts}")
                
                # 클래스가 1개만 있으면 학습 불가
                if len(class_counts) < 2:
                    single_class = int(list(class_counts.keys())[0])
                    ic(f"⚠️  {label} 경고: 클래스가 1개만 존재하여 학습을 건너뜁니다.")
                    ic(f"   → 항상 클래스 {single_class}로 예측됩니다.")
                    # train/test 인덱스는 설정하되 모델 학습은 건너뜀
                    indices = list(range(len(y)))
                    train_indices, test_indices = train_test_split(
                        indices, test_size=0.2, random_state=42
                    )
                    train_indices_list[label] = train_indices
                    test_indices_list[label] = test_indices
                    # 모델은 None으로 유지하고, 단일 클래스 값을 저장 (predict에서 사용)
                    if not hasattr(self, 'single_class_values'):
                        self.single_class_values = {}
                    self.single_class_values[label] = single_class
                    continue
                
                # 학습/테스트 데이터 분할
                indices = list(range(len(y)))
                min_class_count = min(class_counts.values()) if class_counts else 0
                can_stratify = min_class_count >= 2
                
                if can_stratify:
                    train_indices, test_indices = train_test_split(
                        indices, test_size=0.2, random_state=42, stratify=y
                    )
                else:
                    train_indices, test_indices = train_test_split(
                        indices, test_size=0.2, random_state=42
                    )
                
                # 인덱스 범위 검증
                max_train_idx = max(train_indices) if train_indices else -1
                max_test_idx = max(test_indices) if test_indices else -1
                max_idx = max(max_train_idx, max_test_idx)
                
                if max_idx >= n_samples:
                    raise IndexError(
                        f"{label} 차원 인덱스 범위 오류: 최대 인덱스({max_idx})가 X 행 수({n_samples})를 초과합니다. "
                        f"train_indices 최대값: {max_train_idx}, test_indices 최대값: {max_test_idx}"
                    )
                
                train_indices_list[label] = train_indices
                test_indices_list[label] = test_indices
                
                X_train = X[train_indices]
                y_train = y[train_indices].copy()  # 읽기 전용 뷰 방지
                
                # 하이퍼파라미터 최적화 (옵션)
                if self.use_hyperparameter_tuning and OPTUNA_AVAILABLE:
                    ic(f"{label} 하이퍼파라미터 최적화 시작... (시행 횟수: {self.n_trials})")
                    ic(f"⚠️ 예상 소요 시간: 약 {self.n_trials * 0.5:.1f}분 (각 차원당)")
                    best_params = self._optimize_hyperparameters(X_train, y_train, label, self.n_trials)
                    
                    # best_params에서 class_weight 제거 (중복 방지)
                    best_params_clean = best_params.copy()
                    class_weight_value = best_params_clean.pop('class_weight', 'balanced')
                    
                    # 최적화된 파라미터로 모델 재생성
                    self.model_obj.models[label] = RandomForestClassifier(
                        **best_params_clean,
                        random_state=42,
                        n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                        class_weight=class_weight_value  # best_params에서 가져온 값 사용
                    )
                    self.best_params[label] = best_params
                    ic(f"{label} 최적 파라미터: {best_params}")
                
                # 앙상블 모델 사용 (옵션)
                # 주의: 하이퍼파라미터 최적화와 동시에 사용하면 앙상블이 최적화된 모델을 덮어씀
                if self.use_ensemble:
                    ic(f"{label} 앙상블 모델 생성 중...")
                    if self.use_hyperparameter_tuning:
                        ic(f"⚠️  주의: 하이퍼파라미터 최적화 후 앙상블 모델로 교체됩니다.")
                    ic(f"⚠️ 예상 소요 시간: 약 2-5분 (각 차원당)")
                    self.model_obj.models[label] = self._create_ensemble_model(label)
                else:
                    ic(f"{label} 단일 모델 사용 (앙상블 비활성화)")
                
                # 모델 학습
                self.model_obj.models[label].fit(X_train, y_train)
                
                # 교차 검증 수행 (성능 안정성 확인) - 오버피팅 감지 강화
                cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)  # 5 → 10 (더 엄격한 검증)
                # WRITEBACKIFCOPY 오류 방지를 위해 n_jobs=1 사용 (병렬 처리 비활성화)
                cv_scores = cross_val_score(
                    self.model_obj.models[label], 
                    X_train, 
                    y_train, 
                    cv=cv, 
                    scoring='f1_weighted',
                    n_jobs=1  # 병렬 처리 비활성화 (NumPy 배열 공유 문제 방지)
                )
                ic(f"{label} 차원 학습 완료")
                ic(f"{label} 교차 검증 F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
                ic(f"{label} 교차 검증 점수 상세: {cv_scores}")
                
                # 특성 중요도 분석 (상위 10개)
                if hasattr(self.model_obj.models[label], 'feature_importances_'):
                    importances = self.model_obj.models[label].feature_importances_
                    top_indices = importances.argsort()[-10:][::-1]
                    feature_names = self.model_obj.vectorizer.get_feature_names_out()
                    top_features = [(feature_names[i], importances[i]) for i in top_indices]
                    ic(f"{label} 상위 10개 중요 특성:")
                    for i, (feat, imp) in enumerate(top_features, 1):
                        # MBTI 키워드 체크
                        mbti_kw = ['내향', '외향', '직관', '감각', '사고', '감정', '판단', '인식']
                        marker = "🚨" if any(kw in feat for kw in mbti_kw) else "  "
                        ic(f"{marker} {i:2d}. {feat}: {imp:.6f}")
                
                # 오버피팅 경고
                if cv_scores.mean() > 0.98:
                    ic(f"⚠️  {label} 경고: 교차 검증 점수가 98%를 초과합니다. 오버피팅 가능성이 있습니다.")
                    ic(f"   → 평균: {cv_scores.mean():.4f}, 표준편차: {cv_scores.std():.4f}")
                if cv_scores.std() < 0.001:
                    ic(f"⚠️  {label} 경고: 교차 검증 점수 분산이 매우 낮습니다. 오버피팅 가능성이 있습니다.")
                    ic(f"   → 평균: {cv_scores.mean():.4f}, 표준편차: {cv_scores.std():.4f}")
            
            # 학습 데이터셋 저장 (학습 가능한 첫 번째 차원 기준)
            # train_indices_list에 있는 첫 번째 차원 찾기
            first_label = None
            for label in self.mbti_labels:
                if label in train_indices_list:
                    first_label = label
                    break
            
            if first_label is None:
                raise ValueError("학습 가능한 차원이 없습니다. 모든 차원의 클래스가 1개만 존재합니다.")
            
            self.dataset.train = pd.DataFrame({
                'text': self.df['text'].iloc[train_indices_list[first_label]].values.copy(),
                **{label: self.df[label].iloc[train_indices_list[first_label]].values.copy()
                   for label in self.mbti_labels if label in train_indices_list}
            })
            self.dataset.test = pd.DataFrame({
                'text': self.df['text'].iloc[test_indices_list[first_label]].values.copy(),
                **{label: self.df[label].iloc[test_indices_list[first_label]].values.copy()
                   for label in self.mbti_labels if label in test_indices_list}
            })
            
            # 테스트 인덱스 저장 (적중률 체크용)
            self.test_indices = test_indices_list[first_label]
            
            ic(f"학습 데이터: {len(train_indices_list[first_label])} 개")
            ic(f"테스트 데이터: {len(test_indices_list[first_label])} 개")
            ic("😎😎 학습 완료")
            
        except Exception as e:
            ic(f"학습 오류: {e}")
            raise
    
    def _staged_learning(self):
        """
        단계적 학습 프로세스:
        1단계: 앙상블 모델로 학습하여 오버피팅 체크
        2단계: 오버피팅이 확인되면 하이퍼파라미터 튜닝으로 재학습
        """
        ic("=" * 60)
        ic("📊 1단계: 앙상블 모델로 학습 및 오버피팅 체크")
        ic("=" * 60)
        
        # 1단계: 앙상블 모델로 학습
        original_use_ensemble = self.use_ensemble
        original_use_hyperparameter_tuning = self.use_hyperparameter_tuning
        
        # 앙상블 활성화, 하이퍼파라미터 튜닝 비활성화
        self.use_ensemble = True
        self.use_hyperparameter_tuning = False
        
        try:
            # 기존 learning() 로직을 재사용하되, 오버피팅 체크를 위해 train/validation 분리
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            if not self.model_obj.models:
                raise ValueError("모델이 없습니다. modeling()을 먼저 실행하세요.")
            
            # 텍스트 벡터화
            X_text = self.df['text'].values.copy()
            X_tfidf = self.model_obj.vectorizer.fit_transform(X_text)
            
            # Word2Vec 임베딩 생성
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                ic("Word2Vec 모델 학습 중...")
                sentences = [simple_preprocess(text, deacc=True, min_len=1) for text in X_text]
                self.model_obj.word2vec_model.build_vocab(sentences)
                self.model_obj.word2vec_model.train(
                    sentences,
                    total_examples=len(sentences),
                    epochs=5
                )
                
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
                    return np.average(word_vectors, axis=0)
                
                X_word2vec = np.array([text_to_embedding(text) for text in X_text])
                from scipy.sparse import csr_matrix
                X_word2vec_sparse = csr_matrix(X_word2vec)
                X = hstack([X_tfidf, X_word2vec_sparse])
            else:
                X = X_tfidf
            
            ic(f"특징 준비 완료: {X.shape[1]}개 특징")
            
            # 각 MBTI 차원별로 앙상블 학습 및 오버피팅 체크
            train_indices_list = {}
            test_indices_list = {}
            overfitting_detected = {}
            
            for label in self.mbti_labels:
                ic(f"\n{label} 차원 - 1단계: 앙상블 학습")
                
                y = self.df[label].values.copy()
                from collections import Counter
                class_counts = Counter(y)
                
                if len(class_counts) < 2:
                    single_class = int(list(class_counts.keys())[0])
                    ic(f"⚠️  {label} 경고: 클래스가 1개만 존재하여 학습을 건너뜁니다.")
                    indices = list(range(len(y)))
                    train_indices, test_indices = train_test_split(
                        indices, test_size=0.2, random_state=42
                    )
                    train_indices_list[label] = train_indices
                    test_indices_list[label] = test_indices
                    if not hasattr(self, 'single_class_values'):
                        self.single_class_values = {}
                    self.single_class_values[label] = single_class
                    overfitting_detected[label] = False
                    continue
                
                # 학습/검증/테스트 분할 (60/20/20)
                indices = list(range(len(y)))
                min_class_count = min(class_counts.values()) if class_counts else 0
                can_stratify = min_class_count >= 2
                
                if can_stratify:
                    train_indices, temp_indices = train_test_split(
                        indices, test_size=0.4, random_state=42, stratify=y
                    )
                    val_indices, test_indices = train_test_split(
                        temp_indices, test_size=0.5, random_state=42, stratify=y[temp_indices]
                    )
                else:
                    train_indices, temp_indices = train_test_split(
                        indices, test_size=0.4, random_state=42
                    )
                    val_indices, test_indices = train_test_split(
                        temp_indices, test_size=0.5, random_state=42
                    )
                
                train_indices_list[label] = train_indices
                test_indices_list[label] = test_indices
                
                X_train = X[train_indices]
                X_val = X[val_indices]
                y_train = y[train_indices].copy()
                y_val = y[val_indices].copy()
                
                # 앙상블 모델 생성 및 학습
                ic(f"{label} 앙상블 모델 생성 중...")
                ensemble_model = self._create_ensemble_model(label)
                ensemble_model.fit(X_train, y_train)
                
                # Train/Validation 성능 비교
                train_score = ensemble_model.score(X_train, y_train)
                val_score = ensemble_model.score(X_val, y_val)
                score_diff = train_score - val_score
                
                ic(f"{label} 앙상블 학습 완료")
                ic(f"  Train Score: {train_score:.4f}")
                ic(f"  Validation Score: {val_score:.4f}")
                ic(f"  차이: {score_diff:.4f}")
                
                # 오버피팅 및 낮은 성능 판단
                is_overfitting = score_diff > self.overfitting_threshold
                is_low_performance = val_score < self.min_val_score_threshold
                needs_tuning = is_overfitting or is_low_performance
                overfitting_detected[label] = needs_tuning
                
                if needs_tuning:
                    if is_overfitting:
                        ic(f"⚠️  {label} 오버피팅 감지! (차이 > {self.overfitting_threshold})")
                    if is_low_performance:
                        ic(f"⚠️  {label} 낮은 성능 감지! (Validation Score: {val_score:.4f} < {self.min_val_score_threshold})")
                    ic(f"   → 2단계에서 하이퍼파라미터 튜닝으로 재학습합니다.")
                else:
                    ic(f"✓ {label} 성능 양호 (차이: {score_diff:.4f}, Validation: {val_score:.4f})")
                    ic(f"   → 앙상블 모델을 최종 모델로 사용합니다.")
                
                # 결과 저장 (y도 저장하여 2단계에서 사용)
                self.ensemble_results[label] = {
                    'model': ensemble_model,
                    'train_score': train_score,
                    'val_score': val_score,
                    'score_diff': score_diff,
                    'is_overfitting': is_overfitting,
                    'train_indices': train_indices,
                    'val_indices': val_indices,
                    'test_indices': test_indices,
                    'y': y  # 2단계에서 사용하기 위해 저장
                }
                
                # 오버피팅이 없으면 앙상블 모델을 최종 모델로 사용
                if not is_overfitting:
                    self.model_obj.models[label] = ensemble_model
            
            # 2단계: 오버피팅 또는 낮은 성능이 있는 차원에 대해 하이퍼파라미터 튜닝
            needs_retraining = any(overfitting_detected.values())
            
            # J_P 차원은 항상 튜닝 (특별 처리) - 낮은 성능 문제 해결
            if 'J_P' in self.mbti_labels:
                if 'J_P' not in overfitting_detected:
                    # ensemble_results에 없으면 새로 생성
                    if 'J_P' not in self.ensemble_results:
                        ic(f"\n⚠️  J_P 차원 특별 처리: 앙상블 학습부터 시작")
                        # J_P 차원 재학습
                        y_jp = self.df['J_P'].values.copy()
                        from collections import Counter
                        class_counts = Counter(y_jp)
                        if len(class_counts) >= 2:
                            indices = list(range(len(y_jp)))
                            min_class_count = min(class_counts.values())
                            can_stratify = min_class_count >= 2
                            if can_stratify:
                                train_indices, temp_indices = train_test_split(
                                    indices, test_size=0.4, random_state=42, stratify=y_jp
                                )
                                val_indices, test_indices = train_test_split(
                                    temp_indices, test_size=0.5, random_state=42, stratify=y_jp[temp_indices]
                                )
                            else:
                                train_indices, temp_indices = train_test_split(
                                    indices, test_size=0.4, random_state=42
                                )
                                val_indices, test_indices = train_test_split(
                                    temp_indices, test_size=0.5, random_state=42
                                )
                            
                            X_train_jp = X[train_indices]
                            X_val_jp = X[val_indices]
                            y_train_jp = y_jp[train_indices].copy()
                            y_val_jp = y_jp[val_indices].copy()
                            
                            ensemble_model_jp = self._create_ensemble_model('J_P')
                            ensemble_model_jp.fit(X_train_jp, y_train_jp)
                            
                            train_score_jp = ensemble_model_jp.score(X_train_jp, y_train_jp)
                            val_score_jp = ensemble_model_jp.score(X_val_jp, y_val_jp)
                            score_diff_jp = train_score_jp - val_score_jp
                            
                            self.ensemble_results['J_P'] = {
                                'model': ensemble_model_jp,
                                'train_score': train_score_jp,
                                'val_score': val_score_jp,
                                'score_diff': score_diff_jp,
                                'is_overfitting': True,  # 항상 튜닝
                                'train_indices': train_indices,
                                'val_indices': val_indices,
                                'test_indices': test_indices,
                                'y': y_jp
                            }
                            train_indices_list['J_P'] = train_indices
                            test_indices_list['J_P'] = test_indices
                    else:
                        # 이미 있으면 강제로 튜닝
                        self.ensemble_results['J_P']['is_overfitting'] = True
                
                overfitting_detected['J_P'] = True
                needs_retraining = True
                ic(f"\n⚠️  J_P 차원 특별 처리: 항상 하이퍼파라미터 튜닝 실행 (낮은 성능 개선)")
            
            if needs_retraining:
                ic("\n" + "=" * 60)
                ic("🔧 2단계: 하이퍼파라미터 튜닝으로 재학습")
                ic("=" * 60)
                
                # 하이퍼파라미터 튜닝 활성화
                self.use_ensemble = False
                self.use_hyperparameter_tuning = True
                
                for label in self.mbti_labels:
                    if not overfitting_detected.get(label, False):
                        continue
                    
                    ic(f"\n{label} 차원 - 2단계: 하이퍼파라미터 튜닝")
                    
                    result = self.ensemble_results[label]
                    train_indices = result['train_indices']
                    val_indices = result['val_indices']
                    y = result['y']  # 저장된 y 사용
                    
                    # Train + Validation을 합쳐서 학습 (더 많은 데이터)
                    combined_indices = train_indices + val_indices
                    X_train_combined = X[combined_indices]
                    y_train_combined = y[combined_indices].copy()
                    
                    # 하이퍼파라미터 최적화 (J_P는 더 많은 시행 횟수)
                    n_trials_for_label = self.n_trials * 2 if label == 'J_P' else self.n_trials
                    if label == 'J_P':
                        ic(f"{label} 하이퍼파라미터 최적화 시작... (시행 횟수: {n_trials_for_label}, 특별 처리)")
                    else:
                        ic(f"{label} 하이퍼파라미터 최적화 시작... (시행 횟수: {n_trials_for_label})")
                    best_params = self._optimize_hyperparameters(
                        X_train_combined, y_train_combined, label, n_trials_for_label
                    )
                    
                    # 최적화된 파라미터로 모델 재생성
                    best_params_clean = best_params.copy()
                    class_weight_value = best_params_clean.pop('class_weight', 'balanced')
                    
                    tuned_model = RandomForestClassifier(
                        **best_params_clean,
                        random_state=42,
                        n_jobs=1,
                        class_weight=class_weight_value
                    )
                    
                    tuned_model.fit(X_train_combined, y_train_combined)
                    
                    # 재학습 후 성능 확인
                    test_indices = result['test_indices']
                    X_test = X[test_indices]
                    y_test = y[test_indices].copy()
                    
                    test_score = tuned_model.score(X_test, y_test)
                    train_score_tuned = tuned_model.score(X_train_combined, y_train_combined)
                    score_diff_tuned = train_score_tuned - test_score
                    
                    ic(f"{label} 하이퍼파라미터 튜닝 완료")
                    ic(f"  최적 파라미터: {best_params}")
                    ic(f"  Train Score: {train_score_tuned:.4f}")
                    ic(f"  Test Score: {test_score:.4f}")
                    ic(f"  차이: {score_diff_tuned:.4f}")
                    
                    if score_diff_tuned <= self.overfitting_threshold:
                        ic(f"✓ {label} 오버피팅 해결됨!")
                    else:
                        ic(f"⚠️  {label} 여전히 오버피팅 가능성 있음 (차이: {score_diff_tuned:.4f})")
                    
                    # 최종 모델로 저장
                    self.model_obj.models[label] = tuned_model
                    self.best_params[label] = best_params
                    
                    # 결과 업데이트
                    self.ensemble_results[label]['tuned_model'] = tuned_model
                    self.ensemble_results[label]['tuned_train_score'] = train_score_tuned
                    self.ensemble_results[label]['tuned_test_score'] = test_score
                    self.ensemble_results[label]['tuned_score_diff'] = score_diff_tuned
            
            # 학습 데이터셋 저장
            first_label = None
            for label in self.mbti_labels:
                if label in train_indices_list:
                    first_label = label
                    break
            
            if first_label is None:
                raise ValueError("학습 가능한 차원이 없습니다.")
            
            self.dataset.train = pd.DataFrame({
                'text': self.df['text'].iloc[train_indices_list[first_label]].values.copy(),
                **{label: self.df[label].iloc[train_indices_list[first_label]].values.copy()
                   for label in self.mbti_labels if label in train_indices_list}
            })
            self.dataset.test = pd.DataFrame({
                'text': self.df['text'].iloc[test_indices_list[first_label]].values.copy(),
                **{label: self.df[label].iloc[test_indices_list[first_label]].values.copy()
                   for label in self.mbti_labels if label in test_indices_list}
            })
            self.test_indices = test_indices_list[first_label]
            
            ic("\n" + "=" * 60)
            ic("✅ 단계적 학습 완료!")
            ic("=" * 60)
            ic(f"학습 데이터: {len(train_indices_list[first_label])} 개")
            ic(f"테스트 데이터: {len(test_indices_list[first_label])} 개")
            
            # 최종 요약
            ic("\n📊 최종 결과 요약:")
            for label in self.mbti_labels:
                if label in self.ensemble_results:
                    result = self.ensemble_results[label]
                    if result.get('is_overfitting', False):
                        ic(f"  {label}: 앙상블 → 하이퍼파라미터 튜닝 (오버피팅 해결)")
                        ic(f"    최종 Test Score: {result.get('tuned_test_score', 0):.4f}")
                    else:
                        ic(f"  {label}: 앙상블 모델 사용 (오버피팅 없음)")
                        ic(f"    Validation Score: {result.get('val_score', 0):.4f}")
            
        finally:
            # 원래 설정 복원
            self.use_ensemble = original_use_ensemble
            self.use_hyperparameter_tuning = original_use_hyperparameter_tuning
    
    def predict(self, text: str) -> Dict[str, Any]:
        """텍스트 MBTI 예측 (4개 차원 모두 예측)"""
        try:
            if not self.model_obj.models:
                raise ValueError("모델이 없습니다. learning()을 먼저 실행하세요.")
            
            # 텍스트 전처리
            import re
            processed_text = str(text)
            processed_text = re.sub(r'\r?\n', ' ', processed_text)
            processed_text = processed_text.replace('\t', ' ')
            processed_text = re.sub(r'\s+', ' ', processed_text).strip()
            
            # TF-IDF 벡터화
            X_tfidf = self.model_obj.vectorizer.transform([processed_text])
            
            # Word2Vec 임베딩 생성 (TF-IDF 가중 평균)
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                def text_to_embedding(text, use_tfidf_weight=True):
                    """Word2Vec 임베딩 생성 (TF-IDF 가중 평균 지원)"""
                    words = simple_preprocess(text, deacc=True, min_len=1)
                    if len(words) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    
                    word_vectors = []
                    weights = []
                    
                    # TF-IDF 가중치 계산 (옵션)
                    if use_tfidf_weight and self.model_obj.vectorizer is not None:
                        try:
                            tfidf_scores = self.model_obj.vectorizer.transform([text])
                            feature_names = self.model_obj.vectorizer.get_feature_names_out()
                            
                            for word in words:
                                if word in self.model_obj.word2vec_model.wv:
                                    word_vectors.append(self.model_obj.word2vec_model.wv[word])
                                    if word in feature_names:
                                        word_idx = np.where(feature_names == word)[0]
                                        if len(word_idx) > 0:
                                            weight = tfidf_scores[0, word_idx[0]]
                                            weights.append(float(weight))
                                        else:
                                            weights.append(0.0)
                                    else:
                                        weights.append(0.0)
                        except Exception:
                            # 실패 시 단순 평균으로 폴백
                            word_vectors = [
                                self.model_obj.word2vec_model.wv[word]
                                for word in words
                                if word in self.model_obj.word2vec_model.wv
                            ]
                            weights = [1.0] * len(word_vectors)
                    else:
                        word_vectors = [
                            self.model_obj.word2vec_model.wv[word]
                            for word in words
                            if word in self.model_obj.word2vec_model.wv
                        ]
                        weights = [1.0] * len(word_vectors)
                    
                    if len(word_vectors) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    
                    weights = np.array(weights)
                    weights = weights / (weights.sum() + 1e-8)
                    return np.average(word_vectors, axis=0, weights=weights)
                
                X_word2vec = np.array([text_to_embedding(processed_text, use_tfidf_weight=False)])
                from scipy.sparse import csr_matrix
                X_word2vec_sparse = csr_matrix(X_word2vec)
                X_base = hstack([X_tfidf, X_word2vec_sparse])
            else:
                X_base = X_tfidf
            
            # 기본 특징만 사용 (고급 특징 제외로 오버피팅 방지)
            X = X_base
            
            # 각 MBTI 차원별 예측 (0=평가불가, 1=첫번째 성향, 2=두번째 성향)
            predictions = {}
            probabilities = {}
            
            for label in self.mbti_labels:
                model = self.model_obj.models.get(label)
                if model is None:
                    # 모델이 없으면 단일 클래스 값 사용 (클래스가 1개만 있는 경우)
                    if hasattr(self, 'single_class_values') and label in self.single_class_values:
                        single_class = self.single_class_values[label]
                        predictions[label] = single_class
                        probabilities[label] = {str(single_class): 1.0}
                        ic(f"{label} 단일 클래스 예측: {single_class}")
                    else:
                        # 모델이 없고 단일 클래스도 없으면 건너뜀
                        ic(f"⚠️  {label} 모델이 없어 예측을 건너뜁니다.")
                        continue
                else:
                    pred = model.predict(X)[0]
                    proba = model.predict_proba(X)[0]
                    
                    predictions[label] = int(pred)
                    
                    # 클래스 수에 따라 확률 딕셔너리 구성 (0, 1, 2 또는 1, 2)
                    prob_dict = {}
                    classes = model.classes_
                    for i, cls in enumerate(classes):
                        prob_dict[str(int(cls))] = float(proba[i])
                    probabilities[label] = prob_dict
            
            # MBTI 타입 조합 (0=평가불가인 경우 '?'로 표시)
            # E_I: 0=?, 1=E, 2=I
            # S_N: 0=?, 1=S, 2=N
            # T_F: 0=?, 1=T, 2=F
            # J_P: 0=?, 1=J, 2=P
            def get_mbti_char(label: str, value: int) -> str:
                """MBTI 차원별 문자 변환"""
                if value == 0:
                    return '?'
                elif label == 'E_I':
                    return 'E' if value == 1 else 'I'
                elif label == 'S_N':
                    return 'S' if value == 1 else 'N'
                elif label == 'T_F':
                    return 'T' if value == 1 else 'F'
                elif label == 'J_P':
                    return 'J' if value == 1 else 'P'
                return '?'
            
            mbti_type = ''.join([
                get_mbti_char('E_I', predictions.get('E_I', 0)),
                get_mbti_char('S_N', predictions.get('S_N', 0)),
                get_mbti_char('T_F', predictions.get('T_F', 0)),
                get_mbti_char('J_P', predictions.get('J_P', 0))
            ])
            
            return {
                'mbti_type': mbti_type,
                'predictions': predictions,
                'probabilities': probabilities
            }
            
        except Exception as e:
            ic(f"예측 오류: {e}")
            raise
    
    def _try_load_model(self):
        """모델 파일이 있으면 자동 로드"""
        try:
            # 모든 모델 파일이 존재하는지 확인
            all_models_exist = all(f.exists() for f in self.model_files.values())
            
            if all_models_exist and self.vectorizer_file.exists():
                ic("모델 파일 발견, 자동 로드 시도...")
                
                # Vectorizer 로드
                with open(self.vectorizer_file, 'rb') as f:
                    self.model_obj.vectorizer = pickle.load(f)
                
                # 각 MBTI 차원별 모델 로드
                for label in self.mbti_labels:
                    with open(self.model_files[label], 'rb') as f:
                        self.model_obj.models[label] = pickle.load(f)
                    ic(f"{label} 모델 로드 완료")
                
                # Word2Vec 모델 로드 (있는 경우)
                if self.word2vec_file.exists() and self.use_word2vec:
                    with open(self.word2vec_file, 'rb') as f:
                        self.model_obj.word2vec_model = pickle.load(f)
                    ic("Word2Vec 모델 로드 완료")
                
                # 메타데이터 확인
                if self.metadata_file.exists():
                    with open(self.metadata_file, 'rb') as f:
                        metadata = pickle.load(f)
                    csv_mtime = self.csv_file_path.stat().st_mtime
                    if metadata.get('csv_mtime') == csv_mtime:
                        ic("모델 자동 로드 성공 (CSV 파일 변경 없음)")
                        return True
                    else:
                        ic("CSV 파일이 업데이트됨, 기존 모델 사용 (재학습 권장)")
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
            if not self.model_obj.models or self.model_obj.vectorizer is None:
                raise ValueError("모델이 학습되지 않았습니다. learning()을 먼저 실행하세요.")
            
            # 모델 디렉토리 생성
            self.model_dir.mkdir(parents=True, exist_ok=True)
            ic(f"📁 모델 저장 경로 (상대): {self.model_dir}")
            ic(f"📁 모델 저장 경로 (절대): {self.model_dir.absolute()}")
            ic(f"📁 모델 디렉토리 존재 여부: {self.model_dir.exists()}")
            
            # Vectorizer 저장
            vectorizer_path = self.vectorizer_file.absolute()
            with open(self.vectorizer_file, 'wb') as f:
                pickle.dump(self.model_obj.vectorizer, f)
            ic(f"✅ Vectorizer 저장 완료: {vectorizer_path}")
            ic(f"✅ Vectorizer 파일 존재 여부: {self.vectorizer_file.exists()}")
            ic(f"✅ Vectorizer 파일 크기: {self.vectorizer_file.stat().st_size if self.vectorizer_file.exists() else 0} bytes")
            
            # 각 MBTI 차원별 모델 저장
            for label in self.mbti_labels:
                if label in self.model_obj.models:
                    model_path = self.model_files[label]
                    model_absolute_path = model_path.absolute()
                    with open(model_path, 'wb') as f:
                        pickle.dump(self.model_obj.models[label], f)
                    ic(f"✅ {label} 모델 저장 완료: {model_absolute_path}")
                    ic(f"✅ {label} 모델 파일 존재 여부: {model_path.exists()}")
                    ic(f"✅ {label} 모델 파일 크기: {model_path.stat().st_size if model_path.exists() else 0} bytes")
            
            # Word2Vec 모델 저장 (있는 경우)
            if self.model_obj.word2vec_model is not None:
                word2vec_absolute_path = self.word2vec_file.absolute()
                with open(self.word2vec_file, 'wb') as f:
                    pickle.dump(self.model_obj.word2vec_model, f)
                ic(f"✅ Word2Vec 모델 저장 완료: {word2vec_absolute_path}")
                ic(f"✅ Word2Vec 파일 존재 여부: {self.word2vec_file.exists()}")
                ic(f"✅ Word2Vec 파일 크기: {self.word2vec_file.stat().st_size if self.word2vec_file.exists() else 0} bytes")
            
            # 메타데이터 저장
            csv_mtime = self.csv_file_path.stat().st_mtime
            
            # 각 차원별 모델 타입 확인
            model_types = {}
            for label in self.mbti_labels:
                if label in self.model_obj.models:
                    model = self.model_obj.models[label]
                    model_type = type(model).__name__
                    is_ensemble = model_type in ['VotingClassifier', 'StackingClassifier']
                    model_types[label] = {
                        'type': model_type,
                        'is_ensemble': is_ensemble,
                        'has_hyperparameter_tuning': label in self.best_params
                    }
            
            metadata = {
                'csv_mtime': csv_mtime,
                'csv_path': str(self.csv_file_path),
                'trained_at': datetime.now().isoformat(),
                'data_count': len(self.df) if self.df is not None else 0,
                'model_dir': str(self.model_dir.absolute()),
                'model_dir_relative': str(self.model_dir),
                'use_ensemble': self.use_ensemble,
                'use_hyperparameter_tuning': self.use_hyperparameter_tuning,
                'model_types': model_types,
                'best_params': self.best_params if self.best_params else {}
            }
            metadata_absolute_path = self.metadata_file.absolute()
            with open(self.metadata_file, 'wb') as f:
                pickle.dump(metadata, f)
            ic(f"✅ 메타데이터 저장 완료: {metadata_absolute_path}")
            ic(f"✅ 메타데이터 파일 존재 여부: {self.metadata_file.exists()}")
            ic(f"✅ 메타데이터 파일 크기: {self.metadata_file.stat().st_size if self.metadata_file.exists() else 0} bytes")
            
            # 저장된 모든 파일 목록 출력
            saved_files = []
            file_info = []
            if self.vectorizer_file.exists():
                saved_files.append(str(self.vectorizer_file.name))
                file_info.append(f"  - {self.vectorizer_file.name}: {self.vectorizer_file.stat().st_size} bytes")
            for label in self.mbti_labels:
                if self.model_files[label].exists():
                    saved_files.append(str(self.model_files[label].name))
                    file_info.append(f"  - {self.model_files[label].name}: {self.model_files[label].stat().st_size} bytes")
            if self.word2vec_file.exists():
                saved_files.append(str(self.word2vec_file.name))
                file_info.append(f"  - {self.word2vec_file.name}: {self.word2vec_file.stat().st_size} bytes")
            if self.metadata_file.exists():
                saved_files.append(str(self.metadata_file.name))
                file_info.append(f"  - {self.metadata_file.name}: {self.metadata_file.stat().st_size} bytes")
            
            ic(f"📦 저장된 모델 파일 목록 ({len(saved_files)}개):")
            for info in file_info:
                ic(info)
            ic(f"📁 모델 저장 위치: {self.model_dir.absolute()}")
            
        except Exception as e:
            ic(f"모델 저장 오류: {e}")
            raise
    
    def submit(self):
        """제출/모델 저장"""
        ic("😎😎 제출 시작")
        self.save_model()
        ic("😎😎 제출 완료")
    
    def check_accuracy(self) -> Dict[str, Any]:
        """모델 적중률(정확도) 확인 - 테스트 데이터로 평가"""
        try:
            if not self.model_obj.models or self.model_obj.vectorizer is None:
                raise ValueError("모델이 없습니다. learning()을 먼저 실행하세요.")
            
            if self.df is None or self.dataset.test is None:
                raise ValueError("테스트 데이터가 없습니다. learning()을 먼저 실행하세요.")
            
            ic("적중률 계산 시작...")
            
            # 테스트 데이터 준비 (읽기 전용 뷰 방지를 위해 copy 사용)
            test_texts = self.dataset.test['text'].values.copy()
            test_labels = {
                label: self.dataset.test[label].values.copy()
                for label in self.mbti_labels
            }
            
            # TF-IDF 벡터화
            X_test_tfidf = self.model_obj.vectorizer.transform(test_texts)
            
            # Word2Vec 임베딩 생성 (있는 경우)
            if self.use_word2vec and self.model_obj.word2vec_model is not None:
                def text_to_embedding(text, use_tfidf_weight=True):
                    """Word2Vec 임베딩 생성 (TF-IDF 가중 평균 지원)"""
                    words = simple_preprocess(str(text), deacc=True, min_len=1)
                    if len(words) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    
                    word_vectors = []
                    weights = []
                    
                    # TF-IDF 가중치 계산 (옵션)
                    if use_tfidf_weight and self.model_obj.vectorizer is not None:
                        try:
                            # 텍스트를 TF-IDF로 변환
                            tfidf_scores = self.model_obj.vectorizer.transform([text])
                            feature_names = self.model_obj.vectorizer.get_feature_names_out()
                            
                            for word in words:
                                if word in self.model_obj.word2vec_model.wv:
                                    word_vectors.append(self.model_obj.word2vec_model.wv[word])
                                    # TF-IDF 가중치 가져오기
                                    if word in feature_names:
                                        word_idx = np.where(feature_names == word)[0]
                                        if len(word_idx) > 0:
                                            weight = tfidf_scores[0, word_idx[0]]
                                            weights.append(float(weight))
                                        else:
                                            weights.append(0.0)
                                    else:
                                        weights.append(0.0)
                        except Exception as e:
                            ic(f"TF-IDF 가중치 계산 실패, 단순 평균 사용: {e}")
                            # 실패 시 단순 평균으로 폴백
                            word_vectors = [
                                self.model_obj.word2vec_model.wv[word]
                                for word in words
                                if word in self.model_obj.word2vec_model.wv
                            ]
                            weights = [1.0] * len(word_vectors)
                    else:
                        # 단순 평균 (TF-IDF 가중치 없음)
                        word_vectors = [
                            self.model_obj.word2vec_model.wv[word]
                            for word in words
                            if word in self.model_obj.word2vec_model.wv
                        ]
                        weights = [1.0] * len(word_vectors)
                    
                    if len(word_vectors) == 0:
                        return np.zeros(self.model_obj.word2vec_model.vector_size)
                    
                    # 가중 평균 계산
                    weights = np.array(weights)
                    weights = weights / (weights.sum() + 1e-8)  # 정규화
                    return np.average(word_vectors, axis=0, weights=weights)
                
                X_test_word2vec = np.array([text_to_embedding(text, use_tfidf_weight=False) for text in test_texts])
                from scipy.sparse import csr_matrix
                X_test_word2vec_sparse = csr_matrix(X_test_word2vec)
                X_test_base = hstack([X_test_tfidf, X_test_word2vec_sparse])
            else:
                X_test_base = X_test_tfidf
            
            # 기본 특징만 사용 (고급 특징 제외로 오버피팅 방지)
            X_test = X_test_base
            
            # 각 MBTI 차원별 정확도 계산
            accuracy_results = {}
            overall_accuracy = []
            
            for label in self.mbti_labels:
                model = self.model_obj.models.get(label)
                if model is None:
                    continue
                
                y_true = test_labels[label]
                y_pred = model.predict(X_test)
                
                # 다양한 평가 지표 계산
                acc = accuracy_score(y_true, y_pred)
                precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
                
                accuracy_results[label] = {
                    "accuracy": float(acc),
                    "accuracy_percent": float(acc * 100),
                    "precision": float(precision),
                    "precision_percent": float(precision * 100),
                    "recall": float(recall),
                    "recall_percent": float(recall * 100),
                    "f1_score": float(f1),
                    "f1_score_percent": float(f1 * 100),
                    "test_samples": int(len(y_true)),
                    "correct_predictions": int(np.sum(y_true == y_pred))
                }
                
                overall_accuracy.append(acc)
                
                # 분류 리포트 (상세 정보)
                try:
                    report = classification_report(
                        y_true, y_pred, 
                        output_dict=True,
                        zero_division=0
                    )
                    accuracy_results[label]["classification_report"] = report
                    
                    # Confusion Matrix도 추가
                    cm = confusion_matrix(y_true, y_pred)
                    accuracy_results[label]["confusion_matrix"] = cm.tolist()
                except Exception as e:
                    ic(f"{label} 분류 리포트 생성 실패: {e}")
            
            # 전체 평균 정확도
            mean_accuracy = np.mean(overall_accuracy) if overall_accuracy else 0.0
            
            result = {
                "overall_accuracy": float(mean_accuracy),
                "overall_accuracy_percent": float(mean_accuracy * 100),
                "dimension_accuracies": accuracy_results,
                "test_samples": int(len(test_texts))
            }
            
            ic(f"전체 평균 정확도: {mean_accuracy * 100:.2f}%")
            
            # 오버피팅 경고
            overfitting_warnings = []
            for label, acc_info in accuracy_results.items():
                acc = acc_info['accuracy']
                ic(f"{label} 정확도: {acc_info['accuracy_percent']:.2f}%")
                
                if acc == 1.0:
                    ic(f"⚠️  {label} 경고: 100% 정확도는 오버피팅의 강한 신호입니다!")
                    overfitting_warnings.append(f"{label} (100%)")
                elif acc > 0.98:
                    ic(f"⚠️  {label} 주의: 98% 이상 정확도는 오버피팅 가능성이 있습니다.")
                    overfitting_warnings.append(f"{label} ({acc*100:.1f}%)")
            
            if overfitting_warnings:
                ic(f"🚨 오버피팅 의심 차원: {', '.join(overfitting_warnings)}")
                ic("💡 권장: 모델 파라미터를 더 보수적으로 조정하거나 데이터를 확인하세요.")
            
            return result
            
        except Exception as e:
            ic(f"적중률 계산 오류: {e}")
            raise
    
    def _optimize_hyperparameters(self, X_train, y_train, label: str, n_trials: int = 50) -> Dict[str, Any]:
        """축별 맞춤 하이퍼파라미터 최적화 (Optuna 사용)"""
        if not OPTUNA_AVAILABLE:
            raise ValueError("Optuna가 설치되지 않았습니다. pip install optuna로 설치하세요.")
        
        # 축별 데이터 특성 분석
        from collections import Counter
        class_counts = Counter(y_train)
        min_class_count = min(class_counts.values()) if class_counts else 0
        max_class_count = max(class_counts.values()) if class_counts else 0
        imbalance_ratio = max_class_count / min_class_count if min_class_count > 0 else 1.0
        zero_ratio = (y_train == 0).sum() / len(y_train) if len(y_train) > 0 else 0.0
        
        ic(f"{label} 데이터 특성: 불균형 비율={imbalance_ratio:.2f}:1, 평가불가 비율={zero_ratio:.2%}")
        
        def objective(trial):
            # 축별 특성에 맞는 파라미터 범위 설정
            if label == 'E_I':
                # 불균형 데이터 (외향 E: 2457, 내향 I: 3880) → 외향 예측 개선 필요
                # recall 개선을 위해 더 많은 트리와 깊이 조정
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),  # 더 많은 트리로 다양성 확보
                    'max_depth': trial.suggest_int('max_depth', 8, 20),  # 깊이 증가로 외향 패턴 학습
                    'min_samples_split': trial.suggest_int('min_samples_split', 5, 20),  # 적당한 정규화
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 2, 10),  # 적당한 정규화
                    'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', 0.5, 0.7]),  # 특징 다양화
                    'class_weight': trial.suggest_categorical('class_weight', 
                        ['balanced', 'balanced_subsample', {0: 1.0, 1: 1.5, 2: 1.0}])  # 외향(1) 가중치 증가
                }
            elif label == 'S_N':
                # 평가불가 비율 높음 → 오버피팅 방지 강화
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 50, 150),  # 300-600 → 50-150
                    'max_depth': trial.suggest_int('max_depth', 5, 12),  # 15-30 → 5-12
                    'min_samples_split': trial.suggest_int('min_samples_split', 10, 30),  # 2-20 → 10-30
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 5, 15),  # 1-5 → 5-15
                    'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2']),  # 0.5, 0.7 제거
                    'class_weight': 'balanced'
                }
            elif label == 'T_F':
                # 균형 데이터 (1:1) → 오버피팅 방지 강화
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 50, 150),  # 100-400 → 50-150
                    'max_depth': trial.suggest_int('max_depth', 5, 12),  # 10-25 → 5-12
                    'min_samples_split': trial.suggest_int('min_samples_split', 10, 30),  # 2-20 → 10-30
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 5, 15),  # 1-10 → 5-15
                    'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2']),  # 0.5, 0.7 제거
                    'class_weight': trial.suggest_categorical('class_weight', [None, 'balanced'])
                }
            else:  # J_P
                # 특수 케이스: 클래스 불균형 심각 (0: 769, 1: 994, 2: 6030)
                # 클래스 2가 과다 → 더 강한 정규화 및 클래스 가중치 조정
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 50, 200),  # 더 많은 트리로 다양성 확보
                    'max_depth': trial.suggest_int('max_depth', 5, 15),  # 깊이 조정
                    'min_samples_split': trial.suggest_int('min_samples_split', 30, 100),  # 매우 강한 정규화
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 15, 50),  # 매우 강한 정규화
                    'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', 0.3, 0.5]),  # 더 적은 특징
                    'class_weight': trial.suggest_categorical('class_weight', ['balanced', 'balanced_subsample'])  # 가중치 최적화
                }
            
            model = RandomForestClassifier(**params, random_state=42, n_jobs=1)  # WRITEBACKIFCOPY 오류 방지
            
            # 교차 검증 (빠른 테스트를 위해 3-fold로 줄임)
            cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
            # WRITEBACKIFCOPY 오류 방지를 위해 n_jobs=1 사용
            scores = cross_val_score(model, X_train, y_train, 
                                    cv=cv, scoring='f1_weighted', n_jobs=1)
            return scores.mean()
        
        study = optuna.create_study(direction='maximize', study_name=f'mbti_{label}')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
        
        ic(f"{label} 축별 맞춤 최적화 완료: Best F1-Score = {study.best_value:.4f}")
        return study.best_params
    
    def _create_ensemble_model(self, label: str):
        """축별 맞춤 앙상블 모델 생성"""
        estimators = []
        
        # 축별 데이터 특성에 맞는 앙상블 구성
        if label == 'E_I':
            # 불균형 데이터 → 오버피팅 방지 강화
            ic(f"{label} 축별 맞춤 앙상블: RF + XGBoost + SVM (오버피팅 방지 강화)")
            
            rf = RandomForestClassifier(
                n_estimators=100,  # 200 → 100 (오버피팅 방지)
                max_depth=10,  # 15 → 10 (오버피팅 방지)
                min_samples_split=10,  # 5 → 10 (오버피팅 방지)
                min_samples_leaf=5,  # 3 → 5 (오버피팅 방지)
                max_features='sqrt',
                random_state=42,
                n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                class_weight='balanced'
            )
            estimators.append(('rf', rf))
            
            if XGBOOST_AVAILABLE:
                xgb = XGBClassifier(
                    n_estimators=100,  # 200 → 100 (오버피팅 방지)
                    max_depth=5,  # 6 → 5 (오버피팅 방지)
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                    eval_metric='mlogloss'
                    # scale_pos_weight는 다중 클래스 분류에서 사용되지 않음 (제거)
                )
                estimators.append(('xgb', xgb))
            
            # SVM 추가 (불균형 데이터에 강함)
            try:
                svm = SVC(
                    probability=True,
                    class_weight='balanced',
                    random_state=42,
                    kernel='rbf',
                    C=1.0,
                    gamma='scale'
                )
                estimators.append(('svm', svm))
            except Exception as e:
                ic(f"SVM 추가 실패: {e}")
        
        elif label == 'S_N':
            # 평가불가 비율 높음 → 오버피팅 방지 강화
            ic(f"{label} 축별 맞춤 앙상블: RF + XGBoost + LightGBM (오버피팅 방지 강화)")
            
            rf = RandomForestClassifier(
                n_estimators=100,  # 300 → 100 (오버피팅 방지)
                max_depth=10,  # 20 → 10 (오버피팅 방지)
                min_samples_split=10,  # 5 → 10 (오버피팅 방지)
                min_samples_leaf=5,  # 3 → 5 (오버피팅 방지)
                max_features='sqrt',
                random_state=42,
                n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                class_weight='balanced'
            )
            estimators.append(('rf', rf))
            
            if XGBOOST_AVAILABLE:
                xgb = XGBClassifier(
                    n_estimators=100,  # 300 → 100 (오버피팅 방지)
                    max_depth=5,  # 8 → 5 (오버피팅 방지)
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                    eval_metric='mlogloss'
                )
                estimators.append(('xgb', xgb))
            
            if LIGHTGBM_AVAILABLE:
                lgbm = LGBMClassifier(
                    n_estimators=100,  # 300 → 100 (오버피팅 방지)
                    max_depth=5,  # 8 → 5 (오버피팅 방지)
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                    verbose=-1,
                    is_unbalance=True  # class_weight 대신 is_unbalance 사용 (LightGBM 전용)
                )
                estimators.append(('lgbm', lgbm))
        
        elif label == 'T_F':
            # 균형 데이터 → 오버피팅 방지 강화
            ic(f"{label} 축별 맞춤 앙상블: RF + XGBoost + LightGBM (오버피팅 방지 강화)")
            
            rf = RandomForestClassifier(
                n_estimators=100,  # 200 → 100 (오버피팅 방지)
                max_depth=10,  # 15 → 10 (오버피팅 방지)
                min_samples_split=10,  # 5 → 10 (오버피팅 방지)
                min_samples_leaf=5,  # 3 → 5 (오버피팅 방지)
                max_features='sqrt',
                random_state=42,
                n_jobs=1  # WRITEBACKIFCOPY 오류 방지
            )
            estimators.append(('rf', rf))
            
            if XGBOOST_AVAILABLE:
                xgb = XGBClassifier(
                    n_estimators=100,  # 200 → 100 (오버피팅 방지)
                    max_depth=5,  # 6 → 5 (오버피팅 방지)
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                    eval_metric='mlogloss'
                )
                estimators.append(('xgb', xgb))
            
            if LIGHTGBM_AVAILABLE:
                lgbm = LGBMClassifier(
                    n_estimators=100,  # 200 → 100 (오버피팅 방지)
                    max_depth=5,  # 6 → 5 (오버피팅 방지)
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                    verbose=-1
                )
                estimators.append(('lgbm', lgbm))
        
        else:  # J_P
            # 특수 케이스 (J 클래스 없음) → 오버피팅 방지 강화
            ic(f"{label} 축별 맞춤 앙상블: RandomForest만 사용 (오버피팅 방지 강화)")
            
            rf = RandomForestClassifier(
                n_estimators=50,  # 200 → 50 (J_P는 클래스가 1개뿐이므로 더 단순하게)
                max_depth=5,  # 15 → 5 (오버피팅 방지 강화)
                min_samples_split=20,  # 5 → 20 (오버피팅 방지 강화)
                min_samples_leaf=10,  # 3 → 10 (오버피팅 방지 강화)
                max_features='sqrt',
                random_state=42,
                n_jobs=1,  # WRITEBACKIFCOPY 오류 방지
                class_weight='balanced'
            )
            estimators.append(('rf', rf))
        
        if len(estimators) == 1:
            # 앙상블할 모델이 없으면 기본 모델 반환
            return estimators[0][1]
        
        # Voting Classifier 사용 (soft voting)
        # 가중치: RF에 더 높은 가중치
        weights = [2] + [1] * (len(estimators) - 1)
        ensemble = VotingClassifier(
            estimators=estimators,
            voting='soft',
            weights=weights,
            n_jobs=1  # WRITEBACKIFCOPY 오류 방지
        )
        
        ic(f"{label} 축별 맞춤 앙상블 모델 생성 완료: {len(estimators)}개 모델 결합")
        return ensemble
    
    def enable_hyperparameter_tuning(self, enable: bool = True, n_trials: int = 50):
        """하이퍼파라미터 최적화 활성화/비활성화
        
        Args:
            enable: 활성화 여부
            n_trials: 최적화 시행 횟수 (기본값: 50, 빠른 테스트: 10-20, 최대 성능: 100+)
        """
        if enable and not OPTUNA_AVAILABLE:
            raise ValueError("Optuna가 설치되지 않았습니다. pip install optuna로 설치하세요.")
        self.use_hyperparameter_tuning = enable
        self.n_trials = n_trials
        if enable:
            estimated_time = n_trials * 4 * 0.5 / 60  # 4개 차원, 각 차원당 약 0.5분
            ic(f"하이퍼파라미터 최적화: 활성화 (시행 횟수: {n_trials}, 예상 시간: 약 {estimated_time:.1f}시간)")
        else:
            ic(f"하이퍼파라미터 최적화: 비활성화")
    
    def enable_ensemble(self, enable: bool = True):
        """앙상블 모델 활성화/비활성화"""
        if enable:
            available_models = ['RandomForest']
            if XGBOOST_AVAILABLE:
                available_models.append('XGBoost')
            if LIGHTGBM_AVAILABLE:
                available_models.append('LightGBM')
            ic(f"앙상블 모델 활성화: {', '.join(available_models)} 사용")
        self.use_ensemble = enable

