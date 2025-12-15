"""
범죄율 계산 검증 스크립트
자치구의 총 인구 대비 범죄율이 올바르게 계산되는지 확인
"""

import pandas as pd
from pathlib import Path

# 데이터 로드
data_path = Path(__file__).parent / "save" / "merged_data.csv"
df = pd.read_csv(data_path, encoding='utf-8-sig')

print("=" * 80)
print("범죄율 계산 검증")
print("=" * 80)

# 총 범죄 발생 건수 계산
crime_columns = ['살인 발생', '강도 발생', '강간 발생', '절도 발생', '폭력 발생']
df['총_범죄_발생'] = df[crime_columns].sum(axis=1)

# 범죄율 계산 (인구 1만명당)
df['crime_rate'] = (df['총_범죄_발생'] / df['인구']) * 10000

print("\n[계산 공식]")
print("범죄율 = (총 범죄 발생 건수 / 자치구 총 인구) × 10,000")
print("→ 인구 1만명당 범죄 발생 건수")
print("\n[총 범죄 발생 건수 구성]")
print("총 범죄 발생 = 살인 발생 + 강도 발생 + 강간 발생 + 절도 발생 + 폭력 발생")

print("\n" + "=" * 80)
print("강남구 예시 검증")
print("=" * 80)
gangnam = df[df['자치구'] == '강남구'].iloc[0]
print(f"\n자치구: {gangnam['자치구']}")
print(f"인구: {gangnam['인구']:,}명")
print(f"\n범죄 발생 건수:")
print(f"  - 살인 발생: {gangnam['살인 발생']}건")
print(f"  - 강도 발생: {gangnam['강도 발생']}건")
print(f"  - 강간 발생: {gangnam['강간 발생']}건")
print(f"  - 절도 발생: {gangnam['절도 발생']}건")
print(f"  - 폭력 발생: {gangnam['폭력 발생']}건")
print(f"  → 총 범죄 발생: {gangnam['총_범죄_발생']}건")

print(f"\n범죄율 계산:")
print(f"  ({gangnam['총_범죄_발생']} / {gangnam['인구']:,}) × 10,000")
print(f"  = {gangnam['crime_rate']:.2f} (인구 1만명당)")

print("\n" + "=" * 80)
print("전체 자치구 범죄율 검증 결과")
print("=" * 80)
print(f"\n총 자치구 수: {len(df)}개")
print(f"\n범죄율 통계:")
print(f"  - 최소: {df['crime_rate'].min():.2f} (인구 1만명당)")
print(f"  - 최대: {df['crime_rate'].max():.2f} (인구 1만명당)")
print(f"  - 평균: {df['crime_rate'].mean():.2f} (인구 1만명당)")
print(f"  - 중앙값: {df['crime_rate'].median():.2f} (인구 1만명당)")

print("\n" + "=" * 80)
print("자치구별 상세 정보 (인구, 총 범죄 발생, 범죄율)")
print("=" * 80)
result_df = df[['자치구', '인구', '총_범죄_발생', 'crime_rate']].copy()
result_df['인구'] = result_df['인구'].apply(lambda x: f"{int(x):,}")
result_df['총_범죄_발생'] = result_df['총_범죄_발생'].apply(lambda x: f"{int(x):,}")
result_df['crime_rate'] = result_df['crime_rate'].apply(lambda x: f"{x:.2f}")
print(result_df.to_string(index=False))

print("\n" + "=" * 80)
print("결론")
print("=" * 80)
print("✅ 범죄율은 각 자치구의 '총 인구' 대비 '총 범죄 발생 건수'를 계산한 값입니다.")
print("✅ 계산 방식: (총 범죄 발생 건수 / 자치구 총 인구) × 10,000")
print("✅ 단위: 인구 1만명당 범죄 발생 건수")
print("=" * 80)

