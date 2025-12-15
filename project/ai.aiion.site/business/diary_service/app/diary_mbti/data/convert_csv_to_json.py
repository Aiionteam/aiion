# -*- coding: utf-8 -*-
"""CSV 파일을 JSON으로 변환"""
import csv
import json
from pathlib import Path

# 변환할 파일들
files = [
    ("mbti_corpus_modern_E_I_20000.csv", "mbti_corpus_modern_E_I_20000.json", "E_I"),
    ("mbti_corpus_modern_S_N_20000.csv", "mbti_corpus_modern_S_N_20000.json", "S_N"),
    ("mbti_corpus_modern_T_F_20000.csv", "mbti_corpus_modern_T_F_20000.json", "T_F"),
    ("mbti_corpus_modern_J_P_20000.csv", "mbti_corpus_modern_J_P_20000.json", "J_P"),
]

print("=" * 80)
print("CSV → JSON 변환 시작")
print("=" * 80)

for csv_file, json_file, label_col in files:
    print(f"\n[{csv_file}] 변환 중...")
    
    csv_path = Path(csv_file)
    json_path = Path(json_file)
    
    if not csv_path.exists():
        print(f"  [ERROR] File not found: {csv_file}")
        continue
    
    # CSV 읽기
    data = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # JSON 형식으로 변환
            item = {
                "id": int(row['id']),
                "localdate": row['localdate'],
                "title": row['title'],
                "content": row['content'],
                "userid": int(row['userid']),
                label_col: int(row[label_col])
            }
            data.append(item)
    
    # JSON 저장
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    
    # 통계
    label_dist = {}
    for item in data:
        label = item[label_col]
        label_dist[label] = label_dist.get(label, 0) + 1
    
    print(f"  [OK] Conversion complete!")
    print(f"     Total items: {len(data):,}")
    print(f"     Label distribution: {label_dist}")
    print(f"     Saved to: {json_path}")

print("\n" + "=" * 80)
print("모든 변환 완료!")
print("=" * 80)

