#!/usr/bin/env python3
"""
모델 초기화 스크립트
저장된 모델 파일들을 삭제하여 학습 상태를 초기화합니다.
"""

from pathlib import Path
import sys

def reset_model():
    """모델 파일들을 삭제하여 초기화"""
    # 모델 디렉토리 경로 (diary_emotion/models/ 폴더)
    model_dir = Path(__file__).parent.parent / "models"
    
    print("=" * 60)
    print("모델 초기화 시작")
    print("=" * 60)
    print()
    print(f"모델 디렉토리: {model_dir}")
    print()
    
    if not model_dir.exists():
        print("❌ 모델 디렉토리가 존재하지 않습니다.")
        return False
    
    # 삭제할 파일 목록
    files_to_delete = [
        "diary_emotion_model.pkl",
        "diary_emotion_vectorizer.pkl",
        "diary_emotion_word2vec.pkl",
        "diary_emotion_metadata.pkl"
    ]
    
    deleted_count = 0
    not_found_count = 0
    
    for filename in files_to_delete:
        file_path = model_dir / filename
        if file_path.exists():
            try:
                file_path.unlink()
                print(f"✓ 삭제됨: {filename}")
                deleted_count += 1
            except Exception as e:
                print(f"✗ 삭제 실패: {filename} - {e}")
        else:
            print(f"○ 파일 없음: {filename}")
            not_found_count += 1
    
    print()
    print("=" * 60)
    print("초기화 완료")
    print("=" * 60)
    print(f"삭제된 파일: {deleted_count} 개")
    print(f"없던 파일: {not_found_count} 개")
    print()
    print("💡 다음 단계:")
    print("  1. ML 서비스를 재시작하거나")
    print("  2. /diary-emotion/train 엔드포인트를 호출하여 새로 학습하세요")
    print()
    
    return deleted_count > 0


if __name__ == "__main__":
    success = reset_model()
    sys.exit(0 if success else 1)

