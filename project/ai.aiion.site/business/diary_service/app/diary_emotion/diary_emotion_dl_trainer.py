"""
Diary Emotion DL Trainer
일기 감정 분류 딥러닝 학습 트레이너 (다중 분류)
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
            labels: 라벨 리스트 (다중 분류: 0~14)
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
    """일기 감정 분류 딥러닝 트레이너 (다중 분류)"""
    
    def __init__(
        self,
        model: nn.Module,
        tokenizer,
        device: Optional[torch.device] = None
    ):
        """
        초기화
        
        Args:
            model: 감정 분류 모델
            tokenizer: HuggingFace 토크나이저
            device: 디바이스
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch 관련 라이브러리가 설치되지 않았습니다.")
        
        self.model = model
        self.tokenizer = tokenizer
        
        # GPU 사용 가능 여부 확인 및 device 설정
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            ic(f"✅ GPU 사용 가능: {torch.cuda.get_device_name(0)}")
            ic(f"   GPU 메모리: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
            if device is not None and device.type == "cpu":
                ic("⚠️ 전달된 device가 CPU이지만, GPU가 사용 가능하므로 GPU로 변경합니다.")
        else:
            self.device = torch.device("cpu")
            ic("⚠️ GPU를 사용할 수 없습니다. CPU로 학습합니다.")
        
        # 모델을 디바이스로 이동
        self.model.to(self.device)
        
        ic(f"DiaryEmotionDLTrainer 초기화 완료: device={self.device}")
    
    def create_dataloader(
        self,
        texts: List[str],
        labels: List[int],
        batch_size: int = 16,
        max_length: int = 512,
        shuffle: bool = True
    ) -> DataLoader:
        """DataLoader 생성"""
        dataset = EmotionDataset(
            texts=texts,
            labels=labels,
            tokenizer=self.tokenizer,
            max_length=max_length
        )
        
        # num_workers 설정
        import platform
        import os
        import multiprocessing
        
        is_docker = os.path.exists('/.dockerenv')
        is_linux = platform.system() == "Linux"
        
        if is_docker or (is_linux and platform.system() != "Windows"):
            num_workers = min(multiprocessing.cpu_count(), 8)
            ic(f"DataLoader num_workers 설정: {num_workers} (멀티프로세싱 활성화)")
        else:
            num_workers = 0
            ic(f"DataLoader num_workers 설정: {num_workers} (Windows 환경)")
        
        pin_memory = self.device.type == "cuda"
        
        return DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=shuffle,
            num_workers=num_workers,
            pin_memory=pin_memory,
            persistent_workers=True if num_workers > 0 else False
        )
    
    def train_epoch(
        self,
        train_loader: DataLoader,
        optimizer,
        scheduler,
        criterion,
        use_amp: bool = True,
        label_smoothing: float = 0.0
    ) -> Tuple[float, float]:
        """한 에폭 학습 (다중 분류)"""
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        # Mixed Precision Training 설정
        scaler = None
        if use_amp and self.device.type == "cuda":
            try:
                # 새로운 API 사용 (PyTorch 2.0+)
                scaler = torch.amp.GradScaler('cuda')
                ic("✅ Mixed Precision Training (FP16) 활성화")
            except (AttributeError, TypeError):
                # 하위 호환성: 구버전 PyTorch 지원
                try:
                    scaler = torch.cuda.amp.GradScaler()
                    ic("✅ Mixed Precision Training (FP16) 활성화 (구버전 API)")
                except AttributeError:
                    use_amp = False
        
        # Label smoothing 적용
        if label_smoothing > 0:
            criterion = nn.CrossEntropyLoss(label_smoothing=label_smoothing)
        
        progress_bar = tqdm(train_loader, desc="Training")
        
        for batch_idx, batch in enumerate(progress_bar):
            input_ids = batch['input_ids'].to(self.device, non_blocking=True)
            attention_mask = batch['attention_mask'].to(self.device, non_blocking=True)
            labels = batch['labels'].to(self.device, non_blocking=True)
            
            # Mixed Precision Training
            if use_amp and scaler:
                # FP16으로 순전파
                try:
                    # PyTorch 2.0+ 새로운 API
                    autocast_context = torch.amp.autocast('cuda')
                except (AttributeError, TypeError):
                    # 하위 호환성: 구버전 PyTorch
                    autocast_context = torch.cuda.amp.autocast()
                
                with autocast_context:
                    outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                    loss = criterion(outputs, labels)
                
                optimizer.zero_grad()
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                scaler.step(optimizer)
                scaler.update()
            else:
                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                loss = criterion(outputs, labels)
                
                optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                optimizer.step()
            
            scheduler.step()
            
            # 통계
            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
            progress_bar.set_postfix({
                'loss': loss.item(),
                'acc': 100 * correct / total
            })
        
        avg_loss = total_loss / len(train_loader)
        accuracy = correct / total
        
        return avg_loss, accuracy
    
    def evaluate(
        self,
        test_loader: DataLoader,
        criterion
    ) -> Tuple[float, float, np.ndarray, np.ndarray]:
        """평가 (다중 분류)"""
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        
        all_labels = []
        all_predictions = []
        
        with torch.no_grad():
            for batch in tqdm(test_loader, desc="Evaluating"):
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['labels'].to(self.device)
                
                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                loss = criterion(outputs, labels)
                
                total_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                
                all_labels.extend(labels.cpu().numpy())
                all_predictions.extend(predicted.cpu().numpy())
        
        avg_loss = total_loss / len(test_loader)
        accuracy = correct / total
        
        return avg_loss, accuracy, np.array(all_labels), np.array(all_predictions)
    
    def train(
        self,
        train_texts: List[str],
        train_labels: List[int],
        val_texts: List[str],
        val_labels: List[int],
        epochs: int = 3,
        batch_size: int = 8,
        learning_rate: float = 2e-5,
        max_length: int = 256,
        freeze_bert_layers: int = 8,
        early_stopping_patience: int = 2,
        use_amp: bool = True,
        label_smoothing: float = 0.0
    ) -> Dict[str, Any]:
        """
        감정 분류 모델 학습
        
        Args:
            train_texts: 학습 텍스트
            train_labels: 학습 라벨 (0~14)
            val_texts: 검증 텍스트
            val_labels: 검증 라벨 (0~14)
            epochs: 에폭 수
            batch_size: 배치 크기
            learning_rate: 학습률
            max_length: 최대 토큰 길이
            freeze_bert_layers: 동결할 BERT 레이어 수
            early_stopping_patience: Early stopping patience
            use_amp: Mixed Precision Training 사용 여부
            label_smoothing: Label smoothing 값 (0.0 = 비활성화)
        
        Returns:
            학습 결과 딕셔너리
        """
        ic(f"학습 시작: epochs={epochs}, batch_size={batch_size}, lr={learning_rate}")
        if use_amp and self.device.type == "cuda":
            ic("✅ Mixed Precision Training (FP16) 활성화")
        if label_smoothing > 0:
            ic(f"✅ Label Smoothing 활성화: {label_smoothing}")
        
        # BERT 레이어 동결
        if freeze_bert_layers > 0:
            if hasattr(self.model, 'freeze_bert_layers'):
                self.model.freeze_bert_layers(freeze_bert_layers)
                ic(f"BERT 레이어 {freeze_bert_layers}개 동결")
        
        # DataLoader 생성
        train_loader = self.create_dataloader(
            train_texts, train_labels, batch_size, max_length, shuffle=True
        )
        val_loader = self.create_dataloader(
            val_texts, val_labels, batch_size, max_length, shuffle=False
        )
        
        # 옵티마이저 및 스케줄러
        optimizer = AdamW(self.model.parameters(), lr=learning_rate, eps=1e-8)
        total_steps = len(train_loader) * epochs
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=int(0.1 * total_steps),
            num_training_steps=total_steps
        )
        
        # 손실 함수 (다중 분류, 클래스 불균형 처리)
        unique, counts = np.unique(train_labels, return_counts=True)
        if len(unique) > 1:
            class_weights = 1.0 / counts
            class_weights = class_weights / class_weights.sum() * len(unique)
            class_weights = torch.FloatTensor(class_weights).to(self.device)
            criterion = nn.CrossEntropyLoss(weight=class_weights)
        else:
            criterion = nn.CrossEntropyLoss()
        
        # Label smoothing 적용
        if label_smoothing > 0:
            criterion = nn.CrossEntropyLoss(label_smoothing=label_smoothing)
        
        # 학습 루프
        best_val_acc = 0.0
        patience_counter = 0
        history = {
            'train_loss': [],
            'train_acc': [],
            'val_loss': [],
            'val_acc': []
        }
        
        for epoch in range(epochs):
            ic(f"Epoch {epoch+1}/{epochs}")
            
            # 학습
            train_loss, train_acc = self.train_epoch(
                train_loader, optimizer, scheduler, criterion, use_amp=use_amp, label_smoothing=label_smoothing
            )
            
            # 평가
            val_loss, val_acc, _, _ = self.evaluate(val_loader, criterion)
            
            ic(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
            ic(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
            
            # 히스토리 저장
            history['train_loss'].append(train_loss)
            history['train_acc'].append(train_acc)
            history['val_loss'].append(val_loss)
            history['val_acc'].append(val_acc)
            
            # Best model 업데이트
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                patience_counter = 0
                ic(f"✅ Best model updated: Val Acc={best_val_acc:.4f}")
            else:
                patience_counter += 1
                ic(f"⚠️ Patience: {patience_counter}/{early_stopping_patience}")
                if patience_counter >= early_stopping_patience:
                    ic(f"Early stopping triggered")
                    break
        
        # 최종 결과
        results = {
            'final_val_accuracy': val_acc,
            'best_val_accuracy': best_val_acc,
            'final_val_loss': val_loss,
            'final_train_accuracy': train_acc,
            'final_train_loss': train_loss,
            'history': history
        }
        
        ic(f"학습 완료: 최종 검증 정확도={val_acc:.4f}, 최고 검증 정확도={best_val_acc:.4f}")
        
        return results
    
    def predict(
        self,
        texts: List[str],
        batch_size: int = 8,
        return_probs: bool = False
    ) -> Tuple[List[int], Optional[np.ndarray]]:
        """
        예측
        
        Args:
            texts: 예측할 텍스트 리스트
            batch_size: 배치 크기
            return_probs: 확률도 반환할지 여부
        
        Returns:
            (예측 결과 리스트, 확률 배열 (선택적))
        """
        self.model.eval()
        
        # DataLoader 생성
        dummy_labels = [0] * len(texts)  # 라벨은 사용하지 않지만 Dataset에 필요
        test_loader = self.create_dataloader(
            texts, dummy_labels, batch_size, shuffle=False
        )
        
        all_predictions = []
        all_probs = [] if return_probs else None
        
        with torch.no_grad():
            for batch in tqdm(test_loader, desc="Predicting"):
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                
                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                _, predicted = torch.max(outputs, 1)
                
                all_predictions.extend(predicted.cpu().numpy())
                
                if return_probs:
                    probs = torch.softmax(outputs, dim=1)
                    all_probs.append(probs.cpu().numpy())
        
        predictions = all_predictions
        
        if return_probs:
            probabilities = np.vstack(all_probs)
            return predictions, probabilities
        else:
            return predictions, None

