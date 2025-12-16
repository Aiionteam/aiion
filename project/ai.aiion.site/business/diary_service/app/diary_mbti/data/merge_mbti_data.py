# -*- coding: utf-8 -*-
"""MBTI 축별 데이터 병합 스크립트"""
import json
import os
from pathlib import Path

# 스크립트 파일이 있는 디렉토리로 작업 디렉토리 변경
script_dir = Path(__file__).parent.absolute()
os.chdir(script_dir)

print(f"작업 디렉토리: {os.getcwd()}")
print("=" * 80)
print("MBTI 축별 데이터 병합 시작")
print("=" * 80)

# 병합할 파일 쌍 정의 (축별로)
merge_pairs = [
    {
        "axis": "E_I",
        "files": [
            "mbti_corpus_0_split_E_I_2500.json",
            "mbti_corpus_modern_E_I_20000.json"
        ],
        "output": "mbti_corpus_merged_E_I.json"
    },
    {
        "axis": "S_N",
        "files": [
            "mbti_corpus_0_split_S_N_2500.json",
            "mbti_corpus_modern_S_N_20000.json"
        ],
        "output": "mbti_corpus_merged_S_N.json"
    },
    {
        "axis": "T_F",
        "files": [
            "mbti_corpus_0_split_T_F_2500.json",
            "mbti_corpus_modern_T_F_20000.json"
        ],
        "output": "mbti_corpus_merged_T_F.json"
    },
    {
        "axis": "J_P",
        "files": [
            "mbti_corpus_0_split_J_P_2500.json",
            "mbti_corpus_modern_J_P_20000.json"
        ],
        "output": "mbti_corpus_merged_J_P.json"
    }
]

for pair in merge_pairs:
    axis = pair["axis"]
    files = pair["files"]
    output_file = pair["output"]
    
    print(f"\n[{axis}] 축 병합 중...")
    
    merged_data = []
    total_items = 0
    label_distribution = {}
    
    # 각 파일 읽어서 병합
    for file_name in files:
        file_path = Path(file_name)
        
        if not file_path.exists():
            print(f"  [WARNING] File not found: {file_name}")
            continue
        
        print(f"  - Reading: {file_name}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"    Items: {len(data):,}")
        
        # 레이블 분포 계산
        for item in data:
            label = item.get(axis)
            if label is not None:
                label_distribution[label] = label_distribution.get(label, 0) + 1
        
        merged_data.extend(data)
        total_items += len(data)
    
    # ID 재할당 (중복 방지)
    for idx, item in enumerate(merged_data, start=1):
        item['id'] = idx
    
    # 병합된 데이터 저장
    output_path = Path(output_file)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=4)
    
    print(f"\n  [OK] Merge complete!")
    print(f"     Total items: {total_items:,}")
    print(f"     Label distribution ({axis}): {label_distribution}")
    print(f"     Saved to: {output_file}")

print("\n" + "=" * 80)
print("모든 축 병합 완료!")
print("=" * 80)

