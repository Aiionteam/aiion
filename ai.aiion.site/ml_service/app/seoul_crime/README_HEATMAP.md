# 서울시 자치구별 범죄율 히트맵 생성 가이드

## 현재 상태

✅ **완료된 작업:**
- `merged_data.csv`: 범죄 통계 데이터 준비 완료
- `seoul_crime_data.shp`: 포인트 shapefile 생성 완료
- 히트맵 생성 서비스 코드 준비 완료
- API 엔드포인트 준비 완료 (`/seoul-crime/heatmap`)

❌ **필요한 작업:**
- 서울시 자치구 경계 shapefile 또는 GeoJSON 파일 필요

## 히트맵 생성 단계

### 1단계: 자치구 경계 데이터 준비

히트맵을 그리려면 각 자치구의 **경계 좌표**가 필요합니다. 현재는 포인트 데이터만 있으므로 경계 데이터를 추가해야 합니다.

#### 방법 A: 공공데이터포털에서 다운로드 (권장)

1. **공공데이터포털 접속**: https://www.data.go.kr
2. **검색**: "서울시 행정구역 경계" 또는 "서울시 자치구 경계"
3. **다운로드**: GeoJSON 또는 Shapefile 형식
4. **저장 위치**: 
   - `data/seoul_gu.geojson` 또는
   - `data/seoul_gu.shp` 또는
   - `save/seoul_gu.geojson`

#### 방법 B: VWorld API 사용

1. **VWorld 회원가입**: https://www.vworld.kr/
2. **API 키 발급**: 개발자 센터에서 발급
3. **스크립트 실행**: `download_seoul_boundary.py` 수정 후 실행

#### 방법 C: GitHub 오픈소스 사용

```bash
# 다음 URL에서 직접 다운로드
https://raw.githubusercontent.com/vuski/admdongkor/master/geojson/11/11.json
```

파일을 `save/seoul_gu.geojson`으로 저장

### 2단계: 패키지 설치 확인

```bash
pip install geopandas matplotlib
```

### 3단계: 히트맵 생성

#### 방법 A: API 호출 (권장)

```bash
# GET 요청
curl http://localhost:8000/seoul-crime/heatmap?cmap=Reds

# 또는 브라우저에서
http://localhost:8000/seoul-crime/heatmap?cmap=Reds
```

#### 방법 B: Python 스크립트로 직접 실행

```python
from app.seoul_crime.seoul_heatmap_service import SeoulHeatmapService

service = SeoulHeatmapService()
result = service.create_heatmap(cmap='Reds')

# 이미지 경로 확인
print(result['image_path'])
```

### 4단계: 결과 확인

- **이미지 파일**: `save/seoul_crime_heatmap.png`
- **Base64 인코딩**: API 응답의 `image_base64` 필드

## API 엔드포인트

### 히트맵 생성 (JSON 응답)
```
GET /seoul-crime/heatmap?cmap=Reds
POST /seoul-crime/heatmap?cmap=Reds
```

**파라미터:**
- `cmap`: 컬러맵 (기본값: "Reds")
  - 옵션: "Reds", "OrRd", "YlOrRd", "YlGn", "Blues" 등
- `return_image`: Base64 이미지 반환 여부 (기본값: true)

**응답:**
```json
{
  "status": "success",
  "image_base64": "iVBORw0KGgoAAAANS...",
  "image_path": "/path/to/seoul_crime_heatmap.png",
  "data_summary": {
    "total_gu": 25,
    "min_crime_rate": 45.2,
    "max_crime_rate": 89.5,
    "avg_crime_rate": 67.3
  }
}
```

### 히트맵 이미지 직접 반환
```
GET /seoul-crime/heatmap/image?cmap=Reds
```

PNG 이미지를 직접 반환합니다.

## 문제 해결

### Shapefile을 찾을 수 없습니다

**해결 방법:**
1. `data/` 또는 `save/` 폴더에 `seoul_gu.shp` 또는 `seoul_gu.geojson` 파일이 있는지 확인
2. 파일명이 정확한지 확인 (대소문자 구분)
3. `download_seoul_boundary.py` 스크립트 실행

### 막대 그래프만 표시됩니다

**원인:** 자치구 경계 shapefile이 없어서 포인트 데이터로 막대 그래프를 생성한 경우

**해결 방법:** 위의 "1단계: 자치구 경계 데이터 준비"를 따라 경계 데이터를 다운로드

### 범죄율이 0으로 표시됩니다

**원인:** 데이터에 인구 정보가 없거나 범죄 발생 건수가 0

**해결 방법:** `merged_data.csv` 파일에 인구와 범죄 발생 데이터가 있는지 확인

## 참고 자료

- **공공데이터포털**: https://www.data.go.kr
- **VWorld API**: https://www.vworld.kr/
- **GitHub 오픈소스**: 
  - https://github.com/vuski/admdongkor
  - https://github.com/southkorea/seoul-maps

