FROM python:3.11-slim

WORKDIR /app

COPY business/diary_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY business/diary_service/app/main.py .

EXPOSE 9007

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port 9007 --root-path ${ROOT_PATH}"

