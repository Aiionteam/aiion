"""
Diary MBTI Model
일기 MBTI 분류 딥러닝 모델 클래스
"""

import pandas as pd
import numpy as np
from icecream import ic
from typing import Optional


class DiaryMbtiModel:
    """일기 MBTI 분류 ML 모델 클래스 (레거시 지원)"""
    
    def __init__(self):
        """초기화"""
        self.models = {}  # MBTI 차원별 모델 {'E_I': model, 'S_N': model, ...}
        self.vectorizer = None
        self.word2vec_model = None
        ic("DiaryMbtiModel 초기화")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"DiaryMbtiModel(models={len(self.models)}개, vectorizer={self.vectorizer is not None})"

# PyTorch 및 Transformers 라이브러리 임포트
try:
    import torch
    import torch.nn as nn
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
    ic("경고: torch 또는 transformers가 설치되지 않았습니다. 딥러닝 모델을 사용할 수 없습니다.")


class BERTMbtiClassifier(nn.Module):
    """BERT 기반 MBTI 차원별 3-class 분류 딥러닝 모델 (0=평가불가, 1, 2)"""
    
    def __init__(
        self,
        model_name: str = "koelectro_v3_base",  # 로컬 KoELECTRA v3 base 모델 (기본값)
        num_labels: int = 3,  # MBTI 3-class (0=평가불가, 1, 2)
        dropout_rate: float = 0.3,
        hidden_size: Optional[int] = None
    ):
        """
        초기화
        
        Args:
            model_name: HuggingFace 모델 이름 또는 로컬 모델 경로 (기본: koelectro_v3_base)
            num_labels: 클래스 수 (MBTI는 3: 0=평가불가, 1, 2)
            dropout_rate: Dropout 비율
            hidden_size: 중간 hidden layer 크기 (None이면 직접 분류)
        """
        super().__init__()
        if not TORCH_AVAILABLE:
            raise ImportError("torch와 transformers가 설치되지 않았습니다.")
        
        self.num_labels = num_labels
        
        # 로컬 모델 경로인지 확인
        from pathlib import Path
        model_path_str = str(model_name)
        
        # 상대 경로를 절대 경로로 변환 (공통 모델 저장소 우선)
        if not Path(model_path_str).is_absolute():
            # 1. Docker 환경: /app/koelectro_v3_base (우선)
            docker_path = Path("/app/koelectro_v3_base")
            if docker_path.exists() and docker_path.is_dir() and (docker_path / "config.json").exists():
                model_path_str = str(docker_path)
                ic(f"✅ Docker 공통 모델 저장소 사용: {model_path_str}")
            # 2. 공통 모델 저장소: ai.aiion.site/models/koelectra
            elif model_name == "koelectro_v3_base":
                # business/diary_service/app이 루트이므로 상위로 올라가서 찾기
                current_dir = Path(__file__).parent  # diary_mbti
                app_dir = current_dir.parent  # app
                service_dir = app_dir.parent  # diary_service
                business_dir = service_dir.parent  # business
                ai_dir = business_dir.parent  # ai.aiion.site
                common_model_path = ai_dir / "models" / "koelectra"
                if common_model_path.exists() and common_model_path.is_dir() and (common_model_path / "config.json").exists():
                    model_path_str = str(common_model_path)
                    ic(f"✅ 공통 모델 저장소 사용: {model_path_str}")
                else:
                    # 3. 기존 위치 (하위 호환성)
                    potential_path = app_dir / model_path_str
                    if potential_path.exists() and potential_path.is_dir():
                        model_path_str = str(potential_path)
                    else:
                        potential_path = ai_dir / model_path_str
                        if potential_path.exists() and potential_path.is_dir():
                            model_path_str = str(potential_path)
        
        model_path = Path(model_path_str)
        is_local_model = model_path.exists() and model_path.is_dir() and (model_path / "config.json").exists()
        
        if is_local_model:
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
        
        # 3-class 분류 헤드 (MBTI: 0=평가불가, 1, 2)
        if hidden_size:
            # 2-layer 분류기
            self.classifier = nn.Sequential(
                nn.Linear(self.config.hidden_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
                nn.Linear(hidden_size, num_labels)  # 3-class 분류
            )
        else:
            # 1-layer 분류기
            self.classifier = nn.Linear(self.config.hidden_size, num_labels)  # 3-class 분류
        
        self.model_name = model_name
        ic(f"BERTMbtiClassifier 초기화 완료: {model_name} ({num_labels}-class 분류)")
    
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
            token_type_ids: Token type IDs (선택)
        
        Returns:
            logits: 각 클래스에 대한 로짓 (batch_size, num_labels)
        """
        # BERT 인코딩
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids
        )
        
        # [CLS] 토큰의 hidden state 추출
        pooled_output = outputs.last_hidden_state[:, 0, :]  # (batch_size, hidden_size)
        
        # Dropout 및 분류
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        
        return logits
    
    def freeze_bert_layers(self, num_layers_to_freeze: int = 8):
        """
        BERT 하위 레이어를 동결하여 학습 속도 향상
        
        Args:
            num_layers_to_freeze: 동결할 레이어 수 (기본: 8)
        """
        # Embedding layer 동결
        for param in self.bert.embeddings.parameters():
            param.requires_grad = False
        
        # 지정된 수만큼 encoder layer 동결
        for i in range(num_layers_to_freeze):
            if i < len(self.bert.encoder.layer):
                for param in self.bert.encoder.layer[i].parameters():
                    param.requires_grad = False
        
        ic(f"BERT 하위 {num_layers_to_freeze}개 레이어 동결 완료")
    
    def unfreeze_all(self):
        """모든 레이어 동결 해제"""
        for param in self.parameters():
            param.requires_grad = True
        ic("모든 레이어 동결 해제 완료")


class DiaryMbtiDLModel:
    """일기 MBTI 분류 DL 모델 래퍼 클래스 (4개 차원별 모델)"""
    
    def __init__(
        self,
        model_name: str = "koelectro_v3_base",  # 로컬 KoELECTRA v3 base 모델 (기본값)
        max_length: int = 512,
        device: Optional[torch.device] = None
    ):
        """
        초기화
        
        Args:
            model_name: HuggingFace 모델 이름 또는 로컬 모델 경로 (기본: koelectro_v3_base)
            max_length: 최대 토큰 길이
            device: 디바이스 (None이면 자동 감지)
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch와 transformers가 설치되지 않았습니다.")
        
        self.model_name = model_name
        self.max_length = max_length
        # device가 None이면 런타임에 다시 확인
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = device
        
        # 토크나이저 로드 (로컬 모델 경로 지원)
        from pathlib import Path
        model_path_str = str(self.model_name)
        
        # 상대 경로를 절대 경로로 변환 (공통 모델 저장소 우선)
        if not Path(model_path_str).is_absolute():
            # 1. Docker 환경: /app/koelectro_v3_base (우선)
            docker_path = Path("/app/koelectro_v3_base")
            if docker_path.exists() and docker_path.is_dir() and (docker_path / "config.json").exists():
                model_path_str = str(docker_path)
                ic(f"✅ Docker 공통 모델 저장소 사용: {model_path_str}")
            # 2. 공통 모델 저장소: ai.aiion.site/models/koelectra
            elif model_name == "koelectro_v3_base":
                # business/diary_service/app이 루트이므로 상위로 올라가서 찾기
                current_dir = Path(__file__).parent  # diary_mbti
                app_dir = current_dir.parent  # app
                service_dir = app_dir.parent  # diary_service
                business_dir = service_dir.parent  # business
                ai_dir = business_dir.parent  # ai.aiion.site
                common_model_path = ai_dir / "models" / "koelectra"
                if common_model_path.exists() and common_model_path.is_dir() and (common_model_path / "config.json").exists():
                    model_path_str = str(common_model_path)
                    ic(f"✅ 공통 모델 저장소 사용: {model_path_str}")
                else:
                    # 3. 기존 위치 (하위 호환성)
                    potential_path = app_dir / model_path_str
                    if potential_path.exists() and potential_path.is_dir() and (potential_path / "config.json").exists():
                        model_path_str = str(potential_path)
                    else:
                        potential_path = ai_dir / model_path_str
                        if potential_path.exists() and potential_path.is_dir() and (potential_path / "config.json").exists():
                            model_path_str = str(potential_path)
        
        model_path = Path(model_path_str)
        is_local_model = model_path.exists() and model_path.is_dir() and (model_path / "config.json").exists()
        
        if is_local_model:
            # 로컬 모델의 토크나이저 로드
            ic(f"✅ 로컬 토크나이저 로드: {model_path}")
            self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        else:
            # HuggingFace 토크나이저 로드
            ic(f"🌐 HuggingFace 토크나이저 로드: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        
        # 4개 MBTI 차원별 모델 초기화
        self.models = {}  # {'E_I': model, 'S_N': model, 'T_F': model, 'J_P': model}
        self.mbti_labels = ['E_I', 'S_N', 'T_F', 'J_P']
        
        ic(f"DiaryMbtiDLModel 초기화 완료: device={self.device}")
    
    def create_models(
        self,
        num_labels: int = 3,  # MBTI 3-class (0=평가불가, 1, 2)
        dropout_rate: float = 0.3,
        hidden_size: Optional[int] = None
    ):
        """
        4개 MBTI 차원별 모델 생성
        
        Args:
            num_labels: 클래스 수 (MBTI는 3: 0=평가불가, 1, 2)
            dropout_rate: Dropout 비율
            hidden_size: 중간 hidden layer 크기
        """
        for label in self.mbti_labels:
            self.models[label] = BERTMbtiClassifier(
                model_name=self.model_name,
                num_labels=num_labels,
                dropout_rate=dropout_rate,
                hidden_size=hidden_size
            )
            self.models[label].to(self.device)
        ic(f"4개 MBTI 차원별 모델 생성 완료: {self.model_name} ({num_labels}-class)")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"DiaryMbtiDLModel(model_name={self.model_name}, device={self.device}, models={len(self.models)}개)"
