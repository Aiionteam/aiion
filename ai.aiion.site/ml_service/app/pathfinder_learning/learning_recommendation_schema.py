"""
Learning Recommendation Schema
학습 추천 스키마 클래스
"""

from typing import Optional, List, Dict


class LearningRecommendationSchema:
    """학습 추천 스키마 클래스"""
    
    def __init__(
        self,
        id: int = 0,
        user_id: str = "",
        diary_content: str = "",
        emotion: int = 0,
        behavior_patterns: str = "",
        behavior_frequency: str = "",
        mbti_type: str = "",
        mbti_confidence: float = 0.0,
        recommended_topic: str = "",
        recommendation_reason: str = "",
        recommendation_score: float = 0.0,
        learning_category: str = ""
    ):
        """초기화"""
        self._id = id
        self._user_id = user_id
        self._diary_content = diary_content
        self._emotion = emotion
        self._behavior_patterns = behavior_patterns
        self._behavior_frequency = behavior_frequency
        self._mbti_type = mbti_type
        self._mbti_confidence = mbti_confidence
        self._recommended_topic = recommended_topic
        self._recommendation_reason = recommendation_reason
        self._recommendation_score = recommendation_score
        self._learning_category = learning_category
    
    # 프로퍼티들
    @property
    def id(self) -> int:
        return self._id
    
    @id.setter
    def id(self, value: int):
        if not isinstance(value, int) or value < 0:
            raise ValueError("id는 0 이상의 정수여야 합니다.")
        self._id = value
    
    @property
    def user_id(self) -> str:
        return self._user_id
    
    @user_id.setter
    def user_id(self, value: str):
        self._user_id = str(value)
    
    @property
    def diary_content(self) -> str:
        return self._diary_content
    
    @diary_content.setter
    def diary_content(self, value: str):
        self._diary_content = str(value)
    
    @property
    def emotion(self) -> int:
        return self._emotion
    
    @emotion.setter
    def emotion(self, value: int):
        if value not in [0, 1, 2, 3, 4, 5, 6]:
            raise ValueError("emotion은 0-6 사이의 정수여야 합니다.")
        self._emotion = value
    
    @property
    def recommended_topic(self) -> str:
        return self._recommended_topic
    
    @recommended_topic.setter
    def recommended_topic(self, value: str):
        self._recommended_topic = str(value)
    
    @property
    def recommendation_score(self) -> float:
        return self._recommendation_score
    
    @recommendation_score.setter
    def recommendation_score(self, value: float):
        if not 0.0 <= value <= 1.0:
            raise ValueError("recommendation_score는 0.0-1.0 사이의 값이어야 합니다.")
        self._recommendation_score = value
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "diary_content": self.diary_content,
            "emotion": self.emotion,
            "behavior_patterns": self._behavior_patterns,
            "behavior_frequency": self._behavior_frequency,
            "mbti_type": self._mbti_type,
            "mbti_confidence": self._mbti_confidence,
            "recommended_topic": self.recommended_topic,
            "recommendation_reason": self._recommendation_reason,
            "recommendation_score": self.recommendation_score,
            "learning_category": self._learning_category
        }

