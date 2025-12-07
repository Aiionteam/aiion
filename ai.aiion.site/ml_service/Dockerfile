FROM python:3.11-slim

WORKDIR /app

# requirements.txt 복사 및 패키지 설치
COPY ml_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# app 디렉토리 복사
COPY ml_service/app/ ./app/

# CSV 파일들은 볼륨 마운트로 실시간 반영되지만, 초기 빌드 시 필요
# 볼륨 마운트가 실패할 경우를 대비해 빌드 시에도 복사
COPY ml_service/app/diary_emotion/diary.csv ./app/diary_emotion/diary.csv

EXPOSE 9005

ENV PORT=9005

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9005"]
