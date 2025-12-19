"""
데이터 분석 스크립트
MBTI 데이터의 레이블 분포와 클래스 불균형을 확인합니다.
"""

import json
from pathlib import Path
from collections import Counter
import pandas as pd

def analyze_json_file(json_path: Path, dimension: str):
    """JSON 파일 분석"""
    print(f"\n{'='*60}")
    print(f"파일: {json_path.name}")
    print(f"차원: {dimension}")
    print(f"{'='*60}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"총 데이터 수: {len(data):,}개")
    
    # 레이블 분포
    labels = [item[dimension] for item in data]
    label_counts = Counter(labels)
    
    print(f"\n레이블 분포:")
    for label in sorted(label_counts.keys()):
        count = label_counts[label]
        percentage = (count / len(data)) * 100
        print(f"  {label}: {count:,}개 ({percentage:.2f}%)")
    
    # 텍스트 길이 분석
    text_lengths = []
    empty_texts = 0
    for item in data:
        content = item.get('content', '')
        if not content or len(content.strip()) == 0:
            empty_texts += 1
        text_lengths.append(len(content))
    
    print(f"\n텍스트 분석:")
    print(f"  빈 텍스트: {empty_texts}개")
    if text_lengths:
        print(f"  평균 길이: {sum(text_lengths) / len(text_lengths):.1f}자")
        print(f"  최소 길이: {min(text_lengths)}자")
        print(f"  최대 길이: {max(text_lengths)}자")
    
    # 샘플 확인
    print(f"\n샘플 데이터 (각 레이블별 2개):")
    for label in sorted(label_counts.keys()):
        samples = [item for item in data if item[dimension] == label][:2]
        for i, sample in enumerate(samples, 1):
            content = sample.get('content', '')[:100]
            try:
                print(f"  [{label}] 샘플 {i}: {content}...")
            except UnicodeEncodeError:
                # 인코딩 오류 시 ASCII로 변환
                content_ascii = content.encode('ascii', 'ignore').decode('ascii')
                print(f"  [{label}] 샘플 {i}: {content_ascii}...")
    
    return {
        'file': json_path.name,
        'dimension': dimension,
        'total': len(data),
        'label_distribution': dict(label_counts),
        'empty_texts': empty_texts,
        'avg_length': sum(text_lengths) / len(text_lengths) if text_lengths else 0
    }

def main():
    """메인 함수"""
    data_dir = Path(__file__).parent / "data"
    
    # 파일셋 1: 병합 데이터
    json_files_merged = {
        'E_I': data_dir / "mbti_corpus_merged_E_I.json",
        'S_N': data_dir / "mbti_corpus_merged_S_N.json",
        'T_F': data_dir / "mbti_corpus_merged_T_F.json",
        'J_P': data_dir / "mbti_corpus_merged_J_P.json"
    }
    
    # 파일셋 2: 이순신 난중일기
    json_files_leesoonsin = {
        'E_I': data_dir / "mbti_leesoonsin_corpus_split_E_I.json",
        'S_N': data_dir / "mbti_leesoonsin_corpus_split_S_N.json",
        'T_F': data_dir / "mbti_leesoonsin_corpus_split_T_F.json",
        'J_P': data_dir / "mbti_leesoonsin_corpus_split_J_P.json"
    }
    
    print("="*60)
    print("MBTI 데이터 분석")
    print("="*60)
    
    all_results = []
    
    # 병합 데이터 분석
    print("\n\n[파일셋 1] 병합 데이터 분석")
    print("="*60)
    for dimension, path in json_files_merged.items():
        if path.exists():
            result = analyze_json_file(path, dimension)
            all_results.append(result)
        else:
            print(f"\n❌ 파일 없음: {path}")
    
    # 이순신 난중일기 분석
    print("\n\n[파일셋 2] 이순신 난중일기 분석")
    print("="*60)
    for dimension, path in json_files_leesoonsin.items():
        if path.exists():
            result = analyze_json_file(path, dimension)
            all_results.append(result)
        else:
            print(f"\n❌ 파일 없음: {path}")
    
    # 종합 분석
    print("\n\n" + "="*60)
    print("종합 분석")
    print("="*60)
    
    # 차원별로 병합
    dimension_summary = {}
    for result in all_results:
        dim = result['dimension']
        if dim not in dimension_summary:
            dimension_summary[dim] = {'total': 0, 'labels': Counter()}
        
        dimension_summary[dim]['total'] += result['total']
        dimension_summary[dim]['labels'].update(result['label_distribution'])
    
    print("\n차원별 총합 레이블 분포:")
    for dim, summary in dimension_summary.items():
        print(f"\n  [{dim}] 총 {summary['total']:,}개")
        for label in sorted(summary['labels'].keys()):
            count = summary['labels'][label]
            percentage = (count / summary['total']) * 100
            print(f"    {label}: {count:,}개 ({percentage:.2f}%)")
        
        # 클래스 불균형 확인
        if len(summary['labels']) >= 2:
            label_counts = list(summary['labels'].values())
            max_count = max(label_counts)
            min_count = min(label_counts)
            imbalance_ratio = max_count / min_count if min_count > 0 else float('inf')
            print(f"    불균형 비율: {imbalance_ratio:.2f}:1 (최대/최소)")
            
            if imbalance_ratio > 10:
                print(f"    ⚠️ 심각한 클래스 불균형! (10:1 이상)")
            elif imbalance_ratio > 5:
                print(f"    ⚠️ 클래스 불균형 있음 (5:1 이상)")
    
    print("\n" + "="*60)
    print("분석 완료")
    print("="*60)

if __name__ == "__main__":
    main()

