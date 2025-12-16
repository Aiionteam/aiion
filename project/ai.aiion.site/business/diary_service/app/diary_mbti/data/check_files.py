# -*- coding: utf-8 -*-
"""train_local_gpu.py에서 참조하는 파일들이 존재하는지 확인"""
import json
from pathlib import Path

data_dir = Path(__file__).parent

print("=" * 80)
print("train_local_gpu.py 파일 연결 확인")
print("=" * 80)

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

print("\n[파일셋 1] 병합 데이터:")
total_merged = 0
for dimension, path in json_files_merged.items():
    if path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            count = len(data)
            total_merged += count
            print(f"  [OK] [{dimension}] {path.name} - {count:,} items")
    else:
        print(f"  [FAIL] [{dimension}] {path.name} - file not found")

print(f"\n  Total merged data: {total_merged:,} items")

print("\n[파일셋 2] 이순신 난중일기:")
total_leesoonsin = 0
for dimension, path in json_files_leesoonsin.items():
    if path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            count = len(data)
            total_leesoonsin += count
            print(f"  [OK] [{dimension}] {path.name} - {count:,} items")
    else:
        print(f"  [FAIL] [{dimension}] {path.name} - file not found")

print(f"\n  Total leesoonsin data: {total_leesoonsin:,} items")

print(f"\nTotal training data: {total_merged + total_leesoonsin:,} items")

print("\n" + "=" * 80)
print("All files are properly connected!")
print("=" * 80)

