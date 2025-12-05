"""
Diary Emotion Monitor
일기 감정 분류 서비스 모니터링 클래스
"""

from typing import Dict, Optional, Any
from datetime import datetime
import pandas as pd
from pathlib import Path


class DiaryEmotionMonitor:
    """일기 감정 분류 서비스 모니터링"""
    
    def __init__(self):
        """초기화"""
        self.start_time = datetime.now()
        self.request_count = 0
        self.train_count = 0
        self.predict_count = 0
        self.error_count = 0
        self.last_train_time: Optional[datetime] = None
        self.last_error: Optional[str] = None
    
    def increment_request(self):
        """요청 수 증가"""
        self.request_count += 1
    
    def increment_train(self):
        """학습 수 증가"""
        self.train_count += 1
        self.last_train_time = datetime.now()
    
    def increment_predict(self):
        """예측 수 증가"""
        self.predict_count += 1
    
    def increment_error(self, error_message: str = ""):
        """에러 수 증가"""
        self.error_count += 1
        self.last_error = error_message
    
    def get_uptime(self) -> str:
        """서비스 가동 시간"""
        uptime = datetime.now() - self.start_time
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{days}d {hours}h {minutes}m {seconds}s"
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 정보"""
        return {
            "uptime": self.get_uptime(),
            "start_time": self.start_time.isoformat(),
            "request_count": self.request_count,
            "train_count": self.train_count,
            "predict_count": self.predict_count,
            "error_count": self.error_count,
            "last_train_time": self.last_train_time.isoformat() if self.last_train_time else None,
            "last_error": self.last_error
        }


# 전역 모니터 인스턴스
_monitor = DiaryEmotionMonitor()


def get_monitor() -> DiaryEmotionMonitor:
    """모니터 인스턴스 반환"""
    return _monitor

