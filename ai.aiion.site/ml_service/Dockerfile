FROM python:3.11-slim

WORKDIR /app

# LightGBM에 필요한 시스템 라이브러리 설치
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 및 패키지 설치
COPY ml_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# app 디렉토리 복사
COPY ml_service/app/ ./app/

    # CSV 파일들은 볼륨 마운트로 실시간 반영됨 (빌드 시 복사 불필요)
    # 볼륨 마운트: docker-compose.yml에서 처리

EXPOSE 9005

ENV PORT=9005
ENV ROOT_PATH=""

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --root-path ${ROOT_PATH}"
