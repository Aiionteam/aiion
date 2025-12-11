FROM python:3.11-slim

WORKDIR /app

COPY rag/chatbot_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY rag/chatbot_service/app/main.py .

EXPOSE 9002

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port 9002 --root-path ${ROOT_PATH}"

