# -*- coding: utf-8 -*-
"""MBTI 데이터 분포 균형 체크 스크립트 (간단 버전)"""
import json
import sys
import os
from pathlib import Path
from collections import Counter

# 스크립트 파일이 있는 디렉토리로 작업 디렉토리 변경
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except:
        pass

print("=" * 80)
print("MBTI 데이터 분포 균형 체크")
print("=" * 80)

def get_label_name(axis, label_value, all_labels):
    """레이블 값을 MBTI 축 이름으로 변환"""
    # 레이블 값들을 정렬하여 최소값을 첫 번째 클래스로 매핑
    sorted_labels = sorted(set(all_labels))
    
    if len(sorted_labels) == 2:
        # 이진 분류: 작은 값이 첫 번째 클래스, 큰 값이 두 번째 클래스
        if axis == 'E_I':
            return 'E' if label_value == sorted_labels[0] else 'I'
        elif axis == 'S_N':
            return 'S' if label_value == sorted_labels[0] else 'N'
        elif axis == 'T_F':
            return 'T' if label_value == sorted_labels[0] else 'F'
        elif axis == 'J_P':
            return 'J' if label_value == sorted_labels[0] else 'P'
    
    return str(label_value)

def check_distribution(file_path, axis_name):
    """파일의 레이블 분포를 확인하고 균형도를 계산"""
    if not file_path.exists():
        print(f"\n[ERROR] File not found: {file_path.name}")
        return None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 레이블 분포 계산
    labels = [item.get(axis_name) for item in data if axis_name in item]
    label_counts = Counter(labels)
    
    total = len(labels)
    if total == 0:
        print(f"\n[WARNING] No labels found in {file_path.name}")
        return None
    
    # 통계 계산
    distribution = {}
    for label, count in sorted(label_counts.items()):
        percentage = (count / total) * 100
        distribution[label] = {
            'count': count,
            'percentage': percentage
        }
    
    # 모든 레이블 값 저장 (매핑용)
    all_label_values = list(labels)
    
    # 균형도 계산 (가장 큰 클래스와 가장 작은 클래스의 비율)
    if len(distribution) >= 2:
        counts = [v['count'] for v in distribution.values()]
        max_count = max(counts)
        min_count = min(counts)
        balance_ratio = min_count / max_count if max_count > 0 else 0
        
        # 균형 판정 (0.8 이상이면 균형, 0.6-0.8이면 약간 불균형, 0.6 미만이면 불균형)
        if balance_ratio >= 0.8:
            balance_status = "[OK] 균형"
        elif balance_ratio >= 0.6:
            balance_status = "[WARNING] 약간 불균형"
        else:
            balance_status = "[ERROR] 불균형"
    else:
        balance_ratio = 1.0
        balance_status = "N/A (단일 클래스)"
    
    return {
        'file': file_path.name,
        'axis': axis_name,
        'total': total,
        'distribution': distribution,
        'balance_ratio': balance_ratio,
        'balance_status': balance_status,
        'all_labels': all_label_values
    }

# 파일셋 1: 병합 데이터
print("\n" + "=" * 80)
print("[파일셋 1] 병합 데이터 (mbti_corpus_merged_*.json)")
print("=" * 80)

merged_files = {
    'E_I': Path("mbti_corpus_merged_E_I.json"),
    'S_N': Path("mbti_corpus_merged_S_N.json"),
    'T_F': Path("mbti_corpus_merged_T_F.json"),
    'J_P': Path("mbti_corpus_merged_J_P.json")
}

merged_results = []
for axis, file_path in merged_files.items():
    result = check_distribution(file_path, axis)
    if result:
        merged_results.append(result)
        print(f"\n[{axis}] {file_path.name}")
        print(f"  총 데이터 수: {result['total']:,}")
        print(f"  레이블 분포:")
        for label, info in sorted(result['distribution'].items()):
            label_name = get_label_name(axis, label, result['all_labels'])
            print(f"    {label_name} (값={label}): {info['count']:,}개 ({info['percentage']:.2f}%)")
        print(f"  균형도: {result['balance_ratio']:.4f} ({result['balance_status']})")

# 파일셋 2: 이순신 난중일기
print("\n" + "=" * 80)
print("[파일셋 2] 이순신 난중일기 (mbti_leesoonsin_corpus_split_*.json)")
print("=" * 80)

leesoonsin_files = {
    'E_I': Path("mbti_leesoonsin_corpus_split_E_I.json"),
    'S_N': Path("mbti_leesoonsin_corpus_split_S_N.json"),
    'T_F': Path("mbti_leesoonsin_corpus_split_T_F.json"),
    'J_P': Path("mbti_leesoonsin_corpus_split_J_P.json")
}

leesoonsin_results = []
for axis, file_path in leesoonsin_files.items():
    result = check_distribution(file_path, axis)
    if result:
        leesoonsin_results.append(result)
        print(f"\n[{axis}] {file_path.name}")
        print(f"  총 데이터 수: {result['total']:,}")
        print(f"  레이블 분포:")
        for label, info in sorted(result['distribution'].items()):
            label_name = get_label_name(axis, label, result['all_labels'])
            print(f"    {label_name} (값={label}): {info['count']:,}개 ({info['percentage']:.2f}%)")
        print(f"  균형도: {result['balance_ratio']:.4f} ({result['balance_status']})")

# 전체 요약
print("\n" + "=" * 80)
print("[전체 요약]")
print("=" * 80)

print("\n병합 데이터 요약:")
for result in merged_results:
    print(f"  [{result['axis']}] 균형도: {result['balance_ratio']:.4f} - {result['balance_status']}")

print("\n이순신 난중일기 요약:")
for result in leesoonsin_results:
    print(f"  [{result['axis']}] 균형도: {result['balance_ratio']:.4f} - {result['balance_status']}")

# 불균형 데이터 경고
print("\n" + "=" * 80)
print("[경고] 불균형 데이터")
print("=" * 80)

unbalanced = []
for result in merged_results + leesoonsin_results:
    if result['balance_ratio'] < 0.8:
        unbalanced.append(result)

if unbalanced:
    for result in unbalanced:
        print(f"\n[WARNING] [{result['axis']}] {result['file']}")
        print(f"   균형도: {result['balance_ratio']:.4f} ({result['balance_status']})")
        print(f"   분포:")
        for label, info in sorted(result['distribution'].items()):
            label_name = get_label_name(result['axis'], label, result['all_labels'])
            print(f"     {label_name} (값={label}): {info['count']:,}개 ({info['percentage']:.2f}%)")
else:
    print("\n[OK] 모든 데이터셋이 균형을 이루고 있습니다!")

print("\n" + "=" * 80)
print("분석 완료!")
print("=" * 80)

