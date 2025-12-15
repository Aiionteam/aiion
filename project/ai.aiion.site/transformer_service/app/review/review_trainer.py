"""
Review Sentiment Trainer
영화 리뷰 감성 분석 딥러닝 학습 트레이너
"""

from typing import Optional, Tuple, Dict, Any, List
import pandas as pd
import numpy as np
from icecream import ic
from pathlib import Path

try:
    import torch
    from torch.utils.data import Dataset, DataLoader
    from torch import nn
    from torch.optim import AdamW
    from transformers import get_linear_schedule_with_warmup
    from tqdm import tqdm
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    ic("경고: torch 관련 라이브러리가 설치되지 않았습니다.")


class ReviewDataset(Dataset):
    """리뷰 감성 분석 데이터셋 (PyTorch)"""
    
    def __init__(
        self,
        texts: List[str],
        labels: List[int],
        tokenizer,
        max_length: int = 512
    ):
        """
        초기화
        
        Args:
            texts: 리뷰 텍스트 리스트
            labels: 라벨 리스트 (0: 부정, 1: 긍정)
            tokenizer: HuggingFace 토크나이저
            max_length: 최대 토큰 길이
        """
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        # 토크나이징
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


class ReviewSentimentTrainer:
    """영화 리뷰 감성 분석 딥러닝 트레이너"""
    
    def __init__(
        self,
        model,
        tokenizer,
        device: Optional[torch.device] = None
    ):
        """
        초기화
        
        Args:
            model: ReviewSentimentClassifier 모델
            tokenizer: HuggingFace 토크나이저
            device: 디바이스
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch 관련 라이브러리가 설치되지 않았습니다.")
        
        self.model = model
        self.tokenizer = tokenizer
        
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = device
        
        self.model.to(self.device)
        ic(f"트레이너 초기화 완료: device={self.device}")
    
    def train(
        self,
        train_df: pd.DataFrame,
        val_df: Optional[pd.DataFrame] = None,
        epochs: int = 5,
        batch_size: int = 16,
        learning_rate: float = 2e-5,
        max_length: int = 512,
        num_layers_to_freeze: int = 8,
        early_stopping_patience: int = 3,
        save_path: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        모델 학습
        
        Args:
            train_df: 학습 데이터 (review, label 컬럼 필요)
            val_df: 검증 데이터 (선택)
            epochs: 에포크 수
            batch_size: 배치 크기
            learning_rate: 학습률
            max_length: 최대 토큰 길이
            num_layers_to_freeze: 동결할 레이어 수
            early_stopping_patience: Early stopping patience
            save_path: 모델 저장 경로
            
        Returns:
            학습 결과 딕셔너리
        """
        # 레이어 동결
        self.model.freeze_bert_layers(num_layers_to_freeze)
        
        # 데이터셋 생성
        train_dataset = ReviewDataset(
            texts=train_df['review'].tolist(),
            labels=train_df['label'].tolist(),
            tokenizer=self.tokenizer,
            max_length=max_length
        )
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=batch_size,
            shuffle=True,
            num_workers=0
        )
        
        val_loader = None
        if val_df is not None:
            val_dataset = ReviewDataset(
                texts=val_df['review'].tolist(),
                labels=val_df['label'].tolist(),
                tokenizer=self.tokenizer,
                max_length=max_length
            )
            val_loader = DataLoader(
                val_dataset,
                batch_size=batch_size,
                shuffle=False,
                num_workers=0
            )
        
        # 옵티마이저 및 스케줄러
        optimizer = AdamW(self.model.parameters(), lr=learning_rate)
        total_steps = len(train_loader) * epochs
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=0,
            num_training_steps=total_steps
        )
        
        # 손실 함수
        criterion = nn.CrossEntropyLoss()
        
        # 학습
        best_val_loss = float('inf')
        patience_counter = 0
        train_losses = []
        val_losses = []
        val_accuracies = []
        
        for epoch in range(epochs):
            ic(f"\n에포크 {epoch + 1}/{epochs}")
            
            # 학습 모드
            self.model.train()
            train_loss = 0.0
            
            progress_bar = tqdm(train_loader, desc=f"Epoch {epoch + 1}")
            for batch in progress_bar:
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['labels'].to(self.device)
                
                optimizer.zero_grad()
                
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask
                )
                
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                scheduler.step()
                
                train_loss += loss.item()
                progress_bar.set_postfix({'loss': loss.item()})
            
            avg_train_loss = train_loss / len(train_loader)
            train_losses.append(avg_train_loss)
            ic(f"학습 손실: {avg_train_loss:.4f}")
            
            # 검증
            if val_loader is not None:
                val_loss, val_accuracy = self._validate(val_loader, criterion)
                val_losses.append(val_loss)
                val_accuracies.append(val_accuracy)
                
                ic(f"검증 손실: {val_loss:.4f}, 정확도: {val_accuracy:.4f}")
                
                # Early stopping
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                    
                    # 모델 저장
                    if save_path:
                        self._save_model(save_path)
                        ic(f"모델 저장: {save_path}")
                else:
                    patience_counter += 1
                    if patience_counter >= early_stopping_patience:
                        ic(f"Early stopping (patience: {early_stopping_patience})")
                        break
        
        return {
            'train_losses': train_losses,
            'val_losses': val_losses,
            'val_accuracies': val_accuracies,
            'best_val_loss': best_val_loss,
            'epochs_trained': epoch + 1
        }
    
    def _validate(self, val_loader, criterion) -> Tuple[float, float]:
        """검증"""
        self.model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['labels'].to(self.device)
                
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask
                )
                
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        avg_val_loss = val_loss / len(val_loader)
        accuracy = correct / total
        
        return avg_val_loss, accuracy
    
    def _save_model(self, save_path: Path):
        """모델 저장"""
        save_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.model.state_dict(), save_path)
        ic(f"모델 저장 완료: {save_path}")

