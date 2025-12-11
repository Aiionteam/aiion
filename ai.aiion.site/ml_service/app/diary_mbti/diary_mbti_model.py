"""
Diary MBTI Model
일기 MBTI 분류 머신러닝 모델 클래스
"""

import pandas as pd
import numpy as np
from icecream import ic


class DiaryMbtiModel:
    """일기 MBTI 분류 모델 클래스"""
    
    def __init__(self):
        """초기화"""
        self.models = {}  # 4개의 MBTI 차원별 모델 (E_I, S_N, T_F, J_P)
        self.scaler = None
        self.vectorizer = None
        self.word2vec_model = None  # Word2Vec 모델 (문맥 이해)
        self.label_encoders = {}  # 각 차원별 라벨 인코더
        ic("DiaryMbtiModel 초기화")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"DiaryMbtiModel(models={len(self.models)}개)"

