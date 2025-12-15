"""
로컬에서 GPU를 사용하여 DL 모델 학습하는 스크립트 (정확도 개선 버전)

정확도 개선 방법:
1. 더 많은 epochs (3 -> 5-10)
2. Freeze layers 감소 (8 -> 4-6, 더 많은 레이어 학습)
3. Early stopping patience 증가 (2 -> 5)
4. Max length 증가 (256 -> 512, 더 긴 문맥 이해)
5. Learning rate 조정 (더 낮은 학습률로 안정적 학습)
6. Batch size 조정 (더 작게 하면 더 안정적)

사용법:
    python train_local_gpu_improved.py

주의사항:
    - 로컬에 CUDA가 설치되어 있어야 합니다
    - 학습된 모델은 models/ 폴더에 저장됩니다
    - 저장된 모델은 Docker 컨테이너에서도 사용 가능합니다 (볼륨 마운트)
"""

import sys
from pathlib import Path

# business/diary_service/app 디렉토리를 Python 경로에 추가
app_dir = Path(__file__).parent.parent  # app/
sys.path.insert(0, str(app_dir))

from diary_emotion.diary_emotion_service import DiaryEmotionService
from icecream import ic

def main():
    """로컬에서 GPU로 DL 모델 학습 (정확도 개선 버전)"""
    
    # CSV 파일 경로 설정
    csv_path = Path(__file__).parent / "data" / "diary_copers.csv"
    
    if not csv_path.exists():
        ic(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return
    
    ic("=" * 60)
    ic("로컬 GPU 학습 시작 (정확도 개선 버전)")
    ic("=" * 60)
    
    # 서비스 초기화 (DL 모델 타입)
    # 로컬 KoELECTRA v3 base 모델 사용
    dl_model_name = "koelectro_v3_base"  # 로컬 KoELECTRA v3 base 모델 사용
    
    service = DiaryEmotionService(
        csv_file_path=csv_path,
        model_type="dl",
        dl_model_name=dl_model_name
    )
    
    # 데이터 전처리
    ic("데이터 전처리 중...")
    service.preprocess()
    
    # 전처리 후 DL 모델 재초기화 (데이터가 로드된 후 정확한 num_labels 계산)
    ic("DL 모델 재초기화 중 (전처리 후)...")
    try:
        service._init_dl_model()
    except Exception as e:
        ic(f"❌ DL 모델 초기화 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        raise RuntimeError(f"DL 모델 초기화 실패: {e}")
    
    # DL 모델 초기화 확인 및 강제
    if service.model_type != "dl":
        ic("❌ DL 모델 초기화 실패! (ML로 폴백됨)")
        ic("DL 모델로 학습해야 합니다. 다음을 확인하세요:")
        ic("1. PyTorch와 transformers 라이브러리가 설치되어 있는지 확인")
        ic("   - pip install torch transformers")
        ic("2. CUDA가 설치되어 있고 사용 가능한지 확인")
        ic("   - python -c 'import torch; print(torch.cuda.is_available())'")
        ic("3. 모델 파일 경로가 올바른지 확인")
        ic(f"   - 모델 이름: {dl_model_name}")
        raise RuntimeError("DL 모델 초기화 실패: DL 모델로 학습해야 합니다.")
    
    if service.dl_model_obj is None:
        ic("❌ DL 모델 객체가 None입니다!")
        raise RuntimeError("DL 모델 객체가 초기화되지 않았습니다.")
    
    ic("✅ DL 모델 초기화 완료!")
    ic(f"   - 모델 이름: {service.dl_model_name}")
    ic(f"   - 감정 클래스 수: {service.dl_model_obj.num_labels if service.dl_model_obj else 'N/A'}")
    
    # DL 모델 학습 (정확도 개선 설정)
    ic("모델 학습 시작 (정확도 개선 설정)...")
    ic("✅ 정확도 개선 설정:")
    ic("   - Epochs: 5-10 (더 많은 학습)")
    ic("   - Freeze Layers: 4-6 (더 많은 레이어 학습)")
    ic("   - Early Stopping Patience: 5 (더 오래 기다림)")
    ic("   - Max Length: 512 (더 긴 문맥 이해)")
    ic("   - Learning Rate: 1.5e-5 (더 낮은 학습률로 안정적 학습)")
    ic("   - Batch Size: 24 (약간 감소하여 더 안정적 학습)")
    ic("   - Mixed Precision Training (FP16): 활성화")
    ic("   - 예상 학습 시간: 약 80-120분")
    
    # 정확도 개선을 위한 설정 옵션들
    improvement_configs = [
        {
            "name": "보수적 개선 (빠른 학습)",
            "epochs": 5,
            "batch_size": 24,
            "freeze_bert_layers": 6,
            "early_stopping_patience": 5,
            "learning_rate": 1.5e-5,
            "max_length": 512,
            "label_smoothing": 0.0  # Label smoothing 비활성화
        },
        {
            "name": "적극적 개선 (높은 정확도)",
            "epochs": 8,
            "batch_size": 20,
            "freeze_bert_layers": 4,
            "early_stopping_patience": 5,
            "learning_rate": 1.5e-5,
            "max_length": 512,
            "label_smoothing": 0.05  # Label smoothing 약간 적용
        },
        {
            "name": "최대 개선 (최고 정확도, 시간 소요)",
            "epochs": 10,
            "batch_size": 16,
            "freeze_bert_layers": 2,
            "early_stopping_patience": 7,
            "learning_rate": 1e-5,
            "max_length": 512,
            "label_smoothing": 0.1  # Label smoothing 적용 (과적합 방지)
        }
    ]
    
    # 사용할 설정 선택
    # 0: 보수적 개선 (빠른 학습), 1: 적극적 개선 (높은 정확도), 2: 최대 개선 (최고 정확도)
    selected_config = improvement_configs[2]  # 최고 정확도 설정 사용
    
    ic(f"\n선택된 설정: {selected_config['name']}")
    ic(f"  - Epochs: {selected_config['epochs']}")
    ic(f"  - Batch Size: {selected_config['batch_size']}")
    ic(f"  - Freeze Layers: {selected_config['freeze_bert_layers']}")
    ic(f"  - Early Stopping Patience: {selected_config['early_stopping_patience']}")
    ic(f"  - Learning Rate: {selected_config['learning_rate']}")
    ic(f"  - Max Length: {selected_config['max_length']}")
    if 'label_smoothing' in selected_config:
        ic(f"  - Label Smoothing: {selected_config['label_smoothing']} (과적합 방지)")
    
    try:
        # 학습 실행 (개선된 파라미터 사용) - DL 모델로만 학습
        if service.model_type != "dl":
            raise RuntimeError(f"모델 타입이 'dl'이 아닙니다: {service.model_type}. DL 모델로 학습해야 합니다.")
        
        history = service.learning(
            epochs=selected_config['epochs'],
            batch_size=selected_config['batch_size'],
            freeze_bert_layers=selected_config['freeze_bert_layers'],
            learning_rate=selected_config['learning_rate'],
            max_length=selected_config['max_length'],
            early_stopping_patience=selected_config['early_stopping_patience'],
            label_smoothing=selected_config.get('label_smoothing', 0.0)  # Label smoothing (기본값: 0.0)
        )
        
        ic("=" * 60)
        ic("DL 모델 학습 완료!")
        
        # DL 모델 학습 결과 출력
        if history is None:
            ic("⚠️ 학습 history가 없습니다. 학습이 제대로 완료되지 않았을 수 있습니다.")
        else:
            if 'final_val_accuracy' in history:
                ic(f"최종 검증 정확도: {history['final_val_accuracy']:.4f}")
            if 'best_val_accuracy' in history:
                ic(f"최고 검증 정확도: {history['best_val_accuracy']:.4f}")
            if 'final_val_loss' in history:
                ic(f"최종 검증 손실: {history['final_val_loss']:.4f}")
            if 'final_train_loss' in history:
                ic(f"최종 학습 손실: {history['final_train_loss']:.4f}")
        ic("=" * 60)
        
        # DL 모델 저장
        ic("DL 모델 저장 중...")
        if service.model_type != "dl":
            raise RuntimeError(f"모델 타입이 'dl'이 아닙니다: {service.model_type}. DL 모델만 저장할 수 있습니다.")
        service.save_model()
        
        ic("✅ DL 모델 학습 및 저장 완료!")
        ic(f"DL 모델 파일 위치: {service.dl_model_file}")
        ic("이 모델은 Docker 컨테이너에서도 사용 가능합니다.")
        
        # 추가 개선 팁 (DL 모델 특화)
        ic("\n" + "=" * 60)
        ic("📈 DL 모델 정확도 개선 팁:")
        ic("1. 더 많은 데이터 수집 및 라벨링")
        ic("2. 데이터 증강 (텍스트 변형, 동의어 교체, 백번역 등)")
        ic("3. 더 큰 모델 사용 (monologg/koelectra-base-v3-discriminator)")
        ic("4. 전이 학습 전략 변경 (freeze_bert_layers 감소)")
        ic("5. Learning rate 스케줄러 조정 (cosine annealing 등)")
        ic("6. 더 긴 max_length 사용 (512 -> 768, 메모리 허용 시)")
        ic("7. Label smoothing 적용 (과적합 방지)")
        ic("8. Focal Loss 사용 (불균형 데이터 처리)")
        ic("=" * 60)
        
    except Exception as e:
        ic(f"❌ 학습 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()

