"""
로컬에서 GPU를 사용하여 영화 리뷰 감성 분석 모델 학습하는 스크립트

사용법:
    python train_local_gpu.py

주의사항:
    - 로컬에 CUDA가 설치되어 있어야 합니다
    - 학습된 모델은 models/trained_models/review/ 폴더에 저장됩니다
    - 저장된 모델은 Docker 컨테이너에서도 사용 가능합니다 (볼륨 마운트)
"""

import sys
from pathlib import Path

# transformer_service/app 디렉토리를 Python 경로에 추가
app_dir = Path(__file__).parent.parent  # app/
sys.path.insert(0, str(app_dir))

from app.review.review_service import ReviewSentimentService
from icecream import ic


def main():
    """로컬에서 GPU로 모델 학습"""
    
    # 데이터 디렉토리 경로 설정
    data_dir = Path(__file__).parent / "data"
    
    if not data_dir.exists():
        ic(f"❌ 데이터 디렉토리를 찾을 수 없습니다: {data_dir}")
        return
    
    ic("=" * 60)
    ic("로컬 GPU 학습 시작")
    ic("=" * 60)
    
    # 서비스 초기화
    dl_model_name = "koelectro_v3_base"  # 로컬 KoELECTRA v3 base 모델 사용
    
    service = ReviewSentimentService(
        data_dir=data_dir,
        dl_model_name=dl_model_name
    )
    
    # 학습 파라미터
    epochs = 5
    batch_size = 16
    learning_rate = 2e-5
    max_length = 256
    num_layers_to_freeze = 8
    
    ic(f"학습 파라미터:")
    ic(f"  - 에포크: {epochs}")
    ic(f"  - 배치 크기: {batch_size}")
    ic(f"  - 학습률: {learning_rate}")
    ic(f"  - 최대 길이: {max_length}")
    ic(f"  - 동결 레이어: {num_layers_to_freeze}")
    ic("=" * 60)
    
    # 학습 실행
    try:
        results = service.learning(
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            max_length=max_length,
            num_layers_to_freeze=num_layers_to_freeze,
            test_size=0.2
        )
        
        ic("=" * 60)
        ic("학습 완료!")
        ic(f"최종 검증 정확도: {results['val_accuracies'][-1]:.4f}")
        ic(f"학습된 에포크: {results['epochs_trained']}")
        ic("=" * 60)
        
    except Exception as e:
        ic(f"❌ 학습 실패: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()

