"""
Review Sentiment Service
영화 리뷰 감성 분석 서비스
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
import pickle
from datetime import datetime
import torch
import torch.nn.functional as F

try:
    from icecream import ic
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# 공통 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.review.review_dataset import ReviewDataset as ReviewDatasetLoader
from app.review.review_model import ReviewSentimentDLModel, TORCH_AVAILABLE
from app.review.review_trainer import ReviewSentimentTrainer

if not TORCH_AVAILABLE:
    raise ImportError("torch와 transformers가 설치되지 않았습니다.")


class ReviewSentimentService:
    """영화 리뷰 감성 분석 서비스"""
    
    def __init__(
        self,
        data_dir: Optional[Path] = None,
        dl_model_name: str = "koelectro_v3_base"
    ):
        """
        초기화
        
        Args:
            data_dir: JSON 데이터 파일 디렉토리
            dl_model_name: KoELECTRA 모델 이름 또는 경로
        """
        self.dataset_loader = ReviewDatasetLoader()
        self.dl_model_name = dl_model_name
        
        # 데이터 디렉토리
        if data_dir is None:
            self.data_dir = Path(__file__).parent / "data"
        else:
            self.data_dir = data_dir
        
        # 모델 저장 경로 (중앙 저장소)
        docker_model_dir = Path("/app/models/trained_models/review")
        if docker_model_dir.exists():
            self.model_dir = docker_model_dir
            ic(f"✅ Docker 중앙 저장소 사용: {self.model_dir}")
        else:
            # 로컬 환경
            current_dir = Path(__file__).parent  # review
            app_dir = current_dir.parent  # app
            service_dir = app_dir.parent  # transformer_service
            ai_dir = service_dir.parent  # ai.aiion.site
            local_model_dir = ai_dir / "models" / "trained_models" / "review"
            if local_model_dir.exists():
                self.model_dir = local_model_dir
                ic(f"✅ 로컬 중앙 저장소 사용: {self.model_dir}")
            else:
                # 중앙 저장소 디렉토리 생성 시도
                local_model_dir = ai_dir / "models" / "trained_models" / "review"
                local_model_dir.mkdir(parents=True, exist_ok=True)
                self.model_dir = local_model_dir
                ic(f"✅ 중앙 저장소 디렉토리 생성: {self.model_dir}")
        
        # 모델 파일
        self.dl_model_file = self.model_dir / "review_sentiment_dl_model.pt"
        self.dl_metadata_file = self.model_dir / "review_sentiment_dl_metadata.pkl"
        
        # DL 모델 및 트레이너
        self.dl_model_obj: Optional[ReviewSentimentDLModel] = None
        self.dl_trainer: Optional[ReviewSentimentTrainer] = None
        
        ic("ReviewSentimentService 초기화 완료")
        
        # 모델 초기화
        self._init_dl_model()
        
        # 모델 로드 시도
        self._try_load_model()
    
    def _init_dl_model(self):
        """DL 모델 초기화"""
        try:
            self.dl_model_obj = ReviewSentimentDLModel(
                model_name=self.dl_model_name,
                num_labels=2,  # 긍정/부정 2-class
                max_length=512
            )
            ic(f"✅ DL 모델 초기화 완료: {self.dl_model_name}")
        except Exception as e:
            ic(f"❌ DL 모델 초기화 실패: {e}")
            raise RuntimeError(f"DL 모델 초기화 실패: {e}")
    
    def _try_load_model(self):
        """저장된 모델 로드 시도"""
        if self.dl_model_file.exists() and self.dl_metadata_file.exists():
            try:
                # 메타데이터 로드
                with open(self.dl_metadata_file, 'rb') as f:
                    metadata = pickle.load(f)
                
                # 모델 생성
                self.dl_model_obj.create_model(
                    dropout_rate=metadata.get('dropout_rate', 0.3),
                    hidden_size=metadata.get('hidden_size', None)
                )
                
                # 모델 가중치 로드
                self.dl_model_obj.model.load_state_dict(
                    torch.load(self.dl_model_file, map_location=self.dl_model_obj.device)
                )
                self.dl_model_obj.model.eval()
                
                ic(f"✅ 모델 로드 완료: {self.dl_model_file}")
            except Exception as e:
                ic(f"⚠️ 모델 로드 실패: {e}")
                ic("새 모델을 생성합니다.")
                self.dl_model_obj.create_model()
        else:
            ic("기존 모델 파일 없음, 새 모델 생성")
            self.dl_model_obj.create_model()
    
    def load_data(self) -> pd.DataFrame:
        """JSON 데이터 로드"""
        if not self.data_dir.exists():
            raise FileNotFoundError(f"데이터 디렉토리를 찾을 수 없습니다: {self.data_dir}")
        
        df = self.dataset_loader.load_json_files(self.data_dir)
        return df
    
    def preprocess(self) -> pd.DataFrame:
        """데이터 전처리"""
        ic("데이터 전처리 시작")
        
        df = self.load_data()
        
        ic(f"총 리뷰 수: {len(df)}")
        ic(f"긍정: {len(df[df['label'] == 1])}, 부정: {len(df[df['label'] == 0])}")
        
        return df
    
    def learning(
        self,
        epochs: int = 5,
        batch_size: int = 16,
        learning_rate: float = 2e-5,
        max_length: int = 512,
        num_layers_to_freeze: int = 8,
        test_size: float = 0.2
    ):
        """
        모델 학습
        
        Args:
            epochs: 에포크 수
            batch_size: 배치 크기
            learning_rate: 학습률
            max_length: 최대 토큰 길이
            num_layers_to_freeze: 동결할 레이어 수
            test_size: 테스트 데이터 비율
        """
        ic("=" * 60)
        ic("모델 학습 시작")
        ic("=" * 60)
        
        # 데이터 전처리
        df = self.preprocess()
        
        # 학습/테스트 분할
        train_df, test_df = self.dataset_loader.get_train_test_split(
            test_size=test_size,
            random_state=42
        )
        
        # 모델 생성
        if self.dl_model_obj.model is None:
            self.dl_model_obj.create_model()
        
        # 트레이너 생성
        self.dl_trainer = ReviewSentimentTrainer(
            model=self.dl_model_obj.model,
            tokenizer=self.dl_model_obj.tokenizer,
            device=self.dl_model_obj.device
        )
        
        # 학습
        results = self.dl_trainer.train(
            train_df=train_df,
            val_df=test_df,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            max_length=max_length,
            num_layers_to_freeze=num_layers_to_freeze,
            early_stopping_patience=3,
            save_path=self.dl_model_file
        )
        
        # 메타데이터 저장
        metadata = {
            'model_name': self.dl_model_name,
            'num_labels': 2,
            'max_length': max_length,
            'dropout_rate': 0.3,
            'hidden_size': None,
            'epochs': results['epochs_trained'],
            'best_val_loss': results['best_val_loss'],
            'train_losses': results['train_losses'],
            'val_losses': results['val_losses'],
            'val_accuracies': results['val_accuracies'],
            'created_at': datetime.now().isoformat()
        }
        
        with open(self.dl_metadata_file, 'wb') as f:
            pickle.dump(metadata, f)
        
        ic("=" * 60)
        ic("모델 학습 완료")
        ic(f"최종 검증 정확도: {results['val_accuracies'][-1]:.4f}")
        ic("=" * 60)
        
        return results
    
    def predict(self, text: str) -> Dict[str, Any]:
        """
        리뷰 감성 분석 예측
        
        Args:
            text: 리뷰 텍스트
            
        Returns:
            예측 결과 딕셔너리
        """
        if self.dl_model_obj.model is None:
            raise RuntimeError("모델이 로드되지 않았습니다. 학습을 먼저 실행하세요.")
        
        # 토크나이징
        encoding = self.dl_model_obj.tokenizer(
            text,
            add_special_tokens=True,
            max_length=512,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        input_ids = encoding['input_ids'].to(self.dl_model_obj.device)
        attention_mask = encoding['attention_mask'].to(self.dl_model_obj.device)
        
        # 예측
        self.dl_model_obj.model.eval()
        with torch.no_grad():
            outputs = self.dl_model_obj.model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            
            # Softmax로 확률 계산
            probabilities = F.softmax(outputs, dim=1)
            probs = probabilities[0].cpu().numpy()
            
            # 예측 클래스
            predicted_class = int(torch.argmax(probabilities, dim=1).item())
            confidence = float(probs[predicted_class])
            
            # 결과
            sentiment = "positive" if predicted_class == 1 else "negative"
            
            return {
                'sentiment': sentiment,
                'confidence': confidence,
                'probabilities': {
                    'negative': float(probs[0]),
                    'positive': float(probs[1])
                },
                'text': text
            }
    
    def predict_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """배치 예측"""
        return [self.predict(text) for text in texts]
    
    def get_status(self) -> Dict[str, Any]:
        """서비스 상태 조회"""
        model_loaded = self.dl_model_obj.model is not None
        
        return {
            'status': 'ready' if model_loaded else 'model_not_loaded',
            'model_loaded': model_loaded,
            'model_path': str(self.dl_model_file) if model_loaded else None
        }

