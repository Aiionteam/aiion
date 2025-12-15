FROM python:3.11-slim

WORKDIR /app

COPY business/diary_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY business/diary_service/app /app

EXPOSE 9007

CMD sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 9007 --root-path ${ROOT_PATH}"

