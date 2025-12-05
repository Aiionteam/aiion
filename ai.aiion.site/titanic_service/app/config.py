"""
Titanic Service 설정
"""
import os
from pathlib import Path


class TitanicServiceConfig:
    """Titanic Service 설정 클래스"""
    
    def __init__(self):
        self.service_name = "Titanic Service"
        self.service_version = "1.0.0"
        self.port = int(os.getenv("PORT", "9003"))
        self.debug = os.getenv("DEBUG", "False").lower() == "true"
        
        # 로그 설정
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.log_format = os.getenv(
            "LOG_FORMAT",
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

