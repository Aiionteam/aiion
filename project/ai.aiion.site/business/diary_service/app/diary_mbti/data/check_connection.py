"""
train_local_gpu.py와 데이터 파일 연결 상태 체크
"""
import json
from pathlib import Path

# 현재 스크립트 위치 (data 디렉토리)
data_dir = Path(__file__).parent

# train_local_gpu.py에서 참조하는 파일들
json_files_merged = {
    'E_I': data_dir / "mbti_corpus_merged_E_I.json",
    'S_N': data_dir / "mbti_corpus_merged_S_N.json",
    'T_F': data_dir / "mbti_corpus_merged_T_F.json",
    'J_P': data_dir / "mbti_corpus_merged_J_P.json"
}

json_files_leesoonsin = {
    'E_I': data_dir / "mbti_leesoonsin_corpus_split_E_I.json",
    'S_N': data_dir / "mbti_leesoonsin_corpus_split_S_N.json",
    'T_F': data_dir / "mbti_leesoonsin_corpus_split_T_F.json",
    'J_P': data_dir / "mbti_leesoonsin_corpus_split_J_P.json"
}

print("=" * 70)
print("📊 train_local_gpu.py 데이터 연결 상태 체크")
print("=" * 70)

# 파일셋 1: 병합 데이터 체크
print("\n[파일셋 1] 병합 데이터 (mbti_corpus_merged_*.json)")
print("-" * 70)
all_merged_ok = True
for axis, file_path in json_files_merged.items():
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 첫 번째 항목의 필드 확인
            if data and len(data) > 0:
                first_item = data[0]
                has_axis_field = axis in first_item
                
                print(f"✅ {axis:4s} | 파일: {file_path.name:45s} | 항목 수: {len(data):6d} | {axis} 필드: {'✅' if has_axis_field else '❌'}")
                
                if not has_axis_field:
                    print(f"   ⚠️  경고: {axis} 필드가 없습니다!")
                    all_merged_ok = False
            else:
                print(f"❌ {axis:4s} | 파일: {file_path.name:45s} | 항목 없음")
                all_merged_ok = False
        except Exception as e:
            print(f"❌ {axis:4s} | 파일: {file_path.name:45s} | 에러: {e}")
            all_merged_ok = False
    else:
        print(f"❌ {axis:4s} | 파일: {file_path.name:45s} | 파일 없음")
        all_merged_ok = False

# 파일셋 2: 이순신 난중일기 체크
print("\n[파일셋 2] 이순신 난중일기 (mbti_leesoonsin_corpus_split_*.json)")
print("-" * 70)
all_leesoonsin_ok = True
for axis, file_path in json_files_leesoonsin.items():
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 첫 번째 항목의 필드 확인
            if data and len(data) > 0:
                first_item = data[0]
                has_axis_field = axis in first_item
                
                print(f"✅ {axis:4s} | 파일: {file_path.name:45s} | 항목 수: {len(data):6d} | {axis} 필드: {'✅' if has_axis_field else '❌'}")
                
                if not has_axis_field:
                    print(f"   ⚠️  경고: {axis} 필드가 없습니다!")
                    all_leesoonsin_ok = False
            else:
                print(f"❌ {axis:4s} | 파일: {file_path.name:45s} | 항목 없음")
                all_leesoonsin_ok = False
        except Exception as e:
            print(f"❌ {axis:4s} | 파일: {file_path.name:45s} | 에러: {e}")
            all_leesoonsin_ok = False
    else:
        print(f"❌ {axis:4s} | 파일: {file_path.name:45s} | 파일 없음")
        all_leesoonsin_ok = False

# 최종 결과
print("\n" + "=" * 70)
print("📋 최종 결과")
print("=" * 70)
if all_merged_ok and all_leesoonsin_ok:
    print("✅ 모든 파일이 올바르게 연결되었습니다!")
    print("✅ 각 축별로 올바른 필드가 포함되어 있습니다!")
    print("\n🎉 train_local_gpu.py 실행 준비 완료!")
else:
    print("❌ 일부 파일에 문제가 있습니다. 위의 경고를 확인하세요.")
print("=" * 70)

