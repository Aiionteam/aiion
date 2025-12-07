FROM python:3.11-slim

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY services/customer_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY services/customer_service/app/ .

EXPOSE 9006

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9006"]

