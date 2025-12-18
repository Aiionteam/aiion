"""
Diary Emotion Model
일기 감정 분류 머신러닝/딥러닝 모델 클래스
"""

import pandas as pd
import numpy as np
from icecream import ic
from typing import Optional

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


class DiaryEmotionModel:
    """일기 감정 분류 ML 모델 클래스 (기존)"""
    
    def __init__(self):
        """초기화"""
        self.model = None
        self.scaler = None
        self.vectorizer = None
        # Word2Vec 제거됨 - BERT가 더 우수한 문맥 이해를 제공
        self.label_encoder = None
        ic("DiaryEmotionModel 초기화")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"DiaryEmotionModel(model={self.model is not None})"


class BERTEmotionClassifier(nn.Module):
    """BERT 기반 감정 분류 딥러닝 모델"""
    
    def __init__(
        self,
        model_name: str = "klue/bert-base",
        num_labels: int = 7,
        dropout_rate: float = 0.3,
        hidden_size: Optional[int] = None
    ):
        """
        초기화
        
        Args:
            model_name: HuggingFace 모델 이름 또는 로컬 모델 경로 (기본: klue/bert-base)
                       예: "klue/bert-base" 또는 "koelectro_v3_base" 또는 Path 객체
            num_labels: 감정 라벨 수 (0:평가불가, 1:기쁨, 2:슬픔, 3:분노, 4:두려움, 5:혐오, 6:놀람, 7:신뢰, 8:기대, 9:불안, 10:안도, 11:후회, 12:그리움, 13:감사, 14:외로움)
            dropout_rate: Dropout 비율
            hidden_size: 중간 hidden layer 크기 (None이면 직접 분류)
        """
        super().__init__()
        if not TORCH_AVAILABLE:
            raise ImportError("torch와 transformers가 설치되지 않았습니다.")
        
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
                current_dir = Path(__file__).parent  # diary_emotion
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
        
        # 분류 헤드
        if hidden_size:
            # 2-layer 분류기
            self.classifier = nn.Sequential(
                nn.Linear(self.config.hidden_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
                nn.Linear(hidden_size, num_labels)
            )
        else:
            # 1-layer 분류기
            self.classifier = nn.Linear(self.config.hidden_size, num_labels)
        
        self.num_labels = num_labels
        self.model_name = model_name
        ic(f"BERTEmotionClassifier 초기화 완료: {model_name}, labels={num_labels}")
    
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
            num_layers_to_freeze: 동결할 레이어 수 (기본: 8, BERT-base는 총 12 layers)
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


class DiaryEmotionDLModel:
    """일기 감정 분류 DL 모델 래퍼 클래스"""
    
    def __init__(
        self,
        model_name: str = "koelectro_v3_base",  # 로컬 KoELECTRA v3 base 모델 (기본값)
        num_labels: int = 7,
        max_length: int = 512,
        device: Optional[torch.device] = None
    ):
        """
        초기화
        
        Args:
            model_name: HuggingFace 모델 이름 또는 로컬 모델 경로 (기본: koelectro_v3_base)
            num_labels: 감정 라벨 수
            max_length: 최대 토큰 길이
            device: 디바이스 (None이면 자동 감지)
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch와 transformers가 설치되지 않았습니다.")
        
        self.model_name = model_name
        self.num_labels = num_labels
        self.max_length = max_length
        # device가 None이면 런타임에 다시 확인 (모듈 로드 시점의 DEVICE는 무시)
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
                current_dir = Path(__file__).parent  # diary_emotion
                app_dir = current_dir.parent  # app
                service_dir = app_dir.parent  # diary_service
                business_dir = service_dir.parent  # business
                ai_dir = business_dir.parent  # ai.aiion.site
                common_model_path = ai_dir / "models" / "koelectra"
                ic(f"모델 경로 검색 (공통 저장소): {common_model_path} (존재: {common_model_path.exists()})")
                if common_model_path.exists() and common_model_path.is_dir() and (common_model_path / "config.json").exists():
                    model_path_str = str(common_model_path)
                    ic(f"✅ 공통 모델 저장소 사용: {model_path_str}")
                else:
                    # 3. 기존 위치 (하위 호환성)
                    potential_path = app_dir / model_path_str
                    ic(f"모델 경로 검색 1: {potential_path} (존재: {potential_path.exists()})")
                    if potential_path.exists() and potential_path.is_dir() and (potential_path / "config.json").exists():
                        model_path_str = str(potential_path)
                        ic(f"✅ 모델 경로 발견 (app): {model_path_str}")
                    else:
                        potential_path = ai_dir / model_path_str
                        ic(f"모델 경로 검색 2: {potential_path} (존재: {potential_path.exists()})")
                        if potential_path.exists() and potential_path.is_dir() and (potential_path / "config.json").exists():
                            model_path_str = str(potential_path)
                            ic(f"✅ 모델 경로 발견 (ai.aiion.site): {model_path_str}")
                        else:
                            ic(f"⚠️ 로컬 모델 경로를 찾을 수 없습니다: {model_path_str}")
                            ic(f"   - Docker: {docker_path}")
                            ic(f"   - 공통 저장소: {common_model_path}")
                            ic(f"   - app/{model_path_str}: {app_dir / model_path_str}")
                            ic(f"   - ai.aiion.site/{model_path_str}: {ai_dir / model_path_str}")
        
        model_path = Path(model_path_str)
        is_local_model = model_path.exists() and model_path.is_dir() and (model_path / "config.json").exists()
        
        # 모델 경로 저장 (나중에 create_model에서 사용)
        self.model_path = model_path_str if is_local_model else self.model_name
        
        if is_local_model:
            # 로컬 모델의 토크나이저 로드
            ic(f"✅ 로컬 토크나이저 로드: {model_path}")
            self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        else:
            # HuggingFace 토크나이저 로드
            ic(f"🌐 HuggingFace 토크나이저 로드: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        
        # 모델 초기화 (나중에 로드 또는 학습)
        self.model = None
        
        ic(f"DiaryEmotionDLModel 초기화 완료: device={self.device}")
    
    def create_model(
        self,
        dropout_rate: float = 0.3,
        hidden_size: Optional[int] = None
    ):
        """
        모델 생성
        
        Args:
            dropout_rate: Dropout 비율
            hidden_size: 중간 hidden layer 크기
        """
        # 저장된 모델 경로 사용 (로컬 모델인 경우)
        model_name_to_use = getattr(self, 'model_path', self.model_name)
        self.model = BERTEmotionClassifier(
            model_name=model_name_to_use,
            num_labels=self.num_labels,
            dropout_rate=dropout_rate,
            hidden_size=hidden_size
        )
        self.model.to(self.device)
        ic(f"모델 생성 완료: {model_name_to_use}")
    
    def __repr__(self) -> str:
        """문자열 표현"""
        return f"DiaryEmotionDLModel(model_name={self.model_name}, device={self.device})"

