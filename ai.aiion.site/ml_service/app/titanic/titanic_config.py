"""
타이타닉 데이터 전처리 설정 클래스
하드코딩된 값들을 설정으로 분리하여 유연성 향상
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
import numpy as np
import os


@dataclass
class TitanicConfig:
    """타이타닉 데이터 전처리 설정"""
    
    # 파일 경로 설정
    train_csv_path: Optional[Path] = None
    test_csv_path: Optional[Path] = None
    label_column: str = 'Survived'
    
    # 삭제할 피처 목록
    drop_features: List[str] = field(default_factory=lambda: ['SibSp', 'Parch', 'Cabin', 'Ticket', 'Name'])
    
    # 전처리 파이프라인 순서
    preprocessing_steps: List[str] = field(default_factory=lambda: [
        'pclass_ordinal',
        'fare_ratio',
        'embarked_nominal',
        'gender_nominal',
        'age_ratio',
        'title_nominal'
    ])
    
    # 임계값 설정
    rare_title_threshold: int = 10
    rare_prefix_threshold: int = 5
    
    # Age 구간 설정
    age_bins: List[float] = field(default_factory=lambda: [-1, 0, 5, 12, 18, 24, 35, 60, np.inf])
    age_labels: List[str] = field(default_factory=lambda: [
        'Unknown', 'Baby', 'Child', 'Teenager', 
        'Young Adult', 'Adult', 'Senior', 'Elderly'
    ])
    
    # Fare 구간 설정
    fare_quantiles: int = 4
    
    # convert_to_int에서 제거할 원본 컬럼
    columns_to_drop_after_encoding: List[str] = field(default_factory=lambda: [
        'gender', 'Sex', 'Age_band', 'Embarked'
    ])
    
    @classmethod
    def default(cls, base_path: Optional[Path] = None) -> 'TitanicConfig':
        """기본 설정 생성 (환경변수 또는 기본값 사용)"""
        if base_path is None:
            base_path = Path(__file__).parent
        
        # 환경변수에서 파일 경로 읽기 (없으면 기본값)
        train_csv = os.getenv('TITANIC_TRAIN_CSV', 'train.csv')
        test_csv = os.getenv('TITANIC_TEST_CSV', 'test.csv')
        
        train_path = Path(train_csv) if Path(train_csv).is_absolute() else base_path / train_csv
        test_path = Path(test_csv) if Path(test_csv).is_absolute() else base_path / test_csv
        
        return cls(
            train_csv_path=train_path,
            test_csv_path=test_path
        )
    
    def validate(self):
        """설정 유효성 검증"""
        if self.train_csv_path and not self.train_csv_path.exists():
            raise FileNotFoundError(f"Train CSV 파일을 찾을 수 없습니다: {self.train_csv_path}")
        if self.test_csv_path and not self.test_csv_path.exists():
            raise FileNotFoundError(f"Test CSV 파일을 찾을 수 없습니다: {self.test_csv_path}")
        
        if len(self.age_bins) - 1 != len(self.age_labels):
            raise ValueError(f"Age bins({len(self.age_bins)})와 labels({len(self.age_labels)})의 개수가 맞지 않습니다.")

