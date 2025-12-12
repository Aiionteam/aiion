"""
로컬에서 GPU를 사용하여 DL 모델 학습하는 스크립트

사용법:
    python train_local_gpu.py

주의사항:
    - 로컬에 CUDA가 설치되어 있어야 합니다
    - 학습된 모델은 models/ 폴더에 저장됩니다
    - 저장된 모델은 Docker 컨테이너에서도 사용 가능합니다 (볼륨 마운트)
"""

import sys
from pathlib import Path

# 프로젝트 루트 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.diary_emotion.diary_emotion_service import DiaryEmotionService
from icecream import ic

def main():
    """로컬에서 GPU로 DL 모델 학습"""
    
    # CSV 파일 경로 설정
    csv_path = Path(__file__).parent / "data" / "diary_copers.csv"
    
    if not csv_path.exists():
        ic(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return
    
    ic("=" * 60)
    ic("로컬 GPU 학습 시작")
    ic("=" * 60)
    
    # 서비스 초기화 (DL 모델 타입)
    # 로컬 KoELECTRA 모델 사용
    dl_model_name = "electra_local"  # 로컬 KoELECTRA 모델 사용
    
    service = DiaryEmotionService(
        csv_file_path=csv_path,
        model_type="dl",
        dl_model_name=dl_model_name
    )
    
    # 데이터 전처리
    ic("데이터 전처리 중...")
    service.preprocess()
    
    # DL 모델 학습
    ic("DL 모델 학습 시작 (GPU 사용 - RTX 4060 랩탑 최적화)...")
    ic("✅ 최적화 설정:")
    ic("   - 배치 사이즈: 28 (8GB VRAM 최적화)")
    ic("   - Mixed Precision Training (FP16): 활성화")
    ic("   - Freeze Layers: 8개 (하위 레이어 동결)")
    ic("   - 예상 학습 시간: 약 50-70분")
    try:
        history = service.learning(
            model_type="dl",
            epochs=3,
            batch_size=28,  # RTX 4060 랩탑 최적화 (8GB VRAM 고려, Mixed Precision과 함께 사용)
            freeze_bert_layers=8  # 하위 레이어 동결로 학습 속도 향상
        )
        
        ic("=" * 60)
        ic("학습 완료!")
        ic(f"최종 검증 정확도: {history['final_val_accuracy']:.4f}")
        ic(f"최고 검증 정확도: {history['best_val_accuracy']:.4f}")
        ic("=" * 60)
        
        # 모델 저장
        ic("모델 저장 중...")
        service.save_model()
        
        ic("✅ 학습 및 저장 완료!")
        ic(f"모델 파일 위치: {service.dl_model_file}")
        ic("이 모델은 Docker 컨테이너에서도 사용 가능합니다.")
        
    except Exception as e:
        ic(f"❌ 학습 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()

