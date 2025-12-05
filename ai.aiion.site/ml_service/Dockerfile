FROM python:3.11-slim

WORKDIR /app

# requirements.txt 복사 및 패키지 설치
COPY ml_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# app 디렉토리 복사
COPY ml_service/app/ ./app/

EXPOSE 9003

# 환경변수로 포트 설정 가능 (기본값 9003)
ENV PORT=9003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9003"]
