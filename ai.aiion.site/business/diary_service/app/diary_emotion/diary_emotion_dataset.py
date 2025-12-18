"""
Diary Emotion Dataset
일기 감정 데이터셋 관리 클래스
"""

from typing import Optional
import pandas as pd
from pathlib import Path


class DiaryEmotionDataSet:
    """일기 감정 데이터셋 관리 클래스"""
    
    def __init__(self):
        """초기화"""
        self._fname: str = ''  # file name
        self._dname: str = ''  # data path
        self._sname: str = ''  # save path
        self._train: Optional[pd.DataFrame] = None
        self._test: Optional[pd.DataFrame] = None
        self._id: str = 'id'  # ID 컬럼명
        self._label: str = 'emotion'  # 라벨 컬럼명
    
    @property
    def fname(self) -> str:
        """파일명 게터"""
        return self._fname
    
    @fname.setter
    def fname(self, fname: str):
        """파일명 세터"""
        self._fname = fname
    
    @property
    def dname(self) -> str:
        """데이터 경로 게터"""
        return self._dname
    
    @dname.setter
    def dname(self, dname: str):
        """데이터 경로 세터"""
        self._dname = dname
    
    @property
    def sname(self) -> str:
        """저장 경로 게터"""
        return self._sname
    
    @sname.setter
    def sname(self, sname: str):
        """저장 경로 세터"""
        self._sname = sname
    
    @property
    def train(self) -> Optional[pd.DataFrame]:
        """학습 데이터 게터"""
        return self._train
    
    @train.setter
    def train(self, train: Optional[pd.DataFrame]):
        """학습 데이터 세터"""
        self._train = train
    
    @property
    def test(self) -> Optional[pd.DataFrame]:
        """테스트 데이터 게터"""
        return self._test
    
    @test.setter
    def test(self, test: Optional[pd.DataFrame]):
        """테스트 데이터 세터"""
        self._test = test
    
    @property
    def id(self) -> str:
        """ID 컬럼명 게터"""
        return self._id
    
    @id.setter
    def id(self, id_value: str):
        """ID 컬럼명 세터"""
        self._id = id_value
    
    @property
    def label(self) -> str:
        """라벨 컬럼명 게터"""
        return self._label
    
    @label.setter
    def label(self, label: str):
        """라벨 컬럼명 세터"""
        self._label = label
    
    def load_csv(self, file_path: Path) -> pd.DataFrame:
        """
        CSV 파일 로드 (Python 엔진 사용)
        pandas, numpy, scikit-learn을 활용한 데이터 처리
        """
        try:
            # Python 엔진으로 CSV 읽기 (모든 데이터 로드)
            df = pd.read_csv(
                file_path,
                encoding='utf-8',
                engine='python',  # Python 엔진 명시적 사용 (C 엔진 미사용)
                sep=',',
                skip_blank_lines=True,
                skipinitialspace=True,
            )
            
            return df
        except Exception as e:
            print(f"CSV 파일 로드 오류: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def save_csv(self, df: pd.DataFrame, file_path: Path):
        """CSV 파일 저장"""
        try:
            df.to_csv(file_path, index=False, encoding='utf-8')
        except Exception as e:
            print(f"CSV 파일 저장 오류: {e}")
            raise

