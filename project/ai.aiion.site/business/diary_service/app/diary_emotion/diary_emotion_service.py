"""
Diary Emotion Service
일기 감정 분류 딥러닝 서비스 (DL 전용)
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
import pickle
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

# ic 먼저 정의
try:
    from icecream import ic  # type: ignore
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# 공통 모듈 경로 추가 (business/diary_service/app이 루트)
sys.path.insert(0, str(Path(__file__).parent.parent))

# DL 전용 import
from diary_emotion.diary_emotion_dataset import DiaryEmotionDataSet
from diary_emotion.diary_emotion_method import DiaryEmotionMethod
from diary_emotion.diary_emotion_model import DiaryEmotionDLModel, TORCH_AVAILABLE
from diary_emotion.diary_emotion_dl_trainer import DiaryEmotionDLTrainer

DL_AVAILABLE = TORCH_AVAILABLE
if not DL_AVAILABLE:
    raise ImportError("딥러닝 라이브러리(PyTorch)가 필요합니다.")


class DiaryEmotionService:
    """일기 감정 분류 딥러닝 서비스 (DL 전용)"""
    
    def __init__(
        self,
        csv_file_path: Optional[Path] = None,
        dl_model_name: str = "koelectro_v3_base"  # 로컬 KoELECTRA v3 base 모델 사용
    ):
        """
        초기화 (DL 전용)
        
        Args:
            csv_file_path: CSV 파일 경로
            dl_model_name: 딥러닝 모델 이름 (기본: koelectro_v3_base)
        """
        self.dataset = DiaryEmotionDataSet()
        self.method = DiaryEmotionMethod()  # 전처리 메서드 클래스
        
        # DL 전용 설정
        self.model_type = "dl"
        self.dl_model_name = dl_model_name
        
        # CSV 파일 경로 (diary_copers.csv 사용)
        if csv_file_path is None:
            self.csv_file_path = Path(__file__).parent / "data" / "diary_copers.csv"
        else:
            self.csv_file_path = csv_file_path
        self.df: Optional[pd.DataFrame] = None
        
        # 모델 저장 경로 (중앙 저장소: models/trained_models/diary_emotion/)
        # Docker 환경: /app/models/trained_models/diary_emotion
        # 로컬 환경: ai.aiion.site/models/trained_models/diary_emotion
        docker_model_dir = Path("/app/models/trained_models/diary_emotion")
        if docker_model_dir.exists():
            self.model_dir = docker_model_dir
            ic(f"✅ Docker 중앙 저장소 사용: {self.model_dir}")
        else:
            # 로컬 환경: 상대 경로로 찾기
            current_dir = Path(__file__).parent  # diary_emotion
            app_dir = current_dir.parent  # app
            service_dir = app_dir.parent  # diary_service
            business_dir = service_dir.parent  # business
            ai_dir = business_dir.parent  # ai.aiion.site
            local_model_dir = ai_dir / "models" / "trained_models" / "diary_emotion"
            if local_model_dir.exists():
                self.model_dir = local_model_dir
                ic(f"✅ 로컬 중앙 저장소 사용: {self.model_dir}")
            else:
                # 하위 호환성: 기존 위치
                self.model_dir = Path(__file__).parent / "models"
                self.model_dir.mkdir(exist_ok=True)
                ic(f"⚠️ 중앙 저장소를 찾을 수 없어 기존 위치 사용: {self.model_dir}")
        
        # DL 모델 파일
        self.dl_model_file = self.model_dir / "diary_emotion_dl_model.pt"
        self.dl_metadata_file = self.model_dir / "diary_emotion_dl_metadata.pkl"
        
        # 딥러닝 모델 및 트레이너
        self.dl_model_obj: Optional[DiaryEmotionDLModel] = None
        self.dl_trainer: Optional[DiaryEmotionDLTrainer] = None
        
        ic("DiaryEmotionService 초기화: DL 전용 모드")
        
        # DL 라이브러리 확인
        if not DL_AVAILABLE:
            raise RuntimeError("딥러닝 라이브러리가 설치되지 않았습니다. PyTorch와 transformers를 설치하세요.")
        
        # 딥러닝 모델 초기화
        self._init_dl_model()
        
        # 서비스 시작 시 모델 자동 로드 시도
        self._try_load_model()
    
    def _init_dl_model(self):
        """딥러닝 모델 초기화 (DL 전용)"""
        try:
            # 감정 클래스 수 동적 계산 (데이터 로드 후)
            if self.df is not None and 'emotion' in self.df.columns:
                unique_emotions = self.df['emotion'].unique()
                num_labels = len(unique_emotions)
                ic(f"감정 클래스 수: {num_labels} (감정 값: {sorted(unique_emotions)})")
            else:
                num_labels = 15  # 기본값 (로그에서 확인된 클래스 수)
                ic(f"데이터 미로드, 기본 감정 클래스 수 사용: {num_labels}")
            
            self.dl_model_obj = DiaryEmotionDLModel(
                model_name=self.dl_model_name,
                num_labels=num_labels,  # 동적으로 계산된 감정 클래스 수
                max_length=512
            )
            ic(f"✅ DL 모델 초기화 완료: {self.dl_model_name}")
        except Exception as e:
            ic(f"❌ DL 모델 초기화 실패: {e}")
            raise RuntimeError(f"DL 모델 초기화 실패: {e}")
    
    def preprocess(self):
        """데이터 전처리"""
        ic("😎😎 전처리 시작")
        
        try:
            # CSV 파일 로드 (method 사용)
            self.df = self.method.load_csv(self.csv_file_path)
            ic(f"CSV 파일 경로: {self.csv_file_path}")
            ic(f"CSV 파일 존재 여부: {self.csv_file_path.exists()}")
            
            # 데이터 기본 정보 확인
            ic(f"컬럼: {list(self.df.columns)}")
            ic(f"데이터 타입: {self.df.dtypes.to_dict()}")
            
            # 결측치 처리 (method 사용)
            # text 컬럼이 있으면 text 사용, 없으면 content 사용 (하위 호환성)
            required_cols = ['text', 'emotion'] if 'text' in self.df.columns else ['content', 'emotion']
            self.df = self.method.handle_missing_values(self.df, required_cols)
            
            # 감정 분포 확인
            emotion_dist = self.method.get_label_distribution(self.df, 'emotion')
            if emotion_dist:
                ic(f"감정 분포: {emotion_dist}")
            
            # 텍스트 전처리 (method 사용)
            self.df = self.method.preprocess_text(self.df)
            
            # 감정 라벨 확인 (15개 클래스)
            emotion_labels_str = "0=평가불가, 1=기쁨, 2=슬픔, 3=분노, 4=두려움, 5=혐오, 6=놀람, 7=신뢰, 8=기대, 9=불안, 10=안도, 11=후회, 12=그리움, 13=감사, 14=외로움"
            ic(f"감정 라벨: {emotion_labels_str}")
            
            ic("😎😎 전처리 완료")
            
        except Exception as e:
            ic(f"전처리 오류: {e}")
            raise
    
    def learning(
        self, 
        epochs: int = 3, 
        batch_size: int = 8, 
        freeze_bert_layers: int = 8,
        learning_rate: float = 2e-5,
        max_length: int = 256,
        early_stopping_patience: int = 2,
        use_amp: bool = True,
        label_smoothing: float = 0.0  # Label smoothing (0.0 = 비활성화, 0.1 = 권장값)
    ):
        """모델 학습 (DL 전용)"""
        ic(f"😎😎 DL 학습 시작")
        
        return self._learning_dl(
            epochs=epochs, 
            batch_size=batch_size, 
            freeze_bert_layers=freeze_bert_layers,
            learning_rate=learning_rate,
            max_length=max_length,
            early_stopping_patience=early_stopping_patience,
            use_amp=use_amp,
            label_smoothing=label_smoothing
        )
    
    def _learning_dl(
        self, 
        epochs: int = 3, 
        batch_size: int = 8, 
        freeze_bert_layers: int = 8,
        learning_rate: float = 2e-5,
        max_length: int = 256,
        early_stopping_patience: int = 2,
        use_amp: bool = True,
        label_smoothing: float = 0.0  # Label smoothing (0.0 = 비활성화, 0.1 = 권장값)
    ):
        """딥러닝 모델 학습"""
        ic("😎😎 DL 학습 시작")
        
        try:
            if not DL_AVAILABLE:
                raise ImportError("딥러닝 라이브러리가 설치되지 않았습니다.")
            
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            
            # 모델 생성
            if self.dl_model_obj is None:
                self._init_dl_model()
            
            self.dl_model_obj.create_model(
                dropout_rate=0.3,
                hidden_size=256  # 중간 레이어 추가
            )
            
            # 트레이너 생성
            self.dl_trainer = DiaryEmotionDLTrainer(
                model=self.dl_model_obj.model,
                tokenizer=self.dl_model_obj.tokenizer,
                device=self.dl_model_obj.device
            )
            
            # 데이터 준비
            texts = self.df['text'].tolist()
            labels = self.df['emotion'].tolist()
            
            # 학습/검증 분할
            train_texts, val_texts, train_labels, val_labels = train_test_split(
                texts, labels, test_size=0.2, random_state=42, stratify=labels
            )
            
            ic(f"학습 데이터: {len(train_texts)}개, 검증 데이터: {len(val_texts)}개")
            
            # 학습 (파라미터 전달)
            history = self.dl_trainer.train(
                train_texts=train_texts,
                train_labels=train_labels,
                val_texts=val_texts,
                val_labels=val_labels,
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                max_length=max_length,
                freeze_bert_layers=freeze_bert_layers,
                early_stopping_patience=early_stopping_patience,
                use_amp=use_amp,
                label_smoothing=label_smoothing
            )
            
            # 학습 데이터셋 저장
            self.dataset.train = pd.DataFrame({
                'text': train_texts,
                'emotion': train_labels
            })
            self.dataset.test = pd.DataFrame({
                'text': val_texts,
                'emotion': val_labels
            })
            
            ic(f"최종 검증 정확도: {history['final_val_accuracy']:.4f}")
            ic("😎😎 DL 학습 완료")
            
            return history
            
        except Exception as e:
            ic(f"DL 학습 오류: {e}")
            raise
    
    def evaluate(self):
        """모델 평가 (DL 전용)"""
        return self._evaluate_dl()
    
    def _evaluate_dl(self):
        """DL 모델 평가"""
        ic("😎😎 DL 평가 시작")
        
        try:
            if not DL_AVAILABLE:
                raise ImportError("딥러닝 라이브러리가 설치되지 않았습니다.")
            
            if self.dl_model_obj is None or self.dl_model_obj.model is None:
                raise ValueError("DL 모델이 없습니다. learning()을 먼저 실행하세요.")
            
            # 테스트 데이터셋이 없으면 자동으로 재생성
            if self.dataset.test is None:
                ic("테스트 데이터셋이 없어서 자동으로 재생성합니다...")
                if self.df is None:
                    # 데이터가 없으면 전처리부터 실행
                    self.preprocess()
                
                # 학습/테스트 분할 재생성 (학습 시와 동일한 방식)
                texts = self.df['text'].tolist()
                labels = self.df['emotion'].tolist()
                
                train_texts, val_texts, train_labels, val_labels = train_test_split(
                    texts, labels, test_size=0.2, random_state=42, stratify=labels
                )
                
                # 테스트 데이터셋만 저장 (평가에 필요)
                self.dataset.test = pd.DataFrame({
                    'text': val_texts,
                    'emotion': val_labels
                })
                ic(f"테스트 데이터셋 재생성 완료: {len(self.dataset.test)}개")
            
            # 트레이너가 없으면 생성
            if self.dl_trainer is None:
                self.dl_trainer = DiaryEmotionDLTrainer(
                    model=self.dl_model_obj.model,
                    tokenizer=self.dl_model_obj.tokenizer,
                    device=self.dl_model_obj.device
                )
            
            # 테스트 데이터 준비
            test_texts = self.dataset.test['text'].tolist()
            test_labels = self.dataset.test['emotion'].tolist()
            
            # DataLoader 생성
            from torch.utils.data import DataLoader
            from diary_emotion.diary_emotion_dl_trainer import EmotionDataset
            
            test_dataset = EmotionDataset(
                texts=test_texts,
                labels=test_labels,
                tokenizer=self.dl_model_obj.tokenizer,
                max_length=256
            )
            test_loader = DataLoader(test_dataset, batch_size=8, shuffle=False)
            
            # 손실 함수
            import torch.nn as nn
            criterion = nn.CrossEntropyLoss()
            
            # 평가 실행
            avg_loss, accuracy, y_true, y_pred = self.dl_trainer.evaluate(test_loader, criterion)
            
            ic(f"DL 정확도: {accuracy:.4f}, 평균 손실: {avg_loss:.4f}")
            
            # 분류 보고서
            emotion_labels = {
                0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람',
                7: '신뢰', 8: '기대', 9: '불안', 10: '안도', 11: '후회', 12: '그리움', 13: '감사', 14: '외로움'
            }
            unique_classes = sorted(set(list(y_true) + list(y_pred)))
            target_names = [emotion_labels.get(i, f'클래스{i}') for i in unique_classes]
            report = classification_report(
                y_true, y_pred,
                target_names=target_names,
                output_dict=True,
                zero_division=0
            )
            ic(f"DL 분류 보고서:\n{classification_report(y_true, y_pred, target_names=target_names, zero_division=0)}")
            
            # 혼동 행렬
            cm = confusion_matrix(y_true, y_pred)
            ic(f"DL 혼동 행렬:\n{cm}")
            
            ic("😎😎 DL 평가 완료")
            
            return {
                'model_type': 'dl',
                'accuracy': float(accuracy),
                'avg_loss': float(avg_loss),
                'classification_report': report,
                'confusion_matrix': cm.tolist()
            }
            
        except Exception as e:
            ic(f"DL 평가 오류: {e}")
            raise
    
    def predict(self, text: str) -> Dict[str, Any]:
        """
        텍스트 감정 예측 (DL 전용)
        
        Args:
            text: 예측할 텍스트
        
        Returns:
            예측 결과 딕셔너리
        """
        return self._predict_dl(text)
    def _predict_dl(self, text: str) -> Dict[str, Any]:
        """DL 모델 예측"""
        try:
            if not DL_AVAILABLE:
                raise ImportError("딥러닝 라이브러리가 설치되지 않았습니다.")
            
            if self.dl_model_obj is None or self.dl_model_obj.model is None:
                raise ValueError("DL 모델이 없습니다. learning()을 먼저 실행하세요.")
            
            if self.dl_trainer is None:
                # 트레이너 생성
                self.dl_trainer = DiaryEmotionDLTrainer(
                    model=self.dl_model_obj.model,
                    tokenizer=self.dl_model_obj.tokenizer,
                    device=self.dl_model_obj.device
                )
            
            # 예측 및 확률 계산
            predictions, probabilities = self.dl_trainer.predict([text], batch_size=1, return_probs=True)
            prediction = predictions[0]
            probabilities = probabilities[0]  # 첫 번째 텍스트의 확률
            
            # 감정 라벨 매핑 (15개 클래스)
            emotion_labels = {
                0: '평가불가', 1: '기쁨', 2: '슬픔', 3: '분노', 4: '두려움', 5: '혐오', 6: '놀람',
                7: '신뢰', 8: '기대', 9: '불안', 10: '안도', 11: '후회', 12: '그리움', 13: '감사', 14: '외로움'
            }
            
            # 가중치 조정 전 확률 확인 (디버깅)
            original_max_prob = float(np.max(probabilities))
            original_prediction = int(np.argmax(probabilities))
            ic(f"DL 원본 예측: {emotion_labels.get(original_prediction, '알 수 없음')} (확률: {original_max_prob:.4f})")
            
            # 상위 3개 확률 출력 (디버깅)
            top3_indices = np.argsort(probabilities)[-3:][::-1]
            ic("DL 원본 상위 3개 확률:")
            for idx in top3_indices:
                ic(f"  {emotion_labels.get(idx, '알 수 없음')}: {probabilities[idx]:.4f}")
            
            # 감정별 가중치 조정 적용
            probabilities = self._apply_emotion_weights(probabilities, emotion_labels)
            
            # 상위 3개 감정에 확률 집중 (Temperature Scaling + Top-3 Boosting)
            probabilities = self._concentrate_top3_probabilities(probabilities, emotion_labels)
            
            # 가중치 조정 후 최종 예측 (최대 확률)
            final_prediction = int(np.argmax(probabilities))
            emotion_label = emotion_labels.get(final_prediction, '알 수 없음')
            final_confidence = float(probabilities[final_prediction])
            
            ic(f"DL 최종 예측: {emotion_label} (확률: {final_confidence:.4f})")
            
            # 확률 딕셔너리 생성
            prob_dict = {}
            for idx, label in emotion_labels.items():
                if idx < len(probabilities):
                    prob_dict[label] = float(probabilities[idx])
            
            return {
                'emotion': final_prediction,
                'emotion_label': emotion_label,
                'probabilities': prob_dict,
                'confidence': final_confidence,
                'model_type': 'dl',
                'original_confidence': original_max_prob  # 디버깅용
            }
            
        except Exception as e:
            ic(f"DL 예측 오류: {e}")
            raise
    
    def _concentrate_top3_probabilities(self, probabilities: np.ndarray, emotion_labels: Dict[int, str]) -> np.ndarray:
        """
        상위 3개 감정에 확률을 집중시킵니다.
        
        전략:
        1. 상위 3개 감정을 찾습니다
        2. 상위 3개의 확률은 증폭하고, 나머지는 크게 감소시킵니다
        3. 재정규화하여 합이 1이 되도록 합니다
        
        Args:
            probabilities: 감정별 확률 배열 (15개 클래스)
            emotion_labels: 감정 라벨 딕셔너리
        
        Returns:
            상위 3개에 집중된 확률 배열
        """
        # 상위 3개 인덱스 찾기
        top3_indices = np.argsort(probabilities)[-3:][::-1]
        
        # 디버깅: 상위 3개 확률 출력
        ic("상위 3개 감정 (집중 전):")
        for idx in top3_indices:
            ic(f"  {emotion_labels.get(idx, '알 수 없음')}: {probabilities[idx]:.4f}")
        
        # 새로운 확률 배열 생성
        concentrated_probs = np.zeros_like(probabilities)
        
        # 상위 3개의 확률을 제곱하여 증폭 (Temperature Scaling 효과)
        # 예: 0.1 -> 0.01, 0.2 -> 0.04, 0.3 -> 0.09
        # 그 다음 정규화하면 비율이 크게 변합니다
        for idx in top3_indices:
            # 확률을 제곱하여 상위권과 하위권의 차이를 극대화
            concentrated_probs[idx] = probabilities[idx] ** 0.5  # 제곱근으로 약간만 증폭 (너무 극단적이지 않게)
        
        # 나머지는 매우 작은 값으로 설정 (완전히 0은 아님)
        for idx in range(len(probabilities)):
            if idx not in top3_indices:
                concentrated_probs[idx] = probabilities[idx] * 0.01  # 1%만 남김
        
        # 정규화 (확률 합이 1이 되도록)
        concentrated_probs = concentrated_probs / (concentrated_probs.sum() + 1e-10)
        
        # 디버깅: 상위 3개 확률 출력 (집중 후)
        ic("상위 3개 감정 (집중 후):")
        for idx in top3_indices:
            ic(f"  {emotion_labels.get(idx, '알 수 없음')}: {concentrated_probs[idx]:.4f}")
        
        return concentrated_probs
    
    def _apply_keyword_weights(self, text: str, probabilities: np.ndarray, emotion_labels: Dict[int, str]) -> np.ndarray:
        """키워드 기반 가중치를 적용하여 확률 보정"""
        # 텍스트를 소문자로 변환하여 검색
        text_lower = text.lower()
        
        # 감정별 키워드 및 가중치 정의
        keyword_weights = {
            # 평가불가 (중립적 내용: 공문서, 메모, 단순 기록) - 매우 제한적으로만 적용
            0: {  # 평가불가
                'keywords': [
                    # 공문서/공무 관련 (구체적인 공식 용어만)
                    '공문', '공무를', '공무를 봤다', '공무를 보았다', '공무를 본', '공무를 보고',
                    '공문서', '공문을', '공문을 써', '공문을 보냈다', '공문을 작성',
                    '동헌에 나가', '동헌에서', '동헌에',
                    # 문서/보고서 관련 (공식적인 용어만)
                    '문서 작성', '문서 작성했다', '문서를 작성',
                    '보고서', '보고서를', '보고를 작성',
                    '시행', '시달', '결재', '승인', '결재했다', '승인했다',
                    '회의록', '회의를 진행', '회의를 했다',
                    '안건', '안건을', '안건 처리', '안건을 처리',
                    # 메모/기록 관련 (공식적인 용어만)
                    '메모를 작성', '메모를 했다',
                    '기록을 작성', '기록을 했다',
                    # 공식적/업무적 표현
                    '부임', '부임했다', '부임하여'
                ],
                'weight': 0.1  # 가중치 대폭 낮춤 (0.3 -> 0.1): 평가불가 판정을 최소화
            },
            # 긍정적 감정 (기쁨, 감사, 신뢰, 기대, 안도) - 가중치 +1
            1: {  # 기쁨
                'keywords': [
                    # 기본 긍정 표현
                    '행복', '즐거움', '기쁨', '신남', '설렘', '웃음', '웃었다', '웃고', '즐겁', '재미있', '재밌', 
                    '좋았', '좋다', '좋아', '만족', '기쁘', '신나', '즐거', '행복하', '행복한',
                    '기분 좋', '기분 좋았', '기분 좋다', '기분 좋아', '기분이 좋', '기분이 좋았', '기분이 좋다',
                    '맛있', '맛있어', '맛있었', '맛있다', '맛있네', '맛있고',
                    # 비속어/신조어 - 긍정 강조 표현
                    '개좋', '개쩐', '개재밌', '개신나', '개만족', '개행복', '개즐거', '개기쁨', '개웃김', '개웃겨',
                    '존나좋', '존나좋아', '존나좋다', '존맛', '존맛탱', '존재밌', '존신나', '존만족', '존행복',
                    '완전좋', '완전재밌', '완전행복', '완전만족', '완전기쁨', '완전즐거',
                    '진짜좋', '진짜재밌', '진짜행복', '진짜만족', '진짜기쁨',
                    '너무좋', '너무재밌', '너무행복', '너무만족', '너무기쁨',
                    '대박', '대박나', '대박이야', '대박이다',
                    '최고', '최고다', '최고야', '최고임',
                    '짱', '짱이야', '짱이다', '짱임',
                    '헐', '헐대박', '헐개좋', '헐재밌'
                ],
                'weight': 1.5  # 비속어/신조어 포함으로 가중치 약간 증가
            },
            13: {  # 감사
                'keywords': ['감사', '고맙', '고마워', '감사하', '감사한', '고마', '고맙다', '감사하다', '고마워요', '고맙습니다'],
                'weight': 1.0
            },
            7: {  # 신뢰
                'keywords': ['믿음', '믿', '신뢰', '믿을', '믿고', '믿는다', '신뢰하', '신뢰할'],
                'weight': 1.0
            },
            8: {  # 기대
                'keywords': ['기대', '기대되', '기대한', '기대하', '기대된다', '기대돼', '기대해', '기대할'],
                'weight': 1.0
            },
            10: {  # 안도
                'keywords': ['안심', '편안', '안도', '안도감', '안심되', '편안하', '편안한', '안심하', '안도하', '안심된다', '편안하다'],
                'weight': 1.0
            },
            # 부정적 감정 (슬픔, 분노, 두려움, 혐오, 불안, 후회, 외로움) - 가중치 +2
            2: {  # 슬픔
                'keywords': [
                    # 기본 슬픔 표현
                    '슬프', '슬픔', '눈물', '울었', '울고', '슬퍼', '슬펐', '슬프다', '슬퍼서', '눈물이', '눈물을', '우울', '우울하', '우울한', '슬프네', '슬프고',
                    '아쉬', '아쉬워', '아쉬웠', '아쉬웠다', '아쉽', '아쉽다', '아쉬워서', '아쉬웠어',
                    # 비속어/신조어 - 슬픔 강조 표현
                    '개슬프', '개우울', '개눈물', '개슬퍼',
                    '존나슬프', '존나우울', '존나눈물',
                    '완전슬프', '완전우울', '완전눈물',
                    '진짜슬프', '진짜우울', '진짜눈물'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            3: {  # 분노
                'keywords': [
                    # 기본 분노 표현
                    '화나', '화났', '짜증', '분노', '화가', '화났다', '짜증나', '짜증났', '화나서', '분노하', '분노한', '화났어', '짜증나네', '화나네',
                    # 비속어/신조어 - 분노 강조 표현
                    '개짜증', '개화나', '개분노', '개빡', '개빡쳐', '개빡쳤', '개빡침',
                    '존나짜증', '존나화나', '존나분노', '존나빡', '존나빡쳐',
                    '완전짜증', '완전화나', '완전분노', '완전빡',
                    '진짜짜증', '진짜화나', '진짜분노', '진짜빡',
                    '너무짜증', '너무화나', '너무분노',
                    '핵짜증', '핵빡', '핵빡침'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            4: {  # 두려움
                'keywords': [
                    # 기본 두려움 표현
                    '무섭', '두렵', '두려움', '무서워', '무서웠', '두려워', '두려웠', '무서', '두려', '무섭다', '두렵다', '무서웠다', '두려웠다', '무서워서', '두려워서',
                    # 비속어/신조어 - 두려움 강조 표현
                    '개무서', '개두려', '개무섭', '개무서워',
                    '존나무서', '존나두려', '존나무섭',
                    '완전무서', '완전두려', '완전무섭',
                    '진짜무서', '진짜두려', '진짜무섭',
                    '겁나무서', '겁나두려', '겁나무섭'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            5: {  # 혐오
                'keywords': [
                    # 기본 혐오 표현
                    '싫', '혐오', '싫어', '싫다', '싫었', '싫은', '혐오하', '혐오스러', '싫어서', '싫어요', '싫어해', '혐오스럽', '혐오스러워',
                    # 비속어/신조어 - 혐오 강조 표현
                    '개싫', '개역겹', '개더러워', '개더러움', '개징그러워', '개징그럽',
                    '존나싫', '존나역겹', '존나더러워', '존나징그러워', '존나징그럽',
                    '씹노맛', '씹극혐', '씹역겹', '씹더러워', '씹징그러워',
                    '완전싫', '완전역겹', '완전더러워', '완전징그러워',
                    '진짜싫', '진짜역겹', '진짜더러워', '진짜징그러워',
                    '핵불쾌', '핵역겹', '핵더러워', '핵징그러워',
                    '극혐', '토나와', '쌉', '쌉싫'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            9: {  # 불안
                'keywords': [
                    # 기본 불안 표현
                    '불안', '걱정', '불안하', '불안한', '걱정되', '걱정하', '걱정이', '불안해', '불안하다', '걱정된다', '걱정돼', '불안감', '걱정스러',
                    # 비속어/신조어 - 불안 강조 표현
                    '개불안', '개걱정', '개걱정되', '개걱정돼',
                    '존나불안', '존나걱정', '존나걱정되',
                    '완전불안', '완전걱정', '완전걱정되',
                    '진짜불안', '진짜걱정', '진짜걱정되'
                ],
                'weight': 2.3  # 비속어/신조어 포함으로 가중치 증가 (2.5 -> 2.3: 부정 감정 과대평가 완화)
            },
            11: {  # 후회
                'keywords': ['후회', '후회하', '후회한', '후회되', '후회돼', '후회해', '후회한다', '후회하고', '후회했', '후회할'],
                'weight': 1.8  # 2.0 -> 1.8: 부정 감정 과대평가 완화
            },
            14: {  # 외로움
                'keywords': ['외롭', '외로움', '외로워', '외로웠', '외롭다', '외로워서', '외로웠다', '외롭네', '외롭고', '외로워요'],
                'weight': 1.8  # 2.0 -> 1.8: 부정 감정 과대평가 완화
            },
            # 중립적 감정 (그리움, 놀람) - 최소 가중치
            12: {  # 그리움
                'keywords': ['그립', '그리움', '그리워', '그리웠', '그리다', '그리워서', '그리웠다', '보고싶', '보고싶어', '보고싶다', '보고싶었'],
                'weight': 0.5
            },
            6: {  # 놀람
                'keywords': ['놀랍', '놀람', '놀라', '놀랐', '의외', '놀랐다', '놀라워', '놀라웠', '의외다', '의외네', '놀라서', '놀랐어'],
                'weight': 0.5
            }
        }
        
        # 각 감정별로 키워드 매칭 및 가중치 계산
        weight_scores = np.zeros(len(probabilities))
        
        for emotion_id, config in keyword_weights.items():
            if emotion_id >= len(probabilities):
                continue
                
            keywords = config['keywords']
            weight = config['weight']
            
            # 키워드 매칭 개수 계산
            match_count = sum(1 for keyword in keywords if keyword in text_lower)
            
            # 키워드 매칭 기반 가중치 적용 (Word2Vec 제거됨)
            if match_count > 0:
                # 키워드가 발견되면 가중치 적용 (매칭 개수에 비례)
                weight_scores[emotion_id] = match_count * weight
                ic(f"감정 {emotion_labels.get(emotion_id, emotion_id)}: {match_count}개 키워드 매칭, 가중치 {weight_scores[emotion_id]:.3f}")
        
        # 가중치를 확률에 적용 (소프트맥스 방식)
        if weight_scores.sum() > 0:
            # 가중치를 정규화하여 확률에 더함
            normalized_weights = weight_scores / (weight_scores.sum() + 1e-10) * 0.25  # 최대 25% 보정 (15% -> 25%로 증가)
            adjusted_probs = probabilities + normalized_weights
            
            # 평가불가 확률 추가 감소: 다른 감정 키워드가 발견되면 평가불가 확률을 더 낮춤
            if len(probabilities) > 0:
                # 평가불가(0번)를 제외한 다른 감정의 가중치 합 계산
                other_emotions_weight = weight_scores[1:].sum() if len(weight_scores) > 1 else 0
                
                # 다른 감정 키워드가 발견되었고 평가불가 키워드가 없으면 평가불가 확률 감소
                if other_emotions_weight > 0 and weight_scores[0] == 0:
                    # 평가불가 확률을 10% 감소
                    adjusted_probs[0] = adjusted_probs[0] * 0.9
                    ic(f"다른 감정 키워드 발견 ({other_emotions_weight:.2f}), 평가불가 확률 10% 감소")
                elif other_emotions_weight > weight_scores[0] * 2:
                    # 다른 감정 키워드가 평가불가 키워드보다 2배 이상 많으면 평가불가 확률 10% 감소
                    adjusted_probs[0] = adjusted_probs[0] * 0.9
                    ic(f"다른 감정 키워드가 우세 ({other_emotions_weight:.2f} vs {weight_scores[0]:.2f}), 평가불가 확률 10% 감소")
            
            # 확률이 1을 넘지 않도록 정규화
            adjusted_probs = adjusted_probs / (adjusted_probs.sum() + 1e-10)
            
            return adjusted_probs
        
        return probabilities
    
    def _apply_emotion_weights(self, probabilities: np.ndarray, emotion_labels: Dict[int, str]) -> np.ndarray:
        """
        감정별 가중치 조정 (DL 모델용 - 미세 조정)
        
        DL 모델은 BERT/ELECTRA 같은 사전 학습 모델로 문맥을 잘 이해하므로,
        ML 모델보다 훨씬 작은 가중치 조정만 적용합니다.
        
        Args:
            probabilities: 감정별 확률 배열 (15개 클래스)
            emotion_labels: 감정 라벨 딕셔너리
        
        Returns:
            가중치 조정된 확률 배열
        """
        # DL 모델은 이미 문맥을 잘 이해하므로 큰 조정 불필요
        # 필요시 미세 조정만 적용 (예: 5-10% 수준)
        
        # 확률 딕셔너리로 변환 (가중치 조정 편의를 위해)
        prob_dict = {}
        for idx, label in emotion_labels.items():
            if idx < len(probabilities):
                prob_dict[label] = float(probabilities[idx])
        
        # DL 모델용 미세 가중치 조정 (ML의 1.2/0.8 대신 1.05/0.95 수준)
        # 불안: 약간 증가 (5% 증가) - ML의 20% 증가 대비 매우 작음
        if "불안" in prob_dict and prob_dict["불안"] > 0.1:  # 불안 확률이 일정 수준 이상일 때만
            prob_dict["불안"] *= 1.05
            ic(f"DL 불안 확률 미세 조정: {prob_dict['불안']:.4f}")
        
        # 기대: 약간 감소 (5% 감소) - ML의 20% 감소 대비 매우 작음
        if "기대" in prob_dict and prob_dict["기대"] > 0.1:  # 기대 확률이 일정 수준 이상일 때만
            prob_dict["기대"] *= 0.95
            ic(f"DL 기대 확률 미세 조정: {prob_dict['기대']:.4f}")
        
        # 딕셔너리를 다시 배열로 변환
        adjusted_probs = np.array([prob_dict.get(emotion_labels.get(i, ''), 0.0) for i in range(len(probabilities))])
        
        # 정규화 전 확인 (디버깅)
        before_norm_max = float(np.max(adjusted_probs))
        before_norm_sum = float(adjusted_probs.sum())
        
        # 정규화 (확률 합이 1이 되도록)
        adjusted_probs = adjusted_probs / (adjusted_probs.sum() + 1e-10)
        
        # 정규화 후 확인 (디버깅)
        after_norm_max = float(np.max(adjusted_probs))
        after_norm_sum = float(adjusted_probs.sum())
        ic(f"DL 가중치 조정: 정규화 전 최대={before_norm_max:.4f}, 합={before_norm_sum:.4f} -> 정규화 후 최대={after_norm_max:.4f}, 합={after_norm_sum:.4f}")
        
        return adjusted_probs
    
    def _try_load_model(self):
        """모델 파일이 있으면 자동 로드 (DL 전용)"""
        try:
            # DL 모델 자동 로드
            if self.dl_model_file.exists():
                ic("DL 모델 파일 발견, 자동 로드 시도...")
                return self._load_model_dl()
            
            return False
        except Exception as e:
            ic(f"모델 자동 로드 실패: {e}")
            return False
    
    def save_model(self):
        """모델을 파일로 저장 (DL 전용)"""
        return self._save_model_dl()
    
    def _save_model_dl(self):
        """DL 모델 저장"""
        try:
            if not DL_AVAILABLE:
                raise ImportError("딥러닝 라이브러리가 설치되지 않았습니다.")
            
            if self.dl_model_obj is None or self.dl_model_obj.model is None:
                raise ValueError("DL 모델이 학습되지 않았습니다. learning()을 먼저 실행하세요.")
            
            # 모델 디렉토리 생성
            self.model_dir.mkdir(parents=True, exist_ok=True)
            
            # 모델 저장 (PyTorch)
            # 로컬 GPU에서 학습한 모델을 컨테이너에서도 사용 가능하도록 CPU로 변환하여 저장
            import torch
            model_state_dict = self.dl_model_obj.model.state_dict()
            
            # GPU에서 학습한 모델을 CPU로 변환 (컨테이너 호환성)
            cpu_state_dict = {}
            for key, value in model_state_dict.items():
                cpu_state_dict[key] = value.cpu()
            
            # 모델 구조 정보 추출 (hidden_size 확인)
            hidden_size = None
            if hasattr(self.dl_model_obj.model, 'classifier'):
                classifier = self.dl_model_obj.model.classifier
                # Sequential인 경우 (2-layer): classifier[0]이 Linear
                if isinstance(classifier, torch.nn.Sequential) and len(classifier) > 0:
                    if isinstance(classifier[0], torch.nn.Linear):
                        hidden_size = classifier[0].out_features
                # Linear인 경우 (1-layer): hidden_size는 None
                elif isinstance(classifier, torch.nn.Linear):
                    hidden_size = None
            
            torch.save({
                'model_state_dict': cpu_state_dict,  # CPU로 변환된 상태 저장
                'model_name': self.dl_model_obj.model_name,
                'num_labels': self.dl_model_obj.num_labels,
                'max_length': self.dl_model_obj.max_length,
                'hidden_size': hidden_size  # 모델 구조 정보 저장
            }, self.dl_model_file)
            ic(f"DL 모델 저장 완료: {self.dl_model_file} (CPU 호환 형식으로 저장, hidden_size={hidden_size})")
            
            # 메타데이터 저장
            csv_mtime = self.csv_file_path.stat().st_mtime
            metadata = {
                'model_type': 'dl',
                'model_name': self.dl_model_obj.model_name,
                'num_labels': self.dl_model_obj.num_labels,  # 감정 클래스 수 저장
                'max_length': self.dl_model_obj.max_length,
                'hidden_size': hidden_size,  # 모델 구조 정보 저장
                'csv_mtime': csv_mtime,
                'csv_path': str(self.csv_file_path),
                'trained_at': datetime.now().isoformat(),
                'data_count': len(self.df) if self.df is not None else 0
            }
            with open(self.dl_metadata_file, 'wb') as f:
                pickle.dump(metadata, f)
            ic(f"DL 메타데이터 저장 완료: {self.dl_metadata_file}")
            
        except Exception as e:
            ic(f"DL 모델 저장 오류: {e}")
            raise
    
    def load_model(self):
        """모델 로드 (DL 전용)"""
        return self._load_model_dl()
    
    def _load_model_dl(self):
        """DL 모델 로드"""
        try:
            if not DL_AVAILABLE:
                ic("딥러닝 라이브러리가 설치되지 않았습니다.")
                return False
            
            # torch import (함수 시작 부분에서)
            import torch
            
            if not self.dl_model_file.exists():
                ic(f"DL 모델 파일이 없습니다: {self.dl_model_file}")
                return False
            
            # 메타데이터 로드
            with open(self.dl_metadata_file, 'rb') as f:
                metadata = pickle.load(f)
            
            # 모델 초기화
            if self.dl_model_obj is None:
                # 메타데이터에서 num_labels 가져오기 (없으면 동적 계산)
                num_labels = metadata.get('num_labels', None)
                if num_labels is None and self.df is not None and 'emotion' in self.df.columns:
                    unique_emotions = self.df['emotion'].unique()
                    num_labels = len(unique_emotions)
                elif num_labels is None:
                    num_labels = 15  # 기본값
                
                self.dl_model_obj = DiaryEmotionDLModel(
                    model_name=metadata['model_name'],
                    num_labels=num_labels,
                    max_length=metadata.get('max_length', 512)
                )
            
            # 메타데이터에서 hidden_size 가져오기 (모델 구조 일치)
            hidden_size = metadata.get('hidden_size', None)
            # checkpoint에서도 확인 (메타데이터에 없을 경우)
            if hidden_size is None:
                checkpoint = torch.load(self.dl_model_file, map_location='cpu')
                hidden_size = checkpoint.get('hidden_size', None)
            
            ic(f"모델 로드: hidden_size={hidden_size} (None이면 1-layer, 값이 있으면 2-layer)")
            self.dl_model_obj.create_model(dropout_rate=0.3, hidden_size=hidden_size)
            
            # 모델 상태 로드
            checkpoint = torch.load(self.dl_model_file, map_location=self.dl_model_obj.device)
            self.dl_model_obj.model.load_state_dict(checkpoint['model_state_dict'])
            self.dl_model_obj.model.eval()
            
            # 트레이너 생성
            self.dl_trainer = DiaryEmotionDLTrainer(
                model=self.dl_model_obj.model,
                tokenizer=self.dl_model_obj.tokenizer,
                device=self.dl_model_obj.device
            )
            
            ic("DL 모델 로드 완료")
            return True
            
        except Exception as e:
            ic(f"DL 모델 로드 오류: {e}")
            return False
    
    def submit(self):
        """제출/모델 저장"""
        ic("😎😎 제출 시작")
        self.save_model()
        ic("😎😎 제출 완료")

