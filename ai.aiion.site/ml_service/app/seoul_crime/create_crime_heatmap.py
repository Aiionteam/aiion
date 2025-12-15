"""
서울시 자치구별 범죄 발생률 히트맵 생성
이미지와 유사한 그리드 형식의 히트맵 생성
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import sys

# UTF-8 인코딩 설정
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'  # Windows
plt.rcParams['axes.unicode_minus'] = False  # 마이너스 기호 깨짐 방지

def create_crime_heatmap():
    """자치구별 범죄 발생률 히트맵 생성"""
    
    # 데이터 로드
    csv_path = Path(__file__).parent / "save" / "merged_data.csv"
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    
    # 범죄 발생 컬럼 선택
    crime_columns = ['살인 발생', '강도 발생', '강간 발생', '절도 발생', '폭력 발생']
    
    # 범죄 발생 데이터 추출
    crime_data = df[['자치구'] + crime_columns].copy()
    
    # 인구 대비 범죄율 계산 (인구 1만 명당)
    for col in crime_columns:
        crime_data[f'{col}_rate'] = (crime_data[col] / df['인구']) * 10000
    
    # 범죄율 컬럼만 선택
    rate_columns = [f'{col}_rate' for col in crime_columns]
    heatmap_data = crime_data[['자치구'] + rate_columns].copy()
    
    # 컬럼 이름 간소화 (히트맵 표시용)
    heatmap_data.columns = ['자치구', '살인', '강도', '강간', '절도', '폭력']
    
    # 자치구를 인덱스로 설정
    heatmap_data.set_index('자치구', inplace=True)
    
    # 범죄율 순으로 정렬 (총 범죄율 기준)
    heatmap_data['총계'] = heatmap_data.sum(axis=1)
    heatmap_data = heatmap_data.sort_values('총계', ascending=False)
    heatmap_data = heatmap_data.drop('총계', axis=1)
    
    # 히트맵 생성
    fig, ax = plt.subplots(figsize=(10, 14))
    
    # 색상맵 설정 (빨간색 그라데이션)
    sns.heatmap(
        heatmap_data,
        annot=True,  # 값 표시
        fmt='.2f',  # 소수점 2자리
        cmap='Reds',  # 빨간색 그라데이션 (밝은 빨강=낮음, 진한 빨강=높음)
        cbar_kws={'label': '범죄율 (인구 1만 명당)'},
        linewidths=0.5,
        linecolor='gray',
        ax=ax
    )
    
    ax.set_title('서울시 자치구별 범죄 발생률 히트맵', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('범죄 유형', fontsize=12)
    ax.set_ylabel('자치구 (범죄율 높은 순)', fontsize=12)
    
    plt.xticks(rotation=0)
    plt.yticks(rotation=0)
    plt.tight_layout()
    
    # 저장
    save_path = Path(__file__).parent / "save" / "crime_rate_heatmap.png"
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"히트맵 저장 완료: {save_path}")
    
    plt.close()
    
    return save_path


def create_arrest_rate_heatmap():
    """자치구별 검거율 히트맵 생성 (인구 대비)"""
    
    # 데이터 로드
    csv_path = Path(__file__).parent / "save" / "merged_data.csv"
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    
    # 검거 컬럼 선택
    arrest_columns = ['살인 검거', '강도 검거', '강간 검거', '절도 검거', '폭력 검거']
    
    # 검거 데이터 추출
    arrest_data = df[['자치구'] + arrest_columns].copy()
    
    # 인구 대비 검거율 계산 (인구 1만 명당)
    for col in arrest_columns:
        arrest_data[f'{col}_rate'] = (arrest_data[col] / df['인구']) * 10000
    
    # 검거율 컬럼만 선택
    rate_columns = [f'{col}_rate' for col in arrest_columns]
    heatmap_data = arrest_data[['자치구'] + rate_columns].copy()
    
    # 컬럼 이름 간소화 (히트맵 표시용)
    heatmap_data.columns = ['자치구', '살인', '강도', '강간', '절도', '폭력']
    
    # 자치구를 인덱스로 설정
    heatmap_data.set_index('자치구', inplace=True)
    
    # 검거율 순으로 정렬 (총 검거율 기준)
    heatmap_data['총계'] = heatmap_data.sum(axis=1)
    heatmap_data = heatmap_data.sort_values('총계', ascending=False)
    heatmap_data = heatmap_data.drop('총계', axis=1)
    
    # 히트맵 생성
    fig, ax = plt.subplots(figsize=(10, 14))
    
    # 색상맵 설정 (파란색 그라데이션)
    sns.heatmap(
        heatmap_data,
        annot=True,  # 값 표시
        fmt='.2f',  # 소수점 2자리
        cmap='Blues',  # 파란색 그라데이션 (밝은 파랑=낮음, 진한 파랑=높음)
        cbar_kws={'label': '검거율 (인구 1만 명당)'},
        linewidths=0.5,
        linecolor='gray',
        ax=ax
    )
    
    ax.set_title('서울시 자치구별 검거율 히트맵', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('범죄 유형', fontsize=12)
    ax.set_ylabel('자치구 (검거율 높은 순)', fontsize=12)
    
    plt.xticks(rotation=0)
    plt.yticks(rotation=0)
    plt.tight_layout()
    
    # 저장
    save_path = Path(__file__).parent / "save" / "arrest_rate_heatmap.png"
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"히트맵 저장 완료: {save_path}")
    
    plt.close()
    
    return save_path


if __name__ == "__main__":
    print("=" * 60)
    print("서울시 자치구별 범죄 발생률 히트맵 생성")
    print("=" * 60)
    
    # 범죄율 히트맵 생성
    print("\n1. 범죄율 히트맵 생성 중...")
    rate_path = create_crime_heatmap()
    
    # 검거율 히트맵 생성
    print("\n2. 검거율 히트맵 생성 중...")
    arrest_path = create_arrest_rate_heatmap()
    
    print("\n" + "=" * 60)
    print("생성 완료!")
    print(f"범죄율 히트맵: {rate_path}")
    print(f"검거율 히트맵: {arrest_path}")
    print("=" * 60)

