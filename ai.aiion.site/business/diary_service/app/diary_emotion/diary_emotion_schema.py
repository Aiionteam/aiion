"""
Diary Emotion Schema
일기 감정 분류 스키마 클래스 - 게터와 세터 포함
"""

from typing import Optional


class DiaryEmotionSchema:
    """일기 감정 분류 스키마 클래스 - 게터/세터 포함"""
    
    def __init__(
        self,
        id: int = 0,
        localdate: str = "",
        title: str = "",
        content: str = "",
        user_id: int = 0,
        emotion: int = 0
    ):
        """초기화"""
        self._id = id
        self._localdate = localdate
        self._title = title
        self._content = content
        self._user_id = user_id
        self._emotion = emotion
    
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
        if not isinstance(value, str):
            raise ValueError("localdate는 문자열이어야 합니다.")
        self._localdate = value
    
    # title 프로퍼티
    @property
    def title(self) -> str:
        """Title 게터"""
        return self._title
    
    @title.setter
    def title(self, value: str):
        """Title 세터"""
        if not isinstance(value, str):
            raise ValueError("title은 문자열이어야 합니다.")
        self._title = value
    
    # content 프로퍼티
    @property
    def content(self) -> str:
        """Content 게터"""
        return self._content
    
    @content.setter
    def content(self, value: str):
        """Content 세터"""
        if not isinstance(value, str):
            raise ValueError("content는 문자열이어야 합니다.")
        self._content = value
    
    # userId 프로퍼티
    @property
    def user_id(self) -> int:
        """UserId 게터"""
        return self._user_id
    
    @user_id.setter
    def user_id(self, value: int):
        """UserId 세터"""
        if not isinstance(value, int) or value < 0:
            raise ValueError("userId는 0 이상의 정수여야 합니다.")
        self._user_id = value
    
    # emotion 프로퍼티 (라벨: 0=평가불가, 1=기쁨, 2=슬픔, 3=분노, 4=두려움, 5=혐오, 6=놀람, 7=신뢰, 8=기대, 9=불안, 10=안도, 11=후회, 12=그리움, 13=감사, 14=외로움)
    @property
    def emotion(self) -> int:
        """Emotion 게터 (0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람, 7: 신뢰, 8: 기대, 9: 불안, 10: 안도, 11: 후회, 12: 그리움, 13: 감사, 14: 외로움)"""
        return self._emotion
    
    @emotion.setter
    def emotion(self, value: int):
        """Emotion 세터"""
        if value not in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]:
            raise ValueError("emotion은 0(평가불가), 1(기쁨), 2(슬픔), 3(분노), 4(두려움), 5(혐오), 6(놀람), 7(신뢰), 8(기대), 9(불안), 10(안도), 11(후회), 12(그리움), 13(감사), 14(외로움)이어야 합니다.")
        self._emotion = value
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "localdate": self.localdate,
            "title": self.title,
            "content": self.content,
            "userId": self.user_id,
            "emotion": self.emotion
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'DiaryEmotionSchema':
        """딕셔너리에서 객체 생성"""
        return cls(
            id=int(data.get("id", 0)),
            localdate=data.get("localdate", ""),
            title=data.get("title", ""),
            content=data.get("content", ""),
            user_id=int(data.get("userId", 0)),
            emotion=int(data.get("emotion", 0))
        )
    
    def __repr__(self) -> str:
        """문자열 표현"""
        emotion_label = {
            0: "평가불가", 1: "기쁨", 2: "슬픔", 3: "분노", 4: "두려움", 5: "혐오", 6: "놀람",
            7: "신뢰", 8: "기대", 9: "불안", 10: "안도", 11: "후회", 12: "그리움", 13: "감사", 14: "외로움"
        }.get(self.emotion, "알 수 없음")
        return (
            f"DiaryEmotionSchema("
            f"id={self.id}, "
            f"title='{self.title}', "
            f"emotion={self.emotion}({emotion_label}))"
        )
    
    def __str__(self) -> str:
        """사용자 친화적 문자열 표현"""
        emotion_label = {
            0: "평가불가", 1: "기쁨", 2: "슬픔", 3: "분노", 4: "두려움", 5: "혐오", 6: "놀람",
            7: "신뢰", 8: "기대", 9: "불안", 10: "안도", 11: "후회", 12: "그리움", 13: "감사", 14: "외로움"
        }.get(self.emotion, "알 수 없음")
        return (
            f"일기 ID: {self.id}\n"
            f"날짜: {self.localdate}\n"
            f"제목: {self.title}\n"
            f"내용: {self.content[:50]}...\n"
            f"사용자 ID: {self.user_id}\n"
            f"감정: {emotion_label} ({self.emotion})"
        )

