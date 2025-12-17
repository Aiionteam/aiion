"""
로컬에서 GPU를 사용하여 MBTI DL 모델 학습하는 스크립트

사용법:
    python train_local_gpu.py

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

# icecream import (fallback 포함)
try:
    from icecream import ic
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None

# sys.path 설정 후 import (필수)
from diary_mbti.diary_mbti_service import DiaryMbtiService  # noqa: E402

def main():
    """로컬에서 GPU로 MBTI DL 모델 학습"""
    
    # JSON 파일 경로 설정 (병합 데이터 + 이순신 난중일기)
    data_dir = Path(__file__).parent / "data"
    
    # 파일셋 1: 병합 데이터 (22,500개 - 평가불가 포함, 현대 일기 + 0_split 데이터)
    json_files_merged = {
        'E_I': data_dir / "mbti_corpus_merged_E_I.json",
        'S_N': data_dir / "mbti_corpus_merged_S_N.json",
        'T_F': data_dir / "mbti_corpus_merged_T_F.json",
        'J_P': data_dir / "mbti_corpus_merged_J_P.json"
    }
    
    # 파일셋 2: 이순신 난중일기 (1,748개)
    json_files_leesoonsin = {
        'E_I': data_dir / "mbti_leesoonsin_corpus_split_E_I.json",
        'S_N': data_dir / "mbti_leesoonsin_corpus_split_S_N.json",
        'T_F': data_dir / "mbti_leesoonsin_corpus_split_T_F.json",
        'J_P': data_dir / "mbti_leesoonsin_corpus_split_J_P.json"
    }
    
    # 모든 파일셋을 리스트로
    all_json_files = [json_files_merged, json_files_leesoonsin]
    
    # 모든 JSON 파일 존재 확인
    all_exist = True
    for idx, file_set in enumerate(all_json_files):
        for dimension, path in file_set.items():
            if not path.exists():
                ic(f"❌ 파일 없음: {path}")
                all_exist = False
    
    if not all_exist:
        return
    
    ic("=" * 60)
    ic("로컬 GPU 학습 시작 (MBTI DL 모델 - JSON 데이터)")
    ic("학습 데이터:")
    ic("  [파일셋 1] 병합 데이터 (22,500개 - 현대 일기 20K + 0_split 2.5K)")
    for dimension, path in json_files_merged.items():
        ic(f"     [{dimension}] {path.name}")
    ic("  [파일셋 2] 이순신 난중일기 (1,748개)")
    for dimension, path in json_files_leesoonsin.items():
        ic(f"     [{dimension}] {path.name}")
    ic("=" * 60)
    
    # 서비스 초기화 (DL 모델 전용, JSON 파일 사용)
    # 로컬 KoELECTRA 모델 사용
    dl_model_name = "koelectro_v3_base"  # 로컬 KoELECTRA v3 base 모델 사용
    
    service = DiaryMbtiService(
        json_files=all_json_files,  # 병합 데이터 + 이순신 일기
        dl_model_name=dl_model_name
    )
    
    # 데이터 전처리
    ic("데이터 전처리 중...")
    service.preprocess()
    
    # DL 모델 학습 (4개 MBTI 차원별)
    ic("DL 모델 학습 시작 (GPU 사용 - RTX 4060 랩탑 최적화)...")
    ic("✅ 최적화 설정 (정확도 개선 v2):")
    ic("   - Epochs: 10 (충분한 학습 시간 확보)")
    ic("   - 배치 사이즈: 24 (8GB VRAM 최적화)")
    ic("   - Mixed Precision Training (FP16): 활성화")
    ic("   - Freeze Layers: 0개 (모든 레이어 학습 - S_N/T_F/J_P 개선)")
    ic("   - Max Length: 384 (일기 길이 최적화, 속도 30% 향상)")
    ic("   - Learning Rate: 2e-5 (학습률 증가)")
    ic("   - 분류: 3-class (0=평가불가, 1=성향1, 2=성향2)")
    ic("   - 데이터: 병합 데이터(22.5K) + 이순신 일기(1.7K) = 약 24.2K")
    ic("   - 클래스 가중치: 자동 적용 (3-class 불균형 해결)")
    ic("   - Early Stopping: 5 (과적합 방지)")
    ic("   - 예상 학습 시간: 약 4-5시간 (4개 차원별 학습)")
    
    try:
        history = service.learning(
            epochs=10,  # 충분한 학습 시간 확보
            batch_size=24,  # RTX 4060 랩탑 최적화 (8GB VRAM 고려)
            freeze_bert_layers=0,  # 모든 레이어 학습 (S_N/T_F/J_P 개선을 위해 필수)
            learning_rate=2e-5,  # 학습률 증가로 더 빠른 학습
            max_length=384,  # 일기 평균 길이 최적화 (속도 30% 향상)
            early_stopping_patience=5  # 과적합 방지
        )
        
        ic("=" * 60)
        ic("학습 완료!")
        ic(f"평균 검증 정확도: {history['final_val_accuracy']:.4f}")
        ic(f"평균 최고 검증 정확도: {history['best_val_accuracy']:.4f}")
        ic("\n차원별 결과:")
        for label, result in history['results'].items():
            ic(f"  {label}: {result['final_val_accuracy']:.4f} (최고: {result['best_val_accuracy']:.4f})")
        ic("=" * 60)
        
        # 모델 저장
        ic("모델 저장 중...")
        service.save_model()
        
        ic("✅ 학습 및 저장 완료!")
        ic("4개 MBTI 차원별 모델이 저장되었습니다:")
        for label in service.mbti_labels:
            ic(f"  - {service.dl_model_files[label]}")
        ic("이 모델들은 Docker 컨테이너에서도 사용 가능합니다.")
        
    except Exception as e:
        ic(f"❌ 학습 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()

