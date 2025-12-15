"""
Diary MBTI Service
일기 MBTI 분류 딥러닝 서비스 (DL 전용)
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Any
import pandas as pd
import numpy as np
import pickle
from datetime import datetime

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

from diary_mbti.diary_mbti_dataset import DiaryMbtiDataSet
from diary_mbti.diary_mbti_method import DiaryMbtiMethod

# 딥러닝 모델 및 트레이너
try:
    from diary_mbti.diary_mbti_model import DiaryMbtiDLModel, TORCH_AVAILABLE
    from diary_mbti.diary_mbti_dl_trainer import DiaryMbtiDLTrainer
    DL_AVAILABLE = TORCH_AVAILABLE
except ImportError:
    DL_AVAILABLE = False
    ic("경고: 딥러닝 모델을 사용할 수 없습니다.")


class DiaryMbtiService:
    """일기 MBTI 분류 딥러닝 서비스 (DL 전용, KoELECTRA 기반)"""
    
    def __init__(
        self, 
        json_files: Optional[Dict[str, Path]] = None,
        dl_model_name: str = "koelectro_v3_base"  # 로컬 KoELECTRA v3 base 모델 사용
    ):
        """
        초기화 (DL 전용, JSON 전용)
        
        Args:
            json_files: JSON 파일 경로 (리스트 또는 딕셔너리)
                       - 리스트: [{'E_I': path, ...}, {'E_I': path, ...}] (여러 파일셋)
                       - 딕셔너리: {'E_I': path, 'S_N': path, ...} (단일 파일셋)
            dl_model_name: 딥러닝 모델 이름 (기본: koelectro_v3_base)
        """
        self.dataset = DiaryMbtiDataSet()
        self.mbti_labels = ['E_I', 'S_N', 'T_F', 'J_P']  # MBTI 4개 차원
        self.method = DiaryMbtiMethod(self.mbti_labels)  # 전처리 메서드 클래스
        
        # DL 전용 설정
        self.dl_model_name = dl_model_name
        
        # JSON 파일 경로 (필수)
        if json_files is None:
            raise ValueError("json_files는 필수입니다. JSON 파일 경로를 제공하세요.")
        self.json_files = json_files
        
        self.df: Optional[pd.DataFrame] = None
        
        # 모델 저장 경로 (중앙 저장소: models/trained_models/diary_mbti/)
        # Docker 환경: /app/models/trained_models/diary_mbti
        # 로컬 환경: ai.aiion.site/models/trained_models/diary_mbti
        docker_model_dir = Path("/app/models/trained_models/diary_mbti")
        if docker_model_dir.exists():
            self.model_dir = docker_model_dir
            ic(f"✅ Docker 중앙 저장소 사용: {self.model_dir}")
        else:
            # 로컬 환경: 상대 경로로 찾기
            current_dir = Path(__file__).parent  # diary_mbti
            app_dir = current_dir.parent  # app
            service_dir = app_dir.parent  # diary_service
            business_dir = service_dir.parent  # business
            ai_dir = business_dir.parent  # ai.aiion.site
            local_model_dir = ai_dir / "models" / "trained_models" / "diary_mbti"
            if local_model_dir.exists():
                self.model_dir = local_model_dir
                ic(f"✅ 로컬 중앙 저장소 사용: {self.model_dir}")
            else:
                # 하위 호환성: 기존 위치
                self.model_dir = Path(__file__).parent / "models"
                self.model_dir.mkdir(parents=True, exist_ok=True)
                ic(f"⚠️ 중앙 저장소를 찾을 수 없어 기존 위치 사용: {self.model_dir}")
        
        # DL 모델 파일 (4개 차원별)
        self.dl_model_files = {
            'E_I': self.model_dir / "diary_mbti_e_i_dl_model.pt",
            'S_N': self.model_dir / "diary_mbti_s_n_dl_model.pt",
            'T_F': self.model_dir / "diary_mbti_t_f_dl_model.pt",
            'J_P': self.model_dir / "diary_mbti_j_p_dl_model.pt"
        }
        self.dl_metadata_file = self.model_dir / "diary_mbti_dl_metadata.pkl"
        
        # 딥러닝 모델 및 트레이너
        self.dl_model_obj: Optional[DiaryMbtiDLModel] = None
        self.dl_trainer: Optional[DiaryMbtiDLTrainer] = None
        
        # 모델 저장 경로 로그 출력
        ic(f"모델 저장 디렉토리: {self.model_dir}")
        ic(f"모델 저장 디렉토리 (절대 경로): {self.model_dir.absolute()}")
        
        ic("DiaryMbtiService 초기화: DL 전용 모드")
        
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
            self.dl_model_obj = DiaryMbtiDLModel(
                model_name=self.dl_model_name,
                max_length=512
            )
            ic(f"✅ DL 모델 초기화 완료: {self.dl_model_name}")
            ic("   MBTI는 3-class 분류: 0=평가불가, 1=첫번째, 2=두번째")
        except Exception as e:
            ic(f"❌ DL 모델 초기화 실패: {e}")
            raise RuntimeError(f"DL 모델 초기화 실패: {e}")
    
    def _load_and_merge_json_files(self) -> pd.DataFrame:
        """JSON 파일들을 로드하고 병합하여 DataFrame 생성 (여러 파일셋 지원)"""
        import json
        
        ic("JSON 파일들 로드 중...")
        
        # json_files가 리스트인 경우 (여러 파일셋)
        if isinstance(self.json_files, list):
            all_dfs = []
            for file_set_idx, file_set in enumerate(self.json_files):
                ic(f"\n파일셋 {file_set_idx + 1}/{len(self.json_files)} 로딩 중...")
                df = self._load_single_json_fileset(file_set)
                all_dfs.append(df)
                ic(f"  파일셋 {file_set_idx + 1} 완료: {len(df):,}개")
            
            # 모든 파일셋 병합
            ic("\n모든 파일셋 병합 중...")
            merged_df = pd.concat(all_dfs, ignore_index=True)
            ic(f"최종 병합 완료: {len(merged_df):,}개 (총 {len(all_dfs)}개 파일셋)")
            
        else:
            # 단일 파일셋
            merged_df = self._load_single_json_fileset(self.json_files)
        
        return merged_df
    
    def _load_single_json_fileset(self, json_files: Dict[str, Path]) -> pd.DataFrame:
        """단일 JSON 파일셋 로드"""
        import json
        
        # 각 차원별 데이터 로드
        dimension_dfs = {}
        base_data = None
        
        for dimension, json_path in json_files.items():
            ic(f"  [{dimension}] 로딩: {json_path.name}")
            
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # DataFrame 생성
            df = pd.DataFrame(data)
            
            # 첫 번째 파일에서 기본 정보 저장 (id, content, localdate, userid)
            if base_data is None:
                base_data = df[['id', 'content', 'localdate', 'userid']].copy()
                ic(f"     기본 정보: {len(base_data):,}개")
            
            # 해당 차원의 라벨만 저장
            dimension_dfs[dimension] = df[['id', dimension]].copy()
            
            # 라벨 분포 확인
            label_dist = df[dimension].value_counts().to_dict()
            ic(f"     라벨 분포: {label_dist}")
        
        # 모든 차원 병합
        merged_df = base_data.copy()
        
        for dimension, df in dimension_dfs.items():
            merged_df = merged_df.merge(df, on='id', how='inner')
        
        ic(f"  병합 완료: {len(merged_df):,}개")
        
        # title 컬럼 추가 (빈 값으로, preprocess_text에서 content만 사용)
        merged_df['title'] = ''
        
        return merged_df
    
    def preprocess(self):
        """데이터 전처리 (JSON 전용)"""
        ic("😎😎 전처리 시작")
        
        try:
            # JSON 파일들 로드 및 병합
            ic("JSON 파일들을 로드하여 병합합니다...")
            self.df = self._load_and_merge_json_files()
            
            # 데이터 기본 정보 확인
            ic(f"컬럼: {list(self.df.columns)}")
            ic(f"데이터 타입: {self.df.dtypes.to_dict()}")
            
            # 필요한 컬럼만 선택 (content, MBTI 라벨만 사용)
            required_cols = ['content'] + self.mbti_labels
            ic(f"필요한 컬럼만 선택: {required_cols}")
            
            # 결측치 처리 (method 사용)
            self.df = self.method.handle_missing_values(self.df, required_cols)
            
            # MBTI 라벨 분포 확인 (method 사용)
            self.method.check_label_distribution(self.df)
            
            # MBTI 라벨 값 검증 (정제된 데이터는 1, 2만 있어야 함)
            for label in self.mbti_labels:
                unique_values = self.df[label].unique()
                ic(f"{label} 고유 값: {sorted(unique_values)}")
                # float를 int로 변환
                self.df[label] = self.df[label].astype(int)
            
            # 라벨 검증 (0, 1, 2 모두 사용 - 3-class 분류)
            ic("라벨 분포 확인 (0=평가불가, 1=첫번째, 2=두번째)")
            for label in self.mbti_labels:
                dist = self.df[label].value_counts().to_dict()
                ic(f"  {label}: {dist}")
            
            # 텍스트 전처리: title + content 병합 (method 사용)
            ic("텍스트 전처리: title + content 병합")
            self.df = self.method.preprocess_text(self.df)
            ic(f"병합된 텍스트 샘플 (첫 3개):")
            for i, text in enumerate(self.df['text'].head(3)):
                ic(f"  [{i+1}] {text[:100]}...")
            
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
        max_length: int = 512,
        early_stopping_patience: int = 3
    ):
        """
        DL 모델 학습 (4개 MBTI 차원별로 각각 학습)
        
        Args:
            epochs: 에폭 수
            batch_size: 배치 크기
            freeze_bert_layers: 동결할 BERT 레이어 수
            learning_rate: 학습률
            max_length: 최대 토큰 길이
            early_stopping_patience: Early stopping patience
        """
        ic("😎😎 DL 학습 시작")
        
        try:
            if self.df is None:
                raise ValueError("데이터가 없습니다. preprocess()를 먼저 실행하세요.")
            
            # 모델 생성
            if self.dl_model_obj is None:
                self._init_dl_model()
            
            self.dl_model_obj.create_models(
                num_labels=3,  # MBTI 3-class (0=평가불가, 1=첫번째, 2=두번째)
                dropout_rate=0.3,
                hidden_size=256
            )
            
            # 트레이너 생성
            from diary_mbti.diary_mbti_dl_trainer import DiaryMbtiDLTrainer
            self.dl_trainer = DiaryMbtiDLTrainer(
                models=self.dl_model_obj.models,
                tokenizer=self.dl_model_obj.tokenizer,
                device=self.dl_model_obj.device
            )
            
            # 데이터 준비
            texts = self.df['text'].tolist()
            
            # 4개 MBTI 차원별 라벨 준비
            labels_dict = {label: self.df[label].tolist() for label in self.mbti_labels}
            
            # 학습/검증 분할 (텍스트는 한 번만 분할, 각 차원별 라벨은 동일한 인덱스로 분할)
            from sklearn.model_selection import train_test_split
            
            # 첫 번째 차원(E_I)을 기준으로 분할 (stratify 사용)
            train_indices, val_indices, _, _ = train_test_split(
                range(len(texts)), 
                labels_dict['E_I'], 
                test_size=0.2, 
                random_state=42, 
                stratify=labels_dict['E_I']
            )
            
            # 텍스트와 각 차원별 라벨 분할
            train_texts = [texts[i] for i in train_indices]
            val_texts = [texts[i] for i in val_indices]
            
            train_labels_dict = {label: [labels_dict[label][i] for i in train_indices] for label in self.mbti_labels}
            val_labels_dict = {label: [labels_dict[label][i] for i in val_indices] for label in self.mbti_labels}
            
            ic(f"학습 데이터: {len(train_texts)}개, 검증 데이터: {len(val_texts)}개")
            
            # 학습 (4개 차원별)
            history = self.dl_trainer.train(
                train_texts=train_texts,
                train_labels=train_labels_dict,
                val_texts=val_texts,
                val_labels=val_labels_dict,
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                max_length=max_length,
                freeze_bert_layers=freeze_bert_layers,
                early_stopping_patience=early_stopping_patience,
                use_amp=True
            )
            
            ic(f"평균 검증 정확도: {history['final_val_accuracy']:.4f}")
            ic("😎😎 DL 학습 완료")
            
            return history
            
        except Exception as e:
            ic(f"학습 오류: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def predict(self, text: str) -> Dict[str, Any]:
        """텍스트 MBTI 예측 (4개 차원 모두 예측) - DL 모델 사용"""
        try:
            if self.dl_model_obj is None or not self.dl_model_obj.models:
                raise ValueError("DL 모델이 없습니다. learning()을 먼저 실행하세요.")
            
            # 텍스트 전처리
            import re
            processed_text = str(text)
            processed_text = re.sub(r'\r?\n', ' ', processed_text)
            processed_text = processed_text.replace('\t', ' ')
            processed_text = re.sub(r'\s+', ' ', processed_text).strip()
            
            # DL 모델로 예측 (4개 차원별)
            predictions = {}
            probabilities = {}
            
            for label in self.mbti_labels:
                model = self.dl_model_obj.models[label]
                model.eval()
                
                # 토크나이징
                encoding = self.dl_model_obj.tokenizer(
                    processed_text,
                    add_special_tokens=True,
                    max_length=512,
                    padding='max_length',
                    truncation=True,
                    return_attention_mask=True,
                    return_tensors='pt'
                )
                
                # 예측
                import torch
                with torch.no_grad():
                    input_ids = encoding['input_ids'].to(self.dl_model_obj.device)
                    attention_mask = encoding['attention_mask'].to(self.dl_model_obj.device)
                    
                    outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                    probs = torch.softmax(outputs, dim=1)
                    _, predicted = torch.max(outputs, 1)
                    
                    pred = predicted.cpu().item()  # 0, 1, or 2
                    prob = probs.cpu().numpy()[0]
                    
                    # 디버깅: 원본 확률 분포 출력 (중요!)
                    ic(f"[{label}] 원본 확률: 0={prob[0]:.4f}, 1={prob[1]:.4f}, 2={prob[2]:.4f} (예측: {pred})")
                    
                    # MBTI 확률 조정 적용 (감정분석보다 보수적으로 - 평가불가를 더 존중)
                    # 평가불가(0) 확률을 약간만 낮춰서 실제 MBTI 판단 가능하도록 조정
                    adjusted_prob = prob.copy()
                    
                    # 1. 평가불가 확률 0.92배로 조정 (8% 감소) - 감정분석(0.84)보다 완화
                    # MBTI는 감정보다 판단이 어려우므로 더 보수적으로 처리
                    adjusted_prob[0] = adjusted_prob[0] * 0.92
                    # 정규화
                    adjusted_prob = adjusted_prob / (adjusted_prob.sum() + 1e-10)
                    ic(f"[{label}] 평가불가 확률 0.92배 조정: {prob[0]:.3f} -> {adjusted_prob[0]:.3f}")
                    
                    # 2. 평가불가 확률 추가 감소: 다른 확률이 매우 높을 때만 추가 감소
                    max_other_prob = max(adjusted_prob[1], adjusted_prob[2])
                    cannot_evaluate_prob = adjusted_prob[0]
                    
                    # 다른 확률이 평가불가 확률의 90% 이상이고, 다른 확률이 30% 이상일 때만 추가 감소
                    if max_other_prob >= cannot_evaluate_prob * 0.9 and max_other_prob >= 0.3:
                        adjusted_prob[0] = adjusted_prob[0] * 0.90  # 10% 추가 감소 (감정분석 0.85보다 완화)
                        # 정규화
                        adjusted_prob = adjusted_prob / (adjusted_prob.sum() + 1e-10)
                        ic(f"[{label}] 다른 확률이 매우 높음 ({max_other_prob:.3f} vs {cannot_evaluate_prob:.3f}), 평가불가 확률 10% 추가 감소: {adjusted_prob[0]:.3f}")
                    
                    # 3. 최대 확률과 해당 클래스 찾기
                    max_prob_idx = int(np.argmax(adjusted_prob))
                    max_prob = float(adjusted_prob[max_prob_idx])
                    
                    # 4. 확률 임계값 설정 (MBTI는 더 보수적으로)
                    CONFIDENCE_THRESHOLD = 0.3
                    MIN_CONFIDENCE_FOR_EVALUATION = 0.20  # 평가 가능한 최소 확률 (20% 이상이면 평가 가능, 15%→20%로 상향)
                    CANNOT_EVALUATE_THRESHOLD = 0.60  # 평가불가로 판단하는 최소 확률 (60% 이상이어야 평가불가로 판단, 50%→60%로 상향)
                    
                    # 5. 최종 예측 결정 (감정분석과 동일한 로직)
                    if max_prob_idx == 0:
                        # 평가불가가 최대 확률인 경우
                        if max_prob >= CANNOT_EVALUATE_THRESHOLD:
                            # 평가불가 확률이 50% 이상이면 평가불가로 판단
                            final_pred = 0
                            ic(f"[{label}] 평가불가가 최대 확률 ({max_prob:.3f})이고 임계값({CANNOT_EVALUATE_THRESHOLD}) 이상: 평가불가로 판단")
                        else:
                            # 평가불가 확률이 낮으면 두 번째로 높은 것으로 확인
                            sorted_indices = np.argsort(adjusted_prob)[::-1]
                            if len(sorted_indices) > 1:
                                second_max_idx = int(sorted_indices[1])
                                if second_max_idx != 0:
                                    second_max_prob = float(adjusted_prob[second_max_idx])
                                    # 두 번째 확률이 15% 이상이면 그걸 선택
                                    if second_max_prob >= MIN_CONFIDENCE_FOR_EVALUATION:
                                        final_pred = int(second_max_idx)
                                        ic(f"[{label}] 평가불가 확률 낮음 ({max_prob:.3f}), 두 번째 선택: {final_pred} ({second_max_prob:.3f})")
                                    else:
                                        # 두 번째 확률도 낮으면 평가불가
                                        final_pred = 0
                                        ic(f"[{label}] 평가불가가 최대이지만 낮음 ({max_prob:.3f}), 다른 확률도 낮음: 평가불가로 판단")
                                else:
                                    final_pred = 0
                            else:
                                final_pred = 0
                    # 최대 확률이 충분히 높으면 모델 예측 사용
                    elif max_prob >= CONFIDENCE_THRESHOLD:
                        final_pred = max_prob_idx
                        ic(f"[{label}] 최대 확률 충분 ({max_prob:.3f}): {final_pred}로 판단")
                    # 최대 확률이 낮은 경우에도 모델 예측 사용 (15% 이상이면)
                    elif max_prob >= MIN_CONFIDENCE_FOR_EVALUATION:
                        final_pred = max_prob_idx
                        ic(f"[{label}] 모델 예측 사용: {final_pred} ({max_prob:.3f})")
                    # 확률이 매우 낮으면 평가불가
                    else:
                        final_pred = 0
                        ic(f"[{label}] 확률 매우 낮음 ({max_prob:.3f}): 평가불가로 판단")
                    
                    predictions[label] = int(final_pred)
                    probabilities[label] = {
                        '0': float(adjusted_prob[0]),  # 평가불가
                        '1': float(adjusted_prob[1]),  # 첫번째 (E, S, T, J)
                        '2': float(adjusted_prob[2])   # 두번째 (I, N, F, P)
                    }
                    
                    # 퍼센트 변환 (프론트 표시용)
                    probabilities[label]['0_percent'] = round(float(adjusted_prob[0]) * 100, 1)  # 평가불가 퍼센트
                    probabilities[label]['1_percent'] = round(float(adjusted_prob[1]) * 100, 1)  # 첫번째 퍼센트
                    probabilities[label]['2_percent'] = round(float(adjusted_prob[2]) * 100, 1)  # 두번째 퍼센트
                    # 선택된 클래스의 확률 퍼센트
                    probabilities[label]['selected_percent'] = round(float(adjusted_prob[final_pred]) * 100, 1)
                    
                    # 불확실성(uncertainty) 계산: 최고 확률 - 두 번째 확률
                    sorted_probs = np.sort(adjusted_prob)[::-1]
                    if len(sorted_probs) >= 2:
                        prob_diff = float(sorted_probs[0] - sorted_probs[1])
                        probabilities[label]['uncertainty'] = prob_diff
                        probabilities[label]['confidence'] = float(sorted_probs[0])  # 최고 확률 = 신뢰도
                        probabilities[label]['confidence_percent'] = round(float(sorted_probs[0]) * 100, 1)  # 신뢰도 퍼센트
                        # 애매한 일기 판단: 확률 차이가 0.1 미만이면 애매함 (Python bool로 변환)
                        probabilities[label]['is_ambiguous'] = bool(prob_diff < 0.1)
                    else:
                        probabilities[label]['uncertainty'] = 0.0
                        probabilities[label]['confidence'] = float(sorted_probs[0]) if len(sorted_probs) > 0 else 0.0
                        probabilities[label]['confidence_percent'] = round(probabilities[label]['confidence'] * 100, 1)
                        probabilities[label]['is_ambiguous'] = True
                    
                    # 디버깅: 최종 예측 및 확률 출력 (항상 출력)
                    ic(f"[{label}] 최종 예측: {final_pred} (조정 확률: 0={adjusted_prob[0]:.4f}, 1={adjusted_prob[1]:.4f}, 2={adjusted_prob[2]:.4f})")
                    ic(f"[{label}] 불확실성: {probabilities[label]['uncertainty']:.4f}, 신뢰도: {probabilities[label]['confidence']:.4f}, 애매함: {probabilities[label]['is_ambiguous']}")
                    
                    # 디버깅: 원본 vs 조정된 확률 비교 (항상 출력)
                    if final_pred != pred:
                        ic(f"⚠️ [{label}] 예측 변경: {pred} -> {final_pred}")
                    ic(f"[{label}] 원본: 0={prob[0]:.4f}, 1={prob[1]:.4f}, 2={prob[2]:.4f} | 조정: 0={adjusted_prob[0]:.4f}, 1={adjusted_prob[1]:.4f}, 2={adjusted_prob[2]:.4f} | 예측: {pred}->{final_pred}")
            
            # MBTI 결과 구성 (각 차원 독립적으로 판단)
            mbti_map = {
                'E_I': {0: '?', 1: 'E', 2: 'I'},
                'S_N': {0: '?', 1: 'S', 2: 'N'},
                'T_F': {0: '?', 1: 'T', 2: 'F'},
                'J_P': {0: '?', 1: 'J', 2: 'P'}
            }
            
            mbti_result = {
                dim: mbti_map[dim].get(predictions.get(dim, 0), '?')
                for dim in self.mbti_labels
            }
            
            full_mbti = ''.join(mbti_result.values())
            
            # 모든 차원이 평가불가인 경우에만 "평가불가"
            if full_mbti == '????':
                full_mbti = '평가불가'
            # 그 외는 부분적으로 판단 가능 (예: E?F?, ENFP, ??T?, 등)
            
            # 전체 MBTI 불확실성 및 신뢰도 계산 (평균)
            total_uncertainty = float(np.mean([probabilities[label].get('uncertainty', 0.0) for label in self.mbti_labels]))
            total_confidence = float(np.mean([probabilities[label].get('confidence', 0.0) for label in self.mbti_labels]))
            total_confidence_percent = round(total_confidence * 100, 1)  # 전체 평균 신뢰도 퍼센트
            is_ambiguous_overall = bool(total_uncertainty < 0.1)  # 전체적으로 애매한지 판단 (Python bool로 변환)
            
            # 차원별 애매함 정보
            ambiguous_dimensions = [label for label in self.mbti_labels if probabilities[label].get('is_ambiguous', False)]
            
            # 차원별 확률 요약 (프론트 표시용)
            dimension_percentages = {}
            for label in self.mbti_labels:
                pred = predictions.get(label, 0)
                dimension_percentages[label] = {
                    'selected': mbti_result[label],  # 선택된 값 (E, I, S, N, T, F, J, P, ?)
                    'percent': probabilities[label].get('selected_percent', 0.0),  # 선택된 클래스의 확률 퍼센트
                    'confidence_percent': probabilities[label].get('confidence_percent', 0.0)  # 신뢰도 퍼센트
                }
            
            return {
                'mbti': full_mbti,
                'dimensions': mbti_result,
                'predictions': predictions,
                'probabilities': probabilities,
                'confidence': total_confidence,  # 전체 평균 신뢰도 (0.0~1.0)
                'confidence_percent': total_confidence_percent,  # 전체 평균 신뢰도 퍼센트
                'uncertainty': total_uncertainty,  # 전체 평균 불확실성
                'is_ambiguous': is_ambiguous_overall,  # 전체적으로 애매한지 (Python bool)
                'ambiguous_dimensions': ambiguous_dimensions,  # 애매한 차원 목록
                'dimension_percentages': dimension_percentages  # 차원별 확률 퍼센트 (프론트 표시용)
            }
            
        except Exception as e:
            ic(f"예측 오류: {e}")
            raise
    
    def load_model(self) -> bool:
        """DL 모델 로드 (4개 차원별)"""
        try:
            if self.dl_model_obj is None:
                self._init_dl_model()
            
            # 모든 모델 파일이 존재하는지 확인
            all_exist = all(self.dl_model_files[label].exists() for label in self.mbti_labels)
            if not all_exist:
                ic(f"DL 모델 파일이 없습니다. 학습이 필요합니다.")
                return False
            
            # 메타데이터 로드
            if self.dl_metadata_file.exists():
                with open(self.dl_metadata_file, 'rb') as f:
                    metadata = pickle.load(f)
                    dropout_rate = metadata.get('dropout_rate', 0.3)
                    hidden_size = metadata.get('hidden_size', 256)
            else:
                dropout_rate = 0.3
                hidden_size = 256
            
            # 모델 생성
            self.dl_model_obj.create_models(
                num_labels=3,  # MBTI 3-class (0=평가불가, 1=첫번째, 2=두번째)
                dropout_rate=dropout_rate,
                hidden_size=hidden_size
            )
            
            # 각 차원별 모델 로드
            import torch
            for label in self.mbti_labels:
                checkpoint = torch.load(
                    self.dl_model_files[label], 
                    map_location=self.dl_model_obj.device
                )
                self.dl_model_obj.models[label].load_state_dict(checkpoint['model_state_dict'])
                self.dl_model_obj.models[label].eval()
            
            # 트레이너 생성
            from diary_mbti.diary_mbti_dl_trainer import DiaryMbtiDLTrainer
            self.dl_trainer = DiaryMbtiDLTrainer(
                models=self.dl_model_obj.models,
                tokenizer=self.dl_model_obj.tokenizer,
                device=self.dl_model_obj.device
            )
            
            ic("DL 모델 로드 완료 (4개 차원)")
            return True
            
        except Exception as e:
            ic(f"DL 모델 로드 오류: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _try_load_model(self):
        """모델 파일이 있으면 자동 로드"""
        try:
            # 모든 모델 파일이 존재하는지 확인
            all_exist = all(self.dl_model_files[label].exists() for label in self.mbti_labels)
            
            if all_exist and self.dl_metadata_file.exists():
                ic("DL 모델 파일 발견, 자동 로드 시도...")
                if self.load_model():
                    ic("DL 모델 자동 로드 성공")
                    return True
                else:
                    ic("DL 모델 자동 로드 실패")
                    return False
            else:
                ic("DL 모델 파일이 없습니다. 학습이 필요합니다.")
                return False
        except Exception as e:
            ic(f"모델 자동 로드 실패: {e}")
            return False
    
    def save_model(self):
        """DL 모델을 파일로 저장 (4개 차원별)"""
        try:
            if self.dl_model_obj is None or not self.dl_model_obj.models:
                raise ValueError("DL 모델이 학습되지 않았습니다. learning()을 먼저 실행하세요.")
            
            # 모델 디렉토리 생성
            self.model_dir.mkdir(parents=True, exist_ok=True)
            ic(f"📁 모델 저장 경로: {self.model_dir.absolute()}")
            
            # 각 MBTI 차원별 모델 저장 (CPU 호환 형식)
            import torch
            for label in self.mbti_labels:
                if label in self.dl_model_obj.models:
                    model = self.dl_model_obj.models[label]
                    model_path = self.dl_model_files[label]
                    
                    # CPU로 변환하여 저장
                    model_state_dict = model.state_dict()
                    cpu_state_dict = {key: value.cpu() for key, value in model_state_dict.items()}
                    
                    torch.save({
                        'model_state_dict': cpu_state_dict,
                        'model_name': self.dl_model_name,
                        'max_length': self.dl_model_obj.max_length
                    }, model_path)
                    
                    ic(f"✅ {label} DL 모델 저장 완료: {model_path} (CPU 호환 형식)")
            
            # 메타데이터 저장 (dropout_rate, hidden_size 포함)
            # JSON 파일 사용으로 csv_mtime 제거
            
            # 모델에서 dropout_rate와 hidden_size 추출
            first_label = self.mbti_labels[0]
            first_model = self.dl_model_obj.models[first_label]
            
            # Dropout rate 추출
            dropout_rate = 0.3  # 기본값
            if hasattr(first_model, 'model') and hasattr(first_model.model, 'dropout'):
                dropout_rate = first_model.model.dropout.p
            
            # Hidden size 추출
            hidden_size = None
            if hasattr(first_model, 'model') and hasattr(first_model.model, 'classifier'):
                classifier = first_model.model.classifier
                if isinstance(classifier, torch.nn.Sequential) and len(classifier) > 0:
                    hidden_size = classifier[0].out_features
            
            metadata = {
                'data_source': 'json',
                'trained_at': datetime.now().isoformat(),
                'data_count': len(self.df) if self.df is not None else 0,
                'model_name': self.dl_model_name,
                'mbti_labels': self.mbti_labels,
                'dropout_rate': dropout_rate,
                'hidden_size': hidden_size
            }
            with open(self.dl_metadata_file, 'wb') as f:
                pickle.dump(metadata, f)
            ic(f"✅ 메타데이터 저장 완료: {self.dl_metadata_file}")
            ic(f"   - dropout_rate: {dropout_rate}")
            ic(f"   - hidden_size: {hidden_size}")
            
        except Exception as e:
            ic(f"모델 저장 오류: {e}")
            raise
    
    def submit(self):
        """제출/모델 저장"""
        ic("😎😎 제출 시작")
        self.save_model()
        ic("😎😎 제출 완료")
