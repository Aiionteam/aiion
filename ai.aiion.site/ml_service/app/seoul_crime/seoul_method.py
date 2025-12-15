from pathlib import Path
from typing import Tuple, Optional
import pandas as pd
import numpy as np
from pandas import DataFrame
from app.seoul_crime.seoul_data import SeoulCrimeData

class SeoulCrimeMethod(object):

    def __init__(self):
        self.dataset = SeoulCrimeData()

    def csv_to_df(self, fname: str) -> pd.DataFrame:
        """CSV 파일을 DataFrame으로 로드"""
        return pd.read_csv(fname, encoding='utf-8')

    def df_merge(
        self, 
        left: pd.DataFrame, 
        right: pd.DataFrame, 
        left_on: str, 
        right_on: str,
        how: str = 'inner',
        remove_duplicate_columns: bool = True
    ) -> pd.DataFrame:
        """
        두 DataFrame을 머지하는 메서드
        
        Parameters:
        -----------
        left : pd.DataFrame
            왼쪽 DataFrame
        right : pd.DataFrame
            오른쪽 DataFrame
        left_on : str
            왼쪽 DataFrame의 키 컬럼명
        right_on : str
            오른쪽 DataFrame의 키 컬럼명
        how : str, default 'inner'
            머지 방식 ('left', 'right', 'outer', 'inner')
        remove_duplicate_columns : bool, default True
            중복 컬럼 자동 처리 여부
        
        Returns:
        --------
        pd.DataFrame
            머지된 DataFrame
        """
        print(f"\n=== DataFrame 머지 시작 ===")
        print(f"왼쪽 DataFrame: {len(left)} 행, {len(left.columns)} 컬럼")
        print(f"오른쪽 DataFrame: {len(right)} 행, {len(right.columns)} 컬럼")
        print(f"머지 키: left['{left_on}'] = right['{right_on}']")
        print(f"머지 방식: {how}")
        
        # 머지 전 중복 컬럼 확인
        left_cols = set(left.columns)
        right_cols = set(right.columns)
        common_cols = left_cols.intersection(right_cols)
        common_cols.discard(left_on)  # 키 컬럼 제외
        
        if common_cols:
            print(f"\n⚠️  중복 컬럼 발견: {list(common_cols)}")
            print(f"   → 머지 후 suffix '_y'가 추가됩니다.")
        else:
            print(f"\n✅ 중복 컬럼 없음")
        
        # 머지 실행
        merged_df = pd.merge(
            left=left,
            right=right,
            left_on=left_on,
            right_on=right_on,
            how=how,
            suffixes=('', '_y')
        )
        
        print(f"\n머지 완료: {len(merged_df)} 행, {len(merged_df.columns)} 컬럼")
        
        # 중복 컬럼 처리
        if remove_duplicate_columns:
            # suffix '_y'가 붙은 컬럼 찾기
            duplicate_cols = [col for col in merged_df.columns if col.endswith('_y')]
            
            if duplicate_cols:
                print(f"\n중복 컬럼 처리 중...")
                for col_y in duplicate_cols:
                    col_original = col_y[:-2]  # '_y' 제거
                    
                    if col_original in merged_df.columns:
                        # 원본 컬럼과 비교
                        if merged_df[col_original].equals(merged_df[col_y]):
                            # 값이 동일하면 _y 컬럼 제거
                            merged_df = merged_df.drop(columns=[col_y])
                            print(f"   ✅ '{col_y}' 제거됨 (값이 '{col_original}'와 동일)")
                        else:
                            # 값이 다르면 경고 후 유지
                            print(f"   ⚠️  '{col_y}' 유지됨 (값이 '{col_original}'와 다름)")
                            # 원본 컬럼명 변경하여 구분
                            merged_df = merged_df.rename(columns={col_original: f"{col_original}_x"})
                
                print(f"처리 후: {len(merged_df.columns)} 컬럼")
        
        print(f"=== 머지 완료 ===\n")
        return merged_df

    def cctv_pop_merge(self, cctv_df: pd.DataFrame, pop_df: pd.DataFrame) -> pd.DataFrame:
        """
        CCTV와 인구 데이터를 머지하는 편의 메서드
        
        Parameters:
        -----------
        cctv_df : pd.DataFrame
            CCTV DataFrame (기관명 컬럼 필요)
        pop_df : pd.DataFrame
            인구 DataFrame (자치구 컬럼 필요)
        
        Returns:
        --------
        pd.DataFrame
            머지된 DataFrame
        """
        return self.df_merge(
            left=cctv_df,
            right=pop_df,
            left_on='기관명',
            right_on='자치구',
            how='inner',
            remove_duplicate_columns=True
        )
