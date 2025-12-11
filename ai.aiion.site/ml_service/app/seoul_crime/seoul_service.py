import sys
import pandas as pd
import numpy as np
import re
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
from app.seoul_crime.seoul_method import SeoulCrimeMethod
from app.seoul_crime.seoul_data import SeoulCrimeData
from app.seoul_crime.kakao_map_singleton import KakaoMapSingleton

try:
    from common.utils import setup_logging
    logger = setup_logging("seoul_service")
except ImportError:
    import logging
    logger = logging.getLogger("seoul_service")

class SeoulCrimeService:
    """서울 범죄 데이터 서비스"""
    
    def __init__(self):
        self.method = SeoulCrimeMethod()
        self.data = SeoulCrimeData()
        self.crime_rate_columns = ['살인검거율', '강도검거율', '강간검거율', '절도검거율', '폭력검거율']
        self.crime_columns = ['살인', '강도', '강간', '절도', '폭력']
        self.merged_df: Optional[pd.DataFrame] = None
    
    def _clean_station_name(self, station_name: str) -> str:
        """
        경찰서 이름에서 괄호 안의 텍스트 및 불필요한 텍스트 제거
        예: "서울구로경찰서 임시청사" -> "서울구로경찰서"
        예: "서울방배경찰서 (2025년 예정)" -> "서울방배경찰서"
        예: "서울구로경찰서 (임시청사)" -> "서울구로경찰서"
        
        Args:
            station_name: 경찰서 이름
        
        Returns:
            정리된 경찰서 이름
        """
        if not station_name or not isinstance(station_name, str):
            return station_name
        
        cleaned = station_name
        
        # 1. 반각 괄호와 그 안의 내용 제거 (예: "(임시청사)", "(2025년 예정)")
        cleaned = re.sub(r'\s*\([^)]*\)', '', cleaned)
        
        # 2. 전각 괄호와 그 안의 내용 제거 (예: "（임시청사）", "（2025년 예정）")
        cleaned = re.sub(r'\s*（[^）]*）', '', cleaned)
        
        # 3. "임시청사" 텍스트 제거 (괄호 없이도)
        cleaned = re.sub(r'\s*임시청사\s*', '', cleaned, flags=re.IGNORECASE)
        
        # 4. "(2025년 예정)" 같은 패턴도 한 번 더 확인
        cleaned = re.sub(r'\s*\(?\s*2025년\s*예정\s*\)?', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*\(?\s*예정\s*\)?', '', cleaned, flags=re.IGNORECASE)
        
        # 5. 공백 정리
        cleaned = cleaned.strip()
        
        return cleaned

    def preprocess(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        데이터 전처리 및 머지 (CCTV + 인구 + 범죄)
        
        Returns:
        --------
        Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]
            (cctv_df, crime_df, pop_df, final_merged_df)
            final_merged_df: CCTV, 인구, 범죄 데이터가 자치구 기준으로 머지된 최종 DataFrame
        """
        print("\n" + "="*60)
        print("서울 범죄 데이터 전처리 시작")
        print("="*60)
        
        # 데이터 로드
        data_dir = Path(self.data.dname)
        cctv_path = data_dir / "cctv.csv"
        crime_path = data_dir / "crime.csv"
        pop_path = data_dir / "pop.csv"
        
        print(f"\n[1/6] CSV 파일 로드 중...")
        cctv_df = self.method.csv_to_df(str(cctv_path))
        crime_df = self.method.csv_to_df(str(crime_path))
        # pop.csv는 헤더가 여러 줄이므로 header=None으로 읽기
        pop_df = pd.read_csv(str(pop_path), encoding='utf-8', header=None)
        
        print(f"   ✅ CCTV: {len(cctv_df)} 행, {len(cctv_df.columns)} 컬럼")
        print(f"   ✅ 범죄: {len(crime_df)} 행, {len(crime_df.columns)} 컬럼")
        print(f"   ✅ 인구: {len(pop_df)} 행, {len(pop_df.columns)} 컬럼")
        
        logger.info(f"  cctv 탑: {cctv_df.head(1).to_string()}")
        logger.info(f"  crime 탑: {crime_df.head(1).to_string()}")
        logger.info(f"  pop 탑: {pop_df.head(1).to_string()}")
        
        # pop.csv 전처리 (헤더가 여러 줄인 경우 처리)
        print(f"\n[2/6] 인구 데이터 전처리 중...")
        print(f"   원본 데이터: {len(pop_df)} 행, {len(pop_df.columns)} 컬럼")
        
        # axis=0: 0, 1, 2 행 drop (인덱스 0, 1, 2 - 헤더 행들)
        # 인덱스 2의 컬럼명을 사용: 기간,자치구,세대,계,남자,여자,계,남자,여자,계,남자,여자,세대당인구,65세이상고령자
        # 인덱스 3부터 실제 데이터 시작
        if len(pop_df) > 2:
            # 인덱스 2의 컬럼명을 가져옴 (header=None으로 읽었으므로 인덱스 2가 실제 컬럼명 행)
            column_names = pop_df.iloc[2].values
            # 컬럼명을 문자열로 변환하고 공백 제거
            column_names = [str(col).strip() if pd.notna(col) and str(col).strip() != 'nan' else f'Unnamed_{i}' for i, col in enumerate(column_names)]
            # 컬럼명 설정
            pop_df.columns = column_names
            # 인덱스 0, 1, 2 행 제거 (헤더 행들)
            pop_df = pop_df.drop([0, 1, 2], axis=0)
            pop_df = pop_df.reset_index(drop=True)
            print(f"   ✅ 헤더 행 제거 완료 (0, 1, 2행): {len(pop_df)} 행")
            print(f"   ✅ 컬럼명 설정 완료: {list(pop_df.columns)}")
        else:
            raise ValueError(f"pop.csv 데이터가 부족합니다. 최소 3행의 헤더가 필요합니다. 현재 행 수: {len(pop_df)}")
        
        # '자치구' 컬럼 존재 확인
        if '자치구' not in pop_df.columns:
            available_cols = list(pop_df.columns)
            raise ValueError(
                f"'자치구' 컬럼을 찾을 수 없습니다.\n"
                f"현재 컬럼 목록: {available_cols}\n"
                f"데이터 shape: {pop_df.shape}\n"
                f"첫 3행:\n{pop_df.head(3)}"
            )
        
        # axis=1: '자치구'와 첫 번째 '계' 컬럼만 남기고 나머지 drop
        # 첫 번째 '계' 컬럼이 총 인구 수 (인덱스 3번째 컬럼)
        # 컬럼 순서: 기간,자치구,세대,계(총인구),남자,여자,계(한국인),남자,여자,계(외국인),남자,여자,세대당인구,65세이상고령자
        # 따라서 인덱스 3번째 컬럼이 총 인구 '계'
        
        # 첫 번째 '계' 컬럼의 인덱스 찾기
        col_list = list(pop_df.columns)
        first_gye_idx = None
        jachigu_idx = None
        
        for idx, col in enumerate(col_list):
            col_str = str(col).strip()
            if col_str == '계' and first_gye_idx is None:
                first_gye_idx = idx
            if col_str == '자치구' and jachigu_idx is None:
                jachigu_idx = idx
        
        if first_gye_idx is None:
            raise ValueError(f"'계' 컬럼을 찾을 수 없습니다. 현재 컬럼: {list(pop_df.columns)}")
        if jachigu_idx is None:
            raise ValueError(f"'자치구' 컬럼을 찾을 수 없습니다. 현재 컬럼: {list(pop_df.columns)}")
        
        print(f"   ✅ 총 인구 컬럼 찾음: '계' (인덱스 {first_gye_idx})")
        print(f"   ✅ 자치구 컬럼 찾음: '자치구' (인덱스 {jachigu_idx})")
        
        # 인덱스로 컬럼 선택 (중복 방지)
        columns_to_keep_indices = sorted([jachigu_idx, first_gye_idx])
        pop_df = pop_df.iloc[:, columns_to_keep_indices]
        
        # 컬럼명 재설정
        new_column_names = ['자치구', '인구']
        pop_df.columns = new_column_names
        print(f"   ✅ 컬럼 선택 완료: {list(pop_df.columns)}")
        
        # 빈 행 제거 및 합계 행 제거
        pop_df = pop_df[pop_df['자치구'].notna() & (pop_df['자치구'] != '')]
        pop_df = pop_df[pop_df['자치구'] != '합계']  # 합계 행 제거
        pop_df = pop_df.reset_index(drop=True)
        
        # 숫자 컬럼에서 콤마 제거 및 숫자 변환
        # '인구' 컬럼이 Series인지 확인
        if '인구' in pop_df.columns:
            # Series인지 확인
            if isinstance(pop_df['인구'], pd.Series):
                pop_df['인구'] = pop_df['인구'].astype(str).str.replace(',', '').str.replace('"', '')
                pop_df['인구'] = pd.to_numeric(pop_df['인구'], errors='coerce')
            else:
                # DataFrame인 경우 첫 번째 컬럼만 선택
                pop_df['인구'] = pop_df['인구'].iloc[:, 0] if hasattr(pop_df['인구'], 'iloc') else pop_df['인구']
                pop_df['인구'] = pop_df['인구'].astype(str).str.replace(',', '').str.replace('"', '')
                pop_df['인구'] = pd.to_numeric(pop_df['인구'], errors='coerce')
            print(f"   ✅ '인구' 컬럼을 숫자로 변환 완료")
        
        print(f"   ✅ 최종 전처리 완료: {len(pop_df)} 행, 컬럼: {list(pop_df.columns)}")
        
        # CCTV 데이터 전처리
        print(f"\n[3/6] CCTV 데이터 전처리 중...")
        # 기관명 컬럼 정리 (따옴표 제거)
        if '기관명' in cctv_df.columns:
            cctv_df['기관명'] = cctv_df['기관명'].str.strip().str.replace('"', '')
        
        # 연도별 컬럼 제거 (2013년도 이전, 2014년, 2015년, 2016년)
        columns_to_drop_cctv = []
        for col in cctv_df.columns:
            if col in ['2013년도 이전', '2014년', '2015년', '2016년']:
                columns_to_drop_cctv.append(col)
        
        if columns_to_drop_cctv:
            cctv_df = cctv_df.drop(columns=columns_to_drop_cctv, axis=1)
            print(f"   ✅ 연도별 컬럼 제거 완료: {columns_to_drop_cctv}")
        
        print(f"   ✅ 전처리 완료: {len(cctv_df)} 행, {len(cctv_df.columns)} 컬럼")
        print(f"   ✅ 남은 컬럼: {list(cctv_df.columns)}")
        
        # 머지 전 중복 컬럼 확인
        print(f"\n[4/6] CCTV-인구 데이터 머지 중...")
        print(f"   머지 키: cctv['기관명'] = pop['자치구']")
        
        logger.info(f"cctv 컬럼: {cctv_df.columns.tolist()}")
        logger.info(f"pop 컬럼: {pop_df.columns.tolist()}")
        
        # 중복되는 컬럼 확인 (키 컬럼 제외)
        cctv_cols = set(cctv_df.columns) - {'기관명'}
        pop_cols = set(pop_df.columns) - {'자치구'}
        duplicate_cols = cctv_cols & pop_cols
        
        if duplicate_cols:
            logger.warning(f"중복되는 컬럼이 발견되었습니다: {duplicate_cols}")
            logger.info("머지 시 suffixes를 사용하여 중복 컬럼을 구분합니다.")
        
        # 머지 실행
        merged_df = self.method.df_merge(
            left=cctv_df,
            right=pop_df,
            left_on='기관명',
            right_on='자치구',
            how='inner',
            remove_duplicate_columns=True
        )
        
        # 머지 후 "기관명"을 "자치구"로 변경 (통일된 컬럼명 사용)
        if '기관명' in merged_df.columns and '자치구' in merged_df.columns:
            # 값이 동일한지 확인
            if merged_df['기관명'].equals(merged_df['자치구']):
                # 기존 자치구 컬럼 제거 후 기관명을 자치구로 변경
                merged_df = merged_df.drop(columns=['자치구'])
                merged_df = merged_df.rename(columns={'기관명': '자치구'})
                print(f"\n   ✅ '기관명' 컬럼을 '자치구'로 변경됨 (기존 자치구 컬럼 제거)")
            else:
                # 값이 다르면 기존 자치구를 다른 이름으로 변경 후 기관명을 자치구로 변경
                merged_df = merged_df.rename(columns={'자치구': '자치구_원본', '기관명': '자치구'})
                print(f"\n   ⚠️  '기관명'을 '자치구'로 변경, 기존 '자치구'는 '자치구_원본'으로 변경됨")
        elif '기관명' in merged_df.columns:
            # 자치구 컬럼이 없으면 기관명을 자치구로 변경
            merged_df = merged_df.rename(columns={'기관명': '자치구'})
            print(f"\n   ✅ '기관명' 컬럼을 '자치구'로 변경됨")
        
        logger.info(f"머지 완료: cctv_pop shape = {merged_df.shape}")
        logger.info(f"cctv_pop 컬럼: {merged_df.columns.tolist()}")
        logger.info(f"cctv_pop 탑:\n{merged_df.head(1).to_string()}")
        
        # 범죄 데이터 전처리: 경찰서 관서명으로 주소 검색하여 자치구 추출
        print(f"\n[5/6] 경찰서 주소 검색 및 자치구 추출 중...")
        
        # '자치구' 컬럼이 이미 있으면 스킵, 없으면 경찰서 주소 검색
        if '자치구' not in crime_df.columns or crime_df['자치구'].isna().all():
            logger.info("경찰서 관서명으로 주소 검색 시작...")
            
            # 경찰서 관서명 리스트 생성
            station_names_raw = []
            if '관서명' in crime_df.columns:
                for name in crime_df['관서명']:
                    if pd.notna(name) and str(name).strip():
                        station_names_raw.append(str(name).strip())
                    else:
                        station_names_raw.append('')
            else:
                logger.warning("'관서명' 컬럼이 없습니다. 자치구 추출을 건너뜁니다.")
                station_names_raw = [''] * len(crime_df)
            
            logger.info(f"경찰서 관서명 리스트: {station_names_raw[:5]}... (총 {len(station_names_raw)}개)")
            
            gu_names = []  # 자치구 리스트 초기화
            station_names_actual = []  # 실제 경찰서 이름 리스트 (place_name)
            
            # search_police_station 메서드를 사용하여 경찰서 검색 및 자치구 추출
            logger.info(f"총 {len([n for n in station_names_raw if n])}개 경찰서 주소 검색 중...")
            
            for idx, raw_name in enumerate(station_names_raw, 1):
                if not raw_name:
                    gu_names.append("")
                    station_names_actual.append("")
                    continue
                
                try:
                    # search_police_station 메서드 사용 (이미 자치구 추출 로직 포함)
                    search_result = self.search_police_station(raw_name)
                    
                    if search_result['status'] == 'success' and search_result.get('gu_name'):
                        gu_name = search_result['gu_name']
                        gu_names.append(gu_name)
                        
                        # 실제 경찰서 이름 추출 (place_name)
                        # search_police_station의 반환값 구조 확인
                        place_name = ''
                        if 'place_info' in search_result and search_result['place_info']:
                            place_name = search_result['place_info'].get('place_name', '')
                        if not place_name and 'verification' in search_result and search_result['verification']:
                            place_name = search_result['verification'].get('place_name', '')
                        if not place_name:
                            # 원본 이름 유지
                            place_name = raw_name
                        
                        # 괄호 안의 텍스트 제거 (예: "(임시청사)", "(2025년 예정)")
                        place_name = self._clean_station_name(place_name)
                        
                        station_names_actual.append(place_name)
                        logger.info(f"[{idx}/{len(station_names_raw)}] '{raw_name}' -> 자치구: {gu_name}, 경찰서명: {place_name}")
                        logger.info(f"   주소: {search_result.get('address', 'N/A')}")
                    else:
                        logger.warning(f"[{idx}/{len(station_names_raw)}] '{raw_name}'에 대한 자치구를 찾을 수 없습니다.")
                        logger.warning(f"   상태: {search_result.get('status', 'N/A')}, 메시지: {search_result.get('message', 'N/A')}")
                        gu_names.append("")
                        station_names_actual.append(raw_name)  # 원본 이름 유지
                except Exception as e:
                    logger.error(f"[{idx}/{len(station_names_raw)}] '{raw_name}' 검색 중 오류 발생: {str(e)}")
                    gu_names.append("")
                    station_names_actual.append(raw_name)  # 원본 이름 유지
            
            logger.info(f"주소 검색 완료.")
            logger.info(f"추출된 자치구 리스트: {gu_names[:5]}... (총 {len([g for g in gu_names if g])}개)")
            logger.info(f"실제 경찰서명 리스트: {station_names_actual[:5]}... (총 {len([s for s in station_names_actual if s])}개)")
            
            # crime 데이터프레임에 자치구 컬럼 추가
            if len(gu_names) == len(crime_df):
                crime_df['자치구'] = gu_names
                logger.info("crime 데이터프레임에 '자치구' 컬럼이 추가되었습니다.")
            else:
                logger.warning(f"자치구 리스트 길이({len(gu_names)})와 crime 데이터 길이({len(crime_df)})가 일치하지 않습니다.")
                # 길이가 다르더라도 가능한 만큼만 추가
                crime_df['자치구'] = gu_names[:len(crime_df)] if len(gu_names) > len(crime_df) else gu_names + [''] * (len(crime_df) - len(gu_names))
            
            # crime 데이터프레임에 실제 경찰서명으로 관서명 업데이트
            if len(station_names_actual) == len(crime_df):
                if '관서명' in crime_df.columns:
                    crime_df['관서명'] = station_names_actual
                    logger.info("crime 데이터프레임의 '관서명' 컬럼이 실제 경찰서명으로 업데이트되었습니다.")
                else:
                    crime_df['관서명'] = station_names_actual
                    logger.info("crime 데이터프레임에 '관서명' 컬럼이 추가되었습니다.")
            else:
                logger.warning(f"경찰서명 리스트 길이({len(station_names_actual)})와 crime 데이터 길이({len(crime_df)})가 일치하지 않습니다.")
                # 길이가 다르더라도 가능한 만큼만 추가
                station_names_final = station_names_actual[:len(crime_df)] if len(station_names_actual) > len(crime_df) else station_names_actual + [''] * (len(crime_df) - len(station_names_actual))
                if '관서명' in crime_df.columns:
                    crime_df['관서명'] = station_names_final
                else:
                    crime_df['관서명'] = station_names_final
            
            logger.info("카카오맵 경찰서 검색 및 자치구 추출 완료")
        else:
            # '구' 컬럼이 있으면 '자치구'로 이름 변경
            if '구' in crime_df.columns and '자치구' not in crime_df.columns:
                crime_df = crime_df.rename(columns={'구': '자치구'})
                logger.info("'구' 컬럼을 '자치구'로 변경했습니다.")
            logger.info("'자치구' 컬럼이 이미 존재합니다. 주소 검색을 건너뜁니다.")
            
            # 관서명이 없거나 원본 관서명이 있으면 검색으로 업데이트
            if '관서명' not in crime_df.columns or crime_df['관서명'].isna().any() or (crime_df['관서명'] == '').any():
                logger.info("관서명 컬럼이 없거나 비어있습니다. 경찰서 검색으로 업데이트 중...")
                
                # 관서명이 없으면 원본 관서명 컬럼 확인
                if '관서명' not in crime_df.columns:
                    # 원본 관서명 컬럼 찾기
                    original_station_col = None
                    for col in crime_df.columns:
                        if '관서' in col or '서' in col:
                            original_station_col = col
                            break
                    
                    if original_station_col:
                        station_names_raw = crime_df[original_station_col].tolist()
                    else:
                        logger.warning("관서명 관련 컬럼을 찾을 수 없습니다.")
                        station_names_raw = [''] * len(crime_df)
                else:
                    station_names_raw = crime_df['관서명'].tolist()
                
                # 경찰서 검색으로 실제 경찰서명 업데이트
                station_names_actual = []
                for idx, raw_name in enumerate(station_names_raw):
                    if pd.notna(raw_name) and str(raw_name).strip():
                        try:
                            search_result = self.search_police_station(str(raw_name).strip())
                            if search_result['status'] == 'success':
                                place_name = ''
                                if 'place_info' in search_result and search_result['place_info']:
                                    place_name = search_result['place_info'].get('place_name', '')
                                if not place_name and 'verification' in search_result and search_result['verification']:
                                    place_name = search_result['verification'].get('place_name', '')
                                if not place_name:
                                    place_name = str(raw_name).strip()
                                
                                # 괄호 안의 텍스트 제거 (예: "(임시청사)", "(2025년 예정)")
                                place_name = self._clean_station_name(place_name)
                                
                                station_names_actual.append(place_name)
                            else:
                                station_names_actual.append(str(raw_name).strip())
                        except Exception as e:
                            logger.error(f"   [{idx}] '{raw_name}' 검색 중 오류: {str(e)}")
                            station_names_actual.append(str(raw_name).strip())
                    else:
                        station_names_actual.append('')
                
                # 관서명 컬럼 업데이트
                if len(station_names_actual) == len(crime_df):
                    crime_df['관서명'] = station_names_actual
                    logger.info("관서명 컬럼이 실제 경찰서명으로 업데이트되었습니다.")
            
            # 자치구가 비어있는 행이 있으면 검색으로 채우기
            if crime_df['자치구'].isna().any() or (crime_df['자치구'] == '').any():
                empty_indices = crime_df[(crime_df['자치구'].isna()) | (crime_df['자치구'] == '')].index
                logger.info(f"자치구가 비어있는 행 {len(empty_indices)}개 발견. 검색으로 채우는 중...")
                
                if '관서명' in crime_df.columns:
                    for idx in empty_indices:
                        raw_name = crime_df.loc[idx, '관서명']
                        if pd.notna(raw_name) and str(raw_name).strip():
                            try:
                                search_result = self.search_police_station(str(raw_name).strip())
                                if search_result['status'] == 'success' and search_result.get('gu_name'):
                                    crime_df.loc[idx, '자치구'] = search_result['gu_name']
                                    logger.info(f"   [{idx}] '{raw_name}' -> 자치구: {search_result['gu_name']}")
                            except Exception as e:
                                logger.error(f"   [{idx}] '{raw_name}' 검색 중 오류: {str(e)}")
        
        # 범죄 데이터 전처리: 자치구별로 집계 (같은 구에 여러 경찰서가 있을 수 있음)
        print(f"\n[6/6] 범죄 데이터 자치구별 집계 중...")
        print(f"   원본 범죄 데이터: {len(crime_df)} 행 (경찰서별)")
        
        # 숫자 컬럼만 선택 (자치구, 구, 관서명 제외)
        numeric_cols = [col for col in crime_df.columns if col not in ['자치구', '구', '관서명']]
        
        # 숫자 문자열에서 콤마 제거 및 숫자 변환
        crime_df_processed = crime_df.copy()
        for col in numeric_cols:
            if crime_df_processed[col].dtype == 'object':
                crime_df_processed[col] = crime_df_processed[col].astype(str).str.replace(',', '').str.replace('"', '')
                crime_df_processed[col] = pd.to_numeric(crime_df_processed[col], errors='coerce')
        
        # 자치구별로 집계 (합계) - '자치구' 컬럼 사용
        groupby_col = '자치구' if '자치구' in crime_df_processed.columns else '구'
        
        # 숫자 컬럼은 합계, 관서명은 첫 번째 값 선택
        agg_dict = {col: 'sum' for col in numeric_cols}
        if '관서명' in crime_df_processed.columns:
            agg_dict['관서명'] = 'first'  # 같은 구의 첫 번째 관서명 선택
        
        crime_by_gu = crime_df_processed.groupby(groupby_col).agg(agg_dict).reset_index()
        
        # '구' 컬럼이 있으면 '자치구'로 이름 변경
        if '구' in crime_by_gu.columns and '자치구' not in crime_by_gu.columns:
            crime_by_gu = crime_by_gu.rename(columns={'구': '자치구'})
        
        print(f"   ✅ 집계 완료: {len(crime_by_gu)} 행 (자치구별)")
        print(f"   집계된 자치구: {list(crime_by_gu['자치구'].values)}")
        
        # CCTV-인구 머지 결과와 범죄 데이터 머지
        print(f"\n[7/7] CCTV-인구-범죄 데이터 머지 중...")
        print(f"   머지 키: merged_df['자치구'] = crime_by_gu['자치구']")
        
        # merged_df의 '자치구'와 범죄 데이터의 '자치구'를 기준으로 머지
        final_merged_df = self.method.df_merge(
            left=merged_df,
            right=crime_by_gu,
            left_on='자치구',
            right_on='자치구',
            how='inner',
            remove_duplicate_columns=True
        )
        
        # 최종 피처 순서 정리 및 불필요한 컬럼 드롭
        # 요청된 순서: 자치구, 관서명, 소계, 인구, 살인 발생, 살인 검거, 강도 발생, 강도 검거, 강간 발생, 강간 검거, 절도 발생, 절도 검거, 폭력 발생, 폭력 검거
        desired_columns = [
            '자치구',
            '관서명',  # 경찰서명 추가
            '소계',  # CCTV 소계
            '인구',
            '살인 발생',
            '살인 검거',
            '강도 발생',
            '강도 검거',
            '강간 발생',
            '강간 검거',
            '절도 발생',
            '절도 검거',
            '폭력 발생',
            '폭력 검거'
        ]
        
        # 존재하는 컬럼만 선택 (드롭: desired_columns에 없는 컬럼은 제거)
        available_columns = [col for col in desired_columns if col in final_merged_df.columns]
        
        # 최종 컬럼만 선택 (불필요한 컬럼 드롭)
        final_merged_df = final_merged_df[available_columns]
        
        print(f"\n   ✅ 최종 피처 순서 정리 완료")
        print(f"   선택된 컬럼 ({len(available_columns)}개): {available_columns}")
        
        # 드롭된 컬럼 확인 (디버깅용)
        dropped_columns = [col for col in final_merged_df.columns if col not in available_columns] if len(final_merged_df) > 0 else []
        if dropped_columns:
            print(f"   ⚠️  드롭된 컬럼: {dropped_columns}")
        
        # 같은 구를 가진 행들의 통계 합치기 (자치구별 집계)
        print(f"\n[8/8] 같은 구를 가진 행들의 통계 합치기 중...")
        print(f"   집계 전: {len(final_merged_df)} 행")
        
        # 자치구별로 중복 확인
        duplicate_gu = final_merged_df[final_merged_df.duplicated(subset=['자치구'], keep=False)]
        if len(duplicate_gu) > 0:
            print(f"   ⚠️  중복된 자치구 발견: {len(duplicate_gu)} 행")
            print(f"   중복된 자치구 목록: {duplicate_gu['자치구'].unique().tolist()}")
            
            # 숫자 컬럼과 문자열 컬럼 구분
            numeric_cols = []
            string_cols = []
            
            for col in final_merged_df.columns:
                if col == '자치구':
                    continue
                # 숫자 컬럼인지 확인 (dtype 체크 및 숫자로 변환 가능한지 확인)
                is_numeric = False
                if pd.api.types.is_numeric_dtype(final_merged_df[col]):
                    is_numeric = True
                else:
                    # 문자열이지만 숫자로 변환 가능한지 확인
                    try:
                        pd.to_numeric(final_merged_df[col], errors='raise')
                        is_numeric = True
                    except (ValueError, TypeError):
                        is_numeric = False
                
                if is_numeric:
                    numeric_cols.append(col)
                else:
                    string_cols.append(col)
            
            # 집계 전에 숫자 컬럼을 숫자 타입으로 변환 (문자열로 저장된 숫자 처리)
            for col in numeric_cols:
                if not pd.api.types.is_numeric_dtype(final_merged_df[col]):
                    # 문자열에서 콤마 제거 및 숫자 변환
                    final_merged_df[col] = final_merged_df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    final_merged_df[col] = pd.to_numeric(final_merged_df[col], errors='coerce')
            
            # 집계 딕셔너리 생성
            agg_dict = {}
            # 숫자 컬럼은 합계
            for col in numeric_cols:
                agg_dict[col] = 'sum'
            # 문자열 컬럼은 첫 번째 값 (관서명 등)
            for col in string_cols:
                agg_dict[col] = 'first'
            
            # 자치구별로 집계
            final_merged_df = final_merged_df.groupby('자치구', as_index=False).agg(agg_dict)
            
            print(f"   ✅ 집계 완료: {len(final_merged_df)} 행 (자치구별)")
            print(f"   집계된 자치구: {list(final_merged_df['자치구'].values)}")
        else:
            print(f"   ✅ 중복된 자치구 없음 (이미 고유함)")
        
        self.merged_df = final_merged_df
        
        # 최종 머지된 데이터프레임을 CSV로 저장
        save_dir = Path(__file__).parent / "save"  # save 폴더 경로
        merged_csv_path = save_dir / "merged_data.csv"
        try:
            final_merged_df.to_csv(merged_csv_path, index=False, encoding='utf-8-sig')
            logger.info(f"최종 머지된 데이터 CSV 저장 완료: {merged_csv_path}")
            print(f"\n   ✅ 최종 머지된 데이터 CSV 저장 완료: {merged_csv_path}")
            print(f"   저장된 행 수: {len(final_merged_df)} 행, 컬럼 수: {len(final_merged_df.columns)} 개")
        except Exception as e:
            logger.error(f"최종 머지된 데이터 CSV 저장 중 오류 발생: {str(e)}")
            print(f"\n   ⚠️  최종 머지된 데이터 CSV 저장 중 오류: {str(e)}")
        
        print(f"\n" + "="*60)
        print(f"전처리 완료!")
        print(f"   - CCTV: {len(cctv_df)} 행")
        print(f"   - 범죄: {len(crime_df)} 행 (경찰서별) → {len(crime_by_gu)} 행 (자치구별 집계)")
        print(f"   - 인구: {len(pop_df)} 행")
        print(f"   - 최종 머지 및 집계: {len(final_merged_df)} 행 (자치구별 고유), {len(final_merged_df.columns)} 컬럼")
        print(f"\n최종 머지된 컬럼:")
        for i, col in enumerate(final_merged_df.columns, 1):
            print(f"   {i:2d}. {col}")
        print("="*60 + "\n")
        
        return cctv_df, crime_df, pop_df, final_merged_df
    
    def search_police_station(self, station_name: str) -> Dict[str, Any]:
        """
        경찰서 이름으로 주소 및 좌표 검색
        
        Args:
            station_name: 경찰서 이름 (예: "중부서", "서울중부경찰서", "중부경찰서")
        
        Returns:
            검색 결과 딕셔너리 (주소, 좌표, 자치구 포함)
        """
        from app.seoul_crime.kakao_map_singleton import KakaoMapSingleton
        
        kakao = KakaoMapSingleton()
        
        # station_name이 비어있으면 에러 반환
        if not station_name or not station_name.strip():
            return {
                "status": "error",
                "station_name": station_name,
                "message": "경찰서 이름이 제공되지 않았습니다.",
                "example": "사용 예: 중부서, 서울중부경찰서, 중부경찰서"
            }
        
        station_name = station_name.strip()
        
        # 경찰서 이름 형식 변환
        # 핵심 로직: 검색어에 "서"가 붙으면 그게 "경찰서"를 의미함
        # 예: "중부서" = "중부 경찰서" → "서울" + "중부" + "경찰서" = "서울중부경찰서"
        
        # 검색어에서 "서" 제거 (관서명 형식: "서" = "경찰서"를 의미)
        base_name = station_name
        if base_name.endswith('서') and len(base_name) > 1 and not base_name.endswith('경찰서'):
            # "중부서" → "서"는 "경찰서"를 의미하므로 제거하고 나중에 "경찰서"를 붙임
            base_name = base_name[:-1]  # "중부서" -> "중부"
        
        # "서울"이 이미 있으면 제거
        if base_name.startswith('서울'):
            base_name = base_name[2:]  # "서울중부" -> "중부"
        
        # "경찰서"가 이미 있으면 제거
        if base_name.endswith('경찰서'):
            base_name = base_name[:-3]  # "중부경찰서" -> "중부"
        
        # 최종 검색어: "서울" + base_name + "경찰서"
        # ("서"는 이미 "경찰서"를 의미했으므로 "경찰서"로 변환)
        search_name = f'서울{base_name}경찰서'
        search_names = [search_name]
        
        logger.info(f"검색어 변환: '{station_name}' -> '{search_name}' (서=경찰서 의미)")
        
        logger.info(f"경찰서 검색어 변환: '{station_name}' -> {search_names}")
        
        try:
            # 경찰서 검색은 search_keyword를 우선 사용 (장소 검색이 더 정확함)
            result = None
            used_search_name = None
            
            # "경찰서"가 포함된 검색어를 우선 시도
            priority_search_names = [name for name in search_names if '경찰서' in name]
            if not priority_search_names:
                priority_search_names = search_names
            
            # 경찰서 검색어로 우선 시도
            for search_name in priority_search_names:
                logger.info(f"   🔍 경찰서 검색 시도: '{search_name}' (search_keyword)")
                # search_keyword로 경찰서 검색 (장소 검색)
                result = kakao.search_keyword(search_name, size=5)  # 여러 결과 확인
                
                if result and result.get('documents') and len(result['documents']) > 0:
                    logger.info(f"   📋 검색 결과 {len(result['documents'])}개 발견")
                    # 경찰서인지 확인
                    found_police_station = False
                    for idx, doc in enumerate(result['documents']):
                        place_name = doc.get('place_name', '')
                        category_name = doc.get('category_name', '')
                        
                        logger.info(f"   [{idx+1}] place_name: {place_name}, category_name: {category_name}")
                        
                        # 경찰서인지 확인
                        if '경찰서' in place_name or '경찰서' in category_name or '경찰' in place_name:
                            # 경찰서를 찾았으면 사용
                            result['documents'] = [doc]  # 첫 번째 경찰서만 사용
                            used_search_name = search_name
                            logger.info(f"   ✅ 경찰서 찾음: {place_name}")
                            found_police_station = True
                            break
                    
                    if not found_police_station:
                        logger.warning(f"   ⚠️  검색 결과는 있지만 경찰서가 아닙니다. (검색어: '{search_name}')")
                    
                    if used_search_name:
                        break
                else:
                    logger.warning(f"   ⚠️  검색 결과 없음 (검색어: '{search_name}')")
            
            # 경찰서를 찾지 못했으면 나머지 검색어로 시도
            if not used_search_name:
                for search_name in search_names:
                    if search_name in priority_search_names:
                        continue  # 이미 시도한 검색어는 스킵
                    
                    logger.info(f"   🔍 추가 검색 시도: '{search_name}' (search_keyword)")
                    result = kakao.search_keyword(search_name, size=5)
                    
                    if result and result.get('documents') and len(result['documents']) > 0:
                        logger.info(f"   📋 검색 결과 {len(result['documents'])}개 발견")
                        # 경찰서인지 확인
                        found_police_station = False
                        for idx, doc in enumerate(result['documents']):
                            place_name = doc.get('place_name', '')
                            category_name = doc.get('category_name', '')
                            
                            logger.info(f"   [{idx+1}] place_name: {place_name}, category_name: {category_name}")
                            
                            if '경찰서' in place_name or '경찰서' in category_name or '경찰' in place_name:
                                result['documents'] = [doc]
                                used_search_name = search_name
                                logger.info(f"   ✅ 경찰서 찾음: {place_name}")
                                found_police_station = True
                                break
                        
                        if not found_police_station:
                            logger.warning(f"   ⚠️  검색 결과는 있지만 경찰서가 아닙니다. (검색어: '{search_name}')")
                        
                        if used_search_name:
                            break
                    else:
                        logger.warning(f"   ⚠️  검색 결과 없음 (검색어: '{search_name}')")
            
            if not result or not result.get('documents') or len(result['documents']) == 0:
                # 모든 검색어로 시도했지만 결과가 없음
                logger.warning(f"경찰서 검색 실패: '{station_name}' -> 검색어: {search_names}")
                logger.warning(f"API 응답: {result if result else 'None'}")
                return {
                    "status": "not_found",
                    "station_name": station_name,
                    "tried_search_names": search_names,
                    "message": "경찰서를 찾을 수 없습니다. 다른 검색어를 시도해보세요.",
                    "suggestions": [
                        "관서명 형식: 중부서, 종로서, 남대문서",
                        "전체 이름: 서울중부경찰서, 서울종로경찰서",
                        "약식: 중부경찰서, 종로경찰서"
                    ],
                    "full_response": result if result else {"documents": [], "meta": {"total_count": 0}},
                    "debug": {
                        "generated_search_name": search_name if 'search_name' in locals() else None,
                        "all_search_names": search_names
                    }
                }
            
            # 결과 처리
            doc = result['documents'][0]
            
            # search_keyword 응답 형식 처리
            if 'place_name' in doc:
                # search_keyword 응답
                address = doc.get('address', {})
                road_address = doc.get('road_address', {})
                
                # 주소 추출 (도로명 주소 우선, 없으면 지번 주소)
                if road_address:
                    formatted_addr = road_address.get('address_name', '')
                    region_2depth = road_address.get('region_2depth_name', '')
                    x = float(doc.get('x', 0.0))
                    y = float(doc.get('y', 0.0))
                elif address:
                    formatted_addr = address.get('address_name', '')
                    region_2depth = address.get('region_2depth_name', '')
                    x = float(doc.get('x', 0.0))
                    y = float(doc.get('y', 0.0))
                else:
                    formatted_addr = doc.get('address_name', '')
                    region_2depth = ''
                    x = float(doc.get('x', 0.0))
                    y = float(doc.get('y', 0.0))
            else:
                # geocode 응답
                address = doc.get('address', {})
                road_address = doc.get('road_address', {})
                
                # 주소 추출 (도로명 주소 우선, 없으면 지번 주소)
                if road_address:
                    formatted_addr = road_address.get('address_name', '')
                    region_2depth = road_address.get('region_2depth_name', '')
                    x = float(road_address.get('x', 0.0))
                    y = float(road_address.get('y', 0.0))
                elif address:
                    formatted_addr = address.get('address_name', '')
                    region_2depth = address.get('region_2depth_name', '')
                    x = float(address.get('x', 0.0))
                    y = float(address.get('y', 0.0))
                else:
                    formatted_addr = doc.get('address_name', '')
                    region_2depth = ''
                    x = 0.0
                    y = 0.0
            
            # 자치구 추출 (여러 방법 시도)
            gu_name = None
            extraction_method = None
            
            # 방법 1: region_2depth_name에서 추출 (예: "서울특별시 중구" -> "중구")
            if region_2depth:
                parts = region_2depth.split()
                for part in parts:
                    if part.endswith('구'):
                        gu_name = part
                        extraction_method = "region_2depth_name"
                        logger.info(f"   ✅ 자치구 추출 (region_2depth_name): {gu_name} from '{region_2depth}'")
                        break
            
            # 방법 2: 주소 문자열에서 직접 추출 (백업 방법)
            if not gu_name and formatted_addr:
                addr_parts = formatted_addr.split()
                for part in addr_parts:
                    if part.endswith('구'):
                        gu_name = part
                        extraction_method = "address_string"
                        logger.info(f"   ✅ 자치구 추출 (address_string): {gu_name} from '{formatted_addr}'")
                        break
            
            # 방법 3: region_3depth_name에서 추출 (예: "종로구"가 region_3depth에 있을 수 있음)
            if not gu_name:
                if road_address:
                    region_3depth = road_address.get('region_3depth_name', '')
                    if region_3depth and region_3depth.endswith('구'):
                        gu_name = region_3depth
                        extraction_method = "road_address_region_3depth"
                        logger.info(f"   ✅ 자치구 추출 (road_address_region_3depth): {gu_name}")
                elif address:
                    region_3depth = address.get('region_3depth_name', '')
                    if region_3depth and region_3depth.endswith('구'):
                        gu_name = region_3depth
                        extraction_method = "address_region_3depth"
                        logger.info(f"   ✅ 자치구 추출 (address_region_3depth): {gu_name}")
            
            if not gu_name:
                logger.warning(f"   ⚠️  자치구를 추출할 수 없습니다.")
                logger.warning(f"   주소 정보: {formatted_addr}")
                logger.warning(f"   region_2depth: {region_2depth}")
                if road_address:
                    logger.warning(f"   road_address: {road_address}")
                if address:
                    logger.warning(f"   address: {address}")
            
            # 경찰서 검증 (place_name, category_name 확인)
            place_name = doc.get('place_name', '') if 'place_name' in doc else ''
            category_name = doc.get('category_name', '') if 'category_name' in doc else ''
            category_group_name = doc.get('category_group_name', '') if 'category_group_name' in doc else ''
            
            # 경찰서인지 확인
            is_police_station = False
            verification_reason = []
            
            if place_name:
                # place_name에 "경찰서" 또는 "경찰"이 포함되어 있는지 확인
                if '경찰서' in place_name or '경찰' in place_name:
                    is_police_station = True
                    verification_reason.append(f"place_name에 '경찰서' 포함: {place_name}")
            
            if category_name:
                # category_name에 "경찰서" 또는 "경찰"이 포함되어 있는지 확인
                if '경찰서' in category_name or '경찰' in category_name:
                    is_police_station = True
                    verification_reason.append(f"category_name에 '경찰서' 포함: {category_name}")
            
            if category_group_name:
                # category_group_name이 "공공기관"이고 category_name에 "경찰"이 있는지 확인
                if '공공기관' in category_group_name and ('경찰' in category_name or '경찰' in place_name):
                    is_police_station = True
                    verification_reason.append(f"공공기관 카테고리: {category_group_name}")
            
            if not is_police_station:
                verification_reason.append("⚠️ 경찰서로 확인되지 않음 - place_name이나 category_name에 '경찰서'가 없습니다.")
            
            return {
                "status": "success",
                "station_name": station_name,
                "search_name": used_search_name,
                "is_police_station": is_police_station,  # 경찰서 여부
                "verification": {
                    "verified": is_police_station,
                    "reason": verification_reason,
                    "place_name": place_name,
                    "category_name": category_name,
                    "category_group_name": category_group_name
                },
                "address": formatted_addr,  # 경찰서 주소 (도로명 주소 우선, 없으면 지번 주소)
                "road_address": road_address.get('address_name', '') if road_address else None,  # 도로명 주소
                "address_detail": address.get('address_name', '') if address else None,  # 지번 주소
                "region_2depth_name": region_2depth,  # 시/구 정보 (예: "서울특별시 중구")
                "gu_name": gu_name,  # 자치구 이름 (예: "중구") - 주소에서 추출됨
                "gu_extraction_method": extraction_method,  # 자치구 추출 방법
                "gu_extraction_info": {
                    "from_region_2depth": region_2depth if region_2depth else None,
                    "from_address": formatted_addr if formatted_addr else None,
                    "extraction_method": extraction_method
                },
                "coordinates": {
                    "longitude": x,  # 경도 (X 좌표)
                    "latitude": y,   # 위도 (Y 좌표)
                    "x": x,
                    "y": y
                },
                "place_info": {
                    "place_name": place_name,
                    "category_name": category_name,
                    "category_group_name": category_group_name,
                    "phone": doc.get('phone', '') if 'phone' in doc else None
                },
                "full_response": doc  # 카카오맵 API 전체 응답
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "station_name": station_name,
                "tried_search_names": search_names,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
