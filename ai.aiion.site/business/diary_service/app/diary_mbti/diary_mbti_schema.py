"""
Diary MBTI Schema
일기 MBTI 분류 스키마 클래스 - 게터와 세터 포함
"""

from typing import Optional


class DiaryMbtiSchema:
    """일기 MBTI 분류 스키마 클래스 - 게터/세터 포함"""
    
    def __init__(
        self,
        id: int = 0,
        localdate: str = "",
        title: str = "",
        content: str = "",
        user_id: int = 0,
        E_I: int = 0,
        S_N: int = 0,
        T_F: int = 0,
        J_P: int = 0
    ):
        """초기화"""
        self._id = id
        self._localdate = localdate
        self._title = title
        self._content = content
        self._user_id = user_id
        self._E_I = E_I
        self._S_N = S_N
        self._T_F = T_F
        self._J_P = J_P
    
    # id 프로퍼티
    @property
    def id(self) -> int:
        """ID 게터"""
        return self._id
    
    @id.setter
    def id(self, value: int):
        """ID 세터"""
        if not isinstance(value, int) or value < 0:
            raise ValueError("id는 0 이상의 정수여야 합니다.")
        self._id = value
    
    # localdate 프로퍼티
    @property
    def localdate(self) -> str:
        """Localdate 게터"""
        return self._localdate
    
    @localdate.setter
    def localdate(self, value: str):
        """Localdate 세터"""
        self._localdate = value
    
    # title 프로퍼티
    @property
    def title(self) -> str:
        """Title 게터"""
        return self._title
    
    @title.setter
    def title(self, value: str):
        """Title 세터"""
        self._title = value
    
    # content 프로퍼티
    @property
    def content(self) -> str:
        """Content 게터"""
        return self._content
    
    @content.setter
    def content(self, value: str):
        """Content 세터"""
        self._content = value
    
    # user_id 프로퍼티
    @property
    def user_id(self) -> int:
        """User ID 게터"""
        return self._user_id
    
    @user_id.setter
    def user_id(self, value: int):
        """User ID 세터"""
        if not isinstance(value, int) or value < 0:
            raise ValueError("user_id는 0 이상의 정수여야 합니다.")
        self._user_id = value
    
    # E_I 프로퍼티 (0=평가불가, 1=E, 2=I)
    @property
    def E_I(self) -> int:
        """E_I 게터"""
        return self._E_I
    
    @E_I.setter
    def E_I(self, value: int):
        """E_I 세터"""
        if value not in [0, 1, 2]:
            raise ValueError("E_I는 0(평가불가), 1(E), 또는 2(I)여야 합니다.")
        self._E_I = value
    
    # S_N 프로퍼티 (0=평가불가, 1=S, 2=N)
    @property
    def S_N(self) -> int:
        """S_N 게터"""
        return self._S_N
    
    @S_N.setter
    def S_N(self, value: int):
        """S_N 세터"""
        if value not in [0, 1, 2]:
            raise ValueError("S_N는 0(평가불가), 1(S), 또는 2(N)여야 합니다.")
        self._S_N = value
    
    # T_F 프로퍼티 (0=평가불가, 1=T, 2=F)
    @property
    def T_F(self) -> int:
        """T_F 게터"""
        return self._T_F
    
    @T_F.setter
    def T_F(self, value: int):
        """T_F 세터"""
        if value not in [0, 1, 2]:
            raise ValueError("T_F는 0(평가불가), 1(T), 또는 2(F)여야 합니다.")
        self._T_F = value
    
    # J_P 프로퍼티 (0=평가불가, 1=J, 2=P)
    @property
    def J_P(self) -> int:
        """J_P 게터"""
        return self._J_P
    
    @J_P.setter
    def J_P(self, value: int):
        """J_P 세터"""
        if value not in [0, 1, 2]:
            raise ValueError("J_P는 0(평가불가), 1(J), 또는 2(P)여야 합니다.")
        self._J_P = value

