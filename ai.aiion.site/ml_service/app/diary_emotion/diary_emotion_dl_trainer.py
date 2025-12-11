"""
Diary Emotion DL Trainer
일기 감정 분류 딥러닝 학습 트레이너
"""

from typing import Optional, Tuple, Dict, Any, List
import pandas as pd
import numpy as np
from icecream import ic
from pathlib import Path

# PyTorch 및 관련 라이브러리
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


class EmotionDataset(Dataset):
    """감정 분류 데이터셋 (PyTorch)"""
    
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
            texts: 텍스트 리스트
            labels: 라벨 리스트
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


class DiaryEmotionDLTrainer:
    """일기 감정 분류 딥러닝 트레이너"""
    
    def __init__(
        self,
        model,
        tokenizer,
        device: Optional[torch.device] = None
    ):
        """
        초기화
        
        Args:
            model: BERTEmotionClassifier 모델
            tokenizer: HuggingFace 토크나이저
            device: 디바이스
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch 관련 라이브러리가 설치되지 않았습니다.")
        
        self.model = model
        self.tokenizer = tokenizer
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        
        # 학습 히스토리
        self.train_losses = []
        self.val_losses = []
        self.train_accuracies = []
        self.val_accuracies = []
        
        ic(f"DiaryEmotionDLTrainer 초기화: device={self.device}")
    
    def create_dataloader(
        self,
        texts: List[str],
        labels: List[int],
        batch_size: int = 16,
        max_length: int = 512,
        shuffle: bool = True
    ) -> DataLoader:
        """
        DataLoader 생성
        
        Args:
            texts: 텍스트 리스트
            labels: 라벨 리스트
            batch_size: 배치 크기
            max_length: 최대 토큰 길이
            shuffle: 섞기 여부
        
        Returns:
            DataLoader
        """
        dataset = EmotionDataset(
            texts=texts,
            labels=labels,
            tokenizer=self.tokenizer,
            max_length=max_length
        )
        
        return DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=shuffle,
            num_workers=0  # Windows 호환성
        )
    
    def train_epoch(
        self,
        train_loader: DataLoader,
        optimizer,
        scheduler,
        criterion
    ) -> Tuple[float, float]:
        """
        한 에폭 학습
        
        Args:
            train_loader: 학습 데이터 로더
            optimizer: 옵티마이저
            scheduler: 스케줄러
            criterion: 손실 함수
        
        Returns:
            (평균 손실, 정확도)
        """
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        progress_bar = tqdm(train_loader, desc="Training")
        
        for batch in progress_bar:
            # 데이터 이동
            input_ids = batch['input_ids'].to(self.device)
            attention_mask = batch['attention_mask'].to(self.device)
            labels = batch['labels'].to(self.device)
            
            # 순전파
            outputs = self.model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            
            # 손실 계산
            loss = criterion(outputs, labels)
            
            # 역전파
            optimizer.zero_grad()
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            optimizer.step()
            scheduler.step()
            
            # 통계
            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
            # Progress bar 업데이트
            progress_bar.set_postfix({
                'loss': loss.item(),
                'acc': 100 * correct / total
            })
        
        avg_loss = total_loss / len(train_loader)
        accuracy = correct / total
        
        return avg_loss, accuracy
    
    def evaluate(
        self,
        val_loader: DataLoader,
        criterion
    ) -> Tuple[float, float, np.ndarray, np.ndarray]:
        """
        평가
        
        Args:
            val_loader: 검증 데이터 로더
            criterion: 손실 함수
        
        Returns:
            (평균 손실, 정확도, 실제 라벨, 예측 라벨)
        """
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        
        all_labels = []
        all_predictions = []
        
        with torch.no_grad():
            for batch in tqdm(val_loader, desc="Evaluating"):
                # 데이터 이동
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['labels'].to(self.device)
                
                # 순전파
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask
                )
                
                # 손실 계산
                loss = criterion(outputs, labels)
                
                # 통계
                total_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
                # 라벨 저장
                all_labels.extend(labels.cpu().numpy())
                all_predictions.extend(predicted.cpu().numpy())
        
        avg_loss = total_loss / len(val_loader)
        accuracy = correct / total
        
        return avg_loss, accuracy, np.array(all_labels), np.array(all_predictions)
    
    def train(
        self,
        train_texts: List[str],
        train_labels: List[int],
        val_texts: List[str],
        val_labels: List[int],
        epochs: int = 3,
        batch_size: int = 16,
        learning_rate: float = 2e-5,
        max_length: int = 512,
        freeze_bert_layers: int = 0,
        early_stopping_patience: int = 3
    ) -> Dict[str, Any]:
        """
        모델 학습
        
        Args:
            train_texts: 학습 텍스트
            train_labels: 학습 라벨
            val_texts: 검증 텍스트
            val_labels: 검증 라벨
            epochs: 에폭 수
            batch_size: 배치 크기
            learning_rate: 학습률
            max_length: 최대 토큰 길이
            freeze_bert_layers: 동결할 BERT 레이어 수
            early_stopping_patience: Early stopping patience
        
        Returns:
            학습 결과 딕셔너리
        """
        ic(f"학습 시작: epochs={epochs}, batch_size={batch_size}, lr={learning_rate}")
        
        # BERT 레이어 동결
        if freeze_bert_layers > 0:
            self.model.freeze_bert_layers(freeze_bert_layers)
        
        # DataLoader 생성
        train_loader = self.create_dataloader(
            train_texts, train_labels, batch_size, max_length, shuffle=True
        )
        val_loader = self.create_dataloader(
            val_texts, val_labels, batch_size, max_length, shuffle=False
        )
        
        # 옵티마이저 및 스케줄러 설정
        optimizer = AdamW(
            self.model.parameters(),
            lr=learning_rate,
            eps=1e-8
        )
        
        total_steps = len(train_loader) * epochs
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=int(0.1 * total_steps),
            num_training_steps=total_steps
        )
        
        # 손실 함수 (클래스 불균형 처리)
        # 라벨 분포 계산
        unique, counts = np.unique(train_labels, return_counts=True)
        class_weights = 1.0 / counts
        class_weights = class_weights / class_weights.sum() * len(unique)
        class_weights = torch.FloatTensor(class_weights).to(self.device)
        
        criterion = nn.CrossEntropyLoss(weight=class_weights)
        
        # 학습 루프
        best_val_acc = 0.0
        patience_counter = 0
        
        for epoch in range(epochs):
            ic(f"Epoch {epoch+1}/{epochs}")
            
            # 학습
            train_loss, train_acc = self.train_epoch(
                train_loader, optimizer, scheduler, criterion
            )
            
            # 평가
            val_loss, val_acc, val_labels, val_preds = self.evaluate(
                val_loader, criterion
            )
            
            # 히스토리 저장
            self.train_losses.append(train_loss)
            self.val_losses.append(val_loss)
            self.train_accuracies.append(train_acc)
            self.val_accuracies.append(val_acc)
            
            ic(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
            ic(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
            
            # Early stopping
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                patience_counter = 0
                ic(f"✅ Best model updated: Val Acc={best_val_acc:.4f}")
            else:
                patience_counter += 1
                ic(f"⚠️ Patience: {patience_counter}/{early_stopping_patience}")
                
                if patience_counter >= early_stopping_patience:
                    ic(f"🛑 Early stopping at epoch {epoch+1}")
                    break
        
        return {
            "train_losses": self.train_losses,
            "val_losses": self.val_losses,
            "train_accuracies": self.train_accuracies,
            "val_accuracies": self.val_accuracies,
            "best_val_accuracy": best_val_acc,
            "final_train_accuracy": self.train_accuracies[-1],
            "final_val_accuracy": self.val_accuracies[-1]
        }
    
    def predict(
        self,
        texts: List[str],
        batch_size: int = 16,
        max_length: int = 512,
        return_probs: bool = False
    ):
        """
        예측
        
        Args:
            texts: 텍스트 리스트
            batch_size: 배치 크기
            max_length: 최대 토큰 길이
            return_probs: True면 확률도 반환
        
        Returns:
            return_probs=False: 예측 라벨 배열
            return_probs=True: (예측 라벨 배열, 확률 배열)
        """
        self.model.eval()
        
        # 임시 라벨 (사용되지 않음)
        dummy_labels = [0] * len(texts)
        
        # DataLoader 생성
        dataloader = self.create_dataloader(
            texts, dummy_labels, batch_size, max_length, shuffle=False
        )
        
        all_predictions = []
        all_probabilities = []
        
        with torch.no_grad():
            for batch in tqdm(dataloader, desc="Predicting"):
                # 데이터 이동
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                
                # 순전파
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask
                )
                
                # 확률 계산 (softmax)
                probs = torch.softmax(outputs, dim=1)
                
                # 예측
                _, predicted = torch.max(outputs, 1)
                all_predictions.extend(predicted.cpu().numpy())
                
                if return_probs:
                    all_probabilities.extend(probs.cpu().numpy())
        
        if return_probs:
            return np.array(all_predictions), np.array(all_probabilities)
        else:
            return np.array(all_predictions)

