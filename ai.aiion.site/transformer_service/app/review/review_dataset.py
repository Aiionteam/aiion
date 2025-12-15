"""
Review Dataset
영화 리뷰 데이터셋 관리 클래스
"""

import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
from icecream import ic


class ReviewDataset:
    """영화 리뷰 데이터셋 관리 클래스"""
    
    def __init__(self):
        """초기화"""
        self.data_dir: Optional[Path] = None
        self.df: Optional[pd.DataFrame] = None
    
    def load_json_files(self, data_dir: Path) -> pd.DataFrame:
        """
        JSON 파일들을 로드하여 DataFrame으로 변환
        
        Args:
            data_dir: JSON 파일들이 있는 디렉토리
            
        Returns:
            DataFrame: review, rating, label 컬럼 포함
        """
        self.data_dir = data_dir
        all_reviews = []
        
        # JSON 파일들 로드
        json_files = list(data_dir.glob("*.json"))
        ic(f"발견된 JSON 파일 수: {len(json_files)}")
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    reviews = json.load(f)
                    
                for review in reviews:
                    rating = int(review.get('rating', 0))
                    review_text = review.get('review', '').strip()
                    
                    if review_text and rating > 0:
                        # 라벨 생성: rating >= 7 -> 긍정(1), rating <= 4 -> 부정(0)
                        # rating 5-6은 중립이므로 제외
                        if rating >= 7:
                            label = 1  # 긍정
                        elif rating <= 4:
                            label = 0  # 부정
                        else:
                            continue  # 중립 제외
                        
                        all_reviews.append({
                            'review': review_text,
                            'rating': rating,
                            'label': label,
                            'movie_id': review.get('movie_id', ''),
                            'review_id': review.get('review_id', '')
                        })
            except Exception as e:
                ic(f"파일 로드 오류 ({json_file.name}): {e}")
                continue
        
        # DataFrame 생성
        self.df = pd.DataFrame(all_reviews)
        ic(f"총 리뷰 수: {len(self.df)}")
        ic(f"긍정 리뷰: {len(self.df[self.df['label'] == 1])}")
        ic(f"부정 리뷰: {len(self.df[self.df['label'] == 0])}")
        
        return self.df
    
    def get_train_test_split(
        self,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> tuple:
        """
        학습/테스트 데이터 분할
        
        Args:
            test_size: 테스트 데이터 비율
            random_state: 랜덤 시드
            
        Returns:
            (train_df, test_df): 학습/테스트 DataFrame 튜플
        """
        if self.df is None:
            raise ValueError("데이터를 먼저 로드하세요.")
        
        from sklearn.model_selection import train_test_split
        
        train_df, test_df = train_test_split(
            self.df,
            test_size=test_size,
            random_state=random_state,
            stratify=self.df['label']  # 라벨 비율 유지
        )
        
        ic(f"학습 데이터: {len(train_df)}개")
        ic(f"테스트 데이터: {len(test_df)}개")
        
        return train_df, test_df

