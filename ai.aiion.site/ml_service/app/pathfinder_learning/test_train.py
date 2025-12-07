"""
학습 추천 모델 학습 테스트 스크립트
"""

import sys
from pathlib import Path

# 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.pathfinder_learning.learning_recommendation_service import LearningRecommendationService

def main():
    print("=" * 80)
    print("학습 추천 모델 학습 시작")
    print("=" * 80)
    
    # 서비스 초기화
    csv_path = Path(__file__).parent / "learning_recommendation_dataset.csv"
    service = LearningRecommendationService(csv_path)
    
    try:
        # 1. 전처리
        print("\n[1/5] 데이터 전처리 중...")
        service.preprocess()
        print(f"✓ 전처리 완료: {len(service.df)} 개 행")
        
        # 2. 모델링
        print("\n[2/5] 모델 설정 중...")
        service.modeling()
        print("✓ 모델 설정 완료")
        
        # 3. 학습
        print("\n[3/5] 모델 학습 중...")
        service.learning()
        print("✓ 학습 완료")
        
        # 4. 평가
        print("\n[4/5] 모델 평가 중...")
        evaluation = service.evaluate()
        print("✓ 평가 완료")
        print(f"\n평가 결과:")
        print(f"  - 주제 분류 정확도: {evaluation['topic_classification']['accuracy']:.4f}")
        print(f"  - 추천 점수 MSE: {evaluation['ranking']['mse']:.4f}")
        print(f"  - 추천 점수 R²: {evaluation['ranking']['r2']:.4f}")
        
        # 5. 모델 저장
        print("\n[5/5] 모델 저장 중...")
        service.save_model()
        print("✓ 모델 저장 완료")
        
        print("\n" + "=" * 80)
        print("학습 완료!")
        print("=" * 80)
        print(f"\n저장된 모델:")
        print(f"  - 분류 모델: {service.model_file}")
        print(f"  - 랭킹 모델: {service.ranking_model_file}")
        print(f"  - 벡터화기: {service.vectorizer_file}")
        print(f"  - 메타데이터: {service.metadata_file}")
        
        # 예측 테스트
        print("\n" + "=" * 80)
        print("예측 테스트")
        print("=" * 80)
        test_result = service.predict(
            diary_content="오늘 요리를 처음 해봤는데 정말 재미있었다. 파스타를 만들었는데 생각보다 잘 됐다.",
            emotion=1,
            behavior_patterns="요리, 음식, 실험",
            behavior_frequency="요리:5, 음식:3, 실험:2",
            mbti_type="ISFP",
            mbti_confidence=0.78
        )
        print(f"\n테스트 예측 결과:")
        print(f"  - 추천 주제: {test_result['recommended_topic']}")
        print(f"  - 추천 점수: {test_result['recommendation_score']:.4f}")
        print(f"  - 주제 확률:")
        for topic, prob in list(test_result['topic_probabilities'].items())[:5]:
            print(f"    * {topic}: {prob:.4f}")
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())

