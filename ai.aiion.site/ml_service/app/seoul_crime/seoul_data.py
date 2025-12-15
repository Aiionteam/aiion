from typing import Optional
from pathlib import Path
import pandas as pd


class SeoulCrimeData(object): 

    _fname: str = '' # file name
    _dname: str = '' # data path
    _sname: str = '' # save path
    _cctv: pd.DataFrame = None
    _crime: pd.DataFrame = None
    _pop: pd.DataFrame = None
    _id: str = ''     # 지도 러닝시 사용할 고유 식별자 비지도는 사용안함
    _label: str = ''  # 지도 러닝시 사용할 라벨 비지도는 사용안함

    def __init__(self):
        """초기화 - data 폴더의 절대 경로를 _dname으로 설정하고 CSV 파일들을 로드"""
        # 현재 파일의 위치를 기준으로 data 폴더 경로 계산
        # seoul_crime/seoul_data.py -> seoul_crime/data/
        data_dir = Path(__file__).parent / "data"
        self._dname = str(data_dir.resolve())  # 절대 경로로 변환
        
        # 각 CSV 파일 경로 설정
        cctv_path = data_dir / "cctv.csv"
        crime_path = data_dir / "crime.csv"
        pop_path = data_dir / "pop.csv"
        
        # CSV 파일들을 DataFrame으로 로드
        try:
            if cctv_path.exists():
                self._cctv = pd.read_csv(cctv_path, encoding='utf-8')
                print(f"✅ CCTV 데이터 로드 완료: {len(self._cctv)} 행")
            else:
                print(f"⚠️ CCTV 파일을 찾을 수 없습니다: {cctv_path}")
        except Exception as e:
            print(f"❌ CCTV 파일 로드 실패: {e}")
            self._cctv = None
        
        try:
            if crime_path.exists():
                self._crime = pd.read_csv(crime_path, encoding='utf-8')
                print(f"✅ 범죄 데이터 로드 완료: {len(self._crime)} 행")
            else:
                print(f"⚠️ 범죄 파일을 찾을 수 없습니다: {crime_path}")
        except Exception as e:
            print(f"❌ 범죄 파일 로드 실패: {e}")
            self._crime = None
        
        try:
            if pop_path.exists():
                self._pop = pd.read_csv(pop_path, encoding='utf-8')
                print(f"✅ 인구 데이터 로드 완료: {len(self._pop)} 행")
            else:
                print(f"⚠️ 인구 파일을 찾을 수 없습니다: {pop_path}")
        except Exception as e:
            print(f"❌ 인구 파일 로드 실패: {e}")
            self._pop = None


    @property
    def fname(self) -> str: return self._fname

    @fname.setter
    def fname(self, fname): self._fname = fname

    @property
    def dname(self) -> str: return self._dname

    @dname.setter
    def dname(self, dname): self._dname = dname

    @property
    def sname(self) -> str: return self._sname

    @sname.setter
    def sname(self, sname): self._sname = sname

    @property
    def cctv(self) -> Optional[pd.DataFrame]: return self._cctv

    @cctv.setter
    def cctv(self, cctv): self._cctv = cctv

    @property
    def crime(self) -> Optional[pd.DataFrame]: return self._crime

    @crime.setter
    def crime(self, crime): self._crime = crime

    @property
    def pop(self) -> Optional[pd.DataFrame]: return self._pop

    @pop.setter
    def pop(self, pop): self._pop = pop

    @property
    def id(self) -> str: return self._id

    @id.setter
    def id(self, id): self._id = id

    @property
    def label(self) -> str: return self._label

    @label.setter
    def label(self, label): self._label = label