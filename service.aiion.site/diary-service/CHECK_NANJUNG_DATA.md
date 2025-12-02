# 난중일기 데이터 로드 확인 가이드

## 1. 애플리케이션 로그 확인

diary-service를 실행하면 다음과 같은 로그가 출력됩니다:

### 성공 시:
```
난중일기 CSV 데이터 로드 시작...
CSV 파일 찾음: C:\Users\jhh72\OneDrive\문서\develop\api.aiion.site\nanjung.csv
정규식으로 파싱된 일기 항목 수: 649
CSV 파싱 완료: 649개의 일기 항목 발견
난중일기 데이터 로드 완료: 649개 저장됨
```

### 이미 데이터가 있는 경우:
```
난중일기 데이터가 이미 존재합니다. 건너뜁니다. (기존 데이터: 649개)
```

### 데이터 확인 로그:
```
========================================
난중일기 데이터 로드 상태 확인 시작...
========================================
✅ 난중일기 데이터 확인 완료!
   - 사용자 ID: 1
   - 일기 개수: 649개
   - 첫 번째 일기: 1592-02-13 (임술)
   - 마지막 일기: 1594-05-13 (임인)
   - 날짜 범위: 1592-02-13 ~ 1594-05-13 (820일)
========================================
```

## 2. API를 통한 확인

### Swagger UI 사용
1. http://localhost:8083/swagger-ui.html 접속
2. `GET /diaries/user/{userId}` 엔드포인트 선택
3. userId에 `1` 입력
4. Execute 클릭
5. 응답에서 `data` 배열의 길이 확인

### curl 명령어
```bash
curl http://localhost:8083/diaries/user/1
```

### 예상 응답:
```json
{
  "code": 200,
  "message": "사용자별 조회 성공: 649개",
  "data": [
    {
      "id": 1,
      "diaryDate": "1592-02-13",
      "title": "임술",
      "content": "맑다.\n새벽에 아우 여필(汝弼)과...",
      "userId": 1
    },
    ...
  ]
}
```

## 3. 데이터베이스 직접 확인

PostgreSQL에 접속하여 확인:

```sql
-- user_id 1의 일기 개수 확인
SELECT COUNT(*) FROM diaries WHERE user_id = 1;

-- 첫 번째와 마지막 일기 확인
SELECT diary_date, title, LEFT(content, 50) as content_preview 
FROM diaries 
WHERE user_id = 1 
ORDER BY diary_date 
LIMIT 1;

SELECT diary_date, title, LEFT(content, 50) as content_preview 
FROM diaries 
WHERE user_id = 1 
ORDER BY diary_date DESC 
LIMIT 1;
```

## 4. 문제 해결

### CSV 파일을 찾을 수 없는 경우
- `api.aiion.site/nanjung.csv` 파일이 프로젝트 루트에 있는지 확인
- 애플리케이션 실행 디렉토리 확인
- 로그에서 시도한 경로 확인

### 정규식 파싱 실패
- CSV 파일 형식 확인: `'날짜,제목,"내용...",1`
- 로그에서 "정규식으로 파싱된 일기 항목 수" 확인
- 예상: 약 649개 (CSV 파일의 날짜 시작 라인 수)

### 데이터 저장 실패
- 데이터베이스 연결 확인
- PostgreSQL이 실행 중인지 확인
- 로그에서 에러 메시지 확인

## 5. 수동으로 데이터 로드하기

만약 자동 로드가 실패했다면, Swagger UI를 통해 수동으로 확인:

1. `GET /diaries/user/1` - 현재 데이터 확인
2. 데이터가 없으면 애플리케이션을 재시작하여 NanjungDataLoader 실행

