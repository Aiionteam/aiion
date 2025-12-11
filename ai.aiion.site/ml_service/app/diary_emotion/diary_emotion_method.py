"""
Diary Emotion Method
일기 감정 분류 전처리 메서드
"""

from typing import Optional
import pandas as pd
from icecream import ic
from pathlib import Path


class DiaryEmotionMethod:
    """일기 감정 분류 전처리 메서드 클래스"""
    
    def __init__(self):
        pass
    
    def load_csv(self, csv_file_path: Path) -> pd.DataFrame:
        """CSV 파일 로드"""
        try:
            df = pd.read_csv(
                csv_file_path,
                encoding='utf-8',
                engine='python',
                sep=',',
                skip_blank_lines=True,
                skipinitialspace=True,
            )
            ic(f"데이터 로드 완료: {len(df)} 개 행")
            return df
        except Exception as e:
            ic(f"CSV 파일 로드 오류: {e}")
            raise
    
    def handle_missing_values(self, df: pd.DataFrame, required_cols: list[str]) -> pd.DataFrame:
        """결측치 처리"""
        before_dropna = len(df)
        ic(f"결측치 처리 전 행 수: {before_dropna}")
        
        df = df.dropna(subset=required_cols)
        
        after_dropna = len(df)
        ic(f"결측치 처리 후 행 수: {after_dropna}")
        ic(f"제거된 행 수: {before_dropna - after_dropna}")
        
        return df
    
    def preprocess_text(self, df: pd.DataFrame) -> pd.DataFrame:
        """텍스트 전처리 (제목과 내용 결합)"""
        df = df.copy()
        
        # 제목과 내용을 문자열로 변환
        title_text = df['title'].fillna('').astype(str)
        content_text = df['content'].fillna('').astype(str)
        
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
        df['text'] = (title_text + ' ' + content_text).str.strip()
        
        return df
    
    def get_label_distribution(self, df: pd.DataFrame, label_col: str) -> dict:
        """라벨 분포 확인"""
        if label_col in df.columns:
            return df[label_col].value_counts().to_dict()
        return {}

