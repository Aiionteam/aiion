"""
Diary MBTI Method
일기 MBTI 분류 전처리 메서드
"""

from typing import Optional, List
import pandas as pd
from icecream import ic
from pathlib import Path


class DiaryMbtiMethod:
    """일기 MBTI 분류 전처리 메서드 클래스"""
    
    def __init__(self, mbti_labels: Optional[List[str]] = None):
        """초기화
        
        Args:
            mbti_labels: MBTI 라벨 리스트 (기본값: ['E_I', 'S_N', 'T_F', 'J_P'])
        """
        self.mbti_labels = mbti_labels or ['E_I', 'S_N', 'T_F', 'J_P']
    
    def load_csv(self, csv_file_path: Path) -> pd.DataFrame:
        """CSV 파일 로드"""
        try:
            # CSV 파일 경로 검증 (폴더가 아닌 파일인지 확인)
            if csv_file_path.exists() and csv_file_path.is_dir():
                raise ValueError(f"오류: {csv_file_path}는 폴더입니다. CSV 파일이어야 합니다.")
            
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
    
    def handle_missing_values(self, df: pd.DataFrame, required_cols: List[str]) -> pd.DataFrame:
        """결측치 처리"""
        before_dropna = len(df)
        ic(f"결측치 처리 전 행 수: {before_dropna}")
        
        df = df.dropna(subset=required_cols)
        # 인덱스 재설정 (불연속 인덱스 방지)
        df = df.reset_index(drop=True)
        
        after_dropna = len(df)
        ic(f"결측치 처리 후 행 수: {after_dropna}")
        ic(f"제거된 행 수: {before_dropna - after_dropna}")
        
        return df
    
    def check_label_distribution(self, df: pd.DataFrame) -> dict:
        """MBTI 라벨 분포 확인"""
        distributions = {}
        for label in self.mbti_labels:
            if label in df.columns:
                value_counts = df[label].value_counts().sort_index()
                distributions[label] = value_counts.to_dict()
                ic(f"{label} 라벨 분포: {value_counts.to_dict()}")
        return distributions
    
    def convert_labels_to_zero_based(self, df: pd.DataFrame) -> pd.DataFrame:
        """라벨을 0-based로 변환 (1→0, 2→1)
        
        정제된 데이터에는 0(평가불가)이 없고 1, 2만 있으므로
        모델 학습을 위해 0, 1로 변환합니다.
        
        Args:
            df: 데이터프레임
            
        Returns:
            변환된 데이터프레임
        """
        df = df.copy()
        
        for label in self.mbti_labels:
            if label in df.columns:
                # 1 → 0, 2 → 1로 변환
                df[label] = df[label] - 1
                ic(f"{label} 라벨 변환 완료: 1→0, 2→1")
                ic(f"  변환 후 고유 값: {sorted(df[label].unique())}")
        
        return df
    
    def preprocess_text(self, df: pd.DataFrame) -> pd.DataFrame:
        """텍스트 전처리 (제목과 내용 결합 또는 기존 text 컬럼 사용)"""
        df = df.copy()
        
        # text 컬럼이 이미 있으면 그대로 사용
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
        
        # title과 content 컬럼이 있으면 합치기
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
    
    def filter_zero_labels(self, df: pd.DataFrame, labels: List[str] = None, min_zero_ratio: float = 0.3) -> pd.DataFrame:
        """평가불가(0) 라벨 필터링
        
        Parameters:
        -----------
        df : pd.DataFrame
            입력 데이터프레임
        labels : List[str]
            필터링할 라벨 리스트 (기본값: 모든 MBTI 라벨)
        min_zero_ratio : float
            평가불가 비율 임계값 (기본: 0.3 = 30%)
            이 비율 이상인 라벨의 평가불가 데이터를 제거
        
        Returns:
        --------
        pd.DataFrame
            필터링된 데이터프레임
        """
        if labels is None:
            labels = self.mbti_labels
        
        df_filtered = df.copy()
        original_count = len(df_filtered)
        
        # 각 라벨의 평가불가 비율 확인
        high_zero_labels = []
        for label in labels:
            if label in df_filtered.columns:
                zero_count = (df_filtered[label] == 0).sum()
                zero_ratio = zero_count / len(df_filtered)
                if zero_ratio >= min_zero_ratio:
                    high_zero_labels.append(label)
                    ic(f"{label} 평가불가 비율: {zero_ratio*100:.2f}% (임계값 초과)")
        
        # 평가불가 비율이 높은 라벨의 평가불가 데이터 제거
        if high_zero_labels:
            mask = pd.Series([True] * len(df_filtered))
            for label in high_zero_labels:
                mask = mask & (df_filtered[label] != 0)
            df_filtered = df_filtered[mask].copy()
            # 인덱스 재설정 (불연속 인덱스 방지)
            df_filtered = df_filtered.reset_index(drop=True)
            removed_count = original_count - len(df_filtered)
            ic(f"평가불가 데이터 제거: {removed_count:,} 개 ({removed_count/original_count*100:.2f}%)")
            ic(f"필터링 후 데이터: {len(df_filtered):,} 개")
        else:
            ic("평가불가 비율이 임계값 이하입니다. 필터링하지 않습니다.")
        
        return df_filtered
    
    def filter_short_texts(self, df: pd.DataFrame, min_length: int = 50) -> pd.DataFrame:
        """너무 짧은 텍스트 필터링
        
        Parameters:
        -----------
        df : pd.DataFrame
            입력 데이터프레임 (text 컬럼 필요)
        min_length : int
            최소 텍스트 길이 (기본: 50자)
        
        Returns:
        --------
        pd.DataFrame
            필터링된 데이터프레임
        """
        if 'text' not in df.columns:
            ic("⚠️ text 컬럼이 없습니다. 필터링을 건너뜁니다.")
            return df
        
        before = len(df)
        df_filtered = df[df['text'].str.len() >= min_length].copy()
        df_filtered = df_filtered.reset_index(drop=True)
        removed_count = before - len(df_filtered)
        
        if removed_count > 0:
            ic(f"짧은 텍스트 제거: {removed_count:,}개 ({removed_count/before*100:.2f}%)")
            ic(f"필터링 후 데이터: {len(df_filtered):,}개 (최소 길이: {min_length}자)")
        else:
            ic(f"짧은 텍스트 없음 (모든 텍스트가 {min_length}자 이상)")
        
        return df_filtered
    
    def extract_advanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """고급 특징 추출 (MBTI 특화 특징)"""
        features = pd.DataFrame(index=df.index)
        
        # 1. 텍스트 길이 특징
        features['text_length'] = df['text'].str.len()
        features['word_count'] = df['text'].str.split().str.len()
        features['avg_word_length'] = features['text_length'] / (features['word_count'] + 1)
        
        # 2. 문장 개수
        features['sentence_count'] = df['text'].str.count('[.!?]+')
        
        # 3. 특수문자 비율
        features['special_char_ratio'] = df['text'].str.count('[!?]') / (features['text_length'] + 1)
        
        # 4. 감정어 빈도
        positive_words = ['좋', '행복', '즐거', '기쁨', '사랑']
        negative_words = ['나쁘', '슬프', '화나', '힘들', '우울']
        
        for word in positive_words:
            features[f'pos_{word}'] = df['text'].str.count(word)
        for word in negative_words:
            features[f'neg_{word}'] = df['text'].str.count(word)
        
        # 5. 1인칭/2인칭 대명사 빈도 (E/I 분류에 유용)
        features['first_person'] = df['text'].str.count('나|내|저|제')
        features['second_person'] = df['text'].str.count('너|당신|그대')
        
        # 6. 추상적/구체적 표현 비율 (S/N 분류에 유용)
        abstract_words = ['생각', '느낌', '아이디어', '상상', '미래']
        concrete_words = ['것', '사실', '현실', '지금', '오늘']
        
        for word in abstract_words:
            features[f'abstract_{word}'] = df['text'].str.count(word)
        for word in concrete_words:
            features[f'concrete_{word}'] = df['text'].str.count(word)
        
        # 7. 감정표현/논리표현 비율 (T/F 분류에 유용)
        emotion_words = ['감동', '기분', '마음', '느낌']
        logic_words = ['왜냐하면', '그래서', '따라서', '결론']
        
        for word in emotion_words:
            features[f'emotion_{word}'] = df['text'].str.count(word)
        for word in logic_words:
            features[f'logic_{word}'] = df['text'].str.count(word)
        
        # 8. 계획/즉흥 표현 비율 (J/P 분류에 유용)
        plan_words = ['계획', '준비', '미리', '스케줄']
        spontaneous_words = ['즉흥', '갑자기', '충동', '그냥']
        
        for word in plan_words:
            features[f'plan_{word}'] = df['text'].str.count(word)
        for word in spontaneous_words:
            features[f'spont_{word}'] = df['text'].str.count(word)
        
        # 결측치 처리 (0으로 채움)
        features = features.fillna(0)
        
        ic(f"고급 특징 추출 완료: {len(features.columns)}개 특징")
        return features

