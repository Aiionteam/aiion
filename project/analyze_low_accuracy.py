"""
MBTI 모델 정확도가 낮은 이유 분석 스크립트
"""
import json
from pathlib import Path
from collections import Counter
import pandas as pd

# 데이터 디렉토리
data_dir = Path("ai.aiion.site/business/diary_service/app/diary_mbti/data")

print("=" * 70)
print("📊 MBTI 모델 정확도 낮은 이유 분석")
print("=" * 70)

# 각 축별 데이터 분석
axes = ['E_I', 'S_N', 'T_F', 'J_P']

for axis in axes:
    print(f"\n{'='*70}")
    print(f"🔍 {axis} 축 분석")
    print(f"{'='*70}")
    
    # 파일셋 1: 병합 데이터
    merged_file = data_dir / f"mbti_corpus_merged_{axis}.json"
    leesoonsin_file = data_dir / f"mbti_leesoonsin_corpus_split_{axis}.json"
    
    merged_data = []
    leesoonsin_data = []
    
    if merged_file.exists():
        with open(merged_file, 'r', encoding='utf-8') as f:
            merged_data = json.load(f)
    
    if leesoonsin_file.exists():
        with open(leesoonsin_file, 'r', encoding='utf-8') as f:
            leesoonsin_data = json.load(f)
    
    # 전체 데이터 병합
    all_data = merged_data + leesoonsin_data
    
    # 클래스 분포 확인
    labels = [item[axis] for item in all_data]
    label_counts = Counter(labels)
    
    print(f"\n📈 전체 데이터 통계:")
    print(f"   - 병합 데이터: {len(merged_data):,}개")
    print(f"   - 이순신 일기: {len(leesoonsin_data):,}개")
    print(f"   - 총 데이터: {len(all_data):,}개")
    
    print(f"\n📊 클래스 분포 ({axis}):")
    total = len(labels)
    for label, count in sorted(label_counts.items()):
        percentage = (count / total) * 100
        print(f"   - 클래스 {label}: {count:,}개 ({percentage:.2f}%)")
    
    # 클래스 불균형 분석
    if len(label_counts) == 3:
        counts = sorted(label_counts.values())
        imbalance_ratio = counts[-1] / counts[0] if counts[0] > 0 else float('inf')
        print(f"\n⚠️  클래스 불균형 비율: {imbalance_ratio:.2f}:1")
        
        if imbalance_ratio > 5:
            print(f"   ❌ 심각한 불균형! (5:1 이상)")
        elif imbalance_ratio > 3:
            print(f"   ⚠️  중간 불균형 (3:1 ~ 5:1)")
        else:
            print(f"   ✅ 비교적 균형적 (3:1 미만)")
    
    # 클래스 2가 없는지 확인
    if 2 not in label_counts:
        print(f"\n❌ 경고: 클래스 2가 없습니다!")
        print(f"   - 3-class 분류인데 클래스 2가 없으면 이진 분류가 됩니다.")
        print(f"   - 이 경우 모델이 제대로 학습되지 않을 수 있습니다.")
    
    # 평가불가(0) 비율 확인
    if 0 in label_counts:
        zero_ratio = (label_counts[0] / total) * 100
        print(f"\n📌 평가불가(0) 비율: {zero_ratio:.2f}%")
        if zero_ratio > 50:
            print(f"   ⚠️  평가불가가 절반 이상! 학습에 방해될 수 있습니다.")
    
    # 텍스트 길이 분석
    text_lengths = [len(item.get('content', '')) for item in all_data]
    if text_lengths:
        avg_length = sum(text_lengths) / len(text_lengths)
        min_length = min(text_lengths)
        max_length = max(text_lengths)
        print(f"\n📝 텍스트 길이 통계:")
        print(f"   - 평균: {avg_length:.1f}자")
        print(f"   - 최소: {min_length}자")
        print(f"   - 최대: {max_length}자")
        print(f"   - Max Length 설정: 384 (현재 설정)")

print("\n" + "=" * 70)
print("💡 정확도가 낮은 주요 원인 분석")
print("=" * 70)
print("""
1. 클래스 불균형 문제:
   - 한 클래스가 다른 클래스보다 훨씬 많으면 모델이 다수 클래스에 편향됨
   - 클래스 가중치가 제대로 적용되지 않았을 수 있음

2. 클래스 2 부재:
   - 3-class 분류인데 클래스 2가 없으면 실제로는 2-class 분류
   - 모델이 혼란스러워질 수 있음

3. 평가불가(0) 비율 과다:
   - 평가불가가 너무 많으면 학습이 어려움
   - 평가불가를 제외하고 학습하는 것을 고려

4. 데이터 품질:
   - 이순신 난중일기와 현대 일기의 언어 스타일 차이
   - 짧은 텍스트가 많으면 특징 추출이 어려움

5. 하이퍼파라미터:
   - Freeze layers: 5개 (너무 많이 동결?)
   - Learning rate: 1.5e-5 (적절한지 확인 필요)
   - Epochs: 5 (충분한지 확인 필요)

6. Early Stopping:
   - Patience: 4 (너무 빨리 멈췄을 수 있음)
""")

