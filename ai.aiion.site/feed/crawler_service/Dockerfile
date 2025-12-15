FROM python:3.11-slim

# 시스템 패키지 및 Chrome 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    ca-certificates \
    fonts-nanum \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ChromeDriver는 Selenium 4.x가 자동으로 관리하므로 수동 설치 불필요
# (Service 클래스가 자동으로 다운로드 및 관리)

WORKDIR /app

COPY feed/crawler_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY feed/crawler_service/app/ .

EXPOSE 9003

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port 9003 --root-path ${ROOT_PATH}"
