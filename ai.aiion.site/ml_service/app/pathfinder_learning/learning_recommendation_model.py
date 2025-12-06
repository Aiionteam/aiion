"""
Learning Recommendation Model
학습 추천 머신러닝 모델 클래스
"""

import pandas as pd
import numpy as np
from icecream import ic


class LearningRecommendationModel:
    """학습 추천 모델 클래스"""
    
    def __init__(self):
        """초기화"""
        self.model = None  # 주제 분류 모델
        self.ranking_model = None  # 랭킹 모델 (추천 점수 예측)
        self.scaler = None
        self.vectorizer = None  # 텍스트 벡터화
        self.topic_encoder = None  # 주제 라벨 인코더
        self.category_encoder = None  # 카테고리 라벨 인코더
        self.emotion_columns = None  # 감정 one-hot encoding 컬럼명 (고정)
        self.mbti_columns = None  # MBTI one-hot encoding 컬럼명 (고정)
        ic("LearningRecommendationModel 초기화")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"LearningRecommendationModel(model={self.model is not None}, ranking_model={self.ranking_model is not None})"

