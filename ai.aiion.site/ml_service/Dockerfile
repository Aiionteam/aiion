FROM python:3.11-slim

WORKDIR /app

# 시스템 라이브러리 설치
# - libgomp1: LightGBM에 필요
# - default-jdk: KoNLPy (Okt)에 필요 (Debian Trixie 호환)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Java 환경 변수 설정 (KoNLPy를 위한 JVM 경로)
# default-jdk는 시스템 기본 Java를 설치하므로 JAVA_HOME을 동적으로 찾음
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

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
