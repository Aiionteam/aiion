FROM python:3.11-slim

WORKDIR /app

COPY feed/weather_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY feed/weather_service/app/main.py .
# CSV 파일을 feed/weather_service/ 폴더에서 복사
COPY feed/weather_service/중기예보_중기기온예보구역코드.csv .

EXPOSE 9004

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port 9004 --root-path ${ROOT_PATH}"

