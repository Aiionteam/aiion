FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY transformer_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY transformer_service/app /app/app

# 모델 디렉토리 생성
RUN mkdir -p /app/models

EXPOSE 9008

# FastAPI 애플리케이션 실행
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port 9008 --root-path ${ROOT_PATH:-/}"
