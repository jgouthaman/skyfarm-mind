# Cloud Run deploys a container, not raw source -- this is the standard
# FastAPI + Uvicorn image for that. Cloud Run sets $PORT itself at
# runtime; nothing else here is Cloud-Run-specific.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
