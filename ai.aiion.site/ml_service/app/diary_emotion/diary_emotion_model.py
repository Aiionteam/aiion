"""
Diary Emotion Model
일기 감정 분류 머신러닝 모델 클래스
"""

import pandas as pd
import numpy as np
from icecream import ic


class DiaryEmotionModel:
    """일기 감정 분류 모델 클래스"""
    
    def __init__(self):
        """초기화"""
        self.model = None
        self.scaler = None
        self.vectorizer = None
        self.word2vec_model = None  # Word2Vec 모델 (문맥 이해)
        self.label_encoder = None
        ic("DiaryEmotionModel 초기화")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"DiaryEmotionModel(model={self.model is not None})"

