"""
Diary Emotion Method
일기 감정 분류 전처리 및 학습 메서드
"""

from typing import Optional, Tuple, Dict, Any
import pandas as pd
from icecream import ic
from pathlib import Path
import numpy as np

# PyTorch 및 관련 라이브러리
try:
    import torch
    from torch.utils.data import Dataset, DataLoader
    from torch import nn
    from torch.optim import AdamW
    from transformers import get_linear_schedule_with_warmup
    from tqdm import tqdm
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    ic("경고: torch 관련 라이브러리가 설치되지 않았습니다.")


class EmotionDataset(Dataset):
    """감정 분류 데이터셋 (PyTorch)"""
    
    def __init__(
        self,
        texts: list,
        labels: list,
        tokenizer,
        max_length: int = 512
    ):
        """
        초기화
        
        Args:
            texts: 텍스트 리스트
            labels: 라벨 리스트
            tokenizer: HuggingFace 토크나이저
            max_length: 최대 토큰 길이
        """
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        # 토크나이징
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


class DiaryEmotionMethod:
    """일기 감정 분류 전처리 및 학습 메서드 클래스"""
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu") if TORCH_AVAILABLE else None
        ic(f"Device: {self.device}")
    
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
        """텍스트 전처리 (제목과 내용 결합 또는 기존 text 컬럼 사용)"""
        df = df.copy()
        
        # text 컬럼이 이미 있으면 그대로 사용 (diary_copers.csv 같은 경우)
        if 'text' in df.columns:
            ic("text 컬럼이 이미 존재합니다. 기존 text 컬럼 사용")
            # SEP를 공백으로 대체 (title과 content 구분자)
            df['text'] = df['text'].fillna('').astype(str).str.replace(' SEP ', ' ', regex=False)
            
            # 줄바꿈(\n, \r\n)을 공백으로 변환
            df['text'] = df['text'].str.replace(r'\r?\n', ' ', regex=True)
            
            # 탭 문자도 공백으로 변환
            df['text'] = df['text'].str.replace('\t', ' ', regex=False)
            
            # 연속된 공백을 하나로 통합
            df['text'] = df['text'].str.replace(r'\s+', ' ', regex=True).str.strip()
            
            return df
        
        # title과 content 컬럼이 있으면 합치기 (기존 diary.csv 같은 경우)
        if 'title' in df.columns and 'content' in df.columns:
            ic("title과 content 컬럼을 합쳐서 text 컬럼 생성")
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
        
        # text, title, content 모두 없으면 에러
        raise ValueError("text 컬럼 또는 (title, content) 컬럼이 필요합니다.")
    
    def get_label_distribution(self, df: pd.DataFrame, label_col: str) -> dict:
        """라벨 분포 확인"""
        if label_col in df.columns:
            return df[label_col].value_counts().to_dict()
        return {}

