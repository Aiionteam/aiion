"""
Review Sentiment Model
영화 리뷰 감성 분석 모델 클래스
"""

import torch
import torch.nn as nn
from pathlib import Path
from typing import Optional
from icecream import ic

try:
    from transformers import (
        AutoTokenizer,
        AutoModel,
        AutoConfig,
    )
    TORCH_AVAILABLE = True
    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
except ImportError:
    TORCH_AVAILABLE = False
    DEVICE = None
    ic("경고: torch 또는 transformers가 설치되지 않았습니다.")


class ReviewSentimentClassifier(nn.Module):
    """KoELECTRA 기반 영화 리뷰 감성 분류 모델"""
    
    def __init__(
        self,
        model_name: str = "koelectro_v3_base",
        num_labels: int = 2,  # 긍정/부정 2-class
        dropout_rate: float = 0.3,
        hidden_size: Optional[int] = None
    ):
        """
        초기화
        
        Args:
            model_name: KoELECTRA 모델 경로 또는 이름
            num_labels: 클래스 수 (2: 긍정/부정)
            dropout_rate: Dropout 비율
            hidden_size: 중간 hidden layer 크기
        """
        super().__init__()
        if not TORCH_AVAILABLE:
            raise ImportError("torch와 transformers가 설치되지 않았습니다.")
        
        self.num_labels = num_labels
        
        # 모델 경로 찾기
        model_path = self._find_model_path(model_name)
        
        if model_path.exists() and (model_path / "config.json").exists():
            # 로컬 모델 로드
            ic(f"✅ 로컬 모델 로드: {model_path}")
            self.config = AutoConfig.from_pretrained(str(model_path))
            self.bert = AutoModel.from_pretrained(str(model_path))
        else:
            # HuggingFace 모델 로드
            ic(f"🌐 HuggingFace 모델 로드: {model_name}")
            self.config = AutoConfig.from_pretrained(model_name)
            self.bert = AutoModel.from_pretrained(model_name)
        
        self.dropout = nn.Dropout(dropout_rate)
        
        # 분류 헤드
        if hidden_size:
            self.classifier = nn.Sequential(
                nn.Linear(self.config.hidden_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
                nn.Linear(hidden_size, num_labels)
            )
        else:
            self.classifier = nn.Linear(self.config.hidden_size, num_labels)
        
        self.model_name = model_name
        ic(f"ReviewSentimentClassifier 초기화 완료: {num_labels}-class")
    
    def _find_model_path(self, model_name: str) -> Path:
        """KoELECTRA 모델 경로 찾기"""
        model_path_str = str(model_name)
        
        # 절대 경로가 아니면 찾기
        if not Path(model_path_str).is_absolute():
            # 1. Docker 환경: /app/koelectro_v3_base
            docker_path = Path("/app/koelectro_v3_base")
            if docker_path.exists() and (docker_path / "config.json").exists():
                return docker_path
            
            # 2. 공통 모델 저장소: models/koelectra
            # transformer_service/app이 루트
            current_dir = Path(__file__).parent  # review
            app_dir = current_dir.parent  # app
            service_dir = app_dir.parent  # transformer_service
            ai_dir = service_dir.parent  # ai.aiion.site
            common_model_path = ai_dir / "models" / "koelectra"
            if common_model_path.exists() and (common_model_path / "config.json").exists():
                return common_model_path
        
        return Path(model_path_str)
    
    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        token_type_ids: Optional[torch.Tensor] = None
    ):
        """
        순전파
        
        Args:
            input_ids: 토큰 ID
            attention_mask: Attention mask
            token_type_ids: Token type IDs
            
        Returns:
            logits: 각 클래스에 대한 로짓
        """
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids
        )
        
        # [CLS] 토큰의 hidden state 추출
        pooled_output = outputs.last_hidden_state[:, 0, :]
        
        # Dropout 및 분류
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        
        return logits
    
    def freeze_bert_layers(self, num_layers_to_freeze: int = 8):
        """BERT 하위 레이어 동결"""
        for param in self.bert.embeddings.parameters():
            param.requires_grad = False
        
        for i in range(num_layers_to_freeze):
            if i < len(self.bert.encoder.layer):
                for param in self.bert.encoder.layer[i].parameters():
                    param.requires_grad = False
        
        ic(f"BERT 하위 {num_layers_to_freeze}개 레이어 동결 완료")


class ReviewSentimentDLModel:
    """영화 리뷰 감성 분석 DL 모델 래퍼 클래스"""
    
    def __init__(
        self,
        model_name: str = "koelectro_v3_base",
        num_labels: int = 2,
        max_length: int = 512,
        device: Optional[torch.device] = None
    ):
        """
        초기화
        
        Args:
            model_name: KoELECTRA 모델 이름 또는 경로
            num_labels: 클래스 수 (2: 긍정/부정)
            max_length: 최대 토큰 길이
            device: 디바이스
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch와 transformers가 설치되지 않았습니다.")
        
        self.model_name = model_name
        self.num_labels = num_labels
        self.max_length = max_length
        
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = device
        
        # 토크나이저 로드
        model_path = self._find_model_path(model_name)
        if model_path.exists() and (model_path / "config.json").exists():
            ic(f"✅ 로컬 토크나이저 로드: {model_path}")
            self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        else:
            ic(f"🌐 HuggingFace 토크나이저 로드: {model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # 모델 초기화
        self.model = None
        
        ic(f"ReviewSentimentDLModel 초기화 완료: device={self.device}")
    
    def _find_model_path(self, model_name: str) -> Path:
        """KoELECTRA 모델 경로 찾기"""
        model_path_str = str(model_name)
        
        if not Path(model_path_str).is_absolute():
            # 1. Docker 환경
            docker_path = Path("/app/koelectro_v3_base")
            if docker_path.exists() and (docker_path / "config.json").exists():
                return docker_path
            
            # 2. 공통 모델 저장소
            current_dir = Path(__file__).parent  # review
            app_dir = current_dir.parent  # app
            service_dir = app_dir.parent  # transformer_service
            ai_dir = service_dir.parent  # ai.aiion.site
            common_model_path = ai_dir / "models" / "koelectra"
            if common_model_path.exists() and (common_model_path / "config.json").exists():
                return common_model_path
        
        return Path(model_path_str)
    
    def create_model(
        self,
        dropout_rate: float = 0.3,
        hidden_size: Optional[int] = None
    ):
        """모델 생성"""
        self.model = ReviewSentimentClassifier(
            model_name=self.model_name,
            num_labels=self.num_labels,
            dropout_rate=dropout_rate,
            hidden_size=hidden_size
        )
        self.model.to(self.device)
        ic(f"모델 생성 완료: {self.model_name}")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"ReviewSentimentDLModel(model_name={self.model_name}, device={self.device})"

